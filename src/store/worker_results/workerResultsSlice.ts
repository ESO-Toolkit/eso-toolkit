import { combineReducers } from '@reduxjs/toolkit';

import {
  actorPositionsReducer,
  buffLookupReducer,
  criticalDamageReducer,
  damageOverTimeReducer,
  penetrationDataReducer,
  statusEffectUptimesReducer,
  damageReductionReducer,
  debuffLookupReducer,
  hostileBuffLookupReducer,
  touchOfZenStacksReducer,
  staggerStacksReducer,
  elementalWeaknessStacksReducer,
} from './taskSlices';

// Combine all worker task reducers
const workerResultsReducer = combineReducers({
  calculateActorPositions: actorPositionsReducer,
  calculateBuffLookup: buffLookupReducer,
  calculateCriticalDamageData: criticalDamageReducer,
  calculateDamageOverTimeData: damageOverTimeReducer,
  calculatePenetrationData: penetrationDataReducer,
  calculateStatusEffectUptimes: statusEffectUptimesReducer,
  calculateTouchOfZenStacks: touchOfZenStacksReducer,
  calculateStaggerStacks: staggerStacksReducer,
  calculateElementalWeaknessStacks: elementalWeaknessStacksReducer,
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
  damageOverTimeActions,
  penetrationDataActions,
  statusEffectUptimesActions,
  touchOfZenStacksActions,
  staggerStacksActions,
  elementalWeaknessStacksActions,
  damageReductionActions,
  debuffLookupActions,
  hostileBuffLookupActions,
  // Export thunk actions
  executeActorPositionsTask,
  executeBuffLookupTask,
  executeCriticalDamageTask,
  executeDamageOverTimeTask,
  executePenetrationDataTask,
  executeStatusEffectUptimesTask,
  executeTouchOfZenStacksTask,
  executeStaggerStacksTask,
  executeElementalWeaknessStacksTask,
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
