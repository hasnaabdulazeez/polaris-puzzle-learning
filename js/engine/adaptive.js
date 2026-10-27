// Adaptive difficulty with an Elo-style rating per skill.
//
// Each level has a fixed difficulty rating. After every answer the child's skill
// rating moves towards what the result implies, and the next puzzle is set at the
// level the child is expected to solve about 75% of the time: hard enough to
// stretch, easy enough to stay motivated.

export const BASE_RATING = 1000;
export const MIN_LEVEL = 1;
export const MAX_LEVEL = 10;
export const TARGET_SUCCESS = 0.75;

export function levelDifficulty(level) {
  return 800 + 80 * level;
}

export function expectedScore(rating, level) {
  return 1 / (1 + 10 ** ((levelDifficulty(level) - rating) / 400));
}

/** K shrinks with experience: ratings move fast at first, then settle. */
export function kFactor(attempts) {
  return Math.max(24, 64 - 4 * attempts);
}

/** score: 1 = correct, 0.5 = correct with a hint, 0 = wrong. */
export function updateRating(rating, level, score, attempts = 0) {
  return rating + kFactor(attempts) * (score - expectedScore(rating, level));
}

export function levelForRating(rating, target = TARGET_SUCCESS) {
  const difficulty = rating + 400 * Math.log10(1 / target - 1);
  const level = Math.round((difficulty - 800) / 80);
  return Math.min(MAX_LEVEL, Math.max(MIN_LEVEL, level));
}

/** 0..1 for charts: level 1 difficulty maps to ~0, level 10 to 1. */
export function ratingToUnit(rating) {
  return Math.min(1, Math.max(0, (rating - levelDifficulty(MIN_LEVEL) + 160) / (levelDifficulty(MAX_LEVEL) - levelDifficulty(MIN_LEVEL) + 160)));
}

/**
 * Plan a session: every skill appears at least once, extra slots go to the
 * weakest skills, and the same skill never appears twice in a row when avoidable.
 */
export function planSession(ratings, length, rng) {
  const skills = Object.keys(ratings).sort((a, b) => ratings[a] - ratings[b] || a.localeCompare(b));
  const counts = Object.fromEntries(skills.map((s) => [s, 0]));
  for (let i = 0; i < length; i++) {
    counts[i < skills.length ? skills[i] : skills[(i - skills.length) % Math.ceil(skills.length / 2)]]++;
  }

  const plan = [];
  let last = null;
  while (plan.length < length) {
    const available = skills.filter((s) => counts[s] > 0);
    const pool = available.filter((s) => s !== last);
    const choices = pool.length ? pool : available;
    const maxLeft = Math.max(...choices.map((s) => counts[s]));
    const pick = rng.pick(choices.filter((s) => counts[s] === maxLeft));
    plan.push(pick);
    counts[pick]--;
    last = pick;
  }
  return plan;
}
