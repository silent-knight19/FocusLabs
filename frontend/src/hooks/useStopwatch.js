import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useStopwatchHistory } from '../contexts/StopwatchHistoryContext';

const DEBUG = import.meta.env.DEV;
const logError = DEBUG ? console.error : () => {};
const logWarn = DEBUG ? console.warn : () => {};

export function useStopwatch() {
  const { history: laps, setHistory: setLaps } = useStopwatchHistory();

  // Helper to safely load initial state from localStorage
  const { initialTime, initialIsRunning, initialLastLapTime, initialLaps } = useMemo(() => {
    let savedTime = 0;
    let savedIsRunning = false;
    let savedLastLapTime = 0;
    let savedLaps = [];

    try {
      const savedState = localStorage.getItem('stopwatch_active_state');
      if (savedState) {
        const parsed = JSON.parse(savedState);
        savedIsRunning = parsed.savedIsRunning || false;
        savedLastLapTime = parsed.savedLastLapTime || 0;

        if (savedIsRunning && parsed.savedLastActive) {
          const now = Date.now();
          const elapsed = now - parsed.savedLastActive;
          savedTime = (parsed.savedTime || 0) + elapsed;
        } else {
          savedTime = parsed.savedTime || 0;
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
      initialTime: savedTime,
      initialIsRunning: savedIsRunning,
      initialLastLapTime: savedLastLapTime,
      // We store the IDs from localStorage and later deduplicate against Firestore history.
      // We don't use the full lap objects here because the Firestore history is the source
      // of truth — we only need the IDs to filter the real objects from history.
      initialLaps: savedLaps
    };
  }, []);

  // Derive the current session lap IDs from localStorage so we can match them
  // against Firestore history after it loads. This prevents duplicate laps after refresh.
  const sessionLapIds = useMemo(() => {
    return new Set(initialLaps.map(l => l.id));
  }, [initialLaps]);

  // Local state for the running timer
  const [time, setTime] = useState(initialTime);
  const [isRunning, setIsRunning] = useState(initialIsRunning);
  const [lastLapTime, setLastLapTime] = useState(initialLastLapTime);
  // Start with localStorage laps for immediate display, then sync with Firestore laps
  const [currentSessionLaps, setCurrentSessionLaps] = useState(initialLaps);
  // Track if we've done the initial sync against Firestore history
  const hasSyncedRef = useRef(false);
  
  const requestRef = useRef();
  const previousTimeRef = useRef();

  // Synchronous refs for unload and visibilitychange tracking
  const timeRef = useRef(0);
  const isRunningRef = useRef(false);
  const lastLapTimeRef = useRef(0);

  useEffect(() => {
    timeRef.current = time;
  }, [time]);

  useEffect(() => {
    isRunningRef.current = isRunning;
  }, [isRunning]);

  useEffect(() => {
    lastLapTimeRef.current = lastLapTime;
  }, [lastLapTime]);

  const saveActiveState = useCallback(() => {
    try {
      localStorage.setItem('stopwatch_active_state', JSON.stringify({
        savedTime: timeRef.current,
        savedIsRunning: isRunningRef.current,
        savedLastActive: Date.now(),
        savedLastLapTime: lastLapTimeRef.current
      }));
    } catch (e) {
      logError('Failed to save stopwatch active state to localStorage', e);
    }
  }, []);

  // Save active state to localStorage on state changes (but NOT on time updates)
  useEffect(() => {
    saveActiveState();
  }, [isRunning, lastLapTime, saveActiveState]);

  // Once Firestore history loads (laps is populated), sync currentSessionLaps
  // to only show laps that actually exist in Firestore — prevents duplicates after refresh.
  useEffect(() => {
    if (hasSyncedRef.current) return;

    // For a brand-new user, both Firestore history and localStorage laps are empty.
    // Mark as synced immediately so this effect doesn't re-run on every future update.
    if (laps.length === 0 && sessionLapIds.size === 0) {
      hasSyncedRef.current = true;
      return;
    }

    // Firestore history has loaded: filter down to only laps whose IDs match
    // what was in the localStorage session snapshot
    if (sessionLapIds.size > 0) {
      const firestoreLapIds = new Set(laps.map(l => l.id));
      const validSessionLaps = initialLaps.filter(l => firestoreLapIds.has(l.id));
      setCurrentSessionLaps(validSessionLaps);
    }

    hasSyncedRef.current = true;
  }, [laps, sessionLapIds, initialLaps]);

  // Persist current session laps to localStorage
  useEffect(() => {
    try {
      localStorage.setItem('stopwatch_current_session_laps', JSON.stringify(currentSessionLaps));
    } catch (e) {
      logError('Failed to save stopwatch session laps to localStorage', e);
    }
  }, [currentSessionLaps]);

  // Handle tab unload or backgrounding for robust updates
  useEffect(() => {
    const handleUnloadOrHide = () => {
      saveActiveState();
    };

    window.addEventListener('pagehide', handleUnloadOrHide);
    document.addEventListener('visibilitychange', handleUnloadOrHide);

    return () => {
      window.removeEventListener('pagehide', handleUnloadOrHide);
      document.removeEventListener('visibilitychange', handleUnloadOrHide);
    };
  }, [saveActiveState]);

  const animateRef = useRef();
  
  // Set current animation function after render
  useEffect(() => {
    animateRef.current = (timestamp) => {
      if (previousTimeRef.current != undefined) {
        const deltaTime = timestamp - previousTimeRef.current;
        setTime(prevTime => prevTime + deltaTime);
      }
      previousTimeRef.current = timestamp;
      requestRef.current = requestAnimationFrame(animateRef.current);
    };
  }); // Runs on every render safely outside render phase

  useEffect(() => {
    if (isRunning) {
      requestRef.current = requestAnimationFrame(animateRef.current);
    } else {
      cancelAnimationFrame(requestRef.current);
      previousTimeRef.current = undefined;
    }
    return () => cancelAnimationFrame(requestRef.current);
  }, [isRunning]);

  const start = () => {
    if (!isRunning) {
      setIsRunning(true);
    }
  };

  const pause = () => {
    setIsRunning(false);
  };

  const reset = () => {
    setIsRunning(false);
    setTime(0);
    setLastLapTime(0);
    setCurrentSessionLaps([]);
    hasSyncedRef.current = false;

    // Clear localStorage session data so a fresh start has no stale laps
    try {
      localStorage.removeItem('stopwatch_current_session_laps');
      localStorage.removeItem('stopwatch_active_state');
    } catch (e) {
      logError('Failed to clear stopwatch localStorage on reset', e);
    }
  };

  const lap = (category = 'other') => {
    // Calculate the duration of this session (time since last lap or since start)
    const sessionDuration = time - lastLapTime;

    // Only save if there's meaningful time (at least 1 second)
    if (sessionDuration < 1000) {
      logWarn('Session too short to save (< 1 second)');
      return;
    }

    // Use a stable unique ID that won't collide even if the user presses Lap
    // multiple times quickly (Date.now() can repeat within the same millisecond)
    const newLap = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      time: sessionDuration,
      date: new Date().toISOString(),
      category: category,
      label: `Session ${currentSessionLaps.length + 1}`
    };

    // Add to Firestore — guard against duplicate IDs to prevent double-saves
    setLaps(prev => {
      const existingIds = new Set(prev.map(l => l.id));
      if (existingIds.has(newLap.id)) {
        logWarn('Lap with this ID already exists, skipping duplicate save:', newLap.id);
        return prev;
      }
      return [newLap, ...prev];
    });

    // Update the current session display
    setCurrentSessionLaps(prev => {
      const existingIds = new Set(prev.map(l => l.id));
      if (existingIds.has(newLap.id)) return prev;
      return [newLap, ...prev];
    });

    // Move the last-lap marker forward so the next lap calculates from here
    setLastLapTime(time);
  };

  const updateLapLabel = (id, newLabel) => {
    // Update in Firestore history
    const updatedLaps = laps.map(l => l.id === id ? { ...l, label: newLabel } : l);
    setLaps(updatedLaps);
    // Also update in current session
    const updatedSessionLaps = currentSessionLaps.map(l => l.id === id ? { ...l, label: newLabel } : l);
    setCurrentSessionLaps(updatedSessionLaps);
  };

  const updateLapCategory = (id, newCategory) => {
    // Update in Firestore history
    const updatedLaps = laps.map(l => l.id === id ? { ...l, category: newCategory } : l);
    setLaps(updatedLaps);
    // Also update in current session
    const updatedSessionLaps = currentSessionLaps.map(l => l.id === id ? { ...l, category: newCategory } : l);
    setCurrentSessionLaps(updatedSessionLaps);
  };

  const formatTime = (ms) => {
    const date = new Date(ms);
    return {
      hours: String(Math.floor(ms / 3600000)).padStart(2, '0'),
      minutes: String(date.getUTCMinutes()).padStart(2, '0'),
      seconds: String(date.getUTCSeconds()).padStart(2, '0'),
      centiseconds: String(Math.floor(date.getUTCMilliseconds() / 10)).padStart(2, '0')
    };
  };

  return {
    time,
    isRunning,
    laps: currentSessionLaps, // For UI display (current session only)
    allHistory: laps,         // For analytics (entire history)
    start,
    pause,
    reset,
    lap,
    updateLapLabel,
    updateLapCategory,
    formatTime
  };
}
