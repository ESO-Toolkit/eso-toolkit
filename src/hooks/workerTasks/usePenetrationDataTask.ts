import React from 'react';
import { useSelector } from 'react-redux';

import { FightFragment } from '../../graphql/generated';
import {
  selectPenetrationDataResult,
  selectWorkerTaskLoading,
  selectWorkerTaskError,
  selectWorkerTaskProgress,
} from '../../store/worker_results/selectors';
import { useCombatantInfoRecord } from '../events';
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
  const selectedFight = useCurrentFight();
  const { playerData } = usePlayerData();
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

  React.useEffect(() => {
    if (
      selectedFight &&
      !isBuffLookupLoading &&
      buffLookupData &&
      playerData?.playersById &&
      !isCombatantInfoEventsLoading
    ) {
      // Only require debuff data if it's actually loading or available
      const hasDebuffData = debuffLookupData || !isDebuffLookupLoading;

      if (hasDebuffData) {
        dispatch(
          executePenetrationDataTask({
            fight: selectedFight,
            players: playerData.playersById,
            combatantInfoEvents: combatantInfoRecord,
            friendlyBuffsLookup: buffLookupData,
            debuffsLookup: debuffLookupData || { buffIntervals: {} },
            selectedTargetIds: Array.from(selectedTargetIds),
          }),
        );
      }
    }
  }, [
    dispatch,
    selectedFight,
    playerData,
    combatantInfoRecord,
    isCombatantInfoEventsLoading,
    buffLookupData,
    debuffLookupData,
    selectedTargetIds,
    isDebuffLookupLoading,
    isBuffLookupLoading,
  ]);

  const penetrationData = useSelector(selectPenetrationDataResult);
  const isPenetrationDataLoading = useSelector(
    selectWorkerTaskLoading('calculatePenetrationData'),
  ) as boolean;
  const penetrationDataError = useSelector(selectWorkerTaskError('calculatePenetrationData')) as
    | string
    | null;
  const penetrationDataProgress = useSelector(
    selectWorkerTaskProgress('calculatePenetrationData'),
  ) as number | null;

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
