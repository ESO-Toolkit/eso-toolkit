import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';

import { EsoLogsClient } from '../../esologsClient';
import {
  GetReportMasterDataDocument,
  ReportAbilityFragment,
  ReportActorFragment,
} from '../../graphql/generated';
import { cleanArray } from '../../utils/cleanArray';

interface MasterDataState {
  abilitiesById: Record<string | number, ReportAbilityFragment>;
  actorsById: Record<string | number, ReportActorFragment>;
  loading: boolean;
  loaded: boolean;
  error: string | null;
  // OPTIMIZED: Add cache management and granular loading states
  cacheMetadata: {
    lastFetchedReportId: string | null;
    lastFetchedTimestamp: number | null;
    actorCount: number;
    abilityCount: number;
  };
}

const initialState: MasterDataState = {
  abilitiesById: {},
  actorsById: {},
  loading: false,
  loaded: false,
  error: null,
  // OPTIMIZED: Initialize cache metadata
  cacheMetadata: {
    lastFetchedReportId: null,
    lastFetchedTimestamp: null,
    actorCount: 0,
    abilityCount: 0,
  },
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
      // Check if we already have master data for this report
      if (
        state.masterData.cacheMetadata.lastFetchedReportId === reportCode &&
        state.masterData.loaded &&
        Object.keys(state.masterData.abilitiesById).length > 0 &&
        Object.keys(state.masterData.actorsById).length > 0
      ) {
        return false; // Prevent thunk execution - data is cached
      }

      if (state.masterData.loading) {
        return false; // Prevent duplicate execution
      }

      return true; // Allow thunk execution
    },
  }
);

const masterDataSlice = createSlice({
  name: 'masterData',
  initialState,
  reducers: {
    clearMasterData(state) {
      state.abilitiesById = {};
      state.actorsById = {};
      state.loading = false;
      state.loaded = false;
      state.error = null;
      // OPTIMIZED: Reset cache metadata and loading states
      state.cacheMetadata = {
        lastFetchedReportId: null,
        lastFetchedTimestamp: null,
        actorCount: 0,
        abilityCount: 0,
      };
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchReportMasterData.pending, (state) => {
        state.loading = true;
        state.error = null;
        state.loaded = false;
      })
      .addCase(
        fetchReportMasterData.fulfilled,
        (state, action: PayloadAction<MasterDataPayload>) => {
          state.abilitiesById = action.payload.abilitiesById;
          state.actorsById = action.payload.actorsById;
          state.loading = false;
          state.loaded = true;
          state.error = null;
          // OPTIMIZED: Update cache metadata
          state.cacheMetadata.lastFetchedReportId = action.payload.reportCode;
          state.cacheMetadata.lastFetchedTimestamp = Date.now();
          state.cacheMetadata.actorCount = action.payload.actors.length;
          state.cacheMetadata.abilityCount = action.payload.abilities.length;
        }
      )
      .addCase(fetchReportMasterData.rejected, (state, action) => {
        state.loading = false;
        state.error = (action.payload as string) || 'Failed to fetch master data';
      });
  },
});

export const { clearMasterData } = masterDataSlice.actions;
export default masterDataSlice.reducer;
