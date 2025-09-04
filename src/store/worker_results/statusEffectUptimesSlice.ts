import memoizeOne from 'memoize-one';
import { v4 as uuidV4 } from 'uuid';

import { createWorkerTaskSlice } from './workerTaskSliceFactory';

const computeStatusEffectUptimesHash = memoizeOne((...args) => {
  return `${uuidV4()}-${Date.now().toLocaleString()}`;
});

// Create status effect uptimes slice
export const statusEffectUptimesSlice = createWorkerTaskSlice(
  'calculateStatusEffectUptimes',
  (input) =>
    computeStatusEffectUptimesHash(
      input.debuffsLookup,
      input.hostileBuffsLookup,
      input.fightStartTime,
      input.fightEndTime,
    ),
);

// Export actions, thunk, and reducer
export const statusEffectUptimesActions = statusEffectUptimesSlice.actions;
export const executeStatusEffectUptimesTask = statusEffectUptimesSlice.executeTask;
export const statusEffectUptimesReducer = statusEffectUptimesSlice.reducer;
