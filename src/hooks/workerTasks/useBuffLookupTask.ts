import React from 'react';
import { useSelector } from 'react-redux';

import { selectFriendlyBuffEvents } from '../../store/selectors/eventsSelectors';
import {
  selectBuffLookupResult,
  selectWorkerTaskLoading,
  selectWorkerTaskError,
  selectWorkerTaskProgress,
} from '../../store/worker_results/selectors';
import { executeBuffLookupTask } from '../../store/worker_results/taskSlices';
import { BuffLookupData } from '../../utils/BuffLookupUtils';

import { useWorkerTaskDependencies } from './useWorkerTaskDependencies';

// Hook for buff lookup data
export function useBuffLookupTask(): {
  buffLookupData: BuffLookupData | null;
  isBuffLookupLoading: boolean;
  buffLookupError: string | null;
  buffLookupProgress: number | null;
} {
  const { dispatch, selectedFight } = useWorkerTaskDependencies();
  const friendlyBuffEvents = useSelector(selectFriendlyBuffEvents);

  React.useEffect(() => {
    dispatch(
      executeBuffLookupTask({
        buffEvents: friendlyBuffEvents,
        fightEndTime: selectedFight?.endTime,
      })
    );
  }, [dispatch, selectedFight, friendlyBuffEvents]);

  const buffLookupData = useSelector(selectBuffLookupResult) as BuffLookupData | null;
  const isBuffLookupLoading = useSelector(
    selectWorkerTaskLoading('calculateBuffLookup')
  ) as boolean;
  const buffLookupError = useSelector(selectWorkerTaskError('calculateBuffLookup')) as
    | string
    | null;
  const buffLookupProgress = useSelector(selectWorkerTaskProgress('calculateBuffLookup')) as
    | number
    | null;

  return React.useMemo(
    () => ({
      buffLookupData,
      isBuffLookupLoading,
      buffLookupError,
      buffLookupProgress,
    }),
    [buffLookupData, isBuffLookupLoading, buffLookupError, buffLookupProgress]
  );
}
