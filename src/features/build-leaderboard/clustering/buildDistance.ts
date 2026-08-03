/**
 * Distance between two builds.
 *
 * A weighted Gower distance: each feature group contributes its own 0–1 distance,
 * and the result is the weighted mean, so the total stays in [0, 1] regardless of
 * which groups are present.
 *
 * Why not one-hot Euclidean (i.e. plain k-means): with ~600 binary ability
 * dimensions and ~12 that actually define a build, distance ends up dominated by
 * ability dimensions purely by count, and a shared five-piece set — the thing that
 * most defines an archetype — gets drowned out.
 */

import type {
  FeatureGroupKey,
  FeatureWeights,
  ParseFeatureVector,
} from '../types/clustering.types';

/**
 * Feature weights, encoding domain judgment about what makes builds "the same".
 *
 * These are principled but UNVALIDATED against real cluster output — treat them as
 * a starting point and expect a tuning pass. The ordering invariant
 * (monster set < five-piece < class) is locked by tests, so retuning is a one-line
 * change plus a test update.
 */
export const DEFAULT_FEATURE_WEIGHTS: FeatureWeights = {
  /** A Sorcerer build is never an Arcanist build. */
  esoClass: 3.0,
  /** Post-subclassing this is closer to true build identity than the class name. */
  skillLines: 2.0,
  /** The single most archetype-defining gear axis. */
  fivePieceSets: 3.0,
  frontBar: 1.5,
  backBar: 1.5,
  mythic: 1.0,
  arena: 1.0,
  /** Deliberately low: sharing a monster set is weak evidence of a shared build. */
  monsterSet: 0.5,
  /** Highly correlated with class, so little marginal signal. */
  cpSlottables: 0.5,
  mundus: 0.5,
  food: 0.25,
  /** Race is near-free DPS and must never split an archetype. */
  race: 0.25,
};

/**
 * Jaccard distance between two sets of ids: 1 - |A ∩ B| / |A ∪ B|.
 *
 * Two empty sets are identical (0), not undefined — returning NaN here would
 * silently poison every downstream average.
 */
export function jaccardDistance(a: readonly number[], b: readonly number[]): number {
  if (a.length === 0 && b.length === 0) return 0;
  if (a.length === 0 || b.length === 0) return 1;

  const setB = new Set(b);
  let intersection = 0;
  const seen = new Set<number>();
  for (const value of a) {
    if (seen.has(value)) continue;
    seen.add(value);
    if (setB.has(value)) intersection++;
  }

  const union = new Set([...a, ...b]).size;
  return union === 0 ? 0 : 1 - intersection / union;
}

/** Exact match on a single optional value. Both-absent counts as a match. */
export function categoricalDistance(a: number | string | null, b: number | string | null): number {
  if (a === null && b === null) return 0;
  if (a === null || b === null) return 1;
  return a === b ? 0 : 1;
}

/**
 * Bar distance: exact ability ids, plus a half-weight term on base (unmorphed)
 * ids.
 *
 * Two players running different morphs of the same skill are far more alike than
 * two running unrelated skills, and the base-id term is what gives them partial
 * credit instead of scoring them as strangers.
 */
function barDistance(
  exactA: readonly number[],
  exactB: readonly number[],
  baseA: readonly number[],
  baseB: readonly number[],
): number {
  return 0.5 * jaccardDistance(exactA, exactB) + 0.5 * jaccardDistance(baseA, baseB);
}

/**
 * Per-group distance, or null when the group should be skipped.
 *
 * A group either vector declares missing contributes nothing — neither distance
 * nor weight. characterRankings returns no race, CP, mundus or food, so scoring
 * "both absent" as a perfect match would make every pair look 4 groups more
 * similar than the evidence supports.
 */
function groupDistance(
  group: FeatureGroupKey,
  a: ParseFeatureVector,
  b: ParseFeatureVector,
): number | null {
  if (a.missing.includes(group) || b.missing.includes(group)) return null;

  switch (group) {
    case 'esoClass':
      return categoricalDistance(a.esoClass || null, b.esoClass || null);
    case 'skillLines':
      return jaccardDistance(a.skillLines, b.skillLines);
    case 'fivePieceSets':
      return jaccardDistance(a.fivePieceSets, b.fivePieceSets);
    case 'frontBar':
      return barDistance(a.frontBar, b.frontBar, a.frontBarBase, b.frontBarBase);
    case 'backBar':
      return barDistance(a.backBar, b.backBar, a.backBarBase, b.backBarBase);
    case 'mythic':
      return categoricalDistance(a.mythic, b.mythic);
    case 'arena':
      return categoricalDistance(a.arena, b.arena);
    case 'monsterSet':
      return categoricalDistance(a.monsterSet, b.monsterSet);
    case 'cpSlottables':
      return jaccardDistance(a.cpSlottables, b.cpSlottables);
    case 'mundus':
      return categoricalDistance(a.mundus, b.mundus);
    case 'food':
      return categoricalDistance(a.food, b.food);
    case 'race':
      return categoricalDistance(a.race, b.race);
    default:
      return null;
  }
}

const FEATURE_GROUPS = Object.keys(DEFAULT_FEATURE_WEIGHTS) as FeatureGroupKey[];

/** Weighted Gower distance in [0, 1]. */
export function buildDistance(
  a: ParseFeatureVector,
  b: ParseFeatureVector,
  weights: FeatureWeights = DEFAULT_FEATURE_WEIGHTS,
): number {
  let weighted = 0;
  let totalWeight = 0;

  for (const group of FEATURE_GROUPS) {
    const weight = weights[group];
    if (!weight) continue;

    const distance = groupDistance(group, a, b);
    if (distance === null) continue;

    weighted += weight * distance;
    totalWeight += weight;
  }

  // No comparable groups at all — treat as maximally distant rather than
  // accidentally identical, so unknowns never merge into a real archetype.
  if (totalWeight === 0) return 1;
  return weighted / totalWeight;
}

/**
 * Index into a condensed (upper-triangular) distance matrix for i < j.
 *
 * Storing n(n-1)/2 entries instead of n² halves memory and keeps a 400-point
 * matrix comfortably inside a Float32Array.
 */
export function condensedIndex(i: number, j: number, n: number): number {
  if (i === j) throw new Error('condensedIndex: i and j must differ');
  const [lo, hi] = i < j ? [i, j] : [j, i];
  return (n * (n - 1)) / 2 - ((n - lo) * (n - lo - 1)) / 2 + (hi - lo - 1);
}

/** Condensed pairwise distance matrix over the given vectors. */
export function buildDistanceMatrix(
  vectors: readonly ParseFeatureVector[],
  weights: FeatureWeights = DEFAULT_FEATURE_WEIGHTS,
): Float32Array {
  const n = vectors.length;
  const matrix = new Float32Array(Math.max(0, (n * (n - 1)) / 2));

  for (let i = 0; i < n; i++) {
    for (let j = i + 1; j < n; j++) {
      matrix[condensedIndex(i, j, n)] = buildDistance(vectors[i], vectors[j], weights);
    }
  }

  return matrix;
}
