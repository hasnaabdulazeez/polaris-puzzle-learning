// Logical deduction: ordering clues ("Anu is taller than Ben") → who is tallest / shortest / in the middle?

import { buildOptions } from "./options.js";

export const skill = "logic";

const NAMES = ["Anu", "Ben", "Chen", "Dia", "Eli", "Fatima", "Gopal", "Hana", "Ivan", "Joy"];

const RELATIONS = [
  { more: "taller", less: "shorter", most: "tallest", least: "shortest" },
  { more: "faster", less: "slower", most: "fastest", least: "slowest" },
  { more: "older", less: "younger", most: "oldest", least: "youngest" },
];

export function generate(level, rng) {
  const n = level <= 3 ? 3 : level <= 7 ? 4 : 5;
  const rel = rng.pick(RELATIONS);
  const order = rng.sample(NAMES, n); // order[0] has the most of the property

  // Adjacent pairs fully determine the order; phrase each clue either way round.
  const clues = [];
  const pairs = [];
  for (let i = 0; i < n - 1; i++) {
    const [a, b] = [order[i], order[i + 1]];
    pairs.push([a, b]);
    clues.push(level >= 3 && rng.chance(0.5) ? `${b} is ${rel.less} than ${a}.` : `${a} is ${rel.more} than ${b}.`);
  }

  const questions = [
    { text: `Who is the ${rel.most}?`, answer: order[0] },
    { text: `Who is the ${rel.least}?`, answer: order[n - 1] },
  ];
  if (level >= 5) {
    if (n % 2 === 1) questions.push({ text: `Who is in the middle?`, answer: order[(n - 1) / 2] });
    questions.push({ text: `Who is the second ${rel.most}?`, answer: order[1] });
  }
  const q = rng.pick(questions);
  const { options, answerIndex } = buildOptions(rng, q.answer, rng.shuffle(order), String, Math.min(4, n));

  return {
    type: "logic",
    skill,
    level,
    prompt: q.text,
    stimulus: { kind: "text", lines: rng.shuffle(clues) },
    options: options.map((value) => ({ kind: "text", value })),
    answerIndex,
    hint: "Draw a line and place each person on it as you read the clues.",
    explanation: `In order from ${rel.most} to ${rel.least}: ${order.join(", ")}. So the answer is ${q.answer}.`,
    meta: { pairs, order, question: q.text, answer: q.answer },
  };
}
