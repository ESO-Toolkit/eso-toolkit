import { createSelector } from '@reduxjs/toolkit';

import {
  selectOptimizedDamageEvents,
  selectOptimizedHealingEvents,
  selectAllEvents,
  selectEventPlayers,
  selectEventCharacters,
  selectEventsLoadingState,
} from './events/eventsSelectors';
import {
  selectMasterData,
  selectActorsById,
  selectMasterDataLoadingState,
} from './master_data/masterDataSelectors';
import { selectCombinedReportData } from './report/reportSelectors';

// CROSS-SLICE OPTIMIZED SELECTORS
// These selectors combine data from multiple slices for optimal component performance

// Damage panel optimized data - single selector for all needed data
export const selectDamagePanelData = createSelector(
  [selectOptimizedDamageEvents, selectEventPlayers, selectEventCharacters, selectMasterData],
  (damageEvents, players, characters, masterData) => ({
    events: damageEvents,
    players,
    characters,
    masterData,
  })
);

// Healing panel optimized data - single selector for all needed data
export const selectHealingPanelData = createSelector(
  [selectOptimizedHealingEvents, selectEventPlayers, selectEventCharacters, selectMasterData],
  (healingEvents, players, characters, masterData) => ({
    events: healingEvents,
    players,
    characters,
    masterData,
  })
);

// Fight details optimized data - combine frequently used selectors
export const selectFightDetailsData = createSelector(
  [selectAllEvents, selectActorsById, selectEventsLoadingState, selectMasterDataLoadingState],
  (events, actorsById, eventsState, masterDataState) => ({
    events,
    actorsById,
    eventsLoaded: eventsState.loaded,
    eventsLoading: eventsState.loading,
    masterDataLoaded: masterDataState.loaded,
    currentFetchFightId: eventsState.currentFetchFightId,
  })
);

// Report fight details data - combine report and master data states
export const selectReportFightDetailsData = createSelector(
  [selectCombinedReportData, selectMasterDataLoadingState, selectEventsLoadingState],
  (report, masterDataState, eventsState) => ({
    fights: report.fights,
    fightsLoading: report.loading,
    fightsError: report.error,
    currentReportId: report.reportId,
    masterDataLoaded: masterDataState.loaded,
    masterDataLoading: masterDataState.loading,
    masterDataError: masterDataState.error,
    eventsLoading: eventsState.loading,
    currentFetchFightId: eventsState.currentFetchFightId,
  })
);

// Location heatmap optimized data
export const selectLocationHeatmapData = createSelector(
  [selectAllEvents, selectActorsById, selectEventPlayers],
  (events, actorsById, eventPlayers) => ({
    events,
    actorsById,
    eventPlayers,
  })
);

// Player details optimized data (for penetration/critical damage panels)
export const selectPlayerDetailsData = createSelector(
  [selectAllEvents, selectEventPlayers, selectActorsById],
  (events, eventPlayers, actorsById) => ({
    events,
    eventPlayers,
    actorsById,
  })
);
