import React, { useState } from 'react';
import { ArrowLeft, Trash2, Archive, CheckCircle2, Edit2, Calendar, X } from 'lucide-react';
import { useLockBodyScroll } from '../hooks/useLockBodyScroll';
import './styles/GoalDetailModal.css';

const RING_RADIUS = 40;
const RING_CIRCUMFERENCE = 2 * Math.PI * RING_RADIUS;

/**
 * Calculate what percentage of the timeline has elapsed
 * @param {string} startDate - Start date string (YYYY-MM-DD)
 * @param {string} targetDate - Target date string (YYYY-MM-DD)
 * @returns {number} Percentage elapsed (0-100, clamped)
 */
function getTimelineProgress(startDate, targetDate) {
  const start = new Date(startDate + 'T00:00:00');
  const end = new Date(targetDate + 'T00:00:00');
  const now = new Date();
  now.setHours(0, 0, 0, 0);

  const totalDays = (end - start) / (1000 * 60 * 60 * 24);
  if (totalDays <= 0) return 100;

  const elapsed = (now - start) / (1000 * 60 * 60 * 24);
  return Math.min(100, Math.max(0, Math.round((elapsed / totalDays) * 100)));
}

/**
 * Format a date string for display
 * @param {string} dateStr - Date in YYYY-MM-DD or ISO format
 * @returns {string} Formatted date
 */
function formatDate(dateStr) {
  if (!dateStr) return 'N/A';
  const date = new Date(dateStr.includes('T') ? dateStr : dateStr + 'T00:00:00');
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

/**
 * Full detail modal for viewing/managing a goal
 * @param {object} props
 * @param {object} props.goal - Goal data object
 * @param {number} props.progress - Progress percentage
 * @param {function} props.onClose - Close handler
 * @param {function} props.onEdit - Edit handler
 * @param {function} props.onComplete - Complete goal handler
 * @param {function} props.onArchive - Archive goal handler
 * @param {function} props.onDelete - Delete goal handler
 * @param {function} props.onToggleSubGoal - Toggle sub-goal handler
 * @param {function} props.onAddSubGoal - Add sub-goal handler
 * @param {function} props.onDeleteSubGoal - Delete sub-goal handler
 */
export function GoalDetailModal({
  goal,
  progress,
  onClose,
  onEdit,
  onComplete,
  onArchive,
  onDelete,
  onToggleSubGoal,
  onAddSubGoal,
  onDeleteSubGoal
}) {
  useLockBodyScroll(true);
  const [newSubGoalTitle, setNewSubGoalTitle] = useState('');

  if (!goal) return null;

  const subGoals = goal.subGoals || [];
  const completedCount = subGoals.filter(sg => sg.isCompleted).length;
  const dashOffset = RING_CIRCUMFERENCE * (1 - progress / 100);
  const timelinePercent = getTimelineProgress(goal.startDate, goal.targetDate);
  const today = new Date().toISOString().split('T')[0];
  const isOverdue = goal.status === 'active' && goal.targetDate < today;
  const isActive = goal.status === 'active';

  /**
   * Determine timeline status for styling
   */
  const getTimelineStatus = () => {
    if (isOverdue) return 'overdue';
    if (timelinePercent > 75) return 'at-risk';
    return 'on-track';
  };

  /**
   * Handle adding a new sub-goal
   */
  const handleAddSubGoal = () => {
    const title = newSubGoalTitle.trim();
    if (!title) return;
    onAddSubGoal(goal.id, { title });
    setNewSubGoalTitle('');
  };

  /**
   * Handle Enter key in sub-goal input
   */
  const handleKeyDown = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleAddSubGoal();
    }
  };

  return (
    <div className="goal-detail-overlay" onClick={onClose}>
      <div className="goal-detail-content" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="goal-detail-header" style={{ '--goal-color': goal.color }}>
          <button className="goal-detail-back" onClick={onClose} aria-label="Close">
            <ArrowLeft size={18} />
          </button>
          <h2 className="goal-detail-title">{goal.title}</h2>
          {isActive && (
            <button className="goal-detail-edit-btn" onClick={() => onEdit(goal)}>
              <Edit2 size={14} />
            </button>
          )}
        </div>

        {/* Body */}
        <div className="goal-detail-body">
          {/* Progress + Meta */}
          <div className="goal-detail-progress-row">
            <div className="goal-detail-ring">
              <svg viewBox="0 0 90 90">
                <circle className="goal-detail-ring-bg" cx="45" cy="45" r={RING_RADIUS} />
                <circle
                  className="goal-detail-ring-fill"
                  cx="45" cy="45" r={RING_RADIUS}
                  stroke={goal.color || 'var(--accent-primary)'}
                  strokeDasharray={RING_CIRCUMFERENCE}
                  strokeDashoffset={dashOffset}
                />
              </svg>
              <div className="goal-detail-ring-text">
                <span className="goal-detail-ring-pct">{progress}%</span>
                <span className="goal-detail-ring-label">Progress</span>
              </div>
            </div>

            <div className="goal-detail-meta">
              <div className="goal-meta-item">
                <span className="goal-meta-label">Category</span>
                <span className="goal-meta-value">{goal.category}</span>
              </div>
              <div className="goal-meta-item">
                <span className="goal-meta-label">Priority</span>
                <span className="goal-meta-value">{goal.priority}</span>
              </div>
              <div className="goal-meta-item">
                <span className="goal-meta-label">Status</span>
                <span className={`goal-meta-value ${isOverdue ? 'overdue' : ''}`}>
                  {isOverdue ? 'Overdue' : goal.status}
                </span>
              </div>
              {goal.completedAt && (
                <div className="goal-meta-item">
                  <span className="goal-meta-label">Completed</span>
                  <span className="goal-meta-value">{formatDate(goal.completedAt)}</span>
                </div>
              )}
            </div>
          </div>

          {/* Timeline */}
          <div className="goal-detail-timeline">
            <div className="timeline-header">
              <span>{formatDate(goal.startDate)}</span>
              <span>{formatDate(goal.targetDate)}</span>
            </div>
            <div className="timeline-bar">
              <div
                className={`timeline-fill ${getTimelineStatus()}`}
                style={{ width: `${timelinePercent}%` }}
              />
            </div>
            <div className="timeline-marker">
              {isOverdue
                ? 'Past deadline'
                : `${timelinePercent}% of time elapsed`
              }
            </div>
          </div>

          {/* Sub-goals */}
          <div className="goal-detail-subgoals">
            <h3>
              Sub-goals
              {subGoals.length > 0 && (
                <span className="subgoal-count-badge">
                  {completedCount}/{subGoals.length}
                </span>
              )}
            </h3>

            {subGoals.length > 0 ? (
              <div className="subgoals-list">
                {subGoals
                  .sort((a, b) => a.order - b.order)
                  .map(sg => {
                    const sgOverdue = sg.dueDate && sg.dueDate < today && !sg.isCompleted;
                    return (
                      <div key={sg.id} className={`subgoal-item ${sg.isCompleted ? 'completed' : ''}`}>
                        <button
                          className={`subgoal-checkbox ${sg.isCompleted ? 'checked' : ''}`}
                          onClick={() => onToggleSubGoal(goal.id, sg.id)}
                          aria-label={`Toggle ${sg.title}`}
                        >
                          {sg.isCompleted ? '✓' : ''}
                        </button>
                        <div className="subgoal-content">
                          <span className="subgoal-title">{sg.title}</span>
                          {sg.dueDate && (
                            <span className={`subgoal-due ${sgOverdue ? 'overdue' : ''}`}>
                              <Calendar size={10} /> Due: {formatDate(sg.dueDate)}
                            </span>
                          )}
                          {sg.isCompleted && sg.completedAt && (
                            <span className="subgoal-due">
                              Done {formatDate(sg.completedAt)}
                            </span>
                          )}
                        </div>
                        <button
                          className="subgoal-delete-btn"
                          onClick={() => onDeleteSubGoal(goal.id, sg.id)}
                          aria-label={`Delete ${sg.title}`}
                        >
                          <X size={14} />
                        </button>
                      </div>
                    );
                  })}
              </div>
            ) : (
              <p style={{ color: 'var(--text-tertiary)', fontSize: '0.85rem', margin: '0 0 var(--spacing-sm)' }}>
                Break this goal into smaller steps to track progress.
              </p>
            )}

            {/* Add sub-goal */}
            {isActive && (
              <div className="add-subgoal-section">
                <input
                  type="text"
                  value={newSubGoalTitle}
                  onChange={(e) => setNewSubGoalTitle(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="Add a sub-goal..."
                />
                <button
                  type="button"
                  className="add-subgoal-submit"
                  onClick={handleAddSubGoal}
                >
                  + Add
                </button>
              </div>
            )}
          </div>

          {/* Description */}
          {goal.description && (
            <div className="goal-detail-description">
              <h3>Description</h3>
              <p>{goal.description}</p>
            </div>
          )}

          {/* Actions */}
          {isActive && (
            <div className="goal-detail-actions">
              <button className="goal-action-btn complete" onClick={() => onComplete(goal.id)}>
                <CheckCircle2 size={16} />
                Complete Goal
              </button>
              <button className="goal-action-btn archive" onClick={() => onArchive(goal.id)}>
                <Archive size={16} />
                Archive
              </button>
              <button className="goal-action-btn delete" onClick={() => onDelete(goal.id)}>
                <Trash2 size={16} />
                Delete
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
