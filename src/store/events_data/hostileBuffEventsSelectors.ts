import { createSelector } from '@reduxjs/toolkit';

import { BuffEvent } from '../../types/combatlogEvents';
import type { ReportFightContextInput } from '../contextTypes';
import { selectActiveReportContext } from '../report/reportSelectors';
import type { RootState } from '../storeWithHistory';
import { createReportFightContextSelector } from '../utils/contextSelectors';
import { resolveCacheKey } from '../utils/keyedCacheState';

import { HostileBuffEventsEntry, HostileBuffEventsState } from './hostileBuffEventsSlice';

export const selectHostileBuffEventsState = (state: RootState): HostileBuffEventsState =>
  state.events.hostileBuffs;

export const selectHostileBuffEventsEntryForContext = createReportFightContextSelector<
  RootState,
  [typeof selectHostileBuffEventsState],
  HostileBuffEventsEntry | null
>([selectHostileBuffEventsState], (hostileState, context) => {
  if (!context.reportCode) {
    return null;
  }
  const { key } = resolveCacheKey(context);
  return hostileState.entries[key] ?? null;
});

export const selectHostileBuffEventsForContext = createReportFightContextSelector<
  RootState,
  [typeof selectHostileBuffEventsState],
  BuffEvent[]
>([selectHostileBuffEventsState], (hostileState, context) => {
  if (!context.reportCode) {
    return [];
  }
  const { key } = resolveCacheKey(context);
  return hostileState.entries[key]?.events ?? [];
});

const createActiveContextInput = (
  state: RootState,
  fightId: number | string | null,
): ReportFightContextInput => ({
  reportCode: state.report.activeContext.reportId ?? state.report.reportId,
  fightId,
});

export const selectHostileBuffEvents = createSelector(
  [(state: RootState) => state, selectActiveReportContext],
  (state, activeContext) =>
    selectHostileBuffEventsForContext(
      state,
      createActiveContextInput(state, activeContext.fightId),
    ),
);

export const selectHostileBuffEventsLoading = createSelector(
  [(state: RootState) => state, selectActiveReportContext],
  (state, activeContext) => {
    const entry = selectHostileBuffEventsEntryForContext(
      state,
      createActiveContextInput(state, activeContext.fightId),
    );
    return entry?.status === 'loading';
  },
);

export const selectHostileBuffEventsError = createSelector(
  [(state: RootState) => state, selectActiveReportContext],
  (state, activeContext) => {
    const entry = selectHostileBuffEventsEntryForContext(
      state,
      createActiveContextInput(state, activeContext.fightId),
    );
    return entry?.error ?? null;
  },
);

export const selectHostileBuffEventsMetadata = createSelector(
  [(state: RootState) => state, selectActiveReportContext],
  (state, activeContext) => {
    const entry = selectHostileBuffEventsEntryForContext(
      state,
      createActiveContextInput(state, activeContext.fightId),
    );
    return entry?.cacheMetadata ?? null;
  },
);
