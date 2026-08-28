/**
 * Pins the dominance gate, including the cases where it must NOT fire.
 *
 * A false positive here is worse than a false negative: telling a player a
 * class is solved when five real archetypes exist is a confident factual claim
 * that is wrong, whereas missing a solved board just leaves today's behaviour.
 * So the healthy boards are asserted at least as hard as the degenerate ones.
 */

import type { BuildCluster, ClusterBuildsResult, DpsSummary } from '../../types/clustering.types';
import { SOLVED_META_MIN_PARSES, SOLVED_META_MIN_SHARE, detectSolvedMeta } from '../solvedMeta';

const DPS: DpsSummary = { min: 0, q1: 0, median: 0, q3: 0, p90: 0, max: 0, mean: 0, count: 0 };

function cluster(id: string, size: number, total: number): BuildCluster {
  return {
    id,
    label: `${id} build`,
    esoClass: 'Arcanist',
    size,
    share: size / total,
    memberParseIds: Array.from({ length: size }, (_, i) => `${id}-${i}`),
    medoidParseId: `${id}-0`,
    dps: DPS,
    core: [],
    flex: [],
    variations: [],
    cohesion: 0,
  };
}

/** Builds a result whose clusters have the given sizes, in the given order. */
function resultOf(sizes: number[]): ClusterBuildsResult {
  const total = sizes.reduce((sum, size) => sum + size, 0);
  return {
    clusters: sizes.map((size, i) => cluster(`c${i}`, size, total)),
    k: sizes.length,
    silhouette: 0.437,
    silhouetteByK: [],
    recommendedClusterId: 'c0',
    totalParses: total,
    uniqueSignatures: sizes.length,
    droppedParses: 0,
  };
}

describe('detectSolvedMeta', () => {
  it('fires on the measured Arcanist shape: 98.5% in one cluster', () => {
    const solved = detectSolvedMeta(resultOf([394, 4, 2]));

    expect(solved).not.toBeNull();
    expect(solved?.dominant.id).toBe('c0');
    expect(solved?.sharePercent).toBe(98);
    expect(solved?.outlierParses).toBe(6);
    expect(solved?.outliers.map((c) => c.id)).toEqual(['c1', 'c2']);
  });

  it('finds the dominant cluster wherever it sits in the array', () => {
    // Ordering is a UI concern (recommended first), so the detector must not
    // assume clusters[0] is the biggest.
    const solved = detectSolvedMeta(resultOf([3, 200, 2]));

    expect(solved?.dominant.id).toBe('c1');
    expect(solved?.outlierParses).toBe(5);
  });

  it('does not fire on a healthy multi-archetype board', () => {
    expect(detectSolvedMeta(resultOf([120, 90, 60, 40]))).toBeNull();
  });

  it('does not fire just below the share threshold', () => {
    // 89 of 100. The runner-up holds 11 real players making a different choice.
    expect(detectSolvedMeta(resultOf([89, 11]))).toBeNull();
  });

  it('fires exactly at the share threshold', () => {
    const solved = detectSolvedMeta(resultOf([90, 10]));

    expect(solved).not.toBeNull();
    expect(solved?.sharePercent).toBe(90);
  });

  it('does not declare a thin board solved', () => {
    // Unanimous, but only 40 parses: not enough to make a claim about a class.
    expect(resultOf([40]).totalParses).toBeLessThan(SOLVED_META_MIN_PARSES);
    expect(detectSolvedMeta(resultOf([40]))).toBeNull();
  });

  it('fires on a unanimous board once it clears the parse floor', () => {
    const solved = detectSolvedMeta(resultOf([SOLVED_META_MIN_PARSES]));

    expect(solved?.sharePercent).toBe(100);
    expect(solved?.outliers).toEqual([]);
    expect(solved?.outlierParses).toBe(0);
  });

  it('floors the displayed percentage rather than rounding it up', () => {
    // 179/200 = 89.5%, which must not be shown as "90% of parses" next to a
    // card list that visibly does not add up. (Below the gate anyway; the
    // point is the arithmetic.) 199/200 = 99.5% must read as 99, not 100,
    // because a 100% claim next to a visible outlier card is a contradiction.
    const solved = detectSolvedMeta(resultOf([199, 1]));

    expect(solved?.sharePercent).toBe(99);
  });

  it('returns null for a null, empty, or clusterless result', () => {
    expect(detectSolvedMeta(null)).toBeNull();
    expect(detectSolvedMeta(resultOf([]))).toBeNull();
    expect(detectSolvedMeta({ ...resultOf([200]), clusters: [] })).toBeNull();
  });

  it('keys off share rather than silhouette', () => {
    // The whole design argument: Arcanist scores a respectable 0.437, so any
    // silhouette floor low enough to catch it would also fire on genuinely
    // diverse boards. Detection must be indifferent to this number.
    const strong = { ...resultOf([394, 6]), silhouette: 0.92 };
    const weak = { ...resultOf([394, 6]), silhouette: 0.01 };

    expect(detectSolvedMeta(strong)).not.toBeNull();
    expect(detectSolvedMeta(weak)).not.toBeNull();
    expect(detectSolvedMeta({ ...resultOf([120, 90, 60]), silhouette: 0.01 })).toBeNull();
  });

  it('exposes thresholds as the documented numbers', () => {
    expect(SOLVED_META_MIN_SHARE).toBe(0.9);
    expect(SOLVED_META_MIN_PARSES).toBe(50);
  });
});
