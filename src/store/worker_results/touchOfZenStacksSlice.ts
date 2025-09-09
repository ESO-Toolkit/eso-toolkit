import memoizeOne from 'memoize-one';
import { v4 as uuidV4 } from 'uuid';

import { createWorkerTaskSlice } from './workerTaskSliceFactory';

const computeTouchOfZenStacksHash = memoizeOne((...args) => {
  return `${uuidV4()}-${Date.now().toLocaleString()}`;
});

// Create touch of z'en stacks slice
export const touchOfZenStacksSlice = createWorkerTaskSlice('calculateTouchOfZenStacks', (input) =>
  computeTouchOfZenStacksHash(
    input.debuffsLookup,
    input.damageEvents,
    input.fightStartTime,
    input.fightEndTime,
  ),
);

// Export actions, thunk, and reducer
export const touchOfZenStacksActions = touchOfZenStacksSlice.actions;
export const executeTouchOfZenStacksTask = touchOfZenStacksSlice.executeTask;
export const touchOfZenStacksReducer = touchOfZenStacksSlice.reducer;
