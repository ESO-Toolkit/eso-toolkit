import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';

import { DATA_FETCH_CACHE_TIMEOUT } from '../../Constants';
import { EsoLogsClient } from '../../esologsClient';
import {
  FightFragment,
  GetDamageEventsDocument,
  GetDamageEventsQuery,
  HostilityType,
} from '../../graphql/generated';
import { DamageEvent, LogEvent } from '../../types/combatlogEvents';

// Local interface to avoid circular dependency with RootState
interface LocalRootState {
  events: {
    damage: DamageEventsState;
  };
}

export interface DamageEventsState {
  events: DamageEvent[];
  loading: boolean;
  error: string | null;
  // Cache metadata for better cache management
  cacheMetadata: {
    lastFetchedReportId: string | null;
    lastFetchedFightId: number | null;
    lastFetchedTimestamp: number | null;
  };
}

const initialState: DamageEventsState = {
  events: [],
  loading: false,
  error: null,
  cacheMetadata: {
    lastFetchedReportId: null,
    lastFetchedFightId: null,
    lastFetchedTimestamp: null,
  },
};

export const fetchDamageEvents = createAsyncThunk(
  'damageEvents/fetchDamageEvents',
  async (
    {
      reportCode,
      fight,
      client,
    }: { reportCode: string; fight: FightFragment; client: EsoLogsClient },
    { getState, rejectWithValue },
  ) => {
    // Fetch both friendly and enemy damage events
    const hostilityTypes = [HostilityType.Friendlies, HostilityType.Enemies];
    let allEvents: LogEvent[] = [];

    for (const hostilityType of hostilityTypes) {
      let nextPageTimestamp: number | null = null;

      do {
        const response: GetDamageEventsQuery = await client.query({
          query: GetDamageEventsDocument,
          fetchPolicy: 'no-cache',
          variables: {
            code: reportCode,
            fightIds: [Number(fight.id)],
            startTime: nextPageTimestamp ?? fight.startTime,
            endTime: fight.endTime,
            hostilityType: hostilityType,
          },
        });

        const page = response.reportData?.report?.events;
        if (page?.data) {
          allEvents = allEvents.concat(page.data);
        }
        nextPageTimestamp = page?.nextPageTimestamp ?? null;
      } while (nextPageTimestamp);
    }

    return allEvents as DamageEvent[];
  },
  {
    condition: ({ reportCode, fight }, { getState }) => {
      const state = (getState() as LocalRootState).events.damage;
      const requestedReportId = reportCode;
      const requestedFightId = Number(fight.id);

      console.log('🧪 Checking damage events thunk condition', {
        reportCode,
        fightId: requestedFightId,
        loading: state.loading,
        lastFetchedReportId: state.cacheMetadata.lastFetchedReportId,
        lastFetchedFightId: state.cacheMetadata.lastFetchedFightId,
        eventsCount: state.events.length,
      });

      // Check if damage events are already cached for this report and fight
      const isCached =
        state.cacheMetadata.lastFetchedReportId === requestedReportId &&
        state.cacheMetadata.lastFetchedFightId === requestedFightId;
      const isFresh =
        state.cacheMetadata.lastFetchedTimestamp &&
        Date.now() - state.cacheMetadata.lastFetchedTimestamp < DATA_FETCH_CACHE_TIMEOUT;

      if (isCached && isFresh) {
        console.log('✋ Preventing damage events thunk execution - data is cached and fresh');
        return false; // Prevent thunk execution
      }

      if (state.loading) {
        console.log('✋ Preventing damage events thunk execution - already loading');
        return false;
      }

      console.log('✅ Allowing damage events thunk execution');
      return true;
    },
  },
);

const damageEventsSlice = createSlice({
  name: 'damageEvents',
  initialState,
  reducers: {
    clearDamageEvents(state) {
      state.events = [];
      state.loading = false;
      state.error = null;
      state.cacheMetadata = {
        lastFetchedReportId: null,
        lastFetchedFightId: null,
        lastFetchedTimestamp: null,
      };
    },
    resetDamageEventsLoading(state) {
      console.log('🔄 Resetting stuck damage events loading state');
      state.loading = false;
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchDamageEvents.pending, (state) => {
        console.log('🔄 fetchDamageEvents.pending - Setting loading to true');
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchDamageEvents.fulfilled, (state, action) => {
        console.log('✅ fetchDamageEvents.fulfilled - Loading complete', {
          eventsCount: action.payload.length,
          reportCode: action.meta.arg.reportCode,
          fightId: action.meta.arg.fight.id,
        });
        state.events = action.payload;
        state.loading = false;
        state.error = null;
        // Update cache metadata
        state.cacheMetadata = {
          lastFetchedReportId: action.meta.arg.reportCode,
          lastFetchedFightId: Number(action.meta.arg.fight.id),
          lastFetchedTimestamp: Date.now(),
        };
      })
      .addCase(fetchDamageEvents.rejected, (state, action) => {
        console.error('❌ fetchDamageEvents.rejected - Error occurred', {
          error: action.error.message || 'Unknown error',
        });
        state.loading = false;
        state.error = action.error.message || 'Failed to fetch damage events';
      });
  },
});

export const { clearDamageEvents, resetDamageEventsLoading } = damageEventsSlice.actions;
export default damageEventsSlice.reducer;
