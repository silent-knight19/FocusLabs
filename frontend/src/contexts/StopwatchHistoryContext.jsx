import React, { createContext, useContext } from 'react';
import { useFirestore } from '../hooks/useFirestore';
import { useAuth } from './AuthContext';

/**
 * Context for sharing stopwatch history across components.
 * Eliminates duplicate Firestore listeners by providing a single source of truth.
 */
const StopwatchHistoryContext = createContext(null);

/**
 * Hook to access stopwatch history from the context.
 * Must be used within a StopwatchHistoryProvider.
 * @returns {{ history: Array, setHistory: Function, loading: boolean }}
 */
export function useStopwatchHistory() {
  const context = useContext(StopwatchHistoryContext);
  if (!context) {
    throw new Error('useStopwatchHistory must be used within a StopwatchHistoryProvider');
  }
  return context;
}

/**
 * Provider component that creates a single Firestore listener for stopwatch history.
 * Wraps children with the shared history context.
 */
export function StopwatchHistoryProvider({ children }) {
  const { user } = useAuth();
  const userId = user?.uid;

  // Single Firestore listener for stopwatch history
  const [history, setHistory, loading] = useFirestore(userId, 'stopwatch_history', []);

  const value = {
    history,
    setHistory,
    loading
  };

  return (
    <StopwatchHistoryContext.Provider value={value}>
      {children}
    </StopwatchHistoryContext.Provider>
  );
}
