import React from 'react';
import { GridHeader } from './GridHeader';
import { CustomHabitRow } from './CustomHabitRow';
import { Calendar, Plus } from 'lucide-react';
import './styles/CustomDateView.css';

/**
 * Dedicated view for custom date habits
 * Shows only custom habits in a grid format similar to month view
 */
export function CustomDateView({ 
  customHabits,
  weekDates,
  onToggleCustom,
  onEditCustomHabit,
  onDeleteCustomHabit,
  getCustomCompletionStatus,
  onAddCustomHabit,
  formatDateRange
}) {
  const sortedCustomHabits = [...customHabits].sort((a, b) => a.order - b.order);

  return (
    <div className="custom-date-view">
      <div className="custom-date-header">
        <div className="header-left">
          <Calendar size={24} className="header-icon" />
          <h2>Custom Date Habits</h2>
        </div>
        <button 
          className="add-custom-habit-btn"
          onClick={onAddCustomHabit}
        >
          <Plus size={18} />
          <span>Add Custom Date Habit</span>
        </button>
      </div>

      {customHabits.length === 0 ? (
        <div className="custom-date-empty">
          <div className="empty-icon">📅</div>
          <h3>No Custom Date Habits</h3>
          <p>Create habits for specific date ranges when your routine differs from the monthly plan.</p>
          <button 
            className="empty-add-btn"
            onClick={onAddCustomHabit}
          >
            <Plus size={18} />
            Create Your First Custom Habit
          </button>
        </div>
      ) : (
        <div className="custom-date-grid">
          <div className="custom-grid-container">
            <GridHeader weekDates={weekDates} />
            <div className="custom-habits-list">
              {sortedCustomHabits.map(habit => (
                <CustomHabitRow
                  key={habit.id}
                  habit={habit}
                  weekDates={weekDates}
                  onToggle={onToggleCustom}
                  onEdit={onEditCustomHabit}
                  onDelete={onDeleteCustomHabit}
                  getStatus={getCustomCompletionStatus}
                  formatDateRange={formatDateRange}
                />
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
