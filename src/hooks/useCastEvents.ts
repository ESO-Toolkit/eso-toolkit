import React from 'react';
import { useSelector } from 'react-redux';

import { useAuth } from '../AuthContext';
import { FightFragment } from '../graphql/generated';
import { fetchCastEvents } from '../store/events_data/castEventsSlice';
import { selectCastEvents, selectCastEventsLoading } from '../store/events_data/selectors';
import { selectReportFights } from '../store/report/reportSelectors';
import { useAppDispatch } from '../store/useAppDispatch';

import { useReportFightParams } from './useReportFightParams';

export function useCastEvents() {
  const { accessToken } = useAuth();
  const dispatch = useAppDispatch();
  const { reportId, fightId } = useReportFightParams();
  const fights = useSelector(selectReportFights) as FightFragment[] | null | undefined;

  // Get the specific fight from the report data
  const selectedFight = React.useMemo(() => {
    if (!fightId || !fights) return null;
    const fightIdNumber = parseInt(fightId, 10);
    return fights.find((fight: FightFragment) => fight.id === fightIdNumber) || null;
  }, [fightId, fights]);

  React.useEffect(() => {
    if (reportId && selectedFight && accessToken) {
      dispatch(
        fetchCastEvents({
          reportCode: reportId,
          fight: selectedFight,
          accessToken,
        })
      );
    }
  }, [dispatch, reportId, selectedFight, accessToken]);

  const castEvents = useSelector(selectCastEvents);
  const isCastEventsLoading = useSelector(selectCastEventsLoading);

  return React.useMemo(
    () => ({ castEvents, isCastEventsLoading, selectedFight }),
    [castEvents, isCastEventsLoading, selectedFight]
  );
}
