import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';

import { createEsoLogsClient } from '../../esologsClient';
import { GetReportByCodeQuery, FightFragment } from '../../graphql/generated';
import { GetReportByCodeDocument } from '../../graphql/reports.generated';

export interface ReportState {
  reportId: string;
  data: GetReportByCodeQuery | null;
  fights: FightFragment[];
  loading: boolean;
  error: string | null;
}

const initialState: ReportState = {
  reportId: '',
  data: null,
  fights: [],
  loading: false,
  error: null,
};

export const fetchReportData = createAsyncThunk<
  { reportId: string; data: GetReportByCodeQuery; fights: FightFragment[] },
  { reportId: string; accessToken: string },
  { rejectValue: string }
>('report/fetchReportData', async ({ reportId, accessToken }, { rejectWithValue }) => {
  try {
    const client = createEsoLogsClient(accessToken);
    const { data } = await client.query({
      query: GetReportByCodeDocument,
      variables: { code: reportId },
      context: {
        headers: {
          Authorization: accessToken ? `Bearer ${accessToken}` : undefined,
        },
      },
    });
    const report = data?.reportData?.report;
    if (!report) {
      return rejectWithValue('Report not found or not public.');
    }
    const fights = (report.fights ?? []) as FightFragment[];
    return { reportId, data, fights };
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
      state.fights = [];
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
        state.fights = action.payload.fights;
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
