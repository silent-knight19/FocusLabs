import React from 'react';
import { getDayName, formatDateDisplay } from '../utils/dateHelpers';
import './styles/GridHeader.css';

/**
 * Header row showing days of the week
 */
export function GridHeader({ weekDates }) {
  return (
    <div className="grid-header">
      <div className="grid-header-cell habit-name-cell">
        <span className="header-label">Habit</span>
      </div>
      <div className="grid-header-cell time-cell">
        <span className="header-label">Time</span>
      </div>
      {weekDates.map((date, index) => (
        <div key={index} className="grid-header-cell day-cell">
          <div className="day-header-content">
            <span className="day-name">{getDayName(date)}</span>
            <span className="day-date">{formatDateDisplay(date)}</span>
          </div>
        </div>
      ))}
    </div>
  );
}
