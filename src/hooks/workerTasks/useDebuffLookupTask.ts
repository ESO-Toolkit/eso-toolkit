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
    // Dispatch even for an EMPTY stream: a zero-debuff fight needs its own explicit (empty)
    // lookup, otherwise positions either never compute (fresh slot) or reuse the previous
    // fight's stale debuffs. The empty compute is trivial and keyed to this fight.
    if (selectedFight && !isDebuffEventsLoading) {
      const promise = dispatch(
        executeDebuffLookupTask({
          buffEvents: debuffEvents,
          fightEndTime: selectedFight.endTime,
          fightId: selectedFight.id,
          fightStartTime: selectedFight.startTime,
        }),
      );
      return () => {
        promise.abort();
      };
    }
  }, [dispatch, selectedFight, debuffEvents, isDebuffEventsLoading]);

  const debuffLookupData = useSelector(selectDebuffLookupResult) as BuffLookupData | null;
  const isDebuffLookupTaskLoading = useSelector(
    selectWorkerTaskLoading('calculateDebuffLookup'),
  ) as boolean;
  const debuffLookupError = useSelector(selectWorkerTaskError('calculateDebuffLookup')) as
    string | null;
  const debuffLookupProgress = useSelector(selectWorkerTaskProgress('calculateDebuffLookup')) as
    number | null;

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
