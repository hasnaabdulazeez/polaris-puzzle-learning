// Shared helper: combine the correct answer with distinct distractors and shuffle.

export function buildOptions(rng, correct, candidates, keyFn, count = 4) {
  const seen = new Set([keyFn(correct)]);
  const distractors = [];
  for (const c of candidates) {
    const k = keyFn(c);
    if (!seen.has(k)) {
      seen.add(k);
      distractors.push(c);
    }
    if (distractors.length === count - 1) break;
  }
  if (distractors.length < count - 1) {
    throw new Error(`not enough distinct distractors (${distractors.length + 1}/${count})`);
  }
  const options = rng.shuffle([correct, ...distractors]);
  return { options, answerIndex: options.findIndex((o) => keyFn(o) === keyFn(correct)) };
}
