import memoizeOne from 'memoize-one';
import { v4 as uuidV4 } from 'uuid';

import { createWorkerTaskSlice } from './workerTaskSliceFactory';

const computeStaggerStacksHash = memoizeOne((..._args) => {
  return `${uuidV4()}-${Date.now().toLocaleString()}`;
});

// Create stagger stacks slice
export const staggerStacksSlice = createWorkerTaskSlice('calculateStaggerStacks', (input) =>
  computeStaggerStacksHash(input.damageEvents, input.fightStartTime, input.fightEndTime),
);

// Export actions, thunk, and reducer
export const staggerStacksActions = staggerStacksSlice.actions;
export const executeStaggerStacksTask = staggerStacksSlice.executeTask;
export const staggerStacksReducer = staggerStacksSlice.reducer;
