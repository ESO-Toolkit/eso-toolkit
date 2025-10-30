import React from 'react';
import { useSelector } from 'react-redux';

import { FightFragment } from '../../graphql/gql/graphql';
import type { ReportFightContextInput } from '../../store/contextTypes';
import {
  selectDebuffLookupResult,
  selectWorkerTaskLoading,
  selectWorkerTaskError,
  selectWorkerTaskProgress,
} from '../../store/worker_results/selectors';
import { executeDebuffLookupTask } from '../../store/worker_results/taskSlices';
import { BuffLookupData } from '../../utils/BuffLookupUtils';
import { useDebuffEvents } from '../events/useDebuffEvents';

import { useWorkerTaskDependencies } from './useWorkerTaskDependencies';

interface UseDebuffLookupTaskOptions {
  context?: ReportFightContextInput;
}

// Hook for debuff lookup data
export function useDebuffLookupTask(options?: UseDebuffLookupTaskOptions): {
  debuffLookupData: BuffLookupData | null;
  isDebuffLookupLoading: boolean;
  debuffLookupError: string | null;
  debuffLookupProgress: number | null;
  selectedFight: FightFragment | null;
} {
  const { dispatch, selectedFight } = useWorkerTaskDependencies(options);
  const { debuffEvents, isDebuffEventsLoading } = useDebuffEvents({ context: options?.context });

  React.useEffect(() => {
    if (selectedFight && debuffEvents.length > 0 && !isDebuffEventsLoading) {
      dispatch(
        executeDebuffLookupTask({
          buffEvents: debuffEvents,
          fightEndTime: selectedFight.endTime,
        }),
      );
    }
  }, [dispatch, selectedFight, debuffEvents, isDebuffEventsLoading]);

  const debuffLookupData = useSelector(selectDebuffLookupResult) as BuffLookupData | null;
  const isDebuffLookupTaskLoading = useSelector(
    selectWorkerTaskLoading('calculateDebuffLookup'),
  ) as boolean;
  const debuffLookupError = useSelector(selectWorkerTaskError('calculateDebuffLookup')) as
    | string
    | null;
  const debuffLookupProgress = useSelector(selectWorkerTaskProgress('calculateDebuffLookup')) as
    | number
    | null;

  // Include all dependency loading states in the overall loading state
  const isDebuffLookupLoading = isDebuffLookupTaskLoading || isDebuffEventsLoading;

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
    ],
  );
}
