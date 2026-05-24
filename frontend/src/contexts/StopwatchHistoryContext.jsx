import React, { createContext, useContext } from 'react';
import { useMonthlyStopwatch } from '../hooks/useMonthlyStopwatch';
import { useAuth } from './AuthContext';

const StopwatchHistoryContext = createContext(null);

export function StopwatchHistoryProvider({ children }) {
  const { user } = useAuth();
  const userId = user?.uid;
  const [history, setHistory, loading, loadMore] = useMonthlyStopwatch(userId);

  return (
    <StopwatchHistoryContext.Provider value={{ history, setHistory, loading, loadMore }}>
      {children}
    </StopwatchHistoryContext.Provider>
  );
}

export function useStopwatchHistory() {
  const ctx = useContext(StopwatchHistoryContext);
  if (!ctx) {
    throw new Error('useStopwatchHistory must be used within StopwatchHistoryProvider');
  }
  return ctx;
}
