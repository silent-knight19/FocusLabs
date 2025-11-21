import React, { useState } from 'react';
import { downloadDataAsJson, importData, clearAllData } from '../utils/storageHelpers';
import './styles/SettingsPanel.css';

/**
 * Settings panel for theme, preferences, and data management
 */
export function SettingsPanel({ isOpen, onClose, settings, onUpdateSettings }) {
  const [importError, setImportError] = useState('');
  const [showClearConfirm, setShowClearConfirm] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');

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

  const handleClearData = () => {
    clearAllData();
    setShowClearConfirm(false);
    setSuccessMessage('All data cleared! Refreshing page...');
    setTimeout(() => {
      window.location.reload();
    }, 1000);
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
