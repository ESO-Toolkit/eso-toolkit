import React from 'react';
import { useSelector } from 'react-redux';

import { useEsoLogsClientInstance } from '../../EsoLogsClientContext';
import { FightFragment } from '../../graphql/generated';
import { useSelectedReportAndFight } from '../../ReportFightContext';
import { fetchCastEvents } from '../../store/events_data/castEventsSlice';
import { selectReportFights } from '../../store/report/reportSelectors';
import { selectCastEvents, selectCastEventsLoading } from '../../store/selectors/eventsSelectors';
import { useAppDispatch } from '../../store/useAppDispatch';

export function useCastEvents(): {
  castEvents: ReturnType<typeof selectCastEvents>;
  isCastEventsLoading: ReturnType<typeof selectCastEventsLoading>;
  selectedFight: FightFragment | null;
} {
  const dispatch = useAppDispatch();
  const { reportId, fightId } = useSelectedReportAndFight();
  const fights = useSelector(selectReportFights) as FightFragment[] | null | undefined;
  const client = useEsoLogsClientInstance();

  // Get the specific fight from the report data
  const selectedFight = React.useMemo(() => {
    if (!fightId || !fights) return null;
    const fightIdNumber = parseInt(fightId, 10);
    return fights.find((fight: FightFragment) => fight.id === fightIdNumber) || null;
  }, [fightId, fights]);

  React.useEffect(() => {
    if (reportId && selectedFight) {
      dispatch(
        fetchCastEvents({
          reportCode: reportId,
          fight: selectedFight,
          client,
        })
      );
    }
  }, [dispatch, reportId, selectedFight, client]);

  const castEvents = useSelector(selectCastEvents);
  const isCastEventsLoading = useSelector(selectCastEventsLoading);

  return React.useMemo(
    () => ({ castEvents, isCastEventsLoading, selectedFight }),
    [castEvents, isCastEventsLoading, selectedFight]
  );
}
