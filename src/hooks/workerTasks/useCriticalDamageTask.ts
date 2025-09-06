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
import { usePlayerData } from '../usePlayerData';

import { useBuffLookupTask } from './useBuffLookupTask';
import { useDebuffLookupTask } from './useDebuffLookupTask';
import { useWorkerTaskDependencies } from './useWorkerTaskDependencies';

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
  const { playerData, isPlayerDataLoading } = usePlayerData();
  const { buffLookupData, isBuffLookupLoading } = useBuffLookupTask();
  const { debuffLookupData, isDebuffLookupLoading } = useDebuffLookupTask();

  // For now, we'll use placeholder data until the dependencies are properly integrated
  React.useEffect(() => {
    if (
      selectedFight &&
      !isBuffLookupLoading &&
      buffLookupData !== null &&
      !isCombatantInfoEventsLoading &&
      combatantInfoRecord !== null &&
      !isPlayerDataLoading &&
      playerData?.playersById
    ) {
      // Only require debuff data if it's actually loading or available
      const hasDebuffData = debuffLookupData !== null || !isDebuffLookupLoading;

      if (hasDebuffData) {
        // Clear any existing result to start fresh
        dispatch(criticalDamageActions.clearResult());
        dispatch(
          executeCriticalDamageTask({
            fight: selectedFight,
            players: playerData.playersById,
            combatantInfoEvents: combatantInfoRecord,
            friendlyBuffsLookup: buffLookupData,
            debuffsLookup: debuffLookupData || { buffIntervals: {} },
          }),
        );
      }
    }
  }, [
    dispatch,
    selectedFight,
    playerData?.playersById,
    isPlayerDataLoading,
    combatantInfoRecord,
    buffLookupData,
    debuffLookupData,
    isBuffLookupLoading,
    isDebuffLookupLoading,
    isCombatantInfoEventsLoading,
  ]);

  const criticalDamageData = useSelector(selectCriticalDamageResult);
  const isCriticalDamageTaskLoading = useSelector(
    selectWorkerTaskLoading('calculateCriticalDamageData'),
  ) as boolean;
  const criticalDamageError = useSelector(selectWorkerTaskError('calculateCriticalDamageData')) as
    | string
    | null;
  const criticalDamageProgress = useSelector(
    selectWorkerTaskProgress('calculateCriticalDamageData'),
  ) as number | null;

  // Include all dependency loading states in the overall loading state
  const isCriticalDamageLoading =
    isCriticalDamageTaskLoading ||
    isPlayerDataLoading ||
    isCombatantInfoEventsLoading ||
    isBuffLookupLoading ||
    isDebuffLookupLoading;

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
    ],
  );
}
