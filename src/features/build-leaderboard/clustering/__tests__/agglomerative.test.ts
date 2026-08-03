import { agglomerate, cutDendrogram } from '../agglomerative';
import { condensedIndex } from '../buildDistance';
import { dpsFiveNumber } from '../clusterSummary';
import { weightedSilhouette } from '../silhouette';

/**
 * Condensed matrix from an explicit 2D matrix, so tests can plant a partition
 * directly rather than going through feature extraction.
 */
function condense(matrix: number[][]): Float32Array {
  const n = matrix.length;
  const out = new Float32Array((n * (n - 1)) / 2);
  for (let i = 0; i < n; i++) {
    for (let j = i + 1; j < n; j++) {
      out[condensedIndex(i, j, n)] = matrix[i][j];
    }
  }
  return out;
}

/** Three tight groups: {0,1}, {2,3}, {4,5}. Within 0.1, between 0.9. */
function threeGroupMatrix(): number[][] {
  const group = (i: number): number => Math.floor(i / 2);
  return Array.from({ length: 6 }, (_, i) =>
    Array.from({ length: 6 }, (_, j) => (i === j ? 0 : group(i) === group(j) ? 0.1 : 0.9)),
  );
}

const ones = (n: number): number[] => new Array(n).fill(1);

describe('agglomerate', () => {
  it('returns n-1 merges', () => {
    const n = 6;
    expect(agglomerate(condense(threeGroupMatrix()), n, ones(n))).toHaveLength(n - 1);
  });

  it('merges at non-decreasing heights', () => {
    const merges = agglomerate(condense(threeGroupMatrix()), 6, ones(6));
    const heights = merges.map((m) => m.height);
    expect([...heights].sort((a, b) => a - b)).toEqual(heights);
  });

  it('recovers a planted partition when cut at k=3', () => {
    const n = 6;
    const labels = cutDendrogram(agglomerate(condense(threeGroupMatrix()), n, ones(n)), n, 3);

    // Pairs share a label; members of different planted groups do not.
    expect(labels[0]).toBe(labels[1]);
    expect(labels[2]).toBe(labels[3]);
    expect(labels[4]).toBe(labels[5]);
    expect(new Set(labels).size).toBe(3);
  });

  it('handles degenerate inputs', () => {
    expect(agglomerate(new Float32Array(0), 0, [])).toEqual([]);
    expect(agglomerate(new Float32Array(0), 1, [1])).toEqual([]);
  });

  /**
   * Weighted linkage lets one collapsed point stand in for the N identical builds
   * behind it, so a popular signature pulls on merges with its real mass.
   */
  /**
   * Weighted (UPGMA) linkage: d(k, a∪b) = (w_a·d(k,a) + w_b·d(k,b)) / (w_a + w_b).
   * The weights that matter are those of the two clusters being MERGED, so the
   * differing weight has to sit on point 0 or 1, not on the observer.
   */
  it('lets multiplicity influence merge heights', () => {
    const matrix = [
      [0, 0.2, 0.6],
      [0.2, 0, 0.4],
      [0.6, 0.4, 0],
    ];

    // 0 and 1 merge first, then 2 joins them.
    const unweighted = agglomerate(condense(matrix), 3, [1, 1, 1]);
    // Equal weights: (0.6 + 0.4) / 2
    expect(unweighted[1].height).toBeCloseTo(0.5, 6);

    const weighted = agglomerate(condense(matrix), 3, [1, 10, 1]);
    // Point 1 counts 10x: (1·0.6 + 10·0.4) / 11
    expect(weighted[1].height).toBeCloseTo((0.6 + 4) / 11, 6);
    expect(weighted[1].height).toBeLessThan(unweighted[1].height);
  });
});

describe('cutDendrogram', () => {
  const n = 6;
  const merges = agglomerate(condense(threeGroupMatrix()), n, ones(n));

  it('returns one label per point', () => {
    expect(cutDendrogram(merges, n, 3)).toHaveLength(n);
  });

  it('produces exactly k clusters for k in range', () => {
    for (let k = 1; k <= n; k++) {
      expect(new Set(cutDendrogram(merges, n, k)).size).toBe(k);
    }
  });

  it('clamps k outside the valid range', () => {
    expect(new Set(cutDendrogram(merges, n, 0)).size).toBe(1);
    expect(new Set(cutDendrogram(merges, n, 99)).size).toBe(n);
  });

  it('labels from 0 upward in order of first appearance', () => {
    expect(cutDendrogram(merges, n, 3)[0]).toBe(0);
  });
});

describe('weightedSilhouette', () => {
  it('scores a well-separated partition close to 1', () => {
    const n = 6;
    const condensed = condense(threeGroupMatrix());
    const labels = cutDendrogram(agglomerate(condensed, n, ones(n)), n, 3);

    // a = 0.1 within, b = 0.9 to the nearest other cluster => (0.9-0.1)/0.9.
    expect(weightedSilhouette(condensed, n, labels, ones(n))).toBeCloseTo(8 / 9, 6);
  });

  it('prefers the correct k over an over-split one', () => {
    const n = 6;
    const condensed = condense(threeGroupMatrix());
    const merges = agglomerate(condensed, n, ones(n));

    const atThree = weightedSilhouette(condensed, n, cutDendrogram(merges, n, 3), ones(n));
    const atSix = weightedSilhouette(condensed, n, cutDendrogram(merges, n, 6), ones(n));

    expect(atThree).toBeGreaterThan(atSix);
  });

  it('returns 0 for a single cluster or a single point', () => {
    const condensed = condense(threeGroupMatrix());
    expect(weightedSilhouette(condensed, 6, new Array(6).fill(0), ones(6))).toBe(0);
    expect(weightedSilhouette(new Float32Array(0), 1, [0], [1])).toBe(0);
  });

  it('computes a hand-checked four-point value', () => {
    // {0,1} at 0.2 apart, {2,3} at 0.2 apart, 1.0 between the groups.
    const matrix = [
      [0, 0.2, 1, 1],
      [0.2, 0, 1, 1],
      [1, 1, 0, 0.2],
      [1, 1, 0.2, 0],
    ];
    // Every point: a = 0.2, b = 1.0 => s = 0.8.
    // Precision 6, not more: the matrix is a Float32Array.
    expect(weightedSilhouette(condense(matrix), 4, [0, 0, 1, 1], ones(4))).toBeCloseTo(0.8, 6);
  });
});

describe('dpsFiveNumber', () => {
  it('summarises a known distribution', () => {
    const summary = dpsFiveNumber([10, 20, 30, 40, 50]);

    expect(summary.min).toBe(10);
    expect(summary.median).toBe(30);
    expect(summary.max).toBe(50);
    expect(summary.mean).toBe(30);
    expect(summary.count).toBe(5);
    expect(summary.q1).toBe(20);
    expect(summary.q3).toBe(40);
  });

  it('is order-insensitive', () => {
    expect(dpsFiveNumber([50, 10, 30, 20, 40])).toEqual(dpsFiveNumber([10, 20, 30, 40, 50]));
  });

  it('handles empty and single-value inputs', () => {
    expect(dpsFiveNumber([])).toMatchObject({ median: 0, count: 0 });
    expect(dpsFiveNumber([42])).toMatchObject({ min: 42, median: 42, max: 42, count: 1 });
  });
});
