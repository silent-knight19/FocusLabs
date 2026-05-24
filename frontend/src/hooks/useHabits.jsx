import { useCallback } from 'react';
import { useFirestore } from './useFirestore';
import { useAuth } from '../contexts/AuthContext';
import { formatDateKey } from '../utils/dateHelpers';

/**
 * Custom hook for managing habits and their completion status
 * @returns {object} Habits state and CRUD methods
 */
export function useHabits() {
  const { user } = useAuth();
  const userId = user?.uid;

  const [habits, setHabits, habitsLoading] = useFirestore(userId, 'habits', []);
  const [completions, setCompletions, completionsLoading] = useFirestore(userId, 'completions', {});
  const [subtasks, setSubtasks, subtasksLoading] = useFirestore(userId, 'subtasks', []);
  const [subtaskCompletions, setSubtaskCompletions, subtaskCompletionsLoading] = useFirestore(userId, 'subtask_completions', {});

  /**
   * Generate unique ID for new habits/subtasks
   */
  const generateId = (prefix = 'habit') => {
    return `${prefix}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  };

  /**
   * Add a new habit
   * @param {object} habitData - Habit information
   * @returns {object} Created habit
   */
  const addHabit = (habitData) => {
    const newHabit = {
      id: generateId('habit'),
      name: habitData.name,
      description: habitData.description || '',
      category: habitData.category || 'personal',
      startTime: habitData.startTime || habitData.time || '',
      endTime: habitData.endTime || '',
      color: habitData.color || '#FF6B35',
      weeklyTarget: habitData.weeklyTarget || 7,
      createdAt: new Date().toISOString(),
      order: habits.length // initial order based on current list length
    };

    setHabits(prev => [...prev, newHabit]);
    return newHabit;
  };

  // Reorder habits based on a new ordered array of habit IDs
  const reorderHabits = (newOrder) => {
    const habitMap = {};
    habits.forEach(h => { habitMap[h.id] = h; });
    const reordered = newOrder.map((id, index) => ({ ...habitMap[id], order: index }));
    setHabits(reordered);
  };

  /**
   * Update an existing habit
   * @param {string} habitId
   * @param {object} updates - Fields to update
   */
  const updateHabit = (habitId, updates) => {
    setHabits(prev =>
      prev.map(habit =>
        habit.id === habitId ? { ...habit, ...updates } : habit
      )
    );
  };

  /**
   * Delete a habit
   * @param {string} habitId
   */
  const deleteHabit = (habitId) => {
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
  };

  // ========== SUBTASK METHODS ==========

  /**
   * Get subtasks for a specific habit
   */
  const getSubtasks = (habitId) => {
    return subtasks
      .filter(st => st.habitId === habitId)
      .sort((a, b) => a.order - b.order);
  };

  /**
   * Add a subtask to a habit
   */
  const addSubtask = (habitId, title) => {
    const habitSubtasks = getSubtasks(habitId);
    const newSubtask = {
      id: generateId('subtask'),
      habitId,
      title,
      order: habitSubtasks.length,
      createdAt: new Date().toISOString()
    };

    setSubtasks(prev => [...prev, newSubtask]);
    return newSubtask;
  };

  /**
   * Update subtask
   */
  const updateSubtask = (subtaskId, updates) => {
    setSubtasks(prev =>
      prev.map(st => st.id === subtaskId ? { ...st, ...updates } : st)
    );
  };

  /**
   * Delete subtask
   */
  const deleteSubtask = (subtaskId) => {
    setSubtasks(prev => prev.filter(st => st.id !== subtaskId));
  };

  /**
   * Toggle subtask completion for a specific date
   */
  const toggleSubtaskCompletion = (habitId, subtaskId, date) => {
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
  };

  /**
   * Get subtask completion status
   */
  const getSubtaskStatus = (habitId, subtaskId, date) => {
    const dateKey = formatDateKey(date);
    return subtaskCompletions[habitId]?.[dateKey]?.[subtaskId] || false;
  };

  /**
   * Calculate subtask completion percentage for a habit on a date
   */
  const getSubtaskCompletionPercentage = (habitId, date) => {
    const habitSubtasks = getSubtasks(habitId);
    if (habitSubtasks.length === 0) return 100;
    
    const completed = habitSubtasks.filter(st => 
      getSubtaskStatus(habitId, st.id, date)
    ).length;

    return Math.round((completed / habitSubtasks.length) * 100);
  };

  // ========== COMPLETION METHODS ==========

  /**
   * Toggle completion status for a habit on a specific date
   * Cycles through: null -> 'completed' -> 'failed' -> null
   */
  const toggleCompletion = (habitId, date) => {
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
  };

  /**
   * Clear completion status for a habit on a specific date
   * Directly sets status to null (removes the entry)
   */
  const clearCompletion = (habitId, date) => {
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
  };

  /**
   * Clear regular habit completions for all habits on the given date keys.
   * Used when custom date habits take over specific days in the month view.
   */
  const clearCompletionsForDateKeys = (dateKeys) => {
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
  };

  /**
   * Get completion status for a habit on a specific date
   */
  const getCompletionStatus = (habitId, date) => {
    const dateKey = formatDateKey(date);
    return completions[habitId]?.[dateKey] || null;
  };

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
  const getLongestStreak = (habitId) => {
    const habitCompletions = completions[habitId] || {};
    const dates = Object.keys(habitCompletions)
      .filter(dateKey => habitCompletions[dateKey] === 'completed')
      .sort();
    
    if (dates.length === 0) return 0;
    
    let longestStreak = 1;
    let currentStreak = 1;
    
    for (let i = 1; i < dates.length; i++) {
      const prevDate = new Date(dates[i - 1]);
      const currDate = new Date(dates[i]);
      const diffDays = (currDate - prevDate) / (1000 * 60 * 60 * 24);
      
      if (diffDays === 1) {
        currentStreak++;
        longestStreak = Math.max(longestStreak, currentStreak);
      } else {
        currentStreak = 1;
      }
    }
    
    return longestStreak;
  };

  /**
   * Get completion percentage for a specific date
   */
  const getCompletionPercentage = (date) => {
    if (habits.length === 0) return 0;
    
    const dateKey = formatDateKey(date);
    let completed = 0;
    
    habits.forEach(habit => {
      if (completions[habit.id]?.[dateKey] === 'completed') {
        completed++;
      }
    });
    
    return Math.round((completed / habits.length) * 100);
  };

  /**
   * Get completion data for a week
   */
  const getWeekCompletionData = (weekDates) => {
    return weekDates.map(date => getCompletionPercentage(date));
  };

  return {
    habits,
    completions,
    subtasks,
    subtaskCompletions,
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
  };
}
