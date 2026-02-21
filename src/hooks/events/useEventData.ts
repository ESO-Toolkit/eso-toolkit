import React from 'react';
import { useSelector } from 'react-redux';

import { ReportActorFragment } from '../../graphql/gql/graphql';
import type { ReportFightContextInput } from '../../store/contextTypes';
import { selectActorsById } from '../../store/master_data/masterDataSelectors';
import type { RootState } from '../../store/storeWithHistory';
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
import { useFightForContext } from '../useFightForContext';
import { useResolvedReportFightContext } from '../useResolvedReportFightContext';

import { useCastEvents } from './useCastEvents';
import { useCombatantInfoEvents } from './useCombatantInfoEvents';
import { useDamageEvents } from './useDamageEvents';
import { useDeathEvents } from './useDeathEvents';
import { useDebuffEvents } from './useDebuffEvents';
import { useFriendlyBuffEvents } from './useFriendlyBuffEvents';
import { useHealingEvents } from './useHealingEvents';
import { useHostileBuffEvents } from './useHostileBuffEvents';
import { useResourceEvents } from './useResourceEvents';

interface UseEventDataOptions {
  context?: ReportFightContextInput;
}

export function useEventData(options?: UseEventDataOptions): {
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
  const context = useResolvedReportFightContext(options?.context);
  const selectedFight = useFightForContext(context);

  const { damageEvents, isDamageEventsLoading } = useDamageEvents({ context });
  const { healingEvents, isHealingEventsLoading } = useHealingEvents({ context });
  const { deathEvents, isDeathEventsLoading } = useDeathEvents({ context });
  const { combatantInfoEvents, isCombatantInfoEventsLoading } = useCombatantInfoEvents({ context });
  const { debuffEvents, isDebuffEventsLoading } = useDebuffEvents({ context });
  const { castEvents, isCastEventsLoading } = useCastEvents({ context });
  const { resourceEvents, isResourceEventsLoading } = useResourceEvents({ context });
  const { friendlyBuffEvents, isFriendlyBuffEventsLoading } = useFriendlyBuffEvents({ context });
  const { hostileBuffEvents, isHostileBuffEventsLoading } = useHostileBuffEvents({ context });

  const actorsById = useSelector((state: RootState) => selectActorsById(state));

  const allEvents = React.useMemo<LogEvent[]>(
    () => [
      ...damageEvents,
      ...healingEvents,
      ...deathEvents,
      ...combatantInfoEvents,
      ...debuffEvents,
      ...castEvents,
      ...resourceEvents,
      ...friendlyBuffEvents,
      ...hostileBuffEvents,
    ],
    [
      castEvents,
      combatantInfoEvents,
      damageEvents,
      deathEvents,
      debuffEvents,
      friendlyBuffEvents,
      healingEvents,
      hostileBuffEvents,
      resourceEvents,
    ],
  );

  const eventPlayers = React.useMemo(() => {
    if (!selectedFight) {
      return [];
    }

    return (selectedFight.friendlyPlayers ?? [])
      .map((id) => (id != null ? actorsById[id] : null))
      .filter((player): player is ReportActorFragment => Boolean(player));
  }, [actorsById, selectedFight]);

  const isAnyEventLoading = React.useMemo(
    () =>
      isDamageEventsLoading ||
      isHealingEventsLoading ||
      isDeathEventsLoading ||
      isCombatantInfoEventsLoading ||
      isDebuffEventsLoading ||
      isCastEventsLoading ||
      isResourceEventsLoading ||
      isFriendlyBuffEventsLoading ||
      isHostileBuffEventsLoading,
    [
      isDamageEventsLoading,
      isHealingEventsLoading,
      isDeathEventsLoading,
      isCombatantInfoEventsLoading,
      isDebuffEventsLoading,
      isCastEventsLoading,
      isResourceEventsLoading,
      isFriendlyBuffEventsLoading,
      isHostileBuffEventsLoading,
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
