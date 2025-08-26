import React from 'react';
import { useSelector } from 'react-redux';

import { useEsoLogsClientInstance } from '../EsoLogsClientContext';
import { FightFragment } from '../graphql/generated';
import { useSelectedReportAndFight } from '../ReportFightContext';
import { fetchCombatantInfoEvents } from '../store/events_data/combatantInfoEventsSlice';
import { selectReportFights } from '../store/report/reportSelectors';
import {
  selectCombatantInfoEvents,
  selectCombatantInfoEventsLoading,
} from '../store/selectors/eventsSelectors';
import { useAppDispatch } from '../store/useAppDispatch';
import { CombatantInfoEvent } from '../types/combatlogEvents';

export function useCombatantInfoEvents(): {
  combatantInfoEvents: CombatantInfoEvent[];
  isCombatantInfoEventsLoading: boolean;
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
    return fights.find((fight) => fight?.id === fightIdNumber) || null;
  }, [fightId, fights]);

  React.useEffect(() => {
    if (reportId && selectedFight) {
      dispatch(
        fetchCombatantInfoEvents({
          reportCode: reportId,
          fight: selectedFight,
          client,
        })
      );
    }
  }, [dispatch, reportId, selectedFight, client]);

  const combatantInfoEvents = useSelector(selectCombatantInfoEvents);
  const isCombatantInfoEventsLoading = useSelector(selectCombatantInfoEventsLoading);

  return React.useMemo(
    () => ({
      combatantInfoEvents,
      isCombatantInfoEventsLoading,
      selectedFight,
    }),
    [combatantInfoEvents, isCombatantInfoEventsLoading, selectedFight]
  );
}
