import { useState, useEffect } from 'react';
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

  const updateValue = async (newValue) => {
    if (!userId) {
      console.warn('Cannot update Firestore: No user logged in');
      return;
    }

    try {
      const valueToStore = newValue instanceof Function ? newValue(value) : newValue;
      
      // Optimistic update
      setValue(valueToStore);
      
      // Persist to Firestore
      const docRef = doc(db, 'users', userId, 'data', collectionName);
      await setDoc(docRef, { value: valueToStore }, { merge: true });
    } catch (error) {
      console.error(`Error saving Firestore "${collectionName}":`, error);
      // Revert on error
      setValue(value);
    }
  };

  return [value, updateValue, loading];
}
