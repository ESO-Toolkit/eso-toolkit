import React from 'react';
import { useSelector } from 'react-redux';

import { FightFragment } from '../../graphql/generated';
import {
  selectHostileBuffLookupResult,
  selectWorkerTaskLoading,
  selectWorkerTaskError,
  selectWorkerTaskProgress,
} from '../../store/worker_results/selectors';
import { executeHostileBuffLookupTask } from '../../store/worker_results/taskSlices';
import { BuffLookupData } from '../../utils/BuffLookupUtils';
import { useHostileBuffEvents } from '../events';

import { useWorkerTaskDependencies } from './useWorkerTaskDependencies';

// Hook for hostile buff lookup data
export function useHostileBuffLookupTask(): {
  hostileBuffLookupData: BuffLookupData | null;
  isHostileBuffLookupLoading: boolean;
  hostileBuffLookupError: string | null;
  hostileBuffLookupProgress: number | null;
  selectedFight: FightFragment | null;
} {
  const { dispatch, selectedFight } = useWorkerTaskDependencies();
  const { hostileBuffEvents, isHostileBuffEventsLoading } = useHostileBuffEvents();

  React.useEffect(() => {
    if (selectedFight && !isHostileBuffEventsLoading) {
      dispatch(
        executeHostileBuffLookupTask({
          buffEvents: hostileBuffEvents,
          fightEndTime: selectedFight.endTime,
        }),
      );
    }
  }, [dispatch, selectedFight, hostileBuffEvents, isHostileBuffEventsLoading]);

  const hostileBuffLookupData = useSelector(selectHostileBuffLookupResult) as BuffLookupData | null;
  const isHostileBuffLookupLoading = useSelector(
    selectWorkerTaskLoading('calculateHostileBuffLookup'),
  ) as boolean;
  const hostileBuffLookupError = useSelector(
    selectWorkerTaskError('calculateHostileBuffLookup'),
  ) as string | null;
  const hostileBuffLookupProgress = useSelector(
    selectWorkerTaskProgress('calculateHostileBuffLookup'),
  ) as number | null;

  return React.useMemo(
    () => ({
      hostileBuffLookupData,
      isHostileBuffLookupLoading,
      hostileBuffLookupError,
      hostileBuffLookupProgress,
      selectedFight,
    }),
    [
      hostileBuffLookupData,
      isHostileBuffLookupLoading,
      hostileBuffLookupError,
      hostileBuffLookupProgress,
      selectedFight,
    ],
  );
}
