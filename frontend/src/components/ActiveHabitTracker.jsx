import React from 'react';
import { SubtaskList } from './SubtaskList';
import { getToday, formatTime12 } from '../utils/dateHelpers';
import './styles/ActiveHabitTracker.css';
import './styles/TimesUp.css';
import { useState, useEffect, useRef } from 'react';

// Simple bell sound (base64)
const ALARM_SOUND = 'data:audio/wav;base64,UklGRl9vT1BXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YU'; // Shortened for brevity, I will use a real one in the actual file or a useEffect to generate one.
// Actually, I'll use a real base64 string for a chime in the next step or generate a beep.
// For now, let's use a function to play a generated sound to avoid huge base64 strings.

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
 * Displays the currently active habit with countdown timer and subtasks
 */
export function ActiveHabitTracker({ 
  activeData, 
  subtasksData,
  onToggleSubtask,
  onAddSubtask,
  onDeleteSubtask,
  getSubtaskStatus,
  onToggleCompletion,
  getCompletionStatus
}) {
  const { activeHabit, formattedTimeRemaining, progress } = activeData;
  
  const [finishedHabit, setFinishedHabit] = useState(null);
  const prevHabitRef = useRef(null);

  // Check for habit completion (Time's Up)
  useEffect(() => {
    // If we had a habit, and now we don't (or it changed), check if it finished naturally
    if (prevHabitRef.current && (!activeHabit || activeHabit.id !== prevHabitRef.current.id)) {
      const prev = prevHabitRef.current;
      const now = new Date();
      const currentMinutes = now.getHours() * 60 + now.getMinutes();
      
      const [endHours, endMinutes] = prev.endTime.split(':').map(Number);
      const endTimeMinutes = endHours * 60 + endMinutes;
      
      // If current time is at or past the end time (within a small margin of error, e.g. 1 min)
      // We check if we are "just past" the end time.
      // Since this runs every second, we should catch it.
      
      // Simple check: if we are currently AT the minute of end time, it's a finish.
      if (currentMinutes === endTimeMinutes || currentMinutes === endTimeMinutes + 1) {
        setFinishedHabit(prev);
        playAlarmSound();
        
        // Auto-dismiss after 10 seconds
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
  const completionStatus = getCompletionStatus(activeHabit.id, today);
  const habitSubtasks = subtasksData.getSubtasks(activeHabit.id);

  // Calculate the stroke dashoffset for the ring (inverted so it empties)
  const radius = 100;
  const circumference = 2 * Math.PI * radius;
  const progressOffset = circumference * (progress / 100); // Ring empties as progress increases

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

      {/* Subtasks Section */}
      <div className="subtasks-section">
        <h4>Subtasks</h4>
        <SubtaskList
          habitId={activeHabit.id}
          subtasks={habitSubtasks}
          onAddSubtask={onAddSubtask}
          onDeleteSubtask={onDeleteSubtask}
          onToggleSubtask={onToggleSubtask}
          date={today}
          getSubtaskStatus={getSubtaskStatus}
        />
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
