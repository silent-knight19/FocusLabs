/* eslint-disable react-refresh/only-export-components */
import React, { createContext, useContext, useMemo } from 'react';
import { useHabits } from '../hooks/useHabits';
import { useCustomHabits } from '../hooks/useCustomHabits';
import { useActiveHabit } from '../hooks/useActiveHabit';

const HabitsContext = createContext(null);

/**
 * HabitsProvider provides access to standard habits, custom date-range habits,
 * subtasks, and all completion metrics/CRUD operations.
 */
export function HabitsProvider({ children }) {
  const habitsData = useHabits();
  const customHabitsData = useCustomHabits();
  const activeData = useActiveHabit(habitsData.habits, customHabitsData.customHabits);

  const value = useMemo(() => ({
    ...habitsData,
    ...customHabitsData,
    activeData,
    loading: habitsData.loading || customHabitsData.loading
  }), [habitsData, customHabitsData, activeData]);

  return (
    <HabitsContext.Provider value={value}>
      {children}
    </HabitsContext.Provider>
  );
}

/**
 * Custom hook to consume the HabitsContext
 */
export function useHabitsContext() {
  const context = useContext(HabitsContext);
  if (!context) {
    throw new Error('useHabitsContext must be used within HabitsProvider');
  }
  return context;
}
