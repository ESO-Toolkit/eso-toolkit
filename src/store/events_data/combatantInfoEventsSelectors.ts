import { createSelector } from '@reduxjs/toolkit';

import { CombatantInfoEvent } from '../../types/combatlogEvents';
import type { ReportFightContextInput } from '../contextTypes';
import { selectActiveReportContext } from '../report/reportSelectors';
import type { RootState } from '../storeWithHistory';
import { createReportFightContextSelector } from '../utils/contextSelectors';
import { resolveCacheKey } from '../utils/keyedCacheState';

import { CombatantInfoEventsEntry, CombatantInfoEventsState } from './combatantInfoEventsSlice';

export const selectCombatantInfoEventsState = (state: RootState): CombatantInfoEventsState =>
  state.events.combatantInfo;

export const selectCombatantInfoEventsEntryForContext = createReportFightContextSelector<
  RootState,
  [typeof selectCombatantInfoEventsState],
  CombatantInfoEventsEntry | null
>([selectCombatantInfoEventsState], (combatantInfoState, context) => {
  if (!context.reportCode) {
    return null;
  }
  const { key } = resolveCacheKey(context);
  return combatantInfoState.entries[key] ?? null;
});

export const selectCombatantInfoEventsForContext = createReportFightContextSelector<
  RootState,
  [typeof selectCombatantInfoEventsState],
  CombatantInfoEvent[]
>([selectCombatantInfoEventsState], (combatantInfoState, context) => {
  if (!context.reportCode) {
    return [];
  }
  const { key } = resolveCacheKey(context);
  return combatantInfoState.entries[key]?.events ?? [];
});

const createActiveContextInput = (
  state: RootState,
  fightId: number | string | null,
): ReportFightContextInput => ({
  reportCode: state.report.activeContext.reportId ?? state.report.reportId,
  fightId,
});

export const selectCombatantInfoEvents = createSelector(
  [(state: RootState) => state, selectActiveReportContext],
  (state, activeContext) =>
    selectCombatantInfoEventsForContext(
      state,
      createActiveContextInput(state, activeContext.fightId),
    ),
);

export const selectCombatantInfoEventsLoading = createSelector(
  [(state: RootState) => state, selectActiveReportContext],
  (state, activeContext) => {
    const entry = selectCombatantInfoEventsEntryForContext(
      state,
      createActiveContextInput(state, activeContext.fightId),
    );
    return entry?.status === 'loading';
  },
);

export const selectCombatantInfoEventsError = createSelector(
  [(state: RootState) => state, selectActiveReportContext],
  (state, activeContext) => {
    const entry = selectCombatantInfoEventsEntryForContext(
      state,
      createActiveContextInput(state, activeContext.fightId),
    );
    return entry?.error ?? null;
  },
);

export const selectCombatantInfoEventsMetadata = createSelector(
  [(state: RootState) => state, selectActiveReportContext],
  (state, activeContext) => {
    const entry = selectCombatantInfoEventsEntryForContext(
      state,
      createActiveContextInput(state, activeContext.fightId),
    );
    return entry?.cacheMetadata ?? null;
  },
);
