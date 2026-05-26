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
    const { collectionName, monthKey } = context.params;
    const allowedCollections = new Set(['completions', 'custom_completions', 'stopwatch', 'daily_tasks']);
    if (!allowedCollections.has(collectionName)) {
      return null;
    }

    // Reject any document whose ID is not a valid YYYY-MM month key.
    // This prevents path-traversal tricks like '../../admin' from being stored.
    const validMonthKey = /^\d{4}-\d{2}$/.test(monthKey);
    if (!validMonthKey) {
      if (change.after.exists) {
        await change.after.ref.delete();
      }
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

function normalizeSessionCategory(category, label = '') {
  const normalizedCategory = String(category || '').trim().toLowerCase();
  const normalizedLabel = String(label || '').trim().toLowerCase();

  if (normalizedCategory === 'study' || normalizedLabel.includes('study')) return 'study';
  if (['prod', 'productive', 'productivity', 'work'].includes(normalizedCategory)) return 'prod';
  if (
    ['self', 'self growth', 'self-growth', 'personal', 'health', 'fitness', 'social'].includes(normalizedCategory) ||
    normalizedLabel.includes('self') ||
    normalizedLabel.includes('growth') ||
    normalizedLabel.includes('fitness') ||
    normalizedLabel.includes('health')
  ) {
    return 'self';
  }

  return 'other';
}

function normalizeSessionArray(data, fallbackCategory = 'other') {
  if (!Array.isArray(data)) return [];

  return data.map((session, index) => {
    if (!session || typeof session !== 'object') return null;

    const rawDate = session.date || session.createdAt || session.timestamp || session.startedAt || session.startTime;
    const parsedDate = new Date(rawDate);
    const time = Number(session.time ?? session.duration ?? session.durationMs ?? 0);

    if (Number.isNaN(parsedDate.getTime()) || !Number.isFinite(time) || time < 0) {
      return null;
    }

    const label = typeof session.label === 'string' && session.label.trim()
      ? session.label
      : `Session ${index + 1}`;
    const category = normalizeSessionCategory(session.category || fallbackCategory, label);

    return {
      ...session,
      id: session.id || `${parsedDate.toISOString()}_${time}_${category}_${label}`,
      date: parsedDate.toISOString(),
      time,
      category,
      label
    };
  }).filter(Boolean);
}

function mergeUniqueSessions(...groups) {
  const merged = [];
  const seen = new Set();

  groups.flat().forEach((session) => {
    if (!session || seen.has(session.id)) return;
    seen.add(session.id);
    merged.push(session);
  });

  merged.sort((a, b) => new Date(b.date) - new Date(a.date));
  return merged;
}

async function deleteCollectionDocs(collectionRef) {
  const snap = await collectionRef.get();
  const BATCH_CHUNK_SIZE = 400;

  for (let i = 0; i < snap.docs.length; i += BATCH_CHUNK_SIZE) {
    const batch = db.batch();
    snap.docs.slice(i, i + BATCH_CHUNK_SIZE).forEach((snapshotDoc) => {
      batch.delete(snapshotDoc.ref);
    });
    await batch.commit();
  }
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

  // Collect all write operations as plain objects so we can chunk them.
  // Firestore batches are limited to 500 operations; large imports with many
  // months of history can exceed this easily.
  const BATCH_CHUNK_SIZE = 400;
  const writeOps = []; // Each entry: { ref, data }
  const userRef = db.collection('users').doc(userId);

  const flatCollectionsToReset = [
    'habits', 'subtasks', 'subtask_completions', 'notes',
    'custom_habits', 'custom_subtasks', 'custom_subtask_completions',
    'study_sessions', 'productivity_sessions', 'settings', 'goals',
    'completions', 'custom_completions', 'daily_tasks', 'stopwatch_history'
  ];

  await Promise.all(flatCollectionsToReset.map((colName) =>
    userRef.collection('data').doc(colName).delete().catch(() => null)
  ));

  await Promise.all(['completions', 'custom_completions', 'daily_tasks', 'stopwatch'].map((colName) =>
    deleteCollectionDocs(userRef.collection(colName))
  ));

  const mapping = {
    habits: 'habits',
    subtasks: 'subtasks',
    subtaskCompletions: 'subtask_completions',
    customSubtasks: 'custom_subtasks',
    customSubtaskCompletions: 'custom_subtask_completions',
    customHabits: 'custom_habits',
    settings: 'settings',
    goals: 'goals',
    notes: 'notes'
  };

  for (const [jsonKey, colName] of Object.entries(mapping)) {
    const val = importData[jsonKey] ?? importData.data?.[jsonKey];
    if (val !== undefined && val !== null) {
      const ref = db.doc(`users/${userId}/data/${colName}`);
      writeOps.push({ ref, data: { value: val, _v: Date.now() } });
    }
  }

  const shardedCollections = ['completions', 'custom_completions'];

  for (const colName of shardedCollections) {
    let jsonKey = colName;
    if (colName === 'custom_completions') jsonKey = 'customCompletions';
    if (colName === 'subtask_completions') jsonKey = 'subtaskCompletions';

    const val = importData[jsonKey] ?? importData.data?.[jsonKey];
    if (val !== undefined && val !== null) {
      const shards = shardDataByMonth(val);
      for (const [monthKey, monthData] of Object.entries(shards)) {
        const ref = db.doc(`users/${userId}/${colName}/${monthKey}`);
        writeOps.push({ ref, data: { habits: monthData, _v: Date.now() } });
      }
    }
  }

  const stopwatchData = mergeUniqueSessions(
    normalizeSessionArray(importData.stopwatchHistory ?? importData.data?.stopwatchHistory),
    normalizeSessionArray(importData.studySessions ?? importData.data?.studySessions, 'study'),
    normalizeSessionArray(importData.productivitySessions ?? importData.data?.productivitySessions, 'prod')
  );

  if (stopwatchData.length > 0) {
    const shards = shardArrayByMonth(stopwatchData);
    for (const [monthKey, monthSessions] of Object.entries(shards)) {
      const ref = db.doc(`users/${userId}/stopwatch/${monthKey}`);
      writeOps.push({ ref, data: { sessions: monthSessions, _v: Date.now() } });
    }
  }

  const dailyTasksData = importData.dailyTasks ?? importData.data?.dailyTasks;
  if (dailyTasksData && Array.isArray(dailyTasksData)) {
    const shards = shardArrayByMonth(dailyTasksData);
    for (const [monthKey, monthTasks] of Object.entries(shards)) {
      const ref = db.doc(`users/${userId}/daily_tasks/${monthKey}`);
      writeOps.push({ ref, data: { tasks: monthTasks, _v: Date.now() } });
    }
  }

  // Commit in chunks to stay safely under the 500-operation batch limit.
  for (let i = 0; i < writeOps.length; i += BATCH_CHUNK_SIZE) {
    const chunk = writeOps.slice(i, i + BATCH_CHUNK_SIZE);
    const batch = db.batch();
    chunk.forEach(({ ref, data: opData }) => batch.set(ref, opData));
    await batch.commit();
  }

  return { success: true };
});
