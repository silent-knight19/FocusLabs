const PRODUCTIVE_ALIASES = new Set([
  'prod',
  'productive',
  'productivity',
  'work'
]);

const SELF_GROWTH_ALIASES = new Set([
  'self',
  'self growth',
  'self-growth',
  'personal',
  'health',
  'fitness',
  'social'
]);

function normalizeString(value) {
  return String(value || '').trim().toLowerCase();
}

function inferCategoryFromLabel(label) {
  const normalizedLabel = normalizeString(label);

  if (normalizedLabel.includes('study')) return 'study';
  if (
    normalizedLabel.includes('productive') ||
    normalizedLabel.includes('productivity') ||
    normalizedLabel.includes('work')
  ) {
    return 'prod';
  }
  if (
    normalizedLabel.includes('self') ||
    normalizedLabel.includes('growth') ||
    normalizedLabel.includes('fitness') ||
    normalizedLabel.includes('health')
  ) {
    return 'self';
  }

  return 'other';
}

export function normalizeFocusCategory(category, label = '') {
  const normalizedCategory = normalizeString(category);

  if (normalizedCategory === 'study') return 'study';
  if (PRODUCTIVE_ALIASES.has(normalizedCategory)) return 'prod';
  if (SELF_GROWTH_ALIASES.has(normalizedCategory)) return 'self';
  if (normalizedCategory === 'other') return 'other';

  return inferCategoryFromLabel(label);
}

export function isStudySession(session) {
  return normalizeFocusCategory(session?.category, session?.label) === 'study';
}

export function isProductiveSession(session) {
  const category = normalizeFocusCategory(session?.category, session?.label);
  return category === 'prod' || category === 'self';
}

export function normalizeSessionRecord(session, options = {}) {
  if (!session || typeof session !== 'object') return null;

  const {
    fallbackCategory = 'other',
    fallbackId = null,
    fallbackLabel = 'Session'
  } = options;

  const category = normalizeFocusCategory(session.category || fallbackCategory, session.label);
  const rawDate = session.date ?? session.createdAt ?? session.timestamp ?? session.startedAt ?? session.startTime;
  const parsedDate = rawDate instanceof Date ? rawDate : new Date(rawDate);

  if (Number.isNaN(parsedDate.getTime())) {
    return null;
  }

  const rawTime = session.time ?? session.duration ?? session.durationMs ?? 0;
  const time = Number(rawTime);

  if (!Number.isFinite(time) || time < 0) {
    return null;
  }

  const label = typeof session.label === 'string' && session.label.trim()
    ? session.label
    : fallbackLabel;

  const id = session.id || fallbackId || `${parsedDate.toISOString()}_${time}_${category}_${label}`;

  return {
    ...session,
    id,
    date: parsedDate.toISOString(),
    time,
    category,
    label
  };
}

export function normalizeSessionList(sessions, options = {}) {
  if (!Array.isArray(sessions)) return [];

  return sessions
    .map((session, index) => normalizeSessionRecord(session, {
      ...options,
      fallbackId: options.fallbackId ? `${options.fallbackId}_${index}` : null,
      fallbackLabel: options.fallbackLabel || `Session ${index + 1}`
    }))
    .filter(Boolean);
}

export function mergeUniqueSessions(...groups) {
  const merged = [];
  const seen = new Set();

  groups.flat().forEach((session) => {
    if (!session || seen.has(session.id)) return;
    seen.add(session.id);
    merged.push(session);
  });

  merged.sort((a, b) => new Date(b.date) - new Date(a.date));
  return merged;
}
