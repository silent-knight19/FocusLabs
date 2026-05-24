const functions = require('firebase-functions');
const admin = require('firebase-admin');

admin.initializeApp();
const db = admin.firestore();

const MAX_HABITS = 100;
const MAX_DOC_SIZE = 500000;

const ALLOWED_DATA_COLLECTIONS = new Set([
  'habits', 'completions', 'subtasks', 'subtask_completions',
  'custom_habits', 'custom_completions', 'custom_subtasks', 'custom_subtask_completions',
  'daily_tasks', 'settings', 'stopwatch_history', 'notes', 'goals',
  'study_sessions', 'productivity_sessions'
]);

function validateHabitsArray(habits) {
  if (!Array.isArray(habits)) return 'habits must be an array';
  if (habits.length > MAX_HABITS) return `max ${MAX_HABITS} habits allowed`;
  for (const h of habits) {
    if (!h.id || !h.name || typeof h.name !== 'string') {
      return 'each habit requires id and name string';
    }
    if (h.name.length > 100) return 'habit name too long';
  }
  return null;
}

exports.validateDataWrite = functions.firestore
  .document('users/{userId}/data/{collectionName}')
  .onWrite(async (change, context) => {
    const { collectionName } = context.params;
    if (!ALLOWED_DATA_COLLECTIONS.has(collectionName)) {
      await change.after.ref.delete();
      return null;
    }

    const after = change.after.exists ? change.after.data() : null;
    if (!after) return null;

    const size = JSON.stringify(after).length;
    if (size > MAX_DOC_SIZE) {
      if (change.before.exists) {
        await change.after.ref.set(change.before.data());
      } else {
        await change.after.ref.delete();
      }
      return null;
    }

    if (collectionName === 'habits' || collectionName === 'custom_habits') {
      const err = validateHabitsArray(after.value);
      if (err) {
        if (change.before.exists) {
          await change.after.ref.set(change.before.data());
        } else {
          await change.after.ref.delete();
        }
      }
    }

    return null;
  });

exports.validateMonthlyWrite = functions.firestore
  .document('users/{userId}/{collectionName}/{monthKey}')
  .onWrite(async (change, context) => {
    const { collectionName } = context.params;
    const allowedCollections = new Set(['completions', 'custom_completions', 'stopwatch', 'daily_tasks']);
    if (!allowedCollections.has(collectionName)) {
      return null;
    }

    const after = change.after.exists ? change.after.data() : null;
    if (!after) return null;

    const size = JSON.stringify(after).length;
    if (size > MAX_DOC_SIZE) {
      if (change.before.exists) {
        await change.after.ref.set(change.before.data());
      } else {
        await change.after.ref.delete();
      }
    }

    return null;
  });


// Helper for sharding completions format data
function shardDataByMonth(data) {
  const shards = {};
  if (!data || typeof data !== 'object') return shards;

  for (const [itemId, dates] of Object.entries(data)) {
    if (!dates || typeof dates !== 'object') continue;
    for (const [dateKey, value] of Object.entries(dates)) {
      if (!dateKey || typeof dateKey !== 'string') continue;
      const parts = dateKey.split('-');
      if (parts.length < 2) continue;
      
      const monthKey = `${parts[0]}-${parts[1]}`;
      const day = parts.length >= 3 ? parts[2] : null;
      if (!day) continue;

      if (!shards[monthKey]) shards[monthKey] = {};
      if (!shards[monthKey][itemId]) shards[monthKey][itemId] = {};
      shards[monthKey][itemId][day] = value;
    }
  }
  return shards;
}

// Helper for sharding array-based data (stopwatch, daily_tasks)
function shardArrayByMonth(data) {
  const shards = {};
  if (!Array.isArray(data)) return shards;

  for (const item of data) {
    if (!item.date || typeof item.date !== 'string') continue;
    const parts = item.date.split('-');
    if (parts.length < 2) continue;
    const monthKey = `${parts[0]}-${parts[1]}`;
    if (!shards[monthKey]) shards[monthKey] = [];
    shards[monthKey].push(item);
  }
  return shards;
}

exports.validateImport = functions.https.onCall(async (data, context) => {
  if (context.app === undefined) {
    throw new functions.https.HttpsError('failed-precondition', 'The function must be called from an App Check verified app.');
  }

  if (!context.auth) {
    throw new functions.https.HttpsError('unauthenticated', 'Must be signed in');
  }

  const userId = context.auth.uid;

  const metaRef = db.doc(`users/${userId}/meta/lastImport`);
  await db.runTransaction(async (transaction) => {
    const metaDoc = await transaction.get(metaRef);
    const lastImport = metaDoc.exists ? (metaDoc.data().timestamp || 0) : 0;
    if (Date.now() - lastImport < 60000) {
      throw new functions.https.HttpsError('resource-exhausted', 'Too many import requests. Please wait a minute.');
    }
    transaction.set(metaRef, { timestamp: Date.now() });
  });

  const importData = data?.payload;

  if (!importData || typeof importData !== 'object') {
    throw new functions.https.HttpsError('invalid-argument', 'Invalid payload');
  }

  const size = JSON.stringify(importData).length;
  if (size > 10 * 1024 * 1024) {
    throw new functions.https.HttpsError('invalid-argument', 'Import too large (max 10MB)');
  }

  const habits = importData.habits || importData.data?.habits;
  if (habits) {
    const err = validateHabitsArray(habits);
    if (err) throw new functions.https.HttpsError('invalid-argument', err);
  }

  const mapping = {
    habits: 'habits',
    subtasks: 'subtasks',
    customHabits: 'custom_habits',
    settings: 'settings',
    goals: 'goals',
    notes: 'notes'
  };

  const shardedCollections = ['completions', 'custom_completions', 'subtask_completions'];

  const batch = db.batch();

  for (const [jsonKey, colName] of Object.entries(mapping)) {
    const val = importData[jsonKey] ?? importData.data?.[jsonKey];
    if (val !== undefined && val !== null) {
      const ref = db.doc(`users/${userId}/data/${colName}`);
      batch.set(ref, { value: val, _v: Date.now() }, { merge: true });
    }
  }

  for (const colName of shardedCollections) {
    let jsonKey = colName;
    if (colName === 'custom_completions') jsonKey = 'customCompletions';
    if (colName === 'subtask_completions') jsonKey = 'subtaskCompletions';

    const val = importData[jsonKey] ?? importData.data?.[jsonKey];
    if (val !== undefined && val !== null) {
      const shards = shardDataByMonth(val);
      for (const [monthKey, monthData] of Object.entries(shards)) {
        const ref = db.doc(`users/${userId}/${colName}/${monthKey}`);
        batch.set(ref, { habits: monthData, _v: Date.now() }, { merge: true });
      }
    }
  }

  const stopwatchData = importData.stopwatchHistory ?? importData.data?.stopwatchHistory;
  if (stopwatchData && Array.isArray(stopwatchData)) {
    const shards = shardArrayByMonth(stopwatchData);
    for (const [monthKey, monthSessions] of Object.entries(shards)) {
      const ref = db.doc(`users/${userId}/stopwatch/${monthKey}`);
      batch.set(ref, { sessions: monthSessions, _v: Date.now() }, { merge: true });
    }
  }

  const dailyTasksData = importData.dailyTasks ?? importData.data?.dailyTasks;
  if (dailyTasksData && Array.isArray(dailyTasksData)) {
    const shards = shardArrayByMonth(dailyTasksData);
    for (const [monthKey, monthTasks] of Object.entries(shards)) {
      const ref = db.doc(`users/${userId}/daily_tasks/${monthKey}`);
      batch.set(ref, { tasks: monthTasks, _v: Date.now() }, { merge: true });
    }
  }

  await batch.commit();
  return { success: true };
});
