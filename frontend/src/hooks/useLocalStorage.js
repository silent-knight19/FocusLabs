import { useState, useEffect, useCallback, useMemo, useRef } from 'react';

/**
 * Custom hook for syncing state with LocalStorage
 * Designed to mimic the API of useFirestore for easy migration
 * @param {string} userId - User ID for scoping data (used as prefix)
 * @param {string} key - Storage key (collection name)
 * @param {any} initialValue - default value if storage is empty
 * @returns {[any, Function, boolean]} - [value, setValue, loading] tuple
 */
export function useLocalStorage(userId, key, initialValue) {
  // Memoize the storage key to prevent unnecessary recalculations
  const storageKey = useMemo(
    () => userId ? `focuslabs_${userId}_${key}` : `focuslabs_anon_${key}`,
    [userId, key]
  );
  
  // Use ref for initialValue to avoid it being in dependency arrays
  const initialValueRef = useRef(initialValue);
  
  // State to store our value
  // Pass initial state function to useState so logic is only executed once
  const [storedValue, setStoredValue] = useState(() => {
    if (typeof window === 'undefined') {
      return initialValue;
    }
    try {
      const item = window.localStorage.getItem(storageKey);
      return item ? JSON.parse(item) : initialValue;
    } catch (error) {
      console.error(`[LOCAL_STORAGE] Error reading key "${storageKey}":`, error);
      return initialValue;
    }
  });

  const [loading] = useState(false); // LocalStorage is sync, so no loading state needed

  // Return a wrapped version of useState's setter function that persists the new value to localStorage
  const setValue = useCallback((value) => {
    try {
      // Allow value to be a function so we have same API as useState
      setStoredValue(current => {
        const valueToStore = value instanceof Function ? value(current) : value;
        
        // Save to local storage
        if (typeof window !== 'undefined') {
          window.localStorage.setItem(storageKey, JSON.stringify(valueToStore));
        }
        
        return valueToStore;
      });
    } catch (error) {
      console.error(`[LOCAL_STORAGE] Error setting key "${storageKey}":`, error);
    }
  }, [storageKey]);

  // Listen for changes from other tabs/windows
  useEffect(() => {
    const handleStorageChange = (e) => {
      // Only respond to changes for this specific key
      if (e.key === storageKey || e.key === null) {
        try {
          const item = window.localStorage.getItem(storageKey);
          if (item) {
            const newValue = JSON.parse(item);
            // Deep compare to prevent unnecessary updates
            setStoredValue(current => {
              if (JSON.stringify(current) !== JSON.stringify(newValue)) {
                return newValue;
              }
              return current;
            });
          }
        } catch (error) {
          console.error(`[LOCAL_STORAGE] Error syncing key "${storageKey}":`, error);
        }
      }
    };

    // Listen for storage events (other tabs)
    window.addEventListener('storage', handleStorageChange);
    
    return () => {
      window.removeEventListener('storage', handleStorageChange);
    };
  }, [storageKey]);

  return [storedValue, setValue, loading];
}
