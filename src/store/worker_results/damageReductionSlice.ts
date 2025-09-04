import memoizeOne from 'memoize-one';
import { v4 as uuidV4 } from 'uuid';

import { createWorkerTaskSlice } from './workerTaskSliceFactory';

const computeDamageReductionHash = memoizeOne((...args) => {
  return `${uuidV4()}-${Date.now().toLocaleString()}`;
});

// Create damage reduction slice
export const damageReductionSlice = createWorkerTaskSlice('calculateDamageReductionData', (input) =>
  computeDamageReductionHash(
    input.fight,
    input.players,
    input.combatantInfoRecord,
    input.friendlyBuffsLookup,
    input.debuffsLookup,
  ),
);

// Export actions, thunk, and reducer
export const damageReductionActions = damageReductionSlice.actions;
export const executeDamageReductionTask = damageReductionSlice.executeTask;
export const damageReductionReducer = damageReductionSlice.reducer;
