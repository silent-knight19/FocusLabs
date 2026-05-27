import { describe, it, expect } from 'vitest';
import { formatDateKey } from '../dateHelpers';
import { calculateCurrentStreak } from '../streakHelpers';
import { getMonthKey, shardCompletionsByMonth, mergeMonthlyShards } from '../monthKeyHelpers';
import { generateId } from '../idHelpers';
import { validateImportData } from '../storageHelpers';

describe('dateHelpers', () => {
  it('formatDateKey returns YYYY-MM-DD', () => {
    const key = formatDateKey(new Date(2026, 4, 24));
    expect(key).toBe('2026-05-24');
  });
});

describe('streakHelpers', () => {
  it('calculateCurrentStreak counts consecutive completed days', () => {
    const today = new Date(2026, 4, 24);
    const completions = {
      '2026-05-24': 'completed',
      '2026-05-23': 'completed',
      '2026-05-22': 'failed',
    };
    expect(calculateCurrentStreak(completions, today)).toBe(2);
  });
});

describe('monthKeyHelpers', () => {
  it('shards and merges completions', () => {
    const completions = {
      h1: { '2026-05-01': 'completed', '2026-05-02': 'completed' },
    };
    const shards = shardCompletionsByMonth(completions);
    expect(Object.keys(shards)).toContain('2026-05');
    const merged = mergeMonthlyShards(shards);
    expect(merged.h1['2026-05-01']).toBe('completed');
  });

  it('getMonthKey returns YYYY-MM', () => {
    expect(getMonthKey(new Date(2026, 0, 15))).toBe('2026-01');
  });
});

describe('idHelpers', () => {
  it('generateId includes prefix', () => {
    expect(generateId('habit')).toMatch(/^habit_/);
  });
});

describe('validateImportData', () => {
  it('rejects invalid data', () => {
    expect(validateImportData(null).valid).toBe(false);
  });

  it('accepts valid habit export', () => {
    const result = validateImportData({
      data: {
        habits: [{ id: '1', name: 'Read' }],
        completions: {},
      },
    });
    expect(result.valid).toBe(true);
  });
});
