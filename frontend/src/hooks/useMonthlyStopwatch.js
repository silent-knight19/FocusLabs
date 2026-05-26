import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { doc, setDoc, onSnapshot, deleteDoc, getDocs, collection, query, orderBy, limit } from 'firebase/firestore';
import { db } from '../config/firebase';
import { showToast } from '../contexts/ToastContext';
import { getMonthKey, getRecentMonthKeys } from '../utils/monthKeyHelpers';

const MONTHS_TO_LOAD = 6;
const PAGE_SIZE = 500;

const DEBUG = import.meta.env.DEV;
const logError = DEBUG ? console.error : () => {};

const pendingStopwatchFlushes = new Map();

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
  const migratedRef = useRef(false);
  const debounceRef = useRef(null);
  const pendingRef = useRef(null);

  const monthKeys = useMemo(() => getRecentMonthKeys(MONTHS_TO_LOAD), []);

  const mergeSessions = useCallback((monthSessions) => {
    const all = monthSessions.flat();
    all.sort((a, b) => new Date(b.date) - new Date(a.date));
    setSessions(all);
    sessionsRef.current = all;
  }, []);

  const writeSessions = useCallback(async (allSessions) => {
    if (!userId) return;

    // Group sessions by their monthKey, pre-initializing all loaded monthKeys to empty arrays
    const byMonth = {};
    for (const mk of monthKeys) {
      byMonth[mk] = [];
    }

    for (const session of allSessions) {
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
      setLoading(false);
      return;
    }

    const unsubs = [];
    const monthData = {};
    let pending = monthKeys.length + 1;

    const tryMerge = () => {
      mergeSessions(Object.values(monthData));
    };

    const markLoaded = () => {
      pending--;
      if (pending <= 0) setLoading(false);
    };

    monthKeys.forEach((monthKey) => {
      const docRef = doc(db, 'users', userId, 'stopwatch', monthKey);
      unsubs.push(
        onSnapshot(docRef, (snap) => {
          if (snap.exists()) {
            monthData[monthKey] = snap.data().sessions || [];
          } else {
            monthData[monthKey] = [];
          }
          tryMerge();
          markLoaded();
        }, markLoaded)
      );
    });

    const legacyDoc = doc(db, 'users', userId, 'data', 'stopwatch_history');
    unsubs.push(
      onSnapshot(legacyDoc, async (snap) => {
        if (snap.exists() && snap.data().value?.length) {
          const legacy = snap.data().value;
          if (!migratedRef.current) {
            migratedRef.current = true;
            await writeSessions(legacy);
            // Delete legacy doc after migration to prevent re-migration on load.
            try { await deleteDoc(legacyDoc); } catch { /* ignore */ }
          }
          monthData.legacy = legacy;
        }
        tryMerge();
        markLoaded();
      }, markLoaded)
    );

    return () => {
      unsubs.forEach((u) => u());
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [userId, monthKeys, mergeSessions, writeSessions]);

  const setSessionsUpdater = useCallback((newValue) => {
    if (!userId) return;

    const rawNext = typeof newValue === 'function' ? newValue(sessionsRef.current) : newValue;

    // Deduplicate by session ID to prevent duplicate laps being written to Firestore.
    // This is the safety net for any race conditions or double-calls from the UI.
    const seen = new Set();
    const next = rawNext.filter(session => {
      if (seen.has(session.id)) return false;
      seen.add(session.id);
      return true;
    });

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
    const extra = snap.docs.flatMap((d) => d.data().sessions || []);
    setSessions((prev) => {
      const ids = new Set(prev.map((s) => s.id));
      const merged = [...prev, ...extra.filter((s) => !ids.has(s.id))];
      merged.sort((a, b) => new Date(b.date) - new Date(a.date));
      sessionsRef.current = merged;
      return merged;
    });
    return extra;
  }, [userId]);

  return [sessions, setSessionsUpdater, loading, loadMore, flushPendingWrite];
}
