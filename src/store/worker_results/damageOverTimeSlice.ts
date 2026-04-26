import { createWorkerTaskSlice } from './workerTaskSliceFactory';

// Create damage over time slice
export const damageOverTimeSlice = createWorkerTaskSlice('calculateDamageOverTimeData', (input) => {
  const fightStart = input.fight?.startTime ?? 0;
  const fightEnd = input.fight?.endTime ?? 0;
  const playersCount = input.players ? Object.keys(input.players).length : 0;
  const damageEventsCount = input.damageEvents?.length ?? 0;
  const bucketSize = input.bucketSizeMs ?? 1000;
  return `dmg-over-time-${fightStart}-${fightEnd}-${playersCount}-${damageEventsCount}-${bucketSize}`;
});

// Export actions, thunk, and reducer
export const damageOverTimeActions = damageOverTimeSlice.actions;
export const executeDamageOverTimeTask = damageOverTimeSlice.executeTask;
export const damageOverTimeReducer = damageOverTimeSlice.reducer;
