/**
 * LocalStorage helper functions for data import/export
 */

/**
 * Sanitize a string to prevent XSS - removes HTML tags and encodes special chars
 * @param {string} str
 * @returns {string}
 */
function sanitizeString(str) {
  if (typeof str !== 'string') return str;
  return str
    .replace(/&/g, '&amp;') // Encode & first to avoid double-encoding
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;')
    .trim();
}

/**
 * Sanitize habit data recursively
 * @param {object} data
 * @returns {object}
 */
function sanitizeHabitData(data) {
  if (!data || typeof data !== 'object') return data;

  const sanitized = { ...data };

  // Sanitize string fields
  if (sanitized.name) sanitized.name = sanitizeString(sanitized.name);
  if (sanitized.description) sanitized.description = sanitizeString(sanitized.description);
  if (sanitized.title) sanitized.title = sanitizeString(sanitized.title);
  if (sanitized.label) sanitized.label = sanitizeString(sanitized.label);

  // Recursively sanitize subtasks
  if (Array.isArray(sanitized.subtasks)) {
    sanitized.subtasks = sanitized.subtasks.map(st => sanitizeHabitData(st));
  }

  return sanitized;
}

/**
 * Export all HabitGrid data to JSON
 * @returns {string} JSON string of all data
 */
export function exportData() {
  // Core habit data
  const habits = localStorage.getItem('habitgrid_habits') || '[]';
  const completions = localStorage.getItem('habitgrid_completions') || '{}';
  const settings = localStorage.getItem('habitgrid_settings') || '{}';
  
  // Study and productivity sessions
  const studySessions = localStorage.getItem('study_sessions') || '[]';
  const productivitySessions = localStorage.getItem('productivity_sessions') || '[]';
  
  // Custom habits and their completions
  const customHabits = localStorage.getItem('custom_habits') || '[]';
  const customCompletions = localStorage.getItem('custom_completions') || '{}';
  const customSubtasks = localStorage.getItem('custom_subtasks') || '{}';
  
  // Daily tasks and planner data
  const dailyTasks = localStorage.getItem('daily_tasks') || '{}';
  const dailyTaskCompletions = localStorage.getItem('daily_task_completions') || '{}';
  
  // Stopwatch data
  const stopwatchLaps = localStorage.getItem('stopwatch_laps') || '[]';
  const stopwatchCategories = localStorage.getItem('stopwatch_categories') || '[]';
  
  // Active habit tracking
  const activeHabitData = localStorage.getItem('active_habit_data') || '{}';
  const activeHabits = localStorage.getItem('active_habits') || '[]';
  
  // Habit history and analytics
  const habitHistory = localStorage.getItem('habit_history') || '{}';
  const sessionStats = localStorage.getItem('session_stats') || '{}';
  
  const data = {
    version: '2.0.0',
    exportDate: new Date().toISOString(),
    appName: 'FocusLabs',
    exportSummary: {
      totalHabits: JSON.parse(habits).length,
      totalCustomHabits: JSON.parse(customHabits).length,
      totalStudySessions: JSON.parse(studySessions).length,
      totalProductivitySessions: JSON.parse(productivitySessions).length,
      totalStopwatchLaps: JSON.parse(stopwatchLaps).length
    },
    data: {
      // Habits and completions
      habits: JSON.parse(habits),
      completions: JSON.parse(completions),
      
      // Custom habits
      customHabits: JSON.parse(customHabits),
      customCompletions: JSON.parse(customCompletions),
      customSubtasks: JSON.parse(customSubtasks),
      
      // Daily tasks
      dailyTasks: JSON.parse(dailyTasks),
      dailyTaskCompletions: JSON.parse(dailyTaskCompletions),
      
      // Study sessions with durations
      studySessions: JSON.parse(studySessions),
      
      // Productivity sessions
      productivitySessions: JSON.parse(productivitySessions),
      
      // Stopwatch data
      stopwatchLaps: JSON.parse(stopwatchLaps),
      stopwatchCategories: JSON.parse(stopwatchCategories),
      
      // Active habit tracking
      activeHabitData: JSON.parse(activeHabitData),
      activeHabits: JSON.parse(activeHabits),
      
      // History and stats
      habitHistory: JSON.parse(habitHistory),
      sessionStats: JSON.parse(sessionStats),
      
      // Settings
      settings: JSON.parse(settings)
    }
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

  // Size check - prevent memory issues
  const dataSize = JSON.stringify(data).length;
  if (dataSize > 10 * 1024 * 1024) { // 10MB limit
    return { valid: false, error: 'Import data too large (max 10MB)' };
  }

  // Support both old format (data.habits) and new format (data.data.habits)
  const habitsData = data.data?.habits || data.habits;
  const completionsData = data.data?.completions || data.completions;

  if (!Array.isArray(habitsData)) {
    return { valid: false, error: 'Missing or invalid habits array' };
  }

  // Limit number of habits
  if (habitsData.length > 100) {
    return { valid: false, error: 'Too many habits (max 100)' };
  }

  if (typeof completionsData !== 'object') {
    return { valid: false, error: 'Missing or invalid completions object' };
  }

  // Validate habit structure
  for (const habit of habitsData) {
    if (!habit.id || !habit.name) {
      return { valid: false, error: 'Habit missing required fields (id, name)' };
    }
    // Check for suspicious content
    if (typeof habit.name === 'string' && (habit.name.includes('<script') || habit.name.includes('javascript:'))) {
      return { valid: false, error: 'Potentially unsafe content detected' };
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

    // Sanitize all imported data
    const sanitizedHabits = data.data?.habits?.map(h => sanitizeHabitData(h)) || [];
    const sanitizedCustomHabits = data.data?.customHabits?.map(h => sanitizeHabitData(h)) || [];

    // Import core habit data
    localStorage.setItem('habitgrid_habits', JSON.stringify(sanitizedHabits));
    localStorage.setItem('habitgrid_completions', JSON.stringify(data.data?.completions || {}));
    
    // Import custom habits
    localStorage.setItem('custom_habits', JSON.stringify(sanitizedCustomHabits));
    localStorage.setItem('custom_completions', JSON.stringify(data.data?.customCompletions || {}));
    localStorage.setItem('custom_subtasks', JSON.stringify(data.data?.customSubtasks || {}));
    
    // Import daily tasks
    localStorage.setItem('daily_tasks', JSON.stringify(data.data?.dailyTasks || {}));
    localStorage.setItem('daily_task_completions', JSON.stringify(data.data?.dailyTaskCompletions || {}));
    
    // Import study and productivity sessions
    localStorage.setItem('study_sessions', JSON.stringify(data.data?.studySessions || []));
    localStorage.setItem('productivity_sessions', JSON.stringify(data.data?.productivitySessions || []));
    
    // Import stopwatch data
    localStorage.setItem('stopwatch_laps', JSON.stringify(data.data?.stopwatchLaps || []));
    localStorage.setItem('stopwatch_categories', JSON.stringify(data.data?.stopwatchCategories || []));
    
    // Import active habit tracking
    localStorage.setItem('active_habit_data', JSON.stringify(data.data?.activeHabitData || {}));
    localStorage.setItem('active_habits', JSON.stringify(data.data?.activeHabits || []));
    
    // Import history and stats
    localStorage.setItem('habit_history', JSON.stringify(data.data?.habitHistory || {}));
    localStorage.setItem('session_stats', JSON.stringify(data.data?.sessionStats || {}));

    // Import settings
    if (data.data?.settings) {
      localStorage.setItem('habitgrid_settings', JSON.stringify(data.data.settings));
    }

    return { success: true };
  } catch (error) {
    console.error('Import error:', error);
    return { success: false, error: 'Invalid JSON format' };
  }
}

/**
 * Clear all HabitGrid data from localStorage
 */
export function clearAllData() {
  // Core habit data
  localStorage.removeItem('habitgrid_habits');
  localStorage.removeItem('habitgrid_completions');
  localStorage.removeItem('habitgrid_settings');
  
  // Custom habits
  localStorage.removeItem('custom_habits');
  localStorage.removeItem('custom_completions');
  localStorage.removeItem('custom_subtasks');
  
  // Daily tasks
  localStorage.removeItem('daily_tasks');
  localStorage.removeItem('daily_task_completions');
  
  // Study and productivity sessions
  localStorage.removeItem('study_sessions');
  localStorage.removeItem('productivity_sessions');
  
  // Stopwatch data
  localStorage.removeItem('stopwatch_laps');
  localStorage.removeItem('stopwatch_categories');
  
  // Active habit tracking
  localStorage.removeItem('active_habit_data');
  localStorage.removeItem('active_habits');
  
  // History and stats
  localStorage.removeItem('habit_history');
  localStorage.removeItem('session_stats');
}
