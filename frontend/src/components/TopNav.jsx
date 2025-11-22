import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { Calendar, Timer, Settings, LogOut, User } from 'lucide-react';
import './styles/TopNav.css';

/**
 * Top navigation bar with app name and settings
 */
export function TopNav({ onSettingsClick, onStopwatchClick, onCalendarClick }) {
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
          <span className="app-logo-text">FocusLabs</span>
        </div>
      </div>
      
      <div className="nav-center">
        <div className="date-time-display">
          <div className="nav-date">{formattedDate}</div>
          <div className="nav-time">{formattedTime}</div>
        </div>
      </div>
      
      <div className="nav-right">
        <button
          type="button"
          className="nav-icon-btn"
          onClick={onCalendarClick}
          title="Calendar"
        >
          <Calendar size={20} />
        </button>
        <button
          type="button"
          className="nav-icon-btn"
          onClick={onStopwatchClick}
          title="Stopwatch"
        >
          <Timer size={20} />
        </button>
        <button
          type="button"
          className="nav-icon-btn"
          onClick={onSettingsClick}
          title="Settings"
        >
          <Settings size={20} />
        </button>

        {user && (
          <div className="user-profile-container">
            <button
              type="button"
              className="user-profile-btn"
              onClick={() => setShowUserMenu(!showUserMenu)}
              title={user.displayName || user.email}
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
              </div>
            )}
          </div>
        )}
      </div>
    </nav>
  );
}
