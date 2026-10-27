// Working memory: a row of shapes is shown briefly, then hidden. Which shape was in position k?

import { buildOptions } from "./options.js";
import { COLOR_NAMES, SHAPES, describe, itemKey, makeItem } from "./shapes.js";

export const skill = "memory";

const ORDINALS = ["first", "second", "third", "fourth", "fifth", "sixth", "seventh"];

export function sequenceLength(level) {
  return Math.min(7, 3 + Math.floor((level - 1) / 2));
}

export function displayMs(level) {
  return Math.round(sequenceLength(level) * (950 - 45 * level) + 900);
}

export function generate(level, rng) {
  const length = sequenceLength(level);
  const items = rng.sample(SHAPES, Math.min(length, SHAPES.length)).map((shape) =>
    makeItem({ shape, color: rng.pick(COLOR_NAMES) })
  );
  while (items.length < length) {
    // More positions than shapes: reuse a shape in a colour not used for it yet.
    const shape = rng.pick(SHAPES);
    const used = items.filter((i) => i.shape === shape).map((i) => i.color);
    items.push(makeItem({ shape, color: rng.pick(COLOR_NAMES.filter((c) => !used.includes(c))) }));
  }

  const position = rng.int(0, length - 1);
  const answer = items[position];
  // At higher levels, wrong options come from the same row, which is harder than unseen shapes.
  const fromRow = items.filter((_, i) => i !== position);
  const unseen = SHAPES.map((shape) => makeItem({ shape, color: rng.pick(COLOR_NAMES) }));
  const candidates = level >= 4 ? [...rng.shuffle(fromRow), ...unseen] : [...unseen, ...rng.shuffle(fromRow)];
  const { options, answerIndex } = buildOptions(rng, answer, candidates, itemKey);

  return {
    type: "memory",
    skill,
    level,
    prompt: `Which shape was ${ORDINALS[position]}?`,
    stimulus: { kind: "memory", items, showMs: displayMs(level) },
    options: options.map((item) => ({ kind: "item", item })),
    answerIndex,
    hint: "Try saying the shapes out loud while they are showing.",
    explanation: `The row was: ${items.map(describe).join(", ")}. The ${ORDINALS[position]} one was ${describe(answer)}.`,
    meta: { position },
  };
}
