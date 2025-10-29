import { createSelector } from '@reduxjs/toolkit';

import { FightFragment } from '../../graphql/gql/graphql';
import { RootState } from '../storeWithHistory';

// REPORT SELECTORS - Read from report slice

export const selectReport = (state: RootState): RootState['report'] => state.report;

export const selectActiveReportContext = (state: RootState) => state.report.activeContext;

export const selectReportEntryById = (state: RootState, reportId: string) =>
  state.report.reportsById[reportId] ?? null;

export const selectActiveReportEntry = createSelector(
  [selectReport, selectActiveReportContext],
  (report, context) => {
    if (!context.reportId) {
      return null;
    }
    return report.reportsById[context.reportId] ?? null;
  },
);

export const selectReportFights = createSelector(
  [selectReport, selectActiveReportEntry],
  (report, registryEntry): Array<FightFragment | null> | null => {
    if (registryEntry) {
      return registryEntry.fightIds.map((fightId) => registryEntry.fightsById[fightId] ?? null);
    }

    return report.data?.fights ?? null;
  },
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
  [selectReport, selectActiveReportEntry, selectReportFights, selectReportLoadingState, selectReportErrorState],
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
