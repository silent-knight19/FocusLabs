/**
 * Validation utility functions
 */

/**
 * Validate habit name
 * @param {string} name
 * @returns {object} { valid: boolean, error?: string }
 */
export function validateHabitName(name) {
  if (!name || typeof name !== 'string') {
    return { valid: false, error: 'Habit name is required' };
  }
  
  const trimmed = name.trim();
  if (trimmed.length === 0) {
    return { valid: false, error: 'Habit name cannot be empty' };
  }
  
  if (trimmed.length > 100) {
    return { valid: false, error: 'Habit name must be less than 100 characters' };
  }
  
  return { valid: true };
}

/**
 * Validate time format (HH:MM)
 * @param {string} time
 * @returns {object} { valid: boolean, error?: string }
 */
export function validateTime(time) {
  if (!time) {
    return { valid: true }; // Time is optional
  }
  
  const timeRegex = /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/;
  if (!timeRegex.test(time)) {
    return { valid: false, error: 'Time must be in HH:MM format (e.g., 09:30)' };
  }
  
  return { valid: true };
}

/**
 * Validate weekly target
 * @param {number} target
 * @returns {object} { valid: boolean, error?: string }
 */
export function validateWeeklyTarget(target) {
  if (target === undefined || target === null || target === '') {
    return { valid: true }; // Optional field
  }
  
  const num = Number(target);
  if (isNaN(num) || num < 1 || num > 7) {
    return { valid: false, error: 'Weekly target must be between 1 and 7' };
  }
  
  if (!Number.isInteger(num)) {
    return { valid: false, error: 'Weekly target must be a whole number' };
  }
  
  return { valid: true };
}

/**
 * Validate color hex code
 * @param {string} color
 * @returns {object} { valid: boolean, error?: string }
 */
export function validateColor(color) {
  if (!color) {
    return { valid: true }; // Optional field
  }
  
  const hexRegex = /^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/;
  if (!hexRegex.test(color)) {
    return { valid: false, error: 'Color must be a valid hex code (e.g., #10B981)' };
  }
  
  return { valid: true };
}

/**
 * Validate entire habit object
 * @param {object} habit
 * @returns {object} { valid: boolean, errors: object }
 */
export function validateHabit(habit) {
  const errors = {};
  
  const nameValidation = validateHabitName(habit.name);
  if (!nameValidation.valid) {
    errors.name = nameValidation.error;
  }
  
  const timeValidation = validateTime(habit.time);
  if (!timeValidation.valid) {
    errors.time = timeValidation.error;
  }
  
  const targetValidation = validateWeeklyTarget(habit.weeklyTarget);
  if (!targetValidation.valid) {
    errors.weeklyTarget = targetValidation.error;
  }
  
  const colorValidation = validateColor(habit.color);
  if (!colorValidation.valid) {
    errors.color = colorValidation.error;
  }
  
  return {
    valid: Object.keys(errors).length === 0,
    errors
  };
}
