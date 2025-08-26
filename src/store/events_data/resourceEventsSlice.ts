<<<<<<< HEAD
import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';

import { DATA_FETCH_CACHE_TIMEOUT } from '../../Constants';
import { EsoLogsClient } from '../../esologsClient';
import {
  FightFragment,
  GetResourceEventsDocument,
  GetResourceEventsQuery,
  HostilityType,
} from '../../graphql/generated';
import { ResourceChangeEvent, LogEvent } from '../../types/combatlogEvents';
import { RootState } from '../storeWithHistory';

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
  }
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
=======
import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';

import { DATA_FETCH_CACHE_TIMEOUT } from '../../Constants';
import { createEsoLogsClient } from '../../esologsClient';
import {
  FightFragment,
  GetResourceEventsDocument,
  GetResourceEventsQuery,
  HostilityType,
} from '../../graphql/generated';
import { ResourceChangeEvent, LogEvent } from '../../types/combatlogEvents';
import { RootState } from '../storeWithHistory';

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
  { reportCode: string; fight: FightFragment; accessToken: string },
  { state: RootState; rejectValue: string }
>(
  'resourceEvents/fetchResourceEvents',
  async ({ reportCode, fight, accessToken }) => {
    const client = createEsoLogsClient(accessToken);

    // Fetch both friendly and enemy resource events
    const hostilityTypes = [HostilityType.Friendlies, HostilityType.Enemies];
    let allEvents: ResourceChangeEvent[] = [];

    for (const hostilityType of hostilityTypes) {
      let nextPageTimestamp: number | null = null;

      do {
        const response: { data: GetResourceEventsQuery } = await client.query({
          query: GetResourceEventsDocument,
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
          // Filter to only resource events during the loop for better performance
          const resourceEvents = page.data.filter(
            (event: LogEvent) => event.type === 'resourcechange'
          ) as ResourceChangeEvent[];
          allEvents = allEvents.concat(resourceEvents);
        }
        nextPageTimestamp = page?.nextPageTimestamp ?? null;
      } while (nextPageTimestamp);
    }

    return allEvents;
  },
  {
    condition: ({ reportCode, fight, accessToken }, { getState }) => {
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

const resourceEventsSlice = createSlice({
  name: 'resourceEvents',
  initialState,
  reducers: {
    clearResourceEvents(state) {
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
      .addCase(fetchResourceEvents.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message || 'Failed to fetch resource events';
      });
  },
});

export const { clearResourceEvents } = resourceEventsSlice.actions;
export default resourceEventsSlice.reducer;
>>>>>>> pr-21
