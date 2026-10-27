// Odd one out: every item but one shares a property. Higher levels add
// distracting properties that vary but never single out another item.

import { DOMAINS, makeItem } from "./shapes.js";

export const skill = "classify";

const RULE_ATTRS_BY_LEVEL = (level) =>
  level <= 2 ? ["shape", "color"] : level <= 5 ? ["shape", "color", "size"] : ["shape", "color", "size", "fill"];

const REASONS = {
  shape: (common, odd) => `All the others are ${common}s. This one is a ${odd}.`,
  color: (common, odd) => `All the others are ${common}. This one is ${odd}.`,
  size: (common, odd) => `All the others are ${common}. This one is ${odd}.`,
  fill: (common, odd) =>
    `All the others are ${common === "solid" ? "filled in" : "outlines"}. This one is ${odd === "solid" ? "filled in" : "an outline"}.`,
};

/** True if exactly one item differs on `attr` while all others share one value. */
export function singlesOut(items, attr) {
  const counts = new Map();
  for (const it of items) counts.set(it[attr], (counts.get(it[attr]) ?? 0) + 1);
  const values = [...counts.values()].sort((a, b) => a - b);
  return values.length === 2 && values[0] === 1;
}

function attempt(level, rng) {
  const n = level <= 3 ? 4 : level <= 7 ? 5 : 6;
  const ruleAttrs = RULE_ATTRS_BY_LEVEL(level);
  const rule = rng.pick(ruleAttrs);
  const nDistractors = level <= 3 ? 0 : level <= 6 ? 1 : 2;
  const distractorAttrs = rng.sample(["shape", "color", "size", "fill"].filter((a) => a !== rule), nDistractors);

  const base = makeItem({
    shape: rng.pick(DOMAINS.shape),
    color: rng.pick(DOMAINS.color),
    size: "large",
    fill: "solid",
  });
  const [common, odd] = rng.sample(DOMAINS[rule], 2);
  const oddIndex = rng.int(0, n - 1);

  const items = Array.from({ length: n }, (_, i) => {
    const item = { ...base, [rule]: i === oddIndex ? odd : common };
    for (const attr of distractorAttrs) item[attr] = rng.pick(DOMAINS[attr]);
    return item;
  });

  // Reject layouts where a distracting property also singles out one item,
  // which would make two different answers defensible.
  if (distractorAttrs.some((attr) => singlesOut(items, attr))) return null;
  return { items, rule, common, odd, oddIndex };
}

export function generate(level, rng) {
  let result = null;
  for (let tries = 0; !result && tries < 500; tries++) result = attempt(level, rng);
  if (!result) throw new Error("could not build an unambiguous odd-one-out puzzle");
  const { items, rule, common, odd, oddIndex } = result;

  return {
    type: "oddoneout",
    skill,
    level,
    prompt: "Which one does not belong?",
    stimulus: null,
    options: items.map((item) => ({ kind: "item", item })),
    answerIndex: oddIndex,
    hint: "Check one thing at a time: shape, then colour, then size.",
    explanation: REASONS[rule](common, odd),
    meta: { rule },
  };
}
