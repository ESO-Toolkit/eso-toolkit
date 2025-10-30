import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';

import { DATA_FETCH_CACHE_TIMEOUT } from '../../Constants';
import { EsoLogsClient } from '../../esologsClient';
import { GetPlayersForReportDocument } from '../../graphql/gql/graphql';
import { PlayerDetails, PlayerDetailsEntry } from '../../types/playerDetails';
import { createReportFightKey } from '../cacheKeys';

export interface PlayerDetailsWithRole extends PlayerDetailsEntry {
  role: 'dps' | 'tank' | 'healer';
}

export interface PlayerDataCacheMetadata {
  lastFetchedReportId: string | null;
  lastFetchedFightId: number | null;
  lastFetchedTimestamp: number | null;
  playerCount: number;
}

export interface PlayerDataCacheEntry {
  key: string;
  reportCode: string;
  fightId: number;
  playersById: Record<string | number, PlayerDetailsWithRole>;
  loading: boolean;
  loaded: boolean;
  error: string | null;
  cacheMetadata: PlayerDataCacheMetadata;
}

export interface PlayerDataContext {
  reportId: string | null;
  fightId: number | null;
  key: string | null;
}

export interface PlayerDataState {
  playersById: Record<string | number, PlayerDetailsWithRole>;
  loading: boolean;
  loaded: boolean;
  error: string | null;
  cacheMetadata: PlayerDataCacheMetadata;
  activeContext: PlayerDataContext;
  entriesByKey: Record<string, PlayerDataCacheEntry>;
}

const createEmptyCacheMetadata = (): PlayerDataCacheMetadata => ({
  lastFetchedReportId: null,
  lastFetchedFightId: null,
  lastFetchedTimestamp: null,
  playerCount: 0,
});

const createEmptyEntry = (reportCode: string, fightId: number): PlayerDataCacheEntry => ({
  key: createReportFightKey(reportCode, fightId),
  reportCode,
  fightId,
  playersById: {},
  loading: false,
  loaded: false,
  error: null,
  cacheMetadata: createEmptyCacheMetadata(),
});

const createInitialState = (): PlayerDataState => ({
  playersById: {},
  loading: false,
  loaded: false,
  error: null,
  cacheMetadata: createEmptyCacheMetadata(),
  activeContext: {
    reportId: null,
    fightId: null,
    key: null,
  },
  entriesByKey: {},
});

const initialState: PlayerDataState = createInitialState();

const ensureEntry = (
  state: PlayerDataState,
  reportCode: string,
  fightId: number,
): PlayerDataCacheEntry => {
  const key = createReportFightKey(reportCode, fightId);
  if (!state.entriesByKey[key]) {
    state.entriesByKey[key] = createEmptyEntry(reportCode, fightId);
  }
  return state.entriesByKey[key];
};

const syncActiveEntry = (
  state: PlayerDataState,
  entry: PlayerDataCacheEntry | undefined,
) => {
  if (!entry) {
    state.playersById = {};
    state.loading = false;
    state.loaded = false;
    state.error = null;
    state.cacheMetadata = createEmptyCacheMetadata();
    return;
  }

  state.playersById = entry.playersById;
  state.loading = entry.loading;
  state.loaded = entry.loaded;
  state.error = entry.error;
  state.cacheMetadata = {
    lastFetchedReportId: entry.cacheMetadata.lastFetchedReportId,
    lastFetchedFightId: entry.cacheMetadata.lastFetchedFightId,
    lastFetchedTimestamp: entry.cacheMetadata.lastFetchedTimestamp,
    playerCount: entry.cacheMetadata.playerCount,
  };
};

export interface PlayerDataPayload {
  playersById: Record<string | number, PlayerDetailsWithRole>;
  reportCode: string;
  fightId: number;
}

export const fetchPlayerData = createAsyncThunk<
  PlayerDataPayload,
  { reportCode: string; fightId: number; client: EsoLogsClient },
  { rejectValue: string }
>(
  'playerData/fetchPlayerData',
  async ({ reportCode, fightId, client }, { rejectWithValue }) => {
    try {
      const response = await client.query({
        query: GetPlayersForReportDocument,
        variables: { code: reportCode, fightIDs: [fightId] },
      });

      const playerDetails: PlayerDetails =
        response.reportData?.report?.playerDetails?.data?.playerDetails;

      const playersById: Record<string, PlayerDetailsWithRole> = {};

      // Map role strings to our expected role types
      const roleMap: Record<string, 'dps' | 'tank' | 'healer'> = {
        healers: 'healer',
        tanks: 'tank',
        dps: 'dps',
        damage: 'dps', // Handle both 'dps' and 'damage' keys
      };

      for (const [key, arr] of Object.entries(playerDetails)) {
        const role = roleMap[key.toLowerCase()] || 'dps'; // Default to 'dps' if role not found
        for (const player of arr) {
          playersById[player.id] = {
            ...player,
            role,
          };
        }
      }

      return { playersById, reportCode, fightId };
    } catch (err) {
      const hasMessage = (e: unknown): e is { message: string } =>
        typeof e === 'object' &&
        e !== null &&
        'message' in e &&
        typeof (e as { message: unknown }).message === 'string';
      if (hasMessage(err)) {
        return rejectWithValue(err.message);
      }
      return rejectWithValue('Failed to fetch player data');
    }
  },
  {
    condition: ({ reportCode, fightId }, { getState }) => {
      const state = getState() as { playerData: PlayerDataState };
      const key = createReportFightKey(reportCode, fightId);
      const entry = state.playerData.entriesByKey[key];

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

const playerDataSlice = createSlice({
  name: 'playerData',
  initialState,
  reducers: {
    setPlayerDataContext(
      state,
      action: PayloadAction<{ reportCode: string; fightId: number } | null>,
    ) {
      if (!action.payload) {
        state.activeContext = {
          reportId: null,
          fightId: null,
          key: null,
        };
        syncActiveEntry(state, undefined);
        return;
      }

      const { reportCode, fightId } = action.payload;
      const entry = ensureEntry(state, reportCode, fightId);
      state.activeContext = {
        reportId: reportCode,
        fightId,
        key: entry.key,
      };
      syncActiveEntry(state, entry);
    },
    clearPlayerData(state) {
      const reset = createInitialState();
      state.playersById = reset.playersById;
      state.loading = reset.loading;
      state.loaded = reset.loaded;
      state.error = reset.error;
      state.cacheMetadata = reset.cacheMetadata;
      state.activeContext = reset.activeContext;
      state.entriesByKey = {};
    },
    resetPlayerDataLoading(state) {
      state.loading = false;
      state.error = null;
      const activeKey = state.activeContext.key;
      if (activeKey && state.entriesByKey[activeKey]) {
        state.entriesByKey[activeKey].loading = false;
        state.entriesByKey[activeKey].error = null;
      }
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchPlayerData.pending, (state, action) => {
        const { reportCode, fightId } = action.meta.arg;
        const entry = ensureEntry(state, reportCode, fightId);
        entry.loading = true;
        entry.error = null;
        entry.loaded = false;

        if (state.activeContext.key === entry.key) {
          syncActiveEntry(state, entry);
        }
      })
      .addCase(fetchPlayerData.fulfilled, (state, action: PayloadAction<PlayerDataPayload>) => {
        const { reportCode, fightId, playersById } = action.payload;
        const entry = ensureEntry(state, reportCode, fightId);
        entry.playersById = playersById;
        entry.loading = false;
        entry.loaded = true;
        entry.error = null;
        entry.cacheMetadata = {
          lastFetchedReportId: reportCode,
          lastFetchedFightId: fightId,
          lastFetchedTimestamp: Date.now(),
          playerCount: Object.keys(playersById).length,
        };

        if (state.activeContext.key === entry.key) {
          syncActiveEntry(state, entry);
        }
      })
      .addCase(fetchPlayerData.rejected, (state, action) => {
        const { reportCode, fightId } = action.meta.arg;
        const entry = ensureEntry(state, reportCode, fightId);
        entry.loading = false;
        entry.loaded = false;
        entry.error = (action.payload as string) || 'Failed to fetch player data';
        if (state.activeContext.key === entry.key) {
          syncActiveEntry(state, entry);
        }
      });
  },
});

export const { clearPlayerData, resetPlayerDataLoading, setPlayerDataContext } =
  playerDataSlice.actions;
export default playerDataSlice.reducer;
