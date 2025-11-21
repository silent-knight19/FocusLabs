import React from 'react';
import { GridHeader } from './GridHeader';
import { HabitRow } from './HabitRow';
import './styles/HabitGrid.css';

/**
 * Main grid container displaying all habits and their weekly completion status
 */
export function HabitGrid({ 
  habits, 
  weekDates, 
  onToggle, 
  onEditHabit, 
  onDeleteHabit,
  getCompletionStatus 
}) {
  
  if (habits.length === 0) {
    return (
      <div className="habit-grid-empty">
        <div className="empty-state">
          <div className="empty-icon">📋</div>
          <h3>No habits yet</h3>
          <p className="text-secondary">Click "Add Habit" to create your first habit</p>
        </div>
      </div>
    );
  }

  return (
    <div className="habit-grid-container">
      <GridHeader weekDates={weekDates} />
      <div className="habit-grid-body">
        {habits.map(habit => (
          <HabitRow
            key={habit.id}
            habit={habit}
            weekDates={weekDates}
            onToggle={onToggle}
            onEdit={onEditHabit}
            onDelete={onDeleteHabit}
            getStatus={getCompletionStatus}
          />
        ))}
      </div>
    </div>
  );
}
