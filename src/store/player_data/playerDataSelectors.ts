import { createSelector } from '@reduxjs/toolkit';

import { RootState } from '../storeWithHistory';

// PLAYER DATA SELECTORS - Read from playerData slice

export const selectPlayerData = (state: RootState) => state.playerData;
export const selectPlayersById = (state: RootState) => state.playerData.playersById;

// Player data loading state
export const selectPlayerDataLoadingState = createSelector(
  [selectPlayerData],
  (playerData) => playerData.loading
);

// Player data error state
export const selectPlayerDataErrorState = createSelector(
  [selectPlayerData],
  (playerData) => playerData.error
);

// Combined player data selector
export const selectCombinedPlayerData = createSelector([selectPlayerData], (playerData) => ({
  playersById: playerData.playersById,
  loading: playerData.loading,
  loaded: playerData.loaded,
  error: playerData.error,
}));

// Get all players as an array
export const selectPlayersArray = createSelector([selectPlayersById], (playersById) =>
  Object.values(playersById)
);

// Get player by ID
export const selectPlayerById = (playerId: string | number) =>
  createSelector([selectPlayersById], (playersById) => playersById[playerId]);
