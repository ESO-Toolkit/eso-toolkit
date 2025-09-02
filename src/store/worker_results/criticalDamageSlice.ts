import memoizeOne from 'memoize-one';
import { v4 as uuidV4 } from 'uuid';

import { createWorkerTaskSlice } from './workerTaskSliceFactory';

const computeCriticalDamageHash = memoizeOne((...args) => {
  return `${uuidV4()}-${Date.now().toLocaleString()}`;
});

// Create critical damage slice
export const criticalDamageSlice = createWorkerTaskSlice('calculateCriticalDamageData', (input) =>
  computeCriticalDamageHash(
    input.fight,
    input.players,
    input.combatantInfoEvents,
    input.friendlyBuffsLookup,
    input.debuffsLookup
  )
);

// Export actions, thunk, and reducer
export const criticalDamageActions = criticalDamageSlice.actions;
export const executeCriticalDamageTask = criticalDamageSlice.executeTask;
export const criticalDamageReducer = criticalDamageSlice.reducer;
