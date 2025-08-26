import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';

import { DATA_FETCH_CACHE_TIMEOUT } from '../../Constants';
import { EsoLogsClient } from '../../esologsClient';
import {
  FightFragment,
  GetCastEventsDocument,
  GetCastEventsQuery,
  HostilityType,
} from '../../graphql/generated';
import { BeginCastEvent, CastEvent, UnifiedCastEvent } from '../../types/combatlogEvents';
import { RootState } from '../storeWithHistory';

export interface CastEventsState {
  events: UnifiedCastEvent[];
  loading: boolean;
  error: string | null;
  // Cache metadata for better cache management
  cacheMetadata: {
    lastFetchedReportId: string | null;
    lastFetchedFightId: number | null;
    lastFetchedTimestamp: number | null;
  };
}

const initialState: CastEventsState = {
  events: [],
  loading: false,
  error: null,
  cacheMetadata: {
    lastFetchedReportId: null,
    lastFetchedFightId: null,
    lastFetchedTimestamp: null,
  },
};

export const fetchCastEvents = createAsyncThunk<
  CastEvent[],
  { reportCode: string; fight: FightFragment; client: EsoLogsClient },
  { state: RootState; rejectValue: string }
>(
  'castEvents/fetchCastEvents',
  async ({ reportCode, fight, client }) => {
    // Fetch both friendly and enemy cast events
    const hostilityTypes = [HostilityType.Friendlies, HostilityType.Enemies];
    let allEvents: (CastEvent | BeginCastEvent)[] = [];

    for (const hostilityType of hostilityTypes) {
      let nextPageTimestamp: number | null = null;

      do {
        const response: GetCastEventsQuery = await client.query({
          query: GetCastEventsDocument,
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

    // Filter to only cast events
    const castEvents = allEvents.filter(
      (event) => !event.fake && (event.type === 'begincast' || event.type === 'cast')
    ) as CastEvent[];
    return castEvents;
  },
  {
    condition: ({ reportCode, fight }, { getState }) => {
      const state = getState().events.casts;
      const requestedReportId = reportCode;
      const requestedFightId = Number(fight.id);

      // Check if cast events are already cached for this fight
      const isCached =
        state.cacheMetadata.lastFetchedReportId === requestedReportId &&
        state.cacheMetadata.lastFetchedFightId === requestedFightId;
      const isFresh =
        state.cacheMetadata.lastFetchedTimestamp &&
        Date.now() - state.cacheMetadata.lastFetchedTimestamp < DATA_FETCH_CACHE_TIMEOUT;

      if (isCached && isFresh) {
        return false; // Prevent thunk execution
      }

      if (state.loading) {
        return false; // Prevent duplicate execution
      }

      return true; // Allow thunk execution
    },
  }
);

const castEventsSlice = createSlice({
  name: 'castEvents',
  initialState,
  reducers: {
    clearCastEvents(state) {
      state.events = [];
      state.loading = false;
      state.error = null;
      state.cacheMetadata = {
        lastFetchedReportId: null,
        lastFetchedFightId: null,
        lastFetchedTimestamp: null,
      };
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchCastEvents.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchCastEvents.fulfilled, (state, action) => {
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
      .addCase(fetchCastEvents.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message || 'Failed to fetch cast events';
      });
  },
});

export const { clearCastEvents } = castEventsSlice.actions;
export default castEventsSlice.reducer;
