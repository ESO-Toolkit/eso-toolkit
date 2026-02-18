import React from 'react';
import { useSelector } from 'react-redux';

import { useAppDispatch } from '@/store/useAppDispatch';
import { executePenetrationDataTask } from '@/store/worker_results';

import type { FightFragment } from '../../graphql/gql/graphql';
import type { ReportFightContextInput } from '../../store/contextTypes';
import {
  selectPenetrationDataResult,
  selectWorkerTaskLoading,
  selectWorkerTaskError,
  selectWorkerTaskProgress,
} from '../../store/worker_results/selectors';
import { useCombatantInfoRecord } from '../events/useCombatantInfoRecord';
import { useDamageEvents } from '../events/useDamageEvents';
import { useCurrentFight } from '../useCurrentFight';
import { usePlayerData } from '../usePlayerData';
import { useSelectedTargetIds } from '../useSelectedTargetIds';

import { useBuffLookupTask } from './useBuffLookupTask';
import { useDebuffLookupTask } from './useDebuffLookupTask';

// Hook for penetration data calculation
interface UsePenetrationDataTaskOptions {
  context?: ReportFightContextInput;
}

export function usePenetrationDataTask(_options?: UsePenetrationDataTaskOptions): {
  penetrationData: unknown;
  isPenetrationDataLoading: boolean;
  penetrationDataError: string | null;
  penetrationDataProgress: number | null;
  selectedFight: FightFragment | null | undefined;
} {
  const dispatch = useAppDispatch();
  const { fight: selectedFight } = useCurrentFight();
  const { playerData, isPlayerDataLoading } = usePlayerData();
  const { combatantInfoRecord, isCombatantInfoEventsLoading } = useCombatantInfoRecord();
  const { buffLookupData, isBuffLookupLoading } = useBuffLookupTask();
  const { debuffLookupData, isDebuffLookupLoading } = useDebuffLookupTask();
  const { damageEvents, isDamageEventsLoading } = useDamageEvents();
  const selectedTargetIds = useSelectedTargetIds();

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
      const promise = dispatch(
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
      return () => {
        promise.abort();
      };
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
    isDebuffLookupLoading;

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
