import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { formatTime12, formatDateKey } from '../utils/dateHelpers';
import { CheckCircle, Plus, Play, Pause, Square, Clock } from 'lucide-react';
import { useStopwatch } from '../hooks/useStopwatch';
import './styles/ActiveHabitTracker.css';

// Sound utility
const playAlarmSound = () => {
  const AudioContext = window.AudioContext || window.webkitAudioContext;
  if (!AudioContext) return () => {};
  
  try {
    const ctx = new AudioContext();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    
    osc.connect(gain);
    gain.connect(ctx.destination);
    
    osc.type = 'sine';
    osc.frequency.setValueAtTime(523.25, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(261.63, ctx.currentTime + 0.5);
    
    gain.gain.setValueAtTime(0.5, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.5);
    
    osc.start();
    osc.stop(ctx.currentTime + 0.5);

    const secondChime = setTimeout(() => {
      const osc2 = ctx.createOscillator();
      const gain2 = ctx.createGain();
      osc2.connect(gain2);
      gain2.connect(ctx.destination);
      osc2.type = 'sine';
      osc2.frequency.setValueAtTime(659.25, ctx.currentTime);
      osc2.frequency.exponentialRampToValueAtTime(329.63, ctx.currentTime + 0.5);
      gain2.gain.setValueAtTime(0.5, ctx.currentTime);
      gain2.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.5);
      osc2.start();
      osc2.stop(ctx.currentTime + 0.5);
    }, 200);

    return () => {
      clearTimeout(secondChime);
      if (ctx.state !== 'closed') ctx.close();
    };
  } catch (e) {
    console.warn('Audio context error:', e);
    return () => {};
  }
};

export function ActiveHabitTracker({ 
  activeData, 
  dailyTasks = [],
  onToggleDailyTask,
  onAddDailyTask,
  onDeleteDailyTask,
  onToggleCompletion,
  getCompletionStatus
}) {
  const { activeHabit, formattedTimeRemaining, progress } = activeData || {};
  
  const today = useMemo(() => new Date(), []);
  const todayKey = useMemo(() => formatDateKey(today), [today]);
  
  const [localCompletionStatus, setLocalCompletionStatus] = useState('');
  const completionStatus = useMemo(() => 
    activeHabit?.id ? (getCompletionStatus(activeHabit.id, today) || localCompletionStatus) : '',
    [activeHabit?.id, getCompletionStatus, today, localCompletionStatus]
  );
  
  const [finishedHabit, setFinishedHabit] = useState(null);
  const [newTaskTitle, setNewTaskTitle] = useState('');
  const prevHabitRef = useRef(null);
  const alarmCleanup = useRef(null);

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

  useEffect(() => {
    return () => {
      if (alarmCleanup.current) {
        alarmCleanup.current();
        alarmCleanup.current = null;
      }
    };
  }, []);

  useEffect(() => {
    if (prevHabitRef.current && (!activeHabit || activeHabit.id !== prevHabitRef.current.id)) {
      const prev = prevHabitRef.current;
      const now = new Date();
      const currentMinutes = now.getHours() * 60 + now.getMinutes();
      const [endHours, endMinutes] = prev.endTime.split(':').map(Number);
      const endTimeMinutes = endHours * 60 + endMinutes;
      
      if (currentMinutes === endTimeMinutes || currentMinutes === endTimeMinutes + 1) {
        setFinishedHabit(prev);
        alarmCleanup.current = playAlarmSound();
        const timer = setTimeout(() => {
          setFinishedHabit(null);
          if (alarmCleanup.current) alarmCleanup.current();
        }, 10000);
        return () => clearTimeout(timer);
      }
    }
    prevHabitRef.current = activeHabit;
  }, [activeHabit]);

  const handleDismiss = useCallback(() => {
    setFinishedHabit(null);
    if (alarmCleanup.current) alarmCleanup.current();
  }, []);

  const handleToggleCompletion = useCallback(() => {
    if (!activeHabit?.id) return;
    const newStatus = completionStatus === 'completed' ? '' : 'completed';
    setLocalCompletionStatus(newStatus);
    onToggleCompletion(activeHabit.id, today);
  }, [activeHabit?.id, completionStatus, onToggleCompletion, today]);

  const handleAddTask = (e) => {
    e.preventDefault();
    if (newTaskTitle.trim() && onAddDailyTask) {
      onAddDailyTask(activeHabit.id, todayKey, newTaskTitle.trim());
      setNewTaskTitle('');
    }
  };

  if (!activeHabit && !finishedHabit) {
    return (
      <div className="active-tracker-container empty">
        <div className="empty-content">
          <Clock size={48} className="empty-icon" style={{ color: 'var(--text-tertiary)' }} />
          <h3>No Active Habit</h3>
          <p>No habits scheduled for this time</p>
        </div>
      </div>
    );
  }

  if (finishedHabit) {
    return (
      <div className="active-tracker-container finished">
        <div className="finished-content">
          <Clock size={48} />
          <h2>Time's Up!</h2>
          <p>{finishedHabit.name}</p>
          <button className="dismiss-btn" onClick={handleDismiss}>Continue</button>
        </div>
      </div>
    );
  }

  const todayTasks = dailyTasks.filter(task => 
    task.habitId === activeHabit.id && task.date === todayKey
  );

  const radius = 80; // Increased scale
  const circumference = 2 * Math.PI * radius;
  const progressOffset = circumference * (progress / 100);

  return (
    <div className="active-tracker-container">
      {/* Header */}
      <div className="tracker-header">
        <span className="active-badge">ACTIVE NOW</span>
        <span className="time-range">
          {formatTime12(activeHabit.startTime)} - {formatTime12(activeHabit.endTime)}
        </span>
      </div>

      {/* Completion Button */}
      <div className="action-row">
        <button 
          className={`mark-complete-btn ${completionStatus === 'completed' ? 'completed' : ''}`}
          onClick={handleToggleCompletion}
        >
          {completionStatus === 'completed' ? 'COMPLETED' : 'MARK COMPLETE'}
        </button>
      </div>

      {/* Hero Section */}
      <div className="hero-section">
        <h1 className="habit-title">{activeHabit.name}</h1>
        <div className="timer-container-centered">
          <span className="timer-label">TIME REMAINING</span>
          <div className="circular-timer">
             <svg width="184" height="184" viewBox="0 0 184 184">
                <circle
                  cx="92"
                  cy="92"
                  r={radius}
                  fill="none"
                  className="timer-bg"
                  strokeWidth="6"
                />
                <circle
                  cx="92"
                  cy="92"
                  r={radius}
                  fill="none"
                  className="timer-progress"
                  strokeWidth="6"
                  strokeDasharray={circumference}
                  strokeDashoffset={progressOffset}
                  transform="rotate(-90 92 92)"
                />
             </svg>
             <div className="timer-value">
               {formattedTimeRemaining}
             </div>
          </div>
        </div>
      </div>

      {/* Tasks Section */}
      <div className="aht-tasks-section">
        <div className="aht-tasks-header">
           <h3>Today's Tasks</h3>
        </div>
        
        <div className="aht-tasks-scroll-area">
          {todayTasks.length === 0 ? (
            <div className="aht-no-tasks">
              <div className="aht-no-task-icon">📝</div>
              <p>No tasks yet</p>
              <span>Add your first task below</span>
            </div>
          ) : (
             <div className="aht-task-list">
               {todayTasks.map(task => (
                 <div key={task.id} className={`aht-task-item ${task.completed ? 'completed' : ''}`}>
                    <div 
                      className="aht-task-checkbox" 
                      onClick={() => onToggleDailyTask(task.id)}
                    >
                      {task.completed && <CheckCircle size={14} />}
                    </div>
                    <span className="aht-task-text">{task.title}</span>
                    <button 
                      className="aht-delete-task-btn"
                      onClick={() => onDeleteDailyTask(task.id)}
                    >✕</button>
                 </div>
               ))}
             </div>
          )}
        </div>

        <form onSubmit={handleAddTask} className="aht-add-task-form">
           <input 
             type="text" 
             placeholder="Add a new task..."
             value={newTaskTitle}
             onChange={(e) => setNewTaskTitle(e.target.value)}
           />
           <button type="submit" disabled={!newTaskTitle.trim()}>
             <Plus size={20} />
           </button>
        </form>
      </div>

      {/* Stopwatch Controls - Scoped to avoid conflicts */}
      <div className="aht-stopwatch-container">
         <div className="aht-stopwatch-pill">
            <div className="aht-stopwatch-display">
               <Clock size={14} className="stopwatch-icon" />
               <span>
                  {(() => {
                    const t = formatStopwatchTime(stopwatchTime);
                    return t.hours ? `${t.hours}:${t.minutes}:${t.seconds}` : `${t.minutes}:${t.seconds}`;
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
      
    </div>
  );
}
