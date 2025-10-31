import React from 'react';
import { useSelector } from 'react-redux';

import { executeCriticalDamageTask, criticalDamageActions } from '@/store/worker_results';
import { SharedWorkerResultType } from '@/workers/SharedWorker';

import type { ReportFightContextInput } from '../../store/contextTypes';
import {
  selectCriticalDamageResult,
  selectWorkerTaskLoading,
  selectWorkerTaskError,
  selectWorkerTaskProgress,
} from '../../store/worker_results/selectors';
import { useCombatantInfoRecord } from '../events/useCombatantInfoRecord';
import { useDamageEvents } from '../events/useDamageEvents';
import { usePlayerData } from '../usePlayerData';
import { useSelectedTargetIds } from '../useSelectedTargetIds';

import { useBuffLookupTask } from './useBuffLookupTask';
import { useDebuffLookupTask } from './useDebuffLookupTask';
import { useWorkerTaskDependencies } from './useWorkerTaskDependencies';

// Hook for critical damage calculation
interface UseCriticalDamageTaskOptions {
  context?: ReportFightContextInput;
}

export function useCriticalDamageTask(_options?: UseCriticalDamageTaskOptions): {
  criticalDamageData: SharedWorkerResultType<'calculateCriticalDamageData'> | null;
  isCriticalDamageLoading: boolean;
  criticalDamageError: string | null;
  criticalDamageProgress: number | null;
  selectedFight: ReturnType<typeof useWorkerTaskDependencies>['selectedFight'];
} {
  const { dispatch, selectedFight } = useWorkerTaskDependencies(options);
  const { combatantInfoRecord, isCombatantInfoEventsLoading } = useCombatantInfoRecord({
    context: options?.context,
  });
  const { playerData, isPlayerDataLoading } = usePlayerData({ context: options?.context });
  const { buffLookupData, isBuffLookupLoading } = useBuffLookupTask(options);
  const { debuffLookupData, isDebuffLookupLoading } = useDebuffLookupTask(options);

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
            damageEvents: damageEvents,
            selectedTargetIds: Array.from(selectedTargetIds),
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
    damageEvents,
    isDamageEventsLoading,
    selectedTargetIds,
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
