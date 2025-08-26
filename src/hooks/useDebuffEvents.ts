<<<<<<< HEAD
import React from 'react';
import { useSelector } from 'react-redux';

import { useEsoLogsClientInstance } from '../EsoLogsClientContext';
import { FightFragment } from '../graphql/generated';
import { useSelectedReportAndFight } from '../ReportFightContext';
import { fetchDebuffEvents } from '../store/events_data/debuffEventsSlice';
import { selectDebuffEvents, selectDebuffEventsLoading } from '../store/events_data/selectors';
import { selectReportFights } from '../store/report/reportSelectors';
import { useAppDispatch } from '../store/useAppDispatch';
import { DebuffEvent } from '../types/combatlogEvents';

export function useDebuffEvents(): {
  debuffEvents: DebuffEvent[];
  isDebuffEventsLoading: boolean;
  selectedFight: FightFragment | null;
} {
  const client = useEsoLogsClientInstance();
  const dispatch = useAppDispatch();
  const { reportId, fightId } = useSelectedReportAndFight();
  const fights = useSelector(selectReportFights);

  // Get the specific fight from the report data
  const selectedFight = React.useMemo(() => {
    if (!fightId || !fights) return null;
    const fightIdNumber = parseInt(fightId, 10);
    return fights.find((fight) => fight && fight.id === fightIdNumber) || null;
  }, [fightId, fights]);

  React.useEffect(() => {
    if (reportId && selectedFight) {
      dispatch(
        fetchDebuffEvents({
          reportCode: reportId,
          fight: selectedFight,
          client,
        })
      );
    }
  }, [dispatch, reportId, selectedFight, client]);

  const debuffEvents = useSelector(selectDebuffEvents);
  const isDebuffEventsLoading = useSelector(selectDebuffEventsLoading);

  return React.useMemo(
    () => ({ debuffEvents, isDebuffEventsLoading, selectedFight }),
    [debuffEvents, isDebuffEventsLoading, selectedFight]
  );
}
=======
import React from 'react';
import { useSelector } from 'react-redux';

import { useAuth } from '../AuthContext';
import { fetchDebuffEvents } from '../store/events_data/debuffEventsSlice';
import { selectDebuffEvents, selectDebuffEventsLoading } from '../store/events_data/selectors';
import { selectReportFights } from '../store/report/reportSelectors';
import { useAppDispatch } from '../store/useAppDispatch';

import { useReportFightParams } from './useReportFightParams';

export function useDebuffEvents() {
  const { accessToken } = useAuth();
  const dispatch = useAppDispatch();
  const { reportId, fightId } = useReportFightParams();
  const fights = useSelector(selectReportFights);

  // Get the specific fight from the report data
  const selectedFight = React.useMemo(() => {
    if (!fightId || !fights) return null;
    const fightIdNumber = parseInt(fightId, 10);
    return fights.find((fight) => fight.id === fightIdNumber) || null;
  }, [fightId, fights]);

  React.useEffect(() => {
    if (reportId && selectedFight && accessToken) {
      dispatch(
        fetchDebuffEvents({
          reportCode: reportId,
          fight: selectedFight,
          accessToken,
        })
      );
    }
  }, [dispatch, reportId, selectedFight, accessToken]);

  const debuffEvents = useSelector(selectDebuffEvents);
  const isDebuffEventsLoading = useSelector(selectDebuffEventsLoading);

  return React.useMemo(
    () => ({ debuffEvents, isDebuffEventsLoading, selectedFight }),
    [debuffEvents, isDebuffEventsLoading, selectedFight]
  );
}
>>>>>>> pr-21
