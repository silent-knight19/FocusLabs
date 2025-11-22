import React, { useMemo } from 'react';
import { X, CheckCircle, Circle, Clock, TrendingUp, Target } from 'lucide-react';
import './styles/DayHistoryModal.css';

/**
 * Detailed history view for a specific date
 * Shows habits, subtasks, time spent by category, and statistics
 */
export function DayHistoryModal({ date, habits, completions, onClose }) {
  const dateStr = date.toISOString().split('T')[0];
  const dayCompletions = completions[dateStr] || {};

  // Get all lap data for this day
  const dayData = useMemo(() => {
    try {
      const lapHistory = JSON.parse(localStorage.getItem('habitgrid_lap_history') || '[]');
      const dayLaps = lapHistory.filter(lap => {
        const lapDateKey = lap.date ? lap.date.split('T')[0] : null;
        return lapDateKey === dateStr;
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
      const created = new Date(h.createdAt);
      return created <= date;
    });
  }, [habits, date]);

  // Calculate completion stats
  const stats = useMemo(() => {
    const completed = activeHabits.filter(h => dayCompletions[h.id]).length;
    const total = activeHabits.length;
    const percentage = total > 0 ? (completed / total) * 100 : 0;

    return { completed, total, percentage };
  }, [activeHabits, dayCompletions]);

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
            <X size={24} />
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
              <TrendingUp size={24} color="#10b981" />
            </div>
            <div className="summary-content">
              <div className="summary-value">{dayData.lapCount}</div>
              <div className="summary-label">Sessions</div>
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
                  const isCompleted = dayCompletions[habit.id];
                  const habitData = isCompleted ? dayCompletions[habit.id] : null;

                  return (
                    <div key={habit.id} className="habit-item">
                      <div className="habit-header">
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
                        {habit.timeAllocation && (
                          <span className="habit-time">{habit.timeAllocation}</span>
                        )}
                      </div>

                      {/* Subtasks */}
                      {habit.subtasks && habit.subtasks.length > 0 && (
                        <div className="subtasks-container">
                          {habit.subtasks.map((subtask, idx) => {
                            const subtaskCompleted = habitData?.subtasks?.[idx];
                            return (
                              <div key={idx} className="subtask-item">
                                {subtaskCompleted ? (
                                  <CheckCircle size={16} color="var(--neon-orange)" />
                                ) : (
                                  <Circle size={16} color="var(--text-secondary)" />
                                )}
                                <span className={`subtask-text ${subtaskCompleted ? 'completed' : ''}`}>
                                  {subtask}
                                </span>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Time by Category */}
          {Object.keys(dayData.categoryTime).length > 0 && (
            <div className="history-section">
              <h3 className="section-title">Time by Category</h3>
              <div className="category-breakdown">
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
                          <span className="category-time">{formatTime(time)}</span>
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
          {activeHabits.length === 0 && dayData.laps.length === 0 && (
            <div className="empty-state">
              <p>No activity recorded for this day</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
