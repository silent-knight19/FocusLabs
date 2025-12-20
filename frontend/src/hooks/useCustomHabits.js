import { useFirestore } from './useFirestore';
import { useAuth } from '../contexts/AuthContext';
import { formatDateKey } from '../utils/dateHelpers';

/**
 * Custom hook for managing custom date habits (habits that apply to specific date ranges)
 * Now includes subtask support just like regular habits
 * @returns {object} Custom habits state and CRUD methods
 */
export function useCustomHabits() {
  const { user } = useAuth();
  const userId = user?.uid;

  const [customHabits, setCustomHabits, habitsLoading] = useFirestore(userId, 'custom_habits', []);
  const [customCompletions, setCustomCompletions, completionsLoading] = useFirestore(userId, 'custom_completions', {});
  const [customSubtasks, setCustomSubtasks, subtasksLoading] = useFirestore(userId, 'custom_subtasks', []);
  const [customSubtaskCompletions, setCustomSubtaskCompletions, subtaskCompletionsLoading] = useFirestore(userId, 'custom_subtask_completions', {});

  /**
   * Generate unique ID
   */
  const generateId = (prefix = 'custom') => {
    return `${prefix}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  };

  /**
   * Check if a date falls within a habit's date range
   */
  const isDateInRange = (habit, date) => {
    const dateKey = formatDateKey(date);
    return dateKey >= habit.dateFrom && dateKey <= habit.dateTo;
  };

  /**
   * Get custom habits applicable for a specific date
   */
  const getHabitsForDate = (date) => {
    return customHabits.filter(habit => isDateInRange(habit, date));
  };

  /**
   * Add a new custom habit
   */
  const addCustomHabit = (habitData) => {
    const newHabit = {
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
      createdAt: new Date().toISOString(),
      order: customHabits.length
    };

    setCustomHabits(prev => [...prev, newHabit]);
    return newHabit;
  };

  /**
   * Update an existing custom habit
   */
  const updateCustomHabit = (habitId, updates) => {
    setCustomHabits(prev =>
      prev.map(habit =>
        habit.id === habitId ? { ...habit, ...updates } : habit
      )
    );
  };

  /**
   * Delete a custom habit
   */
  const deleteCustomHabit = (habitId) => {
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
  };

  /**
   * Toggle completion status for a custom habit on a specific date
   */
  const toggleCustomCompletion = (habitId, date) => {
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
  };

  /**
   * Get completion status for a custom habit on a specific date
   */
  const getCustomCompletionStatus = (habitId, date) => {
    const dateKey = formatDateKey(date);
    return customCompletions[habitId]?.[dateKey] || null;
  };

  // ==================== SUBTASK METHODS ====================

  /**
   * Get subtasks for a habit
   */
  const getCustomSubtasks = (habitId) => {
    return customSubtasks
      .filter(st => st.habitId === habitId)
      .sort((a, b) => a.order - b.order);
  };

  /**
   * Add a subtask to a custom habit
   */
  const addCustomSubtask = (habitId, title) => {
    const habitSubtasks = getCustomSubtasks(habitId);
    const newSubtask = {
      id: generateId('custom_subtask'),
      habitId,
      title,
      order: habitSubtasks.length,
      createdAt: new Date().toISOString()
    };

    setCustomSubtasks(prev => [...prev, newSubtask]);
    return newSubtask;
  };

  /**
   * Update a custom subtask
   */
  const updateCustomSubtask = (subtaskId, updates) => {
    setCustomSubtasks(prev =>
      prev.map(st => st.id === subtaskId ? { ...st, ...updates } : st)
    );
  };

  /**
   * Delete a custom subtask
   */
  const deleteCustomSubtask = (subtaskId) => {
    setCustomSubtasks(prev => prev.filter(st => st.id !== subtaskId));
  };

  /**
   * Toggle subtask completion for a specific date
   */
  const toggleCustomSubtaskCompletion = (habitId, subtaskId, date) => {
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
  };

  /**
   * Get subtask completion status
   */
  const getCustomSubtaskStatus = (habitId, subtaskId, date) => {
    const dateKey = formatDateKey(date);
    return customSubtaskCompletions[habitId]?.[dateKey]?.[subtaskId] || false;
  };

  /**
   * Calculate subtask completion percentage for a habit on a date
   */
  const getCustomSubtaskCompletionPercentage = (habitId, date) => {
    const habitSubtasks = getCustomSubtasks(habitId);
    if (habitSubtasks.length === 0) return 100;
    
    const completed = habitSubtasks.filter(st => 
      getCustomSubtaskStatus(habitId, st.id, date)
    ).length;

    return Math.round((completed / habitSubtasks.length) * 100);
  };

  // ==================== UTILITY METHODS ====================

  /**
   * Get all dates within a habit's range
   */
  const getHabitDateRange = (habit) => {
    const dates = [];
    const startDate = new Date(habit.dateFrom);
    const endDate = new Date(habit.dateTo);
    
    for (let d = new Date(startDate); d <= endDate; d.setDate(d.getDate() + 1)) {
      dates.push(new Date(d));
    }
    
    return dates;
  };

  /**
   * Format date range for display
   */
  const formatDateRange = (habit) => {
    const fromDate = new Date(habit.dateFrom);
    const toDate = new Date(habit.dateTo);
    
    const options = { month: 'short', day: 'numeric' };
    return `${fromDate.toLocaleDateString('en-US', options)} - ${toDate.toLocaleDateString('en-US', options)}`;
  };

  return {
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
  };
}

