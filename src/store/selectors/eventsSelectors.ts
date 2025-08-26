import { createSelector } from '@reduxjs/toolkit';

import {
  BuffEvent,
  CombatantInfoEvent,
  DamageEvent,
  DeathEvent,
  DebuffEvent,
  HealEvent,
  ResourceChangeEvent,
  UnifiedCastEvent,
} from '../../types/combatlogEvents';
import { selectActorsById } from '../master_data/masterDataSelectors';
import { selectReport } from '../report/reportSelectors';
import { RootState } from '../storeWithHistory';

// Basic event selectors for the new modular structure
export const selectEvents = (state: RootState): RootState['events'] => state.events;
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

// Player/combatant selectors
// Assumes there is a selected fight in report.selectedFight or similar
export const selectEventPlayers = createSelector(
  [selectActorsById, selectReport],
  (actorsById, report) => {
    // Default to first fight if no selectedFightId
    const fight = report.data?.fights?.[0];
    const friendlyPlayers = fight?.friendlyPlayers ?? [];
    return friendlyPlayers
      .filter((id): id is number => typeof id === 'number' && id !== null)
      .map((id) => actorsById[id])
      .filter(Boolean);
  }
);

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
export const selectEventsLoadingState = createSelector(
  [
    selectDamageEventsLoading,
    selectHealingEventsLoading,
    selectDeathEventsLoading,
    selectCombatantInfoEventsLoading,
    selectDebuffEventsLoading,
    selectCastEventsLoading,
    selectResourceEventsLoading,
  ],
  (
    damageLoading,
    healingLoading,
    deathLoading,
    combatantInfoLoading,
    debuffLoading,
    castLoading,
    resourceLoading
  ) => ({
    damage: damageLoading,
    healing: healingLoading,
    deaths: deathLoading,
    combatantInfo: combatantInfoLoading,
    debuffs: debuffLoading,
    casts: castLoading,
    resources: resourceLoading,
  })
);
