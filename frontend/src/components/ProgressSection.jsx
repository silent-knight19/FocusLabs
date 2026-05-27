import React, { useState, useMemo } from 'react';
import { TrendingUp, Target, Flame, Calendar, AlertTriangle, CheckCircle2, ChevronDown, ChevronUp } from 'lucide-react';
import { getToday, formatDateKey } from '../utils/dateHelpers';
import { useAnalytics } from '../hooks/useAnalytics';
import { ConcentricPieChart } from './ConcentricPieChart';
import './styles/ProgressSectionRedesigned.css';

// Get last completion date for a habit
const getLastCompletionDate = (habitId, completions) => {
  const habitCompletions = completions[habitId] || {};
  const completedDates = Object.keys(habitCompletions)
    .filter(date => habitCompletions[date] === 'completed')
    .sort((a, b) => {
      // Parse as local dates (YYYY-MM-DD) to avoid UTC midnight offset issues.
      // String comparison is safe here since format is always YYYY-MM-DD.
      return b.localeCompare(a);
    });
  return completedDates[0] || null;
};

// Calculate days since last completion
const getDaysSinceLastCompletion = (lastDate) => {
  if (!lastDate) return Infinity;

  // Parse lastDate (a YYYY-MM-DD string) as LOCAL midnight, not UTC midnight.
  // Using `new Date('YYYY-MM-DD')` would parse as UTC, which causes the
  // day boundary to shift in non-UTC timezones — leading to early "Streak Lost" warnings.
  const [year, month, day] = lastDate.split('-').map(Number);
  const last = new Date(year, month - 1, day); // local midnight

  const today = new Date();
  today.setHours(0, 0, 0, 0); // local midnight for today

  const diffMs = today - last;
  return Math.floor(diffMs / (1000 * 60 * 60 * 24));
};

// Get streak status
const getStreakStatus = (current, lastDate, todayKey) => {
  const lastCompletedToday = lastDate === todayKey;
  const daysSince = getDaysSinceLastCompletion(lastDate);
  
  if (current === 0) return { type: 'broken', label: 'Start Fresh', color: '#6B7280' };
  if (lastCompletedToday) return { type: 'active', label: 'On Fire!', color: '#22D3A6' };
  if (daysSince === 1) return { type: 'at-risk', label: 'At Risk', color: '#FBBF24' };
  return { type: 'broken', label: 'Streak Lost', color: '#F87171' };
};

/**
 * Redesigned progress section with beautiful circular visualizations
 * Now includes custom habit stats in today's progress
 */
export function ProgressSection({
  habits,
  getCurrentStreak,
  getLongestStreak,
  completions,
  customHabits = [],
  customCompletions = {},
  onOpenAnalytics,
  onToggleCompletion
}) {
  // Calculate today's statistics (regular + custom habits)
  const today = getToday();
  const todayKey = formatDateKey(today);
  
  // Regular habits completed today
  const completedRegularToday = habits.filter(
    habit => completions[habit.id]?.[todayKey] === 'completed'
  ).length;
  
  // Custom habits that apply today
  const customHabitsForToday = customHabits.filter(habit => 
    todayKey >= habit.dateFrom && todayKey <= habit.dateTo
  );
  const completedCustomToday = customHabitsForToday.filter(
    habit => customCompletions[habit.id]?.[todayKey] === 'completed'
  ).length;
  
  // Combined totals
  const totalHabits = habits.length + customHabitsForToday.length;
  const completedToday = completedRegularToday + completedCustomToday;
  const todayPercentage = totalHabits > 0 
    ? Math.round((completedToday / totalHabits) * 100)
    : 0;

  // Focus hours analytics – 10 day averages for study / productive / self-growth
  const { getChartData } = useAnalytics();

  const getLast10DayAverage = (categoryId) => {
    const data = getChartData(categoryId, 'month');
    if (!data || data.length === 0) return 0;
    const lastTen = data.slice(-10);
    const daysCount = lastTen.length || 1;
    const totalHours = lastTen.reduce((sum, d) => sum + (d.hours || 0), 0);
    return totalHours / daysCount;
  };

  const focusAverages = {
    study: parseFloat(getLast10DayAverage('study').toFixed(1)),
    productive: parseFloat(getLast10DayAverage('prod').toFixed(1)),
    selfGrowth: parseFloat(getLast10DayAverage('self').toFixed(1))
  };

  const [showAllStreaks, setShowAllStreaks] = useState(false);
  const [expandedHabit, setExpandedHabit] = useState(null);

  // Get streaks for each habit with enhanced data
  const habitStreaks = useMemo(() => {
    const localToday = getToday();
    const localTodayKey = formatDateKey(localToday);

    return habits.map(habit => {
      const current = getCurrentStreak(habit.id);
      const best = getLongestStreak(habit.id);
      const lastDate = getLastCompletionDate(habit.id, completions);
      const status = getStreakStatus(current, lastDate, localTodayKey);
      const isCompletedToday = completions[habit.id]?.[localTodayKey] === 'completed';

      return {
        id: habit.id,
        name: habit.name,
        color: habit.color,
        current,
        best,
        lastDate,
        status,
        isCompletedToday,
        daysSince: getDaysSinceLastCompletion(lastDate)
      };
    }).sort((a, b) => {
      // Sort: Active streaks first, then by streak length
      if (a.status.type === 'active' && b.status.type !== 'active') return -1;
      if (b.status.type === 'active' && a.status.type !== 'active') return 1;
      if (a.status.type === 'at-risk' && b.status.type === 'broken') return -1;
      if (b.status.type === 'at-risk' && a.status.type === 'broken') return 1;
      return b.current - a.current;
    });
  }, [habits, completions, getCurrentStreak, getLongestStreak]);

  const activeStreaks = habitStreaks.filter(h => h.status.type === 'active').length;
  const atRiskStreaks = habitStreaks.filter(h => h.status.type === 'at-risk').length;
  const displayStreaks = showAllStreaks ? habitStreaks : habitStreaks.slice(0, 5);

  return (
    <section className="progress-section-redesigned card-3d-wrapper">
      <div className="progress-header">
        <h2>Today's Progress</h2>
        <span className="progress-count">{completedToday} / {totalHabits} habits</span>
      </div>

      <div className="progress-main-grid">
        {/* Today's Progress - Circular */}
        <div className="progress-card today-card glass-3d hover-lift-3d">
          <div className="card-header">
            <Target size={20} />
            <h3>Today's Progress</h3>
          </div>
          <div className="circular-progress-container">
            <svg className="circular-progress" viewBox="0 0 200 200">
              <defs>
                <linearGradient id="progressGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#FF7A59" />
                  <stop offset="100%" stopColor="#F59E0B" />
                </linearGradient>
              </defs>
              {/* Background circle */}
              <circle
                cx="100"
                cy="100"
                r="85"
                fill="none"
                stroke="rgba(255, 255, 255, 0.05)"
                strokeWidth="12"
              />
              {/* Progress circle */}
              <circle
                cx="100"
                cy="100"
                r="85"
                fill="none"
                stroke="url(#progressGradient)"
                strokeWidth="12"
                strokeLinecap="round"
                strokeDasharray={`${2 * Math.PI * 85}`}
                strokeDashoffset={`${2 * Math.PI * 85 * (1 - todayPercentage / 100)}`}
                transform="rotate(-90 100 100)"
                className="progress-ring"
              />
            </svg>
            <div className="progress-center-text">
              <span className="progress-percentage">{todayPercentage}%</span>
              <span className="progress-label">Complete</span>
            </div>
          </div>
        </div>

        {/* Focus Hours - 10 Day Average (Concentric Pie) */}
        <div
          className="progress-card weekly-card glass-3d hover-lift-3d"
          onClick={onOpenAnalytics}
          role={onOpenAnalytics ? 'button' : undefined}
          tabIndex={onOpenAnalytics ? 0 : undefined}
        >
          <div className="card-header">
            <Calendar size={20} />
            <h3>Session Analytics (10-Day Average)</h3>
          </div>
          <div className="circular-progress-container">
            <ConcentricPieChart data={focusAverages} />
          </div>
          <div className="week-mini-bars">
            <div className="mini-bar-container">
              <span className="mini-bar-label">Study</span>
              <span className="mini-bar-value">{focusAverages.study}h/day</span>
            </div>
            <div className="mini-bar-container">
              <span className="mini-bar-label">Productive</span>
              <span className="mini-bar-value">{focusAverages.productive}h/day</span>
            </div>
            <div className="mini-bar-container">
              <span className="mini-bar-label">Self-Growth</span>
              <span className="mini-bar-value">{focusAverages.selfGrowth}h/day</span>
            </div>
          </div>
        </div>

        {/* Enhanced Streaks Section */}
        <div className="progress-card streaks-card glass-3d hover-lift-3d">
          <div className="card-header">
            <div className="streaks-header-left">
              <Flame size={20} />
              <h3>Streaks</h3>
              <span className="streaks-summary">
                {activeStreaks > 0 && (
                  <span className="streak-badge active">{activeStreaks} Active</span>
                )}
                {atRiskStreaks > 0 && (
                  <span className="streak-badge at-risk">{atRiskStreaks} At Risk</span>
                )}
              </span>
            </div>
            {habitStreaks.length > 5 && (
              <button 
                className="show-all-btn"
                onClick={() => setShowAllStreaks(!showAllStreaks)}
              >
                {showAllStreaks ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                {showAllStreaks ? 'Show Less' : `Show All (${habitStreaks.length})`}
              </button>
            )}
          </div>
          <div className={`streaks-list ${showAllStreaks ? 'expanded' : ''}`}>
            {displayStreaks.length === 0 ? (
              <div className="streak-empty-state" style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-secondary)', opacity: 0.6 }}>
                <Flame size={32} style={{ marginBottom: '0.75rem', opacity: 0.4 }} />
                <p style={{ margin: 0, fontSize: '0.9rem' }}>No habits yet</p>
                <p style={{ margin: '0.5rem 0 0 0', fontSize: '0.75rem' }}>Add habits to start tracking streaks!</p>
              </div>
            ) : (
              displayStreaks.map((habit) => (
                <div
                  key={habit.id}
                  className={`streak-item ${habit.status.type} ${expandedHabit === habit.id ? 'expanded' : ''}`}
                  onClick={() => setExpandedHabit(expandedHabit === habit.id ? null : habit.id)}
                >
                <div className="streak-main">
                  <div className="streak-info">
                    <div 
                      className="streak-color-dot" 
                      style={{ 
                        backgroundColor: habit.color,
                        boxShadow: `0 0 10px ${habit.color}, 0 0 20px ${habit.color}`
                      }}
                    />
                    <div className="streak-name-section">
                      <span className="streak-name">{habit.name}</span>
                      {habit.status.label !== 'Start Fresh' && (
                        <span 
                          className="streak-status-badge"
                          style={{ color: habit.status.color, borderColor: habit.status.color }}
                        >
                          {habit.status.type === 'active' && <Flame size={12} />}
                          {habit.status.type === 'at-risk' && <AlertTriangle size={12} />}
                          {habit.status.type === 'broken' && habit.current > 0 && <CheckCircle2 size={12} />}
                          {habit.status.label}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="streak-stats">
                    <div className="streak-stat">
                      <span className="streak-value" style={{ color: habit.status.color }}>
                        {habit.current}
                      </span>
                      <span className="streak-label">Current</span>
                    </div>
                    <div className="streak-divider" />
                    <div className="streak-stat">
                      <span className="streak-value best">{habit.best}</span>
                      <span className="streak-label">Best</span>
                    </div>
                  </div>
                </div>
                
                {/* Expanded details */}
                {expandedHabit === habit.id && (
                  <div className="streak-details">
                    <div className="streak-detail-row">
                      <span className="detail-label">Last completed:</span>
                      <span className="detail-value">
                        {habit.lastDate 
                          ? new Date(habit.lastDate).toLocaleDateString('en-US', { 
                              weekday: 'short', 
                              month: 'short', 
                              day: 'numeric' 
                            })
                          : 'Never'
                        }
                      </span>
                    </div>
                    {habit.status.type === 'at-risk' && (
                      <div className="streak-warning">
                        Complete today to keep your {habit.current}-day streak alive!
                      </div>
                    )}
                    {onToggleCompletion && !habit.isCompletedToday && habit.status.type !== 'broken' && (
                      <button 
                        className="quick-complete-btn"
                        onClick={(e) => {
                          e.stopPropagation();
                          onToggleCompletion(habit.id, today);
                        }}
                      >
                        <CheckCircle2 size={14} />
                        Mark Complete Today
                      </button>
                    )}
                  </div>
                )}
              </div>
              ))
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
