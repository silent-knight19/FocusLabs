import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { doc, setDoc, onSnapshot } from 'firebase/firestore';
import { db } from '../config/firebase';
import { showToast } from '../contexts/ToastContext';
import { getRecentMonthKeys, getMonthKey, dateKeyToMonthKey } from '../utils/monthKeyHelpers';

const MONTHS_TO_LOAD = 6;
const DEBOUNCE_MS = 2000;

const DEBUG = import.meta.env.DEV;
const logError = DEBUG ? console.error : () => {};

const pendingDailyTasksFlushes = new Map();

function flushAllDailyTasks() {
  pendingDailyTasksFlushes.forEach((flushFn) => {
    try {
      flushFn();
    } catch (e) {
      logError('[MONTHLY DAILY TASKS] Flush error:', e);
    }
  });
}

if (typeof window !== 'undefined') {
  window.addEventListener('pagehide', flushAllDailyTasks);
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') {
      flushAllDailyTasks();
    }
  });
}

/**
 * Hook for managing monthly-sharded daily tasks
 * Path: users/{userId}/daily_tasks/{YYYY-MM}
 */
export function useMonthlyDailyTasks(userId) {
  const [value, setValue] = useState([]);
  const [loading, setLoading] = useState(true);
  const shardsRef = useRef({});
  const legacyRef = useRef(null);
  const migratedRef = useRef(false);
  const debounceRef = useRef(null);
  const pendingRef = useRef(null);

  const monthKeys = useMemo(() => getRecentMonthKeys(MONTHS_TO_LOAD), []);

  const rebuildMerged = useCallback(() => {
    // Merge all sharded arrays into one flat array of tasks
    const fromShards = Object.values(shardsRef.current).flat();
    
    // Add legacy tasks if they are not already in the shards
    const shardIds = new Set(fromShards.map(t => t.id));
    const merged = [...fromShards];
    
    if (legacyRef.current && Array.isArray(legacyRef.current)) {
      legacyRef.current.forEach(t => {
        if (!shardIds.has(t.id)) {
          merged.push(t);
        }
      });
    }
    
    // Sort tasks by date, then order
    merged.sort((a, b) => {
      if (a.date !== b.date) return new Date(a.date) - new Date(b.date);
      return a.order - b.order;
    });
    
    setValue(merged);
  }, []);

  const flushWrites = useCallback(async (allTasks) => {
    if (!userId) return;

    // Group tasks by their monthKey
    const byMonth = {};
    for (const task of allTasks) {
      const mk = dateKeyToMonthKey(task.date) || getMonthKey(new Date(task.date));
      if (!byMonth[mk]) byMonth[mk] = [];
      byMonth[mk].push(task);
    }

    try {
      await Promise.all(
        Object.entries(byMonth).map(([monthKey, monthTasks]) =>
          setDoc(
            doc(db, 'users', userId, 'daily_tasks', monthKey),
            { tasks: monthTasks, _v: Date.now() },
            { merge: true }
          )
        )
      );
      shardsRef.current = byMonth;
    } catch (err) {
      logError('Failed to save daily tasks to Firestore', err);
      showToast('Failed to save task changes. Please check your network connection.', 'error');
    }
  }, [userId]);

  const flushPendingWrite = useCallback(() => {
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
      debounceRef.current = null;
    }
    if (pendingRef.current && userId) {
      const val = pendingRef.current;
      pendingRef.current = null;
      flushWrites(val);
    }
  }, [userId, flushWrites]);

  const flushKey = `${userId || 'anon'}`;

  useEffect(() => {
    if (userId) {
      pendingDailyTasksFlushes.set(flushKey, flushPendingWrite);
    }
    return () => {
      pendingDailyTasksFlushes.delete(flushKey);
      flushPendingWrite();
    };
  }, [userId, flushKey, flushPendingWrite]);

  useEffect(() => {
    if (!userId) {
      setValue([]);
      setLoading(false);
      return;
    }

    const unsubs = [];
    let pending = monthKeys.length + 1;
    const markLoaded = () => {
      pending--;
      if (pending <= 0) setLoading(false);
    };

    monthKeys.forEach((monthKey) => {
      const docRef = doc(db, 'users', userId, 'daily_tasks', monthKey);
      unsubs.push(
        onSnapshot(docRef, (snap) => {
          if (snap.exists()) {
            shardsRef.current[monthKey] = snap.data().tasks || [];
          } else {
            shardsRef.current[monthKey] = [];
          }
          rebuildMerged();
          markLoaded();
        }, markLoaded)
      );
    });

    const legacyDoc = doc(db, 'users', userId, 'data', 'daily_tasks');
    unsubs.push(
      onSnapshot(legacyDoc, async (snap) => {
        if (snap.exists() && snap.data().value) {
          legacyRef.current = snap.data().value;
          if (!migratedRef.current && legacyRef.current.length > 0) {
            migratedRef.current = true;
            try {
              await flushWrites(legacyRef.current);
            } catch {
              showToast('Syncing planner tasks to shards...', 'info');
            }
          }
        } else {
          legacyRef.current = null;
        }
        rebuildMerged();
        markLoaded();
      }, markLoaded)
    );

    return () => {
      unsubs.forEach((u) => u());
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [userId, monthKeys, rebuildMerged, flushWrites]);

  const updateValue = useCallback((newValue) => {
    if (!userId) return;

    setValue((prev) => {
      const next = typeof newValue === 'function' ? newValue(prev) : newValue;
      pendingRef.current = next;

      if (debounceRef.current) clearTimeout(debounceRef.current);
      debounceRef.current = setTimeout(() => {
        if (pendingRef.current) flushPendingWrite();
      }, DEBOUNCE_MS);

      return next;
    });
  }, [userId, flushPendingWrite]);

  return [value, updateValue, loading];
}
