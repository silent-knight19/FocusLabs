import { useFirestore } from './useFirestore';
import { useAuth } from '../contexts/AuthContext';
import { formatDateKey } from '../utils/dateHelpers';

/**
 * Custom hook for managing custom date habits (habits that apply to specific date ranges)
 * @returns {object} Custom habits state and CRUD methods
 */
export function useCustomHabits() {
  const { user } = useAuth();
  const userId = user?.uid;

  const [customHabits, setCustomHabits, habitsLoading] = useFirestore(userId, 'custom_habits', []);
  const [customCompletions, setCustomCompletions, completionsLoading] = useFirestore(userId, 'custom_completions', {});

  /**
   * Generate unique ID for new custom habits
   */
  const generateId = () => {
    return `custom_habit_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
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
   * @param {object} habitData - Habit information including dateFrom and dateTo
   * @returns {object} Created habit
   */
  const addCustomHabit = (habitData) => {
    const newHabit = {
      id: generateId(),
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
   * @param {string} habitId
   * @param {object} updates - Fields to update
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
   * @param {string} habitId
   */
  const deleteCustomHabit = (habitId) => {
    setCustomHabits(prev => prev.filter(habit => habit.id !== habitId));
    
    // Remove completion data
    setCustomCompletions(prev => {
      const updated = { ...prev };
      delete updated[habitId];
      return updated;
    });
  };

  /**
   * Toggle completion status for a custom habit on a specific date
   * Cycles through: null -> 'completed' -> 'failed' -> null
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
    loading: habitsLoading || completionsLoading,
    addCustomHabit,
    updateCustomHabit,
    deleteCustomHabit,
    toggleCustomCompletion,
    getCustomCompletionStatus,
    isDateInRange,
    getHabitsForDate,
    getHabitDateRange,
    formatDateRange
  };
}
