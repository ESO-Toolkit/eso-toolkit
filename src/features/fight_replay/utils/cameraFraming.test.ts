import { computeRobustActorFraming, median } from './cameraFraming';

describe('median', () => {
  it('handles odd and even counts and empty', () => {
    expect(median([])).toBe(0);
    expect(median([5])).toBe(5);
    expect(median([3, 1, 2])).toBe(2);
    expect(median([4, 1, 3, 2])).toBe(2.5);
  });
});

describe('computeRobustActorFraming', () => {
  it('returns null when there are no finite positions', () => {
    expect(computeRobustActorFraming([])).toBeNull();
    expect(
      computeRobustActorFraming([
        [NaN, 0, 0],
        [0, Infinity, 0],
      ]),
    ).toBeNull();
  });

  it('frames a normal clustered raid by its true extent (no trimming)', () => {
    // A tidy 10x10 group centered at (5,5) in XZ.
    const pts = [
      [0, 0, 0],
      [10, 0, 0],
      [0, 0, 10],
      [10, 0, 10],
      [5, 0, 5],
    ];
    const f = computeRobustActorFraming(pts)!;
    expect(f.centerX).toBeCloseTo(5);
    expect(f.centerZ).toBeCloseTo(5);
    expect(f.diagonalXZ).toBeCloseTo(Math.hypot(10, 10));
  });

  it('rejects a single far outlier so it does not dominate the framing', () => {
    // Five actors tightly clustered near the origin, plus one stray 1000 units away.
    const cluster = [
      [0, 0, 0],
      [2, 0, 1],
      [1, 0, 2],
      [3, 0, 0],
      [0, 0, 3],
    ];
    const withOutlier = [...cluster, [1000, 0, 1000]];
    const f = computeRobustActorFraming(withOutlier)!;
    // The framing should match the cluster, not stretch to the outlier.
    const clusterFraming = computeRobustActorFraming(cluster)!;
    expect(f.centerX).toBeCloseTo(clusterFraming.centerX);
    expect(f.centerZ).toBeCloseTo(clusterFraming.centerZ);
    expect(f.diagonalXZ).toBeCloseTo(clusterFraming.diagonalXZ);
    // And nowhere near the ~1414 diagonal the raw min/max would have produced.
    expect(f.diagonalXZ).toBeLessThan(20);
  });

  it('keeps a legitimately wide raid spread (median spread large → nothing trimmed)', () => {
    // Players genuinely spread across a big arena: every point is within a few× the median spread,
    // so none should be rejected.
    const spread = [
      [-40, 0, -40],
      [40, 0, -40],
      [-40, 0, 40],
      [40, 0, 40],
      [0, 0, 0],
      [-20, 0, 20],
    ];
    const f = computeRobustActorFraming(spread)!;
    expect(f.diagonalXZ).toBeCloseTo(Math.hypot(80, 80));
  });

  it('ignores a non-finite sample mixed in with good points', () => {
    const pts = [
      [0, 0, 0],
      [10, 0, 10],
      [NaN, 0, 5],
      [5, 0, 5],
    ];
    const f = computeRobustActorFraming(pts)!;
    expect(f.centerX).toBeCloseTo(5);
    expect(f.centerZ).toBeCloseTo(5);
    expect(Number.isFinite(f.diagonalXZ)).toBe(true);
  });
});
