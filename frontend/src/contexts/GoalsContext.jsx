/* eslint-disable react-refresh/only-export-components */
import React, { createContext, useContext } from 'react';
import { useGoals } from '../hooks/useGoals';

const GoalsContext = createContext(null);

/**
 * GoalsProvider wraps the useGoals hook to provide a global goal tracking state.
 */
export function GoalsProvider({ children }) {
  const goalsData = useGoals();

  return (
    <GoalsContext.Provider value={goalsData}>
      {children}
    </GoalsContext.Provider>
  );
}

/**
 * Custom hook to consume the GoalsContext
 */
export function useGoalsContext() {
  const context = useContext(GoalsContext);
  if (!context) {
    throw new Error('useGoalsContext must be used within GoalsProvider');
  }
  return context;
}
