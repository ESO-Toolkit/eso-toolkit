import { act, renderHook, waitFor } from '@testing-library/react';

import {
  NECRO_ARCHETYPE,
  makeParse,
  makeThreeArchetypeFixture,
  resetFixtureIds,
} from '../../clustering/__fixtures__/dpsParses.fixture';
import { runBuildClustering } from '../../clustering/runBuildClustering';
import type { ClusterBuildsResult } from '../../types/clustering.types';
import type { DpsParse } from '../../types/dpsParses.types';
import { useBuildClusters } from '../useBuildClusters';

jest.mock('../../clustering/runBuildClustering');

const mockedRun = runBuildClustering as jest.MockedFunction<typeof runBuildClustering>;

const EMPTY_RESULT: ClusterBuildsResult = {
  clusters: [],
  k: 0,
  silhouette: 0,
  silhouetteByK: [],
  recommendedClusterId: null,
  totalParses: 0,
  uniqueSignatures: 0,
  droppedParses: 0,
};

/**
 * Hands back a promise the test resolves by hand, so clustering can be held
 * genuinely in-flight across a rerender.
 *
 * This matters: the production fallback path runs synchronously, so without a
 * deferred the run always completes before any rerender and the
 * "cancelled mid-flight" state these tests target never occurs — a regression
 * test written against the real implementation passes even with the bug present.
 */
function deferRun(): { resolve: (value: ClusterBuildsResult) => void } {
  let resolveFn: ((value: ClusterBuildsResult) => void) | undefined;
  mockedRun.mockImplementationOnce(
    () =>
      new Promise<ClusterBuildsResult>((resolve) => {
        resolveFn = resolve;
      }),
  );
  return { resolve: (value) => resolveFn?.(value) };
}

beforeEach(() => {
  resetFixtureIds();
  mockedRun.mockReset();
});

describe('useBuildClusters', () => {
  /**
   * A blanket "Ability <id>" fallback would mislabel gear sets, mundus and food
   * as abilities — stating something false rather than merely being unhelpful.
   */
  it('falls back to a group-appropriate label for unresolved traits', async () => {
    mockedRun.mockResolvedValue({
      ...EMPTY_RESULT,
      k: 1,
      clusters: [
        {
          id: 'c0',
          label: 'x',
          esoClass: 'Arcanist',
          size: 1,
          share: 1,
          memberParseIds: ['p1'],
          medoidParseId: 'p1',
          dps: { min: 0, q1: 0, median: 0, q3: 0, p90: 0, max: 0, mean: 0, count: 1 },
          // Ids deliberately absent from the parses, so nothing resolves.
          core: [
            { group: 'frontBar', id: 987654, label: '', share: 1 },
            { group: 'fivePieceSets', id: 987655, label: '', share: 1 },
            { group: 'mundus', id: 987656, label: '', share: 1 },
            { group: 'food', id: 987657, label: '', share: 1 },
          ],
          flex: [],
          variations: [],
          cohesion: 0,
        },
      ],
    });

    const { result } = renderHook(() => useBuildClusters(makeThreeArchetypeFixture()));
    await waitFor(() => expect(result.current.result).not.toBeNull());

    const byGroup = Object.fromEntries(
      result.current.result!.clusters[0].core.map((t) => [t.group, t.label]),
    );
    expect(byGroup.frontBar).toBe('Ability 987654');
    expect(byGroup.fivePieceSets).toBe('Set 987655');
    expect(byGroup.mundus).toBe('Mundus 987656');
    expect(byGroup.food).toBe('Food 987657');
  });

  /**
   * Regression (live-data report): a Dragonknight wearing ONLY the perfected
   * variant of a set clustered under the canonical BASE id, while every
   * parse's setCounts held only the perfected id — so label hydration missed
   * and the chip rendered a raw "Set 767". The lookup must be keyed by the
   * canonical id too.
   */
  it('labels perfected-canonicalized set traits with the base set name', async () => {
    // 772 = Perfected Slivers of the Null Arca; 767 = its base id. Both are in
    // SET_DISPLAY_NAMES under the same normalized name, so buildSetAliasMap
    // folds 772 -> 767.
    const PERFECTED_SLIVERS = 772;
    const parses = Array.from({ length: 12 }, (_, i) =>
      makeParse(
        { ...NECRO_ARCHETYPE, fivePiece: [PERFECTED_SLIVERS, NECRO_ARCHETYPE.fivePiece[1]] },
        i,
      ),
    );

    mockedRun.mockResolvedValue({
      ...EMPTY_RESULT,
      k: 1,
      clusters: [
        {
          id: 'c0',
          label: 'x',
          esoClass: NECRO_ARCHETYPE.esoClass,
          size: 12,
          share: 1,
          memberParseIds: ['p1'],
          medoidParseId: 'p1',
          dps: { min: 0, q1: 0, median: 0, q3: 0, p90: 0, max: 0, mean: 0, count: 12 },
          core: [{ group: 'fivePieceSets', id: 767, label: '', share: 1 }],
          flex: [],
          variations: [],
          cohesion: 0,
        },
      ],
    });

    const { result } = renderHook(() => useBuildClusters(parses));
    await waitFor(() => expect(result.current.result).not.toBeNull());

    const trait = result.current.result!.clusters[0].core[0];
    expect(trait.label).toBe('Slivers of the Null Arca');
  });

  /**
   * The worker now resolves skillLines ids against CLASS_SKILL_LINES itself.
   * Hydration must prefer that non-empty label over the (empty) parse-derived
   * lookup, otherwise worker-resolved names are clobbered with raw numbers.
   */
  it('keeps worker-resolved skillLines labels and falls back to CLASS_SKILL_LINES', async () => {
    mockedRun.mockResolvedValue({
      ...EMPTY_RESULT,
      k: 1,
      clusters: [
        {
          id: 'c0',
          label: 'x',
          esoClass: 'Sorcerer',
          size: 1,
          share: 1,
          memberParseIds: ['p1'],
          medoidParseId: 'p1',
          dps: { min: 0, q1: 0, median: 0, q3: 0, p90: 0, max: 0, mean: 0, count: 1 },
          core: [
            // Resolved by the worker — must survive untouched.
            { group: 'skillLines', id: 5, label: 'Storm Calling', share: 1 },
            // Left blank by the worker — resolved here via CLASS_SKILL_LINES[4].
            { group: 'skillLines', id: 4, label: '', share: 1 },
            // Out of range for the table entirely.
            { group: 'skillLines', id: 987654, label: '', share: 1 },
          ],
          flex: [],
          variations: [],
          cohesion: 0,
        },
      ],
    });

    const { result } = renderHook(() => useBuildClusters(makeThreeArchetypeFixture()));
    await waitFor(() => expect(result.current.result).not.toBeNull());

    const labels = result.current.result!.clusters[0].core.map((t) => t.label);
    expect(labels).toEqual(['Storm Calling', 'Daedric Summoning', 'Skill line 987654']);
  });

  it('clusters a full set of parses', async () => {
    mockedRun.mockResolvedValue({ ...EMPTY_RESULT, k: 3 });
    const { result } = renderHook(() => useBuildClusters(makeThreeArchetypeFixture()));

    await waitFor(() => expect(result.current.result).not.toBeNull());
    expect(result.current.result?.k).toBe(3);
    expect(result.current.loading).toBe(false);
    expect(result.current.error).toBeNull();
  });

  it('refuses to cluster below the minimum and never starts a run', async () => {
    mockedRun.mockResolvedValue(EMPTY_RESULT);
    const { result } = renderHook(() => useBuildClusters(makeThreeArchetypeFixture().slice(0, 5)));

    await waitFor(() => expect(result.current.tooFewParses).toBe(true));
    expect(mockedRun).not.toHaveBeenCalled();
    expect(result.current.result).toBeNull();
    expect(result.current.loading).toBe(false);
  });

  it('surfaces a clustering failure', async () => {
    mockedRun.mockRejectedValue(new Error('worker exploded'));
    const { result } = renderHook(() => useBuildClusters(makeThreeArchetypeFixture()));

    await waitFor(() => expect(result.current.error).toBe('worker exploded'));
    expect(result.current.loading).toBe(false);
  });

  /**
   * Regression: the early-return branches did not clear `loading`. The previous
   * run's cleanup sets `cancelled`, so its `.finally()` deliberately skips
   * setLoading(false) — leaving the UI stuck on "Grouping N parses…" with nothing
   * left to resolve it.
   */
  it('clears loading when the parse set empties while a run is in flight', async () => {
    const pending = deferRun();
    const parses = makeThreeArchetypeFixture();

    const { result, rerender } = renderHook(
      ({ input }: { input: DpsParse[] }) => useBuildClusters(input),
      { initialProps: { input: parses } },
    );

    await waitFor(() => expect(result.current.loading).toBe(true));

    // Parses clear while clustering is genuinely still running.
    rerender({ input: [] });

    expect(result.current.loading).toBe(false);
    expect(result.current.result).toBeNull();

    // A late resolution must not revive the spinner.
    await act(async () => {
      pending.resolve({ ...EMPTY_RESULT, k: 3 });
    });
    expect(result.current.loading).toBe(false);
  });

  it('clears loading when dropping below the minimum while a run is in flight', async () => {
    const pending = deferRun();
    const parses = makeThreeArchetypeFixture();

    const { result, rerender } = renderHook(
      ({ input }: { input: DpsParse[] }) => useBuildClusters(input),
      { initialProps: { input: parses } },
    );

    await waitFor(() => expect(result.current.loading).toBe(true));

    rerender({ input: parses.slice(0, 4) });

    expect(result.current.tooFewParses).toBe(true);
    expect(result.current.loading).toBe(false);

    await act(async () => {
      pending.resolve(EMPTY_RESULT);
    });
    expect(result.current.loading).toBe(false);
  });

  /**
   * The cache is a plain Map on a ref, so without a cap a session browsing many
   * encounters retains every ClusterBuildsResult (each holding all member parse
   * ids) for the lifetime of the page.
   */
  it('evicts least-recently-used entries instead of growing without bound', async () => {
    mockedRun.mockResolvedValue(EMPTY_RESULT);

    // Distinct parse sets => distinct cache keys.
    const sets: DpsParse[][] = [];
    for (let i = 0; i < 20; i++) {
      resetFixtureIds();
      sets.push(
        Array.from({ length: 20 }, (_, j) =>
          makeParse(NECRO_ARCHETYPE, j, { parse_id: `set${i}-parse${j}` }),
        ),
      );
    }

    const { result, rerender } = renderHook(
      ({ input }: { input: DpsParse[] }) => useBuildClusters(input),
      { initialProps: { input: sets[0] } },
    );
    await waitFor(() => expect(result.current.result).not.toBeNull());

    for (let i = 1; i < sets.length; i++) {
      rerender({ input: sets[i] });

      await waitFor(() => expect(result.current.loading).toBe(false));
    }

    // 20 distinct sets clustered; the cap must have evicted the excess. Asserted
    // via behaviour: the oldest key is gone, so returning to it re-runs.
    const callsBefore = mockedRun.mock.calls.length;
    rerender({ input: sets[0] });
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(mockedRun.mock.calls.length).toBeGreaterThan(callsBefore);

    // …while a recent one is still cached and does NOT re-run.
    const callsAfter = mockedRun.mock.calls.length;
    rerender({ input: sets[sets.length - 1] });
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(mockedRun.mock.calls.length).toBe(callsAfter);
  });

  /**
   * Regression: the cache was keyed on parse_id alone, which is deliberately
   * stable across re-ingests. When the cron updates a character's best parse the
   * id stays put while the build changes, so an id-only key served clusters
   * computed from data that no longer exists.
   */
  it('recomputes when the same parse ids carry changed builds', async () => {
    mockedRun.mockResolvedValue({ ...EMPTY_RESULT, k: 3 });
    const parses = makeThreeArchetypeFixture();

    const { result, rerender } = renderHook(
      ({ input }: { input: DpsParse[] }) => useBuildClusters(input),
      { initialProps: { input: parses } },
    );
    await waitFor(() => expect(result.current.result).not.toBeNull());
    const callsAfterFirst = mockedRun.mock.calls.length;

    // Same ids, same objects: must hit cache.
    rerender({ input: [...parses] });
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(mockedRun.mock.calls.length).toBe(callsAfterFirst);

    // Same ids, but one parse re-parsed higher with a different build.
    const updated = parses.map((p, i) =>
      i === 0 ? { ...p, amount: p.amount + 5000, signature_hash: 'changed' } : p,
    );
    rerender({ input: updated });

    await waitFor(() => expect(mockedRun.mock.calls.length).toBeGreaterThan(callsAfterFirst));
  });

  /**
   * resolveBaseAbilityId feeds buildCanonicalMaps, which changes the feature
   * vectors and therefore every distance. It cannot go in the cache key (it is a
   * function), so the cache has to be dropped when its identity changes.
   */
  it('recomputes when the ability resolver changes', async () => {
    mockedRun.mockResolvedValue({ ...EMPTY_RESULT, k: 3 });
    const parses = makeThreeArchetypeFixture();
    const resolverA = (id: number): number => id;
    const resolverB = (id: number): number => id + 1;

    const { result, rerender } = renderHook(
      ({ r }: { r: (id: number) => number }) => useBuildClusters(parses, r),
      { initialProps: { r: resolverA } },
    );
    await waitFor(() => expect(result.current.result).not.toBeNull());
    const afterFirst = mockedRun.mock.calls.length;

    // Same parses, same resolver: cache hit, no recompute.
    rerender({ r: resolverA });
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(mockedRun.mock.calls.length).toBe(afterFirst);

    // Same parses, DIFFERENT resolver: must recompute.
    rerender({ r: resolverB });
    await waitFor(() => expect(mockedRun.mock.calls.length).toBeGreaterThan(afterFirst));
  });

  it('clears loading when a cache hit interrupts an in-flight run', async () => {
    const parses = makeThreeArchetypeFixture();
    resetFixtureIds();
    const other = Array.from({ length: 20 }, (_, i) => makeParse(NECRO_ARCHETYPE, i));

    // First: complete a run so `parses` is cached.
    mockedRun.mockResolvedValueOnce({ ...EMPTY_RESULT, k: 3 });
    const { result, rerender } = renderHook(
      ({ input }: { input: DpsParse[] }) => useBuildClusters(input),
      { initialProps: { input: parses } },
    );
    await waitFor(() => expect(result.current.result?.k).toBe(3));

    // Then: start a run for a different set and leave it hanging.
    const pending = deferRun();
    rerender({ input: other });
    await waitFor(() => expect(result.current.loading).toBe(true));

    // Switching back hits the cache while loading is still true.
    rerender({ input: parses });

    expect(result.current.result?.k).toBe(3);
    expect(result.current.loading).toBe(false);

    await act(async () => {
      pending.resolve(EMPTY_RESULT);
    });
    expect(result.current.loading).toBe(false);
  });
  /**
   * Reloading the parses is not a retry for a clustering failure. The effect is
   * keyed on `cacheKey`, derived from the parse contents, so a refetch that
   * returns the same rows yields the same key and never re-runs — and the error
   * path writes nothing to the cache, so the page would sit on the error until a
   * full reload. The rerender below deliberately passes a NEW array holding the
   * SAME parses, which is exactly what a refetch produces.
   */
  it('re-runs clustering on demand when the parses are unchanged', async () => {
    const parses = makeThreeArchetypeFixture();

    mockedRun.mockRejectedValueOnce(new Error('worker died'));
    const { result, rerender } = renderHook(
      ({ input }: { input: DpsParse[] }) => useBuildClusters(input),
      { initialProps: { input: parses } },
    );
    await waitFor(() => expect(result.current.error).toBe('worker died'));

    // A parses reload: new array identity, identical contents. On its own this
    // must NOT clear the error, which is what made the Retry button a no-op.
    mockedRun.mockResolvedValue({ ...EMPTY_RESULT, k: 4 });
    rerender({ input: [...parses] });
    expect(result.current.error).toBe('worker died');
    expect(result.current.result).toBeNull();

    await act(async () => {
      result.current.recluster();
    });

    await waitFor(() => expect(result.current.result?.k).toBe(4));
    expect(result.current.error).toBeNull();
  });
});
