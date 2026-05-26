import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { doc, setDoc, onSnapshot, deleteDoc, runTransaction } from 'firebase/firestore';
import { db } from '../config/firebase';
import { showToast } from '../contexts/ToastContext';
import {
  getRecentMonthKeys,
  shardCompletionsByMonth,
  mergeMonthlyShards
} from '../utils/monthKeyHelpers';

const MONTHS_TO_LOAD = 25;
const DEBOUNCE_MS = 2000;

const DEBUG = import.meta.env.DEV;
const logError = DEBUG ? console.error : () => {};

const pendingCompletionsFlushes = new Map();

function getShardHabits(docData) {
  if (!docData || typeof docData !== 'object') return {};
  return docData.habits && typeof docData.habits === 'object'
    ? docData.habits
    : docData;
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

function flushAllCompletions() {
  pendingCompletionsFlushes.forEach((flushFn) => {
    try {
      flushFn();
    } catch (e) {
      logError('[MONTHLY COMPLETIONS] Flush error:', e);
    }
  });
}

if (typeof window !== 'undefined') {
  window.addEventListener('pagehide', flushAllCompletions);
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') {
      flushAllCompletions();
    }
  });
}

/**
 * Monthly-sharded completions with legacy doc fallback.
 * New path: users/{uid}/{collectionName}/{YYYY-MM}
 * Legacy: users/{uid}/data/{collectionName}
 */
export function useMonthlyCompletions(userId, collectionName = 'completions') {
  const [value, setValue] = useState({});
  const valueRef = useRef({});
  const [loading, setLoading] = useState(true);
  const shardsRef = useRef({});
  const legacyRef = useRef(null);
  const migratedRef = useRef(false);
  const debounceRef = useRef(null);
  const pendingRef = useRef(null);

  const monthKeys = useMemo(() => getRecentMonthKeys(MONTHS_TO_LOAD), []);

  const rebuildMerged = useCallback(() => {
    const fromShards = mergeMonthlyShards(shardsRef.current);

    // Only backfill legacy entries that don't exist in shards.
    // Shards are the source of truth after migration — we must never let
    // old legacy data overwrite newer shard values.
    if (legacyRef.current && Object.keys(legacyRef.current).length > 0) {
      for (const [habitId, dates] of Object.entries(legacyRef.current)) {
        if (!dates || typeof dates !== 'object') continue;
        if (!fromShards[habitId]) fromShards[habitId] = {};
        for (const [dateKey, status] of Object.entries(dates)) {
          if (fromShards[habitId][dateKey] === undefined) {
            fromShards[habitId][dateKey] = status;
          }
        }
      }
    }

    setValue(fromShards);
    valueRef.current = fromShards;
  }, []);

  const flushWrites = useCallback(async (completions) => {
    if (!userId) return;
    
    // Split legacy/active completions object into monthly shards
    const shards = shardCompletionsByMonth(completions);

    // Pre-initialize all loaded monthKeys to empty objects so emptied months are cleared in Firestore
    for (const mk of monthKeys) {
      if (!shards[mk]) {
        shards[mk] = {};
      }
    }

    try {
      await Promise.all(
        Object.entries(shards).map(([monthKey, data]) =>
          // Replace each monthly shard so removed day/habit keys stay removed
          // after the next Firestore snapshot.
          setDoc(
            doc(db, 'users', userId, collectionName, monthKey),
            { habits: data, _v: Date.now() }
          )
        )
      );
    } catch (err) {
      logError('Failed to save completions to Firestore', err);
      showToast('Failed to save completion changes. Please check your network connection.', 'error');
    }
  }, [userId, collectionName, monthKeys]);

  const migrateLegacyCompletions = useCallback(async (legacyCompletions, legacyDoc) => {
    if (!userId) return;

    const legacyShards = shardCompletionsByMonth(legacyCompletions);

    await Promise.all(Object.entries(legacyShards).map(async ([monthKey, legacyShard]) => {
      const shardRef = doc(db, 'users', userId, collectionName, monthKey);

      await runTransaction(db, async (transaction) => {
        const shardSnap = await transaction.get(shardRef);
        const existingShard = shardSnap.exists() ? getShardHabits(shardSnap.data()) : {};
        const missing = getMissingCompletionEntries(existingShard, legacyShard);

        if (Object.keys(missing).length > 0) {
          transaction.set(
            shardRef,
            { habits: missing, _v: Date.now() },
            { merge: true }
          );
        }
      });
    }));

    await deleteDoc(legacyDoc);
  }, [userId, collectionName]);

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

  const flushKey = `${userId || 'anon'}:${collectionName}`;

  useEffect(() => {
    if (userId) {
      pendingCompletionsFlushes.set(flushKey, flushPendingWrite);
    }
    return () => {
      pendingCompletionsFlushes.delete(flushKey);
      flushPendingWrite();
    };
  }, [userId, flushKey, flushPendingWrite]);

  useEffect(() => {
    if (!userId) {
      setValue({});
      valueRef.current = {};
      shardsRef.current = {};
      legacyRef.current = null;
      migratedRef.current = false;
      setLoading(false);
      return;
    }

    setLoading(true);
    setValue({});
    valueRef.current = {};
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
      const docRef = doc(db, 'users', userId, collectionName, monthKey);
      const markMonthLoaded = createLoadedMarker();
      unsubs.push(
        onSnapshot(docRef, (snap) => {
          if (snap.exists()) {
            const data = snap.data();
            shardsRef.current[monthKey] = getShardHabits(data);
          } else {
            delete shardsRef.current[monthKey];
          }
          rebuildMerged();
          markMonthLoaded();
        }, markMonthLoaded)
      );
    });

    const legacyDoc = doc(db, 'users', userId, 'data', collectionName);
    const markLegacyLoaded = createLoadedMarker();
    unsubs.push(
      onSnapshot(legacyDoc, async (snap) => {
        if (snap.exists() && snap.data().value) {
          legacyRef.current = snap.data().value;
          if (!migratedRef.current && Object.keys(legacyRef.current).length > 0) {
            migratedRef.current = true;
            try {
              await migrateLegacyCompletions(legacyRef.current, legacyDoc);
            } catch (err) {
              logError('Failed to migrate legacy completions', err);
              showToast('Migration in progress — some data may sync shortly.', 'info');
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
  }, [userId, collectionName, monthKeys, rebuildMerged, migrateLegacyCompletions]);

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
