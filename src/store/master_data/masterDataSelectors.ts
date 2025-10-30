import { createSelector } from '@reduxjs/toolkit';

import type { ReportFightContext } from '../contextTypes';
import type { RootState } from '../storeWithHistory';
import { createReportFightContextSelector } from '../utils/contextSelectors';
import { resolveCacheKey } from '../utils/keyedCacheState';

import type { MasterDataEntry, MasterDataState } from './masterDataSlice';

export interface CombinedMasterData {
  actorsById: MasterDataEntry['actorsById'];
  abilitiesById: MasterDataEntry['abilitiesById'];
  loading: boolean;
  loaded: boolean;
  error: string | null;
}

export const selectMasterDataState = (state: RootState): MasterDataState => state.masterData;

const selectMasterDataEntryByContext = (
  state: RootState,
  context: ReportFightContext,
): MasterDataEntry | null => {
  if (!context.reportCode) {
    return null;
  }
  const { key } = resolveCacheKey({ reportCode: context.reportCode });
  return state.masterData.entries[key] ?? null;
};

export const selectMasterDataEntryForContext = createReportFightContextSelector<
  RootState,
  [typeof selectMasterDataEntryByContext],
  MasterDataEntry | null
>([selectMasterDataEntryByContext], (entry) => entry);

export const selectActorsByIdForContext = createReportFightContextSelector<
  RootState,
  [typeof selectMasterDataEntryByContext],
  MasterDataEntry['actorsById']
>([selectMasterDataEntryByContext], (entry) => entry?.actorsById ?? {});

export const selectAbilitiesByIdForContext = createReportFightContextSelector<
  RootState,
  [typeof selectMasterDataEntryByContext],
  MasterDataEntry['abilitiesById']
>([selectMasterDataEntryByContext], (entry) => entry?.abilitiesById ?? {});

export const selectIsMasterDataLoadingForContext = createReportFightContextSelector<
  RootState,
  [typeof selectMasterDataEntryByContext],
  boolean
>([selectMasterDataEntryByContext], (entry) => entry?.status === 'loading');

export const selectMasterDataErrorForContext = createReportFightContextSelector<
  RootState,
  [typeof selectMasterDataEntryByContext],
  string | null
>([selectMasterDataEntryByContext], (entry) => entry?.error ?? null);

const createActiveContextInput = (state: RootState): ReportFightContext => ({
  reportCode: state.report.activeContext.reportId ?? (state.report.reportId || null),
  fightId: state.report.activeContext.fightId,
});

export const selectActiveMasterDataEntry = (state: RootState): MasterDataEntry | null =>
  selectMasterDataEntryForContext(state, createActiveContextInput(state));

export const selectActorsById = (state: RootState): MasterDataEntry['actorsById'] =>
  selectActorsByIdForContext(state, createActiveContextInput(state));

export const selectAbilitiesById = (state: RootState): MasterDataEntry['abilitiesById'] =>
  selectAbilitiesByIdForContext(state, createActiveContextInput(state));

export const selectMasterDataLoadingState = (state: RootState): boolean =>
  selectIsMasterDataLoadingForContext(state, createActiveContextInput(state));

export const selectMasterDataErrorState = (state: RootState): string | null =>
  selectMasterDataErrorForContext(state, createActiveContextInput(state));

export const selectCombinedMasterData = createSelector(
  [selectActiveMasterDataEntry],
  (entry): CombinedMasterData => ({
    actorsById: entry?.actorsById ?? {},
    abilitiesById: entry?.abilitiesById ?? {},
    loading: entry?.status === 'loading',
    loaded: entry?.status === 'succeeded',
    error: entry?.error ?? null,
  }),
);

export const selectPlayerActors = createSelector([selectActorsById], (actorsById) => {
  const playerActors: MasterDataEntry['actorsById'] = {};
  Object.entries(actorsById).forEach(([id, actor]) => {
    if (actor.type === 'Player') {
      playerActors[id] = actor;
    }
  });
  return playerActors;
});
