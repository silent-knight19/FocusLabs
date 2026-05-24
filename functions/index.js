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

exports.validateImport = functions.https.onCall(async (data, context) => {
  if (!context.auth) {
    throw new functions.https.HttpsError('unauthenticated', 'Must be signed in');
  }

  const userId = context.auth.uid;
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
    completions: 'completions',
    subtasks: 'subtasks',
    subtaskCompletions: 'subtask_completions',
    stopwatchHistory: 'stopwatch_history',
    dailyTasks: 'daily_tasks',
    customHabits: 'custom_habits',
    customCompletions: 'custom_completions',
    settings: 'settings'
  };

  const batch = db.batch();
  for (const [jsonKey, colName] of Object.entries(mapping)) {
    const val = importData[jsonKey] ?? importData.data?.[jsonKey];
    if (val !== undefined && val !== null) {
      const ref = db.doc(`users/${userId}/data/${colName}`);
      batch.set(ref, { value: val, _v: Date.now() }, { merge: true });
    }
  }

  await batch.commit();
  return { success: true };
});
