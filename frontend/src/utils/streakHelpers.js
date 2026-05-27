import { formatDateKey } from './dateHelpers';

/**
 * Calculate current streak for a habit from completions map
 */
export function calculateCurrentStreak(habitCompletions, today = new Date()) {
  if (!habitCompletions) return 0;

  const todayKey = formatDateKey(today);
  
  // Keep streak alive if completed yesterday but not today yet
  let startOffset = 0;
  if (habitCompletions[todayKey] !== 'completed') {
    startOffset = 1;
  }

  let streak = 0;
  for (let i = startOffset; i < 365; i++) {
    const date = new Date(today);
    date.setDate(today.getDate() - i);
    const dateKey = formatDateKey(date);
    if (!dateKey) break;
    if (habitCompletions[dateKey] === 'completed') {
      streak++;
    } else {
      break;
    }
  }
  return streak;
}
