/** Month key helpers for Firestore monthly sharding */

export function getMonthKey(date = new Date()) {
  const d = date instanceof Date ? date : new Date(date);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  return `${y}-${m}`;
}

export function getMonthKeysForRange(startDate, endDate) {
  const keys = new Set();
  const current = new Date(startDate.getFullYear(), startDate.getMonth(), 1);
  const end = new Date(endDate.getFullYear(), endDate.getMonth(), 1);

  while (current <= end) {
    keys.add(getMonthKey(current));
    current.setMonth(current.getMonth() + 1);
  }
  return Array.from(keys);
}

export function getRecentMonthKeys(count = 2) {
  const keys = [];
  const now = new Date();
  for (let i = 0; i < count; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    keys.push(getMonthKey(d));
  }
  return keys;
}

/** Convert full date key YYYY-MM-DD to day-of-month string */
export function dateKeyToDay(dateKey) {
  if (!dateKey || typeof dateKey !== 'string') return null;
  const parts = dateKey.split('-');
  return parts.length >= 3 ? parts[2] : null;
}

/** Convert day + monthKey to full date key */
export function dayToDateKey(monthKey, day) {
  const dayStr = String(day).padStart(2, '0');
  return `${monthKey}-${dayStr}`;
}

/** Extract month key from full date key */
export function dateKeyToMonthKey(dateKey) {
  if (!dateKey || typeof dateKey !== 'string') return null;
  const parts = dateKey.split('-');
  if (parts.length < 2) return null;
  return `${parts[0]}-${parts[1]}`;
}

/** Split legacy completions object into monthly shards */
export function shardCompletionsByMonth(completions) {
  const shards = {};
  if (!completions || typeof completions !== 'object') return shards;

  for (const [habitId, dates] of Object.entries(completions)) {
    if (!dates || typeof dates !== 'object') continue;
    for (const [dateKey, status] of Object.entries(dates)) {
      const monthKey = dateKeyToMonthKey(dateKey);
      const day = dateKeyToDay(dateKey);
      if (!monthKey || !day) continue;
      if (!shards[monthKey]) shards[monthKey] = {};
      if (!shards[monthKey][habitId]) shards[monthKey][habitId] = {};
      shards[monthKey][habitId][day] = status;
    }
  }
  return shards;
}

/** Merge monthly shards into legacy completions format */
export function mergeMonthlyCompletions(monthlyDocs) {
  const merged = {};
  for (const [monthKey, monthData] of Object.entries(monthlyDocs)) {
    if (!monthData || typeof monthData !== 'object') continue;
    for (const [habitId, days] of Object.entries(monthData)) {
      if (!merged[habitId]) merged[habitId] = {};
      for (const [day, status] of Object.entries(days || {})) {
        merged[habitId][dayToDateKey(monthKey, day)] = status;
      }
    }
  }
  return merged;
}

/** Merge monthly shards keyed by monthKey */
export function mergeMonthlyShards(shardsByMonth) {
  const merged = {};
  for (const [monthKey, monthData] of Object.entries(shardsByMonth)) {
    if (!monthData || typeof monthData !== 'object') continue;
    for (const [habitId, days] of Object.entries(monthData)) {
      if (!merged[habitId]) merged[habitId] = {};
      for (const [day, status] of Object.entries(days || {})) {
        merged[habitId][dayToDateKey(monthKey, day)] = status;
      }
    }
  }
  return merged;
}

/** Apply completion update to monthly shards */
export function applyCompletionUpdate(shardsByMonth, updater) {
  const merged = mergeMonthlyShards(shardsByMonth);
  const updated = typeof updater === 'function' ? updater(merged) : updater;
  return shardCompletionsByMonth(updated);
}
