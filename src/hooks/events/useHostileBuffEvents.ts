import React from 'react';
import { useSelector } from 'react-redux';

import { useEsoLogsClientInstance } from '../../EsoLogsClientContext';
import type { ReportFightContextInput } from '../../store/contextTypes';
import {
  selectHostileBuffEventsEntryForContext,
  selectHostileBuffEventsForContext,
} from '../../store/events_data/hostileBuffEventsSelectors';
import { fetchHostileBuffEvents } from '../../store/events_data/hostileBuffEventsSlice';
import type { RootState } from '../../store/storeWithHistory';
import { useAppDispatch } from '../../store/useAppDispatch';
import { BuffEvent } from '../../types/combatlogEvents';
import { BuffLookupData } from '../../utils/BuffLookupUtils';
import { useFightForContext } from '../useFightForContext';
import { useResolvedReportFightContext } from '../useResolvedReportFightContext';
import { useBuffLookupTask } from '../workerTasks/useBuffLookupTask';

interface UseHostileBuffEventsOptions {
  context?: ReportFightContextInput;
}

export function useHostileBuffEvents(options?: UseHostileBuffEventsOptions): {
  hostileBuffEvents: BuffEvent[];
  isHostileBuffEventsLoading: boolean;
} {
  const dispatch = useAppDispatch();
  const client = useEsoLogsClientInstance();
  const context = useResolvedReportFightContext(options?.context);
  const selectedFight = useFightForContext(context);
  const hostileBuffEvents = useSelector((state: RootState) =>
    selectHostileBuffEventsForContext(state, context),
  );
  const hostileBuffEntry = useSelector((state: RootState) =>
    selectHostileBuffEventsEntryForContext(state, context),
  );
  const isHostileBuffEventsLoading = hostileBuffEntry?.status === 'loading';

  React.useEffect(() => {
    if (context.reportCode && selectedFight && client) {
      dispatch(
        fetchHostileBuffEvents({
          reportCode: context.reportCode,
          fight: selectedFight,
          client,
          // Optional: you can customize the interval size
          // intervalSize: 60000, // 60 seconds
        }),
      );
    }
  }, [dispatch, context.reportCode, context.fightId, selectedFight, client]);

  return React.useMemo(
    () => ({ hostileBuffEvents, isHostileBuffEventsLoading }),
    [hostileBuffEvents, isHostileBuffEventsLoading],
  );
}

/**
 * Worker-based hook for hostile buff lookup calculation.
 * This is the recommended replacement for useHostileBuffsLookup.
 *
 * Benefits:
 * - Non-blocking UI during heavy calculations
 * - Progress reporting for long-running operations
 * - Better performance for large datasets
 *
 * @returns Object containing:
 *   - hostileBuffsLookup: BuffLookupData with buff intervals
 *   - isHostileBuffEventsLoading: boolean indicating if events are still loading
 *   - progress: optional progress information during calculation
 */
export function useWorkerHostileBuffsLookup(
  options?: UseHostileBuffEventsOptions,
): {
  hostileBuffsLookup: BuffLookupData;
  isHostileBuffEventsLoading: boolean;
  progress?: { phase: string; percentage?: number };
} {
  const { isHostileBuffEventsLoading } = useHostileBuffEvents(options);
  const { buffLookupData, isBuffLookupLoading, buffLookupProgress } = useBuffLookupTask();

  return React.useMemo(
    () => ({
      hostileBuffsLookup: buffLookupData as BuffLookupData,
      isHostileBuffEventsLoading: isHostileBuffEventsLoading || isBuffLookupLoading,
      progress: buffLookupProgress
        ? { phase: 'Processing', percentage: buffLookupProgress }
        : undefined,
    }),
    [buffLookupData, isHostileBuffEventsLoading, isBuffLookupLoading, buffLookupProgress],
  );
}
