import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, X, Trash2, Edit2, Check, ChevronDown, ChevronRight } from 'lucide-react';
import { getMonthDates, getMonthName, isSameDay, getTwoYearsAgo, isWithinTwoYears, formatDateKey, isFutureDate } from '../utils/dateHelpers';
import { ConfirmationModal } from './ConfirmationModal';
import './styles/CalendarView.css';

const TaskItem = ({ task, onToggle, onDelete, onUpdate, disabled = false }) => {
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
        className={`task-checkbox ${task.completed ? 'checked' : ''} ${disabled ? 'disabled' : ''}`} 
        onClick={(e) => {
          e.stopPropagation();
          if (!disabled) onToggle();
        }}
        title={disabled ? 'Cannot mark tasks for future dates' : task.completed ? 'Mark as incomplete' : 'Mark as complete'}
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
            onDelete();
          }}
          title="Delete"
        >
          <Trash2 size={12} />
        </button>
      </div>
    </div>
  );
};

const HabitItem = ({ habit, isCompleted, subtasks, subtaskCompletions, dailyTasks, dateKey, onToggleTask, onDeleteTask, onUpdateTask, disabled = false }) => {
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

      {/* Accordion animation using AnimatePresence */}
      <AnimatePresence>
        {isExpanded && (
          <motion.div 
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            style={{ overflow: 'hidden' }}
            className="habit-details"
          >
            {/* Static Subtasks */}
            {subtasks.length > 0 && (
               <div className="habit-subtasks">
                <div className="subtasks-header">Checklist</div>
                {subtasks.map(st => {
                  const isStCompleted = subtaskCompletions[habit.id]?.[dateKey]?.[st.id] === true;
                  return (
                    <motion.div whileHover={{ x: 5 }} key={st.id} className="habit-subtask-item">
                      <div className={`subtask-dot ${isStCompleted ? 'completed' : ''}`} />
                      <span className={`subtask-text ${isStCompleted ? 'completed' : ''}`}>
                        {st.title}
                      </span>
                    </motion.div>
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
                    onDelete={() => {
                      setConfirmationModal({
                        isOpen: true,
                        title: 'Delete Task',
                        message: 'Are you sure you want to delete this task?',
                        confirmText: 'Delete',
                        type: 'danger',
                        onConfirm: () => onDeleteTask(task.id)
                      });
                    }}
                    onUpdate={(title) => onUpdateTask(task.id, { title })}
                    disabled={disabled}
                  />
                ))}
              </div>
            )}

            {subtasks.length === 0 && dailyTasks.length === 0 && (
              <div className="no-subtasks">No tasks for today</div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export function CalendarView({ habits, completions, subtasks = [], subtaskCompletions = {}, dailyTasks = [], onDateDoubleClick, onToggleTask, onUpdateTask, onDeleteTask }) {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [calendarDays, setCalendarDays] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [matchingDates, setMatchingDates] = useState(new Set());
  const [searchResults, setSearchResults] = useState([]);
  const [searchSuggestions, setSearchSuggestions] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const searchRef = useRef(null);
  
  const [selectedDate, setSelectedDate] = useState(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return today;
  });

  // Confirmation Modal State
  const [confirmationModal, setConfirmationModal] = useState({
    isOpen: false,
    title: '',
    message: '',
    onConfirm: () => {},
    type: 'danger',
    confirmText: 'Delete'
  });

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

  // Close suggestions on click outside
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (searchRef.current && !searchRef.current.contains(e.target)) {
        setShowSuggestions(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

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
    if (Array.isArray(subtasks) && subtasks.length > 0) {
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

  // Search for habits, subtasks, and daily tasks — build matching dates + detailed results
  useEffect(() => {
    if (!searchTerm.trim()) {
      setMatchingDates(new Set());
      setSearchResults([]);
      return;
    }

    const matches = new Set();
    const results = [];
    const searchLower = searchTerm.toLowerCase();

    // 1. Search Habit History (Completed Habits)
    Object.keys(completions).forEach(habitId => {
      const habit = habits.find(h => h.id === habitId);
      if (!habit) return;

      if (habit.name.toLowerCase().includes(searchLower)) {
        const habitDates = completions[habitId] || {};
        Object.entries(habitDates).forEach(([dateKey, status]) => {
          if (status === 'completed') {
            matches.add(dateKey);
            results.push({
              type: 'habit',
              name: habit.name,
              color: habit.color,
              date: dateKey,
              status: 'completed'
            });
          }
        });
      }
    });

    // 2. Search Subtask History (Completed Subtasks)
    const matchingSubtasks = Array.isArray(subtasks) ? subtasks.filter(st => {
      const parentHabitExists = habits.some(h => h.id === st.habitId);
      return parentHabitExists && st.title.toLowerCase().includes(searchLower);
    }) : [];

    matchingSubtasks.forEach(subtask => {
      const habitId = subtask.habitId;
      const parentHabit = habits.find(h => h.id === habitId);
      const habitCompletions = subtaskCompletions[habitId] || {};

      Object.entries(habitCompletions).forEach(([dateKey, dateData]) => {
        if (dateData[subtask.id] === true) {
          matches.add(dateKey);
          results.push({
            type: 'subtask',
            name: subtask.title,
            habitName: parentHabit?.name,
            color: parentHabit?.color,
            date: dateKey,
            status: 'completed'
          });
        }
      });
    });

    // 3. Search Daily Tasks (All tasks — past, present, future)
    const matchingDailyTasks = dailyTasks.filter(task => {
      const parentHabitExists = habits.some(h => h.id === task.habitId);
      return parentHabitExists && task.title.toLowerCase().includes(searchLower);
    });

    matchingDailyTasks.forEach(task => {
      matches.add(task.date);
      const parentHabit = habits.find(h => h.id === task.habitId);
      results.push({
        type: 'task',
        name: task.title,
        habitName: parentHabit?.name,
        color: parentHabit?.color,
        date: task.date,
        status: task.completed ? 'completed' : 'pending'
      });
    });

    // Sort results by date (newest first)
    results.sort((a, b) => b.date.localeCompare(a.date));

    setMatchingDates(matches);
    setSearchResults(results);

    // Auto-navigate to the most recent matching month
    if (results.length > 0) {
      const mostRecentDate = new Date(results[0].date + 'T00:00:00');
      if (
        mostRecentDate.getMonth() !== currentDate.getMonth() ||
        mostRecentDate.getFullYear() !== currentDate.getFullYear()
      ) {
        setCurrentDate(new Date(mostRecentDate.getFullYear(), mostRecentDate.getMonth(), 1));
      }
    }
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
    today.setHours(0, 0, 0, 0);
    setCurrentDate(today);
    setSelectedDate(today);
  };

  const getDayCompletionStats = (date) => {
    const dateStr = formatDateKey(date);
    
    // Normalize the comparison date to midnight
    const compareDate = new Date(date);
    compareDate.setHours(0, 0, 0, 0);
    
    // Filter habits active on this day (normalize created date to midnight for comparison)
    const activeHabits = habits.filter(h => {
      const created = new Date(h.createdAt);
      created.setHours(0, 0, 0, 0);
      return created <= compareDate;
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
    // Normalize date to midnight for consistent comparison
    const normalizedDate = new Date(date);
    normalizedDate.setHours(0, 0, 0, 0);
    setSelectedDate(normalizedDate);
  };

  // Handle double click to open modal
  const handleDateDoubleClick = (date) => {
    if (onDateDoubleClick) onDateDoubleClick(date);
  };

  // Get data for the selected date - useMemo to ensure reactivity
  const selectedDateData = useMemo(() => {
    const dateKey = formatDateKey(selectedDate);
    
    // All habits active on this day (normalize created date to midnight for comparison)
    const activeHabits = habits.filter(h => {
      const created = new Date(h.createdAt);
      created.setHours(0, 0, 0, 0);
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
  }, [selectedDate, habits, dailyTasks]);

  const { activeHabits, tasksByHabit, standaloneTasks, dateKey } = selectedDateData;

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
          <div className="calendar-search" ref={searchRef}>
            <div className="search-input-wrapper">
              <Search size={16} className="search-icon" />
              <input
                type="text"
                placeholder="Search habits, tasks..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                onFocus={() => searchTerm && setShowSuggestions(true)}
                className="calendar-search-input"
              />
              {searchTerm && (
                <>
                  {matchingDates.size > 0 && (
                    <span className="search-result-count">{matchingDates.size}</span>
                  )}
                  <button 
                    onClick={() => {
                      setSearchTerm('');
                      setShowSuggestions(false);
                      setSearchResults([]);
                    }}
                    className="clear-search-btn"
                  >
                    <X size={14} />
                  </button>
                </>
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
                        {(suggestion.type === 'subtask' || suggestion.type === 'daily_task') && (
                          <span className="suggestion-meta">in {suggestion.habitName}</span>
                        )}
                        <span className="suggestion-type-badge">{suggestion.type === 'habit' ? 'Habit' : suggestion.type === 'subtask' ? 'Checklist' : 'Task'}</span>
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
          {calendarDays
            .filter(date => date.getMonth() === currentDate.getMonth())
            .map((date, index) => {
              const stats = getDayCompletionStats(date);
              const isToday = isSameDay(date, new Date());
              const isSelected = isSameDay(date, selectedDate);
              const dateStr = formatDateKey(date);
              const isMatching = matchingDates.has(dateStr);
              
              return (
                <motion.div 
                  key={index}
                  whileHover={{ scale: 1.05, zIndex: 1 }}
                  whileTap={{ scale: 0.95 }}
                  transition={{ duration: 0.2 }}
                  className={`calendar-day ${isToday ? 'today' : ''} ${isSelected ? 'selected' : ''} ${isMatching ? 'search-match' : ''}`}
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
                            <motion.div 
                              layoutId={`event-${habit.id}-${dateStr}`}
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
                </motion.div>
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
          {/* Show search results when actively searching */}
          {searchTerm.trim() && searchResults.length > 0 ? (
            <div className="sidebar-section">
              <h3 className="sidebar-section-title">Search Results ({searchResults.length})</h3>
              <div className="sidebar-list search-results-list">
                {searchResults.slice(0, 25).map((result, idx) => (
                  <div 
                    key={idx} 
                    className="search-result-item"
                    onClick={() => {
                      const resultDate = new Date(result.date + 'T00:00:00');
                      setSelectedDate(resultDate);
                      if (
                        resultDate.getMonth() !== currentDate.getMonth() ||
                        resultDate.getFullYear() !== currentDate.getFullYear()
                      ) {
                        setCurrentDate(new Date(resultDate.getFullYear(), resultDate.getMonth(), 1));
                      }
                    }}
                  >
                    <span className="search-result-dot" style={{ backgroundColor: result.color }} />
                    <div className="search-result-info">
                      <span className="search-result-name">{result.name}</span>
                      {result.habitName && result.type !== 'habit' && (
                        <span className="search-result-habit">in {result.habitName}</span>
                      )}
                      <span className="search-result-date">
                        {new Date(result.date + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                      </span>
                    </div>
                    <span className={`search-result-badge ${result.status}`}>
                      {result.status === 'completed' ? '✓' : '○'}
                    </span>
                  </div>
                ))}
                {searchResults.length > 25 && (
                  <div className="sidebar-empty">+{searchResults.length - 25} more results</div>
                )}
              </div>
            </div>
          ) : searchTerm.trim() && searchResults.length === 0 ? (
            <div className="sidebar-section">
              <h3 className="sidebar-section-title">Search Results</h3>
              <div className="sidebar-empty">No results found for "{searchTerm}"</div>
            </div>
          ) : (
            /* Default: show habits and tasks for selected date */
            <>
              <div className="sidebar-section">
                <h3 className="sidebar-section-title">Habits</h3>
                {activeHabits.length > 0 ? (
                  <div className="sidebar-list">
                    {activeHabits.map(habit => {
                      const habitDateKey = formatDateKey(selectedDate);
                      const isCompleted = completions[habit.id]?.[habitDateKey] === 'completed';
                      const habitSubtasks = Array.isArray(subtasks) ? subtasks.filter(st => st.habitId === habit.id) : [];
                      const habitDailyTasks = tasksByHabit[habit.id] || [];
                      
                      return (
                        <HabitItem 
                          key={`${habit.id}-${habitDateKey}`}
                          habit={habit}
                          isCompleted={isCompleted}
                          subtasks={habitSubtasks}
                          dailyTasks={habitDailyTasks}
                          dateKey={habitDateKey}
                          onToggleTask={onToggleTask}
                          onUpdateTask={onUpdateTask}
                          onDeleteTask={onDeleteTask}
                          disabled={isFutureDate(selectedDate)}
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
                        key={`${task.id}-${dateKey}`} 
                        task={task} 
                        onToggle={() => onToggleTask(task.id)}
                        onDelete={() => {
                          setConfirmationModal({
                            isOpen: true,
                            title: 'Delete Task',
                            message: 'Are you sure you want to delete this task?',
                            confirmText: 'Delete',
                            type: 'danger',
                            onConfirm: () => onDeleteTask(task.id)
                          });
                        }}
                        onUpdate={(title) => onUpdateTask(task.id, { title })}
                        disabled={isFutureDate(selectedDate)}
                      />
                    ))}
                  </div>
                ) : (
                  <div className="sidebar-empty">No other tasks</div>
                )}
              </div>
            </>
          )}
        </div>
      </div>


      <ConfirmationModal
        isOpen={confirmationModal.isOpen}
        onClose={() => setConfirmationModal(prev => ({ ...prev, isOpen: false }))}
        onConfirm={confirmationModal.onConfirm}
        title={confirmationModal.title}
        message={confirmationModal.message}
        confirmText={confirmationModal.confirmText}
        type={confirmationModal.type}
      />
    </div>
  );
}
