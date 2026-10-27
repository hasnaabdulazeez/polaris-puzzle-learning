import assert from "node:assert/strict";
import { test } from "node:test";

import {
  BASE_RATING,
  expectedScore,
  levelForRating,
  planSession,
  ratingToUnit,
  updateRating,
} from "../js/engine/adaptive.js";
import {
  createProfile,
  currentStreak,
  exportProfile,
  finishSession,
  loadState,
  memoryStorage,
  recordAnswer,
  saveState,
  stars,
} from "../js/engine/progress.js";
import { Rng } from "../js/rng.js";

const SKILLS = ["numbers", "patterns", "matrices", "memory", "classify", "logic"];

test("new players start at level 1", () => {
  assert.equal(levelForRating(BASE_RATING), 1);
});

test("expected score falls as level rises", () => {
  assert.ok(expectedScore(1200, 2) > expectedScore(1200, 5));
});

test("correct answers raise the rating, wrong answers lower it, hints count half", () => {
  const up = updateRating(1000, 3, 1);
  const half = updateRating(1000, 3, 0.5);
  const down = updateRating(1000, 3, 0);
  assert.ok(up > half && half > down);
  assert.ok(up > 1000 && down < 1000);
});

test("rating changes shrink with experience", () => {
  const early = updateRating(1000, 3, 1, 0) - 1000;
  const late = updateRating(1000, 3, 1, 50) - 1000;
  assert.ok(early > late);
});

test("a run of correct answers climbs levels, capped at 10", () => {
  let rating = BASE_RATING;
  const levels = [];
  for (let i = 0; i < 120; i++) {
    const level = levelForRating(rating);
    levels.push(level);
    rating = updateRating(rating, level, 1, i);
  }
  assert.ok(levels.at(-1) > levels[0]);
  assert.ok(levels.every((l) => l >= 1 && l <= 10));
  assert.deepEqual(levels, [...levels].sort((a, b) => a - b), "levels never drop on all-correct runs");
  assert.equal(levelForRating(99999), 10);
});

test("chosen level targets roughly 75% expected success", () => {
  for (const rating of [1100, 1250, 1400]) {
    const p = expectedScore(rating, levelForRating(rating));
    assert.ok(p > 0.6 && p < 0.9, `expected ${p}`);
  }
});

test("ratingToUnit is clamped to 0..1", () => {
  assert.equal(ratingToUnit(0), 0);
  assert.equal(ratingToUnit(5000), 1);
});

test("session plan covers every skill, favours weak ones and avoids repeats", () => {
  const ratings = { numbers: 1300, patterns: 1250, matrices: 900, memory: 950, classify: 1200, logic: 1000 };
  const plan = planSession(ratings, 12, new Rng(7));
  assert.equal(plan.length, 12);
  for (const s of SKILLS) assert.ok(plan.includes(s), `${s} included`);
  const count = (s) => plan.filter((x) => x === s).length;
  assert.ok(count("matrices") > count("numbers"));
  for (let i = 1; i < plan.length; i++) assert.notEqual(plan[i], plan[i - 1]);
});

test("profiles record answers and sessions", () => {
  const p = createProfile("  Aisha  ", "🦊", SKILLS, new Date("2026-01-01"));
  assert.equal(p.name, "Aisha");
  const delta = recordAnswer(p, "logic", 1, 1);
  assert.ok(delta > 0);
  assert.equal(p.attempts.logic, 1);
  assert.equal(p.correct.logic, 1);
  const s = finishSession(p, [
    { skill: "logic", score: 1, hint: false, delta },
    { skill: "memory", score: 0, hint: true, delta: -5 },
  ]);
  assert.deepEqual([s.total, s.correct, s.hintsUsed], [2, 1, 1]);
  assert.equal(p.sessions.length, 1);
  assert.equal(JSON.parse(exportProfile(p)).profile.name, "Aisha");
});

test("streak counts consecutive days ending today or yesterday", () => {
  const now = new Date(2026, 9, 27, 18);
  const day = (d) => ({ date: new Date(2026, 9, d, 10).toISOString() });
  assert.equal(currentStreak([day(25), day(26), day(27)], now), 3);
  assert.equal(currentStreak([day(25), day(26)], now), 2);
  assert.equal(currentStreak([day(20), day(26)], now), 1);
  assert.equal(currentStreak([day(20)], now), 0);
});

test("stars thresholds", () => {
  assert.deepEqual([stars(12, 12), stars(9, 12), stars(5, 12), stars(2, 12)], [3, 2, 1, 0]);
});

test("state survives a save/load round trip and bad data falls back cleanly", () => {
  const storage = memoryStorage();
  saveState(storage, { profiles: [{ id: "x" }], activeId: "x" });
  assert.equal(loadState(storage).activeId, "x");
  storage.setItem("polaris.v1", "{not json");
  assert.deepEqual(loadState(storage), { profiles: [], activeId: null });
});
