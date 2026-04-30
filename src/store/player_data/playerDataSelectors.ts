import { createSelector } from '@reduxjs/toolkit';

import type { ReportFightContext, ReportFightContextInput } from '../contextTypes';
import type { RootState } from '../storeWithHistory';
import { createReportFightContextSelector } from '../utils/contextSelectors';
import { resolveCacheKey } from '../utils/keyedCacheState';

import type { PlayerDataEntry, PlayerDataState, PlayerDetailsWithRole } from './playerDataSlice';

export const selectPlayerDataState = (state: RootState): PlayerDataState => state.playerData;

const selectPlayerDataEntryByContext = (
  state: RootState,
  context: ReportFightContext,
): PlayerDataEntry | null => {
  if (!context.reportCode || context.fightId === null) {
    return null;
  }
  const { key } = resolveCacheKey(context);
  return state.playerData.entries[key] ?? null;
};

export const selectPlayerDataEntryForContext = createReportFightContextSelector<
  RootState,
  [typeof selectPlayerDataEntryByContext],
  PlayerDataEntry | null
>([selectPlayerDataEntryByContext], (entry) => entry);

export const selectPlayersByIdForContext = createReportFightContextSelector<
  RootState,
  [typeof selectPlayerDataEntryByContext],
  Record<string | number, PlayerDetailsWithRole>
>([selectPlayerDataEntryByContext], (entry) => entry?.playersById ?? {});

export const selectIsPlayerDataLoadingForContext = createReportFightContextSelector<
  RootState,
  [typeof selectPlayerDataEntryByContext],
  boolean
>([selectPlayerDataEntryByContext], (entry) => entry?.status === 'loading');

export const selectPlayerDataErrorForContext = createReportFightContextSelector<
  RootState,
  [typeof selectPlayerDataEntryByContext],
  string | null
>([selectPlayerDataEntryByContext], (entry) => entry?.error ?? null);

const createActiveContextInput = (state: RootState): ReportFightContext => ({
  reportCode: state.report.activeContext.reportId ?? (state.report.reportId || null),
  fightId: state.report.activeContext.fightId,
});

export const selectActivePlayerDataEntry = (state: RootState): PlayerDataEntry | null =>
  selectPlayerDataEntryForContext(state, createActiveContextInput(state));

export const selectActivePlayersById = (
  state: RootState,
): Record<string | number, PlayerDetailsWithRole> =>
  selectPlayersByIdForContext(state, createActiveContextInput(state));

export const selectActivePlayerDataStatus = (state: RootState): boolean =>
  selectIsPlayerDataLoadingForContext(state, createActiveContextInput(state));

export const selectActivePlayerDataError = (state: RootState): string | null =>
  selectPlayerDataErrorForContext(state, createActiveContextInput(state));

export const selectActivePlayersArray = createSelector([selectActivePlayersById], (playersById) =>
  Object.values(playersById ?? {}),
);

type PlayerSelectorByContext = (
  state: RootState,
  context: ReportFightContextInput,
) => PlayerDataEntry['playersById'][string] | undefined;

export const createSelectPlayerByIdForContext = (
  playerId: string | number,
): PlayerSelectorByContext =>
  createReportFightContextSelector<
    RootState,
    [typeof selectPlayerDataEntryByContext],
    PlayerDataEntry['playersById'][string] | undefined
  >([selectPlayerDataEntryByContext], (entry) => entry?.playersById[playerId]);
