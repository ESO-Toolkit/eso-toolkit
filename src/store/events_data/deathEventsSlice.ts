import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';

import { DATA_FETCH_CACHE_TIMEOUT } from '../../Constants';
import { EsoLogsClient } from '../../esologsClient';
import {
  FightFragment,
  GetDeathEventsDocument,
  GetDeathEventsQuery,
  HostilityType,
} from '../../graphql/generated';
import { DeathEvent, LogEvent } from '../../types/combatlogEvents';
import { RootState } from '../storeWithHistory';

export interface DeathEventsState {
  events: DeathEvent[];
  loading: boolean;
  error: string | null;
  // Cache metadata for better cache management
  cacheMetadata: {
    lastFetchedReportId: string | null;
    lastFetchedFightId: number | null;
    lastFetchedTimestamp: number | null;
  };
}

const initialState: DeathEventsState = {
  events: [],
  loading: false,
  error: null,
  cacheMetadata: {
    lastFetchedReportId: null,
    lastFetchedFightId: null,
    lastFetchedTimestamp: null,
  },
};

export const fetchDeathEvents = createAsyncThunk<
  DeathEvent[],
  { reportCode: string; fight: FightFragment; client: EsoLogsClient },
  { state: RootState; rejectValue: string }
>(
  'deathEvents/fetchDeathEvents',
  async ({ reportCode, fight, client }) => {
    // Fetch both friendly and enemy death events
    const hostilityTypes = [HostilityType.Friendlies, HostilityType.Enemies];
    let allEvents: LogEvent[] = [];

    for (const hostilityType of hostilityTypes) {
      let nextPageTimestamp: number | null = null;

      do {
        const response: GetDeathEventsQuery = await client.query({
          query: GetDeathEventsDocument,
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

    // Filter to only death events
    const deathEvents = allEvents.filter((event) => event.type === 'death') as DeathEvent[];
    return deathEvents;
  },
  {
    condition: ({ reportCode, fight }, { getState }) => {
      const state = getState().events.deaths;
      const requestedReportId = reportCode;
      const requestedFightId = Number(fight.id);

      // Check if death events are already cached for this fight
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

const deathEventsSlice = createSlice({
  name: 'deathEvents',
  initialState,
  reducers: {
    clearDeathEvents(state) {
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
      .addCase(fetchDeathEvents.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchDeathEvents.fulfilled, (state, action) => {
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
      .addCase(fetchDeathEvents.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message || 'Failed to fetch death events';
      });
  },
});

export const { clearDeathEvents } = deathEventsSlice.actions;
export default deathEventsSlice.reducer;
