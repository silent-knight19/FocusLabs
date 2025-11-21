import React from 'react';
import './styles/AddHabitButton.css';

/**
 * Button to trigger habit creation modal
 */
export function AddHabitButton({ onClick }) {
  return (
    <button 
      type="button"
      className="add-habit-button"
      onClick={onClick}
    >
      <span className="button-icon">+</span>
      <span className="button-text">Add Habit</span>
    </button>
  );
}
