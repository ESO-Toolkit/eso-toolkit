import { act, renderHook, waitFor } from '@testing-library/react';

import type { FightFragment } from '@/graphql/gql/graphql';
import type { DamageEvent } from '@/types/combatlogEvents';
import { calculateDamageStatisticsWithActivity } from '@/utils/activePercentageUtils';

import { runDamageStatistics } from './runDamageStatistics';
import { DAMAGE_STATISTICS_WORKER_THRESHOLD, useDamageStatistics } from './useDamageStatistics';

jest.mock('./runDamageStatistics', () => ({ runDamageStatistics: jest.fn() }));

const mockRunDamageStatistics = jest.mocked(runDamageStatistics);
const fight = { id: 1, startTime: 0, endTime: 60_000 } as FightFragment;

function event(sourceID: number, targetID = 99): DamageEvent {
  return {
    type: 'damage',
    sourceID,
    targetID,
    timestamp: 1_000,
    amount: 100,
    hitType: 1,
    targetIsFriendly: false,
  } as DamageEvent;
}

function largeEvents(sourceID: number): Record<string, DamageEvent[]> {
  return { [sourceID]: Array(DAMAGE_STATISTICS_WORKER_THRESHOLD).fill(event(sourceID)) };
}

function deferred<T>(): {
  promise: Promise<T>;
  resolve: (value: T) => void;
  reject: (cause: unknown) => void;
} {
  let resolve!: (value: T) => void;
  let reject!: (cause: unknown) => void;
  const promise = new Promise<T>((resolvePromise, rejectPromise) => {
    resolve = resolvePromise;
    reject = rejectPromise;
  });
  return { promise, resolve, reject };
}

describe('useDamageStatistics', () => {
  beforeEach(() => mockRunDamageStatistics.mockReset());

  it('calculates inputs below the threshold synchronously', () => {
    const damageEventsByPlayer = { 1: [event(1)] };
    const selectedTargetIds = new Set<number>();
    const { result } = renderHook(() =>
      useDamageStatistics({ fight, damageEventsByPlayer, selectedTargetIds }),
    );

    expect(result.current.isLoading).toBe(false);
    expect(result.current.damageStatistics?.damageByPlayer[1]).toBe(100);
    expect(mockRunDamageStatistics).not.toHaveBeenCalled();
  });

  it('aborts superseded work and never publishes its late result', async () => {
    const first = deferred<ReturnType<typeof calculateDamageStatisticsWithActivity>>();
    const second = deferred<ReturnType<typeof calculateDamageStatisticsWithActivity>>();
    mockRunDamageStatistics.mockReturnValueOnce(first.promise).mockReturnValueOnce(second.promise);
    const firstEvents = largeEvents(1);
    const secondEvents = largeEvents(2);
    const selectedTargetIds = new Set<number>();

    const { result, rerender } = renderHook(
      ({ damageEventsByPlayer }) =>
        useDamageStatistics({ fight, damageEventsByPlayer, selectedTargetIds }),
      { initialProps: { damageEventsByPlayer: firstEvents } },
    );
    await waitFor(() => expect(mockRunDamageStatistics).toHaveBeenCalledTimes(1));
    const firstSignal = mockRunDamageStatistics.mock.calls[0][1]?.signal;

    rerender({ damageEventsByPlayer: secondEvents });
    await waitFor(() => expect(mockRunDamageStatistics).toHaveBeenCalledTimes(2));
    expect(firstSignal?.aborted).toBe(true);
    expect(result.current.damageStatistics).toBeNull();

    const staleResult = calculateDamageStatisticsWithActivity(fight, firstEvents, new Set());
    await act(async () => first.resolve(staleResult));
    expect(result.current.damageStatistics).toBeNull();

    const currentResult = calculateDamageStatisticsWithActivity(fight, secondEvents, new Set());
    await act(async () => second.resolve(currentResult));
    await waitFor(() => expect(result.current.damageStatistics?.damageByPlayer[2]).toBe(1_000_000));
    expect(result.current.damageStatistics?.damageByPlayer[1]).toBeUndefined();
  });

  it('surfaces worker failures and retries with a fresh attempt', async () => {
    const damageEventsByPlayer = largeEvents(1);
    const selectedTargetIds = new Set<number>();
    const recovered = calculateDamageStatisticsWithActivity(fight, damageEventsByPlayer, new Set());
    mockRunDamageStatistics.mockRejectedValueOnce(new Error('worker stopped'));
    mockRunDamageStatistics.mockResolvedValueOnce(recovered);

    const { result } = renderHook(() =>
      useDamageStatistics({ fight, damageEventsByPlayer, selectedTargetIds }),
    );
    await waitFor(() => expect(result.current.error?.message).toBe('worker stopped'));

    act(() => result.current.retry());
    expect(result.current.damageStatistics).toBeNull();
    await waitFor(() => expect(mockRunDamageStatistics).toHaveBeenCalledTimes(2));
    await waitFor(() => expect(result.current.damageStatistics?.damageByPlayer[1]).toBe(1_000_000));
    expect(result.current.error).toBeNull();
  });
});
