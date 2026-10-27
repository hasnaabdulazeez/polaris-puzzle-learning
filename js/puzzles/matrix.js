// 3×3 matrix reasoning (in the style of Raven's matrices): find the missing tile.

import { buildOptions } from "./options.js";
import { COLOR_NAMES, SHAPES, describe, itemKey, makeItem } from "./shapes.js";

export const skill = "matrices";

function buildGrid(level, rng) {
  const shapes = rng.sample(SHAPES, 3);
  const colors = rng.sample(COLOR_NAMES, 3);

  if (level <= 3) {
    // Each row keeps its shape and colour; the count grows 1 → 2 → 3 across columns.
    return {
      cell: (r, c) => makeItem({ shape: shapes[r], color: colors[r], count: c + 1 }),
      rule: "In each row the shape stays the same and one more is added in each column.",
    };
  }
  if (level <= 6) {
    // Shape is set by the column, colour by the row.
    return {
      cell: (r, c) => makeItem({ shape: shapes[c], color: colors[r] }),
      rule: "Each column has its own shape and each row has its own colour.",
    };
  }
  // Latin squares: every row and column contains each shape and each colour once; count grows across columns.
  return {
    cell: (r, c) => makeItem({ shape: shapes[(r + c) % 3], color: colors[(r + 2 * c) % 3], count: c + 1 }),
    rule: "Every row and every column uses each shape once and each colour once, and the count grows across each row.",
  };
}

export function generate(level, rng) {
  const { cell, rule } = buildGrid(level, rng);
  const grid = [0, 1, 2].map((r) => [0, 1, 2].map((c) => cell(r, c)));
  const answer = grid[2][2];

  const otherShape = SHAPES.find((s) => s !== answer.shape && !grid.flat().some((g) => g.shape === s)) ?? SHAPES.find((s) => s !== answer.shape);
  const candidates = rng.shuffle([
    { ...answer, shape: grid[2][1].shape },
    { ...answer, color: grid[1][2].color },
    { ...answer, count: answer.count === 1 ? 2 : answer.count - 1 },
    { ...answer, shape: grid[0][2].shape },
    { ...answer, color: grid[2][0].color },
    { ...answer, shape: otherShape },
    { ...answer, count: answer.count + 1 },
  ]);
  const { options, answerIndex } = buildOptions(rng, answer, candidates, itemKey);

  return {
    type: "matrix",
    skill,
    level,
    prompt: "Which tile completes the grid?",
    stimulus: { kind: "grid", cells: grid.map((row, r) => row.map((item, c) => (r === 2 && c === 2 ? null : item))) },
    options: options.map((item) => ({ kind: "item", item })),
    answerIndex,
    hint: "Look across the rows first, then down the columns.",
    explanation: `${rule} So the missing tile is ${describe(answer)}.`,
    meta: { answer },
  };
}
