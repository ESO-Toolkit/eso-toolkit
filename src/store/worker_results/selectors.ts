import { createSelector } from '@reduxjs/toolkit';

import { SharedComputationWorkerTaskType, SharedWorkerResultType } from '@/workers/SharedWorker';

import { RootState } from '../storeWithHistory';

import { WorkerTaskState } from './workerTaskSliceFactory';

// Base selector for worker results state
export const selectWorkerResults = (state: RootState): typeof state.workerResults =>
  state.workerResults;

/**
 * Per-taskName memoization caches for the selector factories below.
 *
 * Each factory builds a fresh `createSelector` (with its own empty memo cache)
 * every time it's called. The worker-task hooks call these factories inline
 * inside `useSelector`, so without caching a brand-new selector instance is
 * created on every render and the memoization is permanently defeated. Keying
 * the created selector by `taskName` guarantees a single stable instance per
 * task name across renders, restoring memoization without changing behavior.
 */
const selectWorkerTaskCache = new Map<string, ReturnType<typeof createSelector>>();
const selectWorkerTaskResultCache = new Map<string, ReturnType<typeof createSelector>>();
const selectWorkerTaskLoadingCache = new Map<string, ReturnType<typeof createSelector>>();
const selectWorkerTaskProgressCache = new Map<string, ReturnType<typeof createSelector>>();
const selectWorkerTaskErrorCache = new Map<string, ReturnType<typeof createSelector>>();
const selectWorkerTaskLastUpdatedCache = new Map<string, ReturnType<typeof createSelector>>();

// Generic selector for a specific worker task
export const selectWorkerTask = <T extends SharedComputationWorkerTaskType>(
  taskName: T,
): ReturnType<
  typeof createSelector<[typeof selectWorkerResults], WorkerTaskState<SharedWorkerResultType<T>>>
> => {
  const cached = selectWorkerTaskCache.get(taskName);
  if (cached) {
    return cached as ReturnType<
      typeof createSelector<
        [typeof selectWorkerResults],
        WorkerTaskState<SharedWorkerResultType<T>>
      >
    >;
  }
  const selector = createSelector(
    [selectWorkerResults],
    (workerResults) => workerResults[taskName] as WorkerTaskState<SharedWorkerResultType<T>>,
  );
  selectWorkerTaskCache.set(taskName, selector as ReturnType<typeof createSelector>);
  return selector;
};

// Specific selectors for each worker task
export const selectActorPositionsTask = selectWorkerTask('calculateActorPositions');
export const selectBuffLookupTask = selectWorkerTask('calculateBuffLookup');
export const selectCriticalDamageTask = selectWorkerTask('calculateCriticalDamageData');
export const selectDamageOverTimeTask = selectWorkerTask('calculateDamageOverTimeData');
export const selectPenetrationDataTask = selectWorkerTask('calculatePenetrationData');
export const selectStatusEffectUptimesTask = selectWorkerTask('calculateStatusEffectUptimes');
export const selectDamageReductionTask = selectWorkerTask('calculateDamageReductionData');
export const selectDebuffLookupTask = selectWorkerTask('calculateDebuffLookup');
export const selectHostileBuffLookupTask = selectWorkerTask('calculateHostileBuffLookup');
export const selectTouchOfZenStacksTask = selectWorkerTask('calculateTouchOfZenStacks');
export const selectStaggerStacksTask = selectWorkerTask('calculateStaggerStacks');
export const selectPlayerTravelDistancesTask = selectWorkerTask('calculatePlayerTravelDistances');
export const selectScribingDetectionsTask = selectWorkerTask('calculateScribingDetections');

// Selectors for specific task properties
export const selectWorkerTaskResult = <T extends SharedComputationWorkerTaskType>(
  taskName: T,
): ReturnType<
  typeof createSelector<[ReturnType<typeof selectWorkerTask<T>>], SharedWorkerResultType<T> | null>
> => {
  const cached = selectWorkerTaskResultCache.get(taskName);
  if (cached) {
    return cached as ReturnType<
      typeof createSelector<
        [ReturnType<typeof selectWorkerTask<T>>],
        SharedWorkerResultType<T> | null
      >
    >;
  }
  const selector = createSelector([selectWorkerTask(taskName)], (task) => task.result);
  selectWorkerTaskResultCache.set(taskName, selector as ReturnType<typeof createSelector>);
  return selector;
};

export const selectWorkerTaskLoading = <T extends SharedComputationWorkerTaskType>(
  taskName: T,
): ReturnType<typeof createSelector<[ReturnType<typeof selectWorkerTask<T>>], boolean>> => {
  const cached = selectWorkerTaskLoadingCache.get(taskName);
  if (cached) {
    return cached as ReturnType<
      typeof createSelector<[ReturnType<typeof selectWorkerTask<T>>], boolean>
    >;
  }
  const selector = createSelector([selectWorkerTask(taskName)], (task) => task.isLoading);
  selectWorkerTaskLoadingCache.set(taskName, selector as ReturnType<typeof createSelector>);
  return selector;
};

export const selectWorkerTaskProgress = <T extends SharedComputationWorkerTaskType>(
  taskName: T,
): ReturnType<typeof createSelector<[ReturnType<typeof selectWorkerTask<T>>], number | null>> => {
  const cached = selectWorkerTaskProgressCache.get(taskName);
  if (cached) {
    return cached as ReturnType<
      typeof createSelector<[ReturnType<typeof selectWorkerTask<T>>], number | null>
    >;
  }
  const selector = createSelector([selectWorkerTask(taskName)], (task) => task.progress);
  selectWorkerTaskProgressCache.set(taskName, selector as ReturnType<typeof createSelector>);
  return selector;
};

export const selectWorkerTaskError = <T extends SharedComputationWorkerTaskType>(
  taskName: T,
): ReturnType<typeof createSelector<[ReturnType<typeof selectWorkerTask<T>>], string | null>> => {
  const cached = selectWorkerTaskErrorCache.get(taskName);
  if (cached) {
    return cached as ReturnType<
      typeof createSelector<[ReturnType<typeof selectWorkerTask<T>>], string | null>
    >;
  }
  const selector = createSelector([selectWorkerTask(taskName)], (task) => task.error);
  selectWorkerTaskErrorCache.set(taskName, selector as ReturnType<typeof createSelector>);
  return selector;
};

export const selectWorkerTaskLastUpdated = <T extends SharedComputationWorkerTaskType>(
  taskName: T,
): ReturnType<typeof createSelector<[ReturnType<typeof selectWorkerTask<T>>], number | null>> => {
  const cached = selectWorkerTaskLastUpdatedCache.get(taskName);
  if (cached) {
    return cached as ReturnType<
      typeof createSelector<[ReturnType<typeof selectWorkerTask<T>>], number | null>
    >;
  }
  const selector = createSelector([selectWorkerTask(taskName)], (task) => task.lastUpdated);
  selectWorkerTaskLastUpdatedCache.set(taskName, selector as ReturnType<typeof createSelector>);
  return selector;
};

// Convenience selectors for specific results
export const selectActorPositionsResult = selectWorkerTaskResult('calculateActorPositions');
export const selectBuffLookupResult = selectWorkerTaskResult('calculateBuffLookup');
export const selectCriticalDamageResult = selectWorkerTaskResult('calculateCriticalDamageData');
export const selectDamageOverTimeResult = selectWorkerTaskResult('calculateDamageOverTimeData');
export const selectPenetrationDataResult = selectWorkerTaskResult('calculatePenetrationData');
export const selectStatusEffectUptimesResult = selectWorkerTaskResult(
  'calculateStatusEffectUptimes',
);
export const selectTouchOfZenStacksResult = selectWorkerTaskResult('calculateTouchOfZenStacks');
export const selectStaggerStacksResult = selectWorkerTaskResult('calculateStaggerStacks');
export const selectElementalWeaknessStacksResult = selectWorkerTaskResult(
  'calculateElementalWeaknessStacks',
);
export const selectPlayerTravelDistancesResult = selectWorkerTaskResult(
  'calculatePlayerTravelDistances',
);
export const selectDamageReductionResult = selectWorkerTaskResult('calculateDamageReductionData');
export const selectDebuffLookupResult = selectWorkerTaskResult('calculateDebuffLookup');
export const selectHostileBuffLookupResult = selectWorkerTaskResult('calculateHostileBuffLookup');
export const selectScribingDetectionsResult = selectWorkerTaskResult('calculateScribingDetections');

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
