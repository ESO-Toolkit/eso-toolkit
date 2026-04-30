import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';

import type { EsoLogsClient } from '@/esologsClient';
import {
  GetUserReportsQuery,
  UserReportSummaryFragment,
  GetUserReportsDocument,
} from '@/graphql/gql/graphql';

export type SortField = 'title' | 'zone' | 'duration' | 'visibility' | 'date';
export type SortOrder = 'asc' | 'desc';

export interface UserReportsFilters {
  searchText: string;
  visibility: 'all' | 'public' | 'private' | 'unlisted';
}

export interface UserReportsSort {
  field: SortField;
  order: SortOrder;
}

export interface UserReportsState {
  // Normalized data: report code -> report data
  reports: Record<string, UserReportSummaryFragment>;
  // Page metadata: page number -> array of report codes
  pages: Record<number, string[]>;
  // Total count from API
  totalCount: number;
  // Current page being viewed
  currentPage: number;
  // Reports per page
  perPage: number;
  // Filters and sorting
  filters: UserReportsFilters;
  sort: UserReportsSort;
  // Loading and error states
  loading: boolean;
  isFetchingAll: boolean;
  error: string | null;
  // Cache timestamp for invalidation
  lastFetched: number | null;
  // Whether the initial bulk-fetch has been attempted (success or failure).
  // Prevents the data-loading useEffect from re-dispatching after an error or
  // when the user genuinely has zero reports (ESO-595).
  hasFetchedAll: boolean;
}

const initialState: UserReportsState = {
  reports: {},
  pages: {},
  totalCount: 0,
  currentPage: 1,
  perPage: 10,
  filters: {
    searchText: '',
    visibility: 'all',
  },
  sort: {
    field: 'date',
    order: 'desc',
  },
  loading: false,
  isFetchingAll: false,
  error: null,
  lastFetched: null,
  hasFetchedAll: false,
};

// Async thunk to fetch a page of user reports
export const fetchUserReportsPage = createAsyncThunk<
  {
    reports: UserReportSummaryFragment[];
    page: number;
    totalCount: number;
    perPage: number;
  },
  {
    client: EsoLogsClient;
    userId: number;
    page: number;
    limit?: number;
  },
  { rejectValue: string }
>('userReports/fetchPage', async ({ client, userId, page, limit = 100 }, { rejectWithValue }) => {
  try {
    const result: GetUserReportsQuery = await client.query({
      query: GetUserReportsDocument,
      variables: {
        limit,
        page,
        userID: userId,
      },
    });

    const reportPagination = result.reportData?.reports;

    if (!reportPagination) {
      return rejectWithValue('No reports data available');
    }

    const reports = (reportPagination.data || []).filter(
      (report): report is UserReportSummaryFragment => report !== null,
    );

    return {
      reports,
      page,
      totalCount: reportPagination.total,
      perPage: reportPagination.per_page,
    };
  } catch (error) {
    return rejectWithValue(error instanceof Error ? error.message : 'Failed to fetch reports');
  }
});

// Async thunk to fetch all user reports across all pages
export const fetchAllUserReports = createAsyncThunk<
  void,
  {
    client: EsoLogsClient;
    userId: number;
    limit?: number;
  },
  { rejectValue: string; state: { userReports: UserReportsState } }
>(
  'userReports/fetchAll',
  async ({ client, userId, limit = 100 }, { dispatch, rejectWithValue, getState }) => {
    try {
      // Fetch first page to get total count
      const firstPageResult = await dispatch(
        fetchUserReportsPage({
          client,
          userId,
          page: 1,
          limit,
        }),
      ).unwrap();

      const totalPages = Math.ceil(firstPageResult.totalCount / firstPageResult.perPage);

      // Fetch remaining pages sequentially to avoid overwhelming the API
      for (let page = 2; page <= totalPages; page++) {
        // Check if user cancelled or if there was an error
        const state = getState();
        if (!state.userReports.isFetchingAll) {
          break; // User cancelled
        }

        await dispatch(
          fetchUserReportsPage({
            client,
            userId,
            page,
            limit,
          }),
        ).unwrap();
      }
    } catch (error) {
      return rejectWithValue(
        error instanceof Error ? error.message : 'Failed to fetch all reports',
      );
    }
  },
);

const userReportsSlice = createSlice({
  name: 'userReports',
  initialState,
  reducers: {
    setCurrentPage: (state, action: PayloadAction<number>) => {
      state.currentPage = action.payload;
    },
    setFilters: (state, action: PayloadAction<Partial<UserReportsFilters>>) => {
      state.filters = { ...state.filters, ...action.payload };
      // Reset to page 1 when filters change
      state.currentPage = 1;
    },
    setSort: (state, action: PayloadAction<UserReportsSort>) => {
      state.sort = action.payload;
      // Reset to page 1 when sort changes
      state.currentPage = 1;
    },
    clearSearchText: (state) => {
      state.filters.searchText = '';
      state.currentPage = 1;
    },
    clearCache: (state) => {
      state.reports = {};
      state.pages = {};
      state.totalCount = 0;
      state.lastFetched = null;
      state.hasFetchedAll = false;
    },
    resetFilters: (state) => {
      state.filters = initialState.filters;
      state.sort = initialState.sort;
      state.currentPage = 1;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchUserReportsPage.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchUserReportsPage.fulfilled, (state, action) => {
        const { reports, page, totalCount, perPage } = action.payload;

        // Store reports in normalized structure
        reports.forEach((report) => {
          state.reports[report.code] = report;
        });

        // Store page mapping
        state.pages[page] = reports.map((r) => r.code);

        // Update metadata
        state.totalCount = totalCount;
        state.perPage = perPage;
        state.loading = false;
        state.lastFetched = Date.now();
      })
      .addCase(fetchUserReportsPage.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload || 'Failed to fetch reports';
      })
      // Handle fetchAllUserReports
      .addCase(fetchAllUserReports.pending, (state) => {
        state.isFetchingAll = true;
        state.error = null;
      })
      .addCase(fetchAllUserReports.fulfilled, (state) => {
        state.isFetchingAll = false;
        state.hasFetchedAll = true;
      })
      .addCase(fetchAllUserReports.rejected, (state, action) => {
        state.isFetchingAll = false;
        state.hasFetchedAll = true;
        state.error = action.payload || 'Failed to fetch all reports';
      });
  },
});

export const { setCurrentPage, setFilters, setSort, clearSearchText, clearCache, resetFilters } =
  userReportsSlice.actions;

export default userReportsSlice.reducer;
