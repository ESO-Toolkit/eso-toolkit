import { createSelector } from '@reduxjs/toolkit';

import { HealEvent } from '../../types/combatlogEvents';
import type { ReportFightContextInput } from '../contextTypes';
import { selectActiveReportContext } from '../report/reportSelectors';
import { RootState } from '../storeWithHistory';
import { createReportFightContextSelector } from '../utils/contextSelectors';

import { resolveCacheKey } from './cacheStateHelpers';
import { HealingEventsEntry, HealingEventsState } from './healingEventsSlice';

export const selectHealingEventsState = (state: RootState): HealingEventsState =>
  state.events.healing;

export const selectHealingEventsEntryForContext = createReportFightContextSelector<
  RootState,
  [typeof selectHealingEventsState],
  HealingEventsEntry | null
>([selectHealingEventsState], (healingState, context) => {
  if (!context.reportCode) {
    return null;
  }
  const { key } = resolveCacheKey(context);
  return healingState.entries[key] ?? null;
});

export const selectHealingEventsForContext = createReportFightContextSelector<
  RootState,
  [typeof selectHealingEventsState],
  HealEvent[]
>([selectHealingEventsState], (healingState, context) => {
  if (!context.reportCode) {
    return [];
  }
  const { key } = resolveCacheKey(context);
  return healingState.entries[key]?.events ?? [];
});

const createActiveContextInput = (
  state: RootState,
  fightId: number | string | null,
): ReportFightContextInput => ({
  reportCode: state.report.activeContext.reportId ?? state.report.reportId,
  fightId,
});

export const selectHealingEvents = createSelector(
  [(state: RootState) => state, selectActiveReportContext],
  (state, activeContext) =>
    selectHealingEventsForContext(state, createActiveContextInput(state, activeContext.fightId)),
);

export const selectHealingEventsLoading = createSelector(
  [(state: RootState) => state, selectActiveReportContext],
  (state, activeContext) => {
    const entry = selectHealingEventsEntryForContext(
      state,
      createActiveContextInput(state, activeContext.fightId),
    );
    return entry?.status === 'loading';
  },
);

export const selectHealingEventsError = createSelector(
  [(state: RootState) => state, selectActiveReportContext],
  (state, activeContext) => {
    const entry = selectHealingEventsEntryForContext(
      state,
      createActiveContextInput(state, activeContext.fightId),
    );
    return entry?.error ?? null;
  },
);
