// Repeating visual patterns: find the shape that continues the sequence.

import { buildOptions } from "./options.js";
import { COLOR_NAMES, SHAPES, describe, itemKey, makeItem } from "./shapes.js";

export const skill = "patterns";

function unitLength(level) {
  if (level <= 2) return 2;
  if (level <= 5) return 3;
  if (level <= 8) return 4;
  return 5;
}

export function generate(level, rng) {
  const length = unitLength(level);
  let unit;
  if (level <= 4) {
    // Only one attribute changes, so younger players can focus on it.
    if (rng.chance(0.5)) {
      const color = rng.pick(COLOR_NAMES);
      unit = rng.sample(SHAPES, length).map((shape) => makeItem({ shape, color }));
    } else {
      const shape = rng.pick(SHAPES);
      unit = rng.sample(COLOR_NAMES, length).map((color) => makeItem({ shape, color }));
    }
  } else {
    // Shape and colour both change: the player must track two attributes at once.
    const shapes = rng.sample(SHAPES, length);
    const colors = rng.sample(COLOR_NAMES, length);
    unit = shapes.map((shape, i) => makeItem({ shape, color: colors[(i + 1) % length] }));
  }

  const shown = 2 * length + rng.int(0, length - 1);
  const sequence = Array.from({ length: shown }, (_, i) => unit[i % length]);
  const answer = unit[shown % length];

  // Tempting wrong answers: other pattern members, and the right shape in the wrong colour.
  const candidates = [
    ...rng.shuffle(unit),
    makeItem({ shape: answer.shape, color: rng.pick(COLOR_NAMES.filter((c) => c !== answer.color)) }),
    makeItem({ shape: rng.pick(SHAPES.filter((s) => s !== answer.shape)), color: answer.color }),
    ...SHAPES.map((shape) => makeItem({ shape, color: rng.pick(COLOR_NAMES) })),
  ];
  const { options, answerIndex } = buildOptions(rng, answer, candidates, itemKey);

  return {
    type: "pattern",
    skill,
    level,
    prompt: "Which shape comes next?",
    stimulus: { kind: "items", items: [...sequence, null] },
    options: options.map((item) => ({ kind: "item", item })),
    answerIndex,
    hint: `The pattern repeats every ${length} shapes. Find where it starts again.`,
    explanation: `The pattern repeats: ${unit.map(describe).join(", ")}. After ${describe(sequence.at(-1))} comes ${describe(answer)}.`,
    meta: { unit, shown },
  };
}
