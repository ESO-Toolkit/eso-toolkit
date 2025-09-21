import memoizeOne from 'memoize-one';
import { v4 as uuidV4 } from 'uuid';

import { createWorkerTaskSlice } from './workerTaskSliceFactory';

const computeBuffLookupHash = memoizeOne((..._args) => {
  return `${uuidV4()}-${Date.now().toLocaleString()}`;
});

// Create buff lookup slice
export const buffLookupSlice = createWorkerTaskSlice('calculateBuffLookup', (input) =>
  computeBuffLookupHash(input.buffEvents, input.fightEndTime),
);

// Export actions, thunk, and reducer
export const buffLookupActions = buffLookupSlice.actions;
export const executeBuffLookupTask = buffLookupSlice.executeTask;
export const buffLookupReducer = buffLookupSlice.reducer;
