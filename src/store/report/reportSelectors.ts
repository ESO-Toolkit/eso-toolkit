import { createSelector } from '@reduxjs/toolkit';

import { FightFragment } from '../../graphql/generated';
import { RootState } from '../storeWithHistory';

// REPORT SELECTORS - Read from report slice

export const selectReport = (state: RootState): RootState['report'] => state.report;
export const selectReportFights = (
  state: RootState
): Array<FightFragment | null> | undefined | null => state.report.data?.fights;
export const selectReportId = (state: RootState): RootState['report']['reportId'] =>
  state.report.reportId;

// Report loading state
export const selectReportLoadingState = createSelector([selectReport], (report) => report.loading);

// Report error state
export const selectReportErrorState = createSelector([selectReport], (report) => report.error);

// Combined report data
export const selectCombinedReportData = createSelector([selectReport], (report) => ({
  fights: report.data?.fights,
  reportId: report.reportId,
  data: report.data,
  loading: report.loading,
  error: report.error,
}));
