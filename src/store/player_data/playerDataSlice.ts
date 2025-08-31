import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';

import { EsoLogsClient } from '../../esologsClient';
import { GetPlayersForReportDocument } from '../../graphql/generated';
import { PlayerDetails, PlayerDetailsEntry } from '../../types/playerDetails';

export interface PlayerDataState {
  playersById: Record<string | number, PlayerDetailsWithRole>;
  loading: boolean;
  loaded: boolean;
  error: string | null;
  cacheMetadata: {
    lastFetchedReportId: string | null;
    lastFetchedFightId: number | null;
    lastFetchedTimestamp: number | null;
    playerCount: number;
  };
}

const initialState: PlayerDataState = {
  playersById: {},
  loading: false,
  loaded: false,
  error: null,
  cacheMetadata: {
    lastFetchedReportId: null,
    lastFetchedFightId: null,
    lastFetchedTimestamp: null,
    playerCount: 0,
  },
};

export interface PlayerDetailsWithRole extends PlayerDetailsEntry {
  role: 'dps' | 'tank' | 'healer';
}

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
      if (
        state.playerData.cacheMetadata.lastFetchedReportId === reportCode &&
        state.playerData.cacheMetadata.lastFetchedFightId === fightId
      ) {
        return false; // Prevent thunk execution - data is cached
      }
      if (state.playerData.loading) {
        return false; // Prevent duplicate execution
      }
      return true; // Allow thunk execution
    },
  }
);

const playerDataSlice = createSlice({
  name: 'playerData',
  initialState,
  reducers: {
    clearPlayerData(state) {
      state.playersById = {};
      state.loading = false;
      state.loaded = false;
      state.error = null;
      state.cacheMetadata = {
        lastFetchedReportId: null,
        lastFetchedFightId: null,
        lastFetchedTimestamp: null,
        playerCount: 0,
      };
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchPlayerData.pending, (state) => {
        state.loading = true;
        state.error = null;
        state.loaded = false;
      })
      .addCase(fetchPlayerData.fulfilled, (state, action: PayloadAction<PlayerDataPayload>) => {
        state.playersById = action.payload.playersById;
        state.loading = false;
        state.loaded = true;
        state.error = null;
        state.cacheMetadata.lastFetchedReportId = action.payload.reportCode;
        state.cacheMetadata.lastFetchedFightId = action.payload.fightId;
        state.cacheMetadata.lastFetchedTimestamp = Date.now();
      })
      .addCase(fetchPlayerData.rejected, (state, action) => {
        state.loading = false;
        state.error = (action.payload as string) || 'Failed to fetch player data';
      });
  },
});

export const { clearPlayerData } = playerDataSlice.actions;
export default playerDataSlice.reducer;
