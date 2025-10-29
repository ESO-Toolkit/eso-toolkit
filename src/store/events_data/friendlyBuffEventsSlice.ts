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
} from './cacheStateHelpers';
import { EVENT_CACHE_MAX_ENTRIES, EVENT_PAGE_LIMIT } from './constants';
import { createCurrentRequest, isStaleResponse } from './utils/requestTracking';

const logger = new Logger({ level: LogLevel.INFO, contextPrefix: 'FriendlyBuffEvents' });

// Interface for tracking interval fetching state
interface IntervalFetchResult {
  startTime: number;
  endTime: number;
  events: BuffEvent[];
  error?: string;
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
    failedIntervals: number;
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
    failedIntervals: 0,
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
  hostilityType: HostilityType,
  restrictToFightWindow: boolean,
): Promise<BuffEvent[]> => {
  let allEvents: LogEvent[] = [];
  let nextPageTimestamp: number | null = null;

  const initialStartTime = restrictToFightWindow ? intervalStart : undefined;
  const finalEndTime = restrictToFightWindow ? intervalEnd : undefined;

  do {
    const response: GetBuffEventsQuery = await client.query({
      query: GetBuffEventsDocument,
      fetchPolicy: 'no-cache',
      variables: {
        code: reportCode,
        fightIds: [Number(fight.id)],
        startTime: nextPageTimestamp ?? initialStartTime,
        endTime: finalEndTime,
        hostilityType: hostilityType,
        limit: EVENT_PAGE_LIMIT,
      },
    });

    const page = response.reportData?.report?.events;
    if (page?.data) {
      allEvents = allEvents.concat(page.data);
    }
    nextPageTimestamp = page?.nextPageTimestamp ?? null;
  } while (nextPageTimestamp && (restrictToFightWindow ? nextPageTimestamp < intervalEnd : true));

  return allEvents as BuffEvent[];
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
  async ({ reportCode, fight, client, intervalSize = 30000, restrictToFightWindow = true }) => {
    logger.info('Fetching friendly buff events', {
      reportCode,
      fightId: fight.id,
      intervalSize,
      restrictToFightWindow,
    });

    const intervals = restrictToFightWindow
      ? createTimeIntervals(fight.startTime, fight.endTime, intervalSize)
      : [{ startTime: fight.startTime, endTime: fight.endTime }];
    logger.info(`Created ${intervals.length} time intervals`, {
      reportCode,
      fightId: fight.id,
      intervalCount: intervals.length,
    });

    // Create promises for all interval combinations (only friendlies)
    const fetchPromises = intervals.map(async (interval, index): Promise<IntervalFetchResult> => {
      try {
        const events = await fetchEventsForInterval(
          client,
          reportCode,
          fight,
          interval.startTime,
          interval.endTime,
          HostilityType.Friendlies,
          restrictToFightWindow,
        );

        logger.info(`Fetched interval ${index + 1}/${intervals.length}`, {
          reportCode,
          fightId: fight.id,
          intervalIndex: index + 1,
          totalIntervals: intervals.length,
          eventsInInterval: events.length,
        });

        return {
          startTime: interval.startTime,
          endTime: interval.endTime,
          events,
        };
      } catch (error) {
        logger.error('Failed to fetch interval', error as Error, {
          reportCode,
          fightId: fight.id,
          intervalIndex: index + 1,
        });

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

    logger.info('Friendly buff events fetch completed', {
      reportCode,
      fightId: fight.id,
      totalEvents: allEvents.length,
      successfulIntervals: intervalResults.filter((r) => !r.error).length,
      failedIntervals: intervalResults.filter((r) => r.error).length,
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
      const isCached = Boolean(entry?.events.length);
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
        entry.cacheMetadata.restrictToFightWindow = action.meta.arg.restrictToFightWindow ?? true;
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
        entry.cacheMetadata.restrictToFightWindow =
          action.meta.arg.restrictToFightWindow ?? true;
        entry.cacheMetadata.intervalCount = action.payload.intervalResults.length;
        entry.cacheMetadata.failedIntervals = action.payload.intervalResults.filter((r) => r.error)
          .length;
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
        entry.error = action.error.message || 'Failed to fetch friendly buff events';
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
