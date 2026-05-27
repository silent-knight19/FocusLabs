import React, { useCallback } from 'react';
import { Clock, Play, Pause, Square } from 'lucide-react';
import { useStopwatch } from '../hooks/useStopwatch';

export function StopwatchWidget({ activeHabit }) {
  const {
    time: stopwatchTime,
    isRunning: isStopwatchRunning,
    start: startStopwatch,
    pause: pauseStopwatch,
    reset: resetStopwatch,
    lap: recordLap,
    formatTime: formatStopwatchTime
  } = useStopwatch();

  const getStopwatchCategory = useCallback(() => {
    if (!activeHabit?.category) return 'other';
    const map = {
      'study': 'study', 'work': 'prod', 'personal': 'self',
      'health': 'self', 'fitness': 'self', 'social': 'self'
    };
    return map[activeHabit.category.toLowerCase()] || 'other';
  }, [activeHabit]);

  return (
    <div className="aht-stopwatch-container">
      <div className="aht-stopwatch-pill">
        <div className="aht-stopwatch-display">
          <Clock size={14} className="stopwatch-icon" />
          <span>
            {(() => {
              const t = formatStopwatchTime(stopwatchTime);
              return t.hours !== '00' ? `${t.hours}:${t.minutes}:${t.seconds}` : `${t.minutes}:${t.seconds}`;
            })()}
          </span>
        </div>
        
        <div className="aht-stopwatch-buttons">
          <button 
            className="aht-sw-btn play" 
            onClick={() => isStopwatchRunning ? pauseStopwatch() : startStopwatch()}
            title={isStopwatchRunning ? "Pause" : "Start"}
          >
            {isStopwatchRunning ? <Pause size={14} fill="white" /> : <Play size={14} fill="white" />}
          </button>
          
          <button className="aht-sw-btn lap" onClick={() => recordLap(getStopwatchCategory())}>
            Lap
          </button>

          <button className="aht-sw-btn stop" onClick={resetStopwatch}>
            <Square size={12} fill="currentColor" />
          </button>
        </div>
      </div>
    </div>
  );
}
