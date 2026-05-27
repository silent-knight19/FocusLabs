import React, { useState } from 'react';
import { doc, deleteDoc, getDoc, getDocs, setDoc, collection } from 'firebase/firestore';
import { db } from '../config/firebase';
import { useAuth } from '../contexts/AuthContext';
import { useStopwatchHistory } from '../contexts/StopwatchHistoryContext';
import { validateImportData, clearAllData } from '../utils/storageHelpers';
import { useLockBodyScroll } from '../hooks/useLockBodyScroll';
import { formatDateKey } from '../utils/dateHelpers';
import { mergeMonthlyShards, shardCompletionsByMonth, dateKeyToMonthKey } from '../utils/monthKeyHelpers';
import { normalizeSessionList, mergeUniqueSessions, normalizeFocusCategory, isStudySession, isProductiveSession } from '../utils/focusSessionHelpers';
import { ButtonWithTooltip } from './ButtonWithTooltip';
import { LogOut } from 'lucide-react';
import './styles/SettingsPanel.css';

const DEBUG = import.meta.env.DEV;
const logError = DEBUG ? console.error : () => {};

async function deleteSubcollectionDocs(userId, subcollectionName) {
  const snap = await getDocs(collection(db, 'users', userId, subcollectionName));
  await Promise.all(snap.docs.map((snapshotDoc) => deleteDoc(snapshotDoc.ref)));
}

function groupTasksByMonth(tasks) {
  const byMonth = {};

  tasks.forEach((task) => {
    if (!task?.date) return;
    const monthKey = dateKeyToMonthKey(task.date) || task.date.slice(0, 7);
    if (!byMonth[monthKey]) byMonth[monthKey] = [];
    byMonth[monthKey].push(task);
  });

  return byMonth;
}

function groupSessionsByMonth(sessions) {
  const byMonth = {};

  sessions.forEach((session) => {
    if (!session?.date) return;
    const monthKey = dateKeyToMonthKey(session.date.slice(0, 10)) || session.date.slice(0, 7);
    if (!byMonth[monthKey]) byMonth[monthKey] = [];
    byMonth[monthKey].push(session);
  });

  return byMonth;
}

function getUnifiedStopwatchHistory(data, firestoreFlat = {}) {
  return mergeUniqueSessions(
    normalizeSessionList(data?.stopwatchHistory),
    normalizeSessionList(firestoreFlat.stopwatch_history),
    normalizeSessionList(data?.studySessions ?? firestoreFlat.study_sessions, { fallbackCategory: 'study' }),
    normalizeSessionList(data?.productivitySessions ?? firestoreFlat.productivity_sessions, { fallbackCategory: 'prod' })
  );
}

/**
 * Settings panel for theme, preferences, and data management
 */
export function SettingsPanel({ isOpen, onClose, settings, onUpdateSettings }) {
  useLockBodyScroll(isOpen);
  const { user, signOut } = useAuth();
  const userId = user?.uid;
  const { history, setHistory, flushNow } = useStopwatchHistory();

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

      if (!userId) {
        setSuccessMessage('Sign in to export your data.');
        return;
      }

      // ---- Flat collections: still stored at users/{uid}/data/{colName} ----
      const flatCollectionNames = [
        'habits', 'subtasks', 'subtask_completions', 'stopwatch_history',
        'settings', 'notes', 'custom_habits', 'custom_subtasks',
        'completions', 'custom_completions', 'daily_tasks',
        'custom_subtask_completions', 'study_sessions', 'productivity_sessions', 'goals'
      ];

      const firestoreFlat = {};
      await Promise.all(flatCollectionNames.map(async (colName) => {
        try {
          const docRef = doc(db, 'users', userId, 'data', colName);
          const docSnap = await getDoc(docRef);
          firestoreFlat[colName] = docSnap.exists() ? docSnap.data().value : null;
        } catch (err) {
          logError(`Error fetching ${colName}:`, err);
          firestoreFlat[colName] = null;
        }
      }));

      // ---- Sharded: completions → users/{uid}/completions/{YYYY-MM} ----
      let mergedCompletions = {};
      try {
        const snap = await getDocs(collection(db, 'users', userId, 'completions'));
        const shards = {};
        snap.forEach(d => { shards[d.id] = d.data().habits || {}; });
        mergedCompletions = Object.keys(shards).length > 0
          ? mergeMonthlyShards(shards)
          : (firestoreFlat.completions || {});
      } catch (err) {
        logError('Error fetching completions shards:', err);
        mergedCompletions = firestoreFlat.completions || {};
      }

      // ---- Sharded: custom_completions → users/{uid}/custom_completions/{YYYY-MM} ----
      let mergedCustomCompletions = {};
      try {
        const snap = await getDocs(collection(db, 'users', userId, 'custom_completions'));
        const shards = {};
        snap.forEach(d => { shards[d.id] = d.data().habits || {}; });
        mergedCustomCompletions = Object.keys(shards).length > 0
          ? mergeMonthlyShards(shards)
          : (firestoreFlat.custom_completions || {});
      } catch (err) {
        logError('Error fetching custom_completions shards:', err);
        mergedCustomCompletions = firestoreFlat.custom_completions || {};
      }

      // ---- Sharded: daily_tasks → users/{uid}/daily_tasks/{YYYY-MM} ----
      let mergedDailyTasks = [];
      try {
        const snap = await getDocs(collection(db, 'users', userId, 'daily_tasks'));
        snap.forEach(d => { mergedDailyTasks.push(...(d.data().tasks || [])); });
        // Fall back to legacy path if no shards exist yet
        if (mergedDailyTasks.length === 0 && Array.isArray(firestoreFlat.daily_tasks)) {
          mergedDailyTasks = firestoreFlat.daily_tasks;
        }
      } catch (err) {
        logError('Error fetching daily_tasks shards:', err);
      }

      // ---- Sharded: stopwatch → users/{uid}/stopwatch/{YYYY-MM} ----
      let mergedStopwatch = getUnifiedStopwatchHistory(null, firestoreFlat);
      try {
        const snap = await getDocs(collection(db, 'users', userId, 'stopwatch'));
        const shardedSessions = normalizeSessionList(
          snap.docs.flatMap((snapshotDoc) => snapshotDoc.data().sessions || [])
        );
        mergedStopwatch = mergeUniqueSessions(shardedSessions, mergedStopwatch);
      } catch (err) {
        logError('Error fetching stopwatch shards:', err);
      }

      const exportData = {
        version: '2.0.0',
        exportDate: new Date().toISOString(),
        appName: 'FocusLabs',
        userId,
        data: {
          habits: firestoreFlat.habits || [],
          completions: mergedCompletions,
          subtasks: firestoreFlat.subtasks || [],
          subtaskCompletions: firestoreFlat.subtask_completions || {},
          stopwatchHistory: mergedStopwatch,
          dailyTasks: mergedDailyTasks,
          notes: firestoreFlat.notes || [],
          customHabits: firestoreFlat.custom_habits || [],
          customCompletions: mergedCustomCompletions,
          studySessions: normalizeSessionList(firestoreFlat.study_sessions, { fallbackCategory: 'study' }),
          productivitySessions: normalizeSessionList(firestoreFlat.productivity_sessions, { fallbackCategory: 'prod' }),
          settings: firestoreFlat.settings || {},
          goals: firestoreFlat.goals || [],
          customSubtasks: firestoreFlat.custom_subtasks || [],
          customSubtaskCompletions: firestoreFlat.custom_subtask_completions || {}
        },
        exportSummary: {
          totalHabits: (firestoreFlat.habits || []).length,
          totalCustomHabits: (firestoreFlat.custom_habits || []).length,
          totalGoals: (firestoreFlat.goals || []).length,
          totalDailyTasks: mergedDailyTasks.length,
          totalStopwatchSessions: mergedStopwatch.length
        }
      };

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
      logError('Export error:', error);
      alert('Failed to export data: ' + error.message);
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
          const unifiedStopwatchHistory = getUnifiedStopwatchHistory(importedData);

          // ---- Flat collections → users/{uid}/data/{colName} ----
          const flatMapping = {
            habits: 'habits',
            subtasks: 'subtasks',
            subtaskCompletions: 'subtask_completions',
            notes: 'notes',
            customHabits: 'custom_habits',
            customSubtasks: 'custom_subtasks',
            customSubtaskCompletions: 'custom_subtask_completions',
            studySessions: 'study_sessions',
            productivitySessions: 'productivity_sessions',
            settings: 'settings',
            goals: 'goals'
          };

          let hasError = false;

          const flatCollectionsToReset = [
            'habits', 'subtasks', 'subtask_completions', 'notes',
            'custom_habits', 'custom_subtasks', 'custom_subtask_completions',
            'study_sessions', 'productivity_sessions', 'settings', 'goals',
            'completions', 'custom_completions', 'daily_tasks', 'stopwatch_history'
          ];

          const flatWrites = [
            ...flatCollectionsToReset.map((colName) =>
              deleteDoc(doc(db, 'users', userId, 'data', colName)).catch(() => {})
            ),
            ...Object.entries(flatMapping).map(async ([jsonKey, colName]) => {
              const dataToWrite = importedData[jsonKey];
              if (dataToWrite === undefined || dataToWrite === null) return;
              try {
                await setDoc(doc(db, 'users', userId, 'data', colName), { value: dataToWrite });
              } catch (err) {
                logError(`Error importing ${colName}:`, err);
                hasError = true;
              }
            })
          ];

          const subcollectionsToReset = ['completions', 'custom_completions', 'daily_tasks', 'stopwatch'];
          await Promise.all(
            subcollectionsToReset.map((subcollectionName) =>
              deleteSubcollectionDocs(userId, subcollectionName).catch((err) => {
                logError(`Error clearing ${subcollectionName} before import:`, err);
                hasError = true;
              })
            )
          );

          // ---- Sharded: completions → users/{uid}/completions/{YYYY-MM} ----
          const shardedWrites = [];

          if (importedData.completions && typeof importedData.completions === 'object') {
            const shards = shardCompletionsByMonth(importedData.completions);
            for (const [monthKey, monthData] of Object.entries(shards)) {
              shardedWrites.push(
                setDoc(
                  doc(db, 'users', userId, 'completions', monthKey),
                  { habits: monthData, _v: Date.now() }
                ).catch(err => { logError(`Error importing completions/${monthKey}:`, err); hasError = true; })
              );
            }
          }

          // ---- Sharded: custom_completions → users/{uid}/custom_completions/{YYYY-MM} ----
          if (importedData.customCompletions && typeof importedData.customCompletions === 'object') {
            const shards = shardCompletionsByMonth(importedData.customCompletions);
            for (const [monthKey, monthData] of Object.entries(shards)) {
              shardedWrites.push(
                setDoc(
                  doc(db, 'users', userId, 'custom_completions', monthKey),
                  { habits: monthData, _v: Date.now() }
                ).catch(err => { logError(`Error importing custom_completions/${monthKey}:`, err); hasError = true; })
              );
            }
          }

          // ---- Sharded: daily_tasks → users/{uid}/daily_tasks/{YYYY-MM} ----
          if (importedData.dailyTasks && Array.isArray(importedData.dailyTasks)) {
            const byMonth = groupTasksByMonth(importedData.dailyTasks);
            for (const [monthKey, tasks] of Object.entries(byMonth)) {
              shardedWrites.push(
                setDoc(
                  doc(db, 'users', userId, 'daily_tasks', monthKey),
                  { tasks, _v: Date.now() }
                ).catch(err => { logError(`Error importing daily_tasks/${monthKey}:`, err); hasError = true; })
              );
            }
          }

          // ---- Sharded: stopwatch → users/{uid}/stopwatch/{YYYY-MM} ----
          if (unifiedStopwatchHistory.length > 0) {
            const byMonth = groupSessionsByMonth(unifiedStopwatchHistory);
            for (const [monthKey, sessions] of Object.entries(byMonth)) {
              shardedWrites.push(
                setDoc(
                  doc(db, 'users', userId, 'stopwatch', monthKey),
                  { sessions, _v: Date.now() }
                ).catch(err => { logError(`Error importing stopwatch/${monthKey}:`, err); hasError = true; })
              );
            }
          }

          await Promise.all([...flatWrites, ...shardedWrites]);

          if (hasError) {
            setImportError('Some data collections failed to import. Check console for details.');
            return;
          }
        }

        setImportError('');
        setSuccessMessage('Data imported successfully! Refreshing page...');
        setTimeout(() => { window.location.reload(); }, 1500);
      } catch (err) {
        logError('Import error:', err);
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
        if (categoryKey === 'study') return isStudySession(lap);
        if (categoryKey === 'prod') return normalizeFocusCategory(lap.category, lap.label) === 'prod';
        if (categoryKey === 'self') return normalizeFocusCategory(lap.category, lap.label) === 'self';
        return isProductiveSession(lap);
      };

      let filtered;
      if (windowType === 'day') {
        const todayKey = formatDateKey(now);
        filtered = history.filter(lap => {
          if (!matchesCategory(lap)) return true;
          const lapDateKey = formatDateKey(new Date(lap.date));
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
      // Force an immediate Firestore write so the deletion persists even if
      // the user closes the tab before the 2-second debounce fires.
      if (flushNow) flushNow();

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
      logError('Error clearing focus time', e);
      alert('Failed to clear focus sessions');
    }
  };

  const handleClearData = async () => {
    try {
      if (userId) {
        // 1. Clear flat documents at users/{uid}/data/{colName}
        const flatCollections = [
          'habits', 'completions', 'subtasks', 'subtask_completions',
          'stopwatch_history', 'settings', 'daily_tasks', 'notes',
          'custom_habits', 'custom_completions', 'custom_subtasks',
          'custom_subtask_completions', 'goals', 'study_sessions', 'productivity_sessions'
        ];

        const flatDeletes = flatCollections.map(colName =>
          deleteDoc(doc(db, 'users', userId, 'data', colName)).catch(() => {})
        );

        // 2. Clear monthly shard subcollections where real data now lives
        const shardedSubcollections = ['completions', 'custom_completions', 'daily_tasks', 'stopwatch'];

        const shardDeletes = shardedSubcollections.map(async (subColName) => {
          try {
            await deleteSubcollectionDocs(userId, subColName);
          } catch (err) {
            logError(`Error clearing ${subColName} shards:`, err);
          }
        });

        await Promise.all([...flatDeletes, ...shardDeletes]);
      }

      // 3. Clear Local Storage
      clearAllData();

      setShowClearConfirm(false);
      setSuccessMessage('All data cleared from Cloud & Local! Refreshing...');

      setTimeout(() => { window.location.reload(); }, 1500);
    } catch (error) {
      logError('Error clearing data:', error);
      alert('Failed to clear data: ' + error.message);
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
