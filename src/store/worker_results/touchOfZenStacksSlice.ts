import { createWorkerTaskSlice } from './workerTaskSliceFactory';

// Create touch of z'en stacks slice
export const touchOfZenStacksSlice = createWorkerTaskSlice('calculateTouchOfZenStacks', (input) => {
  const debuffIntervalsCount = input.debuffsLookup?.buffIntervals ? Object.keys(input.debuffsLookup.buffIntervals).length : 0;
  const damageEventsCount = input.damageEvents?.length ?? 0;
  const fightStart = input.fightStartTime ?? 0;
  const fightEnd = input.fightEndTime ?? 0;
  return `touch-of-zen-${debuffIntervalsCount}-${damageEventsCount}-${fightStart}-${fightEnd}`;
});

// Export actions, thunk, and reducer
export const touchOfZenStacksActions = touchOfZenStacksSlice.actions;
export const executeTouchOfZenStacksTask = touchOfZenStacksSlice.executeTask;
export const touchOfZenStacksReducer = touchOfZenStacksSlice.reducer;
