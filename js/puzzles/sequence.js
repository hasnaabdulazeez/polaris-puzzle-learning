// Number sequences: arithmetic → geometric → growing differences → Fibonacci-style.

import { buildOptions } from "./options.js";

export const skill = "numbers";

function arithmetic(rng, level) {
  const step = level <= 1 ? rng.int(1, 2) : level <= 2 ? rng.int(2, 4) : level <= 4 ? rng.int(2, 9) : rng.int(11, 25);
  const down = level >= 3 && level <= 4 && rng.chance(0.4);
  const start = down ? step * 6 + rng.int(1, 10) : rng.int(1, 10);
  const terms = Array.from({ length: 6 }, (_, i) => start + (down ? -1 : 1) * step * i);
  return {
    terms,
    hint: "How much does each number change from the one before?",
    explanation: `Each number is ${step} ${down ? "less" : "more"} than the one before, so ${terms[4]} ${down ? "−" : "+"} ${step} = ${terms[5]}.`,
    near: [terms[5] + step, terms[5] - 1, terms[5] + 1, terms[5] + (down ? step : -step) * 2],
  };
}

function geometric(rng) {
  const factor = rng.pick([2, 2, 3]);
  const start = factor === 2 ? rng.int(1, 5) : rng.int(1, 3);
  const terms = Array.from({ length: 6 }, (_, i) => start * factor ** i);
  const diff = terms[4] - terms[3];
  return {
    terms,
    hint: "Try multiplying instead of adding.",
    explanation: `Each number is ${factor} times the one before: ${terms[4]} × ${factor} = ${terms[5]}.`,
    near: [terms[4] + diff, terms[5] + factor, terms[5] - factor, terms[4] * (factor + 1)],
  };
}

function growingDifference(rng) {
  const start = rng.int(1, 10);
  const first = rng.int(1, 3);
  const growth = rng.int(1, 2);
  const terms = [start];
  for (let i = 0; i < 5; i++) terms.push(terms[i] + first + growth * i);
  const lastGap = terms[5] - terms[4];
  return {
    terms,
    hint: "Write down the gaps between the numbers. Do the gaps follow a pattern?",
    explanation: `The gaps grow by ${growth} each time (${first}, ${first + growth}, ${first + 2 * growth}, …), so the next gap is ${lastGap}: ${terms[4]} + ${lastGap} = ${terms[5]}.`,
    near: [terms[4] + (terms[4] - terms[3]), terms[5] + growth, terms[5] - growth, terms[5] + 1],
  };
}

function alternating(rng) {
  const up = rng.int(3, 9);
  const down = rng.int(1, up - 1);
  const start = rng.int(5, 15);
  const terms = [start];
  for (let i = 0; i < 5; i++) terms.push(terms[i] + (i % 2 === 0 ? up : -down));
  return {
    terms,
    hint: "The rule switches back and forth. Look at every jump.",
    explanation: `The rule alternates: +${up}, then −${down}. The next step is +${up}, so ${terms[4]} + ${up} = ${terms[5]}.`,
    near: [terms[4] - down, terms[5] + down, terms[5] - 1, terms[4] + up - down],
  };
}

function fibonacciLike(rng) {
  const a = rng.int(1, 5);
  const b = rng.int(a, a + 4);
  const terms = [a, b];
  while (terms.length < 6) terms.push(terms.at(-1) + terms.at(-2));
  return {
    terms,
    hint: "Try combining the two numbers just before each one.",
    explanation: `Each number is the sum of the two before it: ${terms[3]} + ${terms[4]} = ${terms[5]}.`,
    near: [terms[4] + (terms[4] - terms[3]), terms[5] + 1, terms[5] - 2, terms[4] * 2],
  };
}

function squares(rng) {
  const s = rng.int(1, 5);
  const terms = Array.from({ length: 6 }, (_, i) => (s + i) ** 2);
  return {
    terms,
    hint: "Each number is a number multiplied by itself.",
    explanation: `These are square numbers: ${s}×${s}, ${s + 1}×${s + 1}, … so next is ${s + 5}×${s + 5} = ${terms[5]}.`,
    near: [terms[4] + (terms[4] - terms[3]), terms[5] + 1, terms[5] - (s + 5), terms[5] + 2 * (s + 5)],
  };
}

export function generate(level, rng) {
  let rule;
  if (level <= 4) rule = arithmetic(rng, level);
  else if (level <= 6) rule = rng.chance(0.5) ? geometric(rng) : arithmetic(rng, level);
  else if (level <= 8) rule = rng.chance(0.5) ? growingDifference(rng) : alternating(rng);
  else rule = rng.pick([fibonacciLike, squares, growingDifference])(rng);

  const answer = rule.terms[5];
  const fallback = [answer + 2, answer - 2, answer + 3, answer + 5, answer - 3, answer + 10];
  const candidates = [...rule.near, ...fallback].filter((n) => Number.isInteger(n) && n >= 0);
  const { options, answerIndex } = buildOptions(rng, answer, candidates, String);

  return {
    type: "sequence",
    skill,
    level,
    prompt: "What number comes next?",
    stimulus: { kind: "numbers", values: rule.terms.slice(0, 5) },
    options: options.map((value) => ({ kind: "number", value })),
    answerIndex,
    hint: rule.hint,
    explanation: rule.explanation,
    meta: { terms: rule.terms },
  };
}
