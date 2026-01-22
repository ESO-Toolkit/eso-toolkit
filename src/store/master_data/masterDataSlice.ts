import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';

import { DATA_FETCH_CACHE_TIMEOUT } from '../../Constants';
import { EsoLogsClient } from '../../esologsClient';
import {
  GetReportMasterDataDocument,
  ReportAbilityFragment,
  ReportActorFragment,
} from '../../graphql/gql/graphql';
import { cleanArray } from '../../utils/cleanArray';
import { Logger, LogLevel } from '../../utils/logger';
import {
  KeyedCacheState,
  removeFromCache,
  resolveCacheKey,
  resetCacheState,
  touchAccessOrder,
  trimCache,
} from '../utils/keyedCacheState';

const logger = new Logger({ level: LogLevel.INFO, contextPrefix: 'MasterData' });

const MASTER_DATA_CACHE_MAX_ENTRIES = 6;

interface MasterDataRequest {
  reportId: string;
  requestId: string;
}

type MaybeMasterDataRequest = MasterDataRequest | null;

const createCurrentRequest = (reportId: string, requestId: string): MasterDataRequest => ({
  reportId,
  requestId,
});

const isStaleResponse = (
  currentRequest: MaybeMasterDataRequest,
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
export interface MasterDataEntry {
  abilitiesById: Record<string | number, ReportAbilityFragment>;
  actorsById: Record<string | number, ReportActorFragment>;
  status: 'idle' | 'loading' | 'succeeded' | 'failed';
  error: string | null;
  cacheMetadata: {
    lastFetchedTimestamp: number | null;
    actorCount: number;
    abilityCount: number;
  };
  currentRequest: MaybeMasterDataRequest;
}

export type MasterDataState = KeyedCacheState<MasterDataEntry>;

interface LocalRootState {
  masterData: MasterDataState;
}

const createEmptyEntry = (): MasterDataEntry => ({
  abilitiesById: {},
  actorsById: {},
  status: 'idle',
  error: null,
  cacheMetadata: {
    lastFetchedTimestamp: null,
    actorCount: 0,
    abilityCount: 0,
  },
  currentRequest: null,
});

const ensureEntry = (state: MasterDataState, key: string): MasterDataEntry => {
  if (!state.entries[key]) {
    state.entries[key] = createEmptyEntry();
  }
  return state.entries[key];
};

const initialState: MasterDataState = {
  entries: {},
  accessOrder: [],
};

export interface MasterDataPayload {
  abilities: ReportAbilityFragment[];
  reportCode: string;
  abilitiesById: Record<string | number, ReportAbilityFragment>;
  actors: ReportActorFragment[];
  actorsById: Record<string | number, ReportActorFragment>;
}

export const fetchReportMasterData = createAsyncThunk<
  MasterDataPayload,
  { reportCode: string; client: EsoLogsClient },
  { rejectValue: string }
>(
  'masterData/fetchReportMasterData',
  async ({ reportCode, client }, { rejectWithValue }) => {
    try {
      const response = await client.query({
        query: GetReportMasterDataDocument,
        variables: { code: reportCode },
      });
      const masterData = response.reportData?.report?.masterData;
      const actors = cleanArray(masterData?.actors) ?? [];
      const actorsById: Record<string | number, ReportActorFragment> = {};
      for (const actor of actors) {
        if (actor && (typeof actor.id === 'string' || typeof actor.id === 'number')) {
          actorsById[actor.id] = actor;
        }
      }
      const abilities = cleanArray(masterData?.abilities) ?? [];
      const abilitiesById: Record<string | number, ReportAbilityFragment> = {};
      for (const ability of abilities) {
        if (ability && (typeof ability.gameID === 'string' || typeof ability.gameID === 'number')) {
          abilitiesById[ability.gameID] = ability;
        }
      }
      return {
        abilities,
        abilitiesById,
        actors,
        actorsById,
        reportCode,
      };
    } catch (err) {
      const hasMessage = (e: unknown): e is { message: string } =>
        typeof e === 'object' &&
        e !== null &&
        'message' in e &&
        typeof (e as { message: unknown }).message === 'string';
      if (hasMessage(err)) {
        return rejectWithValue(err.message);
      }
      return rejectWithValue('Failed to fetch master data');
    }
  },
  {
    condition: ({ reportCode }, { getState }) => {
      const { key, context } = resolveCacheKey({ reportCode });
      if (!context.reportCode) {
        logger.warn('Skipping master data fetch without a report code');
        return false;
      }

      const state = (getState() as LocalRootState).masterData;
      const entry = state.entries[key];

      const lastFetchedTimestamp = entry?.cacheMetadata.lastFetchedTimestamp ?? null;
      const isCached = Boolean(
        entry &&
          Object.keys(entry.abilitiesById).length > 0 &&
          Object.keys(entry.actorsById).length > 0,
      );
      const isFresh =
        typeof lastFetchedTimestamp === 'number' &&
        Date.now() - lastFetchedTimestamp < DATA_FETCH_CACHE_TIMEOUT;

      if (isCached && isFresh) {
        logger.info('Using cached master data', {
          reportCode: context.reportCode,
          cacheAge: lastFetchedTimestamp ? Date.now() - lastFetchedTimestamp : null,
        });
        return false;
      }

      if (entry?.status === 'loading') {
        logger.info('Master data fetch already in progress, skipping', {
          reportCode: context.reportCode,
        });
        return false;
      }

      return true;
    },
  },
);

const masterDataSlice = createSlice({
  name: 'masterData',
  initialState,
  reducers: {
    clearMasterData(state) {
      resetCacheState(state);
    },
    resetLoadingState(state) {
      Object.values(state.entries).forEach((entry) => {
        if (entry.status === 'loading') {
          entry.status = 'idle';
        }
        entry.error = null;
        entry.currentRequest = null;
      });
    },
    forceMasterDataRefresh(state) {
      Object.values(state.entries).forEach((entry) => {
        entry.cacheMetadata.lastFetchedTimestamp = null;
        entry.status = 'idle';
        entry.currentRequest = null;
      });
    },
    clearMasterDataForContext(state, action: PayloadAction<{ reportCode?: string | null }>) {
      const { context, key } = resolveCacheKey({ reportCode: action.payload.reportCode });
      if (!context.reportCode) {
        resetCacheState(state);
        return;
      }
      removeFromCache(state, key);
    },
    trimMasterDataCache(state, action: PayloadAction<{ maxEntries?: number } | undefined>) {
      const limit = action?.payload?.maxEntries ?? MASTER_DATA_CACHE_MAX_ENTRIES;
      trimCache(state, limit);
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchReportMasterData.pending, (state, action) => {
        const { key, context } = resolveCacheKey({ reportCode: action.meta.arg.reportCode });
        if (!context.reportCode) {
          return;
        }
        const entry = ensureEntry(state, key);
        entry.status = 'loading';
        entry.error = null;
        entry.currentRequest = createCurrentRequest(
          action.meta.arg.reportCode,
          action.meta.requestId,
        );
        touchAccessOrder(state, key);
      })
      .addCase(fetchReportMasterData.fulfilled, (state, action) => {
        const { key, context } = resolveCacheKey({ reportCode: action.payload.reportCode });
        if (!context.reportCode) {
          return;
        }
        const entry = ensureEntry(state, key);
        if (
          isStaleResponse(entry.currentRequest, action.meta.requestId, action.payload.reportCode)
        ) {
          logger.info('Ignoring stale master data response', {
            reportCode: action.payload.reportCode,
          });
          return;
        }
        entry.abilitiesById = action.payload.abilitiesById;
        entry.actorsById = action.payload.actorsById;
        entry.status = 'succeeded';
        entry.error = null;
        entry.cacheMetadata.lastFetchedTimestamp = Date.now();
        entry.cacheMetadata.actorCount = action.payload.actors.length;
        entry.cacheMetadata.abilityCount = action.payload.abilities.length;
        entry.currentRequest = null;
        touchAccessOrder(state, key);
        trimCache(state, MASTER_DATA_CACHE_MAX_ENTRIES);
      })
      .addCase(fetchReportMasterData.rejected, (state, action) => {
        const { key, context } = resolveCacheKey({ reportCode: action.meta.arg.reportCode });
        if (!context.reportCode) {
          return;
        }
        const entry = ensureEntry(state, key);
        if (
          isStaleResponse(entry.currentRequest, action.meta.requestId, action.meta.arg.reportCode)
        ) {
          logger.info('Ignoring stale master data error response', {
            reportCode: action.meta.arg.reportCode,
          });
          return;
        }
        entry.status = 'failed';
        entry.error =
          (action.payload as string) || action.error.message || 'Failed to fetch master data';
        entry.currentRequest = null;
        touchAccessOrder(state, key);
      });
  },
});

export const {
  clearMasterData,
  resetLoadingState,
  forceMasterDataRefresh,
  clearMasterDataForContext,
  trimMasterDataCache,
} = masterDataSlice.actions;
export default masterDataSlice.reducer;
