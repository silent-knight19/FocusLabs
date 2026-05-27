/* eslint-disable react-refresh/only-export-components */
import React, { createContext, useContext, useMemo } from 'react';
import { useMonthlyStopwatch } from '../hooks/useMonthlyStopwatch';
import { useAuth } from './AuthContext';

const StopwatchHistoryContext = createContext(null);

export function StopwatchHistoryProvider({ children }) {
  const { user } = useAuth();
  const userId = user?.uid;
  const [history, setHistory, loading, loadMore, flushNow] = useMonthlyStopwatch(userId);

  const value = useMemo(
    () => ({ history, setHistory, loading, loadMore, flushNow }),
    [history, setHistory, loading, loadMore, flushNow]
  );

  return (
    <StopwatchHistoryContext.Provider value={value}>
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
