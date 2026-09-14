import React from 'react';
import { useSelector } from 'react-redux';

import { executePenetrationDataTask } from '@/store/worker_results';

import type { FightFragment } from '../../graphql/gql/graphql';
import type { ReportFightContextInput } from '../../store/contextTypes';
import {
  selectPenetrationDataResult,
  selectWorkerTaskLoading,
  selectWorkerTaskError,
  selectWorkerTaskProgress,
} from '../../store/worker_results/selectors';
import { KnownAbilities } from '../../types/abilities';
import { useCastEvents } from '../events/useCastEvents';
import { useCombatantInfoRecord } from '../events/useCombatantInfoRecord';
import { useDamageEvents } from '../events/useDamageEvents';
import { usePlayerData } from '../usePlayerData';
import { hasNoResolvedTargets, useSelectedTargetIds } from '../useSelectedTargetIds';

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
  selectedFight: FightFragment | null | undefined;
} {
  const context = options?.context;
  const { dispatch, selectedFight } = useWorkerTaskDependencies(options);
  const { playerData, isPlayerDataLoading } = usePlayerData({ context });
  const { combatantInfoRecord, isCombatantInfoEventsLoading } = useCombatantInfoRecord({ context });
  const { buffLookupData, isBuffLookupLoading } = useBuffLookupTask(options);
  const { debuffLookupData, isDebuffLookupLoading } = useDebuffLookupTask(options);
  const { damageEvents, isDamageEventsLoading } = useDamageEvents({ context });
  const { castEvents, isCastEventsLoaded } = useCastEvents({ context });
  const selectedTargetIds = useSelectedTargetIds({ context });
  const noResolvedTargets = hasNoResolvedTargets(selectedTargetIds);

  // Pre-filter cast events to SWAP_WEAPONS events grouped by sourceID so the worker
  // can determine the active weapon bar at any given timestamp per player.
  const swapEventsByPlayerId = React.useMemo(() => {
    const result: Record<number, (typeof castEvents)[number][]> = {};
    for (const event of castEvents) {
      if (event.abilityGameID === KnownAbilities.SWAP_WEAPONS) {
        const id = event.sourceID;
        if (!result[id]) result[id] = [];
        result[id].push(event);
      }
    }
    return result;
  }, [castEvents]);

  // Execute task only when ALL dependencies are completely ready
  React.useEffect(() => {
    // Check that all dependencies are completely loaded with data available
    const allDependenciesReady =
      !noResolvedTargets &&
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
      damageEvents.length > 0 &&
      isCastEventsLoaded;

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
          swapEventsByPlayerId,
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
    noResolvedTargets,
    isDebuffLookupLoading,
    isBuffLookupLoading,
    isPlayerDataLoading,
    isCastEventsLoaded,
    swapEventsByPlayerId,
  ]);

  const selectedPenetrationData = useSelector(selectPenetrationDataResult);
  const isPenetrationDataTaskLoading = useSelector(
    selectWorkerTaskLoading('calculatePenetrationData'),
  ) as boolean;
  const penetrationDataError = useSelector(selectWorkerTaskError('calculatePenetrationData')) as
    string | null;
  const penetrationDataProgress = useSelector(
    selectWorkerTaskProgress('calculatePenetrationData'),
  ) as number | null;

  // Include all dependency loading states in the overall loading state
  const isPenetrationDataLoading =
    !noResolvedTargets &&
    (isPenetrationDataTaskLoading ||
      isPlayerDataLoading ||
      isCombatantInfoEventsLoading ||
      isBuffLookupLoading ||
      isDebuffLookupLoading);
  const penetrationData = noResolvedTargets ? null : selectedPenetrationData;

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
