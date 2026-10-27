// Seeded pseudo-random generator (mulberry32) so puzzles are reproducible in tests.

export function mulberry32(seed) {
  let a = seed >>> 0;
  return function next() {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export class Rng {
  constructor(seed = Date.now()) {
    this.next = mulberry32(seed);
  }

  float() {
    return this.next();
  }

  /** Integer in [min, max], inclusive. */
  int(min, max) {
    return min + Math.floor(this.next() * (max - min + 1));
  }

  pick(items) {
    return items[this.int(0, items.length - 1)];
  }

  shuffle(items) {
    const a = [...items];
    for (let i = a.length - 1; i > 0; i--) {
      const j = this.int(0, i);
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  }

  sample(items, n) {
    return this.shuffle(items).slice(0, n);
  }

  chance(p) {
    return this.next() < p;
  }
}
