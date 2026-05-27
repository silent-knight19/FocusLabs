import React from 'react';
import { Calendar, MoreVertical } from 'lucide-react';
import './styles/GoalCard.css';

const PROGRESS_RADIUS = 18;
const PROGRESS_CIRCUMFERENCE = 2 * Math.PI * PROGRESS_RADIUS;

/**
 * Calculate the number of days between two date strings
 * @param {string} dateStr - Target date in YYYY-MM-DD format
 * @returns {number} Days remaining (negative if overdue)
 */
function getDaysUntil(dateStr) {
  const target = new Date(dateStr + 'T00:00:00');
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return Math.ceil((target - today) / (1000 * 60 * 60 * 24));
}

/**
 * Format a deadline string for display
 * @param {string} dateStr - Date in YYYY-MM-DD format
 * @returns {string} Formatted date string
 */
function formatDeadline(dateStr) {
  const date = new Date(dateStr + 'T00:00:00');
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

/**
 * Convert a hex color to rgba
 * @param {string} hex - Hex color
 * @param {number} alpha - Alpha value
 * @returns {string} RGBA string
 */
function hexToRgba(hex, alpha = 0.12) {
  if (!hex) return `rgba(255, 90, 31, ${alpha})`;
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

/**
 * Individual goal card for the goals grid
 * @param {object} props
 * @param {object} props.goal - Goal data object
 * @param {number} props.progress - Progress percentage (0-100)
 * @param {function} props.onClick - Click handler to open detail
 * @param {function} props.onToggleSubGoal - Toggle sub-goal completion
 * @param {number} props.index - Card index for staggered animation
 */
export function GoalCard({ goal, progress, onClick, onToggleSubGoal, index = 0 }) {
  const daysLeft = getDaysUntil(goal.targetDate);
  const isOverdue = goal.status === 'active' && daysLeft < 0;
  const isNearDeadline = goal.status === 'active' && daysLeft >= 0 && daysLeft <= 7;
  const isCompleted = goal.status === 'completed';

  const subGoals = goal.subGoals || [];
  const previewSubGoals = subGoals.slice(0, 3);
  const remainingCount = subGoals.length - 3;

  const goalColor = goal.color || '#FF5A1F';
  const colorAlpha = hexToRgba(goalColor, 0.12);

  const cardClass = [
    'goal-card',
    isOverdue ? 'overdue' : '',
    isCompleted ? 'completed' : ''
  ].filter(Boolean).join(' ');

  /**
   * Handle sub-goal checkbox click without opening the detail modal
   */
  const handleSubGoalClick = (e, subGoalId) => {
    e.stopPropagation();
    if (onToggleSubGoal) {
      onToggleSubGoal(goal.id, subGoalId);
    }
  };

  /**
   * Build the deadline display text
   */
  const getDeadlineText = () => {
    if (isCompleted) return 'Completed';
    if (isOverdue) return `${Math.abs(daysLeft)}d overdue`;
    if (daysLeft === 0) return 'Due today';
    if (daysLeft === 1) return 'Due tomorrow';
    return formatDeadline(goal.targetDate);
  };

  const deadlineClass = [
    'goal-deadline',
    isOverdue ? 'overdue' : '',
    isNearDeadline ? 'near' : ''
  ].filter(Boolean).join(' ');

  return (
    <div
      className={cardClass}
      style={{ 
        '--goal-color': goalColor, 
        '--goal-color-alpha': colorAlpha,
        animationDelay: `${index * 0.08}s` 
      }}
      onClick={onClick}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => { if (e.key === 'Enter') onClick(); }}
    >
      {/* Inner wrapper for new design */}
      <div className="goal-card-inner">
        {/* Header */}
        <div className="goal-card-header">
          <h3 className="goal-card-title">{goal.title}</h3>
          <div className="goal-card-badges">
            <span className={`priority-badge ${goal.priority}`}>{goal.priority}</span>
            {isOverdue && <span className="overdue-badge">Overdue</span>}
            {isCompleted && <span className="completed-badge">Done</span>}
          </div>
        </div>

      {/* Description */}
      {goal.description && (
        <p className="goal-card-description">{goal.description}</p>
      )}

      {/* Progress */}
      <div className="goal-card-progress">
        <div className="goal-progress-ring-wrapper">
          <svg viewBox="0 0 80 80">
            <circle className="goal-progress-ring-bg" cx="40" cy="40" r={36} />
            <circle
              className="goal-progress-ring-fill"
              cx="40" cy="40" r={36}
              stroke={goalColor}
              strokeDasharray={2 * Math.PI * 36}
              strokeDashoffset={2 * Math.PI * 36 * (1 - progress / 100)}
            />
          </svg>
          <div className="goal-progress-text">
            <span className="goal-progress-pct">{progress}%</span>
          </div>
        </div>
      </div>

      {/* Sub-goals Preview */}
      {previewSubGoals.length > 0 && (
        <div className="goal-subgoals-preview">
          {previewSubGoals.map(sg => (
            <div key={sg.id} className="subgoal-preview-item">
              <button
                className={`subgoal-check ${sg.isCompleted ? 'checked' : ''}`}
                onClick={(e) => handleSubGoalClick(e, sg.id)}
                aria-label={`Toggle ${sg.title}`}
              >
                {sg.isCompleted ? '✓' : ''}
              </button>
              <span className={`subgoal-preview-title ${sg.isCompleted ? 'done' : ''}`}>
                {sg.title}
              </span>
            </div>
          ))}
          {remainingCount > 0 && (
            <span className="subgoal-more">+{remainingCount} more</span>
          )}
        </div>
      )}

      {/* Footer */}
      <div className="goal-card-footer">
        <span className="goal-category-tag">{goal.category}</span>
        <span className={deadlineClass}>
          <Calendar size={12} />
          {getDeadlineText()}
        </span>
      </div>
      
      </div> {/* End goal-card-inner */}
    </div>
  );
}
