import { createRng } from '../../../ultimate-simulator/core/rng';
import { clusterBuilds } from '../clusterBuilds';
import { EMPTY_CANONICAL_MAPS, extractFeatureVectors } from '../featureExtraction';
import {
  ARCANIST_ARCHETYPE,
  NECRO_ARCHETYPE,
  SORC_ARCHETYPE,
  makeParse,
  makeThreeArchetypeFixture,
  resetFixtureIds,
} from '../__fixtures__/dpsParses.fixture';
import type { DpsParse } from '../../types/dpsParses.types';

function clusterOf(parses: DpsParse[]) {
  return clusterBuilds({ vectors: extractFeatureVectors(parses, EMPTY_CANONICAL_MAPS) });
}

/** Cluster membership as a canonical set-of-sets, for order-independent comparison. */
function partitionOf(result: ReturnType<typeof clusterOf>): string[] {
  return result.clusters.map((cluster) => [...cluster.memberParseIds].sort().join(',')).sort();
}

beforeEach(() => {
  resetFixtureIds();
});

describe('clusterBuilds', () => {
  it('recovers the planted three-archetype partition', () => {
    const parses = makeThreeArchetypeFixture();
    const result = clusterOf(parses);

    expect(result.k).toBe(3);
    expect(result.clusters.map((c) => c.size).sort((a, b) => b - a)).toEqual([20, 15, 10]);
    expect(result.totalParses).toBe(45);
  });

  it('puts every parse of an archetype in the same cluster', () => {
    const parses = makeThreeArchetypeFixture();
    const result = clusterOf(parses);

    const classById = new Map(parses.map((p) => [p.parse_id, p.eso_class]));
    result.clusters.forEach((cluster) => {
      const classes = new Set(cluster.memberParseIds.map((id) => classById.get(id)));
      expect(classes.size).toBe(1);
    });
  });

  it('picks a medoid that is a real member of its own cluster', () => {
    const result = clusterOf(makeThreeArchetypeFixture());
    result.clusters.forEach((cluster) => {
      expect(cluster.memberParseIds).toContain(cluster.medoidParseId);
    });
  });

  /**
   * The determinism test. Shuffling the input with a seeded PRNG must not change
   * the resulting partition — no Math.random anywhere in the pipeline, and ties
   * broken by explicit ordering rather than by insertion order.
   */
  it('is invariant to input ordering', () => {
    const parses = makeThreeArchetypeFixture();
    const baseline = partitionOf(clusterOf(parses));

    const rng = createRng(42);
    const shuffled = [...parses];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(rng.next() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }

    expect(partitionOf(clusterOf(shuffled))).toEqual(baseline);
  });

  it('produces deep-equal results across repeated runs', () => {
    const parses = makeThreeArchetypeFixture();
    expect(clusterOf(parses)).toEqual(clusterOf(parses));
  });

  it('accounts for every input parse exactly once', () => {
    const parses = makeThreeArchetypeFixture();
    const result = clusterOf(parses);

    const assigned = result.clusters.flatMap((c) => c.memberParseIds);
    expect(assigned).toHaveLength(parses.length);
    expect(new Set(assigned).size).toBe(parses.length);
  });

  it('reports shares that sum to 1', () => {
    const result = clusterOf(makeThreeArchetypeFixture());
    const total = result.clusters.reduce((acc, c) => acc + c.share, 0);
    expect(total).toBeCloseTo(1, 10);
  });

  it('collapses identical builds instead of splitting them', () => {
    resetFixtureIds();
    const identical = Array.from({ length: 40 }, (_, i) =>
      // Same index => no jitter, so all 40 are byte-identical builds.
      makeParse(NECRO_ARCHETYPE, 1, { amount: 300_000 }),
    );

    const result = clusterBuilds({
      vectors: extractFeatureVectors(identical, EMPTY_CANONICAL_MAPS),
    });

    expect(result.uniqueSignatures).toBe(1);
    expect(result.k).toBe(1);
    expect(result.clusters[0].size).toBe(40);
  });

  it('handles a single parse', () => {
    const result = clusterOf([makeParse(NECRO_ARCHETYPE, 0)]);

    expect(result.k).toBe(1);
    expect(result.clusters[0].share).toBe(1);
    expect(result.clusters[0].medoidParseId).toBe(result.clusters[0].memberParseIds[0]);
  });

  it('returns an empty result for no input rather than throwing', () => {
    const result = clusterBuilds({ vectors: [] });

    expect(result.clusters).toEqual([]);
    expect(result.k).toBe(0);
    expect(result.recommendedClusterId).toBeNull();
  });

  it('reports progress monotonically to 100', () => {
    const seen: number[] = [];
    clusterBuilds(
      { vectors: extractFeatureVectors(makeThreeArchetypeFixture(), EMPTY_CANONICAL_MAPS) },
      (pct) => seen.push(pct),
    );

    expect(seen.length).toBeGreaterThan(0);
    expect(seen[seen.length - 1]).toBe(100);
    expect([...seen].sort((a, b) => a - b)).toEqual(seen);
  });
});

describe('Core/Flex classification', () => {
  it('marks universally-run gear as core and jittered slots as flex', () => {
    const result = clusterOf(makeThreeArchetypeFixture());
    const necro = result.clusters.find((c) => c.label.includes('Necromancer'));
    expect(necro).toBeDefined();

    // Both five-piece sets are on every member of the archetype.
    const coreSets = necro?.core.filter((t) => t.group === 'fivePieceSets') ?? [];
    expect(coreSets).toHaveLength(2);
    coreSets.forEach((trait) => expect(trait.share).toBe(1));

    // The deliberately jittered back-bar slot lands in flex, not core.
    const flexBack = necro?.flex.filter((t) => t.group === 'backBar') ?? [];
    expect(flexBack.length).toBeGreaterThan(0);
    flexBack.forEach((trait) => {
      expect(trait.share).toBeGreaterThanOrEqual(0.35);
      expect(trait.share).toBeLessThan(0.8);
    });
  });
});

describe('outlier handling', () => {
  /**
   * Regression: undersized clusters used to be folded into their nearest
   * neighbour unconditionally, so a lone Sorcerer parse was absorbed into a
   * Necromancer archetype — corrupting its Core/Flex shares and dragging its
   * median toward a build none of its members ran.
   */
  it('does not absorb a distant outlier into an unrelated archetype', () => {
    resetFixtureIds();
    const outlierId = 'sorc-outlier';
    const parses = [
      ...Array.from({ length: 40 }, (_, i) =>
        makeParse(NECRO_ARCHETYPE, i, { amount: 300_000 - i * 100 }),
      ),
      makeParse(SORC_ARCHETYPE, 0, { amount: 900_000, parse_id: outlierId }),
    ];

    const result = clusterOf(parses);
    const outlierCluster = result.clusters.find((c) => c.memberParseIds.includes(outlierId));

    // It stays on its own rather than joining a Necromancer cluster.
    expect(outlierCluster?.memberParseIds).toEqual([outlierId]);
    result.clusters.forEach((cluster) => {
      if (cluster.memberParseIds.includes(outlierId)) return;
      expect(cluster.memberParseIds).not.toContain(outlierId);
    });
  });

  it('still absorbs near-identical small clusters', () => {
    resetFixtureIds();
    // One parse differs only in a low-weight axis, so it belongs with the rest.
    const parses = [
      ...Array.from({ length: 30 }, (_, i) => makeParse(NECRO_ARCHETYPE, i + 1)),
      makeParse(NECRO_ARCHETYPE, 1, { parse_id: 'near-duplicate', monster_id: null }),
    ];

    const result = clusterOf(parses);
    const cluster = result.clusters.find((c) => c.memberParseIds.includes('near-duplicate'));
    expect(cluster?.memberParseIds.length).toBeGreaterThan(1);
  });
});

describe('recommendedClusterId', () => {
  it('prefers the highest median over the largest cluster', () => {
    resetFixtureIds();
    // 30 parses of a LOW-dps build, 12 of a high-dps one. The larger cluster must
    // not win: the recommendation answers "what will I get", not "what is common".
    const parses = [
      ...Array.from({ length: 30 }, (_, i) =>
        makeParse(NECRO_ARCHETYPE, i, { amount: 200_000 - i * 100 }),
      ),
      ...Array.from({ length: 12 }, (_, i) =>
        makeParse(ARCANIST_ARCHETYPE, i, { amount: 350_000 - i * 100 }),
      ),
    ];

    const result = clusterOf(parses);
    const recommended = result.clusters.find((c) => c.id === result.recommendedClusterId);
    const largest = [...result.clusters].sort((a, b) => b.size - a.size)[0];

    expect(recommended).toBeDefined();
    expect(recommended?.size).toBeLessThan(largest.size);
    expect(recommended?.dps.median).toBeGreaterThan(largest.dps.median);
  });

  it('ignores a high-median archetype that almost nobody runs', () => {
    resetFixtureIds();
    // 40 common parses vs a single spectacular outlier. The outlier has by far the
    // highest median but sits far below the 15% share floor, so it must not be
    // what a newcomer is told to run.
    const outlierId = 'sorc-outlier';
    const parses = [
      ...Array.from({ length: 40 }, (_, i) =>
        makeParse(NECRO_ARCHETYPE, i, { amount: 300_000 - i * 100 }),
      ),
      makeParse(SORC_ARCHETYPE, 0, { amount: 900_000, parse_id: outlierId }),
    ];

    const result = clusterOf(parses);
    const recommended = result.clusters.find((c) => c.id === result.recommendedClusterId);

    expect(recommended).toBeDefined();
    expect(recommended?.memberParseIds).not.toContain(outlierId);
    expect(recommended?.share).toBeGreaterThanOrEqual(0.15);
    // …and the outlier's own cluster really does have the top median, so the
    // recommendation is passing it over on popularity, not on dps.
    const outlierCluster = result.clusters.find((c) => c.memberParseIds.includes(outlierId));
    expect(outlierCluster?.dps.median).toBeGreaterThan(recommended?.dps.median ?? 0);
  });
});
