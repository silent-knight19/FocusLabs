import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { Calendar, Timer, Settings, LogOut, User, Plus } from 'lucide-react';
import './styles/TopNav.css';
import { ButtonWithTooltip } from './ButtonWithTooltip';

/**
 * Top navigation bar with app name and settings
 */
export function TopNav({ onSettingsClick, onStopwatchClick, onCalendarClick, onAddHabitClick }) {
  const { user, signOut } = useAuth();
  const [currentTime, setCurrentTime] = useState(new Date());
  const [showUserMenu, setShowUserMenu] = useState(false);

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

  // Get user initials for fallback avatar
  const getUserInitials = () => {
    if (!user?.displayName) return user?.email?.[0]?.toUpperCase() || 'U';
    return user.displayName
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

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

        {user && (
          <div className="user-profile-container">
            <ButtonWithTooltip tooltipText="Open user menu">
              <button
                type="button"
                className="user-profile-btn"
                onClick={() => setShowUserMenu(!showUserMenu)}
              >
                {user.photoURL ? (
                  <img
                    src={user.photoURL}
                    alt={user.displayName || 'User'}
                    className="user-avatar"
                    referrerPolicy="no-referrer"
                  />
                ) : (
                  <div className="user-avatar-placeholder">
                    {getUserInitials()}
                  </div>
                )}
              </button>
            </ButtonWithTooltip>

            {showUserMenu && (
              <div className="user-menu">
                <div className="user-menu-header">
                  {user.photoURL ? (
                    <img
                      src={user.photoURL}
                      alt={user.displayName || 'User'}
                      className="user-menu-avatar"
                      referrerPolicy="no-referrer"
                    />
                  ) : (
                    <div className="user-menu-avatar-placeholder">
                      {getUserInitials()}
                    </div>
                  )}
                  <div className="user-menu-info">
                    <div className="user-menu-name">{user.displayName || 'User'}</div>
                    <div className="user-menu-email">{user.email}</div>
                  </div>
                </div>
                <ButtonWithTooltip tooltipText="Sign out of your account">
                  <button
                    type="button"
                    className="user-menu-signout"
                    onClick={() => {
                      setShowUserMenu(false);
                      signOut();
                    }}
                  >
                    <LogOut size={16} style={{ marginRight: '8px' }} />
                    Sign Out
                  </button>
                </ButtonWithTooltip>
              </div>
            )}
          </div>
        )}
      </div>
    </nav>
  );
}
