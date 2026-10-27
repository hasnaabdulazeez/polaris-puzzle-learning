import assert from "node:assert/strict";
import { test } from "node:test";

import { GENERATORS, SKILLS, generatePuzzle } from "../js/puzzles/index.js";
import { singlesOut } from "../js/puzzles/oddoneout.js";
import { itemKey } from "../js/puzzles/shapes.js";
import { Rng } from "../js/rng.js";

const LEVELS = Array.from({ length: 10 }, (_, i) => i + 1);
const SEEDS = Array.from({ length: 40 }, (_, i) => 1000 + i);

function optionKey(opt) {
  return opt.kind === "item" ? itemKey(opt.item) : String(opt.value);
}

function* allPuzzles(skill) {
  for (const level of LEVELS) for (const seed of SEEDS) yield generatePuzzle(skill, level, new Rng(seed * 31 + level));
}

test("rng is deterministic for a seed", () => {
  const a = new Rng(42);
  const b = new Rng(42);
  assert.deepEqual([a.int(0, 100), a.int(0, 100), a.float()], [b.int(0, 100), b.int(0, 100), b.float()]);
});

test("every skill has a generator", () => {
  assert.deepEqual(Object.keys(GENERATORS).sort(), SKILLS.map((s) => s.id).sort());
});

for (const { id } of SKILLS) {
  test(`${id}: well-formed puzzles at every level`, () => {
    for (const p of allPuzzles(id)) {
      assert.equal(p.skill, id);
      assert.ok(p.prompt && p.hint && p.explanation, "text fields present");
      assert.ok(p.answerIndex >= 0 && p.answerIndex < p.options.length, "answer index in range");
      if (id !== "classify") {
        const keys = p.options.map(optionKey);
        assert.equal(new Set(keys).size, keys.length, `options must be distinct (${id} level ${p.level})`);
      }
    }
  });
}

test("numbers: answer is the sixth term and options are non-negative", () => {
  for (const p of allPuzzles("numbers")) {
    assert.equal(p.options[p.answerIndex].value, p.meta.terms[5]);
    assert.deepEqual(p.stimulus.values, p.meta.terms.slice(0, 5));
    assert.ok(p.options.every((o) => o.value >= 0));
  }
});

test("patterns: answer continues the repeating unit", () => {
  for (const p of allPuzzles("patterns")) {
    const { unit, shown } = p.meta;
    assert.equal(itemKey(p.options[p.answerIndex].item), itemKey(unit[shown % unit.length]));
    p.stimulus.items.slice(0, -1).forEach((it, i) => assert.equal(itemKey(it), itemKey(unit[i % unit.length])));
  }
});

test("matrices: answer is the hidden bottom-right cell", () => {
  for (const p of allPuzzles("matrices")) {
    assert.equal(p.stimulus.cells[2][2], null);
    assert.equal(itemKey(p.options[p.answerIndex].item), itemKey(p.meta.answer));
  }
});

test("memory: answer is the item at the asked position", () => {
  for (const p of allPuzzles("memory")) {
    const items = p.stimulus.items;
    assert.equal(itemKey(p.options[p.answerIndex].item), itemKey(items[p.meta.position]));
    assert.equal(new Set(items.map(itemKey)).size, items.length, "row items are distinct");
    assert.ok(p.stimulus.showMs > 1000);
  }
});

test("classify: exactly one defensible odd one out", () => {
  for (const p of allPuzzles("classify")) {
    const items = p.options.map((o) => o.item);
    const rule = p.meta.rule;
    assert.ok(singlesOut(items, rule), "rule attribute singles out one item");
    const odd = items[p.answerIndex][rule];
    assert.equal(items.filter((it) => it[rule] === odd).length, 1);
    for (const attr of ["shape", "color", "size", "fill"]) {
      if (attr !== rule) assert.ok(!singlesOut(items, attr), `${attr} must not also single out an item`);
    }
  }
});

function permutations(xs) {
  if (xs.length <= 1) return [xs];
  return xs.flatMap((x, i) => permutations([...xs.slice(0, i), ...xs.slice(i + 1)]).map((p) => [x, ...p]));
}

test("logic: clues determine a unique order and the answer follows from it", () => {
  for (const p of allPuzzles("logic")) {
    const { pairs, order, answer } = p.meta;
    const consistent = permutations(order).filter((perm) => pairs.every(([a, b]) => perm.indexOf(a) < perm.indexOf(b)));
    assert.equal(consistent.length, 1, "exactly one ordering satisfies the clues");
    assert.deepEqual(consistent[0], order);
    assert.equal(p.options[p.answerIndex].value, answer);
  }
});

test("difficulty grows with level", () => {
  const avgLen = (skill, level) => {
    let total = 0;
    for (const seed of SEEDS) {
      const p = generatePuzzle(skill, level, new Rng(seed));
      total += skill === "memory" ? p.stimulus.items.length : skill === "patterns" ? p.meta.unit.length : p.options.length;
    }
    return total / SEEDS.length;
  };
  assert.ok(avgLen("memory", 10) > avgLen("memory", 1));
  assert.ok(avgLen("patterns", 10) > avgLen("patterns", 1));
  assert.ok(avgLen("classify", 10) > avgLen("classify", 1));
});
