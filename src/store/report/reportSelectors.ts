import { createSelector } from '@reduxjs/toolkit';

import { FightFragment } from '../../graphql/gql/graphql';
import type { ReportFightContext } from '../contextTypes';
import type { RootState } from '../storeWithHistory';
import { createReportFightContextSelector } from '../utils/contextSelectors';
import { resolveCacheKey } from '../utils/keyedCacheState';

import type { ReportEntry } from './reportSlice';

// REPORT SELECTORS - Read from report slice

export const selectReport = (state: RootState): RootState['report'] => state.report;

export const selectActiveReportContext = (state: RootState): RootState['report']['activeContext'] =>
  state.report.activeContext;

export const selectReportEntryById = (
  state: RootState,
  reportId: string,
): ReportEntry | null => {
  if (!reportId) {
    return null;
  }
  const { key } = resolveCacheKey({ reportCode: reportId });
  return state.report.entries[key] ?? null;
};

const selectReportRegistryEntryByContext = (
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

export const selectReportRegistryEntryForContext = createReportFightContextSelector<
  RootState,
  [typeof selectReportRegistryEntryByContext],
  ReportEntry | null
>([selectReportRegistryEntryByContext], (...args) => {
  const [entry] = args as [ReportEntry | null, ReportFightContext];
  return entry;
});

export const selectActiveReportEntry = createSelector(
  [(state: RootState) => state, selectActiveReportContext],
  (state, context) =>
    selectReportRegistryEntryForContext(state, {
      reportCode: context.reportId ?? state.report.reportId,
      fightId: context.fightId,
    }),
);

export const selectReportFightsForContext = createReportFightContextSelector<
  RootState,
  [typeof selectReport, typeof selectReportRegistryEntryByContext],
  Array<FightFragment | null> | null
>([selectReport, selectReportRegistryEntryByContext], (...args) => {
  const [report, registryEntry, context] = args as [
    RootState['report'],
    ReportEntry | null,
    ReportFightContext,
  ];

  if (registryEntry) {
    return registryEntry.fightIds.map(
      (fightId: number) => registryEntry.fightsById[fightId] ?? null,
    );
  }

  if (!context.reportCode) {
    return report.data?.fights ?? null;
  }

  return null;
});

export const selectReportFights = createSelector(
  [(state: RootState) => state, selectActiveReportContext],
  (state, activeContext) =>
    selectReportFightsForContext(state, {
      reportCode: activeContext.reportId ?? state.report.reportId,
      fightId: activeContext.fightId,
    }),
);

export const selectReportId = (state: RootState): string =>
  state.report.activeContext.reportId ?? state.report.reportId;

export const selectReportLoadingState = createSelector(
  [selectReport, selectActiveReportEntry],
  (report, registryEntry) => {
    if (registryEntry) {
      return registryEntry.status === 'loading';
    }

    return report.loading;
  },
);

export const selectReportErrorState = createSelector(
  [selectReport, selectActiveReportEntry],
  (report, registryEntry) => registryEntry?.error ?? report.error,
);

export const selectCombinedReportData = createSelector(
  [
    selectReport,
    selectActiveReportEntry,
    selectReportFights,
    selectReportLoadingState,
    selectReportErrorState,
  ],
  (report, registryEntry, fights, loading, error) => ({
    fights,
    reportId: report.activeContext.reportId ?? report.reportId,
    data: registryEntry?.data ?? report.data,
    loading,
    error,
  }),
);

export const selectFightIndexByReport = (state: RootState, reportId: string): number[] =>
  state.report.fightIndexByReport[reportId] ?? [];
