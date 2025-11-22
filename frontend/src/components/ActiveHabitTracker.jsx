import React from 'react';
import { getToday, formatTime12, formatDateKey } from '../utils/dateHelpers';
import './styles/ActiveHabitTracker.css';
import './styles/DailyTasksActive.css';
import './styles/TimesUp.css';
import { useState, useEffect, useRef } from 'react';
import { CheckCircle, Circle, Plus } from 'lucide-react';

const playAlarmSound = () => {
  const AudioContext = window.AudioContext || window.webkitAudioContext;
  if (!AudioContext) return;
  
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
  setTimeout(() => {
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
  const { activeHabit, formattedTimeRemaining, progress } = activeData;
  
  const [finishedHabit, setFinishedHabit] = useState(null);
  const [newTaskTitle, setNewTaskTitle] = useState('');
  const prevHabitRef = useRef(null);

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
        playAlarmSound();
        
        const timer = setTimeout(() => setFinishedHabit(null), 10000);
        return () => clearTimeout(timer);
      }
    }
    prevHabitRef.current = activeHabit;
  }, [activeHabit]);

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
            <button className="dismiss-btn" onClick={() => setFinishedHabit(null)}>
              Continue
            </button>
          </div>
        </div>
      </div>
    );
  }

  const today = getToday();
  const dateKey = formatDateKey(today);
  const completionStatus = getCompletionStatus(activeHabit.id, today);
  
  // Get daily tasks for this habit on today's date
  const todayTasks = dailyTasks.filter(task => 
    task.habitId === activeHabit.id && task.date === dateKey
  );

  const handleAddTask = (e) => {
    e.preventDefault();
    if (newTaskTitle.trim() && onAddDailyTask) {
      onAddDailyTask(activeHabit.id, today, newTaskTitle.trim());
      setNewTaskTitle('');
    }
  };

  // Calculate the stroke dashoffset for the ring (inverted so it empties)
  const radius = 100;
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
            <svg className="progress-ring" width="174" height="174" viewBox="0 0 240 240">
              {/* Background ring */}
              <circle
                className="progress-ring-bg"
                cx="120"
                cy="120"
                r={radius}
                fill="none"
                stroke="var(--bg-hover)"
                strokeWidth="12"
              />
              {/* Progress ring - empties as time passes */}
              <circle
                className="progress-ring-fill"
                cx="120"
                cy="120"
                r={radius}
                fill="none"
                stroke="var(--neon-orange)"
                strokeWidth="12"
                strokeDasharray={circumference}
                strokeDashoffset={progressOffset}
                transform="rotate(-90 120 120)"
                style={{ transition: 'stroke-dashoffset 1s linear' }}
              />
            </svg>
            
            {/* Timer in center */}
            <div className="countdown-timer-center">
              <div className="countdown-timer">{formattedTimeRemaining}</div>
              <div className="progress-percentage">{Math.round(100 - progress)}%</div>
            </div>
          </div>
        </div>
      </div>

      {/* Daily Tasks Section */}
      <div className="subtasks-section">
        <h4>Today's Tasks</h4>
        <div className="daily-tasks-list">
          {todayTasks.length === 0 ? (
            <p className="no-tasks-message">No tasks planned for today. Add one below!</p>
          ) : (
            todayTasks.map(task => (
              <div key={task.id} className="daily-task-item-active">
                <button
                  type="button"
                  className={`task-checkbox ${task.completed ? 'checked' : ''}`}
                  onClick={() => onToggleDailyTask && onToggleDailyTask(task.id)}
                >
                  {task.completed ? <CheckCircle size={20} /> : <Circle size={20} />}
                </button>
                <span className={`task-title ${task.completed ? 'completed' : ''}`}>
                  {task.title}
                </span>
                <button
                  type="button"
                  className="task-delete-btn"
                  onClick={() => onDeleteDailyTask && onDeleteDailyTask(task.id)}
                  title="Delete task"
                >
                  ✕
                </button>
              </div>
            ))
          )}
        </div>
        
        {/* Add Task Form */}
        <form onSubmit={handleAddTask} className="add-task-form">
          <input
            type="text"
            value={newTaskTitle}
            onChange={(e) => setNewTaskTitle(e.target.value)}
            placeholder="Add a task for today..."
            className="add-task-input"
          />
          <button
            type="submit"
            className="add-task-btn"
            disabled={!newTaskTitle.trim()}
          >
            <Plus size={20} />
          </button>
        </form>
      </div>

      {/* Completion Button */}
      <div className="active-habit-actions">
        <button
          type="button"
          className={`completion-btn ${completionStatus === 'completed' ? 'completed' : ''}`}
          onClick={() => onToggleCompletion(activeHabit.id, today)}
        >
          {completionStatus === 'completed' ? '✓ Completed' : 'Mark Complete'}
        </button>
      </div>
    </div>
  );
}
