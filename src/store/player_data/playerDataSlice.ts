import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';

import { DATA_FETCH_CACHE_TIMEOUT } from '../../Constants';
import { EsoLogsClient } from '../../esologsClient';
import { GetPlayersForReportDocument } from '../../graphql/gql/graphql';
import { PlayerDetails, PlayerDetailsEntry } from '../../types/playerDetails';
import { Logger, LogLevel } from '../../utils/logger';
import {
  KeyedCacheState,
  removeFromCache,
  resolveCacheKey,
  resetCacheState,
  touchAccessOrder,
  trimCache,
} from '../utils/keyedCacheState';

const logger = new Logger({ level: LogLevel.INFO, contextPrefix: 'PlayerData' });

const PLAYER_DATA_CACHE_MAX_ENTRIES = 6;

interface PlayerDataRequest {
  reportId: string;
  fightId: number;
  requestId: string;
}

type MaybePlayerDataRequest = PlayerDataRequest | null;

const createCurrentRequest = (
  reportId: string,
  fightId: number,
  requestId: string,
): PlayerDataRequest => ({
  reportId,
  fightId,
  requestId,
});

const isStaleResponse = (
  currentRequest: MaybePlayerDataRequest,
  responseRequestId: string,
  expectedReportId: string,
  expectedFightId: number,
): boolean => {
  if (!currentRequest) {
    return true;
  }
  return (
    currentRequest.requestId !== responseRequestId ||
    currentRequest.reportId !== expectedReportId ||
    currentRequest.fightId !== expectedFightId
  );
};

export interface PlayerDetailsWithRole extends PlayerDetailsEntry {
  role: 'dps' | 'tank' | 'healer';
}

export interface PlayerDataEntry {
  playersById: Record<string | number, PlayerDetailsWithRole>;
  status: 'idle' | 'loading' | 'succeeded' | 'failed';
  error: string | null;
  cacheMetadata: {
    lastFetchedTimestamp: number | null;
    playerCount: number;
  };
  currentRequest: MaybePlayerDataRequest;
}

export type PlayerDataState = KeyedCacheState<PlayerDataEntry>;

interface LocalRootState {
  playerData: PlayerDataState;
}

const createEmptyEntry = (): PlayerDataEntry => ({
  playersById: {},
  status: 'idle',
  error: null,
  cacheMetadata: {
    lastFetchedTimestamp: null,
    playerCount: 0,
  },
  currentRequest: null,
});

const ensureEntry = (state: PlayerDataState, key: string): PlayerDataEntry => {
  if (!state.entries[key]) {
    state.entries[key] = createEmptyEntry();
  }
  return state.entries[key];
};

const initialState: PlayerDataState = {
  entries: {},
  accessOrder: [],
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
        response.reportData?.report?.playerDetails?.data?.playerDetails || ({} as PlayerDetails);

      const playersById: Record<string | number, PlayerDetailsWithRole> = {};

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
      const state = (getState() as LocalRootState).playerData;
      const { key } = resolveCacheKey({ reportCode, fightId });
      const entry = state.entries[key];

      const lastFetchedTimestamp = entry?.cacheMetadata.lastFetchedTimestamp ?? null;
      const isCached = Boolean(entry && Object.keys(entry.playersById).length > 0);
      const isFresh =
        typeof lastFetchedTimestamp === 'number' &&
        Date.now() - lastFetchedTimestamp < DATA_FETCH_CACHE_TIMEOUT;

      if (isCached && isFresh) {
        logger.info('Using cached player data', {
          reportCode,
          fightId,
          cacheAge: lastFetchedTimestamp ? Date.now() - lastFetchedTimestamp : null,
        });
        return false;
      }

      if (entry?.status === 'loading') {
        logger.info('Player data fetch already in progress, skipping', {
          reportCode,
          fightId,
        });
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
    clearPlayerData(state) {
      resetCacheState(state);
    },
    resetPlayerDataLoading(state) {
      Object.values(state.entries).forEach((entry) => {
        if (entry.status === 'loading') {
          entry.status = 'idle';
        }
        entry.error = null;
        entry.currentRequest = null;
      });
    },
    clearPlayerDataForContext(
      state,
      action: PayloadAction<{ reportCode?: string | null; fightId?: number | string | null }>,
    ) {
      const { context, key } = resolveCacheKey(action.payload);
      if (!context.reportCode || context.fightId === null) {
        resetCacheState(state);
        return;
      }
      removeFromCache(state, key);
    },
    trimPlayerDataCache(state, action: PayloadAction<{ maxEntries?: number } | undefined>) {
      const limit = action?.payload?.maxEntries ?? PLAYER_DATA_CACHE_MAX_ENTRIES;
      trimCache(state, limit);
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchPlayerData.pending, (state, action) => {
        const { key, context } = resolveCacheKey({
          reportCode: action.meta.arg.reportCode,
          fightId: action.meta.arg.fightId,
        });
        if (!context.reportCode || context.fightId === null) {
          return;
        }
        const entry = ensureEntry(state, key);
        entry.status = 'loading';
        entry.error = null;
        entry.currentRequest = createCurrentRequest(
          action.meta.arg.reportCode,
          action.meta.arg.fightId,
          action.meta.requestId,
        );
        touchAccessOrder(state, key);
      })
      .addCase(fetchPlayerData.fulfilled, (state, action) => {
        const { key, context } = resolveCacheKey({
          reportCode: action.payload.reportCode,
          fightId: action.payload.fightId,
        });
        if (!context.reportCode || context.fightId === null) {
          return;
        }
        const entry = ensureEntry(state, key);
        if (
          isStaleResponse(
            entry.currentRequest,
            action.meta.requestId,
            action.payload.reportCode,
            action.payload.fightId,
          )
        ) {
          logger.info('Ignoring stale player data response', {
            reportCode: action.payload.reportCode,
            fightId: action.payload.fightId,
          });
          return;
        }
        entry.playersById = action.payload.playersById;
        entry.status = 'succeeded';
        entry.error = null;
        entry.cacheMetadata.lastFetchedTimestamp = Date.now();
        entry.cacheMetadata.playerCount = Object.keys(action.payload.playersById).length;
        entry.currentRequest = null;
        touchAccessOrder(state, key);
        trimCache(state, PLAYER_DATA_CACHE_MAX_ENTRIES);
      })
      .addCase(fetchPlayerData.rejected, (state, action) => {
        const { key, context } = resolveCacheKey({
          reportCode: action.meta.arg.reportCode,
          fightId: action.meta.arg.fightId,
        });
        if (!context.reportCode || context.fightId === null) {
          return;
        }
        const entry = ensureEntry(state, key);
        if (
          isStaleResponse(
            entry.currentRequest,
            action.meta.requestId,
            action.meta.arg.reportCode,
            action.meta.arg.fightId,
          )
        ) {
          logger.info('Ignoring stale player data error response', {
            reportCode: action.meta.arg.reportCode,
            fightId: action.meta.arg.fightId,
          });
          return;
        }
        entry.status = 'failed';
        entry.error =
          (action.payload as string) || action.error.message || 'Failed to fetch player data';
        entry.currentRequest = null;
        touchAccessOrder(state, key);
      });
  },
});

export const {
  clearPlayerData,
  resetPlayerDataLoading,
  clearPlayerDataForContext,
  trimPlayerDataCache,
} = playerDataSlice.actions;
export default playerDataSlice.reducer;
