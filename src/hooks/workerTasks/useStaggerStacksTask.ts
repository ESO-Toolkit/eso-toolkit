import React from 'react';
import { useSelector } from 'react-redux';

import { FightFragment } from '../../graphql/gql/graphql';
import { executeStaggerStacksTask } from '../../store/worker_results';
import {
  selectStaggerStacksResult,
  selectWorkerTaskLoading,
  selectWorkerTaskError,
  selectWorkerTaskProgress,
} from '../../store/worker_results/selectors';
import { StaggerStackResult } from '../../workers/calculations/CalculateStaggerStacks';
import { useDamageEvents } from '../events/useDamageEvents';

import { useWorkerTaskDependencies } from './useWorkerTaskDependencies';

// Hook for Stagger stacks calculation
export function useStaggerStacksTask(): {
  staggerStacksData: StaggerStackResult[] | null;
  isStaggerStacksLoading: boolean;
  staggerStacksError: string | null;
  staggerStacksProgress: number | null;
  selectedFight: FightFragment | null;
} {
  const { dispatch, selectedFight } = useWorkerTaskDependencies();
  const { damageEvents, isDamageEventsLoading } = useDamageEvents();

  React.useEffect(() => {
    // Check that all dependencies are completely loaded with data available
    const allDependenciesReady = selectedFight && !isDamageEventsLoading && damageEvents !== null;

    if (allDependenciesReady) {
      const promise = dispatch(
        executeStaggerStacksTask({
          damageEvents: damageEvents,
          fightStartTime: selectedFight.startTime,
          fightEndTime: selectedFight?.endTime,
        }),
      );
      return () => {
        promise.abort();
      };
    }
  }, [dispatch, selectedFight, damageEvents, isDamageEventsLoading]);

  const staggerStacksData = useSelector(selectStaggerStacksResult);
  const isStaggerStacksTaskLoading = useSelector(
    selectWorkerTaskLoading('calculateStaggerStacks'),
  ) as boolean;
  const staggerStacksError = useSelector(selectWorkerTaskError('calculateStaggerStacks')) as
    | string
    | null;
  const staggerStacksProgress = useSelector(selectWorkerTaskProgress('calculateStaggerStacks')) as
    | number
    | null;

  // Include all dependency loading states in the overall loading state
  const isStaggerStacksLoading = isStaggerStacksTaskLoading || isDamageEventsLoading;

  return React.useMemo(
    () => ({
      staggerStacksData: staggerStacksData?.stackResults ?? null,
      isStaggerStacksLoading,
      staggerStacksError,
      staggerStacksProgress,
      selectedFight,
    }),
    [
      staggerStacksData,
      isStaggerStacksLoading,
      staggerStacksError,
      staggerStacksProgress,
      selectedFight,
    ],
  );
}
