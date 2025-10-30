import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';

import { DATA_FETCH_CACHE_TIMEOUT } from '../../Constants';
import { EsoLogsClient } from '../../esologsClient';
import {
  FightFragment,
  GetBuffEventsDocument,
  GetBuffEventsQuery,
  HostilityType,
} from '../../graphql/gql/graphql';
import { BuffEvent, LogEvent } from '../../types/combatlogEvents';
import {
  KeyedCacheState,
  removeFromCache,
  resolveCacheKey,
  resetCacheState,
  touchAccessOrder,
  trimCache,
} from '../utils/keyedCacheState';

import { EVENT_CACHE_MAX_ENTRIES, EVENT_PAGE_LIMIT } from './constants';
import { createCurrentRequest, isStaleResponse } from './utils/requestTracking';

// Interface for tracking interval fetching state
interface IntervalFetchResult {
  startTime: number;
  endTime: number;
  events: BuffEvent[];
  error?: string;
}

type HostileBuffEventsRequest = ReturnType<typeof createCurrentRequest> | null;

export interface HostileBuffEventsEntry {
  events: BuffEvent[];
  status: 'idle' | 'loading' | 'succeeded' | 'failed';
  error: string | null;
  cacheMetadata: {
    lastFetchedTimestamp: number | null;
    intervalCount: number;
    failedIntervals: number;
  };
  currentRequest: HostileBuffEventsRequest;
}

export type HostileBuffEventsState = KeyedCacheState<HostileBuffEventsEntry>;

interface LocalRootState {
  events: {
    hostileBuffs: HostileBuffEventsState;
  };
}

const createEmptyEntry = (): HostileBuffEventsEntry => ({
  events: [],
  status: 'idle',
  error: null,
  cacheMetadata: {
    lastFetchedTimestamp: null,
    intervalCount: 0,
    failedIntervals: 0,
  },
  currentRequest: null,
});

const ensureEntry = (state: HostileBuffEventsState, key: string): HostileBuffEventsEntry => {
  if (!state.entries[key]) {
    state.entries[key] = createEmptyEntry();
  }
  return state.entries[key];
};

const initialState: HostileBuffEventsState = {
  entries: {},
  accessOrder: [],
};

// Helper function to create time intervals
const createTimeIntervals = (
  startTime: number,
  endTime: number,
  intervalSize = 60000,
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
): Promise<BuffEvent[]> => {
  let allEvents: LogEvent[] = [];
  let nextPageTimestamp: number | null = null;

  do {
    const response: GetBuffEventsQuery = await client.query({
      query: GetBuffEventsDocument,
      fetchPolicy: 'no-cache',
      variables: {
        code: reportCode,
        fightIds: [Number(fight.id)],
        startTime: nextPageTimestamp ?? intervalStart,
        endTime: intervalEnd,
        hostilityType: HostilityType.Enemies,
        limit: EVENT_PAGE_LIMIT,
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

export const fetchHostileBuffEvents = createAsyncThunk<
  { events: BuffEvent[]; intervalResults: IntervalFetchResult[] },
  { reportCode: string; fight: FightFragment; client: EsoLogsClient; intervalSize?: number },
  { state: LocalRootState; rejectValue: string }
>(
  'hostileBuffEvents/fetchHostileBuffEvents',
  async ({ reportCode, fight, client, intervalSize = 30000 }) => {
    const intervals = createTimeIntervals(fight.startTime, fight.endTime, intervalSize);

    // Create promises for all interval combinations (only enemies)
    const fetchPromises = intervals.map(async (interval): Promise<IntervalFetchResult> => {
      try {
        const events = await fetchEventsForInterval(
          client,
          reportCode,
          fight,
          interval.startTime,
          interval.endTime,
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
      const state = getState().events.hostileBuffs;
      const { key } = resolveCacheKey({ reportCode, fightId: Number(fight.id) });
      const entry = state.entries[key];

      const lastFetchedTimestamp = entry?.cacheMetadata.lastFetchedTimestamp;
      const isCached = Boolean(entry?.events.length);
      const isFresh =
        typeof lastFetchedTimestamp === 'number' &&
        Date.now() - lastFetchedTimestamp < DATA_FETCH_CACHE_TIMEOUT;

      if (isCached && isFresh) {
        return false; // Prevent thunk execution
      }

      const inFlight = entry?.currentRequest;
      if (
        inFlight &&
        inFlight.reportId === reportCode &&
        inFlight.fightId === Number(fight.id)
      ) {
        return false; // Prevent duplicate execution
      }

      return true; // Allow thunk execution
    },
  },
);

const hostileBuffEventsSlice = createSlice({
  name: 'hostileBuffEvents',
  initialState,
  reducers: {
    clearHostileBuffEvents(state) {
      resetCacheState(state);
    },
    resetHostileBuffEventsLoading(state) {
      Object.values(state.entries).forEach((entry) => {
        if (entry.status === 'loading') {
          entry.status = 'idle';
        }
        entry.error = null;
        entry.currentRequest = null;
      });
    },
    clearHostileBuffEventsForContext(
      state,
      action: PayloadAction<{ reportCode?: string | null; fightId?: number | string | null }>,
    ) {
      const { context, key } = resolveCacheKey(action.payload);
      if (!context.reportCode) {
        resetCacheState(state);
        return;
      }
      removeFromCache(state, key);
    },
    trimHostileBuffEventsCache(state, action: PayloadAction<{ maxEntries?: number } | undefined>) {
      const limit = action?.payload?.maxEntries ?? EVENT_CACHE_MAX_ENTRIES;
      trimCache(state, limit);
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchHostileBuffEvents.pending, (state, action) => {
        const { key } = resolveCacheKey({
          reportCode: action.meta.arg.reportCode,
          fightId: Number(action.meta.arg.fight.id),
        });
        const entry = ensureEntry(state, key);
        entry.status = 'loading';
        entry.error = null;
        entry.currentRequest = createCurrentRequest(
          action.meta.arg.reportCode,
          Number(action.meta.arg.fight.id),
          action.meta.requestId,
          true,
        );
        touchAccessOrder(state, key);
      })
      .addCase(fetchHostileBuffEvents.fulfilled, (state, action) => {
        const { key } = resolveCacheKey({
          reportCode: action.meta.arg.reportCode,
          fightId: Number(action.meta.arg.fight.id),
        });
        const entry = ensureEntry(state, key);
        if (
          isStaleResponse(
            entry.currentRequest,
            action.meta.requestId,
            action.meta.arg.reportCode,
            Number(action.meta.arg.fight.id),
          )
        ) {
          return;
        }
        entry.events = action.payload.events;
        entry.status = 'succeeded';
        entry.error = null;
        entry.cacheMetadata.lastFetchedTimestamp = Date.now();
        entry.cacheMetadata.intervalCount = action.payload.intervalResults.length;
        entry.cacheMetadata.failedIntervals = action.payload.intervalResults.filter((r) => r.error)
          .length;
        entry.currentRequest = null;
        touchAccessOrder(state, key);
        trimCache(state, EVENT_CACHE_MAX_ENTRIES);
      })
      .addCase(fetchHostileBuffEvents.rejected, (state, action) => {
        const { key } = resolveCacheKey({
          reportCode: action.meta.arg.reportCode,
          fightId: Number(action.meta.arg.fight.id),
        });
        const entry = ensureEntry(state, key);
        if (
          isStaleResponse(
            entry.currentRequest,
            action.meta.requestId,
            action.meta.arg.reportCode,
            Number(action.meta.arg.fight.id),
          )
        ) {
          return;
        }
        entry.status = 'failed';
        entry.error = action.error.message || 'Failed to fetch hostile buff events';
        entry.currentRequest = null;
        touchAccessOrder(state, key);
      });
  },
});

export const {
  clearHostileBuffEvents,
  resetHostileBuffEventsLoading,
  clearHostileBuffEventsForContext,
  trimHostileBuffEventsCache,
} = hostileBuffEventsSlice.actions;
export default hostileBuffEventsSlice.reducer;
