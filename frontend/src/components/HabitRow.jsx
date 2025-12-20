import React from 'react';
import { DayCell } from './DayCell';
import './styles/HabitRow.css';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

/**
 * Individual habit row with name, time, and day cells
 */
export function HabitRow({ habit, weekDates, onToggle, onEdit, onDelete, getStatus, isDateBlockedByCustom }) {
  const { attributes, listeners, setNodeRef, transform, transition } = useSortable({ id: habit.id });
  
  const CATEGORY_COLORS = {
    'Health': '#10B981',      // Green
    'Work': '#3B82F6',        // Blue
    'Learning': '#8B5CF6',    // Purple
    'Fitness': '#F59E0B',     // Amber
    'Personal': '#EC4899',    // Pink
    'Mindfulness': '#06B6D4', // Cyan
    'Finance': '#14B8A6',     // Teal
    'Social': '#F43F5E',      // Rose
  };

  const barColor = CATEGORY_COLORS[habit.category] || habit.color || '#FF6B35';

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
            style={{ backgroundColor: barColor }}
            title={habit.category || 'Category'}
          />
          <button
            type="button"
            className="habit-name-button"
            onClick={() => onEdit(habit)}
            title="Click to edit habit"
          >
            {habit.name}
          </button>
          
          <div className="habit-inline-actions">
            <button
              type="button"
              className="action-button edit-button"
              onClick={(e) => { 
                e.stopPropagation(); 
                onEdit(habit); 
              }}
              onPointerDown={(e) => e.stopPropagation()}
              title="Edit habit"
            >
              ✎
            </button>
            <button
              type="button"
              className="action-button delete-button"
              onClick={(e) => { 
                e.stopPropagation(); 
                onDelete(habit.id); 
              }}
              onPointerDown={(e) => e.stopPropagation()}
              title="Delete habit"
            >
              🗑
            </button>
          </div>
        </div>
        
        <div className="habit-meta">
          <span className="habit-time">
            {habit.startTime && habit.endTime 
              ? `${habit.startTime} - ${habit.endTime}`
              : habit.startTime || habit.time || 'Any time'}
          </span>
        </div>
      </div>
      
      <div className="habit-days">
        {weekDates.map((date, index) => {
          const isBlocked = isDateBlockedByCustom && isDateBlockedByCustom(date);
          return (
            <DayCell
              key={index}
              date={date}
              status={isBlocked ? null : getStatus(habit.id, date)}
              onClick={isBlocked ? undefined : () => onToggle(habit.id, date)}
              showNumber={true}
              blockedByCustom={isBlocked}
              disabled={isBlocked}
            />
          );
        })}
      </div>
    </div>
  );
}

