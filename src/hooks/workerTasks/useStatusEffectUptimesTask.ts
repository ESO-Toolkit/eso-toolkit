import React from 'react';
import { useSelector } from 'react-redux';

import { FightFragment } from '../../graphql/gql/graphql';
import {
  executeStatusEffectUptimesTask,
} from '../../store/worker_results';
import {
  selectStatusEffectUptimesResult,
  selectWorkerTaskLoading,
  selectWorkerTaskError,
  selectWorkerTaskProgress,
} from '../../store/worker_results/selectors';
import { SharedWorkerResultType } from '../../workers/SharedWorker';

import { useDebuffLookupTask } from './useDebuffLookupTask';
import { useHostileBuffLookupTask } from './useHostileBuffLookupTask';
import { useWorkerTaskDependencies } from './useWorkerTaskDependencies';

// Hook for status effect uptimes calculation
export function useStatusEffectUptimesTask(): {
  statusEffectUptimesData: SharedWorkerResultType<'calculateStatusEffectUptimes'> | null;
  isStatusEffectUptimesLoading: boolean;
  statusEffectUptimesError: string | null;
  statusEffectUptimesProgress: number | null;
  selectedFight: FightFragment | null;
} {
  const { dispatch, selectedFight } = useWorkerTaskDependencies();
  const { hostileBuffLookupData, isHostileBuffLookupLoading } = useHostileBuffLookupTask();
  const { debuffLookupData, isDebuffLookupLoading } = useDebuffLookupTask();

  // Execute task only when ALL dependencies are completely ready
  React.useEffect(() => {
    // Check that all dependencies are completely loaded with data available
    const allDependenciesReady =
      selectedFight &&
      !isHostileBuffLookupLoading &&
      hostileBuffLookupData !== null &&
      !isDebuffLookupLoading &&
      debuffLookupData !== null;

    if (allDependenciesReady) {
      const promise = dispatch(
        executeStatusEffectUptimesTask({
          hostileBuffsLookup: hostileBuffLookupData,
          debuffsLookup: debuffLookupData,
          fightStartTime: selectedFight.startTime,
          fightEndTime: selectedFight?.endTime,
          friendlyPlayerIds:
            selectedFight.friendlyPlayers?.filter((id): id is number => id !== null) || [],
        }),
      );
      return () => {
        promise.abort();
      };
    }
  }, [
    dispatch,
    selectedFight,
    isHostileBuffLookupLoading,
    hostileBuffLookupData,
    isDebuffLookupLoading,
    debuffLookupData,
  ]);

  const statusEffectUptimesData = useSelector(selectStatusEffectUptimesResult);
  const isStatusEffectUptimesTaskLoading = useSelector(
    selectWorkerTaskLoading('calculateStatusEffectUptimes'),
  ) as boolean;
  const statusEffectUptimesError = useSelector(
    selectWorkerTaskError('calculateStatusEffectUptimes'),
  ) as string | null;
  const statusEffectUptimesProgress = useSelector(
    selectWorkerTaskProgress('calculateStatusEffectUptimes'),
  ) as number | null;

  // Include all dependency loading states in the overall loading state
  const isStatusEffectUptimesLoading =
    isStatusEffectUptimesTaskLoading || isHostileBuffLookupLoading || isDebuffLookupLoading;

  return React.useMemo(
    () => ({
      statusEffectUptimesData,
      isStatusEffectUptimesLoading,
      statusEffectUptimesError,
      statusEffectUptimesProgress,
      selectedFight,
    }),
    [
      statusEffectUptimesData,
      isStatusEffectUptimesLoading,
      statusEffectUptimesError,
      statusEffectUptimesProgress,
      selectedFight,
    ],
  );
}
