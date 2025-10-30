import { createSelector } from '@reduxjs/toolkit';

import { RootState } from '../storeWithHistory';
import { createReportFightKey } from '../cacheKeys';

// PLAYER DATA SELECTORS - Read from playerData slice

export const selectPlayerData = (state: RootState): RootState['playerData'] => state.playerData;
export const selectPlayersById = (state: RootState): RootState['playerData']['playersById'] =>
  state.playerData.playersById;
export const selectPlayerDataEntries = (state: RootState) => state.playerData.entriesByKey;
export const selectPlayerDataActiveContext = (state: RootState) => state.playerData.activeContext;

export const makeSelectPlayersByContext = () =>
  createSelector(
    [selectPlayerDataEntries, (_: RootState, reportCode: string, fightId: number) => ({
      reportCode,
      fightId,
    })],
    (entriesByKey, { reportCode, fightId }) => {
      const key = createReportFightKey(reportCode, fightId);
      return entriesByKey[key]?.playersById ?? {};
    },
  );

// Player data loading state
export const selectPlayerDataLoadingState = createSelector(
  [selectPlayerData],
  (playerData) => playerData.loading,
);

// Player data error state
export const selectPlayerDataErrorState = createSelector(
  [selectPlayerData],
  (playerData) => playerData.error,
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
  Object.values(playersById),
);

// Get player by ID
export const selectPlayerById = (playerId: string | number): ReturnType<typeof createSelector> =>
  createSelector([selectPlayersById], (playersById) => playersById[playerId]);
