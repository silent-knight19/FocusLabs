/**
 * LocalStorage helper functions for data import/export
 */

/**
 * Export all HabitGrid data to JSON
 * @returns {string} JSON string of all data
 */
export function exportData() {
  const habits = localStorage.getItem('habitgrid_habits') || '[]';
  const completions = localStorage.getItem('habitgrid_completions') || '{}';
  const settings = localStorage.getItem('habitgrid_settings') || '{}';
  
  const data = {
    version: '1.0.0',
    exportDate: new Date().toISOString(),
    habits: JSON.parse(habits),
    completions: JSON.parse(completions),
    settings: JSON.parse(settings)
  };
  
  return JSON.stringify(data, null, 2);
}

/**
 * Download data as JSON file
 */
export function downloadDataAsJson() {
  const jsonData = exportData();
  const blob = new Blob([jsonData], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `habitgrid-backup-${new Date().toISOString().split('T')[0]}.json`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * Validate imported JSON structure
 * @param {object} data
 * @returns {object} { valid: boolean, error: string }
 */
export function validateImportData(data) {
  if (!data || typeof data !== 'object') {
    return { valid: false, error: 'Invalid JSON data' };
  }
  
  if (!Array.isArray(data.habits)) {
    return { valid: false, error: 'Missing or invalid habits array' };
  }
  
  if (typeof data.completions !== 'object') {
    return { valid: false, error: 'Missing or invalid completions object' };
  }
  
  // Validate habit structure
  for (const habit of data.habits) {
    if (!habit.id || !habit.name) {
      return { valid: false, error: 'Habit missing required fields (id, name)' };
    }
  }
  
  return { valid: true };
}

/**
 * Import data from JSON
 * @param {string} jsonString
 * @returns {object} { success: boolean, error?: string }
 */
export function importData(jsonString) {
  try {
    const data = JSON.parse(jsonString);
    const validation = validateImportData(data);
    
    if (!validation.valid) {
      return { success: false, error: validation.error };
    }
    
    // Import data to localStorage
    localStorage.setItem('habitgrid_habits', JSON.stringify(data.habits));
    localStorage.setItem('habitgrid_completions', JSON.stringify(data.completions));
    
    if (data.settings) {
      localStorage.setItem('habitgrid_settings', JSON.stringify(data.settings));
    }
    
    return { success: true };
  } catch (error) {
    return { success: false, error: 'Invalid JSON format' };
  }
}

/**
 * Clear all HabitGrid data from localStorage
 */
export function clearAllData() {
  localStorage.removeItem('habitgrid_habits');
  localStorage.removeItem('habitgrid_completions');
  localStorage.removeItem('habitgrid_settings');
}
