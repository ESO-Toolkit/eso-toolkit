import React from 'react';
import { useSelector } from 'react-redux';

import { executeDamageOverTimeTask, damageOverTimeActions } from '@/store/worker_results';

import { FightFragment } from '../../graphql/gql/graphql';
import type { ReportFightContextInput } from '../../store/contextTypes';
import {
  selectDamageOverTimeResult,
  selectWorkerTaskLoading,
  selectWorkerTaskError,
  selectWorkerTaskProgress,
} from '../../store/worker_results/selectors';
import { useDamageEvents } from '../events/useDamageEvents';
import { usePlayerData } from '../usePlayerData';

import { useWorkerTaskDependencies } from './useWorkerTaskDependencies';

// Hook for damage over time calculation
interface UseDamageOverTimeTaskOptions {
  context?: ReportFightContextInput;
}

export function useDamageOverTimeTask(options?: UseDamageOverTimeTaskOptions): {
  damageOverTimeData: unknown;
  isDamageOverTimeLoading: boolean;
  damageOverTimeError: string | null;
  damageOverTimeProgress: number | null;
  selectedFight: FightFragment | null;
} {
  const { dispatch, selectedFight } = useWorkerTaskDependencies(options);

  const { damageEvents, isDamageEventsLoading } = useDamageEvents({ context: options?.context });
  const { playerData, isPlayerDataLoading } = usePlayerData({ context: options?.context });

  // Clear any existing result when dependencies change to force fresh calculation
  React.useEffect(() => {
    dispatch(damageOverTimeActions.clearResult());
  }, [dispatch, selectedFight, playerData, damageEvents]);

  // Execute task only when ALL dependencies are completely ready
  React.useEffect(() => {
    // Check that all dependencies are completely loaded with data available
    const allDependenciesReady =
      selectedFight &&
      !isPlayerDataLoading &&
      playerData?.playersById &&
      !isDamageEventsLoading &&
      damageEvents !== null;

    if (allDependenciesReady) {
      dispatch(
        executeDamageOverTimeTask({
          fight: selectedFight,
          players: playerData.playersById,
          damageEvents: damageEvents,
          bucketSizeMs: 1000, // 1 second buckets
        }),
      );
    }
  }, [
    dispatch,
    selectedFight,
    playerData,
    damageEvents,
    isDamageEventsLoading,
    isPlayerDataLoading,
  ]);

  const damageOverTimeData = useSelector(selectDamageOverTimeResult);
  const isDamageOverTimeTaskLoading = useSelector(
    selectWorkerTaskLoading('calculateDamageOverTimeData'),
  ) as boolean;
  const damageOverTimeError = useSelector(selectWorkerTaskError('calculateDamageOverTimeData')) as
    | string
    | null;
  const damageOverTimeProgress = useSelector(
    selectWorkerTaskProgress('calculateDamageOverTimeData'),
  ) as number | null;

  // Include all dependency loading states in the overall loading state
  const isDamageOverTimeLoading =
    isDamageOverTimeTaskLoading || isPlayerDataLoading || isDamageEventsLoading;

  return React.useMemo(
    () => ({
      damageOverTimeData,
      isDamageOverTimeLoading,
      damageOverTimeError,
      damageOverTimeProgress,
      selectedFight,
    }),
    [
      damageOverTimeData,
      isDamageOverTimeLoading,
      damageOverTimeError,
      damageOverTimeProgress,
      selectedFight,
    ],
  );
}
