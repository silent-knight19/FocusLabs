import React, { createContext, useContext } from 'react';
import { useDailyTasks } from '../hooks/useDailyTasks.jsx';

const DailyPlannerContext = createContext(null);

/**
 * DailyPlannerProvider provides a global context for tracking and managing
 * the daily task planner.
 */
export function DailyPlannerProvider({ children }) {
  const dailyPlannerData = useDailyTasks();

  return (
    <DailyPlannerContext.Provider value={dailyPlannerData}>
      {children}
    </DailyPlannerContext.Provider>
  );
}

/**
 * Custom hook to consume the DailyPlannerContext
 */
export function useDailyPlannerContext() {
  const context = useContext(DailyPlannerContext);
  if (!context) {
    throw new Error('useDailyPlannerContext must be used within DailyPlannerProvider');
  }
  return context;
}
