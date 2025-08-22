import { createSelector } from '@reduxjs/toolkit';

import { RootState } from '../storeWithHistory';

// EVENTS SELECTORS - Read from events slice

// Basic event selectors
export const selectEvents = (state: RootState) => state.events;
export const selectAllEvents = (state: RootState) => state.events.events;
export const selectDamageEvents = (state: RootState) => state.events.damageEvents;
export const selectHealingEvents = (state: RootState) => state.events.healingEvents;
export const selectBuffEvents = (state: RootState) => state.events.buffEvents;
export const selectEventPlayers = (state: RootState) => state.events.players;
export const selectEventCharacters = (state: RootState) => state.events.characters;

// Events loading states - combined to reduce multiple useSelector calls
export const selectEventsLoadingState = createSelector([selectEvents], (events) => ({
  // OPTIMIZED: Use granular loading states
  loading: events.loadingStates.events,
  loadingDamage: events.loadingStates.damageEvents,
  loadingHealing: events.loadingStates.healingEvents,
  loadingBuffs: events.loadingStates.buffEvents,
  loaded: events.loaded,
  // OPTIMIZED: Use granular error states
  errors: events.errors,
  currentFetchFightId: events.currentFetchFightId,
  shouldExecuteFetch: events.shouldExecuteFetch,
  // OPTIMIZED: Expose cache metadata
  cacheMetadata: events.cacheMetadata,
}));

// Combined events data selector for components that need multiple event types
export const selectCombinedEventsData = createSelector(
  [
    selectAllEvents,
    selectDamageEvents,
    selectHealingEvents,
    selectBuffEvents,
    selectEventPlayers,
    selectEventCharacters,
  ],
  (allEvents, damageEvents, healingEvents, buffEvents, players, characters) => ({
    allEvents,
    damageEvents,
    healingEvents,
    buffEvents,
    players,
    characters,
  })
);

// Optimized damage events selector with fallback
export const selectOptimizedDamageEvents = createSelector(
  [selectDamageEvents, selectAllEvents],
  (damageEvents, allEvents) => {
    if (damageEvents.length > 0) {
      return damageEvents;
    }
    // Fallback: filter all events client-side if no optimized events available
    return allEvents.filter((event) => event.type === 'damage');
  }
);

// Optimized healing events selector with fallback
export const selectOptimizedHealingEvents = createSelector(
  [selectHealingEvents, selectAllEvents],
  (healingEvents, allEvents) => {
    if (healingEvents.length > 0) {
      return healingEvents;
    }
    // Fallback: filter all events client-side if no optimized events available
    return allEvents.filter((event) => event.type === 'heal');
  }
);
