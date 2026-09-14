import React from 'react';
import { useSelector } from 'react-redux';

import { executeDamageOverTimeTask } from '@/store/worker_results';
import { damageOverTimeInputHash } from '@/store/worker_results/damageOverTimeSlice';
import type { DamageOverTimeCalculationTask } from '@/workers/calculations/CalculateDamageOverTime';

import { FightFragment } from '../../graphql/gql/graphql';
import type { ReportFightContextInput } from '../../store/contextTypes';
import {
  selectDamageOverTimeTask,
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

interface DamageOverTimeTaskSnapshot {
  result: unknown;
  cacheMetadata: { lastInputHash: string | null };
}

export const getOwnedDamageOverTimeResult = (
  taskInput: DamageOverTimeCalculationTask | null,
  task: DamageOverTimeTaskSnapshot,
): unknown => {
  if (!taskInput) return null;
  return task.cacheMetadata.lastInputHash === damageOverTimeInputHash(taskInput)
    ? task.result
    : null;
};

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

  const taskInput = React.useMemo<DamageOverTimeCalculationTask | null>(() => {
    if (
      !selectedFight ||
      isPlayerDataLoading ||
      !playerData?.playersById ||
      isDamageEventsLoading ||
      damageEvents === null
    ) {
      return null;
    }

    return {
      fight: selectedFight,
      players: playerData.playersById,
      damageEvents,
      bucketSizeMs: 1000,
    };
  }, [selectedFight, isPlayerDataLoading, playerData, isDamageEventsLoading, damageEvents]);

  // Execute task only when ALL dependencies are completely ready
  React.useEffect(() => {
    if (taskInput) {
      const promise = dispatch(executeDamageOverTimeTask(taskInput));
      return () => {
        promise.abort();
      };
    }
  }, [dispatch, taskInput]);

  const damageOverTimeTask = useSelector(selectDamageOverTimeTask);
  const damageOverTimeData = getOwnedDamageOverTimeResult(taskInput, damageOverTimeTask);
  const isDamageOverTimeTaskLoading = useSelector(
    selectWorkerTaskLoading('calculateDamageOverTimeData'),
  ) as boolean;
  const damageOverTimeError = useSelector(selectWorkerTaskError('calculateDamageOverTimeData')) as
    string | null;
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
