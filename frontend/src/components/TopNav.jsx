import React, { useState, useEffect } from 'react';
import { Calendar, Timer, Settings, Plus } from 'lucide-react';
import './styles/TopNav.css';
import { ButtonWithTooltip } from './ButtonWithTooltip';

/**
 * Top navigation bar with app name and settings
 */
export function TopNav({ onSettingsClick, onStopwatchClick, onCalendarClick, onAddHabitClick }) {
  const [currentTime, setCurrentTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Format Date: 21 November 2025
  const formattedDate = new Intl.DateTimeFormat('en-GB', {
    day: 'numeric',
    month: 'long',
    year: 'numeric'
  }).format(currentTime);

  // Format Time: 11:30 PM
  const formattedTime = new Intl.DateTimeFormat('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true
  }).format(currentTime);

  return (
    <nav className="top-nav">
      <div className="nav-left">
        <div className="app-logo-container">
          <img src="/logo.png" alt="FocusLabs Logo" className="app-logo-img" />
        </div>
      </div>
      
      <div className="nav-center">
        <div className="date-time-display">
          <div className="nav-date">{formattedDate}</div>
          <div className="nav-time">{formattedTime}</div>
        </div>
      </div>
      
      <div className="nav-right">
        <ButtonWithTooltip tooltipText="Add a new habit to track">
          <button
            type="button"
            className="nav-icon-btn add-habit-btn"
            onClick={onAddHabitClick}
          >
            <Plus size={18} />
            <span>Add Habit</span>
          </button>
        </ButtonWithTooltip>
        <ButtonWithTooltip tooltipText="View calendar">
          <button
            type="button"
            className="nav-icon-btn"
            onClick={onCalendarClick}
          >
            <Calendar size={20} />
          </button>
        </ButtonWithTooltip>
        <ButtonWithTooltip tooltipText="Open focus timer">
          <button
            type="button"
            className="nav-icon-btn"
            onClick={onStopwatchClick}
          >
            <Timer size={20} />
          </button>
        </ButtonWithTooltip>
        <ButtonWithTooltip tooltipText="Open settings">
          <button
            type="button"
            className="nav-icon-btn"
            onClick={onSettingsClick}
          >
            <Settings size={20} />
          </button>
        </ButtonWithTooltip>
      </div>
    </nav>
  );
}
