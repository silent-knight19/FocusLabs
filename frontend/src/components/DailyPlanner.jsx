
import React from 'react';
import { DailyTaskPanel } from './DailyTaskPanel';
import { SubtaskList } from './SubtaskList';
import { ChevronLeft, ChevronRight, Calendar, Plus } from 'lucide-react';
import { formatDateKey } from '../utils/dateHelpers';
import './styles/DailyPlanner.css';
import './styles/DailyPlannerAddBtn.css';

/**
 * Main daily planner view component
 * Shows all habits with their daily tasks for a selected date
 * Now includes custom date habits that apply to the selected date
 */
export function DailyPlanner({
  habits,
  selectedDate,
  onDateChange,
  getDailyTasks,
  onAddTask,
  onToggleTask,
  onUpdateTask,
  onDeleteTask,
  getDailyCompletion,
  getDateCompletion,
  onAddHabit,
  // Custom habits props
  customHabits = [],
  customCompletions = {},
  toggleCustomCompletion,
  getCustomCompletionStatus,
  onAddCustomHabit,
  // Custom subtask props
  getCustomSubtasks,
  addCustomSubtask,
  deleteCustomSubtask,
  toggleCustomSubtaskCompletion,
  getCustomSubtaskStatus,
  getCustomSubtaskCompletionPercentage
}) {
  const handlePrevDay = () => {
    const newDate = new Date(selectedDate);
    newDate.setDate(newDate.getDate() - 1);
    onDateChange(newDate);
  };

  const handleNextDay = () => {
    const newDate = new Date(selectedDate);
    newDate.setDate(newDate.getDate() + 1);
    onDateChange(newDate);
  };

  const handleToday = () => {
    onDateChange(new Date());
  };

  const isToday = () => {
    const today = new Date();
    return formatDateKey(today) === formatDateKey(selectedDate);
  };

  const formatDisplayDate = (date) => {
    return date.toLocaleDateString('en-US', {
      weekday: 'long',
      month: 'long',
      day: 'numeric',
      year: 'numeric'
    });
  };

  // Filter custom habits that apply to selected date
  const dateKey = formatDateKey(selectedDate);
  const customHabitsForDate = customHabits.filter(habit => 
    dateKey >= habit.dateFrom && dateKey <= habit.dateTo
  );

  const dateCompletion = getDateCompletion(selectedDate);
  
  // Calculate combined totals including custom habits
  const customCompletedCount = customHabitsForDate.filter(
    habit => customCompletions[habit.id]?.[dateKey] === 'completed'
  ).length;
  const totalHabitsCount = habits.length + customHabitsForDate.length;

  return (
    <div className="daily-planner">
      {/* Header with date navigation */}
      <div className="planner-header">
        <div className="planner-header-left">
          <button 
            className="add-habit-btn-small"
            onClick={onAddHabit}
            title="Add new habit"
          >
            <Plus size={20} />
            <span>Add</span>
          </button>
        </div>

        <div className="date-navigation">
          <button
            type="button"
            className="nav-btn"
            onClick={handlePrevDay}
            title="Previous day"
          >
            <ChevronLeft size={20} />
          </button>

          <div className="date-display">
            <Calendar size={20} className="calendar-icon" />
            <h2 className="selected-date">
              {formatDateKey(selectedDate)}
            </h2>
            {isToday() && <span className="today-badge">Today</span>}
          </div>

          <button
            type="button"
            className="nav-btn"
            onClick={handleNextDay}
            title="Next day"
          >
            <ChevronRight size={20} />
          </button>
        </div>

        <button
          type="button"
          className={`today-btn ${isToday() ? 'disabled' : ''}`}
          onClick={handleToday}
          disabled={isToday()}
        >
          Today
        </button>
      </div>

      {/* Overall progress */}
      {dateCompletion.total > 0 && (
        <div className="overall-progress">
          <div className="progress-stats">
            <span className="progress-label">Daily Progress</span>
            <span className="progress-value">
              {dateCompletion.completed}/{dateCompletion.total} tasks completed
            </span>
          </div>
          <div className="overall-progress-bar">
            <div
              className="overall-progress-fill"
              style={{ width: `${dateCompletion.percentage}%` }}
            />
          </div>
        </div>
      )}

      {/* Regular Habit panels */}
      <div className="habit-panels">
        {habits.length === 0 && customHabitsForDate.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon">📋</div>
            <h3>No habits yet</h3>
            <p>Create your first habit to start planning your day</p>
          </div>
        ) : (
          <>
            {habits.map(habit => {
              const tasks = getDailyTasks(habit.id, selectedDate);
              const completion = getDailyCompletion(habit.id, selectedDate);

              return (
                <DailyTaskPanel
                  key={habit.id}
                  habit={habit}
                  date={selectedDate}
                  tasks={tasks}
                  onAddTask={onAddTask}
                  onToggleTask={onToggleTask}
                  onUpdateTask={onUpdateTask}
                  onDeleteTask={onDeleteTask}
                  completionPercentage={completion}
                />
              );
            })}
            
            {/* Custom Habits Section */}
            {customHabitsForDate.length > 0 && (
              <div className="custom-habits-daily-section">
                <div className="custom-section-header">
                  <Calendar size={16} />
                  <span>Custom Date Habits</span>
                </div>
                {customHabitsForDate.map(habit => {
                  const status = getCustomCompletionStatus(habit.id, selectedDate);
                  const subtasks = getCustomSubtasks ? getCustomSubtasks(habit.id) : [];
                  const completionPct = getCustomSubtaskCompletionPercentage ? 
                    getCustomSubtaskCompletionPercentage(habit.id, selectedDate) : 100;
                  
                  return (
                    <div key={habit.id} className="custom-habit-daily-card expanded">
                      <div className="custom-habit-header">
                        <div className="custom-habit-info">
                          <div 
                            className="habit-color-bar"
                            style={{ backgroundColor: habit.color || '#FF6B35' }}
                          />
                          <div className="habit-details">
                            <span className="habit-name">{habit.name}</span>
                            <span className="habit-time">
                              {habit.startTime && habit.endTime 
                                ? `${habit.startTime} - ${habit.endTime}`
                                : 'Any time'}
                            </span>
                          </div>
                        </div>
                        <div className="custom-habit-actions">
                          {subtasks.length > 0 && (
                            <span className="completion-badge">{completionPct}%</span>
                          )}
                          <button
                            className={`custom-toggle-btn ${status || ''}`}
                            onClick={() => toggleCustomCompletion(habit.id, selectedDate)}
                            title="Toggle completion"
                          >
                            {status === 'completed' ? '✓' : status === 'failed' ? '✕' : '○'}
                          </button>
                        </div>
                      </div>
                      
                      {/* Subtask List */}
                      {getCustomSubtasks && (
                        <SubtaskList
                          habitId={habit.id}
                          subtasks={subtasks}
                          onAddSubtask={addCustomSubtask}
                          onDeleteSubtask={deleteCustomSubtask}
                          onToggleSubtask={(hId, stId) => toggleCustomSubtaskCompletion(hId, stId, selectedDate)}
                          date={selectedDate}
                          getSubtaskStatus={(hId, stId) => getCustomSubtaskStatus(hId, stId, selectedDate)}
                        />
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </>
        )}
      </div>

      {/* Quick stats footer */}
      {totalHabitsCount > 0 && (
        <div className="planner-footer">
          <div className="quick-stats">
            <div className="stat-item">
              <span className="stat-value">{totalHabitsCount}</span>
              <span className="stat-label">Habits</span>
            </div>
            <div className="stat-divider">•</div>
            <div className="stat-item">
              <span className="stat-value">{dateCompletion.total}</span>
              <span className="stat-label">Tasks</span>
            </div>
            <div className="stat-divider">•</div>
            <div className="stat-item">
              <span className="stat-value">{dateCompletion.percentage}%</span>
              <span className="stat-label">Complete</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

