import React from 'react';
import { getDayName, formatDateDisplay } from '../utils/dateHelpers';
import './styles/GridHeader.css';

/**
 * Header row showing days of the week
 */
export function GridHeader({ weekDates }) {
  // Get month and year from the first date in weekDates
  const firstDate = weekDates[0];
  const monthYear = firstDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });

  return (
    <div className="grid-header">
      <div className="grid-header-cell habit-name-cell">
        <span className="header-label">Habit</span>
      </div>
      <div className="grid-header-cell month-label-cell">
        <span className="header-label">{monthYear}</span>
      </div>
    </div>
  );
}
