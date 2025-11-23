import React from 'react';
import { TrendingUp, Target, Flame, Calendar } from 'lucide-react';
import { getToday, formatDateKey } from '../utils/dateHelpers';
import { useAnalytics } from '../hooks/useAnalytics';
import { ConcentricPieChart } from './ConcentricPieChart';
import './styles/ProgressSectionRedesigned.css';

/**
 * Redesigned progress section with beautiful circular visualizations
 */
export function ProgressSection({
  habits,
  getCurrentStreak,
  getLongestStreak,
  completions,
  onOpenAnalytics
}) {
  // Calculate today's statistics
  const today = getToday();
  const todayKey = formatDateKey(today);
  const totalHabits = habits.length;
  const completedToday = habits.filter(
    habit => completions[habit.id]?.[todayKey] === 'completed'
  ).length;
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

  if (habits.length === 0) {
    return null;
  }

  // Get streaks for each habit
  const habitStreaks = habits.map(habit => ({
    name: habit.name,
    color: habit.color,
    current: getCurrentStreak(habit.id),
    best: getLongestStreak(habit.id)
  }));

  return (
    <section className="progress-section-redesigned">
      <div className="progress-header">
        <h2>Today's Progress</h2>
        <span className="progress-count">{completedToday} / {totalHabits} habits</span>
      </div>

      <div className="progress-main-grid">
        {/* Today's Progress - Circular */}
        <div className="progress-card today-card">
          <div className="card-header">
            <Target size={20} />
            <h3>Today's Progress</h3>
          </div>
          <div className="circular-progress-container">
            <svg className="circular-progress" viewBox="0 0 200 200">
              <defs>
                <linearGradient id="progressGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#ff6b35" />
                  <stop offset="100%" stopColor="#ff8c42" />
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
          className="progress-card weekly-card"
          onClick={onOpenAnalytics}
          role={onOpenAnalytics ? 'button' : undefined}
          tabIndex={onOpenAnalytics ? 0 : undefined}
        >
          <div className="card-header">
            <Calendar size={20} />
            <h3>Focus Balance (10-day avg)</h3>
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

        {/* Streaks Section */}
        <div className="progress-card streaks-card">
          <div className="card-header">
            <Flame size={20} />
            <h3>Streaks</h3>
          </div>
          <div className="streaks-list">
            {habitStreaks.slice(0, 3).map((habit, idx) => (
              <div 
                key={idx} 
                className="streak-item"
                title={`Current Streak: ${habit.current} days | Best Streak: ${habit.best} days`}
              >
                <div className="streak-info">
                  <div 
                    className="streak-color-dot" 
                    style={{ 
                      backgroundColor: habit.color,
                      boxShadow: `0 0 10px ${habit.color}, 0 0 20px ${habit.color}`
                    }}
                  />
                  <span className="streak-name">{habit.name}</span>
                </div>
                <div className="streak-stats">
                  <div className="streak-stat">
                    <span className="streak-value">{habit.current}</span>
                    <span className="streak-label">Current</span>
                  </div>
                  <div className="streak-divider" />
                  <div className="streak-stat">
                    <span className="streak-value best">{habit.best}</span>
                    <span className="streak-label">Best</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
