import { useLocalStorage } from './useLocalStorage';

/**
 * Custom hook for managing user settings
 * @returns {object} { settings, updateSettings, resetSettings }
 */
export function useSettings() {
  const defaultSettings = {
    theme: 'dark',  // Dark neon theme as default
    startOfWeek: 'sunday'
  };

  const [settings, setSettings] = useLocalStorage('habitgrid_settings', defaultSettings);

  /**
   * Update one or more settings
   * @param {object} updates - Object with setting keys to update
   */
  const updateSettings = (updates) => {
    setSettings(prev => ({
      ...prev,
      ...updates
    }));
  };

  /**
   * Reset settings to defaults
   */
  const resetSettings = () => {
    setSettings(defaultSettings);
  };

  /**
   * Toggle theme between light and dark
   */
  const toggleTheme = () => {
    updateSettings({ theme: settings.theme === 'light' ? 'dark' : 'light' });
  };

  return {
    settings,
    updateSettings,
    resetSettings,
    toggleTheme
  };
}
