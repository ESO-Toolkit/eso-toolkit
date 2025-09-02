import memoizeOne from 'memoize-one';
import { v4 as uuidV4 } from 'uuid';

import { createWorkerTaskSlice } from './workerTaskSliceFactory';

const computeDebuffLookupHash = memoizeOne((...args) => {
  return `${uuidV4()}-${Date.now().toLocaleString()}`;
});

// Create debuff lookup slice
export const debuffLookupSlice = createWorkerTaskSlice('calculateDebuffLookup', (input) =>
  computeDebuffLookupHash(input.buffEvents, input.fightEndTime)
);

// Export actions, thunk, and reducer
export const debuffLookupActions = debuffLookupSlice.actions;
export const executeDebuffLookupTask = debuffLookupSlice.executeTask;
export const debuffLookupReducer = debuffLookupSlice.reducer;
