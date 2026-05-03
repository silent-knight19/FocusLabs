import React, { useState, useRef, useCallback } from 'react';
import { Target, ChevronLeft, ChevronRight, ExternalLink } from 'lucide-react';
import './styles/GoalsCarousel.css';

const RING_RADIUS = 46;
const RING_CIRCUMFERENCE = 2 * Math.PI * RING_RADIUS;
const SWIPE_THRESHOLD = 50;

/**
 * Calculate days until a target date
 * @param {string} dateStr - Target date (YYYY-MM-DD)
 * @returns {number} Days remaining (negative if overdue)
 */
function getDaysUntil(dateStr) {
  const target = new Date(dateStr + 'T00:00:00');
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return Math.ceil((target - today) / (1000 * 60 * 60 * 24));
}

/**
 * Format a date for compact display
 * @param {string} dateStr - Date string (YYYY-MM-DD)
 * @returns {string} Formatted date
 */
function formatDate(dateStr) {
  const date = new Date(dateStr + 'T00:00:00');
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

/**
 * Calculate what percentage of the timeline has elapsed
 * @param {string} startDate - Start date (YYYY-MM-DD)
 * @param {string} targetDate - Target date (YYYY-MM-DD)
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
 * Convert a hex color to rgba
 * @param {string} hex - Hex color
 * @param {number} alpha - Alpha value
 * @returns {string} RGBA string
 */
function hexToRgba(hex, alpha = 0.12) {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

/**
 * Instagram-style swipeable goals carousel — premium design
 * Shows active goals as rich cards with progress rings, timelines, and countdowns
 *
 * @param {object} props
 * @param {object[]} props.goals - Array of goal objects
 * @param {function} props.getGoalProgress - Function to get progress % by ID
 * @param {function} props.onOpenGoal - Handler when a goal card is clicked
 * @param {function} props.onViewAll - Handler to open full goals dashboard
 */
export function GoalsCarousel({ goals, getGoalProgress, onOpenGoal, onViewAll }) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const touchStartX = useRef(0);
  const touchDeltaX = useRef(0);

  const activeGoals = goals.filter(g => g.status === 'active');
  if (activeGoals.length === 0) return null;

  const totalSlides = activeGoals.length;

  /** Navigate to a specific slide */
  const goToSlide = useCallback((index) => {
    setCurrentIndex(Math.max(0, Math.min(index, totalSlides - 1)));
  }, [totalSlides]);

  const goNext = () => goToSlide(currentIndex + 1);
  const goPrev = () => goToSlide(currentIndex - 1);

  const handleDragStart = (clientX) => { touchStartX.current = clientX; touchDeltaX.current = 0; };
  const handleDragMove = (clientX) => { touchDeltaX.current = clientX - touchStartX.current; };
  const handleDragEnd = () => {
    if (touchDeltaX.current > SWIPE_THRESHOLD) goPrev();
    else if (touchDeltaX.current < -SWIPE_THRESHOLD) goNext();
    touchDeltaX.current = 0;
  };

  /**
   * Get the countdown display for a goal
   * @param {number} daysLeft - Days remaining
   * @returns {{ value: string, label: string }}
   */
  const getCountdown = (daysLeft) => {
    if (daysLeft < 0) return { value: Math.abs(daysLeft), label: 'days over' };
    if (daysLeft === 0) return { value: '!', label: 'today' };
    if (daysLeft === 1) return { value: '1', label: 'day left' };
    return { value: daysLeft, label: daysLeft <= 7 ? 'days left' : 'days' };
  };

  /**
   * Get timeline status class
   */
  const getTimelineStatus = (timePercent, isOverdue) => {
    if (isOverdue) return 'overdue';
    if (timePercent > 75) return 'at-risk';
    return 'on-track';
  };

  return (
    <div className="goals-carousel-container">
      {/* Header */}
      <div className="goals-carousel-header">
        <div className="goals-carousel-title">
          <Target size={18} />
          <h3>Your Goals</h3>
          <span className="goals-carousel-count">{activeGoals.length}</span>
        </div>
        <button className="view-all-goals-btn" onClick={onViewAll}>
          View All <ExternalLink size={12} />
        </button>
      </div>

      {/* Carousel Viewport */}
      <div
        className="goals-carousel-viewport"
        onTouchStart={(e) => handleDragStart(e.touches[0].clientX)}
        onTouchMove={(e) => handleDragMove(e.touches[0].clientX)}
        onTouchEnd={handleDragEnd}
        onMouseDown={(e) => { e.preventDefault(); handleDragStart(e.clientX); }}
        onMouseMove={(e) => { if (e.buttons === 1) handleDragMove(e.clientX); }}
        onMouseUp={handleDragEnd}
        onMouseLeave={handleDragEnd}
      >
        <div
          className="goals-carousel-track"
          style={{ transform: `translateX(-${currentIndex * 100}%)` }}
        >
          {activeGoals.map((goal) => {
            const progress = getGoalProgress(goal.id);
            const subGoals = goal.subGoals || [];
            const previewSG = subGoals.slice(0, 4);
            const daysLeft = getDaysUntil(goal.targetDate);
            const isOverdue = daysLeft < 0;
            const isNear = daysLeft >= 0 && daysLeft <= 7;
            const dashOffset = RING_CIRCUMFERENCE * (1 - progress / 100);
            const timePercent = getTimelineProgress(goal.startDate, goal.targetDate);
            const countdown = getCountdown(daysLeft);
            const goalColor = goal.color || '#FF5A1F';
            const colorAlpha = hexToRgba(goalColor, 0.12);

            return (
              <div key={goal.id} className="goals-carousel-slide">
                <div
                  className={`carousel-goal-card ${isOverdue ? 'overdue' : ''}`}
                  style={{
                    '--goal-color': goalColor,
                    '--goal-color-alpha': colorAlpha
                  }}
                  onClick={() => onOpenGoal(goal)}
                >
                  <div className="carousel-card-inner">
                    {/* Top: Title + Countdown */}
                    <div className="carousel-card-top">
                      <div className="carousel-card-info">
                        <h4 className="carousel-card-title">{goal.title}</h4>
                        <div className="carousel-card-meta">
                          <span className="carousel-category">{goal.category}</span>
                          <span className={`carousel-priority ${goal.priority}`}>{goal.priority}</span>
                        </div>
                      </div>
                      <div className="carousel-countdown">
                        <span className={`countdown-value ${isOverdue ? 'overdue' : ''} ${isNear ? 'near' : ''}`}>
                          {countdown.value}
                        </span>
                        <span className="countdown-label">{countdown.label}</span>
                      </div>
                    </div>

                    {/* Center: Progress Ring + Sub-goals */}
                    <div className="carousel-progress-hero">
                      <div className="carousel-ring-wrapper">
                        <svg viewBox="0 0 100 100">
                          <circle className="carousel-ring-bg" cx="50" cy="50" r={RING_RADIUS} />
                          <circle
                            className="carousel-ring-fill"
                            cx="50" cy="50" r={RING_RADIUS}
                            stroke={goalColor}
                            strokeDasharray={RING_CIRCUMFERENCE}
                            strokeDashoffset={dashOffset}
                          />
                        </svg>
                        <div className="carousel-ring-text">
                          <span className="carousel-ring-pct">{progress}%</span>
                          <span className="carousel-ring-label">Done</span>
                        </div>
                      </div>

                      {subGoals.length > 0 ? (
                        <div className="carousel-subgoals">
                          {previewSG.map(sg => (
                            <div key={sg.id} className="carousel-subgoal-item">
                              <span className={`carousel-subgoal-dot ${sg.isCompleted ? 'done' : ''}`} />
                              <span className={`carousel-subgoal-text ${sg.isCompleted ? 'done' : ''}`}>
                                {sg.title}
                              </span>
                            </div>
                          ))}
                          {subGoals.length > 4 && (
                            <span className="carousel-subgoals-more">+{subGoals.length - 4} more</span>
                          )}
                        </div>
                      ) : (
                        <div className="carousel-subgoals-empty">
                          <span className="carousel-subgoals-empty-icon">🎯</span>
                          <span className="carousel-subgoals-empty-text">
                            Tap to add sub-goals and track progress
                          </span>
                        </div>
                      )}
                    </div>

                    {/* Bottom: Timeline */}
                    <div className="carousel-card-footer">
                      <div className="carousel-timeline">
                        <div className="carousel-timeline-dates">
                          <span>{formatDate(goal.startDate)}</span>
                          <span>{formatDate(goal.targetDate)}</span>
                        </div>
                        <div className="carousel-timeline-bar">
                          <div
                            className={`carousel-timeline-fill ${getTimelineStatus(timePercent, isOverdue)}`}
                            style={{ width: `${Math.min(timePercent, 100)}%` }}
                          />
                        </div>
                        <span className="carousel-timeline-label">
                          {isOverdue
                            ? `${Math.abs(daysLeft)} days past deadline`
                            : `${timePercent}% of time elapsed`}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Navigation */}
      {totalSlides > 1 && (
        <div className="goals-carousel-nav">
          <button className="carousel-arrow" onClick={goPrev} disabled={currentIndex === 0} aria-label="Previous">
            <ChevronLeft size={16} />
          </button>
          <div className="carousel-dots">
            {activeGoals.map((_, i) => (
              <button
                key={i}
                className={`carousel-dot ${i === currentIndex ? 'active' : ''}`}
                onClick={() => goToSlide(i)}
                aria-label={`Go to goal ${i + 1}`}
              />
            ))}
          </div>
          <button className="carousel-arrow" onClick={goNext} disabled={currentIndex === totalSlides - 1} aria-label="Next">
            <ChevronRight size={16} />
          </button>
        </div>
      )}
    </div>
  );
}
