import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';

import { EsoLogsClient } from '../../esologsClient';
import { ReportFragment } from '../../graphql/generated';
import { GetReportByCodeDocument } from '../../graphql/generated';

export interface ReportState {
  reportId: string;
  data: ReportFragment | null;
  loading: boolean;
  error: string | null;
}

const initialState: ReportState = {
  reportId: '',
  data: null,
  loading: false,
  error: null,
};

export const fetchReportData = createAsyncThunk<
  { reportId: string; data: ReportFragment },
  { reportId: string; client: EsoLogsClient },
  { rejectValue: string }
>('report/fetchReportData', async ({ reportId, client }, { rejectWithValue, getState }) => {
  // Check if we already have this report data
  const state = getState() as { report: ReportState };
  if (state.report.reportId === reportId && state.report.data && !state.report.loading) {
    // Return cached data without making API call
    return { data: state.report.data, reportId: state.report.reportId };
  }

  try {
    const response = await client.query({
      query: GetReportByCodeDocument,
      variables: { code: reportId },
    });

    if (!response.reportData?.report) {
      return rejectWithValue('Report not found or not public.');
    }
    return { data: response.reportData.report, reportId: reportId };
  } catch (err) {
    const hasMessage = (e: unknown): e is { message: string } =>
      typeof e === 'object' &&
      e !== null &&
      'message' in e &&
      typeof (e as { message: unknown }).message === 'string';
    if (hasMessage(err)) {
      return rejectWithValue(err.message);
    }
    return rejectWithValue('Failed to fetch report data');
  }
});

const reportSlice = createSlice({
  name: 'report',
  initialState,
  reducers: {
    setReportId(state, action: PayloadAction<string>) {
      state.reportId = action.payload;
    },
    clearReport(state) {
      state.reportId = '';
      state.data = null;
      state.loading = false;
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchReportData.pending, (state, action) => {
        state.loading = true;
        state.error = null;
        // Latch the attempted report id to avoid infinite retry loops in components
        state.reportId = action.meta.arg.reportId;
      })
      .addCase(fetchReportData.fulfilled, (state, action) => {
        state.reportId = action.payload.reportId;
        state.data = action.payload.data;
        state.loading = false;
        state.error = null;
      })
      .addCase(fetchReportData.rejected, (state, action) => {
        state.loading = false;
        state.error = (action.payload as string) || 'Failed to fetch report data';
        // Also latch the attempted report id on failure
        // so UI effects see the same report and do not re-dispatch endlessly
        if (action.meta && action.meta.arg) {
          state.reportId = action.meta.arg.reportId;
        }
      });
  },
});

export const { setReportId, clearReport } = reportSlice.actions;
export default reportSlice.reducer;
