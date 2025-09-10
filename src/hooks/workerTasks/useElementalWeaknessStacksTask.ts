import React from 'react';
import { useSelector } from 'react-redux';

import { FightFragment } from '../../graphql/generated';
import {
  executeElementalWeaknessStacksTask,
  elementalWeaknessStacksActions,
} from '../../store/worker_results';
import {
  selectElementalWeaknessStacksResult,
  selectWorkerTaskLoading,
  selectWorkerTaskError,
  selectWorkerTaskProgress,
} from '../../store/worker_results/selectors';
import { ElementalWeaknessStackResult } from '../../workers/calculations/CalculateElementalWeaknessStacks';
import { useWorkerDebuffLookup } from '../events/useDebuffEvents';

import { useWorkerTaskDependencies } from './useWorkerTaskDependencies';

// Hook for Elemental Weakness stacks calculation
export function useElementalWeaknessStacksTask(): {
  elementalWeaknessStacksData: ElementalWeaknessStackResult[] | null;
  isElementalWeaknessStacksLoading: boolean;
  elementalWeaknessStacksError: string | null;
  elementalWeaknessStacksProgress: number | null;
  selectedFight: FightFragment | null;
} {
  const { dispatch, selectedFight } = useWorkerTaskDependencies();
  const { result: debuffsLookup, isLoading: isDebuffEventsLoading } = useWorkerDebuffLookup();

  React.useEffect(() => {
    // Check that all dependencies are completely loaded with data available
    const allDependenciesReady = selectedFight && !isDebuffEventsLoading && debuffsLookup !== null;

    if (allDependenciesReady) {
      // Clear any existing result when dependencies change to force fresh calculation
      dispatch(elementalWeaknessStacksActions.clearResult());

      dispatch(
        executeElementalWeaknessStacksTask({
          debuffsLookup: debuffsLookup,
          fightStartTime: selectedFight.startTime,
          fightEndTime: selectedFight?.endTime,
        }),
      );
    }
  }, [dispatch, selectedFight, debuffsLookup, isDebuffEventsLoading]);

  const elementalWeaknessStacksData = useSelector(selectElementalWeaknessStacksResult);
  const isElementalWeaknessStacksTaskLoading = useSelector(
    selectWorkerTaskLoading('calculateElementalWeaknessStacks'),
  ) as boolean;
  const elementalWeaknessStacksError = useSelector(
    selectWorkerTaskError('calculateElementalWeaknessStacks'),
  ) as string | null;
  const elementalWeaknessStacksProgress = useSelector(
    selectWorkerTaskProgress('calculateElementalWeaknessStacks'),
  ) as number | null;

  // Include all dependency loading states in the overall loading state
  const isElementalWeaknessStacksLoading =
    isElementalWeaknessStacksTaskLoading || isDebuffEventsLoading;

  return React.useMemo(
    () => ({
      elementalWeaknessStacksData: elementalWeaknessStacksData?.stackResults ?? null,
      isElementalWeaknessStacksLoading,
      elementalWeaknessStacksError,
      elementalWeaknessStacksProgress,
      selectedFight,
    }),
    [
      elementalWeaknessStacksData,
      isElementalWeaknessStacksLoading,
      elementalWeaknessStacksError,
      elementalWeaknessStacksProgress,
      selectedFight,
    ],
  );
}
