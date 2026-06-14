/**
 * Deterministic seeded pseudo-random number generator (mulberry32).
 *
 * The simulator must be reproducible: the same seed + config always yields the
 * same result, so Monte Carlo means don't wobble between recalcs the way the
 * original Google Sheet did. mulberry32 is tiny, fast, and statistically good
 * enough for Bernoulli proc rolls (it is NOT cryptographically secure — never
 * use it for anything security-sensitive).
 */

export interface Rng {
  /** Next float in [0, 1). */
  next(): number;
  /** Bernoulli trial: true with probability `p` (clamped to [0,1]). */
  chance(p: number): boolean;
}

/**
 * Create a seeded RNG. The seed is mixed first so that sequential seeds
 * (0, 1, 2, …), which Monte Carlo runs use, produce well-separated streams
 * rather than correlated ones.
 */
export function createRng(seed: number): Rng {
  // Mix the incoming seed (splitmix32-style) before seeding mulberry32, so that
  // adjacent seeds don't yield near-identical first outputs.
  let a = (seed ^ 0x9e3779b9) >>> 0;
  a = Math.imul(a ^ (a >>> 16), 0x21f0aaad) >>> 0;
  a = Math.imul(a ^ (a >>> 15), 0x735a2d97) >>> 0;
  let state = (a ^ (a >>> 15)) >>> 0;

  const next = (): number => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };

  return {
    next,
    chance: (p: number): boolean => {
      if (p <= 0) return false;
      if (p >= 1) return true;
      return next() < p;
    },
  };
}
