import { act, renderHook, waitFor } from '@testing-library/react';

import {
  NECRO_ARCHETYPE,
  makeParse,
  makeThreeArchetypeFixture,
  resetFixtureIds,
} from '../../clustering/__fixtures__/dpsParses.fixture';
import { runBuildClustering } from '../../clustering/runBuildClustering';
import { useBuildClusters } from '../useBuildClusters';
import type { ClusterBuildsResult } from '../../types/clustering.types';
import type { DpsParse } from '../../types/dpsParses.types';

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
      // eslint-disable-next-line no-await-in-loop
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
});
