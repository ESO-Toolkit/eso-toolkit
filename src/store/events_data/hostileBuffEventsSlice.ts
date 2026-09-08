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
import { Logger, LogLevel } from '../../utils/logger';
import {
  KeyedCacheState,
  removeFromCache,
  resolveCacheKey,
  resetCacheState,
  touchAccessOrder,
  trimCache,
} from '../utils/keyedCacheState';

import {
  EVENT_CACHE_MAX_ENTRIES,
  EVENT_MAX_EVENTS_PER_STREAM,
  EVENT_MAX_INTERVALS_PER_STREAM,
  EVENT_MAX_PAGES_PER_STREAM,
  EVENT_PAGE_LIMIT,
  EVENT_QUERY_MAX_CONCURRENCY,
} from './constants';
import { assertCompleteEventPage, deduplicateEventPages } from './utils/deduplicateEvents';
import { createCurrentRequest, isStaleResponse } from './utils/requestTracking';

const logger = new Logger({ level: LogLevel.INFO, contextPrefix: 'HostileBuffEvents' });

interface IntervalFetchResult {
  startTime: number;
  endTime: number;
  events: BuffEvent[];
}

interface PaginationBudget {
  events: number;
  pages: number;
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

export const createHostileBuffTimeIntervals = (
  startTime: number,
  endTime: number,
  intervalSize = 60000,
): Array<{ startTime: number; endTime: number }> => {
  if (
    !Number.isFinite(startTime) ||
    !Number.isFinite(endTime) ||
    !Number.isFinite(intervalSize) ||
    startTime < 0 ||
    endTime < 0 ||
    Object.is(startTime, -0) ||
    Object.is(endTime, -0) ||
    intervalSize <= 0 ||
    endTime <= startTime
  ) {
    throw new Error('Invalid hostile buff event interval');
  }
  const intervals: Array<{ startTime: number; endTime: number }> = [];
  let currentStart = startTime;

  while (currentStart < endTime) {
    if (intervals.length >= EVENT_MAX_INTERVALS_PER_STREAM) {
      throw new Error(
        `Hostile buff event interval count exceeded ${EVENT_MAX_INTERVALS_PER_STREAM}`,
      );
    }
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
  signal: AbortSignal,
  budget: PaginationBudget,
): Promise<BuffEvent[]> => {
  const eventPages: LogEvent[][] = [];
  let nextPageTimestamp: number | null = null;

  do {
    signal.throwIfAborted();
    if (budget.pages >= EVENT_MAX_PAGES_PER_STREAM) {
      throw new Error(`Hostile buff event pagination exceeded ${EVENT_MAX_PAGES_PER_STREAM} pages`);
    }
    budget.pages += 1;
    const requestedStartTime = nextPageTimestamp ?? intervalStart;
    const response: GetBuffEventsQuery = await client.query({
      query: GetBuffEventsDocument,
      fetchPolicy: 'no-cache',
      context: { fetchOptions: { signal } },
      variables: {
        code: reportCode,
        fightIds: [Number(fight.id)],
        startTime: requestedStartTime,
        endTime: intervalEnd,
        hostilityType: HostilityType.Enemies,
        limit: EVENT_PAGE_LIMIT,
      },
    });

    const page = response.reportData?.report?.events;
    assertCompleteEventPage(page, 'Hostile buff');
    if (page.data.length) {
      const nextEventCount = budget.events + page.data.length;
      if (nextEventCount > EVENT_MAX_EVENTS_PER_STREAM) {
        throw new Error(
          `Hostile buff event pagination exceeded ${EVENT_MAX_EVENTS_PER_STREAM} events`,
        );
      }
      budget.events = nextEventCount;
      eventPages.push(page.data);
    }
    const followingTimestamp = page.nextPageTimestamp ?? null;
    if (
      followingTimestamp != null &&
      (!Number.isFinite(followingTimestamp) || followingTimestamp <= requestedStartTime)
    ) {
      throw new Error('Hostile buff event pagination cursor did not advance');
    }
    nextPageTimestamp = followingTimestamp;
  } while (nextPageTimestamp != null && nextPageTimestamp < intervalEnd);

  return deduplicateEventPages(eventPages as BuffEvent[][]);
};

export const fetchHostileBuffEvents = createAsyncThunk<
  { events: BuffEvent[]; intervalResults: IntervalFetchResult[] },
  { reportCode: string; fight: FightFragment; client: EsoLogsClient; intervalSize?: number },
  { state: LocalRootState; rejectValue: string }
>(
  'hostileBuffEvents/fetchHostileBuffEvents',
  async ({ reportCode, fight, client, intervalSize = 30000 }, { rejectWithValue, signal }) => {
    let intervals: Array<{ startTime: number; endTime: number }>;
    try {
      intervals = createHostileBuffTimeIntervals(fight.startTime, fight.endTime, intervalSize);
    } catch (error) {
      return rejectWithValue(
        error instanceof Error ? error.message : 'Invalid hostile buff event interval',
      );
    }
    const paginationBudget: PaginationBudget = { events: 0, pages: 0 };
    const intervalResults: IntervalFetchResult[] = new Array(intervals.length);
    const intervalAbortController = new AbortController();
    const abortIntervals = (): void => intervalAbortController.abort(signal.reason);
    if (signal.aborted) {
      abortIntervals();
    } else {
      signal.addEventListener('abort', abortIntervals, { once: true });
    }
    let nextIntervalIndex = 0;
    let fetchFailure: unknown;

    const fetchNextInterval = async (): Promise<void> => {
      while (fetchFailure === undefined && nextIntervalIndex < intervals.length) {
        const intervalIndex = nextIntervalIndex;
        nextIntervalIndex += 1;
        const interval = intervals[intervalIndex];
        if (!interval) {
          continue;
        }

        try {
          const events = await fetchEventsForInterval(
            client,
            reportCode,
            fight,
            interval.startTime,
            interval.endTime,
            intervalAbortController.signal,
            paginationBudget,
          );
          intervalResults[intervalIndex] = {
            startTime: interval.startTime,
            endTime: interval.endTime,
            events,
          };
        } catch (error) {
          if (fetchFailure === undefined) {
            fetchFailure = error ?? new Error('Failed to fetch hostile buff events');
            intervalAbortController.abort(fetchFailure);
          }
          return;
        }
      }
    };

    try {
      await Promise.all(
        Array.from({ length: Math.min(EVENT_QUERY_MAX_CONCURRENCY, intervals.length) }, () =>
          fetchNextInterval(),
        ),
      );
    } finally {
      signal.removeEventListener('abort', abortIntervals);
    }

    if (fetchFailure !== undefined) {
      return rejectWithValue(
        fetchFailure instanceof Error
          ? fetchFailure.message
          : 'Failed to fetch hostile buff events',
      );
    }

    const allEvents = deduplicateEventPages(intervalResults.map((result) => result.events)).sort(
      (a, b) => a.timestamp - b.timestamp,
    );

    return { events: allEvents, intervalResults };
  },
  {
    condition: ({ reportCode, fight }, { getState }) => {
      const state = getState().events.hostileBuffs;
      const { key } = resolveCacheKey({ reportCode, fightId: Number(fight.id) });
      const entry = state.entries[key];

      const lastFetchedTimestamp = entry?.cacheMetadata.lastFetchedTimestamp;
      const isCached = entry?.status === 'succeeded';
      const isComplete = (entry?.cacheMetadata.failedIntervals ?? 0) === 0;
      const isFresh =
        typeof lastFetchedTimestamp === 'number' &&
        Date.now() - lastFetchedTimestamp < DATA_FETCH_CACHE_TIMEOUT;

      if (isCached && isComplete && isFresh) {
        return false; // Prevent thunk execution
      }

      const inFlight = entry?.currentRequest;
      if (inFlight && inFlight.reportId === reportCode && inFlight.fightId === Number(fight.id)) {
        return false; // Prevent duplicate execution
      }

      return true; // Allow thunk execution
    },
    dispatchConditionRejection: true,
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
        entry.cacheMetadata.failedIntervals = 0;
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
        if (action.meta.condition) {
          const lastFetchedTimestamp = entry.cacheMetadata.lastFetchedTimestamp;
          const isFresh =
            typeof lastFetchedTimestamp === 'number' &&
            Date.now() - lastFetchedTimestamp < DATA_FETCH_CACHE_TIMEOUT;
          if (entry.status === 'succeeded' && isFresh) {
            entry.error = null;
            entry.currentRequest = null;
            touchAccessOrder(state, key);
          }
          return;
        }
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
        entry.error =
          action.payload ?? action.error.message ?? 'Failed to fetch hostile buff events';
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
