import React from 'react';
import { useSelector } from 'react-redux';

import { useEsoLogsClientContext } from '../../EsoLogsClientContext';
import { FightFragment } from '../../graphql/gql/graphql';
import { useSelectedReportAndFight } from '../../ReportFightContext';
import { fetchCastEvents } from '../../store/events_data/castEventsSlice';
import { selectCastEvents, selectCastEventsLoading } from '../../store/selectors/eventsSelectors';
import { useAppDispatch } from '../../store/useAppDispatch';
import { useSelectedFight } from '../useSelectedFight';

interface UseCastEventsOptions {
  restrictToFightWindow?: boolean;
}

export function useCastEvents(options?: UseCastEventsOptions): {
  castEvents: ReturnType<typeof selectCastEvents>;
  isCastEventsLoading: ReturnType<typeof selectCastEventsLoading>;
  selectedFight: FightFragment | null;
} {
  const dispatch = useAppDispatch();
  const { reportId } = useSelectedReportAndFight();

  const { client, isReady, isLoggedIn } = useEsoLogsClientContext();

  // Get the specific fight from the report data
  const selectedFight = useSelectedFight();

  const restrictToFightWindow = options?.restrictToFightWindow ?? true;

  React.useEffect(() => {
    // Only fetch if client is ready, user is logged in, and we have required data
    if (reportId && selectedFight && isReady && isLoggedIn && client) {
      dispatch(
        fetchCastEvents({
          reportCode: reportId,
          fight: selectedFight,
          client,
          restrictToFightWindow,
        }),
      );
    }
  }, [dispatch, reportId, selectedFight, client, isReady, isLoggedIn, restrictToFightWindow]);

  const castEvents = useSelector(selectCastEvents);
  const isCastEventsLoading = useSelector(selectCastEventsLoading);

  return React.useMemo(
    () => ({ castEvents, isCastEventsLoading, selectedFight }),
    [castEvents, isCastEventsLoading, selectedFight],
  );
}
