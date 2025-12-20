import React from 'react';
import { DayCell } from './DayCell';
import { Calendar } from 'lucide-react';
import './styles/CustomHabitRow.css';
import { formatDateKey } from '../utils/dateHelpers';

const CATEGORY_COLORS = {
  'Health': '#10B981',
  'Work': '#3B82F6',
  'Learning': '#8B5CF6',
  'Fitness': '#F59E0B',
  'Personal': '#EC4899',
  'Mindfulness': '#06B6D4',
  'Finance': '#14B8A6',
  'Social': '#F43F5E',
  'study': '#FF6B35',
  'productive': '#00FF9F',
  'self growth': '#FF0055'
};

/**
 * Row component for custom date habits in the month view
 * Shows habit info with date range badge and day cells only for applicable dates
 */
export function CustomHabitRow({ 
  habit, 
  weekDates, 
  onToggle, 
  onEdit, 
  onDelete, 
  getStatus,
  formatDateRange 
}) {
  const barColor = CATEGORY_COLORS[habit.category] || habit.color || '#FF6B35';
  
  const isDateInRange = (date) => {
    const dateKey = formatDateKey(date);
    return dateKey >= habit.dateFrom && dateKey <= habit.dateTo;
  };

  return (
    <div className="custom-habit-row">
      <div className="habit-info">
        <div className="habit-name-section">
          <div 
            className="habit-color-indicator custom" 
            style={{ backgroundColor: barColor }}
            title={habit.category || 'Category'}
          />
          <button
            type="button"
            className="habit-name-button"
            onClick={() => onEdit(habit)}
            title="Click to edit custom habit"
          >
            {habit.name}
          </button>
          
          {/* Date range badge */}
          <span className="date-range-badge">
            <Calendar size={12} />
            {formatDateRange(habit)}
          </span>
          
          <div className="habit-inline-actions">
            <button
              type="button"
              className="action-button edit-button"
              onClick={(e) => { 
                e.stopPropagation(); 
                onEdit(habit); 
              }}
              title="Edit custom habit"
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
              title="Delete custom habit"
            >
              🗑
            </button>
          </div>
        </div>
        
        <div className="habit-meta">
          <span className="habit-time">
            {habit.startTime && habit.endTime 
              ? `${habit.startTime} - ${habit.endTime}`
              : habit.startTime || 'Any time'}
          </span>
        </div>
      </div>
      
      <div className="habit-days">
        {weekDates.map((date, index) => {
          const inRange = isDateInRange(date);
          
          return (
            <DayCell
              key={index}
              date={date}
              status={inRange ? getStatus(habit.id, date) : null}
              onClick={inRange ? () => onToggle(habit.id, date) : undefined}
              showNumber={true}
              isCustomDate={inRange}
              disabled={!inRange}
            />
          );
        })}
      </div>
    </div>
  );
}
