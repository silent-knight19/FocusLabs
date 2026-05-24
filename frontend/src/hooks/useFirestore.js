import { useState, useEffect, useRef, useCallback } from 'react';
import {
  doc,
  setDoc,
  onSnapshot
} from 'firebase/firestore';
import { db } from '../config/firebase';
import { showToast } from '../contexts/ToastContext';

const DEBUG = import.meta.env.DEV;
const log = DEBUG ? console.log : () => {};
const warn = DEBUG ? console.warn : () => {};
const errorLog = DEBUG ? console.error : () => {};

const WRITE_LIMIT = 40;
const WINDOW_MS = 60000;
const DEBOUNCE_MS = 2000;
const THROTTLE_MS = 3000;
const MAX_RETRIES = 3;

const globalCircuitBreaker = {
  writes: {},
  lastReset: {},
  broken: {}
};

const queuedWrites = {};
const pendingFlushes = new Map();

function valuesEqual(a, b) {
  if (a === b) return true;
  if (a == null || b == null) return false;
  return JSON.stringify(a) === JSON.stringify(b);
}

function flushAllPending() {
  pendingFlushes.forEach((flushFn) => {
    try {
      flushFn();
    } catch (e) {
      errorLog('[FIRESTORE] Flush error:', e);
    }
  });
}

if (typeof window !== 'undefined') {
  const handlePageHide = () => flushAllPending();
  window.addEventListener('pagehide', handlePageHide);
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') {
      flushAllPending();
    }
  });
}

async function writeWithRetry(docRef, payload, collectionName, attempt = 0) {
  try {
    await setDoc(docRef, payload, { merge: true });
    return true;
  } catch (err) {
    errorLog(`[FIRESTORE] Write failed for "${collectionName}" (attempt ${attempt + 1}):`, err);
    if (attempt < MAX_RETRIES - 1) {
      const delay = Math.pow(2, attempt) * 1000;
      await new Promise((r) => setTimeout(r, delay));
      return writeWithRetry(docRef, payload, collectionName, attempt + 1);
    }
    showToast('Failed to save changes. Please check your connection.', 'error', 8000);
    return false;
  }
}

function scheduleQueuedRetry(userId, collectionName, value, performWrite) {
  const key = collectionName;
  if (queuedWrites[key]) return;

  queuedWrites[key] = true;
  const retryAt = globalCircuitBreaker.lastReset[collectionName] + WINDOW_MS;

  setTimeout(async () => {
    delete queuedWrites[key];
    if (globalCircuitBreaker.broken[collectionName]) {
      globalCircuitBreaker.broken[collectionName] = false;
      globalCircuitBreaker.writes[collectionName] = 0;
    }
    await performWrite(value);
    showToast('Pending changes saved.', 'success', 3000);
  }, Math.max(0, retryAt - Date.now()));
}

/**
 * Custom hook for syncing state with Firestore
 * @param {string} userId
 * @param {string} collectionName
 * @param {any} initialValue
 * @returns {[any, Function, boolean]}
 */
export function useFirestore(userId, collectionName, initialValue) {
  const initialValueRef = useRef(initialValue);

  const [value, setValue] = useState(initialValue);
  const [loading, setLoading] = useState(true);

  const valueRef = useRef(initialValue);
  const versionRef = useRef(0);
  const remoteVersionRef = useRef(0);

  const lastWriteRef = useRef(0);
  const pendingUpdateRef = useRef(null);
  const debounceTimerRef = useRef(null);
  const pendingValueRef = useRef(null);
  const userIdRef = useRef(userId);
  const performWriteRef = useRef(null);

  userIdRef.current = userId;

  useEffect(() => {
    if (!userId) {
      setValue(initialValueRef.current);
      valueRef.current = initialValueRef.current;
      versionRef.current = 0;
      setLoading(false);
      return;
    }

    const docRef = doc(db, 'users', userId, 'data', collectionName);

    const unsubscribe = onSnapshot(
      docRef,
      (snapshot) => {
        if (snapshot.exists()) {
          const docData = snapshot.data();
          const data = docData.value;
          const remoteVersion = docData._v ?? 0;

          if (remoteVersion !== remoteVersionRef.current || !valuesEqual(data, valueRef.current)) {
            setValue(data);
            valueRef.current = data;
            remoteVersionRef.current = remoteVersion;
            versionRef.current = remoteVersion;
          }
        } else if (!valuesEqual(initialValueRef.current, valueRef.current)) {
          setValue(initialValueRef.current);
          valueRef.current = initialValueRef.current;
          remoteVersionRef.current = 0;
          versionRef.current = 0;
        }
        setLoading(false);
      },
      (err) => {
        errorLog(`[FIRESTORE] Error loading "${collectionName}":`, err);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [userId, collectionName]);

  const performWrite = useCallback(async (val) => {
    const uid = userIdRef.current;
    if (!uid) return false;

    if (globalCircuitBreaker.broken[collectionName]) {
      scheduleQueuedRetry(uid, collectionName, val, performWriteRef.current);
      return false;
    }

    const now = Date.now();
    if (now - globalCircuitBreaker.lastReset[collectionName] > WINDOW_MS) {
      globalCircuitBreaker.writes[collectionName] = 0;
      globalCircuitBreaker.lastReset[collectionName] = now;
      globalCircuitBreaker.broken[collectionName] = false;
    }

    if (globalCircuitBreaker.writes[collectionName] >= WRITE_LIMIT) {
      globalCircuitBreaker.broken[collectionName] = true;
      showToast('Too many changes too fast. Please wait a moment — your changes will retry automatically.', 'warning', 8000);
      scheduleQueuedRetry(uid, collectionName, val, performWriteRef.current);
      return false;
    }

    const nextVersion = Math.max(versionRef.current, remoteVersionRef.current) + 1;
    const docRef = doc(db, 'users', uid, 'data', collectionName);
    const payload = { value: val, _v: nextVersion };

    const ok = await writeWithRetry(docRef, payload, collectionName);
    if (ok) {
      globalCircuitBreaker.writes[collectionName]++;
      lastWriteRef.current = Date.now();
      versionRef.current = nextVersion;
      remoteVersionRef.current = nextVersion;
      pendingValueRef.current = null;
      log(`[FIRESTORE] Saved "${collectionName}"`);
    }
    return ok;
  }, [collectionName]);

  performWriteRef.current = performWrite;

  useEffect(() => {
    performWriteRef.current = performWrite;
  }, [performWrite]);

  const flushPendingWrite = useCallback(() => {
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
      debounceTimerRef.current = null;
    }
    if (pendingUpdateRef.current) {
      clearTimeout(pendingUpdateRef.current);
      pendingUpdateRef.current = null;
    }
    if (pendingValueRef.current !== null && userIdRef.current) {
      const val = pendingValueRef.current;
      pendingValueRef.current = null;
      performWrite(val);
    }
  }, [performWrite]);

  const flushKey = `${userId || 'anon'}:${collectionName}`;

  useEffect(() => {
    if (userId) {
      pendingFlushes.set(flushKey, flushPendingWrite);
    }
    return () => {
      pendingFlushes.delete(flushKey);
      flushPendingWrite();
    };
  }, [userId, collectionName, flushPendingWrite, flushKey]);

  const updateValue = useCallback((newValue) => {
    if (!userId) {
      warn('[FIRESTORE] Cannot update: No user logged in');
      return;
    }

    if (!globalCircuitBreaker.lastReset[collectionName]) {
      globalCircuitBreaker.lastReset[collectionName] = Date.now();
      globalCircuitBreaker.writes[collectionName] = 0;
      globalCircuitBreaker.broken[collectionName] = false;
    }

    if (globalCircuitBreaker.broken[collectionName]) {
      warn(`[FIRESTORE] Circuit breaker active for "${collectionName}". Queuing write.`);
    }

    try {
      const valueToStore = newValue instanceof Function ? newValue(valueRef.current) : newValue;

      if (valuesEqual(valueToStore, valueRef.current)) {
        return;
      }

      setValue(valueToStore);
      valueRef.current = valueToStore;
      pendingValueRef.current = valueToStore;

      if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
      if (pendingUpdateRef.current) clearTimeout(pendingUpdateRef.current);

      debounceTimerRef.current = setTimeout(() => {
        const timeSinceLastWrite = Date.now() - lastWriteRef.current;
        const valToWrite = pendingValueRef.current;

        if (timeSinceLastWrite < THROTTLE_MS) {
          const delayNeeded = THROTTLE_MS - timeSinceLastWrite;
          pendingUpdateRef.current = setTimeout(() => {
            if (valToWrite !== null) performWrite(valToWrite);
          }, delayNeeded);
        } else if (valToWrite !== null) {
          performWrite(valToWrite);
        }
      }, DEBOUNCE_MS);
    } catch (err) {
      errorLog(`[FIRESTORE] Error preparing update for "${collectionName}":`, err);
    }
  }, [userId, collectionName, performWrite]);

  return [value, updateValue, loading];
}
