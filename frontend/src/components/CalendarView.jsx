import React, { useState, useEffect } from 'react';
import { getMonthDates, getMonthName, isSameDay, getTwoYearsAgo, isWithinTwoYears } from '../utils/dateHelpers';
import './styles/CalendarView.css';

export function CalendarView({ habits, completions, onDateClick }) {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [calendarDays, setCalendarDays] = useState([]);

  useEffect(() => {
    const dates = getMonthDates(currentDate.getFullYear(), currentDate.getMonth());
    setCalendarDays(dates);
  }, [currentDate]);

  const handlePrevMonth = () => {
    const newDate = new Date(currentDate);
    newDate.setMonth(newDate.getMonth() - 1);
    if (isWithinTwoYears(newDate)) {
      setCurrentDate(newDate);
    }
  };

  const handleNextMonth = () => {
    const newDate = new Date(currentDate);
    newDate.setMonth(newDate.getMonth() + 1);
    // Prevent going beyond current month + 1 year (optional limit)
    setCurrentDate(newDate);
  };

  const handleToday = () => {
    setCurrentDate(new Date());
  };

  const getDayCompletionStats = (date) => {
    const dateStr = date.toISOString().split('T')[0];
    const dayCompletions = completions[dateStr] || {};
    
    // Filter habits active on this day (simplified check)
    const activeHabits = habits.filter(h => {
      const created = new Date(h.createdAt);
      return created <= date;
    });

    if (activeHabits.length === 0) return { count: 0, total: 0, percentage: 0 };

    const completedCount = activeHabits.filter(h => dayCompletions[h.id]).length;
    return {
      count: completedCount,
      total: activeHabits.length,
      percentage: (completedCount / activeHabits.length) * 100
    };
  };

  const weekDays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  return (
    <div className="calendar-view">
      <div className="calendar-header">
        <div className="calendar-nav">
          <button onClick={handlePrevMonth} className="nav-btn">
            &lt;
          </button>
          <button onClick={handleToday} className="nav-btn today-btn">
            Today
          </button>
          <button onClick={handleNextMonth} className="nav-btn">
            &gt;
          </button>
        </div>
        <h2 className="current-month">
          {getMonthName(currentDate.getMonth())} {currentDate.getFullYear()}
        </h2>
      </div>

      <div className="calendar-grid">
        {weekDays.map(day => (
          <div key={day} className="calendar-day-header">{day}</div>
        ))}
        
        {calendarDays.map((date, index) => {
          const stats = getDayCompletionStats(date);
          const isToday = isSameDay(date, new Date());
          const isCurrentMonth = date.getMonth() === currentDate.getMonth();
          
          return (
            <div 
              key={index} 
              className={`calendar-day ${!isCurrentMonth ? 'other-month' : ''} ${isToday ? 'today' : ''}`}
              onClick={() => onDateClick && onDateClick(date)}
            >
              <div className="day-number">{date.getDate()}</div>
              
              {stats.total > 0 && (
                <div className="day-stats">
                  <div className="completion-dots">
                    {habits.slice(0, 5).map(habit => {
                      const dateStr = date.toISOString().split('T')[0];
                      const isCompleted = completions[dateStr]?.[habit.id];
                      if (!isCompleted) return null;
                      return (
                        <div 
                          key={habit.id} 
                          className="habit-dot"
                          style={{ backgroundColor: habit.color }}
                          title={habit.name}
                        />
                      );
                    })}
                    {stats.count > 5 && <span className="more-dots">+</span>}
                  </div>
                  <div className="completion-bar-container">
                    <div 
                      className="completion-bar" 
                      style={{ width: `${stats.percentage}%`, backgroundColor: `var(--neon-orange)` }}
                    />
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
