import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';

import { DATA_FETCH_CACHE_TIMEOUT } from '../../Constants';
import { EsoLogsClient } from '../../esologsClient';
import {
  GetReportMasterDataDocument,
  ReportAbilityFragment,
  ReportActorFragment,
} from '../../graphql/gql/graphql';
import { cleanArray } from '../../utils/cleanArray';

export interface MasterDataCacheMetadata {
  lastFetchedReportId: string | null;
  lastFetchedTimestamp: number | null;
  actorCount: number;
  abilityCount: number;
}

export interface MasterDataCacheEntry {
  reportCode: string;
  abilitiesById: Record<string | number, ReportAbilityFragment>;
  actorsById: Record<string | number, ReportActorFragment>;
  loading: boolean;
  loaded: boolean;
  error: string | null;
  cacheMetadata: MasterDataCacheMetadata;
}

export interface MasterDataContext {
  reportId: string | null;
}

export interface MasterDataState {
  abilitiesById: Record<string | number, ReportAbilityFragment>;
  actorsById: Record<string | number, ReportActorFragment>;
  loading: boolean;
  loaded: boolean;
  error: string | null;
  cacheMetadata: MasterDataCacheMetadata;
  activeContext: MasterDataContext;
  entriesByReportId: Record<string, MasterDataCacheEntry>;
}

const createEmptyCacheMetadata = (): MasterDataCacheMetadata => ({
  lastFetchedReportId: null,
  lastFetchedTimestamp: null,
  actorCount: 0,
  abilityCount: 0,
});

const createEmptyEntry = (reportCode: string): MasterDataCacheEntry => ({
  reportCode,
  abilitiesById: {},
  actorsById: {},
  loading: false,
  loaded: false,
  error: null,
  cacheMetadata: createEmptyCacheMetadata(),
});

const createInitialState = (): MasterDataState => ({
  abilitiesById: {},
  actorsById: {},
  loading: false,
  loaded: false,
  error: null,
  cacheMetadata: createEmptyCacheMetadata(),
  activeContext: {
    reportId: null,
  },
  entriesByReportId: {},
});

const initialState: MasterDataState = createInitialState();

const ensureEntry = (state: MasterDataState, reportCode: string): MasterDataCacheEntry => {
  if (!state.entriesByReportId[reportCode]) {
    state.entriesByReportId[reportCode] = createEmptyEntry(reportCode);
  }
  return state.entriesByReportId[reportCode];
};

const syncActiveEntry = (state: MasterDataState, entry: MasterDataCacheEntry | undefined) => {
  if (!entry) {
    state.abilitiesById = {};
    state.actorsById = {};
    state.loading = false;
    state.loaded = false;
    state.error = null;
    state.cacheMetadata = createEmptyCacheMetadata();
    return;
  }

  state.abilitiesById = entry.abilitiesById;
  state.actorsById = entry.actorsById;
  state.loading = entry.loading;
  state.loaded = entry.loaded;
  state.error = entry.error;
  state.cacheMetadata = { ...entry.cacheMetadata };
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
      const state = getState() as { masterData: MasterDataState };
      const entry = state.masterData.entriesByReportId[reportCode];

      if (!entry) {
        return true;
      }

      const isCached = entry.loaded;
      const lastFetched = entry.cacheMetadata.lastFetchedTimestamp;
      const isFresh =
        typeof lastFetched === 'number' &&
        Date.now() - lastFetched < DATA_FETCH_CACHE_TIMEOUT;

      if (isCached && isFresh) {
        return false;
      }

      if (entry.loading) {
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
      const reset = createInitialState();
      state.abilitiesById = reset.abilitiesById;
      state.actorsById = reset.actorsById;
      state.loading = reset.loading;
      state.loaded = reset.loaded;
      state.error = reset.error;
      state.cacheMetadata = reset.cacheMetadata;
      state.activeContext = reset.activeContext;
      state.entriesByReportId = {};
    },
    resetLoadingState(state) {
      state.loading = false;
      state.error = null;
      const reportId = state.activeContext.reportId;
      if (reportId && state.entriesByReportId[reportId]) {
        state.entriesByReportId[reportId].loading = false;
        state.entriesByReportId[reportId].error = null;
      }
    },
    forceMasterDataRefresh(state) {
      const reportId = state.activeContext.reportId;
      if (reportId && state.entriesByReportId[reportId]) {
        const entry = state.entriesByReportId[reportId];
        entry.cacheMetadata.lastFetchedTimestamp = null;
        entry.loaded = false;
        if (state.activeContext.reportId === entry.reportCode) {
          syncActiveEntry(state, entry);
        }
      } else {
        state.cacheMetadata.lastFetchedTimestamp = null;
        state.loaded = false;
      }
    },
    setMasterDataContext(state, action: PayloadAction<string | null>) {
      const reportCode = action.payload;
      state.activeContext = {
        reportId: reportCode,
      };
      if (!reportCode) {
        syncActiveEntry(state, undefined);
        return;
      }

      const entry = ensureEntry(state, reportCode);
      syncActiveEntry(state, entry);
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchReportMasterData.pending, (state, action) => {
        const { reportCode } = action.meta.arg;
        const entry = ensureEntry(state, reportCode);
        entry.loading = true;
        entry.error = null;
        entry.loaded = false;
        if (state.activeContext.reportId === reportCode) {
          syncActiveEntry(state, entry);
        }
      })
      .addCase(
        fetchReportMasterData.fulfilled,
        (state, action: PayloadAction<MasterDataPayload>) => {
          const { reportCode, abilitiesById, actorsById, abilities, actors } = action.payload;
          const entry = ensureEntry(state, reportCode);
          entry.abilitiesById = abilitiesById;
          entry.actorsById = actorsById;
          entry.loading = false;
          entry.loaded = true;
          entry.error = null;
          entry.cacheMetadata = {
            lastFetchedReportId: reportCode,
            lastFetchedTimestamp: Date.now(),
            actorCount: actors.length,
            abilityCount: abilities.length,
          };

          if (state.activeContext.reportId === reportCode) {
            syncActiveEntry(state, entry);
          }
        },
      )
      .addCase(fetchReportMasterData.rejected, (state, action) => {
        const { reportCode } = action.meta.arg;
        const entry = ensureEntry(state, reportCode);
        entry.loading = false;
        entry.loaded = false;
        entry.error = (action.payload as string) || 'Failed to fetch master data';
        if (state.activeContext.reportId === reportCode) {
          syncActiveEntry(state, entry);
        }
      });
  },
});

export const { clearMasterData, resetLoadingState, forceMasterDataRefresh, setMasterDataContext } =
  masterDataSlice.actions;
export default masterDataSlice.reducer;
