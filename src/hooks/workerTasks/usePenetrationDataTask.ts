import React from 'react';
import { useSelector } from 'react-redux';

import { useAppDispatch } from '@/store/useAppDispatch';
import { executePenetrationDataTask, penetrationDataActions } from '@/store/worker_results';

import type { ReportFightContextInput } from '../../store/contextTypes';
import {
  selectPenetrationDataResult,
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

// Hook for penetration data calculation
interface UsePenetrationDataTaskOptions {
  context?: ReportFightContextInput;
}

export function usePenetrationDataTask(options?: UsePenetrationDataTaskOptions): {
  penetrationData: unknown;
  isPenetrationDataLoading: boolean;
  penetrationDataError: string | null;
  penetrationDataProgress: number | null;
  selectedFight: ReturnType<typeof useWorkerTaskDependencies>['selectedFight'];
} {
  const dispatch = useAppDispatch();
  const { selectedFight, fightId } = useWorkerTaskDependencies(options);
  const { playerData, isPlayerDataLoading } = usePlayerData({ context: options?.context });
  const { combatantInfoRecord, isCombatantInfoEventsLoading } = useCombatantInfoRecord({
    context: options?.context,
  });
  const { buffLookupData, isBuffLookupLoading } = useBuffLookupTask(options);
  const { debuffLookupData, isDebuffLookupLoading } = useDebuffLookupTask(options);
  const { damageEvents, isDamageEventsLoading } = useDamageEvents({ context: options?.context });
  const selectedTargetIds = useSelectedTargetIds();

  // Clear any existing result when dependencies change to force fresh calculation
  React.useEffect(() => {
    dispatch(penetrationDataActions.clearResult());
  }, [
    dispatch,
    selectedFight,
    fightId,
    playerData,
    combatantInfoRecord,
    buffLookupData,
    debuffLookupData,
    damageEvents,
    selectedTargetIds,
  ]);

  // Execute task only when ALL dependencies are completely ready
  React.useEffect(() => {
    // Check that all dependencies are completely loaded with data available
    const allDependenciesReady =
      selectedFight &&
      !isPlayerDataLoading &&
      playerData?.playersById &&
      !isCombatantInfoEventsLoading &&
      combatantInfoRecord !== null &&
      !isBuffLookupLoading &&
      buffLookupData !== null &&
      !isDebuffLookupLoading &&
      debuffLookupData !== null &&
      !isDamageEventsLoading &&
      damageEvents.length > 0;

    if (allDependenciesReady) {
      dispatch(
        executePenetrationDataTask({
          fight: selectedFight,
          players: playerData.playersById,
          combatantInfoEvents: combatantInfoRecord,
          friendlyBuffsLookup: buffLookupData,
          debuffsLookup: debuffLookupData,
          damageEvents: damageEvents,
          selectedTargetIds: Array.from(selectedTargetIds),
        }),
      );
    }
  }, [
    dispatch,
    selectedFight,
    playerData,
    combatantInfoRecord,
    isCombatantInfoEventsLoading,
    buffLookupData,
    debuffLookupData,
    damageEvents,
    isDamageEventsLoading,
    selectedTargetIds,
    isDebuffLookupLoading,
    isBuffLookupLoading,
    isPlayerDataLoading,
  ]);

  const penetrationData = useSelector(selectPenetrationDataResult);
  const isPenetrationDataTaskLoading = useSelector(
    selectWorkerTaskLoading('calculatePenetrationData'),
  ) as boolean;
  const penetrationDataError = useSelector(selectWorkerTaskError('calculatePenetrationData')) as
    | string
    | null;
  const penetrationDataProgress = useSelector(
    selectWorkerTaskProgress('calculatePenetrationData'),
  ) as number | null;

  // Include all dependency loading states in the overall loading state
  const isPenetrationDataLoading =
    isPenetrationDataTaskLoading ||
    isPlayerDataLoading ||
    isCombatantInfoEventsLoading ||
    isBuffLookupLoading ||
    isDebuffLookupLoading ||
    isDamageEventsLoading;

  return React.useMemo(
    () => ({
      penetrationData,
      isPenetrationDataLoading,
      penetrationDataError,
      penetrationDataProgress,
      selectedFight,
    }),
    [
      penetrationData,
      isPenetrationDataLoading,
      penetrationDataError,
      penetrationDataProgress,
      selectedFight,
    ],
  );
}
