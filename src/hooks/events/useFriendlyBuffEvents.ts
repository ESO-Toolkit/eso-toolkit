import React from 'react';
import { useSelector } from 'react-redux';

import { useEsoLogsClientInstance } from '../../EsoLogsClientContext';
import { FightFragment } from '../../graphql/generated';
import { useSelectedReportAndFight } from '../../ReportFightContext';
import { fetchFriendlyBuffEvents } from '../../store/events_data/friendlyBuffEventsSlice';
import { selectReportFights } from '../../store/report/reportSelectors';
import {
  selectFriendlyBuffEvents,
  selectFriendlyBuffEventsLoading,
} from '../../store/selectors/eventsSelectors';
import { useAppDispatch } from '../../store/useAppDispatch';
import { BuffEvent } from '../../types/combatlogEvents';

export function useFriendlyBuffEvents(): {
  friendlyBuffEvents: BuffEvent[];
  isFriendlyBuffEventsLoading: boolean;
  selectedFight: FightFragment | null;
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
        fetchFriendlyBuffEvents({
          reportCode: reportId,
          fight: selectedFight,
          client,
          // Optional: you can customize the interval size
          // intervalSize: 60000, // 60 seconds
        }),
      );
    }
  }, [dispatch, reportId, selectedFight, client]);

  const friendlyBuffEvents = useSelector(selectFriendlyBuffEvents);
  const isFriendlyBuffEventsLoading = useSelector(selectFriendlyBuffEventsLoading);

  return React.useMemo(
    () => ({ friendlyBuffEvents, isFriendlyBuffEventsLoading, selectedFight }),
    [friendlyBuffEvents, isFriendlyBuffEventsLoading, selectedFight],
  );
}
