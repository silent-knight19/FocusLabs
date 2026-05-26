import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { doc, setDoc, onSnapshot, deleteDoc, getDocs, collection, query, orderBy, limit, runTransaction } from 'firebase/firestore';
import { db } from '../config/firebase';
import { showToast } from '../contexts/ToastContext';
import { getMonthKey, getRecentMonthKeys } from '../utils/monthKeyHelpers';
import { normalizeSessionList, mergeUniqueSessions } from '../utils/focusSessionHelpers';

const MONTHS_TO_LOAD = 25;
const PAGE_SIZE = 500;

const DEBUG = import.meta.env.DEV;
const logError = DEBUG ? console.error : () => {};

const pendingStopwatchFlushes = new Map();

function emptyMigrationState() {
  return {
    stopwatch_history: false,
    study_sessions: false,
    productivity_sessions: false
  };
}

function groupSessionsByMonth(sessions) {
  const byMonth = {};

  for (const session of normalizeSessionList(sessions)) {
    const monthKey = getMonthKey(new Date(session.date));
    if (!byMonth[monthKey]) byMonth[monthKey] = [];
    byMonth[monthKey].push(session);
  }

  return byMonth;
}

function flushAllStopwatch() {
  pendingStopwatchFlushes.forEach((flushFn) => {
    try {
      flushFn();
    } catch (e) {
      logError('[MONTHLY STOPWATCH] Flush error:', e);
    }
  });
}

if (typeof window !== 'undefined') {
  window.addEventListener('pagehide', flushAllStopwatch);
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') {
      flushAllStopwatch();
    }
  });
}

/**
 * Monthly-sharded stopwatch history with legacy fallback and pagination.
 * New: users/{uid}/stopwatch/{YYYY-MM} -> { sessions: [...] }
 * Legacy: users/{uid}/data/stopwatch_history -> { value: [...] }
 */
export function useMonthlyStopwatch(userId) {
  const [sessions, setSessions] = useState([]);
  const sessionsRef = useRef([]);
  const [loading, setLoading] = useState(true);
  const migratedRef = useRef(emptyMigrationState());
  const debounceRef = useRef(null);
  const pendingRef = useRef(null);

  const monthKeys = useMemo(() => getRecentMonthKeys(MONTHS_TO_LOAD), []);

  const mergeSessions = useCallback((sessionGroups) => {
    const all = mergeUniqueSessions(...sessionGroups);
    setSessions(all);
    sessionsRef.current = all;
  }, []);

  const writeSessions = useCallback(async (allSessions) => {
    if (!userId) return;

    const normalizedSessions = normalizeSessionList(allSessions);

    // Group sessions by their monthKey, pre-initializing all loaded monthKeys to empty arrays
    const byMonth = {};
    for (const mk of monthKeys) {
      byMonth[mk] = [];
    }

    for (const session of normalizedSessions) {
      const mk = getMonthKey(new Date(session.date));
      if (!byMonth[mk]) byMonth[mk] = [];
      byMonth[mk].push(session);
    }

    try {
      await Promise.all(
        Object.entries(byMonth).map(([monthKey, monthSessions]) =>
          setDoc(
            doc(db, 'users', userId, 'stopwatch', monthKey),
            { sessions: monthSessions, _v: Date.now() },
            { merge: true }
          )
        )
      );
    } catch (err) {
      logError('Failed to save stopwatch sessions to Firestore', err);
      showToast('Failed to save stopwatch changes. Please check your network connection.', 'error');
    }
  }, [userId, monthKeys]);

  const migrateLegacySessions = useCallback(async (legacySessions, legacyDoc) => {
    if (!userId) return;

    const byMonth = groupSessionsByMonth(legacySessions);

    await Promise.all(Object.entries(byMonth).map(async ([monthKey, monthSessions]) => {
      const shardRef = doc(db, 'users', userId, 'stopwatch', monthKey);

      await runTransaction(db, async (transaction) => {
        const shardSnap = await transaction.get(shardRef);
        const existingSessions = shardSnap.exists()
          ? normalizeSessionList(shardSnap.data().sessions || [])
          : [];
        const mergedSessions = mergeUniqueSessions(existingSessions, monthSessions);

        if (mergedSessions.length !== existingSessions.length) {
          transaction.set(
            shardRef,
            { sessions: mergedSessions, _v: Date.now() },
            { merge: true }
          );
        }
      });
    }));

    await deleteDoc(legacyDoc);
  }, [userId]);

  const flushPendingWrite = useCallback(() => {
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
      debounceRef.current = null;
    }
    if (pendingRef.current && userId) {
      const val = pendingRef.current;
      pendingRef.current = null;
      writeSessions(val);
    }
  }, [userId, writeSessions]);

  const flushKey = `${userId || 'anon'}`;

  useEffect(() => {
    if (userId) {
      pendingStopwatchFlushes.set(flushKey, flushPendingWrite);
    }
    return () => {
      pendingStopwatchFlushes.delete(flushKey);
      flushPendingWrite();
    };
  }, [userId, flushKey, flushPendingWrite]);

  useEffect(() => {
    if (!userId) {
      setSessions([]);
      sessionsRef.current = [];
      migratedRef.current = emptyMigrationState();
      setLoading(false);
      return;
    }

    setLoading(true);
    setSessions([]);
    sessionsRef.current = [];
    migratedRef.current = emptyMigrationState();
    pendingRef.current = null;

    const unsubs = [];
    const monthData = {};
    let pending = monthKeys.length + 4;

    const tryMerge = () => {
      mergeSessions(Object.values(monthData));
    };

    const markLoaded = () => {
      pending--;
      if (pending <= 0) setLoading(false);
    };
    const createLoadedMarker = () => {
      let loaded = false;
      return () => {
        if (loaded) return;
        loaded = true;
        markLoaded();
      };
    };

    monthKeys.forEach((monthKey) => {
      const docRef = doc(db, 'users', userId, 'stopwatch', monthKey);
      const markMonthLoaded = createLoadedMarker();
      unsubs.push(
        onSnapshot(docRef, (snap) => {
          if (snap.exists()) {
            monthData[monthKey] = normalizeSessionList(snap.data().sessions || []);
          } else {
            monthData[monthKey] = [];
          }
          tryMerge();
          markMonthLoaded();
        }, markMonthLoaded)
      );
    });

    const legacySources = [
      { docName: 'stopwatch_history', key: 'legacy_stopwatch' },
      { docName: 'study_sessions', key: 'legacy_study', forcedCategory: 'study' },
      { docName: 'productivity_sessions', key: 'legacy_productivity', forcedCategory: 'prod' }
    ];

    legacySources.forEach(({ docName, key, forcedCategory }) => {
      const legacyDoc = doc(db, 'users', userId, 'data', docName);
      const markLegacyLoaded = createLoadedMarker();
      unsubs.push(
        onSnapshot(legacyDoc, async (snap) => {
          if (snap.exists() && Array.isArray(snap.data().value) && snap.data().value.length > 0) {
            const legacy = normalizeSessionList(snap.data().value, {
              fallbackCategory: forcedCategory || 'other'
            });

            if (!migratedRef.current[docName]) {
              migratedRef.current[docName] = true;
              try {
                await migrateLegacySessions(legacy, legacyDoc);
              } catch (err) {
                logError(`Failed to migrate legacy ${docName}`, err);
                showToast('Syncing legacy stopwatch data...', 'info');
              }
            }

            monthData[key] = legacy;
          } else {
            monthData[key] = [];
          }
          tryMerge();
          markLegacyLoaded();
        }, markLegacyLoaded)
      );
    });

    getDocs(collection(db, 'users', userId, 'stopwatch'))
      .then((snap) => {
        snap.forEach((snapshotDoc) => {
          if (!monthData[snapshotDoc.id]) {
            monthData[snapshotDoc.id] = normalizeSessionList(snapshotDoc.data().sessions || []);
          }
        });
        tryMerge();
      })
      .catch((err) => {
        logError('Failed to fetch full stopwatch history', err);
      })
      .finally(markLoaded);

    return () => {
      unsubs.forEach((u) => u());
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [userId, monthKeys, mergeSessions, migrateLegacySessions]);

  const setSessionsUpdater = useCallback((newValue) => {
    if (!userId) return;

    const rawNext = typeof newValue === 'function' ? newValue(sessionsRef.current) : newValue;
    const next = mergeUniqueSessions(normalizeSessionList(rawNext));

    setSessions(next);
    sessionsRef.current = next;
    pendingRef.current = next;

    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      if (pendingRef.current) flushPendingWrite();
    }, 2000);
  }, [userId, flushPendingWrite]);

  const loadMore = useCallback(async () => {
    if (!userId) return [];
    // Order by document name (month key) descending to get newest months first.
    // Ordering by '_v' would require a composite index and doesn't reliably
    // produce chronological order across months.
    const q = query(
      collection(db, 'users', userId, 'stopwatch'),
      orderBy('__name__', 'desc'),
      limit(PAGE_SIZE)
    );
    const snap = await getDocs(q);
    const extra = normalizeSessionList(snap.docs.flatMap((d) => d.data().sessions || []));
    setSessions((prev) => {
      const merged = mergeUniqueSessions(prev, extra);
      sessionsRef.current = merged;
      return merged;
    });
    return extra;
  }, [userId]);

  return [sessions, setSessionsUpdater, loading, loadMore, flushPendingWrite];
}
