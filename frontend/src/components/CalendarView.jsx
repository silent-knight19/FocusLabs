import React, { useState, useEffect, useCallback } from 'react';
import { Search, X, Trash2, Edit2, Check, ChevronDown, ChevronRight } from 'lucide-react';
import { getMonthDates, getMonthName, isSameDay, getTwoYearsAgo, isWithinTwoYears, formatDateKey } from '../utils/dateHelpers';
import './styles/CalendarView.css';

const TaskItem = ({ task, onToggle, onDelete, onUpdate }) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editTitle, setEditTitle] = useState(task.title);

  const handleSave = () => {
    if (editTitle.trim()) {
      onUpdate(editTitle);
      setIsEditing(false);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') handleSave();
    if (e.key === 'Escape') {
      setEditTitle(task.title);
      setIsEditing(false);
    }
  };

  return (
    <div className="sidebar-item task group">
      <div 
        className={`task-checkbox ${task.completed ? 'checked' : ''}`} 
        onClick={(e) => {
          e.stopPropagation();
          onToggle();
        }}
      >
        {task.completed && <Check size={10} color="white" strokeWidth={4} />}
      </div>
      
      {isEditing ? (
        <input
          type="text"
          value={editTitle}
          onChange={(e) => setEditTitle(e.target.value)}
          onBlur={handleSave}
          onKeyDown={handleKeyDown}
          className="task-edit-input"
          autoFocus
        />
      ) : (
        <span 
          className={`sidebar-item-text ${task.completed ? 'completed' : ''}`}
          onDoubleClick={() => setIsEditing(true)}
        >
          {task.title}
        </span>
      )}

      <div className="task-actions">
        <button 
          className="task-action-btn edit" 
          onClick={() => setIsEditing(true)}
          title="Rename"
        >
          <Edit2 size={12} />
        </button>
        <button 
          className="task-action-btn delete" 
          onClick={(e) => {
            e.stopPropagation();
            if(window.confirm('Delete this task?')) onDelete();
          }}
          title="Delete"
        >
          <Trash2 size={12} />
        </button>
      </div>
    </div>
  );
};

const HabitItem = ({ habit, isCompleted, subtasks, subtaskCompletions, dailyTasks, dateKey, onToggleTask, onDeleteTask, onUpdateTask }) => {
  const [isExpanded, setIsExpanded] = useState(false);

  return (
    <div className="habit-item-container">
      <div 
        className="sidebar-item habit" 
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="habit-main-info">
          <div className="habit-status-indicator">
             {isExpanded ? <ChevronDown size={14} color="#737373" /> : <ChevronRight size={14} color="#737373" />}
          </div>
          <div className="habit-color-dot" style={{ backgroundColor: habit.color }} />
          <span className={`sidebar-item-text ${isCompleted ? 'completed-habit' : ''}`}>
            {habit.name}
          </span>
        </div>
        {isCompleted && <Check size={14} color={habit.color} />}
      </div>

      {isExpanded && (
        <div className="habit-details">
          {/* Static Subtasks */}
          {subtasks.length > 0 && (
             <div className="habit-subtasks">
              <div className="subtasks-header">Checklist</div>
              {subtasks.map(st => {
                const isStCompleted = subtaskCompletions[habit.id]?.[dateKey]?.[st.id] === true;
                return (
                  <div key={st.id} className="habit-subtask-item">
                    <div className={`subtask-dot ${isStCompleted ? 'completed' : ''}`} />
                    <span className={`subtask-text ${isStCompleted ? 'completed' : ''}`}>
                      {st.title}
                    </span>
                  </div>
                );
              })}
            </div>
          )}

          {/* Daily Tasks for this Habit */}
          {dailyTasks.length > 0 && (
            <div className="habit-subtasks daily-tasks-group">
              <div className="subtasks-header">Today's Tasks</div>
              {dailyTasks.map(task => (
                <TaskItem 
                  key={task.id} 
                  task={task} 
                  onToggle={() => onToggleTask(task.id)}
                  onDelete={() => onDeleteTask(task.id)}
                  onUpdate={(title) => onUpdateTask(task.id, { title })}
                />
              ))}
            </div>
          )}

          {subtasks.length === 0 && dailyTasks.length === 0 && (
            <div className="no-subtasks">No tasks for today</div>
          )}
        </div>
      )}
    </div>
  );
};

export function CalendarView({ habits, completions, subtasks = [], subtaskCompletions = {}, dailyTasks = [], onDateDoubleClick, onToggleTask, onUpdateTask, onDeleteTask }) {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [calendarDays, setCalendarDays] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [matchingDates, setMatchingDates] = useState(new Set());
  const [searchSuggestions, setSearchSuggestions] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [selectedDate, setSelectedDate] = useState(new Date());

  useEffect(() => {
    const dates = getMonthDates(currentDate.getFullYear(), currentDate.getMonth());
    setCalendarDays(dates);
  }, [currentDate]);

  // Keyboard Navigation
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.key)) {
        e.preventDefault();
        const newDate = new Date(selectedDate);
        
        switch (e.key) {
          case 'ArrowLeft':
            newDate.setDate(selectedDate.getDate() - 1);
            break;
          case 'ArrowRight':
            newDate.setDate(selectedDate.getDate() + 1);
            break;
          case 'ArrowUp':
            newDate.setDate(selectedDate.getDate() - 7);
            break;
          case 'ArrowDown':
            newDate.setDate(selectedDate.getDate() + 7);
            break;
        }

        setSelectedDate(newDate);
        
        // Auto-switch month if needed
        if (newDate.getMonth() !== currentDate.getMonth()) {
          setCurrentDate(newDate);
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedDate, currentDate]);

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
    const today = new Date();
    setCurrentDate(today);
    setSelectedDate(today);
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

  // Update selected date when clicking a day
  const handleDateClick = (date) => {
    setSelectedDate(date);
  };

  // Handle double click to open modal
  const handleDateDoubleClick = (date) => {
    if (onDateDoubleClick) onDateDoubleClick(date);
  };

  // Get data for the selected date
  const getSelectedDateData = () => {
    const dateKey = formatDateKey(selectedDate);
    
    // All habits active on this day
    const activeHabits = habits.filter(h => {
      const created = new Date(h.createdAt);
      return created <= selectedDate;
    });

    // Tasks for this day
    const tasksForDay = dailyTasks.filter(t => t.date === dateKey);

    // Group tasks by habit
    const tasksByHabit = {};
    const standaloneTasks = [];

    tasksForDay.forEach(task => {
      if (task.habitId) {
        if (!tasksByHabit[task.habitId]) {
          tasksByHabit[task.habitId] = [];
        }
        tasksByHabit[task.habitId].push(task);
      } else {
        standaloneTasks.push(task);
      }
    });
    
    return { activeHabits, tasksByHabit, standaloneTasks, dateKey };
  };

  const { activeHabits, tasksByHabit, standaloneTasks, dateKey } = getSelectedDateData();

  const weekDays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  return (
    <div className="calendar-container">
      {/* Main Calendar Area */}
      <div className="calendar-main">
        <div className="calendar-header">
          <div className="calendar-header-left">
            <h2 className="current-month">
              {getMonthName(currentDate.getMonth())} <span style={{ opacity: 0.5 }}>{currentDate.getFullYear()}</span>
            </h2>
            <div className="calendar-nav">
              <button onClick={handlePrevMonth} className="nav-btn">
                &lt;
              </button>
              <button onClick={handleNextMonth} className="nav-btn">
                &gt;
              </button>
            </div>
          </div>
          
          {/* Search Bar */}
          <div className="calendar-search">
            <div className="search-input-wrapper">
              <Search size={16} className="search-icon" />
              <input
                type="text"
                placeholder="Search..."
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
                  <X size={14} />
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
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="calendar-grid-header">
          {weekDays.map(day => (
            <div key={day} className="day-header">{day}</div>
          ))}
        </div>

        <div className="calendar-grid">
          {calendarDays.map((date, index) => {
            const stats = getDayCompletionStats(date);
            const isToday = isSameDay(date, new Date());
            const isSelected = isSameDay(date, selectedDate);
            const isCurrentMonth = date.getMonth() === currentDate.getMonth();
            const dateStr = formatDateKey(date);
            const isMatching = matchingDates.has(dateStr);
            
            return (
              <div 
                key={index} 
                className={`calendar-day ${!isCurrentMonth ? 'other-month' : ''} ${isToday ? 'today' : ''} ${isSelected ? 'selected' : ''} ${isMatching ? 'search-match' : ''}`}
                onClick={() => handleDateClick(date)}
                onDoubleClick={() => handleDateDoubleClick(date)}
              >
                <div className="day-number">{date.getDate()}</div>
                
                <div className="day-content">
                  {stats.total > 0 && (
                    <div className="event-dots">
                      {habits.slice(0, 4).map(habit => {
                        const isCompleted = completions[habit.id]?.[dateStr] === 'completed';
                        if (!isCompleted) return null;
                        return (
                          <div 
                            key={habit.id} 
                            className="event-dot"
                            style={{ backgroundColor: habit.color }}
                          />
                        );
                      })}
                      {stats.count > 4 && <span className="more-events-dot" />}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Side Panel */}
      <div className="calendar-sidebar">
        <div className="sidebar-header">
          <div className="sidebar-date">
            <span className="sidebar-day">{selectedDate.getDate()}</span>
            <div className="sidebar-date-meta">
              <span className="sidebar-weekday">{selectedDate.toLocaleDateString('en-US', { weekday: 'long' })}</span>
              <span className="sidebar-month">{selectedDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}</span>
            </div>
          </div>
        </div>

        <div className="sidebar-content">
          <div className="sidebar-section">
            <h3 className="sidebar-section-title">Habits</h3>
            {activeHabits.length > 0 ? (
              <div className="sidebar-list">
                {activeHabits.map(habit => {
                  const isCompleted = completions[habit.id]?.[dateKey] === 'completed';
                  const habitSubtasks = subtasks.filter(st => st.habitId === habit.id);
                  const habitDailyTasks = tasksByHabit[habit.id] || [];
                  
                  return (
                    <HabitItem 
                      key={habit.id}
                      habit={habit}
                      isCompleted={isCompleted}
                      subtasks={habitSubtasks}
                      subtaskCompletions={subtaskCompletions}
                      dailyTasks={habitDailyTasks}
                      dateKey={dateKey}
                      onToggleTask={onToggleTask}
                      onUpdateTask={onUpdateTask}
                      onDeleteTask={onDeleteTask}
                    />
                  );
                })}
              </div>
            ) : (
              <div className="sidebar-empty">No habits for this day</div>
            )}
          </div>

          <div className="sidebar-section">
            <h3 className="sidebar-section-title">Other Tasks</h3>
            {standaloneTasks.length > 0 ? (
              <div className="sidebar-list">
                {standaloneTasks.map(task => (
                  <TaskItem 
                    key={task.id} 
                    task={task} 
                    onToggle={() => onToggleTask(task.id)}
                    onDelete={() => onDeleteTask(task.id)}
                    onUpdate={(title) => onUpdateTask(task.id, { title })}
                  />
                ))}
              </div>
            ) : (
              <div className="sidebar-empty">No other tasks</div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
