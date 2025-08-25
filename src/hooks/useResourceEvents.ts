import React from 'react';
import { useSelector } from 'react-redux';

import { useEsoLogsClientInstance } from '../EsoLogsClientContext';
import { FightFragment } from '../graphql/generated';
import { fetchResourceEvents } from '../store/events_data/resourceEventsSlice';
import { selectResourceEvents, selectResourceEventsLoading } from '../store/events_data/selectors';
import { selectReportFights } from '../store/report/reportSelectors';
import { useAppDispatch } from '../store/useAppDispatch';
import { ResourceChangeEvent } from '../types/combatlogEvents';

import { useReportFightParams } from './useReportFightParams';

export function useResourceEvents(): {
  resourceEvents: ResourceChangeEvent[];
  isResourceEventsLoading: boolean;
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
    return fights.find((fight) => fight && fight.id === fightIdNumber) || null;
  }, [fightId, fights]);

  React.useEffect(() => {
    if (reportId && selectedFight) {
      dispatch(
        fetchResourceEvents({
          reportCode: reportId,
          fight: selectedFight,
          client,
        })
      );
    }
  }, [dispatch, reportId, selectedFight, client]);

  const resourceEvents = useSelector(selectResourceEvents);
  const isResourceEventsLoading = useSelector(selectResourceEventsLoading);

  return React.useMemo(
    () => ({ resourceEvents, isResourceEventsLoading, selectedFight }),
    [resourceEvents, isResourceEventsLoading, selectedFight]
  );
}
