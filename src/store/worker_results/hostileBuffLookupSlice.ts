import { createWorkerTaskSlice } from './workerTaskSliceFactory';

// Create hostile buff lookup slice
export const hostileBuffLookupSlice = createWorkerTaskSlice('calculateHostileBuffLookup', (input) => {
  const eventsCount = input.buffEvents?.length ?? 0;
  const fightEndTime = input.fightEndTime ?? 0;
  const firstEventId = eventsCount > 0 ? (input.buffEvents[0] as { timestamp?: number }).timestamp ?? 0 : 0;
  return `hostile-buff-lookup-${eventsCount}-${fightEndTime}-${firstEventId}`;
});

// Export actions, thunk, and reducer
export const hostileBuffLookupActions = hostileBuffLookupSlice.actions;
export const executeHostileBuffLookupTask = hostileBuffLookupSlice.executeTask;
export const hostileBuffLookupReducer = hostileBuffLookupSlice.reducer;
