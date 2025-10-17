import React from 'react';
import { useSelector } from 'react-redux';

import { useEsoLogsClientInstance } from '@/EsoLogsClientContext';
import { FightFragment } from '@/graphql/gql/graphql';
import { useSelectedReportAndFight } from '@/ReportFightContext';
import { fetchHealingEvents } from '@/store/events_data/healingEventsSlice';
import { selectReportFights } from '@/store/report/reportSelectors';
import { selectHealingEvents, selectHealingEventsLoading } from '@/store/selectors/eventsSelectors';
import { useAppDispatch } from '@/store/useAppDispatch';
import { HealEvent } from '@/types/combatlogEvents';

export function useHealingEvents(): {
  healingEvents: HealEvent[];
  isHealingEventsLoading: boolean;
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
        fetchHealingEvents({
          reportCode: reportId,
          fight: selectedFight,
          client,
        }),
      );
    }
  }, [dispatch, reportId, selectedFight, client]);

  const healingEvents = useSelector(selectHealingEvents);
  const isHealingEventsLoading = useSelector(selectHealingEventsLoading);

  return React.useMemo(
    () => ({ healingEvents, isHealingEventsLoading, selectedFight }),
    [healingEvents, isHealingEventsLoading, selectedFight],
  );
}
