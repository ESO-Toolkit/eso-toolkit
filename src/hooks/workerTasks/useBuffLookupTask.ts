import React from 'react';
import { useSelector } from 'react-redux';

import {
  selectBuffLookupResult,
  selectWorkerTaskLoading,
  selectWorkerTaskError,
  selectWorkerTaskProgress,
} from '../../store/worker_results/selectors';
import { executeBuffLookupTask } from '../../store/worker_results/taskSlices';
import { BuffLookupData } from '../../utils/BuffLookupUtils';
import { useFriendlyBuffEvents } from '../events/useFriendlyBuffEvents';

import { useWorkerTaskDependencies } from './useWorkerTaskDependencies';

// Hook for buff lookup data
export function useBuffLookupTask(): {
  buffLookupData: BuffLookupData | null;
  isBuffLookupLoading: boolean;
  buffLookupError: string | null;
  buffLookupProgress: number | null;
} {
  const { dispatch, selectedFight } = useWorkerTaskDependencies();
  const { friendlyBuffEvents, isFriendlyBuffEventsLoading } = useFriendlyBuffEvents();

  React.useEffect(() => {
    if (friendlyBuffEvents && !isFriendlyBuffEventsLoading) {
      dispatch(
        executeBuffLookupTask({
          buffEvents: friendlyBuffEvents,
          fightEndTime: selectedFight?.endTime,
        }),
      );
    }
  }, [dispatch, selectedFight, friendlyBuffEvents, isFriendlyBuffEventsLoading]);

  const buffLookupData = useSelector(selectBuffLookupResult) as BuffLookupData | null;
  const isBuffLookupTaskLoading = useSelector(
    selectWorkerTaskLoading('calculateBuffLookup'),
  ) as boolean;
  const buffLookupError = useSelector(selectWorkerTaskError('calculateBuffLookup')) as
    | string
    | null;
  const buffLookupProgress = useSelector(selectWorkerTaskProgress('calculateBuffLookup')) as
    | number
    | null;

  // Include all dependency loading states in the overall loading state
  const isBuffLookupLoading = isBuffLookupTaskLoading || isFriendlyBuffEventsLoading;

  return React.useMemo(
    () => ({
      buffLookupData,
      isBuffLookupLoading,
      buffLookupError,
      buffLookupProgress,
    }),
    [buffLookupData, isBuffLookupLoading, buffLookupError, buffLookupProgress],
  );
}
