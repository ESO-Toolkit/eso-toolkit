import { createSelector } from '@reduxjs/toolkit';

import {
  BuffEvent,
  CastEvent,
  CombatantInfoEvent,
  DamageEvent,
  DeathEvent,
  DebuffEvent,
  HealEvent,
  ResourceChangeEvent,
} from '../../types/combatlogEvents.d';
import { selectActorsById } from '../master_data/masterDataSelectors';
import { selectReport } from '../report/reportSelectors';
import { RootState } from '../storeWithHistory';

// Basic event selectors for the new modular structure
export const selectEvents = (state: RootState): RootState['events'] => state.events;
export const selectDamageEvents = (state: RootState): DamageEvent[] => state.events.damage.events;
export const selectHealingEvents = (state: RootState): HealEvent[] => state.events.healing.events;
export const selectBuffEvents = (state: RootState): BuffEvent[] => state.events.buffs.events;
export const selectDeathEvents = (state: RootState): DeathEvent[] => state.events.deaths.events;
export const selectCombatantInfoEvents = (state: RootState): CombatantInfoEvent[] =>
  state.events.combatantInfo.events;
export const selectDebuffEvents = (state: RootState): DebuffEvent[] => state.events.debuffs.events;
export const selectCastEvents = (state: RootState): CastEvent[] => state.events.casts.events;
export const selectResourceEvents = (state: RootState): ResourceChangeEvent[] =>
  state.events.resources.events;

// Loading state selectors
export const selectDamageEventsLoading = (state: RootState): boolean => state.events.damage.loading;
export const selectHealingEventsLoading = (state: RootState): boolean =>
  state.events.healing.loading;
export const selectBuffEventsLoading = (state: RootState): boolean => state.events.buffs.loading;
export const selectBuffEventsProgress = (
  state: RootState
): { total: number; completed: number; failed: number } => state.events.buffs.intervalProgress;
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
    selectBuffEvents,
    selectDeathEvents,
    selectCombatantInfoEvents,
    selectDebuffEvents,
    selectCastEvents,
    selectResourceEvents,
  ],
  (
    damageEvents,
    healingEvents,
    buffEvents,
    deathEvents,
    combatantInfoEvents,
    debuffEvents,
    castEvents,
    resourceEvents
  ) => [
    ...damageEvents,
    ...healingEvents,
    ...buffEvents,
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
    selectBuffEventsLoading,
    selectDeathEventsLoading,
    selectCombatantInfoEventsLoading,
    selectDebuffEventsLoading,
    selectCastEventsLoading,
    selectResourceEventsLoading,
  ],
  (
    damageLoading,
    healingLoading,
    buffLoading,
    deathLoading,
    combatantInfoLoading,
    debuffLoading,
    castLoading,
    resourceLoading
  ) => ({
    damage: damageLoading,
    healing: healingLoading,
    buffs: buffLoading,
    deaths: deathLoading,
    combatantInfo: combatantInfoLoading,
    debuffs: debuffLoading,
    casts: castLoading,
    resources: resourceLoading,
  })
);
