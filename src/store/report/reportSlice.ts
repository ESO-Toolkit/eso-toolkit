import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';

import { DATA_FETCH_CACHE_TIMEOUT } from '../../Constants';
import { EsoLogsClient } from '../../esologsClient';
import { FightFragment, ReportFragment, GetReportByCodeDocument } from '../../graphql/gql/graphql';
import { RootState } from '../storeWithHistory';
import type { ReportFightContextInput } from '../contextTypes';
import { normalizeReportFightContext } from '../utils/cacheKeys';

export type ReportLoadStatus = 'idle' | 'loading' | 'succeeded' | 'failed';

export interface ReportCacheMetadata {
  lastFetchedTimestamp: number | null;
}

export interface ReportRegistryEntry {
  reportId: string;
  data: ReportFragment | null;
  status: ReportLoadStatus;
  error: string | null;
  fightsById: Record<number, FightFragment | null>;
  fightIds: number[];
  cacheMetadata: ReportCacheMetadata;
}

export interface ActiveReportContext {
  reportId: string | null;
  fightId: number | null;
}

export interface ReportState {
  reportId: string;
  data: ReportFragment | null;
  loading: boolean;
  error: string | null;
  cacheMetadata: {
    lastFetchedReportId: string | null;
    lastFetchedTimestamp: number | null;
  };
  activeContext: ActiveReportContext;
  reportsById: Record<string, ReportRegistryEntry>;
  fightIndexByReport: Record<string, number[]>;
}

const createEmptyRegistryEntry = (reportId: string): ReportRegistryEntry => ({
  reportId,
  data: null,
  status: 'idle',
  error: null,
  fightsById: {},
  fightIds: [],
  cacheMetadata: {
    lastFetchedTimestamp: null,
  },
});

const initialState: ReportState = {
  reportId: '',
  data: null,
  loading: false,
  error: null,
  cacheMetadata: {
    lastFetchedReportId: null,
    lastFetchedTimestamp: null,
  },
  activeContext: {
    reportId: null,
    fightId: null,
  },
  reportsById: {},
  fightIndexByReport: {},
};

const ensureRegistryEntry = (state: ReportState, reportId: string): ReportRegistryEntry => {
  if (!state.reportsById[reportId]) {
    state.reportsById[reportId] = createEmptyRegistryEntry(reportId);
  }
  return state.reportsById[reportId];
};

const mapFights = (
  fights: Array<FightFragment | null> | null | undefined,
): {
  fightIds: number[];
  fightsById: Record<number, FightFragment | null>;
} => {
  const fightIds: number[] = [];
  const fightsById: Record<number, FightFragment | null> = {};

  if (!fights) {
    return { fightIds, fightsById };
  }

  fights.forEach((fight) => {
    if (fight) {
      fightIds.push(fight.id);
      fightsById[fight.id] = fight;
    }
  });

  return { fightIds, fightsById };
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
      const state = getState().report as ReportState;
      const entry = state.reportsById[reportId];

      const lastFetchedTimestamp =
        entry?.cacheMetadata.lastFetchedTimestamp ?? state.cacheMetadata.lastFetchedTimestamp;

      const isCached = Boolean(entry?.data);
      const isFresh =
        typeof lastFetchedTimestamp === 'number' &&
        Date.now() - lastFetchedTimestamp < DATA_FETCH_CACHE_TIMEOUT;

      if (isCached && isFresh) {
        return false;
      }

      if (entry?.status === 'loading' || state.loading) {
        return false;
      }

      return true;
    },
  },
);

const reportSlice = createSlice({
  name: 'report',
  initialState,
  reducers: {
    setReportId(state, action: PayloadAction<string>) {
      state.reportId = action.payload;
      state.activeContext.reportId = action.payload;
    },
    setActiveReportContext(state, action: PayloadAction<ReportFightContextInput>) {
      const normalized = normalizeReportFightContext(action.payload);

      state.activeContext.reportId = normalized.reportCode;
      state.activeContext.fightId = normalized.fightId;

      if (normalized.reportCode) {
        state.reportId = normalized.reportCode;
        ensureRegistryEntry(state, normalized.reportCode);
      }
    },
    setReportData(state, action: PayloadAction<ReportFragment | null>) {
      state.data = action.payload;
      const activeReportId = state.activeContext.reportId || state.reportId || action.payload?.code;
      if (!activeReportId) {
        return;
      }

      if (action.payload?.code && action.payload.code !== activeReportId) {
        state.reportId = action.payload.code;
        state.activeContext.reportId = action.payload.code;
      }

      const registryEntry = ensureRegistryEntry(state, activeReportId);
  registryEntry.data = action.payload;
  registryEntry.error = null;
  registryEntry.status = action.payload ? 'succeeded' : 'idle';

      const { fightIds, fightsById } = mapFights(action.payload?.fights);
      registryEntry.fightIds = fightIds;
      registryEntry.fightsById = fightsById;
      state.fightIndexByReport[activeReportId] = fightIds;

      state.cacheMetadata = {
        lastFetchedReportId: activeReportId,
        lastFetchedTimestamp: Date.now(),
      };
      registryEntry.cacheMetadata.lastFetchedTimestamp = state.cacheMetadata.lastFetchedTimestamp;
    },
    setReportCacheMetadata(state, action: PayloadAction<{ lastFetchedReportId: string }>) {
      state.loading = false;
      state.error = null;
      // Update cache metadata
      state.cacheMetadata = {
        lastFetchedReportId: action.payload.lastFetchedReportId,
        lastFetchedTimestamp: Date.now(),
      };
      state.reportId = action.payload.lastFetchedReportId;
      state.activeContext.reportId = action.payload.lastFetchedReportId;

      const registryEntry = ensureRegistryEntry(state, action.payload.lastFetchedReportId);
      registryEntry.cacheMetadata.lastFetchedTimestamp = state.cacheMetadata.lastFetchedTimestamp;
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
      state.activeContext = {
        reportId: null,
        fightId: null,
      };
      state.reportsById = {};
      state.fightIndexByReport = {};
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchReportData.pending, (state, action) => {
        state.loading = true;
        state.error = null;
        // Latch the attempted report id to avoid infinite retry loops in components
        state.reportId = action.meta.arg.reportId;
        state.activeContext.reportId = action.meta.arg.reportId;

        const entry = ensureRegistryEntry(state, action.meta.arg.reportId);
        entry.status = 'loading';
        entry.error = null;
      })
      .addCase(fetchReportData.fulfilled, (state, action) => {
        const { reportId, data } = action.payload;
        const now = Date.now();

        state.reportId = reportId;
        state.data = data;
        state.loading = false;
        state.error = null;
        // Update cache metadata
        state.cacheMetadata = {
          lastFetchedReportId: reportId,
          lastFetchedTimestamp: now,
        };
        state.activeContext.reportId = reportId;

        const entry = ensureRegistryEntry(state, reportId);
        entry.data = data;
  entry.status = 'succeeded';
        entry.error = null;
        entry.cacheMetadata.lastFetchedTimestamp = now;

        const { fightIds, fightsById } = mapFights(data.fights);
        entry.fightIds = fightIds;
        entry.fightsById = fightsById;
        state.fightIndexByReport[reportId] = fightIds;
      })
      .addCase(fetchReportData.rejected, (state, action) => {
        state.loading = false;
        state.error = (action.payload as string) || 'Failed to fetch report data';
        // Also latch the attempted report id on failure
        // so UI effects see the same report and do not re-dispatch endlessly
        if (action.meta && action.meta.arg) {
          state.reportId = action.meta.arg.reportId;
          state.activeContext.reportId = action.meta.arg.reportId;

          const entry = ensureRegistryEntry(state, action.meta.arg.reportId);
          entry.status = 'failed';
          entry.error = (action.payload as string) || 'Failed to fetch report data';
        }
      });
  },
});

export const { setReportId, setActiveReportContext, clearReport, setReportData, setReportCacheMetadata } =
  reportSlice.actions;
export default reportSlice.reducer;
