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

import { EVENT_CACHE_MAX_ENTRIES, EVENT_PAGE_LIMIT } from './constants';
import { createCurrentRequest, isStaleResponse } from './utils/requestTracking';

const logger = new Logger({ level: LogLevel.INFO, contextPrefix: 'FriendlyBuffEvents' });

type FriendlyBuffEventsRequest = ReturnType<typeof createCurrentRequest> | null;

export interface FriendlyBuffEventsEntry {
  events: BuffEvent[];
  status: 'idle' | 'loading' | 'succeeded' | 'failed';
  error: string | null;
  cacheMetadata: {
    lastFetchedTimestamp: number | null;
    restrictToFightWindow: boolean | null;
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

const INTERVAL_SIZE = 30000;

// Fetch all pages within a single time window.
const fetchInterval = async (
  client: EsoLogsClient,
  reportCode: string,
  fightId: number,
  startTime: number,
  endTime: number,
  hostilityType: HostilityType,
): Promise<LogEvent[]> => {
  let events: LogEvent[] = [];
  let nextPage: number | null = null;
  do {
    const response: GetBuffEventsQuery = await client.query({
      query: GetBuffEventsDocument,
      fetchPolicy: 'no-cache',
      variables: {
        code: reportCode,
        fightIds: [fightId],
        startTime: nextPage ?? startTime,
        endTime,
        hostilityType,
        limit: EVENT_PAGE_LIMIT,
      },
    });
    const page = response.reportData?.report?.events;
    if (page?.data) events = events.concat(page.data);
    nextPage = page?.nextPageTimestamp ?? null;
  } while (nextPage && nextPage < endTime);
  return events;
};

export const fetchFriendlyBuffEvents = createAsyncThunk<
  BuffEvent[],
  {
    reportCode: string;
    fight: FightFragment;
    client: EsoLogsClient;
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
  async ({ reportCode, fight, client, restrictToFightWindow = true }) => {
    logger.info('Fetching friendly buff events', {
      reportCode,
      fightId: fight.id,
      restrictToFightWindow,
    });

    const fightId = Number(fight.id);
    let allEvents: LogEvent[] = [];

    if (!restrictToFightWindow) {
      // Full-report fetch: single paginated request with no time bounds
      let nextPage: number | null = null;
      do {
        const response: GetBuffEventsQuery = await client.query({
          query: GetBuffEventsDocument,
          fetchPolicy: 'no-cache',
          variables: {
            code: reportCode,
            fightIds: [fightId],
            startTime: nextPage ?? undefined,
            endTime: undefined,
            hostilityType: HostilityType.Friendlies,
            limit: EVENT_PAGE_LIMIT,
          },
        });
        const page = response.reportData?.report?.events;
        if (page?.data) allEvents = allEvents.concat(page.data);
        nextPage = page?.nextPageTimestamp ?? null;
      } while (nextPage);
    } else {
      // Split into 30s intervals so a single failing window doesn't lose all data
      let windowStart = fight.startTime;
      while (windowStart < fight.endTime) {
        const windowEnd = Math.min(windowStart + INTERVAL_SIZE, fight.endTime);
        try {
          const events = await fetchInterval(
            client,
            reportCode,
            fightId,
            windowStart,
            windowEnd,
            HostilityType.Friendlies,
          );
          allEvents = allEvents.concat(events);
        } catch (error) {
          logger.error('Failed to fetch buff interval, continuing', error as Error, {
            reportCode,
            fightId,
            windowStart,
            windowEnd,
          });
        }
        windowStart = windowEnd;
      }
    }

    const sortedEvents = (allEvents as BuffEvent[]).sort((a, b) => a.timestamp - b.timestamp);

    logger.info('Friendly buff events fetch completed', {
      reportCode,
      fightId: fight.id,
      totalEvents: sortedEvents.length,
    });

    return sortedEvents;
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
        return false;
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
        return false;
      }

      return true;
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
        entry.events = action.payload;
        entry.status = 'succeeded';
        entry.error = null;
        entry.cacheMetadata.lastFetchedTimestamp = Date.now();
        entry.cacheMetadata.restrictToFightWindow = action.meta.arg.restrictToFightWindow ?? true;
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
