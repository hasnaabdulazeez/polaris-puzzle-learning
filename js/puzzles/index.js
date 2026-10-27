import * as logic from "./logic.js";
import * as matrix from "./matrix.js";
import * as memory from "./memory.js";
import * as oddoneout from "./oddoneout.js";
import * as pattern from "./pattern.js";
import * as sequence from "./sequence.js";

export const GENERATORS = {
  numbers: sequence,
  patterns: pattern,
  matrices: matrix,
  memory,
  classify: oddoneout,
  logic,
};

export const SKILLS = [
  { id: "numbers", label: "Number patterns", emoji: "🔢" },
  { id: "patterns", label: "Visual patterns", emoji: "🔷" },
  { id: "matrices", label: "Matrix puzzles", emoji: "🧩" },
  { id: "memory", label: "Memory", emoji: "🧠" },
  { id: "classify", label: "Odd one out", emoji: "🔍" },
  { id: "logic", label: "Logic", emoji: "💡" },
];

export function generatePuzzle(skillId, level, rng) {
  const gen = GENERATORS[skillId];
  if (!gen) throw new Error(`unknown skill: ${skillId}`);
  return gen.generate(Math.max(1, Math.min(10, Math.round(level))), rng);
}
