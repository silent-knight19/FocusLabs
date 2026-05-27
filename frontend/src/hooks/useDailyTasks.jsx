import { useCallback, useMemo } from 'react';
import { useMonthlyDailyTasks } from './useMonthlyDailyTasks';
import { useAuth } from '../contexts/AuthContext';
import { formatDateKey } from '../utils/dateHelpers';
import { generateId as createId } from '../utils/idHelpers';

/**
 * Custom hook for managing daily tasks
 * Daily tasks are date-specific and unique per day per habit
 * @returns {object} Daily tasks state and CRUD methods
 */
export function useDailyTasks() {
  const { user } = useAuth();
  const userId = user?.uid;

  const [dailyTasks, setDailyTasks, tasksLoading] = useMonthlyDailyTasks(userId);

  /**
   * Generate unique ID for new daily tasks
   */
  const generateId = useCallback(() => createId('task'), []);

  /**
   * Get tasks for a specific habit on a specific date
   * @param {string} habitId - Habit ID
   * @param {Date|string} date - Date object or ISO string
   * @returns {Array} Array of daily tasks
   */
  const getDailyTasks = useCallback((habitId, date) => {
    const dateKey = formatDateKey(date);
    return dailyTasks
      .filter(task => task.habitId === habitId && task.date === dateKey)
      .sort((a, b) => a.order - b.order);
  }, [dailyTasks]);

  /**
   * Get all tasks for a specific date across all habits
   * @param {Date|string} date - Date object or ISO string
   * @returns {Array} Array of daily tasks
   */
  const getAllDailyTasks = useCallback((date) => {
    const dateKey = formatDateKey(date);
    return dailyTasks
      .filter(task => task.date === dateKey)
      .sort((a, b) => a.order - b.order);
  }, [dailyTasks]);

  /**
   * Add a new daily task
   * @param {string} habitId - Habit ID
   * @param {Date|string} date - Date object or ISO string
   * @param {string} title - Task title
   * @returns {object} Created task
   */
  const addDailyTask = useCallback((habitId, date, title) => {
    const dateKey = formatDateKey(date);
    const existingTasks = getDailyTasks(habitId, date);
    
    const newTask = {
      id: generateId(),
      habitId,
      date: dateKey,
      title,
      completed: false,
      createdAt: new Date().toISOString(),
      order: existingTasks.length
    };

    setDailyTasks(prev => [...prev, newTask]);
    return newTask;
  }, [generateId, getDailyTasks, setDailyTasks]);

  /**
   * Toggle task completion status
   * @param {string} taskId - Task ID
   */
  const toggleDailyTask = useCallback((taskId) => {
    setDailyTasks(prev =>
      prev.map(task =>
        task.id === taskId ? { ...task, completed: !task.completed } : task
      )
    );
  }, [setDailyTasks]);

  /**
   * Update a daily task
   * @param {string} taskId - Task ID
   * @param {object} updates - Fields to update
   */
  const updateDailyTask = useCallback((taskId, updates) => {
    setDailyTasks(prev =>
      prev.map(task =>
        task.id === taskId ? { ...task, ...updates } : task
      )
    );
  }, [setDailyTasks]);

  /**
   * Delete a daily task
   * @param {string} taskId - Task ID
   */
  const deleteDailyTask = useCallback((taskId) => {
    setDailyTasks(prev => prev.filter(task => task.id !== taskId));
  }, [setDailyTasks]);

  /**
   * Delete all daily tasks for a specific habit
   * @param {string} habitId - Habit ID
   */
  const deleteTasksForHabit = useCallback((habitId) => {
    setDailyTasks(prev => prev.filter(task => task.habitId !== habitId));
  }, [setDailyTasks]);

  /**
   * Calculate completion percentage for a habit on a date
   * @param {string} habitId - Habit ID
   * @param {Date|string} date - Date object or ISO string
   * @returns {number} Completion percentage (0-100)
   */
  const getDailyCompletion = useCallback((habitId, date) => {
    const tasks = getDailyTasks(habitId, date);
    if (tasks.length === 0) return 0;
    
    const completedCount = tasks.filter(task => task.completed).length;
    return Math.round((completedCount / tasks.length) * 100);
  }, [getDailyTasks]);

  /**
   * Get overall completion for a date across all habits
   * @param {Date|string} date - Date object or ISO string
   * @returns {object} Object with total tasks and completed count
   */
  const getDateCompletion = useCallback((date) => {
    const tasks = getAllDailyTasks(date);
    const completed = tasks.filter(task => task.completed).length;
    
    return {
      total: tasks.length,
      completed,
      percentage: tasks.length > 0 ? Math.round((completed / tasks.length) * 100) : 0
    };
  }, [getAllDailyTasks]);

  /**
   * Reorder tasks for a habit on a date
   * @param {string} habitId - Habit ID
   * @param {Date|string} date - Date object or ISO string
   * @param {Array} newOrder - Array of task IDs in new order
   */
  const reorderDailyTasks = useCallback((habitId, date, newOrder) => {
    setDailyTasks(prev => {
      const dateKey = formatDateKey(date);
      const updated = prev.map(task => {
        if (task.habitId === habitId && task.date === dateKey) {
          const newIndex = newOrder.indexOf(task.id);
          if (newIndex !== -1) {
            return { ...task, order: newIndex };
          }
        }
        return task;
      });
      return updated;
    });
  }, [setDailyTasks]);

  return useMemo(() => ({
    dailyTasks,
    tasksLoading,
    getDailyTasks,
    getAllDailyTasks,
    addDailyTask,
    toggleDailyTask,
    updateDailyTask,
    deleteDailyTask,
    getDailyCompletion,
    getDateCompletion,
    reorderDailyTasks,
    deleteTasksForHabit
  }), [
    dailyTasks,
    tasksLoading,
    getDailyTasks,
    getAllDailyTasks,
    addDailyTask,
    toggleDailyTask,
    updateDailyTask,
    deleteDailyTask,
    getDailyCompletion,
    getDateCompletion,
    reorderDailyTasks,
    deleteTasksForHabit
  ]);
}
