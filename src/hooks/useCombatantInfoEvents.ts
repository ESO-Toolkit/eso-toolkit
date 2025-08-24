import React from 'react';
import { useSelector } from 'react-redux';

import { useAuth } from '../AuthContext';
import { FightFragment } from '../graphql/generated';
import { fetchCombatantInfoEvents } from '../store/events_data/combatantInfoEventsSlice';
import {
  selectCombatantInfoEvents,
  selectCombatantInfoEventsLoading,
} from '../store/events_data/selectors';
import { selectReportFights } from '../store/report/reportSelectors';
import { useAppDispatch } from '../store/useAppDispatch';
import { CombatantInfoEvent } from '../types/combatlogEvents';

import { useReportFightParams } from './useReportFightParams';

export function useCombatantInfoEvents(): {
  combatantInfoEvents: CombatantInfoEvent[];
  isCombatantInfoEventsLoading: boolean;
  selectedFight: FightFragment | null;
} {
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
        fetchCombatantInfoEvents({
          reportCode: reportId,
          fight: selectedFight,
          accessToken,
        })
      );
    }
  }, [dispatch, reportId, selectedFight, accessToken]);

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
