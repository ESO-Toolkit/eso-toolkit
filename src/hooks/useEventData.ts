import React from 'react';
import { useSelector } from 'react-redux';

import { useEsoLogsClientInstance } from '../EsoLogsClientContext';
import { ReportActorFragment } from '../graphql/generated';
import { fetchDamageEvents } from '../store/events_data/damageEventsSlice';
import {
  selectAllEvents,
  selectDamageEvents,
  selectHealingEvents,
  selectBuffEvents,
  selectDeathEvents,
  selectCombatantInfoEvents,
  selectDebuffEvents,
  selectCastEvents,
  selectResourceEvents,
  selectDamageEventsLoading,
  selectHealingEventsLoading,
  selectBuffEventsLoading,
  selectDeathEventsLoading,
  selectCombatantInfoEventsLoading,
  selectDebuffEventsLoading,
  selectCastEventsLoading,
  selectResourceEventsLoading,
  selectEventPlayers,
} from '../store/events_data/selectors';
import { selectReportFights } from '../store/report/reportSelectors';
import { useAppDispatch } from '../store/useAppDispatch';
import {
  LogEvent,
  DamageEvent,
  HealEvent,
  BuffEvent,
  DeathEvent,
  CombatantInfoEvent,
  DebuffEvent,
  CastEvent,
  ResourceChangeEvent,
} from '../types/combatlogEvents';

import { useReportFightParams } from './useReportFightParams';

export function useEventData(): {
  allEvents: LogEvent[];
  eventPlayers: ReportActorFragment[];
  isAnyEventLoading: boolean;
  damageEvents: DamageEvent[];
  healingEvents: HealEvent[];
  buffEvents: BuffEvent[];
  deathEvents: DeathEvent[];
  combatantInfoEvents: CombatantInfoEvent[];
  debuffEvents: DebuffEvent[];
  castEvents: CastEvent[];
  resourceEvents: ResourceChangeEvent[];
  isDamageEventsLoading: boolean;
  isHealingEventsLoading: boolean;
  isBuffEventsLoading: boolean;
  isDeathEventsLoading: boolean;
  isCombatantInfoEventsLoading: boolean;
  isDebuffEventsLoading: boolean;
  isCastEventsLoading: boolean;
  isResourceEventsLoading: boolean;
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

  // Fetch damage events when we have all required data
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
  const allEvents = useSelector(selectAllEvents);
  const damageEvents = useSelector(selectDamageEvents);
  const healingEvents = useSelector(selectHealingEvents);
  const buffEvents = useSelector(selectBuffEvents);
  const deathEvents = useSelector(selectDeathEvents);
  const combatantInfoEvents = useSelector(selectCombatantInfoEvents);
  const debuffEvents = useSelector(selectDebuffEvents);
  const castEvents = useSelector(selectCastEvents);
  const resourceEvents = useSelector(selectResourceEvents);
  const eventPlayers = useSelector(selectEventPlayers);

  const isDamageEventsLoading = useSelector(selectDamageEventsLoading);
  const isHealingEventsLoading = useSelector(selectHealingEventsLoading);
  const isBuffEventsLoading = useSelector(selectBuffEventsLoading);
  const isDeathEventsLoading = useSelector(selectDeathEventsLoading);
  const isCombatantInfoEventsLoading = useSelector(selectCombatantInfoEventsLoading);
  const isDebuffEventsLoading = useSelector(selectDebuffEventsLoading);
  const isCastEventsLoading = useSelector(selectCastEventsLoading);
  const isResourceEventsLoading = useSelector(selectResourceEventsLoading);

  const isAnyEventLoading = React.useMemo(
    () =>
      isDamageEventsLoading ||
      isHealingEventsLoading ||
      isBuffEventsLoading ||
      isDeathEventsLoading ||
      isCombatantInfoEventsLoading ||
      isDebuffEventsLoading ||
      isCastEventsLoading ||
      isResourceEventsLoading,
    [
      isDamageEventsLoading,
      isHealingEventsLoading,
      isBuffEventsLoading,
      isDeathEventsLoading,
      isCombatantInfoEventsLoading,
      isDebuffEventsLoading,
      isCastEventsLoading,
      isResourceEventsLoading,
    ]
  );

  return React.useMemo(
    () => ({
      // Combined data
      allEvents,
      eventPlayers,
      isAnyEventLoading,

      // Individual event types
      damageEvents,
      healingEvents,
      buffEvents,
      deathEvents,
      combatantInfoEvents,
      debuffEvents,
      castEvents,
      resourceEvents,

      // Individual loading states
      isDamageEventsLoading,
      isHealingEventsLoading,
      isBuffEventsLoading,
      isDeathEventsLoading,
      isCombatantInfoEventsLoading,
      isDebuffEventsLoading,
      isCastEventsLoading,
      isResourceEventsLoading,
    }),
    [
      allEvents,
      eventPlayers,
      isAnyEventLoading,
      damageEvents,
      healingEvents,
      buffEvents,
      deathEvents,
      combatantInfoEvents,
      debuffEvents,
      castEvents,
      resourceEvents,
      isDamageEventsLoading,
      isHealingEventsLoading,
      isBuffEventsLoading,
      isDeathEventsLoading,
      isCombatantInfoEventsLoading,
      isDebuffEventsLoading,
      isCastEventsLoading,
      isResourceEventsLoading,
    ]
  );
}
