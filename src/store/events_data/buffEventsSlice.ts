import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';

import { DATA_FETCH_CACHE_TIMEOUT } from '../../Constants';
import { createEsoLogsClient } from '../../esologsClient';
import {
  FightFragment,
  GetBuffEventsDocument,
  GetBuffEventsQuery,
  HostilityType,
} from '../../graphql/generated';
import { BuffEvent, LogEvent } from '../../types/combatlogEvents';
import { RootState } from '../storeWithHistory';

export interface BuffEventsState {
  events: BuffEvent[];
  loading: boolean;
  error: string | null;
  // Cache metadata for better cache management
  cacheMetadata: {
    lastFetchedReportId: string | null;
    lastFetchedFightId: number | null;
    lastFetchedTimestamp: number | null;
  };
}

const initialState: BuffEventsState = {
  events: [],
  loading: false,
  error: null,
  cacheMetadata: {
    lastFetchedReportId: null,
    lastFetchedFightId: null,
    lastFetchedTimestamp: null,
  },
};

export const fetchBuffEvents = createAsyncThunk<
  BuffEvent[],
  { reportCode: string; fight: FightFragment; accessToken: string },
  { state: RootState; rejectValue: string }
>(
  'buffEvents/fetchBuffEvents',
  async ({ reportCode, fight, accessToken }) => {
    const client = createEsoLogsClient(accessToken);

    // Fetch both friendly and enemy buff events
    const hostilityTypes = [HostilityType.Friendlies, HostilityType.Enemies];
    let allEvents: LogEvent[] = [];

    for (const hostilityType of hostilityTypes) {
      let nextPageTimestamp: number | null = null;

      do {
        const response: { data: GetBuffEventsQuery } = await client.query({
          query: GetBuffEventsDocument,
          variables: {
            code: reportCode,
            fightIds: [Number(fight.id)],
            startTime: nextPageTimestamp ?? fight.startTime,
            endTime: fight.endTime,
            hostilityType: hostilityType,
          },
          context: {
            headers: {
              Authorization: accessToken ? `Bearer ${accessToken}` : undefined,
            },
          },
        });

        const page = response.data?.reportData?.report?.events;
        if (page?.data) {
          allEvents = allEvents.concat(page.data);
        }
        nextPageTimestamp = page?.nextPageTimestamp ?? null;
      } while (nextPageTimestamp);
    }

    return allEvents as BuffEvent[];
  },
  {
    condition: ({ reportCode, fight }, { getState }) => {
      const state = getState().events.buffs;
      const requestedReportId = reportCode;
      const requestedFightId = Number(fight.id);

      // Check if buff events are already cached for this fight
      const isCached =
        state.cacheMetadata.lastFetchedReportId === requestedReportId &&
        state.cacheMetadata.lastFetchedFightId === requestedFightId;
      const isFresh =
        state.cacheMetadata.lastFetchedTimestamp &&
        Date.now() - state.cacheMetadata.lastFetchedTimestamp < DATA_FETCH_CACHE_TIMEOUT;

      if (isCached && isFresh && state.events.length > 0) {
        return false; // Prevent thunk execution
      }

      if (state.loading) {
        return false; // Prevent duplicate execution
      }

      return true; // Allow thunk execution
    },
  }
);

const buffEventsSlice = createSlice({
  name: 'buffEvents',
  initialState,
  reducers: {
    clearBuffEvents(state) {
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
      .addCase(fetchBuffEvents.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchBuffEvents.fulfilled, (state, action) => {
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
      .addCase(fetchBuffEvents.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message || 'Failed to fetch buff events';
      });
  },
});

export const { clearBuffEvents } = buffEventsSlice.actions;
export default buffEventsSlice.reducer;
