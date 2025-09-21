import memoizeOne from 'memoize-one';
import { v4 as uuidV4 } from 'uuid';

import { createWorkerTaskSlice } from './workerTaskSliceFactory';

const computeHostileBuffLookupHash = memoizeOne((..._args) => {
  return `${uuidV4()}-${Date.now().toLocaleString()}`;
});

// Create hostile buff lookup slice
export const hostileBuffLookupSlice = createWorkerTaskSlice('calculateHostileBuffLookup', (input) =>
  computeHostileBuffLookupHash(input.buffEvents, input.fightEndTime),
);

// Export actions, thunk, and reducer
export const hostileBuffLookupActions = hostileBuffLookupSlice.actions;
export const executeHostileBuffLookupTask = hostileBuffLookupSlice.executeTask;
export const hostileBuffLookupReducer = hostileBuffLookupSlice.reducer;
