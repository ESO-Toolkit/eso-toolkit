import { createSelector } from '@reduxjs/toolkit';

import { FightFragment } from '../../graphql/generated';
import {
  UnifiedCastEvent,
  DamageEvent,
  HealEvent,
  BuffEvent,
  DeathEvent,
  CombatantInfoEvent,
  DebuffEvent,
  ResourceChangeEvent,
} from '../../types/combatlogEvents';
import { createBuffLookup, createDebuffLookup, BuffLookupData } from '../../utils/BuffLookupUtils';
import { selectActorsById } from '../master_data/masterDataSelectors';
import { selectReportFights } from '../report/reportSelectors';
import { RootState } from '../storeWithHistory';

// Basic event selectors for the new modular structure

export const selectDamageEvents = (state: RootState): DamageEvent[] => state.events.damage.events;
export const selectHealingEvents = (state: RootState): HealEvent[] => state.events.healing.events;
export const selectFriendlyBuffEvents = (state: RootState): BuffEvent[] =>
  state.events.friendlyBuffs.events;
export const selectHostileBuffEvents = (state: RootState): BuffEvent[] =>
  state.events.hostileBuffs.events;
export const selectDeathEvents = (state: RootState): DeathEvent[] => state.events.deaths.events;
export const selectCombatantInfoEvents = (state: RootState): CombatantInfoEvent[] =>
  state.events.combatantInfo.events;
export const selectDebuffEvents = (state: RootState): DebuffEvent[] => state.events.debuffs.events;
export const selectCastEvents = (state: RootState): UnifiedCastEvent[] => state.events.casts.events;
export const selectResourceEvents = (state: RootState): ResourceChangeEvent[] =>
  state.events.resources.events;

// Loading state selectors
export const selectDamageEventsLoading = (state: RootState): boolean => state.events.damage.loading;
export const selectHealingEventsLoading = (state: RootState): boolean =>
  state.events.healing.loading;
export const selectFriendlyBuffEventsLoading = (state: RootState): boolean =>
  state.events.friendlyBuffs.loading;
export const selectHostileBuffEventsLoading = (state: RootState): boolean =>
  state.events.hostileBuffs.loading;
export const selectDeathEventsLoading = (state: RootState): boolean => state.events.deaths.loading;
export const selectCombatantInfoEventsLoading = (state: RootState): boolean =>
  state.events.combatantInfo.loading;
export const selectDebuffEventsLoading = (state: RootState): boolean =>
  state.events.debuffs.loading;
export const selectCastEventsLoading = (state: RootState): boolean => state.events.casts.loading;
export const selectResourceEventsLoading = (state: RootState): boolean =>
  state.events.resources.loading;

// Selector to get the currently selected fight ID from router state
export const selectSelectedFightId = (state: RootState): string | null => {
  const location = state.router?.location;
  if (!location?.pathname) return null;

  // Parse the pathname to extract fightId
  // Expected format: /report/:reportId/fight/:fightId
  const pathParts = location.pathname.split('/').filter(Boolean);
  const fightIndex = pathParts.indexOf('fight');

  if (fightIndex !== -1 && fightIndex + 1 < pathParts.length) {
    return pathParts[fightIndex + 1];
  }

  return null;
};

// Helper selector to get the currently selected fight from Redux state
export const selectCurrentFight = createSelector(
  [selectReportFights, selectSelectedFightId],
  (fights, fightId): FightFragment | null => {
    if (!fightId || !fights) return null;

    return fights.find((fight) => String(fight?.id) === String(fightId)) || null;
  }
);

// Player/combatant selectors
// Updated to use the currently selected fight from Redux state
export const selectEventPlayers = createSelector(
  [selectActorsById, selectCurrentFight],
  (actorsById, fight) => {
    const friendlyPlayers = fight?.friendlyPlayers ?? [];
    return friendlyPlayers
      .filter((id): id is number => typeof id === 'number' && id !== null)
      .map((id) => actorsById[id])
      .filter(Boolean);
  }
);

// Parameterized version for backward compatibility (when you need a specific fight)

// Combined selectors
export const selectAllEvents = createSelector(
  [
    selectDamageEvents,
    selectHealingEvents,
    selectDeathEvents,
    selectCombatantInfoEvents,
    selectDebuffEvents,
    selectCastEvents,
    selectResourceEvents,
  ],
  (
    damageEvents,
    healingEvents,
    deathEvents,
    combatantInfoEvents,
    debuffEvents,
    castEvents,
    resourceEvents
  ) => [
    ...damageEvents,
    ...healingEvents,
    ...deathEvents,
    ...combatantInfoEvents,
    ...debuffEvents,
    ...castEvents,
    ...resourceEvents,
  ]
);

// Loading state selectors

/**
 * Traditional selector for friendly buff lookup data with loading state.
 * Uses the currently selected fight from Redux state.
 *
 * @deprecated Use useSelectFriendlyBuffLookup() hook for worker-based calculation
 */

/**
 * Selector for hostile buff lookup data with loading state.
 * Uses a specific fight by ID instead of defaulting to fights[0].
 */

/**
 * Selector for hostile buff lookup data with loading state.
 * Uses the currently selected fight from Redux state.
 */
export const selectHostileBuffLookup = createSelector(
  [selectHostileBuffEvents, selectHostileBuffEventsLoading, selectCurrentFight],
  (buffEvents, isLoading, fight): BuffLookupData => {
    if (isLoading || !buffEvents || buffEvents.length === 0) {
      return { buffIntervals: {} };
    }

    // Get fight end time for proper buff duration handling
    const fightEndTime = fight?.endTime;

    return createBuffLookup(buffEvents, fightEndTime);
  }
);

/**
 * Selector for debuff lookup data with loading state.
 * Uses a specific fight by ID instead of defaulting to fights[0].
 */

/**
 * Selector for debuff lookup data with loading state.
 * Uses the currently selected fight from Redux state.
 */
export const selectDebuffLookup = createSelector(
  [selectDebuffEvents, selectDebuffEventsLoading, selectCurrentFight],
  (debuffEvents, isLoading, fight): BuffLookupData => {
    if (isLoading || !debuffEvents || debuffEvents.length === 0) {
      return { buffIntervals: {} };
    }

    // Get fight end time for proper debuff duration handling
    const fightEndTime = fight?.endTime;

    return createDebuffLookup(debuffEvents, fightEndTime);
  }
);
