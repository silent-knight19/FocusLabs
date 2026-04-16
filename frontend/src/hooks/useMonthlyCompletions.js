import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import {
  doc,
  setDoc,
  onSnapshot,
  getDoc,
  collection,
  query,
  where,
  getDocs
} from 'firebase/firestore';
import { db } from '../config/firebase';
import { formatDateKey, getYearMonth, getDayFromDateKey } from '../utils/dateHelpers';

const DEBUG = import.meta.env.DEV;
const log = DEBUG ? console.log : () => {};
const warn = DEBUG ? console.warn : () => {};
const error = DEBUG ? console.error : () => {};

// Global flag to track if migration is in progress (prevents race conditions)
let isMigrationRunning = false;

export function setMigrationRunning(running) {
  isMigrationRunning = running;
}

/**
 * Hook for monthly-sharded completion data
 * Stores completions in documents like: users/{uid}/completions/2024-01
 * Each document contains: { habitId: { "01": "completed", "02": "failed" } }
 * 
 * @param {string} userId - User ID
 * @returns {Object} - { completions, loading, toggleCompletion, clearCompletion, getCompletionStatus, loadMonth, isMonthLoaded, loadedMonths }
 */
export function useMonthlyCompletions(userId) {
  const [monthlyData, setMonthlyData] = useState({});
  const [loadedMonths, setLoadedMonths] = useState(new Set());
  const [loading, setLoading] = useState(true);
  
  const unsubscribersRef = useRef([]);
  const pendingWritesRef = useRef({});
  const loadingMonthsRef = useRef(new Set()); // Track in-flight month loads
  const loadedMonthsRef = useRef(new Set()); // Mirror of loadedMonths state (avoids stale closures)
  const monthlyDataRef = useRef({}); // Mirror of monthlyData state for async functions
  const currentUserRef = useRef(userId);

  // Clear data immediately when userId changes to prevent data leakage
  if (currentUserRef.current !== userId) {
    currentUserRef.current = userId;
    loadingMonthsRef.current.clear();
    loadedMonthsRef.current.clear();
    setMonthlyData({});
    setLoadedMonths(new Set());
    setLoading(true);
  }

  // Aggregate all monthly data into a single completions object (backward compatible)
  const completions = useMemo(() => {
    const aggregated = {};
    
    Object.entries(monthlyData).forEach(([monthKey, monthData]) => {
      Object.entries(monthData).forEach(([habitId, days]) => {
        if (!aggregated[habitId]) aggregated[habitId] = {};
        
        Object.entries(days).forEach(([day, status]) => {
          // Reconstruct full date key: 2024-01-15
          const dateKey = `${monthKey}-${day.padStart(2, '0')}`;
          aggregated[habitId][dateKey] = status;
        });
      });
    });
    
    return aggregated;
  }, [monthlyData]);

  // Keep monthlyDataRef in sync with state
  useEffect(() => {
    monthlyDataRef.current = monthlyData;
  }, [monthlyData]);

  // Subscribe to current + 5 previous months for streak/calendar coverage
  useEffect(() => {
    if (!userId) {
      setMonthlyData({});
      setLoadedMonths(new Set());
      loadedMonthsRef.current.clear();
      setLoading(false);
      return;
    }

    const now = new Date();
    const monthsToLoad = [];
    
    // Load current month + 5 previous months (6 total)
    for (let i = 0; i < 6; i++) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      monthsToLoad.push(getYearMonth(d));
    }

    const newUnsubscribers = [];

    monthsToLoad.forEach(monthKey => {
      // Use the ref (not state) to avoid stale closure
      if (loadedMonthsRef.current.has(monthKey)) return;
      
      const docRef = doc(db, 'users', userId, 'completions', monthKey);
      
      const unsubscribe = onSnapshot(
        docRef,
        (snapshot) => {
          setMonthlyData(prev => ({
            ...prev,
            [monthKey]: snapshot.exists() ? snapshot.data() : {}
          }));
          loadedMonthsRef.current.add(monthKey);
          setLoadedMonths(prev => new Set([...prev, monthKey]));
          setLoading(false);
        },
        (err) => {
          error(`[MonthlyCompletions] Error loading ${monthKey}:`, err);
          setLoading(false);
        }
      );
      
      newUnsubscribers.push(unsubscribe);
    });

    unsubscribersRef.current = newUnsubscribers;

    return () => {
      newUnsubscribers.forEach(unsub => unsub());
    };
  }, [userId]);

  // Detect month rollover when user returns to the tab
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState !== 'visible' || !userId) return;

      const nowMonthKey = getYearMonth(new Date());
      if (!loadedMonthsRef.current.has(nowMonthKey)) {
        // New month started while tab was hidden — load it
        const docRef = doc(db, 'users', userId, 'completions', nowMonthKey);
        const unsubscribe = onSnapshot(
          docRef,
          (snapshot) => {
            setMonthlyData(prev => ({
              ...prev,
              [nowMonthKey]: snapshot.exists() ? snapshot.data() : {}
            }));
            loadedMonthsRef.current.add(nowMonthKey);
            setLoadedMonths(prev => new Set([...prev, nowMonthKey]));
          },
          (err) => error(`[MonthlyCompletions] Rollover error ${nowMonthKey}:`, err)
        );
        unsubscribersRef.current.push(unsubscribe);
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [userId]);

  // Load a specific month on demand (for calendar navigation to older months)
  const loadMonth = useCallback(async (monthKey) => {
    if (!userId) return;
    // Use the ref to avoid stale closure issues
    if (loadedMonthsRef.current.has(monthKey) || loadingMonthsRef.current.has(monthKey)) return;
    
    loadingMonthsRef.current.add(monthKey);
    
    try {
      const docRef = doc(db, 'users', userId, 'completions', monthKey);
      const snapshot = await getDoc(docRef);
      
      setMonthlyData(prev => ({
        ...prev,
        [monthKey]: snapshot.exists() ? snapshot.data() : {}
      }));
      loadedMonthsRef.current.add(monthKey);
      setLoadedMonths(prev => new Set([...prev, monthKey]));
    } finally {
      loadingMonthsRef.current.delete(monthKey);
    }
  }, [userId]);

  // Write completion to the correct month document
  const toggleCompletion = useCallback(async (habitId, date) => {
    if (!userId) {
      warn('[MonthlyCompletions] Cannot toggle: No user');
      return;
    }
    
    if (isMigrationRunning) {
      warn('[MonthlyCompletions] Cannot toggle: Migration in progress');
      return;
    }

    const dateKey = formatDateKey(date);
    const monthKey = getYearMonth(date);
    const day = getDayFromDateKey(dateKey);
    
    const docRef = doc(db, 'users', userId, 'completions', monthKey);
    
    // Use the ref to avoid stale closure reads
    let currentMonthData = monthlyDataRef.current[monthKey];
    if (currentMonthData === undefined) {
      // Fetch from Firestore if not in local state
      const snapshot = await getDoc(docRef);
      currentMonthData = snapshot.exists() ? snapshot.data() : {};
      setMonthlyData(prev => ({ ...prev, [monthKey]: currentMonthData }));
      loadedMonthsRef.current.add(monthKey);
      setLoadedMonths(prev => new Set([...prev, monthKey]));
    }
    
    const habitData = currentMonthData[habitId] || {};
    const currentStatus = habitData[day];
    
    // Determine new status
    let newStatus;
    if (!currentStatus) newStatus = 'completed';
    else if (currentStatus === 'completed') newStatus = 'failed';
    else newStatus = null;
    
    // Build update
    const updatedHabitData = { ...habitData };
    if (newStatus === null) {
      delete updatedHabitData[day];
    } else {
      updatedHabitData[day] = newStatus;
    }
    
    const updatedMonthData = { ...currentMonthData };
    if (Object.keys(updatedHabitData).length === 0) {
      delete updatedMonthData[habitId];
    } else {
      updatedMonthData[habitId] = updatedHabitData;
    }
    
    // Optimistic update
    setMonthlyData(prev => ({
      ...prev,
      [monthKey]: updatedMonthData
    }));
    
    // Persist to Firestore
    try {
      if (Object.keys(updatedMonthData).length === 0) {
        // Delete empty month document
        await setDoc(docRef, {}, { merge: false });
      } else {
        await setDoc(docRef, updatedMonthData);
      }
      log(`[MonthlyCompletions] Saved ${habitId} for ${dateKey}: ${newStatus}`);
    } catch (err) {
      error(`[MonthlyCompletions] Error saving ${dateKey}:`, err);
      // Revert optimistic update
      setMonthlyData(prev => ({
        ...prev,
        [monthKey]: currentMonthData
      }));
    }
  }, [userId]);

  // Clear a completion
  const clearCompletion = useCallback(async (habitId, date) => {
    if (!userId) return;
    if (isMigrationRunning) return;
    
    const dateKey = formatDateKey(date);
    const monthKey = getYearMonth(date);
    const day = getDayFromDateKey(dateKey);
    
    const docRef = doc(db, 'users', userId, 'completions', monthKey);
    
    // Use the ref to avoid stale closure reads
    let currentMonthData = monthlyDataRef.current[monthKey];
    if (currentMonthData === undefined) {
      const snapshot = await getDoc(docRef);
      currentMonthData = snapshot.exists() ? snapshot.data() : {};
      setMonthlyData(prev => ({ ...prev, [monthKey]: currentMonthData }));
      loadedMonthsRef.current.add(monthKey);
      setLoadedMonths(prev => new Set([...prev, monthKey]));
    }
    
    const habitData = currentMonthData[habitId] || {};
    
    if (!habitData[day]) return;
    
    const updatedHabitData = { ...habitData };
    delete updatedHabitData[day];
    
    const updatedMonthData = { ...currentMonthData };
    if (Object.keys(updatedHabitData).length === 0) {
      delete updatedMonthData[habitId];
    } else {
      updatedMonthData[habitId] = updatedHabitData;
    }
    
    // Optimistic update
    setMonthlyData(prev => ({
      ...prev,
      [monthKey]: updatedMonthData
    }));
    
    try {
      if (Object.keys(updatedMonthData).length === 0) {
        await setDoc(docRef, {}, { merge: false });
      } else {
        await setDoc(docRef, updatedMonthData);
      }
    } catch (err) {
      error(`[MonthlyCompletions] Error clearing ${dateKey}:`, err);
      setMonthlyData(prev => ({
        ...prev,
        [monthKey]: currentMonthData
      }));
    }
  }, [userId]);

  // Get completion status for a habit on a date
  const getCompletionStatus = useCallback((habitId, date) => {
    const dateKey = formatDateKey(date);
    return completions[habitId]?.[dateKey] || null;
  }, [completions]);

  // Check if a specific month is loaded
  const isMonthLoaded = useCallback((monthKey) => {
    return loadedMonths.has(monthKey);
  }, [loadedMonths]);

  return {
    completions,
    loading,
    toggleCompletion,
    clearCompletion,
    getCompletionStatus,
    loadMonth,
    isMonthLoaded,
    loadedMonths: Array.from(loadedMonths)
  };
}
