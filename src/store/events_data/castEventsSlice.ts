import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';

import { DATA_FETCH_CACHE_TIMEOUT } from '../../Constants';
import { EsoLogsClient } from '../../esologsClient';
import {
  FightFragment,
  GetCastEventsDocument,
  GetCastEventsQuery,
  HostilityType,
} from '../../graphql/gql/graphql';
import { BeginCastEvent, CastEvent, UnifiedCastEvent } from '../../types/combatlogEvents';
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

const logger = new Logger({ level: LogLevel.INFO, contextPrefix: 'CastEvents' });

type CastEventsRequest = ReturnType<typeof createCurrentRequest> | null;

export interface CastEventsEntry {
  events: UnifiedCastEvent[];
  status: 'idle' | 'loading' | 'succeeded' | 'failed';
  error: string | null;
  cacheMetadata: {
    lastFetchedTimestamp: number | null;
    restrictToFightWindow: boolean | null;
  };
  currentRequest: CastEventsRequest;
}

export type CastEventsState = KeyedCacheState<CastEventsEntry>;

// Local interface to avoid circular dependency with RootState
interface LocalRootState {
  events: {
    casts: CastEventsState;
  };
}

const createEmptyEntry = (): CastEventsEntry => ({
  events: [],
  status: 'idle',
  error: null,
  cacheMetadata: {
    lastFetchedTimestamp: null,
    restrictToFightWindow: null,
  },
  currentRequest: null,
});

const ensureEntry = (state: CastEventsState, key: string): CastEventsEntry => {
  if (!state.entries[key]) {
    state.entries[key] = createEmptyEntry();
  }
  return state.entries[key];
};

const initialState: CastEventsState = {
  entries: {},
  accessOrder: [],
};

export const fetchCastEvents = createAsyncThunk<
  CastEvent[],
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
  'castEvents/fetchCastEvents',
  async ({ reportCode, fight, client, restrictToFightWindow = true }) => {
    logger.info('Fetching cast events', {
      reportCode,
      fightId: fight.id,
      restrictToFightWindow,
    });

    // Fetch both friendly and enemy cast events
    const hostilityTypes = [HostilityType.Friendlies, HostilityType.Enemies];
    let allEvents: (CastEvent | BeginCastEvent)[] = [];

    const initialStartTime = restrictToFightWindow ? fight.startTime : undefined;
    const finalEndTime = restrictToFightWindow ? (fight.endTime ?? undefined) : undefined;

    for (const hostilityType of hostilityTypes) {
      let nextPageTimestamp: number | null = null;
      let pageCount = 0;

      do {
        pageCount++;
        const response: GetCastEventsQuery = await client.query({
          query: GetCastEventsDocument,
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
          logger.info(`Fetched cast events page ${pageCount} for ${hostilityType}`, {
            reportCode,
            fightId: fight.id,
            hostilityType,
            pageCount,
            eventsInPage: page.data.length,
            totalEvents: allEvents.length,
          });
        }
        nextPageTimestamp = page?.nextPageTimestamp ?? null;
      } while (nextPageTimestamp);
    }

    // Filter to only cast events
    const castEvents = allEvents.filter(
      (event) => !event.fake && (event.type === 'begincast' || event.type === 'cast'),
    ) as CastEvent[];

    logger.info('Cast events fetch completed', {
      reportCode,
      fightId: fight.id,
      totalEvents: allEvents.length,
      filteredEvents: castEvents.length,
      restrictToFightWindow,
    });

    return castEvents;
  },
  {
    condition: ({ reportCode, fight, restrictToFightWindow = true }, { getState }) => {
      const state = getState().events.casts;
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
        logger.info('Using cached cast events', {
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
        logger.info('Cast events fetch already in progress for requested fight, skipping', {
          reportCode,
          fightId: Number(fight.id),
          restrictToFightWindow,
        });
        return false; // Prevent duplicate execution for same fight
      }

      return true; // Allow thunk execution
    },
  },
);

const castEventsSlice = createSlice({
  name: 'castEvents',
  initialState,
  reducers: {
    clearCastEvents(state) {
      resetCacheState(state);
    },
    resetCastEventsLoading(state) {
      Object.values(state.entries).forEach((entry) => {
        if (entry.status === 'loading') {
          entry.status = 'idle';
        }
        entry.error = null;
        entry.currentRequest = null;
      });
    },
    clearCastEventsForContext(
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
    trimCastEventsCache(state, action: PayloadAction<{ maxEntries?: number } | undefined>) {
      const limit = action?.payload?.maxEntries ?? EVENT_CACHE_MAX_ENTRIES;
      trimCache(state, limit);
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchCastEvents.pending, (state, action) => {
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
      .addCase(fetchCastEvents.fulfilled, (state, action) => {
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
          logger.info('Ignoring stale cast events response', {
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
      .addCase(fetchCastEvents.rejected, (state, action) => {
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
          logger.info('Ignoring stale cast events error response', {
            reportCode: action.meta.arg.reportCode,
            fightId: Number(action.meta.arg.fight.id),
          });
          return;
        }
        entry.status = 'failed';
        entry.error = action.error.message || 'Failed to fetch cast events';
        entry.currentRequest = null;
        touchAccessOrder(state, key);
      });
  },
});

export const {
  clearCastEvents,
  resetCastEventsLoading,
  clearCastEventsForContext,
  trimCastEventsCache,
} = castEventsSlice.actions;
export default castEventsSlice.reducer;
