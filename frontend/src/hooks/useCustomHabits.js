import { useCallback, useMemo } from 'react';
import { useFirestore } from './useFirestore';
import { useMonthlyCompletions } from './useMonthlyCompletions';
import { useAuth } from '../contexts/AuthContext';
import { formatDateKey } from '../utils/dateHelpers';
import { generateId as createId } from '../utils/idHelpers';

/**
 * Custom hook for managing custom date habits (habits that apply to specific date ranges)
 * Now includes subtask support just like regular habits
 * @returns {object} Custom habits state and CRUD methods
 */
export function useCustomHabits() {
  const { user } = useAuth();
  const userId = user?.uid;

  const [customHabits, setCustomHabits, habitsLoading] = useFirestore(userId, 'custom_habits', []);
  const [customCompletions, setCustomCompletions, completionsLoading] = useMonthlyCompletions(userId, 'custom_completions');
  const [customSubtasks, setCustomSubtasks, subtasksLoading] = useFirestore(userId, 'custom_subtasks', []);
  const [customSubtaskCompletions, setCustomSubtaskCompletions, subtaskCompletionsLoading] = useFirestore(userId, 'custom_subtask_completions', {});

  /**
   * Generate unique ID
   */
  const generateId = useCallback((prefix = 'custom') => createId(prefix), []);

  /**
   * Check if a date falls within a habit's date range
   */
  const isDateInRange = useCallback((habit, date) => {
    const dateKey = formatDateKey(date);
    return dateKey >= habit.dateFrom && dateKey <= habit.dateTo;
  }, []);

  /**
   * Get custom habits applicable for a specific date
   */
  const getHabitsForDate = useCallback((date) => {
    return customHabits.filter(habit => isDateInRange(habit, date));
  }, [customHabits, isDateInRange]);

  /**
   * Check if a date is covered by any custom habit (blocks regular month-view habits)
   */
  const isDateBlockedByCustomHabits = useCallback((date) => {
    return getHabitsForDate(date).length > 0;
  }, [getHabitsForDate]);

  /**
   * Get all YYYY-MM-DD keys between two dates (inclusive)
   */
  const getDateKeysInRange = useCallback((dateFrom, dateTo) => {
    const keys = [];
    const start = new Date(dateFrom);
    const end = new Date(dateTo);
    start.setHours(0, 0, 0, 0);
    end.setHours(0, 0, 0, 0);

    for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
      const key = formatDateKey(d);
      if (key) keys.push(key);
    }

    return keys;
  }, []);

  /**
   * Add a new custom habit
   */
  const addCustomHabit = useCallback((habitData) => {
    const baseHabit = {
      id: generateId('custom_habit'),
      name: habitData.name,
      description: habitData.description || '',
      category: habitData.category || 'personal',
      startTime: habitData.startTime || '',
      endTime: habitData.endTime || '',
      color: habitData.color || '#FF6B35',
      dateFrom: habitData.dateFrom,
      dateTo: habitData.dateTo,
      isCustomDate: true,
      createdAt: new Date().toISOString()
    };

    // Derive order synchronously so the returned object is always fully defined.
    const newHabit = { ...baseHabit, order: customHabits.length };

    setCustomHabits(prev => {
      return [...prev, { ...newHabit, order: prev.length }];
    });

    return newHabit;
  }, [generateId, setCustomHabits, customHabits.length]);

  /**
   * Update an existing custom habit
   */
  const updateCustomHabit = useCallback((habitId, updates) => {
    setCustomHabits(prev =>
      prev.map(habit =>
        habit.id === habitId ? { ...habit, ...updates } : habit
      )
    );
  }, [setCustomHabits]);

  /**
   * Delete a custom habit
   */
  const deleteCustomHabit = useCallback((habitId) => {
    setCustomHabits(prev => prev.filter(habit => habit.id !== habitId));
    
    // Remove completion data
    setCustomCompletions(prev => {
      const updated = { ...prev };
      delete updated[habitId];
      return updated;
    });
    
    // Remove subtasks for this habit
    setCustomSubtasks(prev => prev.filter(st => st.habitId !== habitId));
    
    // Remove subtask completions
    setCustomSubtaskCompletions(prev => {
      const updated = { ...prev };
      delete updated[habitId];
      return updated;
    });
  }, [setCustomCompletions, setCustomHabits, setCustomSubtaskCompletions, setCustomSubtasks]);

  /**
   * Toggle completion status for a custom habit on a specific date
   */
  const toggleCustomCompletion = useCallback((habitId, date) => {
    const dateKey = formatDateKey(date);
    
    setCustomCompletions(prev => {
      const habitCompletions = prev[habitId] || {};
      const currentStatus = habitCompletions[dateKey];
      
      let newStatus;
      if (!currentStatus) {
        newStatus = 'completed';
      } else if (currentStatus === 'completed') {
        newStatus = 'failed';
      } else {
        newStatus = null;
      }
      
      const updatedHabitCompletions = { ...habitCompletions };
      if (newStatus === null) {
        delete updatedHabitCompletions[dateKey];
      } else {
        updatedHabitCompletions[dateKey] = newStatus;
      }
      
      return {
        ...prev,
        [habitId]: updatedHabitCompletions
      };
    });
    window.dispatchEvent(new Event('habit-data-updated'));
  }, [setCustomCompletions]);

  /**
   * Get completion status for a custom habit on a specific date
   */
  const getCustomCompletionStatus = useCallback((habitId, date) => {
    const dateKey = formatDateKey(date);
    return customCompletions[habitId]?.[dateKey] || null;
  }, [customCompletions]);

  // ==================== SUBTASK METHODS ====================

  /**
   * Get subtasks for a habit
   */
  const getCustomSubtasks = useCallback((habitId) => {
    return customSubtasks
      .filter(st => st.habitId === habitId)
      .sort((a, b) => a.order - b.order);
  }, [customSubtasks]);

  /**
   * Add a subtask to a custom habit
   */
  const addCustomSubtask = useCallback((habitId, title) => {
    const newSubtask = {
      id: generateId('custom_subtask'),
      habitId,
      title,
      // Compute order synchronously to avoid stale closure issues.
      order: customSubtasks.filter(st => st.habitId === habitId).length,
      createdAt: new Date().toISOString()
    };

    setCustomSubtasks(prev => [
      ...prev,
      { ...newSubtask, order: prev.filter(st => st.habitId === habitId).length }
    ]);
    return newSubtask;
  }, [generateId, setCustomSubtasks, customSubtasks]);

  /**
   * Update a custom subtask
   */
  const updateCustomSubtask = useCallback((subtaskId, updates) => {
    setCustomSubtasks(prev =>
      prev.map(st => st.id === subtaskId ? { ...st, ...updates } : st)
    );
  }, [setCustomSubtasks]);

  /**
   * Delete a custom subtask
   */
  const deleteCustomSubtask = useCallback((subtaskId) => {
    setCustomSubtasks(prev => prev.filter(st => st.id !== subtaskId));
  }, [setCustomSubtasks]);

  /**
   * Toggle subtask completion for a specific date
   */
  const toggleCustomSubtaskCompletion = useCallback((habitId, subtaskId, date) => {
    const dateKey = formatDateKey(date);
    setCustomSubtaskCompletions(prev => {
      const habitData = prev[habitId] || {};
      const dateData = habitData[dateKey] || {};
      const isCompleted = dateData[subtaskId] || false;
      
      return {
        ...prev,
        [habitId]: {
          ...habitData,
          [dateKey]: {
            ...dateData,
            [subtaskId]: !isCompleted
          }
        }
      };
    });
  }, [setCustomSubtaskCompletions]);

  /**
   * Get subtask completion status
   */
  const getCustomSubtaskStatus = useCallback((habitId, subtaskId, date) => {
    const dateKey = formatDateKey(date);
    return customSubtaskCompletions[habitId]?.[dateKey]?.[subtaskId] || false;
  }, [customSubtaskCompletions]);

  /**
   * Calculate subtask completion percentage for a habit on a date
   */
  const getCustomSubtaskCompletionPercentage = useCallback((habitId, date) => {
    const habitSubtasks = getCustomSubtasks(habitId);
    if (habitSubtasks.length === 0) return 100;
    
    const completed = habitSubtasks.filter(st => 
      getCustomSubtaskStatus(habitId, st.id, date)
    ).length;

    return Math.round((completed / habitSubtasks.length) * 100);
  }, [getCustomSubtasks, getCustomSubtaskStatus]);

  // ==================== UTILITY METHODS ====================

  /**
   * Get all dates within a habit's range
   */
  const getHabitDateRange = useCallback((habit) => {
    const dates = [];
    const startDate = new Date(habit.dateFrom);
    const endDate = new Date(habit.dateTo);
    
    for (let d = new Date(startDate); d <= endDate; d.setDate(d.getDate() + 1)) {
      dates.push(new Date(d));
    }
    
    return dates;
  }, []);

  /**
   * Format date range for display
   */
  const formatDateRange = useCallback((habit) => {
    const fromDate = new Date(habit.dateFrom);
    const toDate = new Date(habit.dateTo);
    
    const options = { month: 'short', day: 'numeric' };
    return `${fromDate.toLocaleDateString('en-US', options)} - ${toDate.toLocaleDateString('en-US', options)}`;
  }, []);

  return useMemo(() => ({
    customHabits,
    customCompletions,
    customSubtasks,
    customSubtaskCompletions,
    loading: habitsLoading || completionsLoading || subtasksLoading || subtaskCompletionsLoading,
    // Habit methods
    addCustomHabit,
    updateCustomHabit,
    deleteCustomHabit,
    toggleCustomCompletion,
    getCustomCompletionStatus,
    isDateInRange,
    getHabitsForDate,
    isDateBlockedByCustomHabits,
    getDateKeysInRange,
    getHabitDateRange,
    formatDateRange,
    // Subtask methods
    getCustomSubtasks,
    addCustomSubtask,
    updateCustomSubtask,
    deleteCustomSubtask,
    toggleCustomSubtaskCompletion,
    getCustomSubtaskStatus,
    getCustomSubtaskCompletionPercentage
  }), [
    customHabits,
    customCompletions,
    customSubtasks,
    customSubtaskCompletions,
    habitsLoading,
    completionsLoading,
    subtasksLoading,
    subtaskCompletionsLoading,
    addCustomHabit,
    updateCustomHabit,
    deleteCustomHabit,
    toggleCustomCompletion,
    getCustomCompletionStatus,
    isDateInRange,
    getHabitsForDate,
    isDateBlockedByCustomHabits,
    getDateKeysInRange,
    getHabitDateRange,
    formatDateRange,
    getCustomSubtasks,
    addCustomSubtask,
    updateCustomSubtask,
    deleteCustomSubtask,
    toggleCustomSubtaskCompletion,
    getCustomSubtaskStatus,
    getCustomSubtaskCompletionPercentage
  ]);
}
