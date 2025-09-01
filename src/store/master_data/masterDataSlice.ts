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

      console.log('🧪 Checking thunk condition for reportCode:', reportCode, {
        lastFetchedReportId: state.masterData.cacheMetadata.lastFetchedReportId,
        loaded: state.masterData.loaded,
        loading: state.masterData.loading,
        actorCount: Object.keys(state.masterData.actorsById).length,
        abilityCount: Object.keys(state.masterData.abilitiesById).length,
      });

      // Check if we already have master data for this report
      if (
        state.masterData.cacheMetadata.lastFetchedReportId === reportCode &&
        state.masterData.loaded &&
        Object.keys(state.masterData.abilitiesById).length > 0 &&
        Object.keys(state.masterData.actorsById).length > 0
      ) {
        console.log('✋ Preventing thunk execution - data is cached');
        return false; // Prevent thunk execution - data is cached
      }

      if (state.masterData.loading) {
        console.log('✋ Preventing thunk execution - already loading');
        return false; // Prevent duplicate execution
      }

      console.log('✅ Allowing thunk execution');
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
    // Add action to reset stuck loading state
    resetLoadingState(state) {
      console.log('🔄 Resetting stuck loading state');
      state.loading = false;
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchReportMasterData.pending, (state) => {
        console.log('🔄 fetchReportMasterData.pending - Setting loading to true');
        state.loading = true;
        state.error = null;
        state.loaded = false;
      })
      .addCase(
        fetchReportMasterData.fulfilled,
        (state, action: PayloadAction<MasterDataPayload>) => {
          console.log('✅ fetchReportMasterData.fulfilled - Loading complete', {
            actors: action.payload.actors.length,
            abilities: action.payload.abilities.length,
            reportCode: action.payload.reportCode,
          });
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
        console.error('❌ fetchReportMasterData.rejected - Error occurred', {
          error: action.payload || action.error?.message || 'Unknown error',
        });
        state.loading = false;
        state.error = (action.payload as string) || 'Failed to fetch master data';
      });
  },
});

export const { clearMasterData, resetLoadingState } = masterDataSlice.actions;
export default masterDataSlice.reducer;
