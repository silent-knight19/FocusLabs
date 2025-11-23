import React, { useMemo, useState } from 'react';
import { X, CheckCircle, Circle, Clock, TrendingUp, Target, ListTodo, ChevronDown, FileText } from 'lucide-react';
import { useHabitNotes } from '../hooks/useHabitNotes';
import { formatDateKey } from '../utils/dateHelpers';
import { useLockBodyScroll } from '../hooks/useLockBodyScroll';
import './styles/DayHistoryModal.css';

/**
 * Detailed history view for a specific date
 * Shows habits, subtasks, daily tasks, time spent by category, and statistics
 */
export function DayHistoryModal({ 
  date, 
  habits, 
  completions, 
  subtasks = [], 
  subtaskCompletions = {},
  dailyTasks = [],
  onClose 
}) {
  useLockBodyScroll(true);
  const dateStr = formatDateKey(date);
  const { getNote, hasNote } = useHabitNotes();
  const [expandedHabits, setExpandedHabits] = useState({});

  const toggleHabit = (habitId) => {
    setExpandedHabits(prev => ({
      ...prev,
      [habitId]: !prev[habitId]
    }));
  };

  // Get all lap data for this day
  const dayData = useMemo(() => {
    try {
      const lapHistory = JSON.parse(localStorage.getItem('habitgrid_lap_history') || '[]');
      const dayLaps = lapHistory.filter(lap => {
        const lapDateKey = lap.date ? formatDateKey(new Date(lap.date)) : null;
        return lapDateKey === dateStr && (lap.time || 0) >= 60000;
      });

      // Group by category
      const categoryTime = {};
      dayLaps.forEach(lap => {
        const category = lap.category || 'uncategorized';
        categoryTime[category] = (categoryTime[category] || 0) + (lap.time || 0);
      });

      // Get total time from stopwatch history
      const stopwatchHistory = JSON.parse(localStorage.getItem('habitgrid_stopwatch_history') || '{}');
      const totalMs = stopwatchHistory[dateStr] || 0;

      return {
        laps: dayLaps,
        categoryTime,
        totalTime: totalMs,
        lapCount: dayLaps.length
      };
    } catch {
      return {
        laps: [],
        categoryTime: {},
        totalTime: 0,
        lapCount: 0
      };
    }
  }, [dateStr]);

  // Filter habits that were active on this date
  const activeHabits = useMemo(() => {
    return habits.filter(h => {
      const createdStr = formatDateKey(new Date(h.createdAt));
      return createdStr <= dateStr;
    });
  }, [habits, dateStr]);

  // Get daily tasks for this date
  const dayTasks = useMemo(() => {
    return dailyTasks.filter(task => task.date === dateStr);
  }, [dailyTasks, dateStr]);

  // Calculate completion stats
  const stats = useMemo(() => {
    const completed = activeHabits.filter(h => 
      completions[h.id]?.[dateStr] === 'completed'
    ).length;
    const total = activeHabits.length;
    const percentage = total > 0 ? (completed / total) * 100 : 0;

    // Daily tasks stats
    const totalTasks = dayTasks.length;
    const completedTasks = dayTasks.filter(t => t.completed).length;

    return { 
      completed, 
      total, 
      percentage,
      totalTasks,
      completedTasks
    };
  }, [activeHabits, completions, dateStr, dayTasks]);

  // Format time
  const formatTime = (ms) => {
    const hours = Math.floor(ms / (1000 * 60 * 60));
    const minutes = Math.floor((ms % (1000 * 60 * 60)) / (1000 * 60));
    if (hours > 0) {
      return `${hours}h ${minutes}m`;
    }
    return `${minutes}m`;
  };

  // Category colors
  const categoryColors = {
    'study': '#3b82f6',
    'prod': '#8b5cf6',
    'self': '#10b981',
    'self growth': '#10b981',
    'health': '#ef4444',
    'uncategorized': '#6b7280'
  };

  // Format date
  const formattedDate = date.toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });

  const isToday = date.toDateString() === new Date().toDateString();
  const isPast = date < new Date() && !isToday;

  return (
    <div className="day-history-overlay" onClick={onClose}>
      <div className="day-history-modal" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="day-history-header">
          <div>
            <h2 className="day-history-title">{formattedDate}</h2>
            <p className="day-history-subtitle">
              {isToday ? 'Today' : isPast ? 'Past Day' : 'Future Date'}
            </p>
          </div>
          <button className="close-btn-icon" onClick={onClose}>
            <X size={32} />
          </button>
        </div>

        {/* Summary Cards */}
        <div className="day-summary-cards">
          <div className="summary-card">
            <div className="summary-icon" style={{ backgroundColor: 'rgba(255, 107, 53, 0.1)' }}>
              <Target size={24} color="var(--neon-orange)" />
            </div>
            <div className="summary-content">
              <div className="summary-value">{stats.completed}/{stats.total}</div>
              <div className="summary-label">Habits Completed</div>
            </div>
          </div>

          <div className="summary-card">
            <div className="summary-icon" style={{ backgroundColor: 'rgba(59, 130, 246, 0.1)' }}>
              <Clock size={24} color="#3b82f6" />
            </div>
            <div className="summary-content">
              <div className="summary-value">{formatTime(dayData.totalTime)}</div>
              <div className="summary-label">Total Time</div>
            </div>
          </div>

          <div className="summary-card">
            <div className="summary-icon" style={{ backgroundColor: 'rgba(16, 185, 129, 0.1)' }}>
              <ListTodo size={24} color="#10b981" />
            </div>
            <div className="summary-content">
              <div className="summary-value">{stats.completedTasks}/{stats.totalTasks}</div>
              <div className="summary-label">Daily Tasks</div>
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="day-history-content">
          {/* Habits Section */}
          <div className="history-section">
            <h3 className="section-title">Habits</h3>
            {activeHabits.length === 0 ? (
              <p className="empty-message">No habits were active on this day</p>
            ) : (
              <div className="habits-list">
                {activeHabits.map(habit => {
                  const isCompleted = completions[habit.id]?.[dateStr] === 'completed';
                  const habitSubtasks = subtasks.filter(st => st.habitId === habit.id);
                  const habitDailyTasks = dayTasks.filter(t => t.habitId === habit.id);

                  return (
                    <div key={habit.id} className="habit-item">
                      <div 
                        className="habit-header clickable" 
                        onClick={() => toggleHabit(habit.id)}
                      >
                        <div className="habit-info">
                          {isCompleted ? (
                            <CheckCircle size={20} color="var(--neon-orange)" />
                          ) : (
                            <Circle size={20} color="var(--text-secondary)" />
                          )}
                          <span 
                            className="habit-color-dot" 
                            style={{ backgroundColor: habit.color }}
                          />
                          <span className={`habit-name ${isCompleted ? 'completed' : ''}`}>
                            {habit.name}
                          </span>
                        </div>
                        <div className="habit-meta">
                          {habit.category && (
                            <span className="habit-category">{habit.category}</span>
                          )}
                          {habit.timeAllocation && (
                            <span className="habit-time">{habit.timeAllocation}</span>
                          )}
                          <ChevronDown 
                            size={20} 
                            className={`expand-chevron ${expandedHabits[habit.id] ? 'expanded' : ''}`}
                          />
                        </div>
                      </div>

                      {/* Collapsible Content */}
                      {expandedHabits[habit.id] && (
                        <>
                          {/* Static Subtasks */}
                          {habitSubtasks.length > 0 && (
                            <div className="subtasks-container">
                              <div className="subtasks-header">Static Subtasks</div>
                              {habitSubtasks.map((subtask) => {
                                const subtaskCompleted = subtaskCompletions[habit.id]?.[dateStr]?.[subtask.id] === true;
                                return (
                                  <div key={subtask.id} className="subtask-item">
                                    {subtaskCompleted ? (
                                      <CheckCircle size={16} color="var(--accent-green)" />
                                    ) : (
                                      <Circle size={16} color="var(--text-secondary)" />
                                    )}
                                    <span className={`subtask-text ${subtaskCompleted ? 'completed' : ''}`}>
                                      {subtask.title}
                                    </span>
                                  </div>
                                );
                              })}
                            </div>
                          )}

                          {/* Daily Tasks */}
                          {habitDailyTasks.length > 0 && (
                            <div className="subtasks-container">
                              <div className="subtasks-header">Daily Tasks</div>
                              {habitDailyTasks.map((task) => (
                                <div key={task.id} className="subtask-item">
                                  {task.completed ? (
                                    <CheckCircle size={16} color="var(--accent-green)" />
                                  ) : (
                                    <Circle size={16} color="var(--text-secondary)" />
                                  )}
                                  <span className={`subtask-text ${task.completed ? 'completed' : ''}`}>
                                    {task.title}
                                  </span>
                                </div>
                              ))}
                            </div>
                          )}

                          {/* Notes Section */}
                          {hasNote(habit.id, dateStr) && (
                            <div className="notes-container">
                              <div className="notes-header">
                                <FileText size={16} />
                                <span>Note</span>
                              </div>
                              <div className="notes-content">
                                {getNote(habit.id, dateStr)}
                              </div>
                            </div>
                          )}
                        </>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Time by Category with Pie Chart */}
          {Object.keys(dayData.categoryTime).length > 0 && (
            <div className="history-section">
              <h3 className="section-title">Time Distribution</h3>
              
              <div className="distribution-container" style={{ display: 'flex', gap: '2rem', alignItems: 'center', flexWrap: 'wrap' }}>
                {/* Pie Chart */}
                <div className="pie-chart-container" style={{ position: 'relative', width: '200px', height: '200px' }}>
                  <svg width="200" height="200" viewBox="0 0 100 100" style={{ transform: 'rotate(-90deg)' }}>
                    {(() => {
                      let cumulativePercent = 0;
                      const total = dayData.totalTime;
                      return Object.entries(dayData.categoryTime)
                        .sort((a, b) => b[1] - a[1])
                        .map(([category, time], i) => {
                          const percent = time / total;
                          const startX = Math.cos(2 * Math.PI * cumulativePercent) * 50 + 50;
                          const startY = Math.sin(2 * Math.PI * cumulativePercent) * 50 + 50;
                          cumulativePercent += percent;
                          const endX = Math.cos(2 * Math.PI * cumulativePercent) * 50 + 50;
                          const endY = Math.sin(2 * Math.PI * cumulativePercent) * 50 + 50;
                          const largeArcFlag = percent > 0.5 ? 1 : 0;
                          
                          // Handle single category case (100%)
                          if (percent === 1) {
                            return (
                              <circle
                                key={category}
                                cx="50"
                                cy="50"
                                r="50"
                                fill={categoryColors[category] || '#6b7280'}
                              />
                            );
                          }

                          const pathData = [
                            `M 50 50`,
                            `L ${startX} ${startY}`,
                            `A 50 50 0 ${largeArcFlag} 1 ${endX} ${endY}`,
                            `Z`
                          ].join(' ');

                          return (
                            <path
                              key={category}
                              d={pathData}
                              fill={categoryColors[category] || '#6b7280'}
                              stroke="var(--bg-card)"
                              strokeWidth="1"
                            />
                          );
                        });
                    })()}
                    {/* Center hole for donut chart look */}
                    <circle cx="50" cy="50" r="35" fill="var(--bg-card)" />
                  </svg>
                  <div className="pie-center-text" style={{
                    position: 'absolute',
                    top: '50%',
                    left: '50%',
                    transform: 'translate(-50%, -50%)',
                    textAlign: 'center'
                  }}>
                    <div style={{ fontSize: '1.2rem', fontWeight: 'bold', color: 'var(--text-primary)' }}>
                      {formatTime(dayData.totalTime)}
                    </div>
                    <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Total</div>
                  </div>
                </div>

                {/* Legend / Breakdown */}
                <div className="category-breakdown" style={{ flex: 1, minWidth: '200px' }}>
                  {Object.entries(dayData.categoryTime)
                    .sort((a, b) => b[1] - a[1])
                    .map(([category, time]) => {
                      const percentage = (time / dayData.totalTime) * 100;
                      return (
                        <div key={category} className="category-item">
                          <div className="category-header">
                            <div className="category-info">
                              <span 
                                className="category-dot" 
                                style={{ backgroundColor: categoryColors[category] || '#6b7280' }}
                              />
                              <span className="category-name">{category}</span>
                            </div>
                            <span className="category-time">{formatTime(time)} ({Math.round(percentage)}%)</span>
                          </div>
                          <div className="category-bar-container">
                            <div 
                              className="category-bar" 
                              style={{ 
                                width: `${percentage}%`,
                                backgroundColor: categoryColors[category] || '#6b7280'
                              }}
                            />
                          </div>
                        </div>
                      );
                    })}
                </div>
              </div>
            </div>
          )}

          {/* Recent Sessions */}
          {dayData.laps.length > 0 && (
            <div className="history-section">
              <h3 className="section-title">Sessions ({dayData.laps.length})</h3>
              <div className="sessions-list">
                {dayData.laps.slice(0, 10).map((lap, idx) => (
                  <div key={idx} className="session-item">
                    <div className="session-info">
                      <span 
                        className="session-dot" 
                        style={{ backgroundColor: categoryColors[lap.category] || '#6b7280' }}
                      />
                      <span className="session-category">{lap.category || 'uncategorized'}</span>
                    </div>
                    <span className="session-time">{formatTime(lap.time || 0)}</span>
                  </div>
                ))}
                {dayData.laps.length > 10 && (
                  <p className="more-sessions">+ {dayData.laps.length - 10} more sessions</p>
                )}
              </div>
            </div>
          )}

          {/* Empty State */}
          {activeHabits.length === 0 && dayData.laps.length === 0 && dayTasks.length === 0 && (
            <div className="empty-state">
              <p>No activity recorded for this day</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
