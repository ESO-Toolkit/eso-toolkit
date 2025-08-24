import React from 'react';
import { useSelector } from 'react-redux';

import { useEsoLogsClientInstance } from '../EsoLogsClientContext';
import { FightFragment } from '../graphql/generated';
import { fetchDeathEvents } from '../store/events_data/deathEventsSlice';
import { selectDeathEvents, selectDeathEventsLoading } from '../store/events_data/selectors';
import { selectReportFights } from '../store/report/reportSelectors';
import { useAppDispatch } from '../store/useAppDispatch';
import { DeathEvent } from '../types/combatlogEvents';

import { useReportFightParams } from './useReportFightParams';

export function useDeathEvents(): {
  deathEvents: DeathEvent[];
  isDeathEventsLoading: boolean;
  selectedFight: FightFragment | null;
} {
  const client = useEsoLogsClientInstance();
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
    if (reportId && selectedFight && client) {
      dispatch(
        fetchDeathEvents({
          reportCode: reportId,
          fight: selectedFight,
          client,
        })
      );
    }
  }, [dispatch, reportId, selectedFight, client]);

  const deathEvents = useSelector(selectDeathEvents);
  const isDeathEventsLoading = useSelector(selectDeathEventsLoading);

  return React.useMemo(
    () => ({ deathEvents, isDeathEventsLoading, selectedFight }),
    [deathEvents, isDeathEventsLoading, selectedFight]
  );
}
