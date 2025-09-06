import { combineReducers } from '@reduxjs/toolkit';

import {
  actorPositionsReducer,
  buffLookupReducer,
  criticalDamageReducer,
  penetrationDataReducer,
  statusEffectUptimesReducer,
  damageReductionReducer,
  debuffLookupReducer,
  hostileBuffLookupReducer,
} from './taskSlices';

// Combine all worker task reducers
const workerResultsReducer = combineReducers({
  calculateActorPositions: actorPositionsReducer,
  calculateBuffLookup: buffLookupReducer,
  calculateCriticalDamageData: criticalDamageReducer,
  calculatePenetrationData: penetrationDataReducer,
  calculateStatusEffectUptimes: statusEffectUptimesReducer,
  calculateDamageReductionData: damageReductionReducer,
  calculateDebuffLookup: debuffLookupReducer,
  calculateHostileBuffLookup: hostileBuffLookupReducer,
});

export default workerResultsReducer;

// Export all actions for convenience
export {
  actorPositionsActions,
  buffLookupActions,
  criticalDamageActions,
  penetrationDataActions,
  statusEffectUptimesActions,
  damageReductionActions,
  debuffLookupActions,
  hostileBuffLookupActions,
  // Export thunk actions
  executeActorPositionsTask,
  executeBuffLookupTask,
  executeCriticalDamageTask,
  executePenetrationDataTask,
  executeStatusEffectUptimesTask,
  executeDamageReductionTask,
  executeDebuffLookupTask,
  executeHostileBuffLookupTask,
} from './taskSlices';

// Export the factory function and types for potential reuse
export { createWorkerTaskSlice } from './workerTaskSliceFactory';
export type {
  WorkerTaskState,
  WorkerTaskProgressPayload,
  WorkerTaskCompletedPayload,
  WorkerTaskFailedPayload,
} from './workerTaskSliceFactory';
