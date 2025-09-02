import React from 'react';
import { useSelector } from 'react-redux';

import { FightFragment } from '../../graphql/generated';
import {
  selectDebuffLookupResult,
  selectWorkerTaskLoading,
  selectWorkerTaskError,
  selectWorkerTaskProgress,
} from '../../store/worker_results/selectors';
import { executeDebuffLookupTask } from '../../store/worker_results/taskSlices';
import { BuffLookupData } from '../../utils/BuffLookupUtils';
import { useDebuffEvents } from '../events';

import { useWorkerTaskDependencies } from './useWorkerTaskDependencies';

// Hook for debuff lookup data
export function useDebuffLookupTask(): {
  debuffLookupData: BuffLookupData | null;
  isDebuffLookupLoading: boolean;
  debuffLookupError: string | null;
  debuffLookupProgress: number | null;
  selectedFight: FightFragment | null;
} {
  const { dispatch, selectedFight } = useWorkerTaskDependencies();
  const { debuffEvents, isDebuffEventsLoading } = useDebuffEvents();

  React.useEffect(() => {
    if (selectedFight && debuffEvents.length > 0 && !isDebuffEventsLoading) {
      dispatch(
        executeDebuffLookupTask({
          buffEvents: debuffEvents,
          fightEndTime: selectedFight.endTime,
        })
      );
    }
  }, [dispatch, selectedFight, debuffEvents, isDebuffEventsLoading]);

  const debuffLookupData = useSelector(selectDebuffLookupResult) as BuffLookupData | null;
  const isDebuffLookupLoading = useSelector(
    selectWorkerTaskLoading('calculateDebuffLookup')
  ) as boolean;
  const debuffLookupError = useSelector(selectWorkerTaskError('calculateDebuffLookup')) as
    | string
    | null;
  const debuffLookupProgress = useSelector(selectWorkerTaskProgress('calculateDebuffLookup')) as
    | number
    | null;

  return React.useMemo(
    () => ({
      debuffLookupData,
      isDebuffLookupLoading,
      debuffLookupError,
      debuffLookupProgress,
      selectedFight,
    }),
    [
      debuffLookupData,
      isDebuffLookupLoading,
      debuffLookupError,
      debuffLookupProgress,
      selectedFight,
    ]
  );
}
