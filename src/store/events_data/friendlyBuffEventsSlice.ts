import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';

import { DATA_FETCH_CACHE_TIMEOUT } from '../../Constants';
import { EsoLogsClient } from '../../esologsClient';
import {
  FightFragment,
  GetBuffEventsDocument,
  GetBuffEventsQuery,
  HostilityType,
} from '../../graphql/generated';
import { BuffEvent, LogEvent } from '../../types/combatlogEvents';
import { RootState } from '../storeWithHistory';

// Interface for tracking interval fetching state
interface IntervalFetchResult {
  startTime: number;
  endTime: number;
  events: BuffEvent[];
  error?: string;
}

export interface FriendlyBuffEventsState {
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

const initialState: FriendlyBuffEventsState = {
  events: [],
  loading: false,
  error: null,
  cacheMetadata: {
    lastFetchedReportId: null,
    lastFetchedFightId: null,
    lastFetchedTimestamp: null,
  },
};

// Helper function to create time intervals
const createTimeIntervals = (
  startTime: number,
  endTime: number,
  intervalSize = 60000
): Array<{ startTime: number; endTime: number }> => {
  const intervals: Array<{ startTime: number; endTime: number }> = [];
  let currentStart = startTime;

  while (currentStart < endTime) {
    const currentEnd = Math.min(currentStart + intervalSize, endTime);
    intervals.push({ startTime: currentStart, endTime: currentEnd });
    currentStart = currentEnd;
  }

  return intervals;
};

// Helper function to fetch events for a single interval with pagination
const fetchEventsForInterval = async (
  client: EsoLogsClient,
  reportCode: string,
  fight: FightFragment,
  intervalStart: number,
  intervalEnd: number,
  hostilityType: HostilityType
): Promise<BuffEvent[]> => {
  let allEvents: LogEvent[] = [];
  let nextPageTimestamp: number | null = null;

  do {
    const response: GetBuffEventsQuery = await client.query({
      query: GetBuffEventsDocument,
      variables: {
        code: reportCode,
        fightIds: [Number(fight.id)],
        startTime: nextPageTimestamp ?? intervalStart,
        endTime: intervalEnd,
        hostilityType: hostilityType,
      },
    });

    const page = response.reportData?.report?.events;
    if (page?.data) {
      allEvents = allEvents.concat(page.data);
    }
    nextPageTimestamp = page?.nextPageTimestamp ?? null;
  } while (nextPageTimestamp && nextPageTimestamp < intervalEnd);

  return allEvents as BuffEvent[];
};

export const fetchFriendlyBuffEvents = createAsyncThunk<
  { events: BuffEvent[]; intervalResults: IntervalFetchResult[] },
  { reportCode: string; fight: FightFragment; client: EsoLogsClient; intervalSize?: number },
  { state: RootState; rejectValue: string }
>(
  'friendlyBuffEvents/fetchFriendlyBuffEvents',
  async ({ reportCode, fight, client, intervalSize = 30000 }) => {
    const intervals = createTimeIntervals(fight.startTime, fight.endTime, intervalSize);

    // Create promises for all interval combinations (only friendlies)
    const fetchPromises = intervals.map(async (interval): Promise<IntervalFetchResult> => {
      try {
        const events = await fetchEventsForInterval(
          client,
          reportCode,
          fight,
          interval.startTime,
          interval.endTime,
          HostilityType.Friendlies
        );

        return {
          startTime: interval.startTime,
          endTime: interval.endTime,
          events,
        };
      } catch (error) {
        return {
          startTime: interval.startTime,
          endTime: interval.endTime,
          events: [],
          error: error instanceof Error ? error.message : 'Unknown error',
        };
      }
    });

    // Execute all promises in parallel
    const intervalResults = await Promise.all(fetchPromises);

    // Combine all events and sort by timestamp
    const allEvents = intervalResults
      .flatMap((result) => result.events)
      .sort((a, b) => a.timestamp - b.timestamp);

    return { events: allEvents, intervalResults };
  },
  {
    condition: ({ reportCode, fight }, { getState }) => {
      const state = getState().events.friendlyBuffs;
      const requestedReportId = reportCode;
      const requestedFightId = Number(fight.id);

      // Check if friendly buff events are already cached for this fight
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

const friendlyBuffEventsSlice = createSlice({
  name: 'friendlyBuffEvents',
  initialState,
  reducers: {
    clearFriendlyBuffEvents(state) {
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
      .addCase(fetchFriendlyBuffEvents.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchFriendlyBuffEvents.fulfilled, (state, action) => {
        state.events = action.payload.events;
        state.loading = false;
        state.error = null;
        // Update cache metadata
        state.cacheMetadata = {
          lastFetchedReportId: action.meta.arg.reportCode,
          lastFetchedFightId: Number(action.meta.arg.fight.id),
          lastFetchedTimestamp: Date.now(),
        };
      })
      .addCase(fetchFriendlyBuffEvents.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message || 'Failed to fetch friendly buff events';
      });
  },
});

export const { clearFriendlyBuffEvents } = friendlyBuffEventsSlice.actions;
export default friendlyBuffEventsSlice.reducer;
