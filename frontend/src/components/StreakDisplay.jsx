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
          const isStreakActive = currentStreak > 0;
          
          return (
            <div key={habit.id} className={`streak-item ${isStreakActive ? 'active-streak' : ''}`}>
              <div 
                className="streak-color-bar" 
                style={{ backgroundColor: habit.color }}
              />
              <div className="streak-info">
                <div className="streak-header-row">
                  <span className="streak-habit-name">{habit.name}</span>
                  {isStreakActive && (
                    <div className="streak-flame-container">
                      <span className="streak-flame">🔥</span>
                      <span className="streak-count">{currentStreak}</span>
                    </div>
                  )}
                </div>
                
                <div className="streak-stats">
                  <div className="streak-stat-pill">
                    <span className="streak-label">Current</span>
                    <span className="streak-value">{currentStreak} days</span>
                  </div>
                  <div className="streak-stat-pill best">
                    <span className="streak-label">Best</span>
                    <span className="streak-value">{longestStreak} days</span>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
