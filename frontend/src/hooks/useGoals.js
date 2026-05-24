import { useCallback } from 'react';
import { useFirestore } from './useFirestore';
import { useAuth } from '../contexts/AuthContext';
import { generateId as createId } from '../utils/idHelpers';

const generateId = (prefix = 'goal') => createId(prefix);

/**
 * Custom hook for managing goals and sub-goals
 * @returns {object} Goals state and CRUD methods
 */
export function useGoals() {
  const { user } = useAuth();
  const userId = user?.uid;

  const [goals, setGoals, goalsLoading] = useFirestore(userId, 'goals', []);

  // ========== GOAL CRUD ==========

  /**
   * Add a new goal
   * @param {object} goalData - Goal information
   * @returns {object} Created goal
   */
  const addGoal = (goalData) => {
    const newGoal = {
      id: generateId('goal'),
      title: goalData.title,
      description: goalData.description || '',
      category: goalData.category || 'personal',
      color: goalData.color || '#FF5A1F',
      priority: goalData.priority || 'medium',
      status: 'active',
      startDate: goalData.startDate || new Date().toISOString().split('T')[0],
      targetDate: goalData.targetDate,
      completedAt: null,
      createdAt: new Date().toISOString(),
      order: goals.length,
      subGoals: goalData.subGoals || []
    };

    setGoals(prev => [...prev, newGoal]);
    return newGoal;
  };

  /**
   * Update an existing goal
   * @param {string} goalId - Goal ID
   * @param {object} updates - Fields to update
   */
  const updateGoal = (goalId, updates) => {
    setGoals(prev =>
      prev.map(goal =>
        goal.id === goalId ? { ...goal, ...updates } : goal
      )
    );
  };

  /**
   * Delete a goal
   * @param {string} goalId - Goal ID
   */
  const deleteGoal = (goalId) => {
    setGoals(prev => prev.filter(goal => goal.id !== goalId));
  };

  /**
   * Mark a goal as completed
   * @param {string} goalId - Goal ID
   */
  const completeGoal = (goalId) => {
    setGoals(prev =>
      prev.map(goal =>
        goal.id === goalId
          ? { ...goal, status: 'completed', completedAt: new Date().toISOString() }
          : goal
      )
    );
  };

  /**
   * Archive a goal (hide from active view)
   * @param {string} goalId - Goal ID
   */
  const archiveGoal = (goalId) => {
    setGoals(prev =>
      prev.map(goal =>
        goal.id === goalId ? { ...goal, status: 'archived' } : goal
      )
    );
  };

  /**
   * Reorder goals based on a new ordered array of goal IDs
   * @param {string[]} newOrder - Array of goal IDs in desired order
   */
  const reorderGoals = (newOrder) => {
    const goalMap = {};
    goals.forEach(g => { goalMap[g.id] = g; });
    const reordered = newOrder.map((id, index) => ({ ...goalMap[id], order: index }));
    setGoals(reordered);
  };

  // ========== SUB-GOAL METHODS ==========

  /**
   * Add a sub-goal to a goal
   * @param {string} goalId - Parent goal ID
   * @param {object} subGoalData - Sub-goal information
   * @returns {object} Created sub-goal
   */
  const addSubGoal = (goalId, subGoalData) => {
    const newSubGoal = {
      id: generateId('subgoal'),
      title: subGoalData.title,
      isCompleted: false,
      dueDate: subGoalData.dueDate || null,
      completedAt: null,
      createdAt: new Date().toISOString(),
      order: 0
    };

    setGoals(prev =>
      prev.map(goal => {
        if (goal.id !== goalId) return goal;
        const existing = goal.subGoals || [];
        newSubGoal.order = existing.length;
        return { ...goal, subGoals: [...existing, newSubGoal] };
      })
    );

    return newSubGoal;
  };

  /**
   * Update a sub-goal
   * @param {string} goalId - Parent goal ID
   * @param {string} subGoalId - Sub-goal ID
   * @param {object} updates - Fields to update
   */
  const updateSubGoal = (goalId, subGoalId, updates) => {
    setGoals(prev =>
      prev.map(goal => {
        if (goal.id !== goalId) return goal;
        const updatedSubGoals = (goal.subGoals || []).map(sg =>
          sg.id === subGoalId ? { ...sg, ...updates } : sg
        );
        return { ...goal, subGoals: updatedSubGoals };
      })
    );
  };

  /**
   * Delete a sub-goal
   * @param {string} goalId - Parent goal ID
   * @param {string} subGoalId - Sub-goal ID
   */
  const deleteSubGoal = (goalId, subGoalId) => {
    setGoals(prev =>
      prev.map(goal => {
        if (goal.id !== goalId) return goal;
        const filtered = (goal.subGoals || []).filter(sg => sg.id !== subGoalId);
        return { ...goal, subGoals: filtered };
      })
    );
  };

  /**
   * Toggle a sub-goal's completion status
   * @param {string} goalId - Parent goal ID
   * @param {string} subGoalId - Sub-goal ID
   */
  const toggleSubGoal = (goalId, subGoalId) => {
    setGoals(prev =>
      prev.map(goal => {
        if (goal.id !== goalId) return goal;
        const updatedSubGoals = (goal.subGoals || []).map(sg => {
          if (sg.id !== subGoalId) return sg;
          const nowCompleted = !sg.isCompleted;
          return {
            ...sg,
            isCompleted: nowCompleted,
            completedAt: nowCompleted ? new Date().toISOString() : null
          };
        });
        return { ...goal, subGoals: updatedSubGoals };
      })
    );
  };

  /**
   * Reorder sub-goals within a goal
   * @param {string} goalId - Parent goal ID
   * @param {string[]} newOrder - Array of sub-goal IDs in desired order
   */
  const reorderSubGoals = (goalId, newOrder) => {
    setGoals(prev =>
      prev.map(goal => {
        if (goal.id !== goalId) return goal;
        const sgMap = {};
        (goal.subGoals || []).forEach(sg => { sgMap[sg.id] = sg; });
        const reordered = newOrder.map((id, index) => ({ ...sgMap[id], order: index }));
        return { ...goal, subGoals: reordered };
      })
    );
  };

  // ========== COMPUTED HELPERS ==========

  /**
   * Calculate progress percentage for a goal
   * @param {string} goalId - Goal ID
   * @returns {number} Progress percentage (0-100)
   */
  const getGoalProgress = useCallback((goalId) => {
    const goal = goals.find(g => g.id === goalId);
    if (!goal) return 0;

    if (goal.status === 'completed') return 100;

    const subGoals = goal.subGoals || [];
    if (subGoals.length === 0) return 0;

    const completed = subGoals.filter(sg => sg.isCompleted).length;
    return Math.round((completed / subGoals.length) * 100);
  }, [goals]);

  /**
   * Get goals filtered by status
   * @param {string} status - 'active' | 'completed' | 'archived'
   * @returns {object[]} Filtered goals
   */
  const getGoalsByStatus = useCallback((status) => {
    return goals.filter(g => g.status === status);
  }, [goals]);

  /**
   * Get goals filtered by category
   * @param {string} category - Category name
   * @returns {object[]} Filtered goals
   */
  const getGoalsByCategory = useCallback((category) => {
    return goals.filter(g => g.category === category);
  }, [goals]);

  /**
   * Get goals that are past their target date and not completed
   * @returns {object[]} Overdue goals
   */
  const getOverdueGoals = useCallback(() => {
    const today = new Date().toISOString().split('T')[0];
    return goals.filter(g => g.status === 'active' && g.targetDate < today);
  }, [goals]);

  /**
   * Get goals with deadlines within N days
   * @param {number} days - Number of days to look ahead
   * @returns {object[]} Goals with upcoming deadlines
   */
  const getUpcomingDeadlines = useCallback((days = 7) => {
    const today = new Date();
    const future = new Date(today);
    future.setDate(today.getDate() + days);
    const todayStr = today.toISOString().split('T')[0];
    const futureStr = future.toISOString().split('T')[0];

    return goals.filter(g =>
      g.status === 'active' && g.targetDate >= todayStr && g.targetDate <= futureStr
    );
  }, [goals]);

  /**
   * Get summary statistics across all goals
   * @returns {object} Stats object
   */
  const getGoalStats = useCallback(() => {
    const today = new Date().toISOString().split('T')[0];
    const active = goals.filter(g => g.status === 'active');
    const completed = goals.filter(g => g.status === 'completed');
    const overdue = active.filter(g => g.targetDate < today);
    const onTrack = active.filter(g => g.targetDate >= today);

    return {
      total: goals.length,
      active: active.length,
      completed: completed.length,
      archived: goals.filter(g => g.status === 'archived').length,
      overdue: overdue.length,
      onTrack: onTrack.length
    };
  }, [goals]);

  return {
    goals,
    goalsLoading,
    // Goal CRUD
    addGoal,
    updateGoal,
    deleteGoal,
    completeGoal,
    archiveGoal,
    reorderGoals,
    // Sub-goal methods
    addSubGoal,
    updateSubGoal,
    deleteSubGoal,
    toggleSubGoal,
    reorderSubGoals,
    // Computed helpers
    getGoalProgress,
    getGoalsByStatus,
    getGoalsByCategory,
    getOverdueGoals,
    getUpcomingDeadlines,
    getGoalStats
  };
}
