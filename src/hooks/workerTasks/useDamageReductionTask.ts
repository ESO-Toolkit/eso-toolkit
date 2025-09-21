import React from 'react';
import { useSelector } from 'react-redux';

import { executeDamageReductionTask, damageReductionActions } from '@/store/worker_results';

import { FightFragment } from '../../graphql/generated';
import {
  selectDamageReductionResult,
  selectWorkerTaskLoading,
  selectWorkerTaskError,
  selectWorkerTaskProgress,
} from '../../store/worker_results/selectors';
import { useCombatantInfoRecord } from '../events/useCombatantInfoRecord';
import { usePlayerData } from '../usePlayerData';

import { useBuffLookupTask } from './useBuffLookupTask';
import { useDebuffLookupTask } from './useDebuffLookupTask';
import { useWorkerTaskDependencies } from './useWorkerTaskDependencies';

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
  const { playerData, isPlayerDataLoading } = usePlayerData();
  const { buffLookupData, isBuffLookupLoading } = useBuffLookupTask();
  const { debuffLookupData, isDebuffLookupLoading } = useDebuffLookupTask();

  // Clear any existing result when dependencies change to force fresh calculation
  React.useEffect(() => {
    dispatch(damageReductionActions.clearResult());
  }, [dispatch, selectedFight, playerData, combatantInfoRecord, buffLookupData, debuffLookupData]);

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
      debuffLookupData !== null;

    if (allDependenciesReady) {
      dispatch(
        executeDamageReductionTask({
          fight: selectedFight,
          players: playerData.playersById,
          combatantInfoRecord: combatantInfoRecord,
          friendlyBuffsLookup: buffLookupData,
          debuffsLookup: debuffLookupData,
        }),
      );
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
    isPlayerDataLoading,
  ]);

  const damageReductionData = useSelector(selectDamageReductionResult);
  const isDamageReductionTaskLoading = useSelector(
    selectWorkerTaskLoading('calculateDamageReductionData'),
  ) as boolean;
  const damageReductionError = useSelector(
    selectWorkerTaskError('calculateDamageReductionData'),
  ) as string | null;
  const damageReductionProgress = useSelector(
    selectWorkerTaskProgress('calculateDamageReductionData'),
  ) as number | null;

  // Include all dependency loading states in the overall loading state
  const isDamageReductionLoading =
    isDamageReductionTaskLoading ||
    isPlayerDataLoading ||
    isCombatantInfoEventsLoading ||
    isBuffLookupLoading ||
    isDebuffLookupLoading;

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
    ],
  );
}
