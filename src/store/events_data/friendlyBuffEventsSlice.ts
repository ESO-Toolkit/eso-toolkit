import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';

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
import { RootState } from '../storeWithHistory';

const logger = new Logger({ level: LogLevel.INFO, contextPrefix: 'FriendlyBuffEvents' });

const EVENT_PAGE_LIMIT = 100000;

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
    lastRestrictToFightWindow: boolean | null;
  };
  currentRequest: {
    reportId: string;
    fightId: number;
    requestId: string;
    restrictToFightWindow: boolean;
  } | null;
}

const initialState: FriendlyBuffEventsState = {
  events: [],
  loading: false,
  error: null,
  cacheMetadata: {
    lastFetchedReportId: null,
    lastFetchedFightId: null,
    lastFetchedTimestamp: null,
    lastRestrictToFightWindow: null,
  },
  currentRequest: null,
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
    restrictToFightWindow?: boolean;
  },
  { state: RootState; rejectValue: string }
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
      const requestedReportId = reportCode;
      const requestedFightId = Number(fight.id);

      const cachedRestrict = state.cacheMetadata.lastRestrictToFightWindow ?? true;
      const restrictMatches = cachedRestrict === restrictToFightWindow;

      // Check if friendly buff events are already cached for this fight
      const isCached =
        state.cacheMetadata.lastFetchedReportId === requestedReportId &&
        state.cacheMetadata.lastFetchedFightId === requestedFightId;
      const isFresh =
        state.cacheMetadata.lastFetchedTimestamp &&
        Date.now() - state.cacheMetadata.lastFetchedTimestamp < DATA_FETCH_CACHE_TIMEOUT;

      if (isCached && isFresh && restrictMatches) {
        logger.info('Using cached friendly buff events', {
          reportCode: requestedReportId,
          fightId: requestedFightId,
          cacheAge: state.cacheMetadata.lastFetchedTimestamp
            ? Date.now() - state.cacheMetadata.lastFetchedTimestamp
            : 0,
          restrictToFightWindow,
        });
        return false; // Prevent thunk execution
      }

      const inFlight = state.currentRequest;
      if (
        inFlight &&
        inFlight.reportId === requestedReportId &&
        inFlight.fightId === requestedFightId &&
        inFlight.restrictToFightWindow === restrictToFightWindow
      ) {
        logger.info(
          'Friendly buff events fetch already in progress for requested fight, skipping',
          {
            reportCode: requestedReportId,
            fightId: requestedFightId,
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
      state.events = [];
      state.loading = false;
      state.error = null;
      state.cacheMetadata = {
        lastFetchedReportId: null,
        lastFetchedFightId: null,
        lastFetchedTimestamp: null,
        lastRestrictToFightWindow: null,
      };
      state.currentRequest = null;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchFriendlyBuffEvents.pending, (state, action) => {
        state.loading = true;
        state.error = null;
        state.currentRequest = {
          reportId: action.meta.arg.reportCode,
          fightId: Number(action.meta.arg.fight.id),
          requestId: action.meta.requestId,
          restrictToFightWindow: action.meta.arg.restrictToFightWindow ?? true,
        };
      })
      .addCase(fetchFriendlyBuffEvents.fulfilled, (state, action) => {
        if (!state.currentRequest || state.currentRequest.requestId !== action.meta.requestId) {
          logger.info('Ignoring stale friendly buff events response', {
            reportCode: action.meta.arg.reportCode,
            fightId: Number(action.meta.arg.fight.id),
          });
          return;
        }
        state.events = action.payload.events;
        state.loading = false;
        state.error = null;
        // Update cache metadata
        state.cacheMetadata = {
          lastFetchedReportId: action.meta.arg.reportCode,
          lastFetchedFightId: Number(action.meta.arg.fight.id),
          lastFetchedTimestamp: Date.now(),
          lastRestrictToFightWindow: action.meta.arg.restrictToFightWindow ?? true,
        };
        state.currentRequest = null;
      })
      .addCase(fetchFriendlyBuffEvents.rejected, (state, action) => {
        if (state.currentRequest && state.currentRequest.requestId !== action.meta.requestId) {
          logger.info('Ignoring stale friendly buff events error response', {
            reportCode: action.meta.arg.reportCode,
            fightId: Number(action.meta.arg.fight.id),
          });
          return;
        }
        state.loading = false;
        state.error = action.error.message || 'Failed to fetch friendly buff events';
        state.currentRequest = null;
      });
  },
});

export const { clearFriendlyBuffEvents } = friendlyBuffEventsSlice.actions;
export default friendlyBuffEventsSlice.reducer;
