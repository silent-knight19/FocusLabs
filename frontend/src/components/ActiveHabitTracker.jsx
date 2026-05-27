/* eslint-disable no-unused-vars */
import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { formatTime12, formatDateKey } from '../utils/dateHelpers';
import { CheckCircle, Plus, Clock } from 'lucide-react';
import { GoalsCarousel } from './GoalsCarousel';
import { ActiveHabitTimer } from './ActiveHabitTimer';
import { StopwatchWidget } from './StopwatchWidget';
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
  getCompletionStatus,
  goals = [],
  getGoalProgress,
  onOpenGoal,
  onViewAllGoals
}) {
  const { activeHabit } = activeData || {};
  
  const today = useMemo(() => new Date(), []);
  const todayKey = useMemo(() => formatDateKey(today), [today]);
  
  const [localCompletionStatus, setLocalCompletionStatus] = useState('');
  const completionStatus = useMemo(() => 
    activeHabit?.id ? (getCompletionStatus(activeHabit.id, today) || localCompletionStatus) : '',
    [activeHabit, getCompletionStatus, today, localCompletionStatus]
  );
  
  const [finishedHabit, setFinishedHabit] = useState(null);
  const [newTaskTitle, setNewTaskTitle] = useState('');
  const prevHabitRef = useRef(null);
  const alarmCleanup = useRef(null);

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
  }, [activeHabit, completionStatus, onToggleCompletion, today]);

  const handleAddTask = (e) => {
    e.preventDefault();
    if (newTaskTitle.trim() && onAddDailyTask) {
      onAddDailyTask(activeHabit.id, todayKey, newTaskTitle.trim());
      setNewTaskTitle('');
    }
  };

  if (!activeHabit && !finishedHabit) {
    const activeGoals = goals.filter(g => g.status === 'active');
    const hasGoals = activeGoals.length > 0;

    if (hasGoals) {
      return (
        <div className="active-tracker-container empty">
          <GoalsCarousel
            goals={goals}
            getGoalProgress={getGoalProgress}
            onOpenGoal={onOpenGoal}
            onViewAll={onViewAllGoals}
          />
        </div>
      );
    }

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

  return (
    <div className="active-tracker-container glass-3d">
      {/* Header */}
      <div className="tracker-header">
        <span className="active-badge">ACTIVE NOW</span>
        <span className="time-range">
          {formatTime12(activeHabit.startTime)} - {formatTime12(activeHabit.endTime)}
        </span>
      </div>

      {/* Completion Button */}
      <div className="action-row">
        <motion.button 
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          className={`mark-complete-btn ${completionStatus === 'completed' ? 'completed' : ''}`}
          onClick={handleToggleCompletion}
        >
          {completionStatus === 'completed' ? 'COMPLETED' : 'MARK COMPLETE'}
        </motion.button>
      </div>

      {/* Hero Section */}
      <div className="hero-section">
        <h1 className="habit-title">{activeHabit.name}</h1>
        <div className="timer-container-centered">
          <span className="timer-label">TIME REMAINING</span>
          <ActiveHabitTimer activeHabit={activeHabit} />
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
               <AnimatePresence>
                 {todayTasks.map(task => (
                   <motion.div 
                     key={task.id} 
                     layout
                     initial={{ opacity: 0, y: 10 }}
                     animate={{ opacity: 1, y: 0 }}
                     exit={{ opacity: 0, scale: 0.9 }}
                     className={`aht-task-item ${task.completed ? 'completed' : ''}`}
                   >
                      <motion.div 
                        whileHover={{ scale: 1.1 }}
                        whileTap={{ scale: 0.9 }}
                        className="aht-task-checkbox" 
                        onClick={() => onToggleDailyTask(task.id)}
                      >
                        {task.completed && <CheckCircle size={14} />}
                      </motion.div>
                      <span className="aht-task-text">{task.title}</span>
                      <motion.button 
                        whileHover={{ scale: 1.2, color: '#ff4b4b' }}
                        whileTap={{ scale: 0.9 }}
                        className="aht-delete-task-btn"
                        onClick={() => onDeleteDailyTask(task.id)}
                      >✕</motion.button>
                   </motion.div>
                 ))}
               </AnimatePresence>
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
           <motion.button 
             whileHover={{ scale: 1.1 }}
             whileTap={{ scale: 0.9 }}
             type="submit" 
             disabled={!newTaskTitle.trim()}
           >
             <Plus size={20} />
           </motion.button>
        </form>
      </div>

      {/* Stopwatch Controls */}
      <StopwatchWidget activeHabit={activeHabit} />
      
    </div>
  );
}
