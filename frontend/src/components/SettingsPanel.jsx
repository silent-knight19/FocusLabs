import React, { useState } from 'react';
import { useFirestore } from '../hooks/useFirestore';
import { doc, deleteDoc } from 'firebase/firestore';
import { db } from '../config/firebase';
import { useAuth } from '../contexts/AuthContext';
import { downloadDataAsJson, importData, clearAllData } from '../utils/storageHelpers';
import { useLockBodyScroll } from '../hooks/useLockBodyScroll';
import './styles/SettingsPanel.css';

/**
 * Settings panel for theme, preferences, and data management
 */
export function SettingsPanel({ isOpen, onClose, settings, onUpdateSettings }) {
  useLockBodyScroll(isOpen);
  const { user } = useAuth();
  const userId = user?.uid;
  const [history, setHistory] = useFirestore(userId, 'stopwatch_history', []);

  const [importError, setImportError] = useState('');
  const [showClearConfirm, setShowClearConfirm] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [focusCategory, setFocusCategory] = useState('study');
  const [showFocusDeletePanel, setShowFocusDeletePanel] = useState(false);
  const [focusDeleteRange, setFocusDeleteRange] = useState(null); // 10 | 30 | 60 | 120 | 180 | 'day'
  const [showFocusConfirm, setShowFocusConfirm] = useState(false);

  const handleThemeToggle = () => {
    onUpdateSettings({ theme: settings.theme === 'light' ? 'dark' : 'light' });
  };

  const handleStartOfWeekChange = (value) => {
    onUpdateSettings({ startOfWeek: value });
  };

  const handleExport = () => {
    downloadDataAsJson();
    setSuccessMessage('Data exported successfully!');
    setTimeout(() => setSuccessMessage(''), 3000);
  };

  const handleImport = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const result = importData(event.target.result);
      if (result.success) {
        setImportError('');
        setSuccessMessage('Data imported successfully! Refreshing page...');
        setTimeout(() => {
          window.location.reload();
        }, 1000);
      } else {
        setImportError(result.error);
        setSuccessMessage('');
      }
    };
    reader.readAsText(file);
  };

  const handleClearFocusTime = (windowType) => {
    try {
      if (!Array.isArray(history) || history.length === 0) {
        setSuccessMessage('No focus time found to delete.');
        setTimeout(() => setSuccessMessage(''), 2500);
        return;
      }

      const now = new Date();
      const categoryKey = focusCategory; // 'study' | 'prod' | 'self'

      const matchesCategory = (lap) => {
        if (!lap) return false;
        const label = (lap.label || '').toLowerCase();

        if (categoryKey === 'study') {
          // Study analytics sometimes key off label containing "study"
          return lap.category === 'study' || label.includes('study');
        }

        if (categoryKey === 'prod') {
          return lap.category === 'prod';
        }

        if (categoryKey === 'self') {
          // Self-growth often uses category 'self' or label containing 'self'
          return lap.category === 'self' || label.includes('self');
        }

        return false;
      };

      let filtered;
      if (windowType === 'day') {
        const todayKey = now.toISOString().split('T')[0];
        filtered = history.filter(lap => {
          if (!matchesCategory(lap)) return true;
          const lapDateKey = new Date(lap.date).toISOString().split('T')[0];
          return lapDateKey !== todayKey;
        });
      } else {
        const minutes = windowType; // 10 | 30 | 60
        const cutoff = now.getTime() - minutes * 60 * 1000;
        filtered = history.filter(lap => {
          if (!matchesCategory(lap)) return true;
          const ts = new Date(lap.date).getTime();
          return ts < cutoff;
        });
      }



      setHistory(filtered);
      // localStorage.setItem('habitgrid_lap_history', JSON.stringify(filtered));
      // window.dispatchEvent(new Event('habit-data-updated'));

      const labelMap = {
        study: 'Study',
        prod: 'Productive',
        self: 'Self-Growth'
      };

      const rangeLabel =
        windowType === 'day'
          ? 'today'
          : `last ${windowType} minutes`;

      setSuccessMessage(`Cleared ${labelMap[categoryKey] || 'focus'} time for ${rangeLabel}.`);
      setTimeout(() => setSuccessMessage(''), 3000);
    } catch (e) {
      console.error('Error clearing focus time', e);
      setImportError('Failed to clear focus time.');
      setTimeout(() => setImportError(''), 3000);
    }
  };

  const handleClearData = async () => {
    try {
      // 1. Clear Firestore Data
      if (userId) {
        const collections = [
          'habits', 
          'completions', 
          'subtasks', 
          'subtask_completions', 
          'stopwatch_history', 
          'settings', 
          'daily_tasks',
          'notes'
        ];
        
        await Promise.all(collections.map(colName => {
          const docRef = doc(db, 'users', userId, 'data', colName);
          return deleteDoc(docRef);
        }));
      }

      // 2. Clear Local Storage
      clearAllData();
      
      setShowClearConfirm(false);
      setSuccessMessage('All data cleared from Cloud & Local! Refreshing...');
      
      setTimeout(() => {
        window.location.reload();
      }, 1500);
    } catch (error) {
      console.error('Error clearing data:', error);
      setImportError('Failed to clear cloud data.');
    }
  };

  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content settings-panel" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>Settings</h2>
          <button
            type="button"
            className="modal-close"
            onClick={onClose}
            aria-label="Close settings"
          >
            ✕
          </button>
        </div>

        <div className="settings-content">
          {/* Theme Toggle */}
          <div className="setting-section">
            <h3>Appearance</h3>
            <div className="setting-item">
              <div className="setting-info">
                <label>Theme</label>
                <p className="setting-description">
                  Choose between light and dark mode
                </p>
              </div>
              <button
                type="button"
                className={`toggle-button ${settings.theme === 'dark' ? 'active' : ''}`}
                onClick={handleThemeToggle}
              >
                <span className="toggle-icon">
                  {settings.theme === 'light' ? '☀️' : '🌙'}
                </span>
                <span className="toggle-text">
                  {settings.theme === 'light' ? 'Light' : 'Dark'}
                </span>
              </button>
            </div>
          </div>

          {/* Week Start */}
          <div className="setting-section">
            <h3>Calendar</h3>
            <div className="setting-item">
              <div className="setting-info">
                <label>Start of Week</label>
                <p className="setting-description">
                  Choose which day starts the week
                </p>
              </div>
              <div className="radio-group">
                <label className="radio-label">
                  <input
                    type="radio"
                    name="startOfWeek"
                    value="sunday"
                    checked={settings.startOfWeek === 'sunday'}
                    onChange={(e) => handleStartOfWeekChange(e.target.value)}
                  />
                  Sunday
                </label>
                <label className="radio-label">
                  <input
                    type="radio"
                    name="startOfWeek"
                    value="monday"
                    checked={settings.startOfWeek === 'monday'}
                    onChange={(e) => handleStartOfWeekChange(e.target.value)}
                  />
                  Monday
                </label>
              </div>
            </div>
          </div>

          {/* Data Management */}
          <div className="setting-section">
            <h3>Data Management</h3>
            
            <div className="setting-item">
              <div className="setting-info">
                <label>Export Data</label>
                <p className="setting-description">
                  Download all your habits and data as JSON
                </p>
              </div>
              <button type="button" onClick={handleExport}>
                📥 Export
              </button>
            </div>

            <div className="setting-item">
              <div className="setting-info">
                <label>Import Data</label>
                <p className="setting-description">
                  Import habits from a JSON backup file
                </p>
              </div>
              <label className="file-input-label">
                📤 Import
                <input
                  type="file"
                  accept=".json"
                  onChange={handleImport}
                  style={{ display: 'none' }}
                />
              </label>
            </div>

            {importError && (
              <div className="error-banner">{importError}</div>
            )}

            <div className="setting-item">
              <div className="setting-info">
                <label>Delete Focus Time</label>
                <p className="setting-description">
                  Remove recorded stopwatch time for Study / Productive / Self-Growth. This updates all related analytics.
                </p>
              </div>
              <div className="focus-delete-wrapper">
                <button
                  type="button"
                  className="danger"
                  onClick={() => setShowFocusDeletePanel(prev => !prev)}
                >
                  {showFocusDeletePanel ? 'Hide Options' : 'Delete Focus Time'}
                </button>
              </div>
            </div>

            {showFocusDeletePanel && (
              <div className="focus-delete-panel">
                <div className="focus-delete-row">
                  <span className="focus-step-label">1. Choose category</span>
                  <div className="focus-category-toggle">
                    <button
                      type="button"
                      className={focusCategory === 'study' ? 'active' : ''}
                      onClick={() => setFocusCategory('study')}
                    >
                      Study
                    </button>
                    <button
                      type="button"
                      className={focusCategory === 'prod' ? 'active' : ''}
                      onClick={() => setFocusCategory('prod')}
                    >
                      Productive
                    </button>
                    <button
                      type="button"
                      className={focusCategory === 'self' ? 'active' : ''}
                      onClick={() => setFocusCategory('self')}
                    >
                      Self-Growth
                    </button>
                  </div>
                </div>

                <div className="focus-delete-row">
                  <span className="focus-step-label">2. Choose time range</span>
                  <div className="focus-range-grid">
                    {[10, 30, 60, 120, 180].map((m) => (
                      <button
                        key={m}
                        type="button"
                        className={focusDeleteRange === m ? 'range-active' : ''}
                        onClick={() => setFocusDeleteRange(m)}
                      >
                        Last {m} min
                      </button>
                    ))}
                    <button
                      type="button"
                      className={`danger-outline ${focusDeleteRange === 'day' ? 'range-active' : ''}`}
                      onClick={() => setFocusDeleteRange('day')}
                    >
                      Entire Day (Today)
                    </button>
                  </div>
                </div>

                <div className="focus-delete-row">
                  <span className="focus-step-label">3. Confirm delete</span>
                  <button
                    type="button"
                    className="danger full-width"
                    disabled={!focusDeleteRange}
                    onClick={() => setShowFocusConfirm(true)}
                  >
                    Delete Selected Focus Time
                  </button>
                </div>
              </div>
            )}

            {showFocusConfirm && (
              <div className="focus-confirm-overlay">
                <div className="focus-confirm-modal">
                  <h4>Confirm deletion</h4>
                  <p>
                    This will permanently delete recorded
                    {' '}
                    <strong>{focusCategory === 'study' ? 'Study' : focusCategory === 'prod' ? 'Productive' : 'Self-Growth'}</strong>
                    {' '}time for
                    {' '}
                    {focusDeleteRange === 'day' ? 'today' : `the last ${focusDeleteRange} minutes`}.
                  </p>
                  <div className="focus-confirm-actions">
                    <button
                      type="button"
                      className="danger"
                      onClick={() => {
                        handleClearFocusTime(focusDeleteRange);
                        setShowFocusConfirm(false);
                        setShowFocusDeletePanel(false);
                        setFocusDeleteRange(null);
                      }}
                    >
                      Yes, delete
                    </button>
                    <button
                      type="button"
                      onClick={() => setShowFocusConfirm(false)}
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              </div>
            )}

            <div className="setting-item">
              <div className="setting-info">
                <label>Clear All Data</label>
                <p className="setting-description">
                  Permanently delete all habits and data
                </p>
              </div>
              {!showClearConfirm ? (
                <button
                  type="button"
                  className="danger"
                  onClick={() => setShowClearConfirm(true)}
                >
                  🗑️ Clear All
                </button>
              ) : (
                <div className="confirm-actions">
                  <button
                    type="button"
                    className="danger"
                    onClick={handleClearData}
                  >
                    Confirm Delete
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowClearConfirm(false)}
                  >
                    Cancel
                  </button>
                </div>
              )}
            </div>
          </div>

          {successMessage && (
            <div className="success-banner">{successMessage}</div>
          )}
        </div>
      </div>
    </div>
  );
}
