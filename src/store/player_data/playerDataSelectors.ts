import { createSelector } from '@reduxjs/toolkit';

import type { FightFragment, ReportActorFragment } from '../../graphql/gql/graphql';
import type { CombatantInfoEvent } from '../../types/combatlogEvents';
import type { ReportFightContext, ReportFightContextInput } from '../contextTypes';
import type { ReportEntry } from '../report/reportSlice';
import type { RootState } from '../storeWithHistory';
import { createReportFightContextSelector } from '../utils/contextSelectors';
import { resolveCacheKey } from '../utils/keyedCacheState';

import { buildFallbackPlayersFromMasterData, hasPlayerEntries } from './playerDataFallback';
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

const selectReportEntryByContext = (
  state: RootState,
  context: ReportFightContext,
): ReportEntry | null => {
  const reportId =
    context.reportCode ?? state.report.activeContext.reportId ?? state.report.reportId ?? null;
  if (!reportId) {
    return null;
  }

  const { key } = resolveCacheKey({ reportCode: reportId });
  return state.report.entries[key] ?? null;
};

const selectFightByContext = (
  state: RootState,
  context: ReportFightContext,
): FightFragment | null => {
  if (context.fightId === null) {
    return null;
  }

  const registryEntry = selectReportEntryByContext(state, context);
  const registryFight = registryEntry?.fightsById[context.fightId] ?? null;
  if (registryFight) {
    return registryFight;
  }

  return state.report.data?.fights?.find((fight) => fight?.id === context.fightId) ?? null;
};

const selectActorsByIdByContext = (
  state: RootState,
  context: ReportFightContext,
): Record<string | number, ReportActorFragment> => {
  if (!context.reportCode) {
    return {};
  }
  const { key } = resolveCacheKey({ reportCode: context.reportCode });
  return state.masterData.entries[key]?.actorsById ?? {};
};

const selectCombatantInfoEventsByContext = (
  state: RootState,
  context: ReportFightContext,
): CombatantInfoEvent[] => {
  if (!context.reportCode) {
    return [];
  }
  const { key } = resolveCacheKey(context);
  return state.events.combatantInfo.entries[key]?.events ?? [];
};

export const selectPlayerDataEntryForContext = createReportFightContextSelector<
  RootState,
  [typeof selectPlayerDataEntryByContext],
  PlayerDataEntry | null
>([selectPlayerDataEntryByContext], (entry) => entry);

export const selectPlayersByIdForContext = createReportFightContextSelector<
  RootState,
  [
    typeof selectPlayerDataEntryByContext,
    typeof selectFightByContext,
    typeof selectActorsByIdByContext,
    typeof selectCombatantInfoEventsByContext,
  ],
  Record<string | number, PlayerDetailsWithRole>
>(
  [
    selectPlayerDataEntryByContext,
    selectFightByContext,
    selectActorsByIdByContext,
    selectCombatantInfoEventsByContext,
  ],
  (entry, fight, actorsById, combatantInfoEvents) => {
    if (hasPlayerEntries(entry?.playersById)) {
      return entry.playersById;
    }

    return buildFallbackPlayersFromMasterData({
      friendlyPlayerIds: fight?.friendlyPlayers ?? undefined,
      actorsById,
      combatantInfoEvents,
    });
  },
);

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

const selectEffectivePlayersByIdByContext = (
  state: RootState,
  context: ReportFightContext,
): Record<string | number, PlayerDetailsWithRole> => selectPlayersByIdForContext(state, context);

export const createSelectPlayerByIdForContext = (
  playerId: string | number,
): PlayerSelectorByContext =>
  createReportFightContextSelector<
    RootState,
    [typeof selectEffectivePlayersByIdByContext],
    PlayerDataEntry['playersById'][string] | undefined
  >([selectEffectivePlayersByIdByContext], (playersById) => playersById[playerId]);
