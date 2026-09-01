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
import { createCurrentRequest, isStaleResponse } from './utils/requestTracking';

const logger = new Logger({ level: LogLevel.INFO, contextPrefix: 'FriendlyBuffEvents' });

// Interface for tracking interval fetching state
interface IntervalFetchResult {
  startTime: number;
  endTime: number;
  events: BuffEvent[];
}

interface PaginationBudget {
  events: number;
  continuationPages: number;
}

type FriendlyBuffEventsRequest = ReturnType<typeof createCurrentRequest> | null;

export interface FriendlyBuffEventsEntry {
  events: BuffEvent[];
  status: 'idle' | 'loading' | 'succeeded' | 'failed';
  error: string | null;
  cacheMetadata: {
    lastFetchedTimestamp: number | null;
    restrictToFightWindow: boolean | null;
    intervalCount: number;
  };
  currentRequest: FriendlyBuffEventsRequest;
}

export type FriendlyBuffEventsState = KeyedCacheState<FriendlyBuffEventsEntry>;

// Local RootState substitute to avoid circular dependency
interface LocalRootState {
  events: {
    friendlyBuffs: FriendlyBuffEventsState;
  };
}

const createEmptyEntry = (): FriendlyBuffEventsEntry => ({
  events: [],
  status: 'idle',
  error: null,
  cacheMetadata: {
    lastFetchedTimestamp: null,
    restrictToFightWindow: null,
    intervalCount: 0,
  },
  currentRequest: null,
});

const ensureEntry = (state: FriendlyBuffEventsState, key: string): FriendlyBuffEventsEntry => {
  if (!state.entries[key]) {
    state.entries[key] = createEmptyEntry();
  }
  return state.entries[key];
};

const initialState: FriendlyBuffEventsState = {
  entries: {},
  accessOrder: [],
};

// Helper function to create time intervals
export const createTimeIntervals = (
  startTime: number,
  endTime: number,
  intervalSize = 60000,
): Array<{ startTime: number; endTime: number }> => {
  if (
    !Number.isFinite(startTime) ||
    !Number.isFinite(endTime) ||
    !Number.isFinite(intervalSize) ||
    intervalSize <= 0 ||
    endTime < startTime
  ) {
    throw new Error('Invalid friendly buff event interval');
  }

  const intervals: Array<{ startTime: number; endTime: number }> = [];
  let currentStart = startTime;

  while (currentStart < endTime) {
    if (intervals.length >= EVENT_MAX_INTERVALS_PER_STREAM) {
      throw new Error(
        `Friendly buff event interval count exceeded ${EVENT_MAX_INTERVALS_PER_STREAM}`,
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
  hostilityType: HostilityType,
  restrictToFightWindow: boolean,
  signal: AbortSignal,
  budget: PaginationBudget,
): Promise<BuffEvent[]> => {
  const eventChunks: LogEvent[][] = [];
  let nextPageTimestamp: number | null = null;

  const initialStartTime = restrictToFightWindow ? intervalStart : undefined;
  const finalEndTime = restrictToFightWindow ? intervalEnd : undefined;

  do {
    signal.throwIfAborted();
    if (nextPageTimestamp != null) {
      if (budget.continuationPages >= EVENT_MAX_PAGES_PER_STREAM) {
        throw new Error(
          `Friendly buff event pagination exceeded ${EVENT_MAX_PAGES_PER_STREAM} continuation pages`,
        );
      }
      budget.continuationPages += 1;
    }

    const requestedStartTime = nextPageTimestamp ?? initialStartTime;
    const response: GetBuffEventsQuery = await client.query({
      query: GetBuffEventsDocument,
      fetchPolicy: 'no-cache',
      context: { fetchOptions: { signal } },
      variables: {
        code: reportCode,
        fightIds: [Number(fight.id)],
        startTime: requestedStartTime,
        endTime: finalEndTime,
        hostilityType: hostilityType,
        limit: EVENT_PAGE_LIMIT,
      },
    });
    const page = response.reportData?.report?.events;
    if (page?.data?.length) {
      const nextEventCount = budget.events + page.data.length;
      if (nextEventCount > EVENT_MAX_EVENTS_PER_STREAM) {
        throw new Error(
          `Friendly buff event pagination exceeded ${EVENT_MAX_EVENTS_PER_STREAM} events`,
        );
      }
      budget.events = nextEventCount;
      eventChunks.push(page.data);
    }
    const followingTimestamp = page?.nextPageTimestamp ?? null;
    if (
      followingTimestamp != null &&
      requestedStartTime != null &&
      followingTimestamp <= requestedStartTime
    ) {
      throw new Error('Friendly buff event pagination cursor did not advance');
    }
    nextPageTimestamp = followingTimestamp;
  } while (nextPageTimestamp && (restrictToFightWindow ? nextPageTimestamp < intervalEnd : true));

  return eventChunks.flat() as BuffEvent[];
};

export const fetchFriendlyBuffEvents = createAsyncThunk<
  { events: BuffEvent[]; intervalResults: IntervalFetchResult[] },
  {
    reportCode: string;
    fight: FightFragment;
    client: EsoLogsClient;
    intervalSize?: number;
    /**
     * Whether to restrict events to the fight time window.
     * - true (default): Only fetch events within the fight's start/end time (typical use case)
     * - false: Fetch all events for the entire report (used by ParseAnalysisPage for pre-fight buffs)
     */
    restrictToFightWindow?: boolean;
  },
  { state: LocalRootState; rejectValue: string }
>(
  'friendlyBuffEvents/fetchFriendlyBuffEvents',
  async (
    { reportCode, fight, client, intervalSize = 30000, restrictToFightWindow = true },
    { rejectWithValue, signal },
  ) => {
    logger.info('Fetching friendly buff events', {
      reportCode,
      fightId: fight.id,
      intervalSize,
      restrictToFightWindow,
    });

    let intervals: Array<{ startTime: number; endTime: number }>;
    try {
      intervals = restrictToFightWindow
        ? createTimeIntervals(fight.startTime, fight.endTime, intervalSize)
        : [{ startTime: fight.startTime, endTime: fight.endTime }];
    } catch (error) {
      return rejectWithValue(error instanceof Error ? error.message : 'Invalid event interval');
    }
    logger.info(`Created ${intervals.length} time intervals`, {
      reportCode,
      fightId: fight.id,
      intervalCount: intervals.length,
    });

    const intervalResults = new Array<IntervalFetchResult>(intervals.length);
    // Every interval requires one initial request. Only follow-up requests consume
    // the pagination budget so valid long fights are governed by the separate
    // interval cap instead of being rejected as excessive pagination.
    const paginationBudget: PaginationBudget = { events: 0, continuationPages: 0 };
    let nextIntervalIndex = 0;
    let fatalError: unknown;
    const fetchNextInterval = async (): Promise<void> => {
      while (fatalError == null && nextIntervalIndex < intervals.length) {
        const index = nextIntervalIndex;
        nextIntervalIndex += 1;
        const interval = intervals[index];
        if (!interval) continue;

        let events: BuffEvent[];
        try {
          events = await fetchEventsForInterval(
            client,
            reportCode,
            fight,
            interval.startTime,
            interval.endTime,
            HostilityType.Friendlies,
            restrictToFightWindow,
            signal,
            paginationBudget,
          );
        } catch (error) {
          // Record the first failure and let already-started requests settle before
          // rejecting. This prevents background workers from mutating shared budget
          // state after the thunk has published its failed result.
          fatalError ??= error;
          return;
        }

        logger.info(`Fetched interval ${index + 1}/${intervals.length}`, {
          reportCode,
          fightId: fight.id,
          intervalIndex: index + 1,
          totalIntervals: intervals.length,
          eventsInInterval: events.length,
        });

        intervalResults[index] = {
          startTime: interval.startTime,
          endTime: interval.endTime,
          events,
        };
      }
    };

    await Promise.all(
      Array.from(
        { length: Math.min(EVENT_QUERY_MAX_CONCURRENCY, intervals.length) },
        fetchNextInterval,
      ),
    );

    if (fatalError != null) {
      logger.error('Failed to fetch complete friendly buff event data', fatalError as Error, {
        reportCode,
        fightId: fight.id,
      });
      return rejectWithValue(
        fatalError instanceof Error ? fatalError.message : 'Failed to fetch friendly buff events',
      );
    }

    // Combine all events and sort by timestamp
    const allEvents = intervalResults
      .flatMap((result) => result.events)
      .sort((a, b) => a.timestamp - b.timestamp);

    logger.info('Friendly buff events fetch completed', {
      reportCode,
      fightId: fight.id,
      totalEvents: allEvents.length,
      successfulIntervals: intervalResults.length,
    });

    return { events: allEvents, intervalResults };
  },
  {
    condition: ({ reportCode, fight, restrictToFightWindow = true }, { getState }) => {
      const state = getState().events.friendlyBuffs;
      const { key } = resolveCacheKey({ reportCode, fightId: Number(fight.id) });
      const entry = state.entries[key];

      const cachedRestrict = entry?.cacheMetadata.restrictToFightWindow ?? true;
      const restrictMatches = cachedRestrict === restrictToFightWindow;

      const lastFetchedTimestamp = entry?.cacheMetadata.lastFetchedTimestamp;
      const isCached = typeof entry?.cacheMetadata.lastFetchedTimestamp === 'number';
      const isFresh =
        typeof lastFetchedTimestamp === 'number' &&
        Date.now() - lastFetchedTimestamp < DATA_FETCH_CACHE_TIMEOUT;

      if (isCached && isFresh && restrictMatches) {
        logger.info('Using cached friendly buff events', {
          reportCode,
          fightId: Number(fight.id),
          cacheAge: lastFetchedTimestamp ? Date.now() - lastFetchedTimestamp : 0,
          restrictToFightWindow,
        });
        return false; // Prevent thunk execution
      }

      const inFlight = entry?.currentRequest;
      if (
        inFlight &&
        inFlight.reportId === reportCode &&
        inFlight.fightId === Number(fight.id) &&
        inFlight.restrictToFightWindow === restrictToFightWindow
      ) {
        logger.info(
          'Friendly buff events fetch already in progress for requested fight, skipping',
          {
            reportCode,
            fightId: Number(fight.id),
            restrictToFightWindow,
          },
        );
        return false; // Prevent duplicate execution for same fight
      }

      return true; // Allow thunk execution
    },
  },
);

const friendlyBuffEventsSlice = createSlice({
  name: 'friendlyBuffEvents',
  initialState,
  reducers: {
    clearFriendlyBuffEvents(state) {
      resetCacheState(state);
    },
    resetFriendlyBuffEventsLoading(state) {
      Object.values(state.entries).forEach((entry) => {
        if (entry.status === 'loading') {
          entry.status = 'idle';
        }
        entry.error = null;
        entry.currentRequest = null;
      });
    },
    clearFriendlyBuffEventsForContext(
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
    trimFriendlyBuffEventsCache(state, action: PayloadAction<{ maxEntries?: number } | undefined>) {
      const limit = action?.payload?.maxEntries ?? EVENT_CACHE_MAX_ENTRIES;
      trimCache(state, limit);
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchFriendlyBuffEvents.pending, (state, action) => {
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
          action.meta.arg.restrictToFightWindow ?? true,
        );
        touchAccessOrder(state, key);
      })
      .addCase(fetchFriendlyBuffEvents.fulfilled, (state, action) => {
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
          logger.info('Ignoring stale friendly buff events response', {
            reportCode: action.meta.arg.reportCode,
            fightId: Number(action.meta.arg.fight.id),
          });
          return;
        }
        entry.events = action.payload.events;
        entry.status = 'succeeded';
        entry.error = null;
        entry.cacheMetadata.lastFetchedTimestamp = Date.now();
        entry.cacheMetadata.restrictToFightWindow = action.meta.arg.restrictToFightWindow ?? true;
        entry.cacheMetadata.intervalCount = action.payload.intervalResults.length;
        entry.currentRequest = null;
        touchAccessOrder(state, key);
        trimCache(state, EVENT_CACHE_MAX_ENTRIES);
      })
      .addCase(fetchFriendlyBuffEvents.rejected, (state, action) => {
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
          logger.info('Ignoring stale friendly buff events error response', {
            reportCode: action.meta.arg.reportCode,
            fightId: Number(action.meta.arg.fight.id),
          });
          return;
        }
        entry.status = 'failed';
        entry.error =
          action.payload ?? action.error.message ?? 'Failed to fetch friendly buff events';
        entry.currentRequest = null;
        touchAccessOrder(state, key);
      });
  },
});

export const {
  clearFriendlyBuffEvents,
  resetFriendlyBuffEventsLoading,
  clearFriendlyBuffEventsForContext,
  trimFriendlyBuffEventsCache,
} = friendlyBuffEventsSlice.actions;
export default friendlyBuffEventsSlice.reducer;
