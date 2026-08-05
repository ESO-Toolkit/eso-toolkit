import { ReduxBackedWorkerTaskType, SharedWorkerInputType } from '@/workers/SharedWorker';

import {
  actorPositionsActions,
  buffLookupActions,
  criticalDamageActions,
  damageOverTimeActions,
  penetrationDataActions,
  statusEffectUptimesActions,
  damageReductionActions,
  debuffLookupActions,
  hostileBuffLookupActions,
  // Import thunk actions
  executeActorPositionsTask,
  executeBuffLookupTask,
  executeCriticalDamageTask,
  executeDamageOverTimeTask,
  executePenetrationDataTask,
  executeStatusEffectUptimesTask,
  executeDamageReductionTask,
  executeDebuffLookupTask,
  executeHostileBuffLookupTask,
  touchOfZenStacksActions,
  executeTouchOfZenStacksTask,
  staggerStacksActions,
  executeStaggerStacksTask,
  elementalWeaknessStacksActions,
  executeElementalWeaknessStacksTask,
  playerTravelDistancesActions,
  executePlayerTravelDistancesTask,
  playerPanelAnalysisActions,
  executePlayerPanelAnalysisTask,
  scribingDetectionsActions,
  executeScribingDetectionsTask,
} from './workerResultsSlice';

// Map task names to their corresponding actions - requires all task types as keys
const taskActionsMap = {
  calculateActorPositions: actorPositionsActions,
  calculateBuffLookup: buffLookupActions,
  calculateCriticalDamageData: criticalDamageActions,
  calculateDamageOverTimeData: damageOverTimeActions,
  calculatePenetrationData: penetrationDataActions,
  calculateStatusEffectUptimes: statusEffectUptimesActions,
  calculateDamageReductionData: damageReductionActions,
  calculateDebuffLookup: debuffLookupActions,
  calculateHostileBuffLookup: hostileBuffLookupActions,
  calculateTouchOfZenStacks: touchOfZenStacksActions,
  calculateStaggerStacks: staggerStacksActions,
  calculateElementalWeaknessStacks: elementalWeaknessStacksActions,
  calculatePlayerTravelDistances: playerTravelDistancesActions,
  calculatePlayerPanelAnalysis: playerPanelAnalysisActions,
  calculateScribingDetections: scribingDetectionsActions,
} as const;

// Map task names to their corresponding thunk actions
const taskThunkMap: Record<
  ReduxBackedWorkerTaskType,
  (input: SharedWorkerInputType<ReduxBackedWorkerTaskType>) => unknown
> = {
  calculateActorPositions: executeActorPositionsTask,
  calculateBuffLookup: executeBuffLookupTask,
  calculateCriticalDamageData: executeCriticalDamageTask,
  calculateDamageOverTimeData: executeDamageOverTimeTask,
  calculatePenetrationData: executePenetrationDataTask,
  calculateStatusEffectUptimes: executeStatusEffectUptimesTask,
  calculateDamageReductionData: executeDamageReductionTask,
  calculateDebuffLookup: executeDebuffLookupTask,
  calculateHostileBuffLookup: executeHostileBuffLookupTask,
  calculateTouchOfZenStacks: executeTouchOfZenStacksTask,
  calculateStaggerStacks: executeStaggerStacksTask,
  calculateElementalWeaknessStacks: executeElementalWeaknessStacksTask,
  calculatePlayerTravelDistances: executePlayerTravelDistancesTask,
  calculatePlayerPanelAnalysis: executePlayerPanelAnalysisTask,
  calculateScribingDetections: executeScribingDetectionsTask,
} as const;

// Utility functions to get actions for a specific task
export const getTaskActions = <T extends ReduxBackedWorkerTaskType>(
  taskName: T,
): (typeof taskActionsMap)[T] => {
  return taskActionsMap[taskName];
};

// Utility function to get thunk action for a specific task
export const getTaskThunk = <T extends ReduxBackedWorkerTaskType>(
  taskName: T,
): (typeof taskThunkMap)[T] => {
  return taskThunkMap[taskName];
};

// Helper function to execute a task using the thunk
export const executeWorkerTask = <T extends ReduxBackedWorkerTaskType>(
  taskName: T,
  input: SharedWorkerInputType<T>,
): unknown => {
  const thunk = getTaskThunk(taskName);
  return thunk(input as never);
};

// Helper functions for common operations (using regular actions, not thunks)
export const createStartTaskAction = <T extends ReduxBackedWorkerTaskType>(
  taskName: T,
): { payload: void; type: string } => {
  return getTaskActions(taskName).startTask();
};

export const createProgressUpdateAction = <T extends ReduxBackedWorkerTaskType>(
  taskName: T,
  progress: number,
): { payload: { progress: number }; type: string } => {
  return getTaskActions(taskName).updateProgress({ progress });
};

export const createCompleteTaskAction = <T extends ReduxBackedWorkerTaskType>(
  taskName: T,
  result: unknown,
): { payload: { result: unknown }; type: string } => {
  return getTaskActions(taskName).completeTask({ result: result as never });
};

export const createFailTaskAction = <T extends ReduxBackedWorkerTaskType>(
  taskName: T,
  error: string,
): { payload: { error: string }; type: string } => {
  return getTaskActions(taskName).failTask({ error });
};

export const createClearTaskAction = <T extends ReduxBackedWorkerTaskType>(
  taskName: T,
): { payload: void; type: string } => {
  return getTaskActions(taskName).clearResult();
};

export const createResetTaskAction = <T extends ReduxBackedWorkerTaskType>(
  taskName: T,
): { payload: void; type: string } => {
  return getTaskActions(taskName).resetTask();
};
