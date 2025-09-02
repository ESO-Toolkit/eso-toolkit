import memoizeOne from 'memoize-one';
import { v4 as uuidV4 } from 'uuid';

import { createWorkerTaskSlice } from './workerTaskSliceFactory';

const computePenetrationDataHash = memoizeOne((...args) => {
  return `${uuidV4()}-${Date.now().toLocaleString()}`;
});

// Create penetration data slice
export const penetrationDataSlice = createWorkerTaskSlice('calculatePenetrationData', (input) =>
  computePenetrationDataHash(
    input.fight,
    input.players,
    input.combatantInfoEvents,
    input.friendlyBuffsLookup,
    input.debuffsLookup,
    input.selectedTargetIds
  )
);

// Export actions, thunk, and reducer
export const penetrationDataActions = penetrationDataSlice.actions;
export const executePenetrationDataTask = penetrationDataSlice.executeTask;
export const penetrationDataReducer = penetrationDataSlice.reducer;
