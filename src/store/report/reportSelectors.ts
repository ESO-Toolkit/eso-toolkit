import { createSelector } from '@reduxjs/toolkit';

import { RootState } from '../storeWithHistory';

// REPORT SELECTORS - Read from report slice

export const selectReport = (state: RootState) => state.report;
export const selectReportFights = (state: RootState) => state.report.fights;
export const selectReportId = (state: RootState) => state.report.reportId;

// Report loading state
export const selectReportLoadingState = createSelector([selectReport], (report) => ({
  loading: report.loading,
  error: report.error,
  reportId: report.reportId,
}));

// Combined report data
export const selectCombinedReportData = createSelector([selectReport], (report) => ({
  fights: report.fights,
  reportId: report.reportId,
  data: report.data,
  loading: report.loading,
  error: report.error,
}));
