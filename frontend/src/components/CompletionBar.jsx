import React from 'react';
import './styles/CompletionBar.css';

/**
 * Shows daily completion percentage as a progress bar
 */
export function CompletionBar({ percentage, totalHabits, completedHabits }) {
  const getBarColor = () => {
    if (percentage >= 80) return 'var(--accent-green)';
    if (percentage >= 50) return 'var(--accent-yellow)';
    return 'var(--accent-red)';
  };

  return (
    <div className="completion-bar-container">
      <div className="completion-bar-header">
        <h3>Today's Progress</h3>
        <span className="completion-stats">
          {completedHabits} / {totalHabits} habits
        </span>
      </div>
      
      <div className="progress-bar-wrapper">
        <div className="progress-bar-background">
          <div
            className="progress-bar-fill"
            style={{
              width: `${percentage}%`,
              backgroundColor: getBarColor()
            }}
          >
            {percentage > 0 && (
              <span className="progress-percentage">{percentage}%</span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
