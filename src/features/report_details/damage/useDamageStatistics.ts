import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import type { FightFragment } from '@/graphql/gql/graphql';
import type { DamageEvent } from '@/types/combatlogEvents';
import {
  calculateDamageStatisticsWithActivity,
  type DamageStatisticsWithActivity,
} from '@/utils/activePercentageUtils';

import { runDamageStatistics } from './runDamageStatistics';

export const DAMAGE_STATISTICS_WORKER_THRESHOLD = 10_000;

interface UseDamageStatisticsInput {
  fight: FightFragment | null | undefined;
  damageEventsByPlayer: Record<string, DamageEvent[]>;
  selectedTargetIds: ReadonlySet<number>;
}

interface DamageStatisticsAsyncState {
  input: DamageStatisticsWorkerInput | null;
  attempt: number;
  result: DamageStatisticsWithActivity | null;
  error: Error | null;
}

interface DamageStatisticsWorkerInput {
  fight: FightFragment | null | undefined;
  damageEventsByPlayer: Record<string, DamageEvent[]>;
  selectedTargetIds: readonly number[];
}

export interface UseDamageStatisticsResult {
  damageStatistics: DamageStatisticsWithActivity | null;
  isLoading: boolean;
  error: Error | null;
  retry: () => void;
}

export function countDamageEvents(damageEventsByPlayer: Record<string, DamageEvent[]>): number {
  let count = 0;
  for (const events of Object.values(damageEventsByPlayer)) count += events.length;
  return count;
}

/**
 * Keeps small calculations synchronous while moving scale-heavy work off the
 * main thread. Results are tied to their exact input object and request id so a
 * superseded fight or target calculation can never become visible.
 */
export function useDamageStatistics({
  fight,
  damageEventsByPlayer,
  selectedTargetIds,
}: UseDamageStatisticsInput): UseDamageStatisticsResult {
  const selectedTargetIdList = useMemo(
    () => Array.from(selectedTargetIds).sort((left, right) => left - right),
    [selectedTargetIds],
  );
  const input = useMemo<DamageStatisticsWorkerInput>(
    () => ({ fight, damageEventsByPlayer, selectedTargetIds: selectedTargetIdList }),
    [fight, damageEventsByPlayer, selectedTargetIdList],
  );
  const eventCount = useMemo(() => countDamageEvents(damageEventsByPlayer), [damageEventsByPlayer]);
  const useWorker = eventCount >= DAMAGE_STATISTICS_WORKER_THRESHOLD;
  const synchronousResult = useMemo(
    () =>
      useWorker
        ? null
        : calculateDamageStatisticsWithActivity(fight, damageEventsByPlayer, selectedTargetIds),
    [useWorker, fight, damageEventsByPlayer, selectedTargetIds],
  );

  const [attempt, setAttempt] = useState(0);
  const [asyncState, setAsyncState] = useState<DamageStatisticsAsyncState>({
    input: null,
    attempt: -1,
    result: null,
    error: null,
  });
  const latestRequest = useRef(0);

  useEffect(() => {
    if (!useWorker) return;

    const requestId = latestRequest.current + 1;
    latestRequest.current = requestId;
    const controller = new AbortController();

    setAsyncState({ input, attempt, result: null, error: null });
    void runDamageStatistics(input, { signal: controller.signal }).then(
      (result) => {
        if (latestRequest.current !== requestId || controller.signal.aborted) return;
        setAsyncState({ input, attempt, result, error: null });
      },
      (cause: unknown) => {
        if (
          latestRequest.current !== requestId ||
          controller.signal.aborted ||
          (cause as Error | undefined)?.name === 'AbortError'
        ) {
          return;
        }

        const error =
          cause instanceof Error ? cause : new Error('Damage statistics could not be calculated.');
        setAsyncState({ input, attempt, result: null, error });
      },
    );

    return () => controller.abort();
  }, [attempt, input, useWorker]);

  const retry = useCallback(() => setAttempt((current) => current + 1), []);

  if (!useWorker) {
    return { damageStatistics: synchronousResult, isLoading: false, error: null, retry };
  }

  const stateMatchesCurrentRequest = asyncState.input === input && asyncState.attempt === attempt;
  return {
    damageStatistics: stateMatchesCurrentRequest ? asyncState.result : null,
    isLoading:
      !stateMatchesCurrentRequest || (asyncState.result === null && asyncState.error === null),
    error: stateMatchesCurrentRequest ? asyncState.error : null,
    retry,
  };
}
