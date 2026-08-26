import { createRng } from '../../../ultimate-simulator/core/rng';
import type { ParseFeatureVector } from '../../types/clustering.types';
import type { DpsParse } from '../../types/dpsParses.types';
import {
  ARCANIST_ARCHETYPE,
  NECRO_ARCHETYPE,
  SETS,
  SORC_ARCHETYPE,
  makeParse,
  makeThreeArchetypeFixture,
  resetFixtureIds,
} from '../__fixtures__/dpsParses.fixture';
import { DEFAULT_FEATURE_WEIGHTS, buildDistance, buildDistanceMatrix } from '../buildDistance';
import { clusterBuilds } from '../clusterBuilds';
import {
  EMPTY_CANONICAL_MAPS,
  collapseDuplicateSignatures,
  extractFeatureVectors,
} from '../featureExtraction';
import { weightedSilhouette } from '../silhouette';

function clusterOf(parses: DpsParse[], options?: Parameters<typeof clusterBuilds>[0]['options']) {
  return clusterBuilds({ vectors: extractFeatureVectors(parses, EMPTY_CANONICAL_MAPS), options });
}

/**
 * Silhouette of the partition we actually got back, recomputed from first
 * principles over the collapsed points. Used to pin the honesty invariant:
 * result.silhouette must describe the FINAL labels, not the pre-merge cut.
 */
function silhouetteOfReturnedPartition(
  result: ReturnType<typeof clusterOf>,
  parses: DpsParse[],
): number {
  const vectors = extractFeatureVectors(parses, EMPTY_CANONICAL_MAPS);
  const collapsed = collapseDuplicateSignatures(vectors);
  const pointIndexByParseId = new Map<string, number>();
  collapsed.members.forEach((ids, index) =>
    ids.forEach((id) => pointIndexByParseId.set(id, index)),
  );

  const labelByPoint = new Map<number, number>();
  result.clusters.forEach((cluster, label) => {
    cluster.memberParseIds.forEach((id) => {
      const point = pointIndexByParseId.get(id);
      if (point !== undefined) labelByPoint.set(point, label);
    });
  });

  const n = collapsed.points.length;
  const condensed = buildDistanceMatrix(collapsed.points, DEFAULT_FEATURE_WEIGHTS);
  const labels = collapsed.points.map((_, index) => labelByPoint.get(index) ?? 0);
  return weightedSilhouette(condensed, n, labels, collapsed.multiplicity);
}

/** Minimal hand-built feature vector; only the varied groups affect distance. */
let syntheticId = 0;
function syntheticVector(overrides: Partial<ParseFeatureVector> = {}): ParseFeatureVector {
  syntheticId += 1;
  return {
    parseId: `synthetic-${syntheticId}`,
    amount: 100_000,
    esoClass: 'Necromancer',
    skillLines: [15, 16],
    fivePieceSets: [127, 456],
    frontBar: [10, 11],
    backBar: [20, 21],
    frontBarBase: [10, 11],
    backBarBase: [20, 21],
    monsterSet: null,
    mythic: null,
    arena: null,
    cpSlottables: [],
    mundus: null,
    food: null,
    race: null,
    missing: [],
    ...overrides,
  };
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
    const identical = Array.from({ length: 40 }, () =>
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

describe('traitShares and missing groups', () => {
  /**
   * When barOrderKnown is false, splitBars puts every ability in `front` and
   * feature extraction marks both bars missing. Counting them anyway would
   * surface chips for a layout we explicitly do not know — and dilute the shares
   * of the parses that DO declare one.
   *
   * The unknown-layout parses here carry distinct ability ids precisely so the
   * assertion can tell the two behaviours apart.
   */
  const GHOST_IDS = [999001, 999002, 999003, 999004, 999005, 999006];

  function fixtureWithUnknownBars() {
    resetFixtureIds();
    const known = Array.from({ length: 10 }, (_, i) => makeParse(NECRO_ARCHETYPE, i + 1));
    const unknown = Array.from({ length: 10 }, (_, i) => {
      const p = makeParse(NECRO_ARCHETYPE, i + 1, { parse_id: `ghost-${i}` });
      return {
        ...p,
        build: {
          ...p.build!,
          bars: { ...p.build!.bars, front: [...GHOST_IDS], back: [], barOrderKnown: false },
        },
      };
    });
    return [...known, ...unknown];
  }

  it('excludes traits from groups a parse declares missing', () => {
    const result = clusterOf(fixtureWithUnknownBars());
    const traits = result.clusters.flatMap((c) => [...c.core, ...c.flex, ...c.variations]);
    const ids = new Set(traits.map((t) => Number(t.id)));

    // Abilities that exist only on unknown-layout parses must not appear at all.
    GHOST_IDS.forEach((id) => expect(ids.has(id)).toBe(false));
  });
});

describe('trait variations', () => {
  /**
   * Regression: traits below the flex threshold were discarded entirely, so the
   * UI's "Show variations" disclosure had nothing to reveal and could never
   * activate. The data has to come back for that affordance to exist at all.
   */
  it('returns minority traits instead of discarding them', () => {
    resetFixtureIds();
    // 30 share one monster set; 4 swap it. Monster set is deliberately the
    // lowest-weighted gear axis, so those 4 stay INSIDE the same cluster — which
    // is the only way a minority trait can exist. (Varying a heavy axis would
    // split them into their own cluster, where they'd be 100% and thus core.)
    const parses = [
      ...Array.from({ length: 30 }, (_, i) => makeParse(NECRO_ARCHETYPE, i + 1)),
      ...Array.from({ length: 4 }, (_, i) =>
        makeParse({ ...NECRO_ARCHETYPE, monster: SETS.zaan }, i + 1),
      ),
    ];

    const result = clusterOf(parses);
    const all = result.clusters.flatMap((c) => c.variations);

    expect(all.length).toBeGreaterThan(0);
    // Variations sit strictly below flex, and above the noise floor.
    all.forEach((trait) => {
      expect(trait.share).toBeLessThan(0.35);
      expect(trait.share).toBeGreaterThanOrEqual(0.05);
    });
  });

  it('keeps core, flex and variations mutually exclusive', () => {
    const result = clusterOf(makeThreeArchetypeFixture());

    result.clusters.forEach((cluster) => {
      const key = (t: { group: string; id: number | string }) => `${t.group}|${t.id}`;
      const core = new Set(cluster.core.map(key));
      const flex = new Set(cluster.flex.map(key));
      const variations = new Set(cluster.variations.map(key));

      cluster.flex.forEach((t) => expect(core.has(key(t))).toBe(false));
      cluster.variations.forEach((t) => {
        expect(core.has(key(t))).toBe(false);
        expect(flex.has(key(t))).toBe(false);
      });
      expect(variations.size).toBe(cluster.variations.length);
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

describe('per-member cluster dps', () => {
  /**
   * Regression: duplicate collapsing kept only the max-dps representative and
   * then fabricated N copies of that one value, inflating min/median/p90 for
   * exactly the most popular builds. The old uniform-amount fixtures could not
   * detect it — here the duplicates deliberately VARY in dps.
   */
  it('expands real per-parse amounts for identical builds with varying dps', () => {
    resetFixtureIds();
    const amounts = [100_000, 200_000, 300_000, 400_000];
    const identical = amounts.map(
      (amount) => makeParse(NECRO_ARCHETYPE, 1, { amount }), // same index => byte-identical builds
    );

    const result = clusterOf(identical);

    expect(result.uniqueSignatures).toBe(1);
    const dps = result.clusters[0].dps;
    expect(dps.count).toBe(4);
    expect(dps.min).toBe(100_000);
    expect(dps.max).toBe(400_000);
    expect(dps.median).toBe(250_000);
    expect(dps.mean).toBe(250_000);
    // Linear-interpolated p90 over [100k, 200k, 300k, 400k]: rank 2.7.
    expect(dps.p90).toBeCloseTo(370_000, 6);
    // The pre-fix behaviour reported the max everywhere — pin that it is gone.
    expect(dps.median).toBeLessThan(dps.max);
    expect(dps.p90).toBeLessThan(dps.max);
  });

  it('keeps the single-cluster path on real amounts too', () => {
    resetFixtureIds();
    const identical = [50_000, 150_000].map((amount) => makeParse(NECRO_ARCHETYPE, 1, { amount }));

    const result = clusterOf(identical);
    expect(result.k).toBe(1);
    expect(result.clusters[0].dps.median).toBe(100_000);
    expect(result.clusters[0].dps.min).toBe(50_000);
  });
});

describe('silhouette honesty', () => {
  /**
   * Regression: result.silhouette was captured from the best RAW dendrogram cut,
   * before mergeUndersizedClusters rewrote the labels — reporting separation for
   * a partition that was never returned. Here an undersized near-neighbour gets
   * merged away, collapsing the output to a single cluster whose silhouette must
   * be the neutral 0, whatever the raw cuts scored.
   */
  it('reports the silhouette of the FINAL merged labels', () => {
    resetFixtureIds();
    // One byte-identical archetype (indices ≡1 mod 3 dodge the fixture jitter)
    // plus a single parse differing only in monster set (lowest-weight gear
    // axis): mass 1/31 < 5%, distance ~0.04 << 0.5, so the undersized cluster
    // is absorbed and k collapses to 1.
    const parses = [
      ...Array.from({ length: 30 }, (_, i) => makeParse(NECRO_ARCHETYPE, 3 * i + 1)),
      makeParse({ ...NECRO_ARCHETYPE, monster: SETS.zaan }, 1, { parse_id: 'absorbed' }),
    ];

    const result = clusterOf(parses);

    expect(result.k).toBe(1);
    expect(result.silhouette).toBeCloseTo(0, 6);
    // And it matches a first-principles recompute of the returned partition…
    expect(result.silhouette).toBeCloseTo(silhouetteOfReturnedPartition(result, parses), 6);
    // …while silhouetteByK still reports the honest RAW cut scores.
    expect(result.silhouetteByK.length).toBeGreaterThan(0);
  });

  /**
   * Stronger form: here merging changes the partition AND the score. A singleton
   * monster-set swap is absorbed into the standard archetype while the fixture
   * jitter keeps a second cluster alive, so the returned labels differ from every
   * raw dendrogram cut — and the reported silhouette must reflect that.
   */
  it('differs from every raw cut once merges rewrite the labels', () => {
    resetFixtureIds();
    const parses = [
      ...Array.from({ length: 30 }, (_, i) => makeParse(NECRO_ARCHETYPE, i + 1)),
      makeParse({ ...NECRO_ARCHETYPE, monster: SETS.zaan }, 1, { parse_id: 'absorbed' }),
    ];

    const result = clusterOf(parses);

    // The absorption happened: the singleton joined an archetype instead of
    // standing alone.
    const absorbedCluster = result.clusters.find((c) => c.memberParseIds.includes('absorbed'));
    expect(absorbedCluster?.memberParseIds.length).toBeGreaterThan(1);

    // The reported value describes the FINAL labels…
    expect(result.silhouette).toBeCloseTo(silhouetteOfReturnedPartition(result, parses), 6);
    // …and no raw cut coincidentally produced that same number.
    expect(
      result.silhouetteByK.some((entry) => Math.abs(entry.score - result.silhouette) < 1e-6),
    ).toBe(false);
  });

  it('matches a recompute of the returned partition on multi-cluster data', () => {
    const parses = makeThreeArchetypeFixture();
    const result = clusterOf(parses);
    expect(result.silhouette).toBeCloseTo(silhouetteOfReturnedPartition(result, parses), 5);
  });
});

describe('cohesion weighting', () => {
  /**
   * Regression: cohesion averaged unique-signature pairs unweighted while every
   * other summary (medoid, silhouette, dps) is mass-weighted. A pair of rare
   * signatures counted as much as a pair carrying 10 parses each side.
   */
  it('weights pair distances by multiplicity product', () => {
    syntheticId = 0;
    // A ×9 (the common signature), B a hair off it (monster set only),
    // C further off it (monster + mythic + arena + food).
    const common = Array.from({ length: 9 }, () => syntheticVector({ monsterSet: SETS.slimecraw }));
    const near = syntheticVector({ monsterSet: SETS.zaan });
    const far = syntheticVector({
      monsterSet: SETS.zaan,
      mythic: SETS.velothi,
      arena: SETS.merciless,
      food: 1,
      mundus: 1,
    });

    const result = clusterBuilds({
      vectors: [...common, near, far],
      options: { minClusterShare: 0.15 },
    });

    // C (mass 1/11) is undersized and merges into the {A,B} cluster → one archetype.
    expect(result.k).toBe(1);
    const cluster = result.clusters[0];
    expect(cluster.size).toBe(11);

    // Expected: sum(m_a * m_b * d(a,b)) / sum(m_a * m_b) over all pairs.
    const points = collapseDuplicateSignatures([...common, near, far]).points;
    let weightedSum = 0;
    let weightSum = 0;
    const mults = [9, 1, 1];
    for (let a = 0; a < points.length; a++) {
      for (let b = a + 1; b < points.length; b++) {
        const w = mults[a] * mults[b];
        weightedSum += w * buildDistance(points[a], points[b], DEFAULT_FEATURE_WEIGHTS);
        weightSum += w;
      }
    }
    const expectedWeighted = weightedSum / weightSum;

    expect(cluster.cohesion).toBeCloseTo(expectedWeighted, 6);
    // Guard: the unweighted average must differ, or this test proves nothing.
    const unweighted =
      [
        buildDistance(points[0], points[1], DEFAULT_FEATURE_WEIGHTS),
        buildDistance(points[0], points[2], DEFAULT_FEATURE_WEIGHTS),
        buildDistance(points[1], points[2], DEFAULT_FEATURE_WEIGHTS),
      ].reduce((x, y) => x + y, 0) / 3;
    expect(expectedWeighted).not.toBeCloseTo(unweighted, 3);
  });
});

describe('overflow distance cap', () => {
  /**
   * Regression: overflow signatures cut by maxUniqueSignatures were attached to
   * their nearest medoid REGARDLESS of distance, bypassing MAX_MERGE_DISTANCE.
   */
  function overflowScenario(outlierOverrides: Partial<ParseFeatureVector>) {
    syntheticId = 0;
    const common = Array.from({ length: 5 }, (_, i) =>
      syntheticVector({ parseId: `common-${i}`, monsterSet: SETS.slimecraw, amount: 500_000 - i }),
    );
    const keptSecond = syntheticVector({
      parseId: 'kept-second',
      monsterSet: SETS.zaan,
      amount: 5_000,
    });
    const outlier = syntheticVector({
      parseId: 'overflow-outlier',
      amount: 100,
      esoClass: 'Sorcerer',
      skillLines: [4, 5],
      fivePieceSets: [693, 127],
      frontBar: [23200, 24785],
      backBar: [217699, 222678],
      frontBarBase: [23200, 24785],
      backBarBase: [217699, 222678],
      mythic: SETS.oakensoul,
      arena: SETS.merciless,
      ...outlierOverrides,
    });

    return { vectors: [...common, keptSecond, outlier] };
  }

  it('drops a distant overflow signature instead of attaching it', () => {
    const input = overflowScenario({});
    const result = clusterBuilds({ ...input, options: { maxUniqueSignatures: 2 } });

    // The outlier is unrelated to everything: beyond the ceiling it stays out.
    const assigned = result.clusters.flatMap((c) => c.memberParseIds);
    expect(assigned).not.toContain('overflow-outlier');
    expect(assigned).toHaveLength(6);
    expect(result.droppedParses).toBe(1);
    expect(result.totalParses).toBe(7);
    // Consistent accounting: assigned + dropped === total.
    expect(assigned.length + result.droppedParses).toBe(result.totalParses);
  });

  it('still attaches an overflow signature within the merge ceiling', () => {
    // Identical to the common signature apart from the monster set (~0.04).
    const input = overflowScenario({
      esoClass: 'Necromancer',
      skillLines: [15, 16],
      fivePieceSets: [127, 456],
      frontBar: [10, 11],
      backBar: [20, 21],
      frontBarBase: [10, 11],
      backBarBase: [20, 21],
      mythic: null,
      arena: null,
      monsterSet: SETS.azureblight,
    });
    const result = clusterBuilds({ ...input, options: { maxUniqueSignatures: 2 } });

    const assigned = result.clusters.flatMap((c) => c.memberParseIds);
    expect(assigned).toContain('overflow-outlier');
    expect(result.droppedParses).toBe(0);
  });

  it('applies the same ceiling when the pipeline yields a single cluster', () => {
    resetFixtureIds();
    // 40 identical builds collapse to one point; a wild outlier is the only
    // overflow signature. It must be dropped, not folded into the lone cluster.
    const identical = Array.from({ length: 40 }, (_, i) =>
      makeParse(NECRO_ARCHETYPE, i, { amount: 300_000 - i * 100 }),
    );
    const outlierVectors = extractFeatureVectors(
      [makeParse(SORC_ARCHETYPE, 0, { amount: 900_000, parse_id: 'wild-outlier' })],
      EMPTY_CANONICAL_MAPS,
    );

    const result = clusterBuilds({
      vectors: [...extractFeatureVectors(identical, EMPTY_CANONICAL_MAPS), ...outlierVectors],
      options: { maxUniqueSignatures: 1 },
    });

    expect(result.k).toBe(1);
    expect(result.clusters[0].memberParseIds).not.toContain('wild-outlier');
    expect(result.clusters[0].size).toBe(40);
    expect(result.droppedParses).toBe(1);
  });
});
