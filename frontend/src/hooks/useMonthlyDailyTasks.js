import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { doc, setDoc, onSnapshot, deleteDoc, runTransaction } from 'firebase/firestore';
import { db } from '../config/firebase';
import { showToast } from '../contexts/ToastContext';
import { getRecentMonthKeys, getMonthKey, dateKeyToMonthKey } from '../utils/monthKeyHelpers';

const MONTHS_TO_LOAD = 25;
const DEBOUNCE_MS = 2000;

const DEBUG = import.meta.env.DEV;
const logError = DEBUG ? console.error : () => {};

const pendingDailyTasksFlushes = new Map();

function getTaskDedupKey(task) {
  if (task?.id) return `id:${task.id}`;
  return [
    task?.date || '',
    task?.habitId || '',
    task?.title || '',
    task?.createdAt || '',
    task?.order ?? ''
  ].join('|');
}

function groupTasksByMonth(tasks) {
  const byMonth = {};

  if (!Array.isArray(tasks)) return byMonth;

  for (const task of tasks) {
    if (!task?.date) continue;
    const mk = dateKeyToMonthKey(task.date) || getMonthKey(new Date(task.date));
    if (!mk) continue;
    if (!byMonth[mk]) byMonth[mk] = [];
    byMonth[mk].push(task);
  }

  return byMonth;
}

function mergeTasksPreservingExisting(existingTasks, legacyTasks) {
  const merged = Array.isArray(existingTasks) ? [...existingTasks] : [];
  const seen = new Set(merged.map(getTaskDedupKey));

  for (const task of legacyTasks || []) {
    const key = getTaskDedupKey(task);
    if (seen.has(key)) continue;
    seen.add(key);
    merged.push(task);
  }

  return merged;
}

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
  const valueRef = useRef([]);
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
    const shardIds = new Set(fromShards.map(getTaskDedupKey));
    const merged = [...fromShards];
    
    if (legacyRef.current && Array.isArray(legacyRef.current)) {
      legacyRef.current.forEach(t => {
        if (!shardIds.has(getTaskDedupKey(t))) {
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
    valueRef.current = merged;
  }, []);

  const flushWrites = useCallback(async (allTasks) => {
    if (!userId) return;

    // Group tasks by their monthKey, pre-initializing all loaded monthKeys with empty arrays
    const byMonth = {};
    for (const mk of monthKeys) {
      byMonth[mk] = [];
    }

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
    } catch (err) {
      logError('Failed to save daily tasks to Firestore', err);
      showToast('Failed to save task changes. Please check your network connection.', 'error');
    }
  }, [userId, monthKeys]);

  const migrateLegacyTasks = useCallback(async (legacyTasks, legacyDoc) => {
    if (!userId) return;

    const byMonth = groupTasksByMonth(legacyTasks);

    await Promise.all(Object.entries(byMonth).map(async ([monthKey, monthTasks]) => {
      const shardRef = doc(db, 'users', userId, 'daily_tasks', monthKey);

      await runTransaction(db, async (transaction) => {
        const shardSnap = await transaction.get(shardRef);
        const existingTasks = shardSnap.exists() ? (shardSnap.data().tasks || []) : [];
        const mergedTasks = mergeTasksPreservingExisting(existingTasks, monthTasks);

        if (mergedTasks.length !== existingTasks.length) {
          transaction.set(
            shardRef,
            { tasks: mergedTasks, _v: Date.now() },
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
      valueRef.current = [];
      shardsRef.current = {};
      legacyRef.current = null;
      migratedRef.current = false;
      setLoading(false);
      return;
    }

    setLoading(true);
    setValue([]);
    valueRef.current = [];
    shardsRef.current = {};
    legacyRef.current = null;
    migratedRef.current = false;
    pendingRef.current = null;

    const unsubs = [];
    let pending = monthKeys.length + 1;
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
      const docRef = doc(db, 'users', userId, 'daily_tasks', monthKey);
      const markMonthLoaded = createLoadedMarker();
      unsubs.push(
        onSnapshot(docRef, (snap) => {
          if (snap.exists()) {
            shardsRef.current[monthKey] = snap.data().tasks || [];
          } else {
            shardsRef.current[monthKey] = [];
          }
          rebuildMerged();
          markMonthLoaded();
        }, markMonthLoaded)
      );
    });

    const legacyDoc = doc(db, 'users', userId, 'data', 'daily_tasks');
    const markLegacyLoaded = createLoadedMarker();
    unsubs.push(
      onSnapshot(legacyDoc, async (snap) => {
        if (snap.exists() && snap.data().value) {
          legacyRef.current = snap.data().value;
          if (!migratedRef.current && legacyRef.current.length > 0) {
            migratedRef.current = true;
            try {
              await migrateLegacyTasks(legacyRef.current, legacyDoc);
            } catch (err) {
              logError('Failed to migrate legacy daily tasks', err);
              showToast('Syncing planner tasks to shards...', 'info');
            }
          }
        } else {
          legacyRef.current = null;
        }
        rebuildMerged();
        markLegacyLoaded();
      }, markLegacyLoaded)
    );

    return () => {
      unsubs.forEach((u) => u());
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [userId, monthKeys, rebuildMerged, migrateLegacyTasks]);

  const updateValue = useCallback((newValue) => {
    if (!userId) return;

    const next = typeof newValue === 'function' ? newValue(valueRef.current) : newValue;
    setValue(next);
    valueRef.current = next;
    pendingRef.current = next;

    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      if (pendingRef.current) flushPendingWrite();
    }, DEBOUNCE_MS);
  }, [userId, flushPendingWrite]);

  return [value, updateValue, loading];
}
