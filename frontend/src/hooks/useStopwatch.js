import { useState, useEffect, useRef } from 'react';

const STORAGE_KEY = 'habitgrid_stopwatch';

export function useStopwatch() {
  const [time, setTime] = useState(0);
  const [isRunning, setIsRunning] = useState(false);
  const [laps, setLaps] = useState([]);
  
  const intervalRef = useRef(null);
  const startTimeRef = useRef(0);

  // Load state from localStorage on mount
  useEffect(() => {
    const savedState = localStorage.getItem(STORAGE_KEY);
    if (savedState) {
      const { isRunning: wasRunning, startTime, accumulatedTime, laps: savedLaps } = JSON.parse(savedState);
      
      setLaps(savedLaps || []);
      
      if (wasRunning) {
        // If it was running, calculate the time elapsed since last save
        const now = Date.now();
        const elapsed = now - startTime;
        const totalTime = accumulatedTime + elapsed;
        
        setTime(totalTime);
        setIsRunning(true);
        startTimeRef.current = now - totalTime;
      } else {
        setTime(accumulatedTime);
        setIsRunning(false);
      }
    }
  }, []);

  // Save state to localStorage whenever it changes
  useEffect(() => {
    const stateToSave = {
      isRunning,
      startTime: isRunning ? Date.now() : null,
      accumulatedTime: isRunning ? time : time, // If running, time is current total. If paused, time is accumulated.
      laps
    };
    
    // If running, we need to save the *start time* relative to now, 
    // so we can recalculate correctly on reload.
    // Actually, simpler: Save 'accumulatedTime' as the base, and 'startTime' as the timestamp when we started counting.
    
    if (isRunning) {
        stateToSave.startTime = startTimeRef.current; // The original start timestamp
        stateToSave.accumulatedTime = 0; // Not used when running in this model, but for consistency
    } else {
        stateToSave.startTime = null;
        stateToSave.accumulatedTime = time;
    }

    localStorage.setItem(STORAGE_KEY, JSON.stringify(stateToSave));
  }, [isRunning, time, laps]);

  // Track daily history
  useEffect(() => {
    if (isRunning) {
      const historyInterval = setInterval(() => {
        const todayKey = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
        const history = JSON.parse(localStorage.getItem('habitgrid_stopwatch_history') || '{}');
        
        // Increment by 1 second (1000ms)
        history[todayKey] = (history[todayKey] || 0) + 1000;
        
        localStorage.setItem('habitgrid_stopwatch_history', JSON.stringify(history));
        window.dispatchEvent(new Event('habit-data-updated'));
      }, 1000);
      
      return () => clearInterval(historyInterval);
    }
  }, [isRunning]);

  useEffect(() => {
    if (isRunning) {
      if (!startTimeRef.current) {
          startTimeRef.current = Date.now() - time;
      }
      
      intervalRef.current = setInterval(() => {
        setTime(Date.now() - startTimeRef.current);
      }, 10);
    } else {
      clearInterval(intervalRef.current);
      startTimeRef.current = 0;
    }

    return () => clearInterval(intervalRef.current);
  }, [isRunning]);

  const start = () => {
    if (!isRunning) {
      startTimeRef.current = Date.now() - time;
      setIsRunning(true);
    }
  };

  const pause = () => {
    if (isRunning) {
      setIsRunning(false);
    }
  };

  const reset = () => {
    setIsRunning(false);
    setTime(0);
    setLaps([]);
    localStorage.removeItem(STORAGE_KEY);
  };

  const lap = (category = 'other') => {
    const newLap = {
      id: Date.now().toString(),
      time: time,
      label: `Lap ${laps.length + 1}`,
      category: category, // 'study', 'prod', 'self', 'other'
      date: new Date().toISOString() // Store date for history
    };
    setLaps([newLap, ...laps]);
    
    // Save to permanent history
    const history = JSON.parse(localStorage.getItem('habitgrid_lap_history') || '[]');
    localStorage.setItem('habitgrid_lap_history', JSON.stringify(history));
    window.dispatchEvent(new Event('habit-data-updated'));
  };

  const updateLapCategory = (id, newCategory) => {
    const updatedLaps = laps.map(l => l.id === id ? { ...l, category: newCategory } : l);
    setLaps(updatedLaps);
    
    // Update in permanent history as well
    const history = JSON.parse(localStorage.getItem('habitgrid_lap_history') || '[]');
    const updatedHistory = history.map(l => l.id === id ? { ...l, category: newCategory } : l);
    localStorage.setItem('habitgrid_lap_history', JSON.stringify(updatedHistory));
    window.dispatchEvent(new Event('habit-data-updated'));
  };

  const updateLapLabel = (id, newLabel) => {
    const updatedLaps = laps.map(l => l.id === id ? { ...l, label: newLabel } : l);
    setLaps(updatedLaps);
    
    // Update in permanent history as well
    const history = JSON.parse(localStorage.getItem('habitgrid_lap_history') || '[]');
    const updatedHistory = history.map(l => l.id === id ? { ...l, label: newLabel } : l);
    localStorage.setItem('habitgrid_lap_history', JSON.stringify(updatedHistory));
    window.dispatchEvent(new Event('habit-data-updated'));
  };

  const formatTime = (ms) => {
    const hours = Math.floor(ms / 3600000);
    const minutes = Math.floor((ms % 3600000) / 60000);
    const seconds = Math.floor((ms % 60000) / 1000);
    const centiseconds = Math.floor((ms % 1000) / 10);
    
    return {
      hours: hours > 0 ? String(hours).padStart(2, '0') : null,
      minutes: String(minutes).padStart(2, '0'),
      seconds: String(seconds).padStart(2, '0'),
      centiseconds: String(centiseconds).padStart(2, '0')
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
