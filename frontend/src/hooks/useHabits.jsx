import { useCallback, useMemo } from 'react';
import { useFirestore } from './useFirestore';
import { useMonthlyCompletions } from './useMonthlyCompletions';
import { useAuth } from '../contexts/AuthContext';
import { formatDateKey } from '../utils/dateHelpers';
import { generateId as createId } from '../utils/idHelpers';

/**
 * Custom hook for managing habits and their completion status
 * @returns {object} Habits state and CRUD methods
 */
export function useHabits() {
  const { user } = useAuth();
  const userId = user?.uid;

  const [habits, setHabits, habitsLoading] = useFirestore(userId, 'habits', []);
  const [completions, setCompletions, completionsLoading] = useMonthlyCompletions(userId, 'completions');
  const [subtasks, setSubtasks, subtasksLoading] = useFirestore(userId, 'subtasks', []);
  const [subtaskCompletions, setSubtaskCompletions, subtaskCompletionsLoading] = useFirestore(userId, 'subtask_completions', {});

  /**
   * Generate unique ID for new habits/subtasks
   */
  const generateId = useCallback((prefix = 'habit') => createId(prefix), []);

  /**
   * Add a new habit
   * @param {object} habitData - Habit information
   * @returns {object} Created habit
   */
  const addHabit = useCallback((habitData) => {
    // Build the base habit object without `order` first.
    // We compute order inside a separate synchronous read so the returned
    // object is always fully defined — avoiding the race where the setHabits
    // updater hasn't run yet when this function returns.
    const baseHabit = {
      id: generateId('habit'),
      name: habitData.name,
      description: habitData.description || '',
      category: habitData.category || 'personal',
      startTime: habitData.startTime || habitData.time || '',
      endTime: habitData.endTime || '',
      color: habitData.color || '#FF6B35',
      weeklyTarget: habitData.weeklyTarget || 7,
      createdAt: new Date().toISOString()
    };

    // Derive order from the current habits length before the state update.
    // This is safe because `habits` is a stable snapshot from the last render.
    const newHabit = { ...baseHabit, order: habits.length };

    setHabits(prev => {
      // Re-derive order inside the updater to handle concurrent adds correctly.
      return [...prev, { ...newHabit, order: prev.length }];
    });

    return newHabit;
  }, [generateId, setHabits, habits.length]);

  // Reorder habits based on a new ordered array of habit IDs
  const reorderHabits = useCallback((newOrder) => {
    setHabits(prev => {
      const habitMap = {};
      prev.forEach(h => { habitMap[h.id] = h; });
      return newOrder.map((id, index) => ({ ...habitMap[id], order: index }));
    });
  }, [setHabits]);

  /**
   * Update an existing habit
   * @param {string} habitId
   * @param {object} updates - Fields to update
   */
  const updateHabit = useCallback((habitId, updates) => {
    setHabits(prev =>
      prev.map(habit =>
        habit.id === habitId ? { ...habit, ...updates } : habit
      )
    );
  }, [setHabits]);

  /**
   * Delete a habit
   * @param {string} habitId
   */
  const deleteHabit = useCallback((habitId) => {
    setHabits(prev => prev.filter(habit => habit.id !== habitId));
    
    // Remove completion data
    setCompletions(prev => {
      const updated = { ...prev };
      delete updated[habitId];
      return updated;
    });

    // Remove subtasks
    setSubtasks(prev => prev.filter(st => st.habitId !== habitId));

    // Remove subtask completions
    setSubtaskCompletions(prev => {
      const updated = { ...prev };
      delete updated[habitId];
      return updated;
    });
  }, [setCompletions, setHabits, setSubtaskCompletions, setSubtasks]);

  // ========== SUBTASK METHODS ==========

  /**
   * Get subtasks for a specific habit
   */
  const getSubtasks = useCallback((habitId) => {
    return subtasks
      .filter(st => st.habitId === habitId)
      .sort((a, b) => a.order - b.order);
  }, [subtasks]);

  /**
   * Add a subtask to a habit
   */
  const addSubtask = useCallback((habitId, title) => {
    const newSubtask = {
      id: generateId('subtask'),
      habitId,
      title,
      // Compute order inside the updater to avoid stale closure issues
      // when multiple subtasks are added quickly.
      order: subtasks.filter(st => st.habitId === habitId).length,
      createdAt: new Date().toISOString()
    };

    setSubtasks(prev => [
      ...prev,
      { ...newSubtask, order: prev.filter(st => st.habitId === habitId).length }
    ]);
    return newSubtask;
  }, [generateId, setSubtasks, subtasks]);

  /**
   * Update subtask
   */
  const updateSubtask = useCallback((subtaskId, updates) => {
    setSubtasks(prev =>
      prev.map(st => st.id === subtaskId ? { ...st, ...updates } : st)
    );
  }, [setSubtasks]);

  /**
   * Delete subtask
   */
  const deleteSubtask = useCallback((subtaskId) => {
    setSubtasks(prev => prev.filter(st => st.id !== subtaskId));
  }, [setSubtasks]);

  /**
   * Toggle subtask completion for a specific date
   */
  const toggleSubtaskCompletion = useCallback((habitId, subtaskId, date) => {
    const dateKey = formatDateKey(date);
    setSubtaskCompletions(prev => {
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
  }, [setSubtaskCompletions]);

  /**
   * Get subtask completion status
   */
  const getSubtaskStatus = useCallback((habitId, subtaskId, date) => {
    const dateKey = formatDateKey(date);
    return subtaskCompletions[habitId]?.[dateKey]?.[subtaskId] || false;
  }, [subtaskCompletions]);

  /**
   * Calculate subtask completion percentage for a habit on a date
   */
  const getSubtaskCompletionPercentage = useCallback((habitId, date) => {
    const habitSubtasks = getSubtasks(habitId);
    if (habitSubtasks.length === 0) return 100;
    
    const completed = habitSubtasks.filter(st => 
      getSubtaskStatus(habitId, st.id, date)
    ).length;

    return Math.round((completed / habitSubtasks.length) * 100);
  }, [getSubtasks, getSubtaskStatus]);

  // ========== COMPLETION METHODS ==========

  /**
   * Toggle completion status for a habit on a specific date
   * Cycles through: null -> 'completed' -> 'failed' -> null
   */
  const toggleCompletion = useCallback((habitId, date) => {
    const dateKey = formatDateKey(date);
    
    setCompletions(prev => {
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
  }, [setCompletions]);

  /**
   * Clear completion status for a habit on a specific date
   * Directly sets status to null (removes the entry)
   */
  const clearCompletion = useCallback((habitId, date) => {
    const dateKey = formatDateKey(date);
    if (!dateKey) return;

    setCompletions(prev => {
      const habitCompletions = prev[habitId];
      if (!habitCompletions || !habitCompletions[dateKey]) {
        return prev;
      }

      const updatedHabitCompletions = { ...habitCompletions };
      delete updatedHabitCompletions[dateKey];

      if (Object.keys(updatedHabitCompletions).length === 0) {
        const updated = { ...prev };
        delete updated[habitId];
        return updated;
      }

      return {
        ...prev,
        [habitId]: updatedHabitCompletions
      };
    });
    window.dispatchEvent(new Event('habit-data-updated'));
  }, [setCompletions]);

  /**
   * Clear regular habit completions for all habits on the given date keys.
   * Used when custom date habits take over specific days in the month view.
   */
  const clearCompletionsForDateKeys = useCallback((dateKeys) => {
    if (!dateKeys.length) return;

    const dateKeySet = new Set(dateKeys);

    setCompletions(prev => {
      let changed = false;
      const updated = { ...prev };

      for (const habitId of Object.keys(updated)) {
        const habitCompletions = updated[habitId];
        const nextHabitCompletions = { ...habitCompletions };

        for (const dateKey of dateKeySet) {
          if (nextHabitCompletions[dateKey]) {
            delete nextHabitCompletions[dateKey];
            changed = true;
          }
        }

        if (Object.keys(nextHabitCompletions).length === 0) {
          delete updated[habitId];
        } else {
          updated[habitId] = nextHabitCompletions;
        }
      }

      return changed ? updated : prev;
    });
    window.dispatchEvent(new Event('habit-data-updated'));
  }, [setCompletions]);

  /**
   * Get completion status for a habit on a specific date
   */
  const getCompletionStatus = useCallback((habitId, date) => {
    const dateKey = formatDateKey(date);
    return completions[habitId]?.[dateKey] || null;
  }, [completions]);

  /**
   * Calculate current streak for a habit
   * Counts consecutive completed days from most recent completed day backwards
   */
  const getCurrentStreak = useCallback((habitId) => {
    const habitCompletions = completions[habitId] || {};
    let streak = 0;
    const today = new Date();
    const todayKey = formatDateKey(today);

    // Guard against invalid date
    if (!todayKey) return 0;

    // Find the most recent completed day (could be today or earlier)
    let startOffset = 0;
    if (habitCompletions[todayKey] !== 'completed') {
      // Today not completed, check yesterday and earlier
      startOffset = 1;
    }

    for (let i = startOffset; i < 365; i++) {
      const date = new Date(today);
      date.setDate(today.getDate() - i);
      const dateKey = formatDateKey(date);

      if (!dateKey) break; // Stop if we get an invalid date

      if (habitCompletions[dateKey] === 'completed') {
        streak++;
      } else {
        break;
      }
    }

    return streak;
  }, [completions]);

  /**
   * Calculate longest streak for a habit
   */
  const getLongestStreak = useCallback((habitId) => {
    const habitCompletions = completions[habitId] || {};
    const dates = Object.keys(habitCompletions)
      .filter(dateKey => habitCompletions[dateKey] === 'completed')
      .sort();

    if (dates.length === 0) return 0;

    /**
     * Parse a YYYY-MM-DD string as a LOCAL date (not UTC midnight).
     * Using `new Date('YYYY-MM-DD')` gives UTC midnight which shifts the
     * day backward in negative-offset time zones, causing diffDays to be
     * wrong. Splitting and constructing manually fixes this.
     */
    const parseLocalDate = (dateKey) => {
      const [year, month, day] = dateKey.split('-').map(Number);
      return new Date(year, month - 1, day);
    };

    let longestStreak = 1;
    let currentStreak = 1;

    for (let i = 1; i < dates.length; i++) {
      const prevDate = parseLocalDate(dates[i - 1]);
      const currDate = parseLocalDate(dates[i]);
      const diffDays = Math.round((currDate - prevDate) / (1000 * 60 * 60 * 24));

      if (diffDays === 1) {
        currentStreak++;
        longestStreak = Math.max(longestStreak, currentStreak);
      } else {
        currentStreak = 1;
      }
    }

    return longestStreak;
  }, [completions]);

  /**
   * Get completion percentage for a specific date
   */
  const getCompletionPercentage = useCallback((date) => {
    if (habits.length === 0) return 0;
    
    const dateKey = formatDateKey(date);
    let completed = 0;
    
    habits.forEach(habit => {
      if (completions[habit.id]?.[dateKey] === 'completed') {
        completed++;
      }
    });
    
    return Math.round((completed / habits.length) * 100);
  }, [habits, completions]);

  /**
   * Get completion data for a week
   */
  const getWeekCompletionData = useCallback((weekDates) => {
    return weekDates.map(date => getCompletionPercentage(date));
  }, [getCompletionPercentage]);

  return useMemo(() => ({
    habits,
    completions,
    subtasks,
    subtaskCompletions,
    loading: habitsLoading || completionsLoading || subtasksLoading || subtaskCompletionsLoading,
    addHabit,
    updateHabit,
    deleteHabit,
    toggleCompletion,
    clearCompletion,
    clearCompletionsForDateKeys,
    getCompletionStatus,
    getCurrentStreak,
    getLongestStreak,
    getCompletionPercentage,
    getWeekCompletionData,
    // Subtask methods
    getSubtasks,
    addSubtask,
    updateSubtask,
    deleteSubtask,
    toggleSubtaskCompletion,
    getSubtaskStatus,
    getSubtaskCompletionPercentage,
    reorderHabits
  }), [
    habits,
    completions,
    subtasks,
    subtaskCompletions,
    habitsLoading,
    completionsLoading,
    subtasksLoading,
    subtaskCompletionsLoading,
    addHabit,
    updateHabit,
    deleteHabit,
    toggleCompletion,
    clearCompletion,
    clearCompletionsForDateKeys,
    getCompletionStatus,
    getCurrentStreak,
    getLongestStreak,
    getCompletionPercentage,
    getWeekCompletionData,
    getSubtasks,
    addSubtask,
    updateSubtask,
    deleteSubtask,
    toggleSubtaskCompletion,
    getSubtaskStatus,
    getSubtaskCompletionPercentage,
    reorderHabits
  ]);
}
