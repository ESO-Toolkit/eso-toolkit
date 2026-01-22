import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';

import { DATA_FETCH_CACHE_TIMEOUT } from '../../Constants';
import { EsoLogsClient } from '../../esologsClient';
import { FightFragment, GetReportByCodeDocument, ReportFragment } from '../../graphql/gql/graphql';
import type { ReportFightContextInput } from '../contextTypes';
import { RootState } from '../storeWithHistory';
import { normalizeReportFightContext } from '../utils/cacheKeys';
import {
  KeyedCacheState,
  removeFromCache,
  resolveCacheKey,
  resetCacheState,
  touchAccessOrder,
  trimCache,
} from '../utils/keyedCacheState';

export type ReportLoadStatus = 'idle' | 'loading' | 'succeeded' | 'failed';

const REPORT_CACHE_MAX_ENTRIES = 6;

interface ReportRequest {
  reportId: string;
  requestId: string;
}

type MaybeReportRequest = ReportRequest | null;

const createCurrentRequest = (reportId: string, requestId: string): ReportRequest => ({
  reportId,
  requestId,
});

const isStaleResponse = (
  currentRequest: MaybeReportRequest,
  responseRequestId: string,
  expectedReportId: string,
): boolean => {
  if (!currentRequest) {
    return true;
  }

  return (
    currentRequest.requestId !== responseRequestId || currentRequest.reportId !== expectedReportId
  );
};

export interface ReportCacheMetadata {
  lastFetchedTimestamp: number | null;
}

export interface ReportEntry {
  data: ReportFragment | null;
  status: ReportLoadStatus;
  error: string | null;
  fightsById: Record<number, FightFragment | null>;
  fightIds: number[];
  cacheMetadata: ReportCacheMetadata;
  currentRequest: MaybeReportRequest;
}

export interface ActiveReportContext {
  reportId: string | null;
  fightId: number | null;
}

export interface ReportState extends KeyedCacheState<ReportEntry> {
  reportId: string;
  data: ReportFragment | null;
  loading: boolean;
  error: string | null;
  cacheMetadata: {
    lastFetchedReportId: string | null;
    lastFetchedTimestamp: number | null;
  };
  activeContext: ActiveReportContext;
  fightIndexByReport: Record<string, number[]>;
}

const createEmptyEntry = (): ReportEntry => ({
  data: null,
  status: 'idle',
  error: null,
  fightsById: {},
  fightIds: [],
  cacheMetadata: {
    lastFetchedTimestamp: null,
  },
  currentRequest: null,
});

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

const initialState: ReportState = {
  entries: {},
  accessOrder: [],
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
  fightIndexByReport: {},
};

const resolveReportKey = (reportId: string | null | undefined): string | null => {
  if (!reportId) {
    return null;
  }
  const { key } = resolveCacheKey({ reportCode: reportId });
  return key;
};

const getEntry = (state: ReportState, reportId: string | null | undefined): ReportEntry | null => {
  const cacheKey = resolveReportKey(reportId);
  if (!cacheKey) {
    return null;
  }
  return state.entries[cacheKey] ?? null;
};

const ensureEntry = (state: ReportState, reportId: string): ReportEntry => {
  const { key } = resolveCacheKey({ reportCode: reportId });
  if (!state.entries[key]) {
    state.entries[key] = createEmptyEntry();
  }
  return state.entries[key];
};

const syncActiveReportState = (state: ReportState): void => {
  const fallbackReportId = state.reportId || null;
  const activeReportId = state.activeContext.reportId ?? fallbackReportId;

  if (!activeReportId) {
    state.reportId = '';
    state.data = null;
    state.loading = false;
    state.error = null;
    state.cacheMetadata.lastFetchedReportId = null;
    state.cacheMetadata.lastFetchedTimestamp = null;
    return;
  }

  state.reportId = activeReportId;
  const entry = getEntry(state, activeReportId);
  state.data = entry?.data ?? null;
  state.loading = entry?.status === 'loading';
  state.error = entry?.error ?? null;
  state.cacheMetadata.lastFetchedReportId = entry?.data ? activeReportId : null;
  state.cacheMetadata.lastFetchedTimestamp = entry?.cacheMetadata.lastFetchedTimestamp ?? null;
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
      return { data: response.reportData.report, reportId };
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
      if (!reportId) {
        return false;
      }

      const state = getState().report as ReportState;
      const entry = getEntry(state, reportId);

      const lastFetchedTimestamp = entry?.cacheMetadata.lastFetchedTimestamp ?? null;
      const isCached = Boolean(entry?.data);
      const isFresh =
        typeof lastFetchedTimestamp === 'number' &&
        Date.now() - lastFetchedTimestamp < DATA_FETCH_CACHE_TIMEOUT;

      if (isCached && isFresh) {
        return false;
      }

      if (entry?.status === 'loading') {
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
      state.activeContext.reportId = action.payload || null;
      syncActiveReportState(state);
    },
    setActiveReportContext(state, action: PayloadAction<ReportFightContextInput>) {
      const normalized = normalizeReportFightContext(action.payload);

      state.activeContext.reportId = normalized.reportCode;
      state.activeContext.fightId = normalized.fightId;

      if (normalized.reportCode) {
        const { key } = resolveCacheKey({ reportCode: normalized.reportCode });
        ensureEntry(state, normalized.reportCode);
        touchAccessOrder(state, key);
      }

      syncActiveReportState(state);
    },
    setReportData(state, action: PayloadAction<ReportFragment | null>) {
      const payload = action.payload;
      const resolvedReportId =
        payload?.code || state.activeContext.reportId || state.reportId || null;

      if (!resolvedReportId) {
        state.data = payload;
        state.cacheMetadata.lastFetchedReportId = null;
        state.cacheMetadata.lastFetchedTimestamp = null;
        return;
      }

      const entry = ensureEntry(state, resolvedReportId);
      const now = payload ? Date.now() : null;

      entry.data = payload;
      entry.status = payload ? 'succeeded' : 'idle';
      entry.error = null;
      entry.currentRequest = null;
      entry.cacheMetadata.lastFetchedTimestamp = now;

      const { fightIds, fightsById } = mapFights(payload?.fights ?? null);
      entry.fightIds = fightIds;
      entry.fightsById = fightsById;
      state.fightIndexByReport[resolvedReportId] = fightIds;

      const { key } = resolveCacheKey({ reportCode: resolvedReportId });
      touchAccessOrder(state, key);
      trimCache(state, REPORT_CACHE_MAX_ENTRIES);

      state.activeContext.reportId =
        payload?.code ?? state.activeContext.reportId ?? resolvedReportId;
      syncActiveReportState(state);
    },
    setReportCacheMetadata(state, action: PayloadAction<{ lastFetchedReportId: string }>) {
      const reportId = action.payload.lastFetchedReportId;
      const entry = ensureEntry(state, reportId);
      entry.cacheMetadata.lastFetchedTimestamp = Date.now();
      entry.error = null;
      state.activeContext.reportId = state.activeContext.reportId ?? reportId;
      syncActiveReportState(state);
    },
    clearReport(state) {
      resetCacheState(state);
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
      state.fightIndexByReport = {};
    },
    clearReportForContext(state, action: PayloadAction<{ reportCode?: string | null }>) {
      const { context, key } = resolveCacheKey({ reportCode: action.payload.reportCode });
      if (!context.reportCode) {
        resetCacheState(state);
        state.fightIndexByReport = {};
        syncActiveReportState(state);
        return;
      }
      removeFromCache(state, key);
      delete state.fightIndexByReport[context.reportCode];
      if (state.activeContext.reportId === context.reportCode) {
        state.activeContext.reportId = null;
      }
      syncActiveReportState(state);
    },
    trimReportCache(state, action: PayloadAction<{ maxEntries?: number } | undefined>) {
      const limit = action?.payload?.maxEntries ?? REPORT_CACHE_MAX_ENTRIES;
      trimCache(state, limit);
      syncActiveReportState(state);
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchReportData.pending, (state, action) => {
        const reportId = action.meta.arg.reportId;
        const cacheKey = resolveReportKey(reportId);
        if (!cacheKey || !reportId) {
          return;
        }
        const entry = ensureEntry(state, reportId);
        entry.status = 'loading';
        entry.error = null;
        entry.currentRequest = createCurrentRequest(reportId, action.meta.requestId);
        touchAccessOrder(state, cacheKey);
        if (!state.activeContext.reportId) {
          state.activeContext.reportId = reportId;
        }
        syncActiveReportState(state);
      })
      .addCase(fetchReportData.fulfilled, (state, action) => {
        const { reportId, data } = action.payload;
        const cacheKey = resolveReportKey(reportId);
        if (!cacheKey) {
          return;
        }
        const entry = ensureEntry(state, reportId);
        if (isStaleResponse(entry.currentRequest, action.meta.requestId, reportId)) {
          return;
        }

        const now = Date.now();
        entry.data = data;
        entry.status = 'succeeded';
        entry.error = null;
        entry.currentRequest = null;
        entry.cacheMetadata.lastFetchedTimestamp = now;

        const { fightIds, fightsById } = mapFights(data.fights ?? []);
        entry.fightIds = fightIds;
        entry.fightsById = fightsById;
        state.fightIndexByReport[reportId] = fightIds;

        touchAccessOrder(state, cacheKey);
        trimCache(state, REPORT_CACHE_MAX_ENTRIES);

        if (!state.activeContext.reportId) {
          state.activeContext.reportId = reportId;
        }

        syncActiveReportState(state);
      })
      .addCase(fetchReportData.rejected, (state, action) => {
        const reportId = action.meta?.arg?.reportId ?? null;
        const cacheKey = resolveReportKey(reportId);
        if (!cacheKey || !reportId) {
          return;
        }

        const entry = ensureEntry(state, reportId);
        if (isStaleResponse(entry.currentRequest, action.meta.requestId, reportId)) {
          return;
        }

        entry.status = 'failed';
        entry.error =
          (action.payload as string) || action.error.message || 'Failed to fetch report data';
        entry.currentRequest = null;
        touchAccessOrder(state, cacheKey);
        if (!state.activeContext.reportId) {
          state.activeContext.reportId = reportId;
        }
        syncActiveReportState(state);
      });
  },
});

export const {
  setReportId,
  setActiveReportContext,
  clearReport,
  setReportData,
  setReportCacheMetadata,
  clearReportForContext,
  trimReportCache,
} = reportSlice.actions;
export default reportSlice.reducer;
