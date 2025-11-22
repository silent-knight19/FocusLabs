import React from 'react';
import { DayCell } from './DayCell';
import './styles/HabitRow.css';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

/**
 * Individual habit row with name, time, and day cells
 */
export function HabitRow({ habit, weekDates, onToggle, onEdit, onDelete, getStatus }) {
  const { attributes, listeners, setNodeRef, transform, transition } = useSortable({ id: habit.id });
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    cursor: 'grab'
  };
  return (
    <div ref={setNodeRef} {...attributes} style={style} className="habit-row">
      <div className="habit-info">
        <div className="habit-name-section" {...listeners}>
          <div 
            className="habit-color-indicator" 
            style={{ backgroundColor: habit.color }}
          />
          <button
            type="button"
            className="habit-name-button"
            onClick={() => onEdit(habit)}
            title="Click to edit habit"
          >
            {habit.name}
          </button>
        </div>
        {habit.category && (
          <span className="habit-category">{habit.category}</span>
        )}
      </div>
      
      <div className="habit-time">
        {habit.startTime && habit.endTime 
          ? `${habit.startTime} - ${habit.endTime}`
          : habit.startTime || habit.time || '—'}
      </div>

      
      <div className="habit-days">
        {weekDates.map((date, index) => (
          <DayCell
            key={index}
            date={date}
            status={getStatus(habit.id, date)}
            onClick={() => onToggle(habit.id, date)}
          />
        ))}
      </div>
      
      <div className="habit-actions">
        <button
          type="button"
          className="action-button edit-button"
          onClick={() => onEdit(habit)}
          title="Edit habit"
        >
          ✎
        </button>
        <button
          type="button"
          className="action-button delete-button"
          onClick={() => onDelete(habit.id)}
          title="Delete habit"
        >
          🗑
        </button>
      </div>
    </div>
  );
}
