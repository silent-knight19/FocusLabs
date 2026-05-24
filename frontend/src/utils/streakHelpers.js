import { formatDateKey } from './dateHelpers';

/**
 * Calculate current streak for a habit from completions map
 */
export function calculateCurrentStreak(habitCompletions, today = new Date()) {
  const todayKey = formatDateKey(today);
  if (!habitCompletions || habitCompletions[todayKey] !== 'completed') {
    return 0;
  }

  let streak = 1;
  for (let i = 1; i < 365; i++) {
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
