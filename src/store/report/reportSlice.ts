import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';

import { DATA_FETCH_CACHE_TIMEOUT } from '../../Constants';
import { EsoLogsClient } from '../../esologsClient';
import { ReportFragment, GetReportByCodeDocument } from '../../graphql/generated';
import { RootState } from '../storeWithHistory';

export interface ReportState {
  reportId: string;
  data: ReportFragment | null;
  loading: boolean;
  error: string | null;
  // Cache metadata for better cache management
  cacheMetadata: {
    lastFetchedReportId: string | null;
    lastFetchedTimestamp: number | null;
  };
}

const initialState: ReportState = {
  reportId: '',
  data: null,
  loading: false,
  error: null,
  cacheMetadata: {
    lastFetchedReportId: null,
    lastFetchedTimestamp: null,
  },
};

export const fetchReportData = createAsyncThunk<
  { reportId: string; data: ReportFragment },
  { reportId: string; client: EsoLogsClient },
  { state: RootState; rejectValue: string }
>(
  'report/fetchReportData',
  async ({ reportId, client }, { rejectWithValue }) => {
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
  },
  {
    condition: ({ reportId }, { getState }) => {
      const state = getState().report;
      const requestedReportId = reportId;

      // Check if report data is already cached for this report
      const isCached =
        state.cacheMetadata.lastFetchedReportId === requestedReportId && state.data !== null;
      const isFresh =
        state.cacheMetadata.lastFetchedTimestamp &&
        Date.now() - state.cacheMetadata.lastFetchedTimestamp < DATA_FETCH_CACHE_TIMEOUT;

      if (isCached && isFresh) {
        return false; // Prevent thunk execution - use cached data
      }

      if (state.loading) {
        return false; // Prevent duplicate execution while already loading
      }

      return true; // Allow thunk execution
    },
  },
);

const reportSlice = createSlice({
  name: 'report',
  initialState,
  reducers: {
    setReportId(state, action: PayloadAction<string>) {
      state.reportId = action.payload;
    },
    setReportData(state, action: PayloadAction<ReportFragment | null>) {
      state.data = action.payload;
      state.cacheMetadata = {
        lastFetchedReportId: state.reportId,
        lastFetchedTimestamp: Date.now(),
      };
    },
    setReportCacheMetadata(state, action: PayloadAction<{ lastFetchedReportId: string }>) {
      state.loading = false;
      state.error = null;
      // Update cache metadata
      state.cacheMetadata = {
        lastFetchedReportId: action.payload.lastFetchedReportId,
        lastFetchedTimestamp: Date.now(),
      };
    },
    clearReport(state) {
      state.reportId = '';
      state.data = null;
      state.loading = false;
      state.error = null;
      state.cacheMetadata = {
        lastFetchedReportId: null,
        lastFetchedTimestamp: null,
      };
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
        // Update cache metadata
        state.cacheMetadata = {
          lastFetchedReportId: action.payload.reportId,
          lastFetchedTimestamp: Date.now(),
        };
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

export const { setReportId, clearReport, setReportData, setReportCacheMetadata } =
  reportSlice.actions;
export default reportSlice.reducer;
