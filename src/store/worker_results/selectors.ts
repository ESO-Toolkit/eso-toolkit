import { createSelector } from '@reduxjs/toolkit';

import { RootState } from '../storeWithHistory';

import { WorkerTaskState } from './workerTaskSliceFactory';

import { SharedComputationWorkerTaskType, SharedWorkerResultType } from '@/workers/SharedWorker';

// Base selector for worker results state
export const selectWorkerResults = (state: RootState): typeof state.workerResults =>
  state.workerResults;

// Generic selector for a specific worker task
export const selectWorkerTask = <T extends SharedComputationWorkerTaskType>(
  taskName: T,
): ReturnType<
  typeof createSelector<[typeof selectWorkerResults], WorkerTaskState<SharedWorkerResultType<T>>>
> =>
  createSelector(
    [selectWorkerResults],
    (workerResults) => workerResults[taskName] as WorkerTaskState<SharedWorkerResultType<T>>,
  );

// Specific selectors for each worker task
export const selectActorPositionsTask = selectWorkerTask('calculateActorPositions');
export const selectBuffLookupTask = selectWorkerTask('calculateBuffLookup');
export const selectCriticalDamageTask = selectWorkerTask('calculateCriticalDamageData');
export const selectPenetrationDataTask = selectWorkerTask('calculatePenetrationData');
export const selectStatusEffectUptimesTask = selectWorkerTask('calculateStatusEffectUptimes');
export const selectDamageReductionTask = selectWorkerTask('calculateDamageReductionData');
export const selectDebuffLookupTask = selectWorkerTask('calculateDebuffLookup');
export const selectHostileBuffLookupTask = selectWorkerTask('calculateHostileBuffLookup');

// Selectors for specific task properties
export const selectWorkerTaskResult = <T extends SharedComputationWorkerTaskType>(
  taskName: T,
): ReturnType<
  typeof createSelector<[ReturnType<typeof selectWorkerTask<T>>], SharedWorkerResultType<T> | null>
> => createSelector([selectWorkerTask(taskName)], (task) => task.result);

export const selectWorkerTaskLoading = <T extends SharedComputationWorkerTaskType>(
  taskName: T,
): ReturnType<typeof createSelector<[ReturnType<typeof selectWorkerTask<T>>], boolean>> =>
  createSelector([selectWorkerTask(taskName)], (task) => task.isLoading);

export const selectWorkerTaskProgress = <T extends SharedComputationWorkerTaskType>(
  taskName: T,
): ReturnType<typeof createSelector<[ReturnType<typeof selectWorkerTask<T>>], number | null>> =>
  createSelector([selectWorkerTask(taskName)], (task) => task.progress);

export const selectWorkerTaskError = <T extends SharedComputationWorkerTaskType>(
  taskName: T,
): ReturnType<typeof createSelector<[ReturnType<typeof selectWorkerTask<T>>], string | null>> =>
  createSelector([selectWorkerTask(taskName)], (task) => task.error);

export const selectWorkerTaskLastUpdated = <T extends SharedComputationWorkerTaskType>(
  taskName: T,
): ReturnType<typeof createSelector<[ReturnType<typeof selectWorkerTask<T>>], number | null>> =>
  createSelector([selectWorkerTask(taskName)], (task) => task.lastUpdated);

// Convenience selectors for specific results
export const selectActorPositionsResult = selectWorkerTaskResult('calculateActorPositions');
export const selectBuffLookupResult = selectWorkerTaskResult('calculateBuffLookup');
export const selectCriticalDamageResult = selectWorkerTaskResult('calculateCriticalDamageData');
export const selectPenetrationDataResult = selectWorkerTaskResult('calculatePenetrationData');
export const selectStatusEffectUptimesResult = selectWorkerTaskResult(
  'calculateStatusEffectUptimes',
);
export const selectTouchOfZenStacksResult = selectWorkerTaskResult('calculateTouchOfZenStacks');
export const selectDamageReductionResult = selectWorkerTaskResult('calculateDamageReductionData');
export const selectDebuffLookupResult = selectWorkerTaskResult('calculateDebuffLookup');
export const selectHostileBuffLookupResult = selectWorkerTaskResult('calculateHostileBuffLookup');

// Aggregate selectors
export const selectAnyWorkerTaskLoading = createSelector([selectWorkerResults], (workerResults) =>
  Object.values(workerResults).some((task) => task.isLoading),
);

export const selectCompletedTasksCount = createSelector(
  [selectWorkerResults],
  (workerResults) => Object.values(workerResults).filter((task) => task.result !== null).length,
);

export const selectFailedTasksCount = createSelector(
  [selectWorkerResults],
  (workerResults) => Object.values(workerResults).filter((task) => task.error !== null).length,
);

export const selectLoadingTasksCount = createSelector(
  [selectWorkerResults],
  (workerResults) => Object.values(workerResults).filter((task) => task.isLoading).length,
);
