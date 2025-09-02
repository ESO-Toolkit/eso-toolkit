import React from 'react';
import { useSelector } from 'react-redux';

import { FightFragment } from '../../graphql/generated';
import {
  selectCriticalDamageResult,
  selectWorkerTaskLoading,
  selectWorkerTaskError,
  selectWorkerTaskProgress,
} from '../../store/worker_results/selectors';
import { useCombatantInfoRecord } from '../events';

import { useBuffLookupTask } from './useBuffLookupTask';
import { useDebuffLookupTask } from './useDebuffLookupTask';
import { useWorkerTaskDependencies } from './useWorkerTaskDependencies';

import { selectPlayersById } from '@/store/player_data';
import { executeCriticalDamageTask, criticalDamageActions } from '@/store/worker_results';
import { SharedWorkerResultType } from '@/workers/SharedWorker';

// Hook for critical damage calculation
export function useCriticalDamageTask(): {
  criticalDamageData: SharedWorkerResultType<'calculateCriticalDamageData'> | null;
  isCriticalDamageLoading: boolean;
  criticalDamageError: string | null;
  criticalDamageProgress: number | null;
  selectedFight: FightFragment | null;
} {
  const { dispatch, selectedFight } = useWorkerTaskDependencies();
  const { combatantInfoRecord, isCombatantInfoEventsLoading } = useCombatantInfoRecord();
  const players = useSelector(selectPlayersById);
  const { buffLookupData, isBuffLookupLoading } = useBuffLookupTask();
  const { debuffLookupData, isDebuffLookupLoading } = useDebuffLookupTask();

  // Clear any existing result when dependencies change to force fresh calculation
  React.useEffect(() => {
    dispatch(criticalDamageActions.clearResult());
  }, [dispatch, selectedFight, players, combatantInfoRecord, buffLookupData, debuffLookupData]);

  // For now, we'll use placeholder data until the dependencies are properly integrated
  React.useEffect(() => {
    if (
      selectedFight &&
      !isBuffLookupLoading &&
      buffLookupData !== null &&
      !isCombatantInfoEventsLoading &&
      combatantInfoRecord !== null
    ) {
      // Only require debuff data if it's actually loading or available
      const hasDebuffData = debuffLookupData !== null || !isDebuffLookupLoading;

      if (hasDebuffData) {
        dispatch(
          executeCriticalDamageTask({
            fight: selectedFight,
            players: players,
            combatantInfoEvents: combatantInfoRecord,
            friendlyBuffsLookup: buffLookupData,
            debuffsLookup: debuffLookupData || { buffIntervals: {} },
          })
        );
      }
    }
  }, [
    dispatch,
    selectedFight,
    players,
    combatantInfoRecord,
    buffLookupData,
    debuffLookupData,
    isBuffLookupLoading,
    isDebuffLookupLoading,
    isCombatantInfoEventsLoading,
  ]);

  const criticalDamageData = useSelector(selectCriticalDamageResult);
  const isCriticalDamageLoading = useSelector(
    selectWorkerTaskLoading('calculateCriticalDamageData')
  ) as boolean;
  const criticalDamageError = useSelector(selectWorkerTaskError('calculateCriticalDamageData')) as
    | string
    | null;
  const criticalDamageProgress = useSelector(
    selectWorkerTaskProgress('calculateCriticalDamageData')
  ) as number | null;

  return React.useMemo(
    () => ({
      criticalDamageData,
      isCriticalDamageLoading,
      criticalDamageError,
      criticalDamageProgress,
      selectedFight,
    }),
    [
      criticalDamageData,
      isCriticalDamageLoading,
      criticalDamageError,
      criticalDamageProgress,
      selectedFight,
    ]
  );
}
