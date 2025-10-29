import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';

import { DATA_FETCH_CACHE_TIMEOUT } from '../../Constants';
import { EsoLogsClient } from '../../esologsClient';
import {
  FightFragment,
  GetResourceEventsDocument,
  GetResourceEventsQuery,
  HostilityType,
} from '../../graphql/gql/graphql';
import { ResourceChangeEvent, LogEvent } from '../../types/combatlogEvents';
import { RootState } from '../storeWithHistory';

import { EVENT_PAGE_LIMIT } from './constants';

export interface ResourceEventsState {
  events: ResourceChangeEvent[];
  loading: boolean;
  error: string | null;
  // Cache metadata for better cache management
  cacheMetadata: {
    lastFetchedReportId: string | null;
    lastFetchedFightId: number | null;
    lastFetchedTimestamp: number | null;
  };
}

const initialState: ResourceEventsState = {
  events: [],
  loading: false,
  error: null,
  cacheMetadata: {
    lastFetchedReportId: null,
    lastFetchedFightId: null,
    lastFetchedTimestamp: null,
  },
};

export const fetchResourceEvents = createAsyncThunk<
  ResourceChangeEvent[],
  { reportCode: string; fight: FightFragment; client: EsoLogsClient },
  { state: RootState; rejectValue: string }
>(
  'resourceEvents/fetchResourceEvents',
  async ({ reportCode, fight, client }) => {
    // Fetch both friendly and enemy resource events
    const hostilityTypes = [HostilityType.Friendlies, HostilityType.Enemies];
    let allEvents: LogEvent[] = [];

    for (const hostilityType of hostilityTypes) {
      let nextPageTimestamp: number | null = null;

      do {
        const response: GetResourceEventsQuery = await client.query({
          query: GetResourceEventsDocument,
          fetchPolicy: 'no-cache',
          variables: {
            code: reportCode,
            fightIds: [Number(fight.id)],
            startTime: nextPageTimestamp ?? fight.startTime,
            endTime: fight.endTime,
            hostilityType: hostilityType,
            limit: EVENT_PAGE_LIMIT,
          },
        });

        const page = response.reportData?.report?.events;
        if (page?.data) {
          allEvents = allEvents.concat(page.data);
        }
        nextPageTimestamp = page?.nextPageTimestamp ?? null;
      } while (nextPageTimestamp);
    }

    return allEvents as ResourceChangeEvent[];
  },
  {
    condition: ({ reportCode, fight }, { getState }) => {
      const state = getState().events.resources;
      const requestedReportId = reportCode;
      const requestedFightId = Number(fight.id);

      // Check if resource events are already cached for this fight
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
  },
);

const resourceEventsSlice = createSlice({
  name: 'resourceEvents',
  initialState,
  reducers: {
    clearResourceEvents: (state) => {
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
      .addCase(fetchResourceEvents.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchResourceEvents.fulfilled, (state, action) => {
        state.loading = false;
        state.events = action.payload;
        state.error = null;
        // Update cache metadata
        const { reportCode, fight } = action.meta.arg;
        state.cacheMetadata = {
          lastFetchedReportId: reportCode,
          lastFetchedFightId: Number(fight.id),
          lastFetchedTimestamp: Date.now(),
        };
      })
      .addCase(fetchResourceEvents.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload || 'Failed to fetch resource events';
      });
  },
});

export const { clearResourceEvents } = resourceEventsSlice.actions;

export default resourceEventsSlice.reducer;
