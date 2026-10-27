// Child profiles and progress, persisted in the browser.
// All storage access is wrapped so the app still works (in memory) when
// localStorage is blocked, e.g. in private windows or embedded previews.

import { BASE_RATING, updateRating } from "./adaptive.js";

const KEY = "polaris.v1";

export function memoryStorage() {
  const data = new Map();
  return {
    getItem: (k) => (data.has(k) ? data.get(k) : null),
    setItem: (k, v) => data.set(k, String(v)),
    removeItem: (k) => data.delete(k),
  };
}

export function safeStorage() {
  try {
    const s = globalThis.localStorage;
    const probe = "__polaris_probe__";
    s.setItem(probe, "1");
    s.removeItem(probe);
    return s;
  } catch {
    return memoryStorage();
  }
}

export function loadState(storage) {
  try {
    const raw = storage.getItem(KEY);
    if (raw) return JSON.parse(raw);
  } catch {
    /* corrupted or unavailable storage: start fresh */
  }
  return { profiles: [], activeId: null };
}

export function saveState(storage, state) {
  try {
    storage.setItem(KEY, JSON.stringify(state));
  } catch {
    /* quota exceeded or blocked: keep running in memory */
  }
}

export function createProfile(name, avatar, skills, now = new Date()) {
  return {
    id: `p_${now.getTime().toString(36)}_${Math.random().toString(36).slice(2, 7)}`,
    name: name.trim().slice(0, 24),
    avatar,
    createdAt: now.toISOString(),
    ratings: Object.fromEntries(skills.map((s) => [s, BASE_RATING])),
    attempts: Object.fromEntries(skills.map((s) => [s, 0])),
    correct: Object.fromEntries(skills.map((s) => [s, 0])),
    sessions: [],
  };
}

/** Apply one answer to a profile (mutates) and return the rating change. */
export function recordAnswer(profile, skill, level, score) {
  const before = profile.ratings[skill];
  profile.ratings[skill] = updateRating(before, level, score, profile.attempts[skill]);
  profile.attempts[skill] += 1;
  if (score > 0) profile.correct[skill] += 1;
  return profile.ratings[skill] - before;
}

export function dayKey(date) {
  const d = new Date(date);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

/** Consecutive days with at least one session, ending today or yesterday. */
export function currentStreak(sessions, now = new Date()) {
  const days = new Set(sessions.map((s) => dayKey(s.date)));
  const cursor = new Date(now);
  if (!days.has(dayKey(cursor))) cursor.setDate(cursor.getDate() - 1);
  let streak = 0;
  while (days.has(dayKey(cursor))) {
    streak++;
    cursor.setDate(cursor.getDate() - 1);
  }
  return streak;
}

export function finishSession(profile, results, now = new Date()) {
  const session = {
    date: now.toISOString(),
    total: results.length,
    correct: results.filter((r) => r.score > 0).length,
    hintsUsed: results.filter((r) => r.hint).length,
    bySkill: {},
  };
  for (const r of results) {
    const s = (session.bySkill[r.skill] ??= { total: 0, correct: 0, delta: 0 });
    s.total++;
    if (r.score > 0) s.correct++;
    s.delta += r.delta;
  }
  profile.sessions.push(session);
  return session;
}

export function stars(correct, total) {
  const pct = total ? correct / total : 0;
  return pct >= 0.9 ? 3 : pct >= 0.7 ? 2 : pct >= 0.4 ? 1 : 0;
}

export function exportProfile(profile) {
  return JSON.stringify({ app: "Polaris", version: 1, exportedAt: new Date().toISOString(), profile }, null, 2);
}
