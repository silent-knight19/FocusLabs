import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { doc, setDoc, onSnapshot } from 'firebase/firestore';
import { db } from '../config/firebase';
import { showToast } from '../contexts/ToastContext';
import {
  getRecentMonthKeys,
  shardCompletionsByMonth,
  mergeMonthlyShards
} from '../utils/monthKeyHelpers';

const MONTHS_TO_LOAD = 13;
const DEBOUNCE_MS = 2000;

const pendingCompletionsFlushes = new Map();

function flushAllCompletions() {
  pendingCompletionsFlushes.forEach((flushFn) => {
    try {
      flushFn();
    } catch (e) {
      console.error('[MONTHLY COMPLETIONS] Flush error:', e);
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
  const [loading, setLoading] = useState(true);
  const shardsRef = useRef({});
  const legacyRef = useRef(null);
  const migratedRef = useRef(false);
  const debounceRef = useRef(null);
  const pendingRef = useRef(null);

  const monthKeys = useMemo(() => getRecentMonthKeys(MONTHS_TO_LOAD), []);

  const rebuildMerged = useCallback(() => {
    const fromShards = mergeMonthlyShards(shardsRef.current);
    if (legacyRef.current && Object.keys(legacyRef.current).length > 0) {
      for (const [habitId, dates] of Object.entries(legacyRef.current)) {
        if (!fromShards[habitId]) fromShards[habitId] = {};
        Object.assign(fromShards[habitId], dates);
      }
    }
    setValue(fromShards);
  }, []);

  const flushWrites = useCallback(async (completions) => {
    if (!userId) return;
    const shards = shardCompletionsByMonth(completions);
    shardsRef.current = shards;

    await Promise.all(
      Object.entries(shards).map(([monthKey, data]) =>
        setDoc(
          doc(db, 'users', userId, collectionName, monthKey),
          { habits: data, _v: Date.now() },
          { merge: true }
        )
      )
    );
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
      const docRef = doc(db, 'users', userId, collectionName, monthKey);
      unsubs.push(
        onSnapshot(docRef, (snap) => {
          if (snap.exists()) {
            const data = snap.data();
            shardsRef.current[monthKey] = data.habits || data;
          } else {
            delete shardsRef.current[monthKey];
          }
          rebuildMerged();
          markLoaded();
        }, markLoaded)
      );
    });

    const legacyDoc = doc(db, 'users', userId, 'data', collectionName);
    unsubs.push(
      onSnapshot(legacyDoc, async (snap) => {
        if (snap.exists() && snap.data().value) {
          legacyRef.current = snap.data().value;
          if (!migratedRef.current && Object.keys(legacyRef.current).length > 0) {
            migratedRef.current = true;
            try {
              await flushWrites(legacyRef.current);
            } catch (e) {
              showToast('Migration in progress — some data may sync shortly.', 'info');
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
  }, [userId, collectionName, monthKeys, rebuildMerged, flushWrites]);

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
