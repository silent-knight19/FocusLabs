import React from 'react';
import { CompletionBar } from './CompletionBar';
import { WeeklyChart } from './WeeklyChart';
import { StreakDisplay } from './StreakDisplay';
import { getToday, formatDateKey } from '../utils/dateHelpers';
import './styles/ProgressSection.css';

/**
 * Container for analytics and progress tracking
 */
export function ProgressSection({
  habits,
  weekDates,
  completionData,
  getCurrentStreak,
  getLongestStreak,
  completions
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

  if (habits.length === 0) {
    return null;
  }

  return (
    <section className="progress-section">
      <div className="progress-grid">
        <div className="progress-item full-width">
          <CompletionBar
            percentage={todayPercentage}
            totalHabits={totalHabits}
            completedHabits={completedToday}
          />
        </div>
        
        <div className="progress-item">
          <WeeklyChart
            weekDates={weekDates}
            completionData={completionData}
          />
        </div>
        
        <div className="progress-item">
          <StreakDisplay
            habits={habits}
            getCurrentStreak={getCurrentStreak}
            getLongestStreak={getLongestStreak}
          />
        </div>
      </div>
    </section>
  );
}
