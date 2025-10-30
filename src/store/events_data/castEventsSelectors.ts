import { createSelector } from '@reduxjs/toolkit';

import { UnifiedCastEvent } from '../../types/combatlogEvents';
import type { ReportFightContextInput } from '../contextTypes';
import { selectActiveReportContext } from '../report/reportSelectors';
import type { RootState } from '../storeWithHistory';
import { createReportFightContextSelector } from '../utils/contextSelectors';
import { resolveCacheKey } from '../utils/keyedCacheState';

import type { CastEventsEntry, CastEventsState } from './castEventsSlice';

export const selectCastEventsState = (state: RootState): CastEventsState => state.events.casts;

export const selectCastEventsEntryForContext = createReportFightContextSelector<
  RootState,
  [typeof selectCastEventsState],
  CastEventsEntry | null
>([selectCastEventsState], (castState, context) => {
  if (!context.reportCode) {
    return null;
  }
  const { key } = resolveCacheKey(context);
  return castState.entries[key] ?? null;
});

export const selectCastEventsForContext = createReportFightContextSelector<
  RootState,
  [typeof selectCastEventsState],
  UnifiedCastEvent[]
>([selectCastEventsState], (castState, context) => {
  if (!context.reportCode) {
    return [];
  }
  const { key } = resolveCacheKey(context);
  return castState.entries[key]?.events ?? [];
});

const createActiveContextInput = (
  state: RootState,
  fightId: number | string | null,
): ReportFightContextInput => ({
  reportCode: state.report.activeContext.reportId ?? state.report.reportId,
  fightId,
});

export const selectCastEvents = createSelector(
  [(state: RootState) => state, selectActiveReportContext],
  (state, activeContext) =>
    selectCastEventsForContext(state, createActiveContextInput(state, activeContext.fightId)),
);

export const selectCastEventsLoading = createSelector(
  [(state: RootState) => state, selectActiveReportContext],
  (state, activeContext) => {
    const entry = selectCastEventsEntryForContext(
      state,
      createActiveContextInput(state, activeContext.fightId),
    );
    return entry?.status === 'loading';
  },
);

export const selectCastEventsError = createSelector(
  [(state: RootState) => state, selectActiveReportContext],
  (state, activeContext) => {
    const entry = selectCastEventsEntryForContext(
      state,
      createActiveContextInput(state, activeContext.fightId),
    );
    return entry?.error ?? null;
  },
);
