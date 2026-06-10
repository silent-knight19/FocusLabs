/* eslint-disable react-refresh/only-export-components */
import React, { createContext, useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useStopwatchHistory } from './StopwatchHistoryContext';
import { normalizeFocusCategory } from '../utils/focusSessionHelpers';

const DEBUG = import.meta.env.DEV;
const logError = DEBUG ? console.error : () => {};
const logWarn = DEBUG ? console.warn : () => {};

export const StopwatchContext = createContext(null);

/**
 * Shared Stopwatch Context Provider that manages the active running state
 * of the stopwatch across the entire application using robust absolute wall-clock tracking.
 */
export function StopwatchProvider({ children }) {
  const { history: allHistory, setHistory: setAllHistory } = useStopwatchHistory();

  // Helper to safely load initial active state from localStorage
  const {
    initialIsRunning,
    initialStartTime,
    initialAccumulatedTime,
    initialLastLapTime,
    initialLaps
  } = useMemo(() => {
    let savedIsRunning = false;
    let savedStartTime = null;
    let savedAccumulatedTime = 0;
    let savedLastLapTime = 0;
    let savedLaps = [];

    try {
      const savedState = localStorage.getItem('stopwatch_active_state');
      if (savedState) {
        const parsed = JSON.parse(savedState);
        savedIsRunning = parsed.savedIsRunning || false;
        savedLastLapTime = parsed.savedLastLapTime || 0;
        savedAccumulatedTime = parsed.savedTime || 0;

        if (savedIsRunning && parsed.savedLastActive) {
          savedStartTime = parsed.savedLastActive;
        }
      }
    } catch (e) {
      logError('Failed to parse stopwatch active state from localStorage', e);
    }

    try {
      const savedSessionLaps = localStorage.getItem('stopwatch_current_session_laps');
      if (savedSessionLaps) {
        savedLaps = JSON.parse(savedSessionLaps);
      }
    } catch (e) {
      logError('Failed to parse stopwatch session laps from localStorage', e);
    }

    return {
      initialIsRunning: savedIsRunning,
      initialStartTime: savedStartTime,
      initialAccumulatedTime: savedAccumulatedTime,
      initialLastLapTime: savedLastLapTime,
      initialLaps: savedLaps
    };
  }, []);

  // Derive the current session lap IDs from localStorage for Firestore deduplication
  const sessionLapIds = useMemo(() => {
    return new Set(initialLaps.map(l => l.id));
  }, [initialLaps]);

  // Core Active Timer State
  const [isRunning, setIsRunning] = useState(initialIsRunning);
  const [startTime, setStartTime] = useState(initialStartTime);
  const [accumulatedTime, setAccumulatedTime] = useState(initialAccumulatedTime);
  const [lastLapTime, setLastLapTime] = useState(initialLastLapTime);
  const [currentSessionLaps, setCurrentSessionLaps] = useState(initialLaps);

  // Derived current displayed time (ms)
  const [time, setTime] = useState(() => {
    if (initialIsRunning && initialStartTime) {
      return initialAccumulatedTime + (Date.now() - initialStartTime);
    }
    return initialAccumulatedTime;
  });

  const requestRef = useRef();

  // Keep references updated for unload handlers
  const isRunningRef = useRef(isRunning);
  const startTimeRef = useRef(startTime);
  const accumulatedTimeRef = useRef(accumulatedTime);
  const lastLapTimeRef = useRef(lastLapTime);

  // Callback Definitions (Declared before use in useEffects)

  /**
   * Save the current active stopwatch state to localStorage
   */
  const saveActiveState = useCallback(() => {
    try {
      localStorage.setItem('stopwatch_active_state', JSON.stringify({
        savedTime: accumulatedTimeRef.current,
        savedIsRunning: isRunningRef.current,
        savedLastActive: startTimeRef.current,
        savedLastLapTime: lastLapTimeRef.current
      }));
    } catch (e) {
      logError('Failed to save stopwatch active state to localStorage', e);
    }
  }, []);

  /**
   * Starts the stopwatch.
   */
  const start = useCallback(() => {
    if (!isRunningRef.current) {
      const now = Date.now();

      setStartTime(now);
      startTimeRef.current = now;
      setIsRunning(true);
      isRunningRef.current = true;
    }
  }, []);

  /**
   * Pauses the stopwatch and accumulates the time.
   */
  const pause = useCallback(() => {
    if (isRunningRef.current && startTimeRef.current) {
      const elapsed = Date.now() - startTimeRef.current;
      const nextAccumulated = accumulatedTimeRef.current + elapsed;

      setAccumulatedTime(nextAccumulated);
      accumulatedTimeRef.current = nextAccumulated;
      setStartTime(null);
      startTimeRef.current = null;
      setIsRunning(false);
      isRunningRef.current = false;
      setTime(nextAccumulated);

      // Immediately persist the stopped state to localStorage so that a
      // page refresh cannot restore a stale "running" state. Without this,
      // the useEffect-based save may not fire before the page unloads,
      // causing a phantom timer on reload.
      try {
        localStorage.setItem('stopwatch_active_state', JSON.stringify({
          savedTime: nextAccumulated,
          savedIsRunning: false,
          savedLastActive: null,
          savedLastLapTime: lastLapTimeRef.current
        }));
      } catch (e) {
        logError('Failed to persist stopped state', e);
      }
    }
  }, []);

  /**
   * Resets the stopwatch to 0 and clears local session.
   */
  const reset = useCallback(() => {
    setIsRunning(false);
    isRunningRef.current = false;
    setStartTime(null);
    startTimeRef.current = null;
    setAccumulatedTime(0);
    accumulatedTimeRef.current = 0;
    setLastLapTime(0);
    lastLapTimeRef.current = 0;
    setTime(0);
    setCurrentSessionLaps([]);

    try {
      localStorage.removeItem('stopwatch_current_session_laps');
      localStorage.removeItem('stopwatch_active_state');
    } catch (e) {
      logError('Failed to clear stopwatch localStorage on reset', e);
    }
  }, []);

  /**
   * Creates a new lap for the current session.
   */
  const lap = useCallback((category = 'other') => {
    const currentElapsedTime = isRunningRef.current && startTimeRef.current
      ? accumulatedTimeRef.current + (Date.now() - startTimeRef.current)
      : accumulatedTimeRef.current;

    const sessionDuration = currentElapsedTime - lastLapTimeRef.current;

    if (sessionDuration < 1000) {
      logWarn('Session too short to save (< 1 second), duration:', sessionDuration);
      return;
    }

    // Guard: if the duration is negative (e.g., stale lastLapTime from a
    // previous session), skip silently. This should not happen after the
    // start() fix, but provides a safety net.
    if (sessionDuration < 0) {
      logWarn('Negative session duration detected, resetting lap marker');
      setLastLapTime(currentElapsedTime);
      lastLapTimeRef.current = currentElapsedTime;
      return;
    }

    const newLap = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      time: sessionDuration,
      date: new Date().toISOString(),
      category: normalizeFocusCategory(category),
      label: `Session ${currentSessionLaps.length + 1}`
    };

    // Save to Firestore via context
    setAllHistory(prev => {
      const existingIds = new Set(prev.map(l => l.id));
      if (existingIds.has(newLap.id)) {
        logWarn('Lap already exists, skipping duplicate:', newLap.id);
        return prev;
      }
      return [newLap, ...prev];
    });

    // Update session state
    setCurrentSessionLaps(prev => {
      const existingIds = new Set(prev.map(l => l.id));
      if (existingIds.has(newLap.id)) return prev;
      return [newLap, ...prev];
    });

    setLastLapTime(currentElapsedTime);
    lastLapTimeRef.current = currentElapsedTime;
  }, [currentSessionLaps, setAllHistory]);

  /**
   * Updates the label of a specific lap.
   */
  const updateLapLabel = useCallback((id, newLabel) => {
    setAllHistory(prev => prev.map(l => l.id === id ? { ...l, label: newLabel } : l));
    setCurrentSessionLaps(prev => prev.map(l => l.id === id ? { ...l, label: newLabel } : l));
  }, [setAllHistory]);

  /**
   * Updates the category of a specific lap.
   */
  const updateLapCategory = useCallback((id, newCategory) => {
    const normalized = normalizeFocusCategory(newCategory);
    setAllHistory(prev => prev.map(l => l.id === id ? { ...l, category: normalized } : l));
    setCurrentSessionLaps(prev => prev.map(l => l.id === id ? { ...l, category: normalized } : l));
  }, [setAllHistory]);

  /**
   * Formats milliseconds into hours, minutes, seconds, and centiseconds.
   */
  const formatTime = useCallback((ms) => {
    const date = new Date(ms);
    return {
      hours: String(Math.floor(ms / 3600000)).padStart(2, '0'),
      minutes: String(date.getUTCMinutes()).padStart(2, '0'),
      seconds: String(date.getUTCSeconds()).padStart(2, '0'),
      centiseconds: String(Math.floor(date.getUTCMilliseconds() / 10)).padStart(2, '0')
    };
  }, []);

  // Lifecycle & Effect Hooks

  // Keep references updated for unload handlers
  useEffect(() => { isRunningRef.current = isRunning; }, [isRunning]);
  useEffect(() => { startTimeRef.current = startTime; }, [startTime]);
  useEffect(() => { accumulatedTimeRef.current = accumulatedTime; }, [accumulatedTime]);
  useEffect(() => { lastLapTimeRef.current = lastLapTime; }, [lastLapTime]);

  // Save active state to localStorage on state changes (but NOT on time updates)
  useEffect(() => {
    saveActiveState();
  }, [isRunning, startTime, accumulatedTime, lastLapTime, saveActiveState]);

  // Save current session laps to localStorage
  useEffect(() => {
    try {
      localStorage.setItem('stopwatch_current_session_laps', JSON.stringify(currentSessionLaps));
    } catch (e) {
      logError('Failed to save stopwatch session laps to localStorage', e);
    }
  }, [currentSessionLaps]);

  // Sync laps list with Firestore after it loads to prevent duplicates
  useEffect(() => {
    if (allHistory.length === 0) return;
    if (sessionLapIds.size === 0) return;

    const firestoreLapIds = new Set(allHistory.map(l => l.id));
    setCurrentSessionLaps(prev =>
      prev.filter(l => firestoreLapIds.has(l.id))
    );
  }, [allHistory, sessionLapIds]);

  // Safe pageunload active state saver
  useEffect(() => {
    const handlePageHide = () => {
      saveActiveState();
    };

    window.addEventListener('pagehide', handlePageHide);
    return () => {
      window.removeEventListener('pagehide', handlePageHide);
    };
  }, [saveActiveState]);

  // Auto-lap on load if the stopwatch was paused with unlapped time
  useEffect(() => {
    if (!initialIsRunning && initialAccumulatedTime > initialLastLapTime + 1000) {
      const savedCategory = localStorage.getItem('stopwatch_selected_category') || 'study';
      // Use a slight delay to ensure contexts are fully mounted before triggering a lap
      // which modifies allHistory and triggers Firestore syncs.
      const timerId = setTimeout(() => {
        lap(savedCategory);
      }, 500);
      return () => clearTimeout(timerId);
    }
  }, [initialIsRunning, initialAccumulatedTime, initialLastLapTime, lap]);

  // Smooth animation frame loop for updating the visible timer
  useEffect(() => {
    const tick = () => {
      if (isRunningRef.current && startTimeRef.current) {
        setTime(accumulatedTimeRef.current + (Date.now() - startTimeRef.current));
        requestRef.current = requestAnimationFrame(tick);
      }
    };

    if (isRunning) {
      requestRef.current = requestAnimationFrame(tick);
    } else {
      cancelAnimationFrame(requestRef.current);
    }

    return () => cancelAnimationFrame(requestRef.current);
  }, [isRunning]);

  // Value Definition for Context Provider

  const value = useMemo(() => ({
    time,
    isRunning,
    laps: currentSessionLaps,
    allHistory,
    start,
    pause,
    reset,
    lap,
    updateLapLabel,
    updateLapCategory,
    formatTime
  }), [
    time,
    isRunning,
    currentSessionLaps,
    allHistory,
    start,
    pause,
    reset,
    lap,
    updateLapLabel,
    updateLapCategory,
    formatTime
  ]);

  return (
    <StopwatchContext.Provider value={value}>
      {children}
    </StopwatchContext.Provider>
  );
}
