import { makeThreeArchetypeFixture, resetFixtureIds } from '../__fixtures__/dpsParses.fixture';
import { EMPTY_CANONICAL_MAPS, extractFeatureVectors } from '../featureExtraction';
import { buildIndividualClusters } from '../individualBuilds';

function vectorsFor(count: number) {
  resetFixtureIds();
  return extractFeatureVectors(makeThreeArchetypeFixture().slice(0, count), EMPTY_CANONICAL_MAPS);
}

describe('buildIndividualClusters', () => {
  it('accounts for every parse exactly once', () => {
    const vectors = vectorsFor(7);
    const result = buildIndividualClusters(vectors);

    const members = result.clusters.flatMap((cluster) => cluster.memberParseIds);
    expect(members.sort()).toEqual(vectors.map((vector) => vector.parseId).sort());
    expect(new Set(members).size).toBe(members.length);
    expect(result.totalParses).toBe(vectors.length);
    expect(result.droppedParses).toBe(0);
  });

  /** Two players on the exact same build is one entry saying "2", not two cards. */
  it('collapses identical signatures into a single entry', () => {
    const result = buildIndividualClusters(vectorsFor(7));

    const sizes = result.clusters.map((cluster) => cluster.size);
    expect(sizes.reduce((acc, size) => acc + size, 0)).toBe(7);
    expect(result.clusters.length).toBe(result.uniqueSignatures);
    expect(result.clusters.length).toBeLessThanOrEqual(7);
  });

  /**
   * Recommending one of five parses would claim a consensus the data cannot
   * support, and the UI keys its "Recommended" badge off exactly this field.
   */
  it('recommends nothing and reports no separation', () => {
    const result = buildIndividualClusters(vectorsFor(5));

    expect(result.recommendedClusterId).toBeNull();
    expect(result.silhouette).toBe(0);
    expect(result.silhouetteByK).toEqual([]);
  });

  it('orders the strongest parse first and ids the entries in that order', () => {
    const result = buildIndividualClusters(vectorsFor(6));

    const maxima = result.clusters.map((cluster) => cluster.dps.max);
    expect([...maxima].sort((a, b) => b - a)).toEqual(maxima);
    expect(result.clusters.map((cluster) => cluster.id)).toEqual(
      result.clusters.map((_, index) => `s${index}`),
    );
  });

  it('summarises a single parse without inventing a spread', () => {
    const single = buildIndividualClusters(vectorsFor(1)).clusters[0];

    expect(single.dps.count).toBe(1);
    expect(single.dps.q1).toBe(single.dps.median);
    expect(single.dps.q3).toBe(single.dps.median);
    expect(single.cohesion).toBe(0);
    // Every trait of a lone build is definitionally core to it.
    expect(single.core.length).toBeGreaterThan(0);
    expect(single.core.every((trait) => trait.share === 1)).toBe(true);
    expect(single.flex).toEqual([]);
  });

  it('handles an empty input without throwing', () => {
    expect(buildIndividualClusters([])).toMatchObject({
      clusters: [],
      k: 0,
      totalParses: 0,
      recommendedClusterId: null,
    });
  });
});
