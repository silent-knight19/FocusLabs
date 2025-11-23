import { useState, useEffect, useRef } from 'react';
import { 
  collection, 
  doc, 
  setDoc, 
  deleteDoc, 
  onSnapshot,
  query,
  updateDoc,
  getDoc
} from 'firebase/firestore';
import { db } from '../config/firebase';

/**
 * Custom hook for syncing state with Firestore
 * Similar to useLocalStorage but uses Firestore for persistence
 * @param {string} userId - User ID for scoping data
 * @param {string} collectionName - Firestore collection name
 * @param {any} initialValue - default value if collection is empty
 * @returns {[any, Function, boolean]} - [value, setValue, loading] tuple
 */
export function useFirestore(userId, collectionName, initialValue) {
  const [value, setValue] = useState(initialValue);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!userId) {
      setValue(initialValue);
      setLoading(false);
      return;
    }

    // Reference to user's document
    const docRef = doc(db, 'users', userId, 'data', collectionName);

    // Subscribe to real-time updates
    const unsubscribe = onSnapshot(
      docRef,
      (snapshot) => {
        if (snapshot.exists()) {
          setValue(snapshot.data().value);
        } else {
          setValue(initialValue);
        }
        setLoading(false);
      },
      (error) => {
        console.error(`Error loading Firestore "${collectionName}":`, error);
        setValue(initialValue);
        setLoading(false);
      }
    );

    return unsubscribe;
  }, [userId, collectionName]);

  const lastWriteRef = useRef(0);
  const pendingUpdateRef = useRef(null);

  const updateValue = async (newValue) => {
    if (!userId) {
      console.warn('Cannot update Firestore: No user logged in');
      return;
    }

    try {
      const valueToStore = newValue instanceof Function ? newValue(value) : newValue;
      
      // Optimistic update
      setValue(valueToStore);
      
      // Throttle writes to max 1 per 2 seconds to prevent quota exhaustion
      const now = Date.now();
      if (now - lastWriteRef.current < 2000) {
        // If throttled, schedule a final update
        if (pendingUpdateRef.current) clearTimeout(pendingUpdateRef.current);
        
        pendingUpdateRef.current = setTimeout(async () => {
          const docRef = doc(db, 'users', userId, 'data', collectionName);
          await setDoc(docRef, { value: valueToStore }, { merge: true });
          lastWriteRef.current = Date.now();
          pendingUpdateRef.current = null;
        }, 2000);
        return;
      }

      // Immediate write
      const docRef = doc(db, 'users', userId, 'data', collectionName);
      await setDoc(docRef, { value: valueToStore }, { merge: true });
      lastWriteRef.current = now;
    } catch (error) {
      console.error(`Error saving Firestore "${collectionName}":`, error);
      // Revert on error (optional, might be jarring)
    }
  };

  return [value, updateValue, loading];
}
