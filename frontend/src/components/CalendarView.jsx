import React, { useState, useEffect } from 'react';
import { Search, X } from 'lucide-react';
import { getMonthDates, getMonthName, isSameDay, getTwoYearsAgo, isWithinTwoYears, formatDateKey } from '../utils/dateHelpers';
import './styles/CalendarView.css';

export function CalendarView({ habits, completions, subtasks = [], subtaskCompletions = {}, dailyTasks = [], onDateClick }) {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [calendarDays, setCalendarDays] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [matchingDates, setMatchingDates] = useState(new Set());
  const [searchSuggestions, setSearchSuggestions] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(false);

  useEffect(() => {
    const dates = getMonthDates(currentDate.getFullYear(), currentDate.getMonth());
    setCalendarDays(dates);
  }, [currentDate]);

  // Generate search suggestions
  useEffect(() => {
    if (!searchTerm.trim()) {
      setSearchSuggestions([]);
      setShowSuggestions(false);
      return;
    }

    const suggestions = new Set();
    const searchLower = searchTerm.toLowerCase();

    // 1. Collect matching Habits
    habits.forEach(habit => {
      if (habit.name.toLowerCase().includes(searchLower)) {
        suggestions.add(JSON.stringify({ type: 'habit', text: habit.name, color: habit.color }));
      }
    });

    // 2. Collect matching Subtasks (Static)
    if (subtasks && subtasks.length > 0) {
      subtasks.forEach(subtask => {
        if (subtask.title.toLowerCase().includes(searchLower)) {
          const parentHabit = habits.find(h => h.id === subtask.habitId);
          if (parentHabit) {
            suggestions.add(JSON.stringify({ 
              type: 'subtask', 
              text: subtask.title, 
              habitName: parentHabit.name, 
              color: parentHabit.color 
            }));
          }
        }
      });
    }

    // 3. Collect matching Daily Tasks
    if (dailyTasks && dailyTasks.length > 0) {
      dailyTasks.forEach(task => {
        if (task.title.toLowerCase().includes(searchLower)) {
          const parentHabit = habits.find(h => h.id === task.habitId);
          if (parentHabit) {
            suggestions.add(JSON.stringify({ 
              type: 'daily_task', 
              text: task.title, 
              habitName: parentHabit.name, 
              color: parentHabit.color 
            }));
          }
        }
      });
    }

    // Parse back to objects and limit
    const uniqueSuggestions = Array.from(suggestions).map(s => JSON.parse(s));
    setSearchSuggestions(uniqueSuggestions.slice(0, 10));
    setShowSuggestions(uniqueSuggestions.length > 0);
  }, [searchTerm, habits, subtasks, dailyTasks]);

  // Search for habits, subtasks, and daily tasks
  useEffect(() => {
    if (!searchTerm.trim()) {
      setMatchingDates(new Set());
      return;
    }

    const matches = new Set();
    const searchLower = searchTerm.toLowerCase();

    // 1. Search Habit History (Completed Habits)
    // Structure: { habitId: { dateKey: status } }
    Object.keys(completions).forEach(habitId => {
      const habit = habits.find(h => h.id === habitId);
      if (!habit) return;

      // If habit name matches, find all completed dates
      if (habit.name.toLowerCase().includes(searchLower)) {
        const habitDates = completions[habitId] || {};
        Object.entries(habitDates).forEach(([dateKey, status]) => {
          if (status === 'completed') {
            matches.add(dateKey);
          }
        });
      }
    });

    // 2. Search Subtask History (Completed Subtasks)
    const matchingSubtasks = subtasks.filter(st => {
      const parentHabitExists = habits.some(h => h.id === st.habitId);
      return parentHabitExists && st.title.toLowerCase().includes(searchLower);
    });

    matchingSubtasks.forEach(subtask => {
      const habitId = subtask.habitId;
      const habitCompletions = subtaskCompletions[habitId] || {};

      // Check all dates for this habit
      Object.entries(habitCompletions).forEach(([dateKey, dateData]) => {
        if (dateData[subtask.id] === true) {
          matches.add(dateKey);
        }
      });
    });

    // 3. Search Daily Tasks (All tasks, regardless of completion)
    // User requested: "item am searching for can be of past present or futore dates"
    const matchingDailyTasks = dailyTasks.filter(task => {
      const parentHabitExists = habits.some(h => h.id === task.habitId);
      return parentHabitExists && task.title.toLowerCase().includes(searchLower);
    });

    matchingDailyTasks.forEach(task => {
      // task.date is already in YYYY-MM-DD format
      matches.add(task.date);
    });

    setMatchingDates(matches);
  }, [searchTerm, completions, habits, subtasks, subtaskCompletions, dailyTasks]);

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
    const dateStr = formatDateKey(date);
    
    // Filter habits active on this day (simplified check)
    const activeHabits = habits.filter(h => {
      const created = new Date(h.createdAt);
      return created <= date;
    });

    if (activeHabits.length === 0) return { count: 0, total: 0, percentage: 0 };

    // Check completion using correct structure: completions[habitId][dateStr]
    const completedCount = activeHabits.filter(h => 
      completions[h.id]?.[dateStr] === 'completed'
    ).length;

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
        <div className="calendar-header-top">
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
        
        {/* Search Bar */}
        <div className="calendar-search">
          <div className="search-input-wrapper">
            <Search size={18} className="search-icon" />
            <input
              type="text"
              placeholder="Search habits, subtasks..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              onFocus={() => searchTerm && setShowSuggestions(true)}
              className="calendar-search-input"
            />
            {searchTerm && (
              <button 
                onClick={() => {
                  setSearchTerm('');
                  setShowSuggestions(false);
                }}
                className="clear-search-btn"
              >
                <X size={18} />
              </button>
            )}
            
            {/* Autocomplete Dropdown */}
            {showSuggestions && searchSuggestions.length > 0 && (
              <div className="search-suggestions">
                {searchSuggestions.map((suggestion, idx) => (
                  <div
                    key={idx}
                    className="suggestion-item"
                    onClick={() => {
                      setSearchTerm(suggestion.text);
                      setShowSuggestions(false);
                    }}
                  >
                    <span 
                      className="suggestion-dot" 
                      style={{ backgroundColor: suggestion.color }}
                    />
                    <div className="suggestion-content">
                      <span className="suggestion-text">{suggestion.text}</span>
                      {suggestion.type === 'subtask' && (
                        <span className="suggestion-meta">in {suggestion.habitName}</span>
                      )}
                    </div>
                    <span className="suggestion-type">
                      {suggestion.type === 'habit' ? 'Habit' : suggestion.type === 'subtask' ? 'Subtask' : 'Daily Task'}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
          {matchingDates.size > 0 && (
            <div className="search-results-count">
              {matchingDates.size} day{matchingDates.size !== 1 ? 's' : ''} found
            </div>
          )}
        </div>
      </div>

      <div className="calendar-grid">
        {weekDays.map(day => (
          <div key={day} className="calendar-day-header">{day}</div>
        ))}
        {calendarDays.map((date, index) => {
          const stats = getDayCompletionStats(date);
          const isToday = isSameDay(date, new Date());
          const isCurrentMonth = date.getMonth() === currentDate.getMonth();
          const dateStr = formatDateKey(date);
          const isMatching = matchingDates.has(dateStr);
          
          // Get stopwatch time for this day
          let totalHours = 0;
          try {
            const lapHistory = JSON.parse(localStorage.getItem('habitgrid_lap_history') || '[]');
            const dayKey = formatDateKey(date);
            const dayLaps = lapHistory.filter(lap => {
              const lapDateKey = lap.date ? lap.date.split('T')[0] : null;
              return lapDateKey === dayKey;
            });
            const totalMs = dayLaps.reduce((sum, lap) => sum + (lap.time || 0), 0);
            totalHours = totalMs / (1000 * 60 * 60);
          } catch {
            // Ignore errors
          }

          return (
            <div 
              key={index} 
              className={`calendar-day ${!isCurrentMonth ? 'other-month' : ''} ${isToday ? 'today' : ''} ${isMatching ? 'search-match' : ''}`}
              onClick={() => onDateClick && onDateClick(date)}
            >
              <div className="day-number">{date.getDate()}</div>
              
              {stats.total > 0 && (
                <div className="day-stats">
                  <div className="completion-dots">
                    {habits.slice(0, 5).map(habit => {
                      const isCompleted = completions[habit.id]?.[dateStr] === 'completed';
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
              {totalHours > 0 && (
                <div className="day-time">{totalHours.toFixed(1)}h</div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
