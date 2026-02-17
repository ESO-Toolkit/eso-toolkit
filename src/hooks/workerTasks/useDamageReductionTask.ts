import React from 'react';
import { useSelector } from 'react-redux';

import { executeDamageReductionTask } from '@/store/worker_results';

import type { ReportFightContextInput } from '../../store/contextTypes';
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
interface UseDamageReductionTaskOptions {
  context?: ReportFightContextInput;
}

export function useDamageReductionTask(options?: UseDamageReductionTaskOptions): {
  damageReductionData: unknown;
  isDamageReductionLoading: boolean;
  damageReductionError: string | null;
  damageReductionProgress: number | null;
  selectedFight: ReturnType<typeof useWorkerTaskDependencies>['selectedFight'];
} {
  const { dispatch, selectedFight } = useWorkerTaskDependencies(options);

  const { combatantInfoRecord, isCombatantInfoEventsLoading } = useCombatantInfoRecord({
    context: options?.context,
  });
  const { playerData, isPlayerDataLoading } = usePlayerData({ context: options?.context });
  const { buffLookupData, isBuffLookupLoading } = useBuffLookupTask(options);
  const { debuffLookupData, isDebuffLookupLoading } = useDebuffLookupTask(options);

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
      const promise = dispatch(
        executeDamageReductionTask({
          fight: selectedFight,
          players: playerData.playersById,
          combatantInfoRecord: combatantInfoRecord,
          friendlyBuffsLookup: buffLookupData,
          debuffsLookup: debuffLookupData,
        }),
      );
      return () => {
        promise.abort();
      };
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
