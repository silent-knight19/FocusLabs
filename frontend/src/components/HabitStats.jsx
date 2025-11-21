import React from 'react';
import './styles/HabitStats.css';

/**
 * Display habit statistics and performance metrics
 */
export function HabitStats({ habits, completions }) {
  const calculateStats = (habitId) => {
    const habitCompletions = completions[habitId] || {};
    const entries = Object.values(habitCompletions);
    const completed = entries.filter(status => status === 'completed').length;
    const total = entries.length;
    const rate = total > 0 ? Math.round((completed / total) * 100) : 0;
    
    return { completed, total, rate };
  };

  const getPerformanceBadge = (rate) => {
    if (rate >= 80) return { emoji: '🔥', label: 'On Fire', color: 'var(--neon-green)' };
    if (rate >= 60) return { emoji: '⭐', label: 'Great', color: 'var(--neon-cyan)' };
    if (rate >= 40) return { emoji: '📈', label: 'Good', color: 'var(--neon-yellow)' };
    if (rate >= 20) return { emoji: '🌱', label: 'Growing', color: 'var(--neon-blue)' };
    return { emoji: '🎯', label: 'Start', color: 'var(--text-tertiary)' };
  };

  if (habits.length === 0) return null;

  return (
    <div className="habit-stats-container">
      <h3>📊 Statistics</h3>
      <div className="stats-list">
        {habits.map(habit => {
          const stats = calculateStats(habit.id);
          const badge = getPerformanceBadge(stats.rate);
          
          return (
            <div key={habit.id} className="stat-item">
              <div className="stat-header">
                <div 
                  className="stat-color-indicator"
                  style={{ backgroundColor: habit.color }}
                />
                <span className="stat-habit-name">{habit.name}</span>
                <div className="stat-badge" style={{ color: badge.color }}>
                  <span>{badge.emoji}</span>
                  <span className="badge-label">{badge.label}</span>
                </div>
              </div>
              
              <div className="stat-details">
                <div className="stat-metric">
                  <span className="metric-label">Completion Rate:</span>
                  <span className="metric-value">{stats.rate}%</span>
                </div>
                <div className="stat-metric">
                  <span className="metric-label">Completed:</span>
                  <span className="metric-value">{stats.completed} / {stats.total}</span>
                </div>
              </div>
              
              <div className="stat-progress-bar">
                <div
                  className="stat-progress-fill"
                  style={{
                    width: `${stats.rate}%`,
                    backgroundColor: badge.color
                  }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
