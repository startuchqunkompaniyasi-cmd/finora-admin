/**
 * utils/random.js
 * Seeded PRNG (mulberry32). Used for demo data so the sample dashboard is stable
 * between reloads instead of changing every time.
 */

export function createRandom(seed) {
  let state = seed >>> 0;

  const next = () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };

  return {
    next,
    /** integer in [min, max] */
    int: (min, max) => Math.floor(next() * (max - min + 1)) + min,
    chance: (probability) => next() < probability,
    pick: (list) => list[Math.floor(next() * list.length)],
  };
}
