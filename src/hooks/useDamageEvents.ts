import React from 'react';
import { useSelector } from 'react-redux';

import { useEsoLogsClientInstance } from '../EsoLogsClientContext';
import { FightFragment } from '../graphql/generated';
import { useSelectedReportAndFight } from '../ReportFightContext';
import { fetchDamageEvents } from '../store/events_data/damageEventsSlice';
import { selectReportFights } from '../store/report/reportSelectors';
import { selectDamageEvents, selectDamageEventsLoading } from '../store/selectors/eventsSelectors';
import { useAppDispatch } from '../store/useAppDispatch';
import { DamageEvent } from '../types/combatlogEvents';

export function useDamageEvents(): {
  damageEvents: DamageEvent[];
  isDamageEventsLoading: boolean;
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
        fetchDamageEvents({
          reportCode: reportId,
          fight: selectedFight,
          client,
        })
      );
    }
  }, [dispatch, reportId, selectedFight, client]);

  const damageEvents = useSelector(selectDamageEvents);
  const isDamageEventsLoading = useSelector(selectDamageEventsLoading);

  return React.useMemo(
    () => ({ damageEvents, isDamageEventsLoading, selectedFight }),
    [damageEvents, isDamageEventsLoading, selectedFight]
  );
}
