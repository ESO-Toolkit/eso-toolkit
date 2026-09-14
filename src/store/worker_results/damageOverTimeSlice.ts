import type { DamageOverTimeCalculationTask } from '@/workers/calculations/CalculateDamageOverTime';

import { createWorkerTaskSlice } from './workerTaskSliceFactory';

const cacheOwnerIds = new WeakMap<object, number>();
let nextCacheOwnerId = 1;

const getCacheOwnerId = (owner: object | null | undefined): number => {
  if (!owner) return 0;

  const existingId = cacheOwnerIds.get(owner);
  if (existingId !== undefined) return existingId;

  const id = nextCacheOwnerId;
  nextCacheOwnerId += 1;
  cacheOwnerIds.set(owner, id);
  return id;
};

/**
 * Scope cached results to the immutable Redux containers that own the worker
 * input. Reference identity distinguishes equal-sized fights without scanning
 * up to 500k events on the main thread. Fight bounds and bucket size remain in
 * the key because callers may reuse the same stream for a different window.
 */
export const damageOverTimeInputHash = (input: DamageOverTimeCalculationTask): string => {
  const fightStart = input.fight?.startTime ?? 0;
  const fightEnd = input.fight?.endTime ?? 0;
  const bucketSize = input.bucketSizeMs ?? 1000;
  const playersOwner = getCacheOwnerId(input.players);
  const eventsOwner = getCacheOwnerId(input.damageEvents);

  return `dmg-over-time-${fightStart}-${fightEnd}-${bucketSize}-p${playersOwner}-e${eventsOwner}`;
};

// Create damage over time slice
export const damageOverTimeSlice = createWorkerTaskSlice(
  'calculateDamageOverTimeData',
  damageOverTimeInputHash,
);

// Export actions, thunk, and reducer
export const damageOverTimeActions = damageOverTimeSlice.actions;
export const executeDamageOverTimeTask = damageOverTimeSlice.executeTask;
export const damageOverTimeReducer = damageOverTimeSlice.reducer;
