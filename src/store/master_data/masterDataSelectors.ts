import { createSelector } from '@reduxjs/toolkit';

import { RootState } from '../storeWithHistory';
import { ReportActorFragment } from '../../graphql/gql/graphql';

// MASTER DATA SELECTORS - Read from masterData slice

export const selectMasterData = (state: RootState): RootState['masterData'] => state.masterData;
export const selectActorsById = (state: RootState): RootState['masterData']['actorsById'] =>
  state.masterData.actorsById;
export const selectAbilitiesById = (state: RootState): RootState['masterData']['abilitiesById'] =>
  state.masterData.abilitiesById;
export const selectMasterDataEntries = (state: RootState) => state.masterData.entriesByReportId;
export const selectMasterDataActiveContext = (state: RootState) => state.masterData.activeContext;

export const makeSelectMasterDataForReport = () =>
  createSelector(
    [selectMasterDataEntries, (_: RootState, reportCode: string) => reportCode],
    (entries, reportCode) => entries[reportCode] ?? null,
  );

// Master data loading state
export const selectMasterDataLoadingState = createSelector(
  [selectMasterData],
  (masterData) => masterData.loading,
);

// Master data error state
export const selectMasterDataErrorState = createSelector(
  [selectMasterData],
  (masterData) => masterData.error,
);

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
    const typedActor = actor as ReportActorFragment;
    if (typedActor.type === 'Player') {
      playerActors[id] = typedActor;
    }
  });
  return playerActors;
});
