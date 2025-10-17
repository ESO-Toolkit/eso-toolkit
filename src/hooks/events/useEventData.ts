import React from 'react';
import { useSelector } from 'react-redux';

import { useEsoLogsClientInstance } from '../../EsoLogsClientContext';
import { ReportActorFragment } from '../../graphql/gql/graphql';
import { useSelectedReportAndFight } from '../../ReportFightContext';
import { fetchDamageEvents } from '../../store/events_data/damageEventsSlice';
import { selectReportFights } from '../../store/report/reportSelectors';
import {
  selectAllEvents,
  selectDamageEvents,
  selectHealingEvents,
  selectDeathEvents,
  selectCombatantInfoEvents,
  selectDebuffEvents,
  selectCastEvents,
  selectResourceEvents,
  selectDamageEventsLoading,
  selectHealingEventsLoading,
  selectDeathEventsLoading,
  selectCombatantInfoEventsLoading,
  selectDebuffEventsLoading,
  selectCastEventsLoading,
  selectResourceEventsLoading,
  selectEventPlayers,
} from '../../store/selectors/eventsSelectors';
import { useAppDispatch } from '../../store/useAppDispatch';
import {
  LogEvent,
  DamageEvent,
  HealEvent,
  DeathEvent,
  CombatantInfoEvent,
  DebuffEvent,
  ResourceChangeEvent,
  UnifiedCastEvent,
} from '../../types/combatlogEvents';

export function useEventData(): {
  allEvents: LogEvent[];
  eventPlayers: ReportActorFragment[];
  isAnyEventLoading: boolean;
  damageEvents: DamageEvent[];
  healingEvents: HealEvent[];
  deathEvents: DeathEvent[];
  combatantInfoEvents: CombatantInfoEvent[];
  debuffEvents: DebuffEvent[];
  castEvents: UnifiedCastEvent[];
  resourceEvents: ResourceChangeEvent[];
  isDamageEventsLoading: boolean;
  isHealingEventsLoading: boolean;
  isDeathEventsLoading: boolean;
  isCombatantInfoEventsLoading: boolean;
  isDebuffEventsLoading: boolean;
  isCastEventsLoading: boolean;
  isResourceEventsLoading: boolean;
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

  // Fetch damage events when we have all required data
  React.useEffect(() => {
    if (reportId && selectedFight) {
      dispatch(
        fetchDamageEvents({
          reportCode: reportId,
          fight: selectedFight,
          client,
        }),
      );
    }
  }, [dispatch, reportId, selectedFight, client]);
  const allEvents = useSelector(selectAllEvents);
  const damageEvents = useSelector(selectDamageEvents);
  const healingEvents = useSelector(selectHealingEvents);
  const deathEvents = useSelector(selectDeathEvents);
  const combatantInfoEvents = useSelector(selectCombatantInfoEvents);
  const debuffEvents = useSelector(selectDebuffEvents);
  const castEvents = useSelector(selectCastEvents);
  const resourceEvents = useSelector(selectResourceEvents);
  const eventPlayers = useSelector(selectEventPlayers);

  const isDamageEventsLoading = useSelector(selectDamageEventsLoading);
  const isHealingEventsLoading = useSelector(selectHealingEventsLoading);
  const isDeathEventsLoading = useSelector(selectDeathEventsLoading);
  const isCombatantInfoEventsLoading = useSelector(selectCombatantInfoEventsLoading);
  const isDebuffEventsLoading = useSelector(selectDebuffEventsLoading);
  const isCastEventsLoading = useSelector(selectCastEventsLoading);
  const isResourceEventsLoading = useSelector(selectResourceEventsLoading);

  const isAnyEventLoading = React.useMemo(
    () =>
      isDamageEventsLoading ||
      isHealingEventsLoading ||
      isDeathEventsLoading ||
      isCombatantInfoEventsLoading ||
      isDebuffEventsLoading ||
      isCastEventsLoading ||
      isResourceEventsLoading,
    [
      isDamageEventsLoading,
      isHealingEventsLoading,
      isDeathEventsLoading,
      isCombatantInfoEventsLoading,
      isDebuffEventsLoading,
      isCastEventsLoading,
      isResourceEventsLoading,
    ],
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
      deathEvents,
      combatantInfoEvents,
      debuffEvents,
      castEvents,
      resourceEvents,

      // Individual loading states
      isDamageEventsLoading,
      isHealingEventsLoading,
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
      deathEvents,
      combatantInfoEvents,
      debuffEvents,
      castEvents,
      resourceEvents,
      isDamageEventsLoading,
      isHealingEventsLoading,
      isDeathEventsLoading,
      isCombatantInfoEventsLoading,
      isDebuffEventsLoading,
      isCastEventsLoading,
      isResourceEventsLoading,
    ],
  );
}
