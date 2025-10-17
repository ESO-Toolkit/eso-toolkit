import React from 'react';
import { useSelector } from 'react-redux';

import { FightFragment } from '../../graphql/gql/graphql';
import { executeTouchOfZenStacksTask, touchOfZenStacksActions } from '../../store/worker_results';
import {
  selectTouchOfZenStacksResult,
  selectWorkerTaskLoading,
  selectWorkerTaskError,
  selectWorkerTaskProgress,
} from '../../store/worker_results/selectors';
import { TouchOfZenStackResult } from '../../workers/calculations/CalculateTouchOfZenStacks';
import { useDamageEvents } from '../events/useDamageEvents';

import { useDebuffLookupTask } from './useDebuffLookupTask';
import { useWorkerTaskDependencies } from './useWorkerTaskDependencies';

// Hook for Touch of Z'en stacks calculation
export function useTouchOfZenStacksTask(): {
  touchOfZenStacksData: TouchOfZenStackResult[] | null;
  allDotAbilityIds: number[] | null;
  isTouchOfZenStacksLoading: boolean;
  touchOfZenStacksError: string | null;
  touchOfZenStacksProgress: number | null;
  selectedFight: FightFragment | null;
} {
  const { dispatch, selectedFight } = useWorkerTaskDependencies();
  const { debuffLookupData, isDebuffLookupLoading } = useDebuffLookupTask();
  const { damageEvents, isDamageEventsLoading } = useDamageEvents();

  // Clear any existing result when dependencies change to force fresh calculation
  React.useEffect(() => {
    dispatch(touchOfZenStacksActions.clearResult());
  }, [dispatch, selectedFight, debuffLookupData, damageEvents]);

  // Execute task only when ALL dependencies are completely ready
  React.useEffect(() => {
    // Check that all dependencies are completely loaded with data available
    const allDependenciesReady =
      selectedFight &&
      !isDebuffLookupLoading &&
      debuffLookupData !== null &&
      !isDamageEventsLoading &&
      damageEvents !== null;

    if (allDependenciesReady) {
      dispatch(
        executeTouchOfZenStacksTask({
          debuffsLookup: debuffLookupData,
          damageEvents: damageEvents,
          fightStartTime: selectedFight.startTime,
          fightEndTime: selectedFight?.endTime,
        }),
      );
    }
  }, [
    dispatch,
    selectedFight,
    debuffLookupData,
    damageEvents,
    isDebuffLookupLoading,
    isDamageEventsLoading,
  ]);

  const touchOfZenStacksData = useSelector(selectTouchOfZenStacksResult);
  const isTouchOfZenStacksTaskLoading = useSelector(
    selectWorkerTaskLoading('calculateTouchOfZenStacks'),
  ) as boolean;
  const touchOfZenStacksError = useSelector(selectWorkerTaskError('calculateTouchOfZenStacks')) as
    | string
    | null;
  const touchOfZenStacksProgress = useSelector(
    selectWorkerTaskProgress('calculateTouchOfZenStacks'),
  ) as number | null;

  // Include all dependency loading states in the overall loading state
  const isTouchOfZenStacksLoading =
    isTouchOfZenStacksTaskLoading || isDebuffLookupLoading || isDamageEventsLoading;

  return React.useMemo(
    () => ({
      touchOfZenStacksData: touchOfZenStacksData?.stackResults ?? null,
      allDotAbilityIds: touchOfZenStacksData?.allDotAbilityIds ?? null,
      isTouchOfZenStacksLoading,
      touchOfZenStacksError,
      touchOfZenStacksProgress,
      selectedFight,
    }),
    [
      touchOfZenStacksData,
      isTouchOfZenStacksLoading,
      touchOfZenStacksError,
      touchOfZenStacksProgress,
      selectedFight,
    ],
  );
}
