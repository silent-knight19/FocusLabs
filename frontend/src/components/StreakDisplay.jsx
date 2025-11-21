import React from 'react';
import './styles/StreakDisplay.css';

/**
 * Display habit streaks
 */
export function StreakDisplay({ habits, getCurrentStreak, getLongestStreak }) {
  if (habits.length === 0) {
    return null;
  }

  return (
    <div className="streak-display-container">
      <h3>🔥 Streaks</h3>
      
      <div className="streak-list">
        {habits.map(habit => {
          const currentStreak = getCurrentStreak(habit.id);
          const longestStreak = getLongestStreak(habit.id);
          
          return (
            <div key={habit.id} className="streak-item">
              <div 
                className="streak-color-bar" 
                style={{ backgroundColor: habit.color }}
              />
              <div className="streak-info">
                <div className="streak-habit-name">{habit.name}</div>
                <div className="streak-stats">
                  <span className="streak-stat">
                    <span className="streak-label">Current:</span>
                    <span className="streak-value">{currentStreak} days</span>
                  </span>
                  <span className="streak-divider">•</span>
                  <span className="streak-stat">
                    <span className="streak-label">Best:</span>
                    <span className="streak-value">{longestStreak} days</span>
                  </span>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
