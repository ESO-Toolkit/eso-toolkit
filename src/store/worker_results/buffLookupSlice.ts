import { createWorkerTaskSlice } from './workerTaskSliceFactory';

// Create buff lookup slice
export const buffLookupSlice = createWorkerTaskSlice('calculateBuffLookup', (input) => {
  const eventsCount = input.buffEvents?.length ?? 0;
  const fightEndTime = input.fightEndTime ?? 0;
  const firstEventId =
    eventsCount > 0 ? ((input.buffEvents[0] as { timestamp?: number }).timestamp ?? 0) : 0;
  return `buff-lookup-${eventsCount}-${fightEndTime}-${firstEventId}`;
});

// Export actions, thunk, and reducer
export const buffLookupActions = buffLookupSlice.actions;
export const executeBuffLookupTask = buffLookupSlice.executeTask;
export const buffLookupReducer = buffLookupSlice.reducer;
