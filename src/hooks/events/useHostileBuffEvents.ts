import React from 'react';
import { useSelector } from 'react-redux';

import { useEsoLogsClientInstance } from '../../EsoLogsClientContext';
import { useSelectedReportAndFight } from '../../ReportFightContext';
import { fetchHostileBuffEvents } from '../../store/events_data/hostileBuffEventsSlice';
import { selectReportFights } from '../../store/report/reportSelectors';
import {
  selectHostileBuffEvents,
  selectHostileBuffEventsLoading,
} from '../../store/selectors/eventsSelectors';
import { useAppDispatch } from '../../store/useAppDispatch';
import { BuffEvent } from '../../types/combatlogEvents';
import { BuffLookupData } from '../../utils/BuffLookupUtils';
import { useBuffLookupTask } from '../workerTasks/useBuffLookupTask';

export function useHostileBuffEvents(): {
  hostileBuffEvents: BuffEvent[];
  isHostileBuffEventsLoading: boolean;
} {
  const dispatch = useAppDispatch();
  const { reportId, fightId } = useSelectedReportAndFight();
  const fights = useSelector(selectReportFights);
  const client = useEsoLogsClientInstance();

  // Get the specific fight from the report data
  const selectedFight = React.useMemo(() => {
    if (!fightId || !fights) return null;
    const fightIdNumber = parseInt(fightId, 10);
    return fights.find((fight) => fight && fight.id === fightIdNumber) || null;
  }, [fightId, fights]);

  React.useEffect(() => {
    if (reportId && selectedFight && client) {
      dispatch(
        fetchHostileBuffEvents({
          reportCode: reportId,
          fight: selectedFight,
          client,
          // Optional: you can customize the interval size
          // intervalSize: 60000, // 60 seconds
        }),
      );
    }
  }, [dispatch, reportId, selectedFight, client]);

  const hostileBuffEvents = useSelector(selectHostileBuffEvents);
  const isHostileBuffEventsLoading = useSelector(selectHostileBuffEventsLoading);

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
export function useWorkerHostileBuffsLookup(): {
  hostileBuffsLookup: BuffLookupData;
  isHostileBuffEventsLoading: boolean;
  progress?: { phase: string; percentage?: number };
} {
  const { isHostileBuffEventsLoading } = useHostileBuffEvents();
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
