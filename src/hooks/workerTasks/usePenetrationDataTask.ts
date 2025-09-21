import React from 'react';
import { useSelector } from 'react-redux';

import { FightFragment } from '../../graphql/generated';
import {
  selectPenetrationDataResult,
  selectWorkerTaskLoading,
  selectWorkerTaskError,
  selectWorkerTaskProgress,
} from '../../store/worker_results/selectors';
import { useCombatantInfoRecord } from '../events/useCombatantInfoRecord';
import { useCurrentFight } from '../useCurrentFight';
import { usePlayerData } from '../usePlayerData';
import { useSelectedTargetIds } from '../useSelectedTargetIds';

import { useBuffLookupTask } from './useBuffLookupTask';
import { useDebuffLookupTask } from './useDebuffLookupTask';

import { useAppDispatch } from '@/store/useAppDispatch';
import { executePenetrationDataTask, penetrationDataActions } from '@/store/worker_results';

// Hook for penetration data calculation
export function usePenetrationDataTask(): {
  penetrationData: unknown;
  isPenetrationDataLoading: boolean;
  penetrationDataError: string | null;
  penetrationDataProgress: number | null;
  selectedFight: FightFragment | null;
} {
  const dispatch = useAppDispatch();
  const { fight: selectedFight, isFightLoading } = useCurrentFight();
  const { playerData, isPlayerDataLoading } = usePlayerData();
  const { combatantInfoRecord, isCombatantInfoEventsLoading } = useCombatantInfoRecord();
  const { buffLookupData, isBuffLookupLoading } = useBuffLookupTask();
  const { debuffLookupData, isDebuffLookupLoading } = useDebuffLookupTask();
  const selectedTargetIds = useSelectedTargetIds();

  // Clear any existing result when dependencies change to force fresh calculation
  React.useEffect(() => {
    dispatch(penetrationDataActions.clearResult());
  }, [
    dispatch,
    selectedFight,
    playerData,
    combatantInfoRecord,
    buffLookupData,
    debuffLookupData,
    selectedTargetIds,
  ]);

  // Execute task only when ALL dependencies are completely ready
  React.useEffect(() => {
    // Check that all dependencies are completely loaded with data available
    const allDependenciesReady =
      selectedFight &&
      !isFightLoading &&
      !isPlayerDataLoading &&
      playerData?.playersById &&
      !isCombatantInfoEventsLoading &&
      combatantInfoRecord !== null &&
      !isBuffLookupLoading &&
      buffLookupData !== null &&
      !isDebuffLookupLoading &&
      debuffLookupData !== null;

    if (allDependenciesReady) {
      dispatch(
        executePenetrationDataTask({
          fight: selectedFight,
          players: playerData.playersById,
          combatantInfoEvents: combatantInfoRecord,
          friendlyBuffsLookup: buffLookupData,
          debuffsLookup: debuffLookupData,
          selectedTargetIds: Array.from(selectedTargetIds),
        }),
      );
    }
  }, [
    dispatch,
    selectedFight,
    isFightLoading,
    playerData,
    combatantInfoRecord,
    isCombatantInfoEventsLoading,
    buffLookupData,
    debuffLookupData,
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
    isDebuffLookupLoading;

  return React.useMemo(
    () => ({
      penetrationData,
      isPenetrationDataLoading,
      penetrationDataError,
      penetrationDataProgress,
      selectedFight: selectedFight || null,
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
