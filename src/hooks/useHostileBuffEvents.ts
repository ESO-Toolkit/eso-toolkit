import React from 'react';
import { useSelector } from 'react-redux';

import { useEsoLogsClientInstance } from '../EsoLogsClientContext';
import { useSelectedReportAndFight } from '../ReportFightContext';
import { fetchHostileBuffEvents } from '../store/events_data/hostileBuffEventsSlice';
import { selectReportFights } from '../store/report/reportSelectors';
import {
  selectHostileBuffEvents,
  selectHostileBuffEventsLoading,
  selectHostileBuffLookup,
} from '../store/selectors/eventsSelectors';
import { useAppDispatch } from '../store/useAppDispatch';
import { BuffEvent } from '../types/combatlogEvents';
import { BuffLookupData } from '../utils/BuffLookupUtils';

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
        })
      );
    }
  }, [dispatch, reportId, selectedFight, client]);

  const hostileBuffEvents = useSelector(selectHostileBuffEvents);
  const isHostileBuffEventsLoading = useSelector(selectHostileBuffEventsLoading);

  return React.useMemo(
    () => ({ hostileBuffEvents, isHostileBuffEventsLoading }),
    [hostileBuffEvents, isHostileBuffEventsLoading]
  );
}

export function useHostileBuffsLookup(): {
  hostileBuffsLookup: BuffLookupData;
  isHostileBuffEventsLoading: boolean;
} {
  const isHostileBuffEventsLoading = useSelector(selectHostileBuffEventsLoading);
  const buffLookup = useSelector(selectHostileBuffLookup);

  return React.useMemo(
    () => ({
      hostileBuffsLookup: buffLookup,
      isHostileBuffEventsLoading: isHostileBuffEventsLoading,
    }),
    [buffLookup, isHostileBuffEventsLoading]
  );
}
