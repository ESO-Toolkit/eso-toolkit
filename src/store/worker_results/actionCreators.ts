import {
  buffLookupActions,
  criticalDamageActions,
  penetrationDataActions,
  statusEffectUptimesActions,
  damageReductionActions,
  debuffLookupActions,
  hostileBuffLookupActions,
  // Import thunk actions
  executeBuffLookupTask,
  executeCriticalDamageTask,
  executePenetrationDataTask,
  executeStatusEffectUptimesTask,
  executeDamageReductionTask,
  executeDebuffLookupTask,
  executeHostileBuffLookupTask,
} from './workerResultsSlice';

import { SharedComputationWorkerTaskType, SharedWorkerInputType } from '@/workers/SharedWorker';

// Map task names to their corresponding actions
const taskActionsMap = {
  calculateBuffLookup: buffLookupActions,
  calculateCriticalDamageData: criticalDamageActions,
  calculatePenetrationData: penetrationDataActions,
  calculateStatusEffectUptimes: statusEffectUptimesActions,
  calculateDamageReductionData: damageReductionActions,
  calculateDebuffLookup: debuffLookupActions,
  calculateHostileBuffLookup: hostileBuffLookupActions,
} as const;

// Map task names to their corresponding thunk actions
const taskThunkMap = {
  calculateBuffLookup: executeBuffLookupTask,
  calculateCriticalDamageData: executeCriticalDamageTask,
  calculatePenetrationData: executePenetrationDataTask,
  calculateStatusEffectUptimes: executeStatusEffectUptimesTask,
  calculateDamageReductionData: executeDamageReductionTask,
  calculateDebuffLookup: executeDebuffLookupTask,
  calculateHostileBuffLookup: executeHostileBuffLookupTask,
} as const;

// Utility functions to get actions for a specific task
export const getTaskActions = <T extends SharedComputationWorkerTaskType>(
  taskName: T
): (typeof taskActionsMap)[T] => {
  return taskActionsMap[taskName];
};

// Utility function to get thunk action for a specific task
export const getTaskThunk = <T extends SharedComputationWorkerTaskType>(
  taskName: T
): (typeof taskThunkMap)[T] => {
  return taskThunkMap[taskName];
};

// Helper function to execute a task using the thunk
export const executeWorkerTask = <T extends SharedComputationWorkerTaskType>(
  taskName: T,
  input: SharedWorkerInputType<T>
): unknown => {
  const thunk = getTaskThunk(taskName);
  return thunk(input as never);
};

// Helper functions for common operations (using regular actions, not thunks)
export const createStartTaskAction = <T extends SharedComputationWorkerTaskType>(
  taskName: T
): { payload: void; type: string } => {
  return getTaskActions(taskName).startTask();
};

export const createProgressUpdateAction = <T extends SharedComputationWorkerTaskType>(
  taskName: T,
  progress: number
): { payload: { progress: number }; type: string } => {
  return getTaskActions(taskName).updateProgress({ progress });
};

export const createCompleteTaskAction = <T extends SharedComputationWorkerTaskType>(
  taskName: T,
  result: unknown
): { payload: { result: unknown }; type: string } => {
  return getTaskActions(taskName).completeTask({ result: result as never });
};

export const createFailTaskAction = <T extends SharedComputationWorkerTaskType>(
  taskName: T,
  error: string
): { payload: { error: string }; type: string } => {
  return getTaskActions(taskName).failTask({ error });
};

export const createClearTaskAction = <T extends SharedComputationWorkerTaskType>(
  taskName: T
): { payload: void; type: string } => {
  return getTaskActions(taskName).clearResult();
};

export const createResetTaskAction = <T extends SharedComputationWorkerTaskType>(
  taskName: T
): { payload: void; type: string } => {
  return getTaskActions(taskName).resetTask();
};
