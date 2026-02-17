import { createWorkerTaskSlice } from './workerTaskSliceFactory';

// Create debuff lookup slice
export const debuffLookupSlice = createWorkerTaskSlice('calculateDebuffLookup', (input) => {
  const eventsCount = input.buffEvents?.length ?? 0;
  const fightEndTime = input.fightEndTime ?? 0;
  const firstEventId = eventsCount > 0 ? (input.buffEvents[0] as { timestamp?: number }).timestamp ?? 0 : 0;
  return `debuff-lookup-${eventsCount}-${fightEndTime}-${firstEventId}`;
});

// Export actions, thunk, and reducer
export const debuffLookupActions = debuffLookupSlice.actions;
export const executeDebuffLookupTask = debuffLookupSlice.executeTask;
export const debuffLookupReducer = debuffLookupSlice.reducer;
