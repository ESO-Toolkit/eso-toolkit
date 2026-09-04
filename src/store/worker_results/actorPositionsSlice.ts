import { digestEventStream, digestIdSet, digestTuples, fnv1aHex } from '../../workers/cacheKey';

import { createWorkerTaskSlice } from './workerTaskSliceFactory';

/** Key version — bump when the calculation's inputs/outputs change shape. */
const KEY_VERSION = 'v2';

/**
 * Content-addressed input hash. The old length-only hash served one fight's results to any
 * other fight with equal event counts. This digests per-stream content (length + endpoints +
 * strided sample), roster identity, debuff content, and report/fight bounds, so equal keys
 * mean (for cache purposes) equal inputs.
 */
export const createActorPositionsInputHash = (input: {
  fight?: { id?: unknown; startTime?: unknown; endTime?: unknown } | null;
  events?: {
    damage?: readonly unknown[] | null;
    heal?: readonly unknown[] | null;
    death?: readonly unknown[] | null;
    resource?: readonly unknown[] | null;
    cast?: readonly unknown[] | null;
  } | null;
  playersById?: Record<string | number, unknown> | null;
  actorsById?: Record<string | number, unknown> | null;
  debuffLookupData?: { buffIntervals?: Record<string, readonly unknown[]> | null } | null;
  reportCode?: string | null;
}): string => {
  const fight = input.fight;
  const events = input.events;
  const streams = events
    ? [
        digestEventStream(events.damage),
        digestEventStream(events.heal),
        digestEventStream(events.death),
        digestEventStream(events.resource),
        digestEventStream(events.cast),
      ]
    : ['no-events'];
  const debuff = input.debuffLookupData?.buffIntervals
    ? digestTuples(
        Object.entries(input.debuffLookupData.buffIntervals).flatMap(([ability, intervals]) => [
          ability,
          Array.isArray(intervals) ? intervals.length : 0,
        ]),
      )
    : 'no-debuff';
  const digest = fnv1aHex(
    [
      ...streams,
      digestIdSet(input.playersById ? Object.keys(input.playersById) : null),
      digestIdSet(input.actorsById ? Object.keys(input.actorsById) : null),
      debuff,
    ].join('~'),
  );
  const fightId = fight?.id ?? 'no-fight';
  const bounds = `${String(fight?.startTime ?? '?')}-${String(fight?.endTime ?? '?')}`;
  const report = input.reportCode ?? 'na';
  return `actor-positions-${KEY_VERSION}-${report}-${String(fightId)}-${bounds}-${digest}`;
};

// Coarse-pointer (mobile) devices keep a single cached fight to bound memory; desktop keeps 3.
const isCoarsePointer = (): boolean =>
  typeof window !== 'undefined' &&
  typeof window.matchMedia === 'function' &&
  window.matchMedia('(pointer:coarse)').matches;

// Create actor positions slice on the isolated replay pool: long position computes must not
// queue behind (or block) unrelated analytics work, and get priority + a longer timeout.
export const actorPositionsSlice = createWorkerTaskSlice(
  'calculateActorPositions',
  (input) =>
    createActorPositionsInputHash({
      fight: input.fight,
      events: input.events,
      playersById: input.playersById,
      actorsById: input.actorsById,
      debuffLookupData: input.debuffLookupData,
      reportCode: input.reportCode,
    }),
  {
    maxCacheSize: isCoarsePointer() ? 1 : 3,
    poolName: 'replay',
    poolConfig: { maxWorkers: 2, taskTimeout: 90000, idleTimeout: 30000, retryAttempts: 1 },
    priority: 10,
  },
);

// Export actions, thunk, and reducer
export const actorPositionsActions = actorPositionsSlice.actions;
export const executeActorPositionsTask = actorPositionsSlice.executeTask;
export const actorPositionsReducer = actorPositionsSlice.reducer;
