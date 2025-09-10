import memoizeOne from 'memoize-one';
import { v4 as uuidV4 } from 'uuid';

import { createWorkerTaskSlice } from './workerTaskSliceFactory';

const computeElementalWeaknessStacksHash = memoizeOne((...args) => {
  return `${uuidV4()}-${Date.now().toLocaleString()}`;
});

// Create elemental weakness stacks slice
export const elementalWeaknessStacksSlice = createWorkerTaskSlice(
  'calculateElementalWeaknessStacks',
  (input) =>
    computeElementalWeaknessStacksHash(
      input.debuffsLookup,
      input.fightStartTime,
      input.fightEndTime,
    ),
);

// Export actions, thunk, and reducer
export const elementalWeaknessStacksActions = elementalWeaknessStacksSlice.actions;
export const executeElementalWeaknessStacksTask = elementalWeaknessStacksSlice.executeTask;
export const elementalWeaknessStacksReducer = elementalWeaknessStacksSlice.reducer;
