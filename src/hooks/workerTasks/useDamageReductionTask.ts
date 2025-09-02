import React from 'react';
import { useSelector } from 'react-redux';

import { FightFragment } from '../../graphql/generated';
import {
  selectDamageReductionResult,
  selectWorkerTaskLoading,
  selectWorkerTaskError,
  selectWorkerTaskProgress,
} from '../../store/worker_results/selectors';
import { useCombatantInfoRecord } from '../events';
import { usePlayerData } from '../usePlayerData';

import { useBuffLookupTask } from './useBuffLookupTask';
import { useDebuffLookupTask } from './useDebuffLookupTask';
import { useWorkerTaskDependencies } from './useWorkerTaskDependencies';

import { executeDamageReductionTask, damageReductionActions } from '@/store/worker_results';

// Hook for damage reduction calculation
export function useDamageReductionTask(): {
  damageReductionData: unknown;
  isDamageReductionLoading: boolean;
  damageReductionError: string | null;
  damageReductionProgress: number | null;
  selectedFight: FightFragment | null;
} {
  const { dispatch, selectedFight } = useWorkerTaskDependencies();

  const { combatantInfoRecord, isCombatantInfoEventsLoading } = useCombatantInfoRecord();
  const { playerData } = usePlayerData();
  const { buffLookupData, isBuffLookupLoading } = useBuffLookupTask();
  const { debuffLookupData, isDebuffLookupLoading } = useDebuffLookupTask();

  // Clear any existing result when dependencies change to force fresh calculation
  React.useEffect(() => {
    dispatch(damageReductionActions.clearResult());
  }, [dispatch, selectedFight, playerData, combatantInfoRecord, buffLookupData, debuffLookupData]);

  React.useEffect(() => {
    if (
      selectedFight &&
      buffLookupData &&
      !isBuffLookupLoading &&
      playerData?.playersById &&
      !isCombatantInfoEventsLoading
    ) {
      // Only require debuff data if it's actually loading or available
      const hasDebuffData = debuffLookupData != null || !isDebuffLookupLoading;

      if (hasDebuffData) {
        dispatch(
          executeDamageReductionTask({
            fight: selectedFight,
            players: playerData.playersById,
            combatantInfoRecord: combatantInfoRecord,
            friendlyBuffsLookup: buffLookupData,
            debuffsLookup: debuffLookupData || { buffIntervals: {} },
          })
        );
      }
    }
  }, [
    dispatch,
    selectedFight,
    playerData,
    combatantInfoRecord,
    buffLookupData,
    debuffLookupData,
    isBuffLookupLoading,
    isDebuffLookupLoading,
    isCombatantInfoEventsLoading,
  ]);

  const damageReductionData = useSelector(selectDamageReductionResult);
  const isDamageReductionLoading = useSelector(
    selectWorkerTaskLoading('calculateDamageReductionData')
  ) as boolean;
  const damageReductionError = useSelector(
    selectWorkerTaskError('calculateDamageReductionData')
  ) as string | null;
  const damageReductionProgress = useSelector(
    selectWorkerTaskProgress('calculateDamageReductionData')
  ) as number | null;

  return React.useMemo(
    () => ({
      damageReductionData,
      isDamageReductionLoading,
      damageReductionError,
      damageReductionProgress,
      selectedFight,
    }),
    [
      damageReductionData,
      isDamageReductionLoading,
      damageReductionError,
      damageReductionProgress,
      selectedFight,
    ]
  );
}
