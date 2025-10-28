import React from 'react';
import { useSelector } from 'react-redux';

import { useEsoLogsClientInstance } from '../../EsoLogsClientContext';
import { FightFragment } from '../../graphql/gql/graphql';
import { useSelectedReportAndFight } from '../../ReportFightContext';
import { fetchFriendlyBuffEvents } from '../../store/events_data/friendlyBuffEventsSlice';
import { selectReportFights } from '../../store/report/reportSelectors';
import {
  selectFriendlyBuffEvents,
  selectFriendlyBuffEventsLoading,
} from '../../store/selectors/eventsSelectors';
import { useAppDispatch } from '../../store/useAppDispatch';
import { BuffEvent } from '../../types/combatlogEvents';

interface UseFriendlyBuffEventsOptions {
  restrictToFightWindow?: boolean;
  intervalSize?: number;
}

export function useFriendlyBuffEvents(options?: UseFriendlyBuffEventsOptions): {
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

  const restrictToFightWindow = options?.restrictToFightWindow ?? true;
  const intervalSize = options?.intervalSize;

  React.useEffect(() => {
    if (reportId && selectedFight && client) {
      dispatch(
        fetchFriendlyBuffEvents({
          reportCode: reportId,
          fight: selectedFight,
          client,
          intervalSize,
          restrictToFightWindow,
        }),
      );
    }
  }, [dispatch, reportId, selectedFight, client, intervalSize, restrictToFightWindow]);

  const friendlyBuffEvents = useSelector(selectFriendlyBuffEvents);
  const isFriendlyBuffEventsLoading = useSelector(selectFriendlyBuffEventsLoading);

  return React.useMemo(
    () => ({ friendlyBuffEvents, isFriendlyBuffEventsLoading, selectedFight }),
    [friendlyBuffEvents, isFriendlyBuffEventsLoading, selectedFight],
  );
}
