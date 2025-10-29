import { createSelector } from '@reduxjs/toolkit';

import { DebuffEvent } from '../../types/combatlogEvents';
import type { ReportFightContextInput } from '../contextTypes';
import { selectActiveReportContext } from '../report/reportSelectors';
import type { RootState } from '../storeWithHistory';
import { createReportFightContextSelector } from '../utils/contextSelectors';

import { resolveCacheKey } from './cacheStateHelpers';
import { DebuffEventsEntry, DebuffEventsState } from './debuffEventsSlice';

export const selectDebuffEventsState = (state: RootState): DebuffEventsState => state.events.debuffs;

export const selectDebuffEventsEntryForContext = createReportFightContextSelector<
  RootState,
  [typeof selectDebuffEventsState],
  DebuffEventsEntry | null
>([selectDebuffEventsState], (debuffState, context) => {
  if (!context.reportCode) {
    return null;
  }
  const { key } = resolveCacheKey(context);
  return debuffState.entries[key] ?? null;
});

export const selectDebuffEventsForContext = createReportFightContextSelector<
  RootState,
  [typeof selectDebuffEventsState],
  DebuffEvent[]
>([selectDebuffEventsState], (debuffState, context) => {
  if (!context.reportCode) {
    return [];
  }
  const { key } = resolveCacheKey(context);
  return debuffState.entries[key]?.events ?? [];
});

const createActiveContextInput = (
  state: RootState,
  fightId: number | string | null,
): ReportFightContextInput => ({
  reportCode: state.report.activeContext.reportId ?? state.report.reportId,
  fightId,
});

export const selectDebuffEvents = createSelector(
  [(state: RootState) => state, selectActiveReportContext],
  (state, activeContext) =>
    selectDebuffEventsForContext(
      state,
      createActiveContextInput(state, activeContext.fightId),
    ),
);

export const selectDebuffEventsLoading = createSelector(
  [(state: RootState) => state, selectActiveReportContext],
  (state, activeContext) => {
    const entry = selectDebuffEventsEntryForContext(
      state,
      createActiveContextInput(state, activeContext.fightId),
    );
    return entry?.status === 'loading';
  },
);

export const selectDebuffEventsError = createSelector(
  [(state: RootState) => state, selectActiveReportContext],
  (state, activeContext) => {
    const entry = selectDebuffEventsEntryForContext(
      state,
      createActiveContextInput(state, activeContext.fightId),
    );
    return entry?.error ?? null;
  },
);

export const selectDebuffEventsMetadata = createSelector(
  [(state: RootState) => state, selectActiveReportContext],
  (state, activeContext) => {
    const entry = selectDebuffEventsEntryForContext(
      state,
      createActiveContextInput(state, activeContext.fightId),
    );
    return entry?.cacheMetadata ?? null;
  },
);
