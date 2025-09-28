import memoizeOne from 'memoize-one';
import { v4 as uuidV4 } from 'uuid';

import { createWorkerTaskSlice } from './workerTaskSliceFactory';

const computeDamageOverTimeHash = memoizeOne((..._args) => {
  return `${uuidV4()}-${Date.now().toLocaleString()}`;
});

// Create damage over time slice
export const damageOverTimeSlice = createWorkerTaskSlice('calculateDamageOverTimeData', (input) =>
  computeDamageOverTimeHash(input.fight, input.players, input.damageEvents, input.bucketSizeMs),
);

// Export actions, thunk, and reducer
export const damageOverTimeActions = damageOverTimeSlice.actions;
export const executeDamageOverTimeTask = damageOverTimeSlice.executeTask;
export const damageOverTimeReducer = damageOverTimeSlice.reducer;
