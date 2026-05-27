/**
 * LocalStorage helper functions for data import/export (Legacy utilities)
 */

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

  // Validate custom habits array if present
  const customHabitsData = data.data?.customHabits || data.customHabits;
  if (customHabitsData !== undefined && customHabitsData !== null) {
    if (!Array.isArray(customHabitsData)) {
      return { valid: false, error: 'customHabits must be an array' };
    }
    if (customHabitsData.length > 100) {
      return { valid: false, error: 'Too many custom habits (max 100)' };
    }
    for (const habit of customHabitsData) {
      if (!habit.id || !habit.name) {
        return { valid: false, error: 'Custom habit missing required fields (id, name)' };
      }
    }
  }

  // Validate goals array if present
  const goalsData = data.data?.goals || data.goals;
  if (goalsData !== undefined && goalsData !== null) {
    if (!Array.isArray(goalsData)) {
      return { valid: false, error: 'goals must be an array' };
    }
    for (const goal of goalsData) {
      if (!goal.id || !goal.title) {
        return { valid: false, error: 'Goal missing required fields (id, title)' };
      }
    }
  }

  return { valid: true };
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
  localStorage.removeItem('habitgrid_lap_history'); // Legacy key — may exist on older installs
  localStorage.removeItem('stopwatch_active_state');
  localStorage.removeItem('stopwatch_current_session_laps');
  
  // Active habit tracking
  localStorage.removeItem('active_habit_data');
  localStorage.removeItem('active_habits');
  
  // History and stats
  localStorage.removeItem('habit_history');
  localStorage.removeItem('session_stats');
}
