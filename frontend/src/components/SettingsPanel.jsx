import React, { useState, useRef } from 'react';
import { doc, deleteDoc, getDoc, setDoc } from 'firebase/firestore';
import { db } from '../config/firebase';
import { useAuth } from '../contexts/AuthContext';
import { useStopwatchHistory } from '../contexts/StopwatchHistoryContext';
import { validateImportData, clearAllData } from '../utils/storageHelpers';
import { useLockBodyScroll } from '../hooks/useLockBodyScroll';
import { ButtonWithTooltip } from './ButtonWithTooltip';
import { LogOut } from 'lucide-react';
import './styles/SettingsPanel.css';

/**
 * Settings panel for theme, preferences, and data management
 */
export function SettingsPanel({ isOpen, onClose, settings, onUpdateSettings }) {
  useLockBodyScroll(isOpen);
  const { user, signOut } = useAuth();
  const userId = user?.uid;
  const { history, setHistory } = useStopwatchHistory();

  const [importError, setImportError] = useState('');

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
  const [showClearConfirm, setShowClearConfirm] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [focusCategory, setFocusCategory] = useState('study');
  const [showFocusDeletePanel, setShowFocusDeletePanel] = useState(false);
  const [focusDeleteRange, setFocusDeleteRange] = useState(null); // 10 | 30 | 60 | 120 | 180 | 'day'
  const [showFocusConfirm, setShowFocusConfirm] = useState(false);

  const handleStartOfWeekChange = (value) => {
    onUpdateSettings({ startOfWeek: value });
  };

  const handleExport = async () => {
    try {
      setSuccessMessage('Exporting data...');
      
      // Fetch all data from Firestore
      const collections = [
        'habits', 
        'completions', 
        'subtasks', 
        'subtask_completions', 
        'stopwatch_history', 
        'settings', 
        'daily_tasks',
        'notes',
        'custom_habits',
        'custom_completions',
        'study_sessions',
        'productivity_sessions'
      ];
      
      const firestoreData = {};
      
      if (userId) {
        // Fetch from Firestore for logged-in users
        await Promise.all(collections.map(async (colName) => {
          try {
            const docRef = doc(db, 'users', userId, 'data', colName);
            const docSnap = await getDoc(docRef);
            if (docSnap.exists()) {
              firestoreData[colName] = docSnap.data();
            } else {
              firestoreData[colName] = null;
            }
          } catch (err) {
            console.error(`Error fetching ${colName}:`, err);
            firestoreData[colName] = null;
          }
        }));
      }
      
      // Also get localStorage data (for anonymous users or fallback)
      const localData = {
        habits: localStorage.getItem('habitgrid_habits') || '[]',
        completions: localStorage.getItem('habitgrid_completions') || '{}',
        customHabits: localStorage.getItem('custom_habits') || '[]',
        customCompletions: localStorage.getItem('custom_completions') || '{}',
        customSubtasks: localStorage.getItem('custom_subtasks') || '{}',
        dailyTasks: localStorage.getItem('daily_tasks') || '{}',
        studySessions: localStorage.getItem('study_sessions') || '[]',
        productivitySessions: localStorage.getItem('productivity_sessions') || '[]',
        stopwatchLaps: localStorage.getItem('stopwatch_laps') || '[]',
        stopwatchCategories: localStorage.getItem('stopwatch_categories') || '[]',
        settings: localStorage.getItem('habitgrid_settings') || '{}'
      };
      
      // Combine all data
      const exportData = {
        version: '2.0.0',
        exportDate: new Date().toISOString(),
        appName: 'FocusLabs',
        userId: userId || 'anonymous',
        data: {
          // Firestore data (prioritized) — stored under 'value' key by useFirestore hook
          habits: firestoreData.habits?.value || JSON.parse(localData.habits),
          completions: firestoreData.completions?.value || JSON.parse(localData.completions),
          subtasks: firestoreData.subtasks?.value || {},
          subtaskCompletions: firestoreData.subtask_completions?.value || {},
          stopwatchHistory: firestoreData.stopwatch_history?.value || [],
          dailyTasks: firestoreData.daily_tasks?.value || JSON.parse(localData.dailyTasks),
          notes: firestoreData.notes?.value || [],
          customHabits: firestoreData.custom_habits?.value || JSON.parse(localData.customHabits),
          customCompletions: firestoreData.custom_completions?.value || JSON.parse(localData.customCompletions),
          studySessions: firestoreData.study_sessions?.value || JSON.parse(localData.studySessions),
          productivitySessions: firestoreData.productivity_sessions?.value || JSON.parse(localData.productivitySessions),
          settings: firestoreData.settings?.value || JSON.parse(localData.settings),
          
          // LocalStorage only data
          stopwatchLaps: JSON.parse(localData.stopwatchLaps),
          stopwatchCategories: JSON.parse(localData.stopwatchCategories),
          customSubtasks: JSON.parse(localData.customSubtasks)
        },
        exportSummary: {
          totalHabits: (firestoreData.habits?.value || JSON.parse(localData.habits)).length,
          totalCustomHabits: (firestoreData.custom_habits?.value || JSON.parse(localData.customHabits)).length,
          totalStudySessions: (firestoreData.study_sessions?.value || JSON.parse(localData.studySessions)).length,
          totalProductivitySessions: (firestoreData.productivity_sessions?.value || JSON.parse(localData.productivitySessions)).length,
          totalStopwatchLaps: JSON.parse(localData.stopwatchLaps).length
        }
      };
      
      // Create and download the JSON file
      const dataStr = JSON.stringify(exportData, null, 2);
      const blob = new Blob([dataStr], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `focuslabs_backup_${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      
      setSuccessMessage('Data exported successfully!');
      setTimeout(() => setSuccessMessage(''), 3000);
    } catch (error) {
      console.error('Export error:', error);
      setImportError('Failed to export data. Please try again.');
      setTimeout(() => setImportError(''), 3000);
    }
  };

  const handleImport = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const parsed = JSON.parse(event.target.result);
        const importedData = parsed.data || parsed;

        const validation = validateImportData(parsed);
        if (!validation.valid) {
          setImportError(validation.error || 'Invalid import data.');
          return;
        }

        if (!importedData || typeof importedData !== 'object') {
          setImportError('Invalid JSON structure.');
          return;
        }

        setSuccessMessage('Importing data...');

        if (userId) {
          // Map exported JSON keys → Firestore collection names
          const firestoreMapping = {
            habits: 'habits',
            completions: 'completions',
            subtasks: 'subtasks',
            subtaskCompletions: 'subtask_completions',
            stopwatchHistory: 'stopwatch_history',
            dailyTasks: 'daily_tasks',
            notes: 'notes',
            customHabits: 'custom_habits',
            customCompletions: 'custom_completions',
            studySessions: 'study_sessions',
            productivitySessions: 'productivity_sessions',
            settings: 'settings'
          };

          // Write each collection to Firestore with { value: data } structure
          const writePromises = Object.entries(firestoreMapping).map(
            async ([jsonKey, firestoreCollection]) => {
              const dataToWrite = importedData[jsonKey];
              if (dataToWrite === undefined || dataToWrite === null) return;

              try {
                const docRef = doc(db, 'users', userId, 'data', firestoreCollection);
                await setDoc(docRef, { value: dataToWrite }, { merge: true });
              } catch (err) {
                console.error(`Error importing ${firestoreCollection}:`, err);
              }
            }
          );

          await Promise.all(writePromises);
        }

        // Also write localStorage-only data as fallback
        if (importedData.stopwatchLaps) {
          localStorage.setItem('stopwatch_laps', JSON.stringify(importedData.stopwatchLaps));
        }
        if (importedData.stopwatchCategories) {
          localStorage.setItem('stopwatch_categories', JSON.stringify(importedData.stopwatchCategories));
        }
        if (importedData.customSubtasks) {
          localStorage.setItem('custom_subtasks', JSON.stringify(importedData.customSubtasks));
        }

        setImportError('');
        setSuccessMessage('Data imported successfully! Refreshing page...');
        setTimeout(() => {
          window.location.reload();
        }, 1500);
      } catch (err) {
        console.error('Import error:', err);
        setImportError('Invalid JSON format. Please check the file.');
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
          <ButtonWithTooltip tooltipText="Close settings panel">
            <button
              type="button"
              className="modal-close"
              onClick={onClose}
              aria-label="Close settings"
            >
              ✕
            </button>
          </ButtonWithTooltip>
        </div>

        <div className="settings-content">
          {user && (
            <div className="setting-section">
              <h3>Account</h3>
              <div className="setting-item" style={{ alignItems: 'center' }}>
                <div className="setting-info" style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                  {user.photoURL ? (
                    <img
                      src={user.photoURL}
                      alt={user.displayName || 'User'}
                      style={{ width: '48px', height: '48px', borderRadius: '50%', objectFit: 'cover', border: '2px solid var(--accent-primary)' }}
                      referrerPolicy="no-referrer"
                    />
                  ) : (
                    <div style={{ width: '48px', height: '48px', borderRadius: '50%', background: 'var(--gradient-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'black', fontWeight: 'bold', fontSize: '1.2rem', boxShadow: '0 4px 15px rgba(255, 122, 89, 0.35)' }}>
                      {getUserInitials()}
                    </div>
                  )}
                  <div>
                    <div style={{ fontWeight: '600', color: 'var(--text-primary)', fontSize: '1.05rem', marginBottom: '2px' }}>{user.displayName || 'User'}</div>
                    <div style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>{user.email}</div>
                  </div>
                </div>
                <button
                  type="button"
                  className="danger-outline"
                  onClick={() => signOut()}
                  style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 16px', background: 'transparent' }}
                >
                  <LogOut size={16} />
                  <span>Sign Out</span>
                </button>
              </div>
            </div>
          )}

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
              <ButtonWithTooltip tooltipText="Download all data as JSON file">
                <button type="button" onClick={handleExport}>
                  📥 Export
                </button>
              </ButtonWithTooltip>
            </div>

            <div className="setting-item">
              <div className="setting-info">
                <label>Import Data</label>
                <p className="setting-description">
                  Import habits from a JSON backup file
                </p>
              </div>
              <ButtonWithTooltip tooltipText="Import data from JSON backup file">
                <label className="file-input-label">
                  📤 Import
                  <input
                    type="file"
                    accept=".json"
                    onChange={handleImport}
                    style={{ display: 'none' }}
                  />
                </label>
              </ButtonWithTooltip>
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
