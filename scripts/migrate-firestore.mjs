/**
 * One-time Firestore migration: legacy single-doc -> monthly shards
 *
 * Usage:
 *   GOOGLE_APPLICATION_CREDENTIALS=./service-account.json node scripts/migrate-firestore.js
 *   node scripts/migrate-firestore.js --dry-run
 */

import admin from 'firebase-admin';

const dryRun = process.argv.includes('--dry-run');

function shardCompletionsByMonth(completions) {
  const shards = {};
  if (!completions || typeof completions !== 'object') return shards;
  for (const [habitId, dates] of Object.entries(completions)) {
    if (!dates || typeof dates !== 'object') continue;
    for (const [dateKey, status] of Object.entries(dates)) {
      const parts = dateKey.split('-');
      if (parts.length < 3) continue;
      const monthKey = `${parts[0]}-${parts[1]}`;
      const day = parts[2];
      if (!shards[monthKey]) shards[monthKey] = {};
      if (!shards[monthKey][habitId]) shards[monthKey][habitId] = {};
      shards[monthKey][habitId][day] = status;
    }
  }
  return shards;
}

function shardStopwatchByMonth(sessions) {
  const shards = {};
  if (!Array.isArray(sessions)) return shards;
  for (const session of sessions) {
    const d = new Date(session.date);
    const monthKey = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    if (!shards[monthKey]) shards[monthKey] = [];
    shards[monthKey].push(session);
  }
  return shards;
}

function getMissingCompletionEntries(existingShard, legacyShard) {
  const missing = {};

  for (const [habitId, legacyDays] of Object.entries(legacyShard || {})) {
    if (!legacyDays || typeof legacyDays !== 'object') continue;

    const existingDays = existingShard?.[habitId] || {};
    for (const [day, status] of Object.entries(legacyDays)) {
      if (existingDays[day] === undefined) {
        if (!missing[habitId]) missing[habitId] = {};
        missing[habitId][day] = status;
      }
    }
  }

  return missing;
}

function mergeUniqueSessions(existingSessions = [], legacySessions = []) {
  const merged = [];
  const seen = new Set();

  [...existingSessions, ...legacySessions].forEach((session) => {
    if (!session) return;
    const sessionId = session.id || `${session.date || ''}_${session.time ?? session.duration ?? ''}_${session.category || ''}_${session.label || ''}`;
    if (seen.has(sessionId)) return;
    seen.add(sessionId);
    if (!session.id) session = { ...session, id: sessionId };
    merged.push(session);
  });

  merged.sort((a, b) => new Date(b.date) - new Date(a.date));
  return merged;
}

async function migrateUser(db, userId) {
  const userRef = db.collection('users').doc(userId);
  let migrated = 0;

  for (const col of ['completions', 'custom_completions']) {
    const legacySnap = await userRef.collection('data').doc(col).get();
    if (!legacySnap.exists || !legacySnap.data()?.value) continue;

    const shards = shardCompletionsByMonth(legacySnap.data().value);
    for (const [monthKey, data] of Object.entries(shards)) {
      const ref = userRef.collection(col).doc(monthKey);
      const existingSnap = await ref.get();
      const existing = existingSnap.exists ? (existingSnap.data().habits || {}) : {};
      const missing = getMissingCompletionEntries(existing, data);
      const missingHabitCount = Object.keys(missing).length;

      if (!dryRun) {
        if (missingHabitCount > 0) {
          await ref.set({ habits: missing, _v: Date.now(), migratedAt: new Date().toISOString() }, { merge: true });
        }
      }
      migrated++;
      console.log(`  ${col}/${monthKey}: ${missingHabitCount} habits backfilled`);
    }
  }

  const stopSnap = await userRef.collection('data').doc('stopwatch_history').get();
  if (stopSnap.exists && stopSnap.data()?.value?.length) {
    const shards = shardStopwatchByMonth(stopSnap.data().value);
    for (const [monthKey, sessions] of Object.entries(shards)) {
      const ref = userRef.collection('stopwatch').doc(monthKey);
      const existingSnap = await ref.get();
      const existingSessions = existingSnap.exists ? (existingSnap.data().sessions || []) : [];
      const mergedSessions = mergeUniqueSessions(existingSessions, sessions);

      if (!dryRun) {
        if (mergedSessions.length !== existingSessions.length) {
          await ref.set({ sessions: mergedSessions, _v: Date.now(), migratedAt: new Date().toISOString() }, { merge: true });
        }
      }
      migrated++;
      console.log(`  stopwatch/${monthKey}: ${mergedSessions.length - existingSessions.length} sessions backfilled`);
    }
  }

  return migrated;
}

async function main() {
  if (!admin.apps.length) {
    admin.initializeApp();
  }
  const db = admin.firestore();

  console.log(dryRun ? 'DRY RUN — no writes' : 'Migrating Firestore data...');

  const usersSnap = await db.collectionGroup('data').get();
  const userIds = [...new Set(usersSnap.docs.map((d) => d.ref.parent.parent.id))];
  let total = 0;

  for (const userId of userIds) {
    console.log(`User: ${userId}`);
    total += await migrateUser(db, userId);
  }

  console.log(`Done. ${total} monthly documents ${dryRun ? 'would be' : ''} written.`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
