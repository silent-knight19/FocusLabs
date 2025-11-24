import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { 
  doc, 
  setDoc, 
  onSnapshot
} from 'firebase/firestore';
import { db } from '../config/firebase';

// Global circuit breaker state to persist across remounts
const globalCircuitBreaker = {
  writes: {}, // Map of collectionName -> count
  lastReset: {}, // Map of collectionName -> timestamp
  broken: {} // Map of collectionName -> boolean
};

/**
 * Custom hook for syncing state with Firestore
 * RESTORED CLOUD PERSISTENCE with robust infinite loop protection
 * @param {string} userId - User ID for scoping data
 * @param {string} collectionName - Firestore collection name
 * @param {any} initialValue - default value if collection is empty
 * @returns {[any, Function, boolean]} - [value, setValue, loading] tuple
 */
export function useFirestore(userId, collectionName, initialValue) {
  // Use ref for initialValue to avoid dependency loops if it's an object/array
  const initialValueRef = useRef(initialValue);
  
  // State
  const [value, setValue] = useState(initialValue);
  const [loading, setLoading] = useState(true);
  
  // Ref to hold current value for comparison without triggering re-renders
  // This is critical for the update function to access latest state without being a dependency
  const valueRef = useRef(initialValue);

  // Refs for throttling/debouncing
  const lastWriteRef = useRef(0);
  const pendingUpdateRef = useRef(null);
  const debounceTimerRef = useRef(null);

  // 1. READ / SYNC EFFECT
  useEffect(() => {
    if (!userId) {
      setValue(initialValueRef.current);
      valueRef.current = initialValueRef.current;
      setLoading(false);
      return;
    }

    // Reference to user's document
    // We use the 'data' subcollection pattern: users/{userId}/data/{collectionName}
    const docRef = doc(db, 'users', userId, 'data', collectionName);

    // Subscribe to real-time updates
    const unsubscribe = onSnapshot(
      docRef,
      (snapshot) => {
        if (snapshot.exists()) {
          const data = snapshot.data().value;
          // Deep compare to prevent unnecessary updates
          // We use JSON.stringify for simple deep compare of primitive/nested data
          if (JSON.stringify(data) !== JSON.stringify(valueRef.current)) {
            setValue(data);
            valueRef.current = data;
          }
        } else {
          // Document doesn't exist yet, use initial value
          if (JSON.stringify(initialValueRef.current) !== JSON.stringify(valueRef.current)) {
            setValue(initialValueRef.current);
            valueRef.current = initialValueRef.current;
          }
        }
        setLoading(false);
      },
      (error) => {
        console.error(`Error loading Firestore "${collectionName}":`, error);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [userId, collectionName]); // Only re-run if user or collection changes

  // 2. WRITE / UPDATE FUNCTION
  // Memoized update function with enhanced throttling and debouncing
  const updateValue = useCallback((newValue) => {
    if (!userId) {
      console.warn('[FIRESTORE] Cannot update: No user logged in');
      return;
    }

    // Initialize global state for this collection if needed
    if (!globalCircuitBreaker.lastReset[collectionName]) {
      globalCircuitBreaker.lastReset[collectionName] = Date.now();
      globalCircuitBreaker.writes[collectionName] = 0;
      globalCircuitBreaker.broken[collectionName] = false;
    }

    // Check circuit breaker - 60 second window
    const now = Date.now();
    if (now - globalCircuitBreaker.lastReset[collectionName] > 60000) {
      // Reset counter every 60 seconds
      globalCircuitBreaker.writes[collectionName] = 0;
      globalCircuitBreaker.lastReset[collectionName] = now;
      globalCircuitBreaker.broken[collectionName] = false;
    }

    if (globalCircuitBreaker.broken[collectionName]) {
      console.warn(`[FIRESTORE] ⚠️ Circuit breaker active for "${collectionName}". Writes paused.`);
      return;
    }

    // Limit: 20 writes per 60 seconds (Safe limit)
    if (globalCircuitBreaker.writes[collectionName] >= 20) {
      console.error(`[FIRESTORE] 🔴 Circuit breaker TRIGGERED for "${collectionName}". Too many writes!`);
      globalCircuitBreaker.broken[collectionName] = true;
      return;
    }

    try {
      // Calculate new value based on current valueRef (not state, to avoid dependency)
      const valueToStore = newValue instanceof Function ? newValue(valueRef.current) : newValue;
      
      // Deep comparison to prevent unnecessary writes
      if (JSON.stringify(valueToStore) !== JSON.stringify(valueRef.current)) {
        // Optimistic update - update local state immediately
        setValue(valueToStore);
        valueRef.current = valueToStore;
        
        // Clear existing timers
        if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
        if (pendingUpdateRef.current) clearTimeout(pendingUpdateRef.current);

        // DEBOUNCE: Wait 2 seconds after LAST update before writing
        debounceTimerRef.current = setTimeout(() => {
          const timeSinceLastWrite = Date.now() - lastWriteRef.current;
          
          // THROTTLE: Ensure minimum 3 seconds between writes
          if (timeSinceLastWrite < 3000) {
            const delayNeeded = 3000 - timeSinceLastWrite;
            pendingUpdateRef.current = setTimeout(() => performWrite(valueToStore), delayNeeded);
          } else {
            performWrite(valueToStore);
          }
        }, 2000); 
      }
    } catch (error) {
      console.error(`[FIRESTORE] ❌ Error preparing update for "${collectionName}":`, error);
    }

    // Internal write function
    const performWrite = async (val) => {
      try {
        const docRef = doc(db, 'users', userId, 'data', collectionName);
        await setDoc(docRef, { value: val }, { merge: true });
        
        globalCircuitBreaker.writes[collectionName]++;
        lastWriteRef.current = Date.now();
        console.log(`[FIRESTORE] ✅ Saved "${collectionName}"`);
      } catch (err) {
        console.error(`[FIRESTORE] ❌ Error saving "${collectionName}":`, err);
      }
    };

  }, [userId, collectionName]); // Stable dependencies

  return [value, updateValue, loading];
}
