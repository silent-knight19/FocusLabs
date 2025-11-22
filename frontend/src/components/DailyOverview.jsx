import React from 'react';
import './styles/DailyOverview.css';

/**
 * Daily Overview component showing greeting and daily progress
 */
export function DailyOverview({ habits, getCompletionStatus, getToday }) {
  const today = getToday();
  const totalHabits = habits.length;
  
  const completedCount = habits.filter(habit => 
    getCompletionStatus(habit.id, today) === 'completed'
  ).length;

  const progress = totalHabits > 0 ? (completedCount / totalHabits) * 100 : 0;

  // Find next upcoming habit
  const getNextHabit = () => {
    const now = new Date();
    const currentMinutes = now.getHours() * 60 + now.getMinutes();
    
    const upcomingHabits = habits.filter(habit => {
      if (!habit.startTime) return false;
      const [hours, minutes] = habit.startTime.split(':').map(Number);
      const habitMinutes = hours * 60 + minutes;
      return habitMinutes > currentMinutes;
    });

    if (upcomingHabits.length === 0) return null;

    // Sort by start time
    upcomingHabits.sort((a, b) => {
      const [h1, m1] = a.startTime.split(':').map(Number);
      const [h2, m2] = b.startTime.split(':').map(Number);
      return (h1 * 60 + m1) - (h2 * 60 + m2);
    });

    return upcomingHabits[0];
  };

  const nextHabit = getNextHabit();

  const formatTime = (time) => {
    if (!time) return '';
    const [hours, minutes] = time.split(':');
    const date = new Date();
    date.setHours(hours);
    date.setMinutes(minutes);
    return date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
  };

  return (
    <div className="daily-overview-container">
      <div className="overview-left">
        {nextHabit ? (
          <>
            <h3 className="greeting-text">Up Next: {nextHabit.name}</h3>
            <p className="date-text">
              Scheduled for {formatTime(nextHabit.startTime)}
            </p>
          </>
        ) : (
          <>
            <h3 className="greeting-text">All Caught Up!</h3>
            <p className="date-text">
              {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
            </p>
          </>
        )}
      </div>
      
      <div className="overview-right">
        <div className="progress-info">
          <span className="progress-label">Daily Progress</span>
          <span className="progress-value">{completedCount}/{totalHabits}</span>
        </div>
        <div className="progress-bar-bg">
          <div 
            className="progress-bar-fill" 
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>
    </div>
  );
}
