import React from 'react';
import { useSelector } from 'react-redux';

import { useEsoLogsClientInstance } from '../EsoLogsClientContext';
import { FightFragment } from '../graphql/generated';
import { useSelectedReportAndFight } from '../ReportFightContext';
import { fetchBuffEvents } from '../store/events_data/buffEventsSlice';
import {
  selectBuffEvents,
  selectBuffEventsLoading,
  selectBuffEventsProgress,
} from '../store/events_data/selectors';
import { selectReportFights } from '../store/report/reportSelectors';
import { useAppDispatch } from '../store/useAppDispatch';
import { BuffEvent } from '../types/combatlogEvents';

export function useBuffEvents(): {
  buffEvents: BuffEvent[];
  isBuffEventsLoading: boolean;
  selectedFight: FightFragment | null;
  progress: { total: number; completed: number; failed: number };
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
        fetchBuffEvents({
          reportCode: reportId,
          fight: selectedFight,
          client,
          // Optional: you can customize the interval size
          // intervalSize: 60000, // 60 seconds
        })
      );
    }
  }, [dispatch, reportId, selectedFight, client]);

  const buffEvents = useSelector(selectBuffEvents);
  const isBuffEventsLoading = useSelector(selectBuffEventsLoading);
  const progress = useSelector(selectBuffEventsProgress);

  return React.useMemo(
    () => ({ buffEvents, isBuffEventsLoading, selectedFight, progress }),
    [buffEvents, isBuffEventsLoading, selectedFight, progress]
  );
}
