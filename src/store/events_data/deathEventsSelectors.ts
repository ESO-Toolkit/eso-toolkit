import { createSelector } from '@reduxjs/toolkit';

import { DeathEvent } from '../../types/combatlogEvents';
import type { ReportFightContextInput } from '../contextTypes';
import { selectActiveReportContext } from '../report/reportSelectors';
import type { RootState } from '../storeWithHistory';
import { createReportFightContextSelector } from '../utils/contextSelectors';
import { resolveCacheKey } from '../utils/keyedCacheState';

import { DeathEventsEntry, DeathEventsState } from './deathEventsSlice';

export const selectDeathEventsState = (state: RootState): DeathEventsState => state.events.deaths;

export const selectDeathEventsEntryForContext = createReportFightContextSelector<
  RootState,
  [typeof selectDeathEventsState],
  DeathEventsEntry | null
>([selectDeathEventsState], (deathState, context) => {
  if (!context.reportCode) {
    return null;
  }
  const { key } = resolveCacheKey(context);
  return deathState.entries[key] ?? null;
});

export const selectDeathEventsForContext = createReportFightContextSelector<
  RootState,
  [typeof selectDeathEventsState],
  DeathEvent[]
>([selectDeathEventsState], (deathState, context) => {
  if (!context.reportCode) {
    return [];
  }
  const { key } = resolveCacheKey(context);
  return deathState.entries[key]?.events ?? [];
});

const createActiveContextInput = (
  state: RootState,
  fightId: number | string | null,
): ReportFightContextInput => ({
  reportCode: state.report.activeContext.reportId ?? state.report.reportId,
  fightId,
});

export const selectDeathEvents = createSelector(
  [(state: RootState) => state, selectActiveReportContext],
  (state, activeContext) =>
    selectDeathEventsForContext(state, createActiveContextInput(state, activeContext.fightId)),
);

export const selectDeathEventsLoading = createSelector(
  [(state: RootState) => state, selectActiveReportContext],
  (state, activeContext) => {
    const entry = selectDeathEventsEntryForContext(
      state,
      createActiveContextInput(state, activeContext.fightId),
    );
    return entry?.status === 'loading';
  },
);

export const selectDeathEventsError = createSelector(
  [(state: RootState) => state, selectActiveReportContext],
  (state, activeContext) => {
    const entry = selectDeathEventsEntryForContext(
      state,
      createActiveContextInput(state, activeContext.fightId),
    );
    return entry?.error ?? null;
  },
);

export const selectDeathEventsMetadata = createSelector(
  [(state: RootState) => state, selectActiveReportContext],
  (state, activeContext) => {
    const entry = selectDeathEventsEntryForContext(
      state,
      createActiveContextInput(state, activeContext.fightId),
    );
    return entry?.cacheMetadata ?? null;
  },
);
