import { createWorkerTaskSlice } from './workerTaskSliceFactory';

// Create stagger stacks slice
export const staggerStacksSlice = createWorkerTaskSlice('calculateStaggerStacks', (input) => {
  const damageEventsCount = input.damageEvents?.length ?? 0;
  const fightStart = input.fightStartTime ?? 0;
  const fightEnd = input.fightEndTime ?? 0;
  return `stagger-${damageEventsCount}-${fightStart}-${fightEnd}`;
});

// Export actions, thunk, and reducer
export const staggerStacksActions = staggerStacksSlice.actions;
export const executeStaggerStacksTask = staggerStacksSlice.executeTask;
export const staggerStacksReducer = staggerStacksSlice.reducer;
