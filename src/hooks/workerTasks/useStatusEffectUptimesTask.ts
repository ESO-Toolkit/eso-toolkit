import React from 'react';
import { useSelector } from 'react-redux';

import { FightFragment } from '../../graphql/generated';
import {
  executeStatusEffectUptimesTask,
  statusEffectUptimesActions,
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

  // Clear any existing result when dependencies change to force fresh calculation
  React.useEffect(() => {
    dispatch(statusEffectUptimesActions.clearResult());
  }, [dispatch, selectedFight, hostileBuffLookupData, debuffLookupData]);

  React.useEffect(() => {
    // Only trigger when we have data and both lookups are complete
    if (
      selectedFight &&
      hostileBuffLookupData &&
      debuffLookupData &&
      !isHostileBuffLookupLoading &&
      !isDebuffLookupLoading
    ) {
      dispatch(
        executeStatusEffectUptimesTask({
          hostileBuffsLookup: hostileBuffLookupData,
          debuffsLookup: debuffLookupData,
          fightStartTime: selectedFight.startTime,
          fightEndTime: selectedFight?.endTime,
        })
      );
    }
  }, [
    dispatch,
    selectedFight,
    hostileBuffLookupData,
    debuffLookupData,
    isHostileBuffLookupLoading,
    isDebuffLookupLoading,
  ]);

  const statusEffectUptimesData = useSelector(selectStatusEffectUptimesResult);
  const isStatusEffectUptimesLoading = useSelector(
    selectWorkerTaskLoading('calculateStatusEffectUptimes')
  ) as boolean;
  const statusEffectUptimesError = useSelector(
    selectWorkerTaskError('calculateStatusEffectUptimes')
  ) as string | null;
  const statusEffectUptimesProgress = useSelector(
    selectWorkerTaskProgress('calculateStatusEffectUptimes')
  ) as number | null;

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
    ]
  );
}
