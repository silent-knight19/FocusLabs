import { useContext } from 'react';
import { StopwatchContext } from '../contexts/StopwatchContext';

/**
 * Custom hook to consume the shared global StopwatchContext.
 * Returns the exact same interface as the original local hook, ensuring
 * 100% backwards-compatibility while achieving perfect synchronization and accuracy.
 * 
 * @returns {object} The shared stopwatch state and controls.
 */
export function useStopwatch() {
  const context = useContext(StopwatchContext);
  if (!context) {
    throw new Error('useStopwatch must be used within a StopwatchProvider');
  }
  return context;
}
