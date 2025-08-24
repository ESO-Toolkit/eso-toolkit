import { createSelector } from '@reduxjs/toolkit';

import { selectActorsById } from '../master_data/masterDataSelectors';
import { selectReport } from '../report/reportSelectors';
import { RootState } from '../storeWithHistory';

// Basic event selectors for the new modular structure
export const selectEvents = (state: RootState) => state.events;
export const selectDamageEvents = (state: RootState) => state.events.damage.events;
export const selectHealingEvents = (state: RootState) => state.events.healing.events;
export const selectBuffEvents = (state: RootState) => state.events.buffs.events;
export const selectDeathEvents = (state: RootState) => state.events.deaths.events;
export const selectCombatantInfoEvents = (state: RootState) => state.events.combatantInfo.events;
export const selectDebuffEvents = (state: RootState) => state.events.debuffs.events;
export const selectCastEvents = (state: RootState) => state.events.casts.events;
export const selectResourceEvents = (state: RootState) => state.events.resources.events;

// Loading state selectors
export const selectDamageEventsLoading = (state: RootState) => state.events.damage.loading;
export const selectHealingEventsLoading = (state: RootState) => state.events.healing.loading;
export const selectBuffEventsLoading = (state: RootState) => state.events.buffs.loading;
export const selectDeathEventsLoading = (state: RootState) => state.events.deaths.loading;
export const selectCombatantInfoEventsLoading = (state: RootState) =>
  state.events.combatantInfo.loading;
export const selectDebuffEventsLoading = (state: RootState) => state.events.debuffs.loading;
export const selectCastEventsLoading = (state: RootState) => state.events.casts.loading;
export const selectResourceEventsLoading = (state: RootState) => state.events.resources.loading;

// Player/combatant selectors
// Assumes there is a selected fight in report.selectedFight or similar
export const selectEventPlayers = createSelector(
  [selectActorsById, selectReport],
  (actorsById, report) => {
    // Default to first fight if no selectedFightId
    const fight = report.fights?.[0];
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
