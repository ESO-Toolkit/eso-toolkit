import React from 'react';
import { useSelector } from 'react-redux';

import { executeCriticalDamageTask } from '@/store/worker_results';
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
import { hasNoResolvedTargets, useSelectedTargetIds } from '../useSelectedTargetIds';

import { useBuffLookupTask } from './useBuffLookupTask';
import { useCompanionCritEvidence } from './useCompanionCritEvidence';
import { useDebuffLookupTask } from './useDebuffLookupTask';
import { useWorkerTaskDependencies } from './useWorkerTaskDependencies';

// Hook for critical damage calculation
interface UseCriticalDamageTaskOptions {
  context?: ReportFightContextInput;
}

export function useCriticalDamageTask(options?: UseCriticalDamageTaskOptions): {
  criticalDamageData: SharedWorkerResultType<'calculateCriticalDamageData'> | null;
  isCriticalDamageLoading: boolean;
  criticalDamageError: string | null;
  criticalDamageProgress: number | null;
  selectedFight: ReturnType<typeof useWorkerTaskDependencies>['selectedFight'];
} {
  const context = options?.context;
  const { dispatch, selectedFight } = useWorkerTaskDependencies(options);
  const { combatantInfoRecord, isCombatantInfoEventsLoading } = useCombatantInfoRecord({ context });
  const { playerData, isPlayerDataLoading } = usePlayerData({ context });
  const { buffLookupData, isBuffLookupLoading } = useBuffLookupTask(options);
  const { debuffLookupData, isDebuffLookupLoading } = useDebuffLookupTask(options);
  const { damageEvents, isDamageEventsLoading } = useDamageEvents({ context });
  const selectedTargetIds = useSelectedTargetIds({ context });
  const noResolvedTargets = hasNoResolvedTargets(selectedTargetIds);
  const companionCritEvidence = useCompanionCritEvidence(context);

  // Start the worker once all required report dependencies are available. The
  // selector below exposes the real worker result; there is no placeholder path.
  React.useEffect(() => {
    if (
      !noResolvedTargets &&
      selectedFight &&
      !isBuffLookupLoading &&
      buffLookupData !== null &&
      !isCombatantInfoEventsLoading &&
      combatantInfoRecord !== null &&
      !isPlayerDataLoading &&
      playerData?.playersById &&
      !isDamageEventsLoading &&
      damageEvents.length > 0
    ) {
      // Only require debuff data if it's actually loading or available
      const hasDebuffData = debuffLookupData !== null || !isDebuffLookupLoading;

      if (hasDebuffData) {
        const promise = dispatch(
          executeCriticalDamageTask({
            fight: selectedFight,
            players: playerData.playersById,
            combatantInfoEvents: combatantInfoRecord,
            friendlyBuffsLookup: buffLookupData,
            debuffsLookup: debuffLookupData || { buffIntervals: {} },
            damageEvents: damageEvents,
            selectedTargetIds: Array.from(selectedTargetIds),
            companionCritEvidence,
          }),
        );
        return () => {
          promise.abort();
        };
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
    noResolvedTargets,
    companionCritEvidence,
    isBuffLookupLoading,
    isDebuffLookupLoading,
    isCombatantInfoEventsLoading,
  ]);

  const selectedCriticalDamageData = useSelector(selectCriticalDamageResult);
  const isCriticalDamageTaskLoading = useSelector(
    selectWorkerTaskLoading('calculateCriticalDamageData'),
  ) as boolean;
  const criticalDamageError = useSelector(selectWorkerTaskError('calculateCriticalDamageData')) as
    string | null;
  const criticalDamageProgress = useSelector(
    selectWorkerTaskProgress('calculateCriticalDamageData'),
  ) as number | null;

  // Include all dependency loading states in the overall loading state
  const isCriticalDamageLoading =
    !noResolvedTargets &&
    (isCriticalDamageTaskLoading ||
      isPlayerDataLoading ||
      isCombatantInfoEventsLoading ||
      isBuffLookupLoading ||
      isDebuffLookupLoading);
  const criticalDamageData = noResolvedTargets ? null : selectedCriticalDamageData;

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
