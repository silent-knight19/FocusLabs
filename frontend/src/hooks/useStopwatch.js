import { useState, useEffect, useRef, useCallback } from 'react';
import { useFirestore } from './useFirestore';
import { useAuth } from '../contexts/AuthContext';

export function useStopwatch() {
  const { user } = useAuth();
  const userId = user?.uid;

  // Persist laps/history to Firestore
  // We use 'stopwatch_laps' collection or a single document 'stopwatch' with a 'laps' field?
  // useFirestore(userId, collectionName, initialValue)
  // Let's use 'stopwatch_history' as the collection name to match the intent
  const [laps, setLaps, loading] = useFirestore(userId, 'stopwatch_history', []);

  // Local state for the running timer
  // We don't sync high-frequency timer updates to Firestore to avoid write limits
  const [time, setTime] = useState(0);
  const [isRunning, setIsRunning] = useState(false);
  const [startTime, setStartTime] = useState(null);
  const [lastLapTime, setLastLapTime] = useState(0); // Track time of last lap to calculate duration
  
  const requestRef = useRef();
  const previousTimeRef = useRef();

  // Load initial state from localStorage for the active timer (device-specific for now)
  useEffect(() => {
    const savedState = localStorage.getItem('stopwatch_active_state');
    if (savedState) {
      const { savedTime, savedIsRunning, savedLastActive, savedLastLapTime } = JSON.parse(savedState);
      
      if (savedIsRunning) {
        // Calculate time elapsed while away
        const now = Date.now();
        const elapsedWhileAway = now - savedLastActive;
        setTime(savedTime + elapsedWhileAway);
        setIsRunning(true);
        setStartTime(Date.now() - (savedTime + elapsedWhileAway));
      } else {
        setTime(savedTime);
        setIsRunning(false);
      }
      
      // Restore lastLapTime
      if (savedLastLapTime !== undefined) {
        setLastLapTime(savedLastLapTime);
      }
    }
  }, []);

  // Save active state to localStorage on change
  useEffect(() => {
    localStorage.setItem('stopwatch_active_state', JSON.stringify({
      savedTime: time,
      savedIsRunning: isRunning,
      savedLastActive: Date.now(),
      savedLastLapTime: lastLapTime
    }));
  }, [time, isRunning, lastLapTime]);

  const animate = useCallback((timestamp) => {
    if (previousTimeRef.current != undefined) {
      const deltaTime = timestamp - previousTimeRef.current;
      setTime(prevTime => prevTime + deltaTime);
    }
    previousTimeRef.current = timestamp;
    requestRef.current = requestAnimationFrame(animate);
  }, []);

  useEffect(() => {
    if (isRunning) {
      requestRef.current = requestAnimationFrame(animate);
    } else {
      cancelAnimationFrame(requestRef.current);
      previousTimeRef.current = undefined;
    }
    return () => cancelAnimationFrame(requestRef.current);
  }, [isRunning, animate]);

  const start = () => {
    if (!isRunning) {
      setIsRunning(true);
      setStartTime(Date.now() - time);
    }
  };

  const pause = () => {
    setIsRunning(false);
  };

  const reset = () => {
    setIsRunning(false);
    setTime(0);
    setStartTime(null);
    setLastLapTime(0); // Reset last lap time
  };

  const lap = (category = 'other') => {
    // Calculate the duration of this session (time since last lap or since start)
    const sessionDuration = time - lastLapTime;
    
    // Only save if there's meaningful time (at least 1 second)
    if (sessionDuration < 1000) {
      console.warn('Session too short to save (< 1 second)');
      return;
    }

    const newLap = {
      id: Date.now().toString(),
      time: sessionDuration, // ✅ Save DURATION, not cumulative time
      date: new Date().toISOString(),
      category: category,
      label: `Session ${laps.length + 1}`
    };

    // Add to Firestore
    setLaps(prev => [newLap, ...prev]);
    
    // Update last lap time to current time
    // This allows the next lap to calculate duration correctly
    setLastLapTime(time);
    
    // DON'T reset the stopwatch - it should keep running!
    // The UI can show "split time" (time - lastLapTime) if needed
  };

  const updateLapLabel = (id, newLabel) => {
    const updatedLaps = laps.map(l => l.id === id ? { ...l, label: newLabel } : l);
    setLaps(updatedLaps);
  };

  const updateLapCategory = (id, newCategory) => {
    const updatedLaps = laps.map(l => l.id === id ? { ...l, category: newCategory } : l);
    setLaps(updatedLaps);
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
    laps,
    start,
    pause,
    reset,
    lap,
    updateLapLabel,
    updateLapCategory,
    formatTime
  };
}
