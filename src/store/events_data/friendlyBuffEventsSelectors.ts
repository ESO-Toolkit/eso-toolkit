import { createSelector } from '@reduxjs/toolkit';

import { BuffEvent } from '../../types/combatlogEvents';
import type { ReportFightContextInput } from '../contextTypes';
import { selectActiveReportContext } from '../report/reportSelectors';
import type { RootState } from '../storeWithHistory';
import { createReportFightContextSelector } from '../utils/contextSelectors';
import { resolveCacheKey } from '../utils/keyedCacheState';

import { FriendlyBuffEventsEntry, FriendlyBuffEventsState } from './friendlyBuffEventsSlice';

export const selectFriendlyBuffEventsState = (state: RootState): FriendlyBuffEventsState =>
  state.events.friendlyBuffs;

export const selectFriendlyBuffEventsEntryForContext = createReportFightContextSelector<
  RootState,
  [typeof selectFriendlyBuffEventsState],
  FriendlyBuffEventsEntry | null
>([selectFriendlyBuffEventsState], (friendlyState, context) => {
  if (!context.reportCode) {
    return null;
  }
  const { key } = resolveCacheKey(context);
  return friendlyState.entries[key] ?? null;
});

export const selectFriendlyBuffEventsForContext = createReportFightContextSelector<
  RootState,
  [typeof selectFriendlyBuffEventsState],
  BuffEvent[]
>([selectFriendlyBuffEventsState], (friendlyState, context) => {
  if (!context.reportCode) {
    return [];
  }
  const { key } = resolveCacheKey(context);
  return friendlyState.entries[key]?.events ?? [];
});

const createActiveContextInput = (
  state: RootState,
  fightId: number | string | null,
): ReportFightContextInput => ({
  reportCode: state.report.activeContext.reportId ?? state.report.reportId,
  fightId,
});

export const selectFriendlyBuffEvents = createSelector(
  [(state: RootState) => state, selectActiveReportContext],
  (state, activeContext) =>
    selectFriendlyBuffEventsForContext(
      state,
      createActiveContextInput(state, activeContext.fightId),
    ),
);

export const selectFriendlyBuffEventsLoading = createSelector(
  [(state: RootState) => state, selectActiveReportContext],
  (state, activeContext) => {
    const entry = selectFriendlyBuffEventsEntryForContext(
      state,
      createActiveContextInput(state, activeContext.fightId),
    );
    return entry?.status === 'loading';
  },
);

export const selectFriendlyBuffEventsError = createSelector(
  [(state: RootState) => state, selectActiveReportContext],
  (state, activeContext) => {
    const entry = selectFriendlyBuffEventsEntryForContext(
      state,
      createActiveContextInput(state, activeContext.fightId),
    );
    return entry?.error ?? null;
  },
);

export const selectFriendlyBuffEventsMetadata = createSelector(
  [(state: RootState) => state, selectActiveReportContext],
  (state, activeContext) => {
    const entry = selectFriendlyBuffEventsEntryForContext(
      state,
      createActiveContextInput(state, activeContext.fightId),
    );
    return entry?.cacheMetadata ?? null;
  },
);
