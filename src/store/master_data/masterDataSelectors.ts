import { createSelector } from '@reduxjs/toolkit';

import { RootState } from '../storeWithHistory';

// MASTER DATA SELECTORS - Read from masterData slice

export const selectMasterData = (state: RootState) => state.masterData;
export const selectActorsById = (state: RootState) => state.masterData.actorsById;
export const selectAbilitiesById = (state: RootState) => state.masterData.abilitiesById;

// Master data loading state
export const selectMasterDataLoadingState = createSelector([selectMasterData], (masterData) => ({
  loading: masterData.loading,
  loadingMasterData: masterData.loadingStates.masterData,
  loadingPlayersOnly: masterData.loadingStates.playersOnly,
  loaded: masterData.loaded,
  error: masterData.error,
  // OPTIMIZED: Expose cache metadata
  cacheMetadata: masterData.cacheMetadata,
}));

// Combined master data selector
export const selectCombinedMasterData = createSelector([selectMasterData], (masterData) => ({
  actorsById: masterData.actorsById,
  abilitiesById: masterData.abilitiesById,
  loading: masterData.loading,
  loaded: masterData.loaded,
  error: masterData.error,
}));

// Player actors only (optimized for player-focused components)
export const selectPlayerActors = createSelector([selectActorsById], (actorsById) => {
  const playerActors: typeof actorsById = {};
  Object.entries(actorsById).forEach(([id, actor]) => {
    if (actor.type === 'Player') {
      playerActors[id] = actor;
    }
  });
  return playerActors;
});
