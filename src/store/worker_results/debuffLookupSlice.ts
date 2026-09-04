import { digestTuples } from '../../workers/cacheKey';

import { createWorkerTaskSlice } from './workerTaskSliceFactory';

/** Key version — bump when the calculation's inputs/outputs change shape. */
const KEY_VERSION = 'v2';

interface BuffLikeEvent {
  timestamp?: unknown;
  type?: unknown;
  sourceID?: unknown;
  targetID?: unknown;
  abilityGameID?: unknown;
}

/**
 * Content-addressed input hash. The old count+endTime+first-timestamp hash served one fight's
 * lookup to any other fight with equal stream length, and every empty stream collided. Buff
 * events carry no fight id, so the caller threads fightId/fightStartTime for identity and the
 * digest covers every event's identity tuple.
 */
export const createDebuffLookupInputHash = (input: {
  buffEvents?: readonly BuffLikeEvent[] | null;
  fightEndTime?: unknown;
  fightId?: string | number | null;
  fightStartTime?: unknown;
}): string => {
  const events = input.buffEvents ?? [];
  // Stride-sample identity tuples (cap ~2048 samples): full-length joins would build
  // multi-megabyte strings per dispatch for large streams; length + endpoints + samples
  // still separate any two differing streams for cache purposes.
  const step = Math.max(1, Math.floor(events.length / 2048));
  const tuples: Array<string | number> = [];
  for (let i = 0; i < events.length; i += step) {
    const e = events[i] ?? {};
    tuples.push(
      typeof e.timestamp === 'number' ? e.timestamp : 0,
      typeof e.sourceID === 'number' ? e.sourceID : 0,
      typeof e.targetID === 'number' ? e.targetID : 0,
      typeof e.abilityGameID === 'number' ? e.abilityGameID : 0,
      typeof e.type === 'string' ? e.type : '?',
    );
  }
  // Endpoints always included so truncation at the tail can't hide a difference.
  if (events.length > 0 && step > 1) {
    const e = events[events.length - 1] ?? {};
    tuples.push(
      typeof e.timestamp === 'number' ? e.timestamp : 0,
      typeof e.sourceID === 'number' ? e.sourceID : 0,
      typeof e.targetID === 'number' ? e.targetID : 0,
      typeof e.abilityGameID === 'number' ? e.abilityGameID : 0,
      typeof e.type === 'string' ? e.type : '?',
    );
  }
  const digest = digestTuples(tuples);
  const fight = `${String(input.fightId ?? '?')}:${String(input.fightStartTime ?? '?')}-${String(input.fightEndTime ?? '?')}`;
  return `debuff-lookup-${KEY_VERSION}-${fight}-${events.length}-${digest}`;
};

// Debuff lookup feeds positions, so it runs on the same isolated replay pool with higher
// priority (it must finish before the position compute can start).
export const debuffLookupSlice = createWorkerTaskSlice(
  'calculateDebuffLookup',
  (input) =>
    createDebuffLookupInputHash({
      buffEvents: input.buffEvents,
      fightEndTime: input.fightEndTime,
      fightId: input.fightId,
      fightStartTime: input.fightStartTime,
    }),
  {
    poolName: 'replay',
    poolConfig: { maxWorkers: 2, taskTimeout: 90000, idleTimeout: 30000, retryAttempts: 1 },
    priority: 20,
  },
);

// Export actions, thunk, and reducer
export const debuffLookupActions = debuffLookupSlice.actions;
export const executeDebuffLookupTask = debuffLookupSlice.executeTask;
export const debuffLookupReducer = debuffLookupSlice.reducer;
