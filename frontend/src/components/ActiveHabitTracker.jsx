import React from 'react';
import { formatTime12, formatDateKey } from '../utils/dateHelpers';
import './styles/ActiveHabitTracker.css';
import './styles/ActiveHabitTrackerStopwatch.css';
import './styles/DailyTasksActive.css';
import './styles/TimesUp.css';
import './styles/TodaysTasksRedesigned.css';
import { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { CheckCircle, Circle, Plus, Play, Pause, Square, Clock } from 'lucide-react';
import { useStopwatch } from '../hooks/useStopwatch';

const playAlarmSound = () => {
  const AudioContext = window.AudioContext || window.webkitAudioContext;
  if (!AudioContext) return () => {}; // Return empty cleanup function
  
  const ctx = new AudioContext();
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  
  osc.connect(gain);
  gain.connect(ctx.destination);
  
  osc.type = 'sine';
  osc.frequency.setValueAtTime(523.25, ctx.currentTime); // C5
  osc.frequency.exponentialRampToValueAtTime(261.63, ctx.currentTime + 0.5); // C4
  
  gain.gain.setValueAtTime(0.5, ctx.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.5);
  
  osc.start();
  osc.stop(ctx.currentTime + 0.5);

  // Second chime
  const secondChime = setTimeout(() => {
    const osc2 = ctx.createOscillator();
    const gain2 = ctx.createGain();
    osc2.connect(gain2);
    gain2.connect(ctx.destination);
    osc2.type = 'sine';
    osc2.frequency.setValueAtTime(659.25, ctx.currentTime); // E5
    osc2.frequency.exponentialRampToValueAtTime(329.63, ctx.currentTime + 0.5); // E4
    gain2.gain.setValueAtTime(0.5, ctx.currentTime);
    gain2.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.5);
    osc2.start();
    osc2.stop(ctx.currentTime + 0.5);
  }, 200);

  // Return cleanup function
  return () => {
    clearTimeout(secondChime);
    try {
      if (ctx.state !== 'closed') {
        ctx.close();
      }
    } catch (e) {
      console.warn('Error closing audio context:', e);
    }
  };
};

/**
 * Displays the currently active habit with countdown timer and daily tasks
 */
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
  
  // Use useMemo for dates to prevent unnecessary recalculations
  const today = useMemo(() => new Date(), []);
  const todayKey = useMemo(() => formatDateKey(today), [today]);
  
  // Initialize state with proper defaults
  const [localCompletionStatus, setLocalCompletionStatus] = useState('');
  const completionStatus = useMemo(() => 
    activeHabit?.id ? (getCompletionStatus(activeHabit.id, today) || localCompletionStatus) : '',
    [activeHabit?.id, getCompletionStatus, today, localCompletionStatus]
  );
  
  const [finishedHabit, setFinishedHabit] = useState(null);
  const [newTaskTitle, setNewTaskTitle] = useState('');
  const prevHabitRef = useRef(null);
  const alarmCleanup = useRef(null);

  // Integrate stopwatch
  const {
    time: stopwatchTime,
    isRunning: isStopwatchRunning,
    start: startStopwatch,
    pause: pauseStopwatch,
    reset: resetStopwatch,
    lap: recordLap,
    formatTime: formatStopwatchTime
  } = useStopwatch();

  // Map habit category to stopwatch category
  const getStopwatchCategory = useCallback(() => {
    if (!activeHabit?.category) return 'other';
    
    const categoryMap = {
      'study': 'study',
      'work': 'prod',
      'personal': 'self',
      'health': 'self',
      'fitness': 'self',
      'social': 'self',
      'other': 'other'
    };
    
    return categoryMap[activeHabit.category.toLowerCase()] || 'other';
  }, [activeHabit]);

  // Handle cleanup when component unmounts or when alarm is dismissed
  useEffect(() => {
    return () => {
      // Clean up any running alarm when component unmounts
      if (alarmCleanup.current) {
        alarmCleanup.current();
        alarmCleanup.current = null;
      }
    };
  }, []);

  // Check for habit completion (Time's Up)
  useEffect(() => {
    if (prevHabitRef.current && (!activeHabit || activeHabit.id !== prevHabitRef.current.id)) {
      const prev = prevHabitRef.current;
      const now = new Date();
      const currentMinutes = now.getHours() * 60 + now.getMinutes();
      
      const [endHours, endMinutes] = prev.endTime.split(':').map(Number);
      const endTimeMinutes = endHours * 60 + endMinutes;
      
      if (currentMinutes === endTimeMinutes || currentMinutes === endTimeMinutes + 1) {
        setFinishedHabit(prev);
        // Store the cleanup function
        alarmCleanup.current = playAlarmSound();
        
        const timer = setTimeout(() => {
          setFinishedHabit(null);
          // Clean up when timer expires
          if (alarmCleanup.current) {
            alarmCleanup.current();
            alarmCleanup.current = null;
          }
        }, 10000);
        
        return () => {
          clearTimeout(timer);
          if (alarmCleanup.current) {
            alarmCleanup.current();
            alarmCleanup.current = null;
          }
        };
      }
    }
    prevHabitRef.current = activeHabit;
  }, [activeHabit]);
  
  // Handle alarm dismissal
  const handleDismiss = useCallback(() => {
    setFinishedHabit(null);
    // Clean up the alarm sound when dismissed
    if (alarmCleanup.current) {
      alarmCleanup.current();
      alarmCleanup.current = null;
    }
  }, []);

  // Handle habit completion with proper cleanup
  const handleToggleCompletion = useCallback(() => {
    if (!activeHabit?.id) return;
    
    const newStatus = completionStatus === 'completed' ? '' : 'completed';
    setLocalCompletionStatus(newStatus);
    onToggleCompletion(activeHabit.id, today);
  }, [activeHabit?.id, completionStatus, onToggleCompletion, today]);

  if (!activeHabit && !finishedHabit) {
    return (
      <div className="active-habit-tracker empty">
        <div className="empty-state">
          <div className="empty-icon">⏰</div>
          <h3>No Active Habit</h3>
          <p>No habits scheduled for the current time</p>
        </div>
      </div>
    );
  }

  // Render Time's Up Overlay if needed
  if (finishedHabit) {
    return (
      <div className="active-habit-tracker active" style={{ position: 'relative', minHeight: '400px' }}>
        <div className="times-up-overlay">
          <div className="times-up-content">
            <div className="times-up-icon">⏰</div>
            <h2 className="times-up-title">Time's Up!</h2>
            <p className="times-up-habit">{finishedHabit.name}</p>
            <p className="times-up-message">Great job sticking to your schedule!</p>
            <button className="dismiss-btn" onClick={handleDismiss}>
              Continue
            </button>
          </div>
        </div>
      </div>
    );
  }

  const dateKey = todayKey;
  
  // Get daily tasks for this habit on today's date
  const todayTasks = dailyTasks.filter(task => 
    task.habitId === activeHabit.id && task.date === dateKey
  );

  const handleAddTask = (e) => {
    e.preventDefault();
    if (newTaskTitle.trim() && onAddDailyTask) {
      onAddDailyTask(activeHabit.id, todayKey, newTaskTitle.trim());
      setNewTaskTitle('');
    }
  };

  // Calculate the stroke dashoffset for the ring (inverted so it empties)
  const radius = 80;
  const circumference = 2 * Math.PI * radius;
  const progressOffset = circumference * (progress / 100);

  return (
    <div className="active-habit-tracker active">
      <div className="active-habit-header">
        <div className="habit-badge" style={{ backgroundColor: activeHabit.color }}>
          ACTIVE NOW
        </div>
        <div className="habit-time-range">
          {formatTime12(activeHabit.startTime)} - {formatTime12(activeHabit.endTime)}
        </div>
      </div>

      <div className="mark-complete-container">
        <button
          type="button"
          className={`completion-btn ${completionStatus === 'completed' ? 'completed' : ''}`}
          onClick={handleToggleCompletion}
        >
          {completionStatus === 'completed' ? '✓ Completed' : 'Mark Complete'}
        </button>
      </div>

      <div className="active-habit-main">
        <div className="habit-info-section">
          <h2 className="habit-name">{activeHabit.name}</h2>
          {activeHabit.description && (
            <p className="habit-description">{activeHabit.description}</p>
          )}
        </div>

        {/* Centered countdown with progress ring */}
        <div className="countdown-wrapper">
          <div className="countdown-label">Time Remaining</div>
          
          <div className="progress-ring-container">
            <svg className="progress-ring" width="168" height="168" viewBox="0 0 176 176">
              {/* Background ring */}
              <circle
                className="progress-ring-bg"
                cx="88"
                cy="88"
                r={radius}
                fill="none"
                stroke="var(--bg-hover)"
                strokeWidth="9"
              />
              {/* Progress ring - empties as time passes */}
              <circle
                className="progress-ring-fill"
                cx="88"
                cy="88"
                r={radius}
                fill="none"
                stroke="var(--neon-orange)"
                strokeWidth="9"
                strokeDasharray={circumference}
                strokeDashoffset={progressOffset}
                transform="rotate(-90 88 88)"
                style={{ transition: 'stroke-dashoffset 1s linear' }}
              />
            </svg>
            
            {/* Timer in center */}
            <div className="countdown-timer-center">
              <div className="countdown-timer">{formattedTimeRemaining}</div>
            </div>
          </div>
        </div>
      </div>

      {/* Daily Tasks Section - Redesigned */}
      <div className="todays-tasks-redesigned">
        <div className="tasks-header">
          <h3>Today's Tasks</h3>
          {todayTasks.length > 0 && (
            <span className="tasks-progress">
              {todayTasks.filter(t => t.completed).length}/{todayTasks.length}
            </span>
          )}
        </div>
        
        <div className="tasks-container">
          {todayTasks.length === 0 ? (
            <div className="tasks-empty-state">
              <div className="empty-icon">📝</div>
              <p>No tasks yet</p>
              <span>Add your first task below</span>
            </div>
          ) : (
            <div className="tasks-grid">
              {todayTasks.map(task => (
                <div 
                  key={task.id} 
                  className={`task-card ${task.completed ? 'completed' : ''}`}
                  onClick={() => onToggleDailyTask && onToggleDailyTask(task.id)}
                >
                  <div className="task-checkbox-wrapper">
                    <div className={`modern-checkbox ${task.completed ? 'checked' : ''}`}>
                      {task.completed && <CheckCircle size={18} />}
                    </div>
                  </div>
                  <span className="task-text">{task.title}</span>
                  <button
                    type="button"
                    className="task-delete"
                    onClick={(e) => {
                      e.stopPropagation();
                       onDeleteDailyTask && onDeleteDailyTask(task.id);
                    }}
                    title="Delete"
                  >
                    ✕
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
        
        {/* Add Task Input - Redesigned */}
        <form onSubmit={handleAddTask} className="add-task-redesigned">
          <input
            type="text"
            value={newTaskTitle}
            onChange={(e) => setNewTaskTitle(e.target.value)}
            placeholder="Add a new task..."
            className="task-input-modern"
          />
          <button
            type="submit"
            className="task-add-btn"
            disabled={!newTaskTitle.trim()}
          >
            <Plus size={20} />
          </button>
        </form>
      </div>

      {/* Stopwatch Controls */}
      <div className="active-habit-actions">
        <div className="stopwatch-controls">
          <div className="stopwatch-time-display">
            <Clock size={14} />
            <span className="stopwatch-time">
              {(() => {
                const formatted = formatStopwatchTime(stopwatchTime);
                if (formatted.hours) {
                  return `${formatted.hours}:${formatted.minutes}:${formatted.seconds}`;
                }
                return `${formatted.minutes}:${formatted.seconds}`;
              })()}
            </span>
          </div>
          
          <div className="stopwatch-actions">
            <button
              type="button"
              className={`stopwatch-btn ${isStopwatchRunning ? 'stop' : 'start'}`}
              onClick={() => isStopwatchRunning ? pauseStopwatch() : startStopwatch()}
              title={isStopwatchRunning ? "Stop" : "Start"}
            >
              {isStopwatchRunning ? <Pause size={14} /> : <Play size={14} />}
            </button>
            
            <button
              type="button"
              className="stopwatch-btn lap"
              onClick={() => recordLap(getStopwatchCategory())}
              disabled={!isStopwatchRunning}
              title="Lap"
            >
              Lap
            </button>
            
            <button
              type="button"
              className="stopwatch-btn reset"
              onClick={resetStopwatch}
              title="Reset"
            >
              <Square size={14} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
