import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';

import { DATA_FETCH_CACHE_TIMEOUT } from '../../Constants';
import { EsoLogsClient } from '../../esologsClient';
import {
  FightFragment,
  GetHealingEventsDocument,
  GetHealingEventsQuery,
  HostilityType,
} from '../../graphql/gql/graphql';
import { HealEvent, LogEvent } from '../../types/combatlogEvents';
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
  EVENT_MAX_PAGES_PER_STREAM,
  EVENT_PAGE_LIMIT,
} from './constants';
import { createCurrentRequest, isStaleResponse } from './utils/requestTracking';

const logger = new Logger({ level: LogLevel.INFO, contextPrefix: 'HealingEvents' });

type HealingEventsRequest = ReturnType<typeof createCurrentRequest> | null;

export interface HealingEventsEntry {
  events: HealEvent[];
  status: 'idle' | 'loading' | 'succeeded' | 'failed';
  error: string | null;
  cacheMetadata: {
    lastFetchedTimestamp: number | null;
  };
  currentRequest: HealingEventsRequest;
}

export type HealingEventsState = KeyedCacheState<HealingEventsEntry>;

// Local interface to avoid circular dependency with RootState
interface LocalRootState {
  events: {
    healing: HealingEventsState;
  };
}

const createEmptyEntry = (): HealingEventsEntry => ({
  events: [],
  status: 'idle',
  error: null,
  cacheMetadata: {
    lastFetchedTimestamp: null,
  },
  currentRequest: null,
});

const ensureEntry = (state: HealingEventsState, key: string): HealingEventsEntry => {
  if (!state.entries[key]) {
    state.entries[key] = createEmptyEntry();
  }
  return state.entries[key];
};

const initialState: HealingEventsState = {
  entries: {},
  accessOrder: [],
};

const validateFightTiming = (fight: FightFragment): void => {
  const isValidTimestamp = (value: number): boolean =>
    Number.isFinite(value) && value >= 0 && !Object.is(value, -0);

  if (
    !isValidTimestamp(fight.startTime) ||
    !isValidTimestamp(fight.endTime) ||
    fight.endTime <= fight.startTime
  ) {
    throw new Error('Invalid healing event interval');
  }
};

export const fetchHealingEvents = createAsyncThunk<
  HealEvent[],
  { reportCode: string; fight: FightFragment; client: EsoLogsClient },
  { state: LocalRootState; rejectValue: string }
>(
  'healingEvents/fetchHealingEvents',
  async ({ reportCode, fight, client }, { rejectWithValue, signal }) => {
    // Fetch both friendly and enemy healing events
    const hostilityTypes = [HostilityType.Friendlies, HostilityType.Enemies];
    const eventChunks: LogEvent[][] = [];
    let pageCount = 0;
    let streamEventCount = 0;

    try {
      validateFightTiming(fight);
      for (const hostilityType of hostilityTypes) {
        let nextPageTimestamp: number | null = null;

        do {
          signal.throwIfAborted();
          if (pageCount >= EVENT_MAX_PAGES_PER_STREAM) {
            throw new Error(
              `Healing event pagination exceeded ${EVENT_MAX_PAGES_PER_STREAM} pages`,
            );
          }
          const requestedStartTime = nextPageTimestamp ?? fight.startTime;
          const response: GetHealingEventsQuery = await client.query({
            query: GetHealingEventsDocument,
            fetchPolicy: 'no-cache',
            context: { fetchOptions: { signal } },
            variables: {
              code: reportCode,
              fightIds: [Number(fight.id)],
              startTime: requestedStartTime,
              endTime: fight.endTime,
              hostilityType: hostilityType,
              limit: EVENT_PAGE_LIMIT,
            },
          });
          pageCount += 1;

          const page = response.reportData?.report?.events;
          if (page?.data?.length) {
            streamEventCount += page.data.length;
            if (streamEventCount > EVENT_MAX_EVENTS_PER_STREAM) {
              throw new Error(
                `Healing event pagination exceeded ${EVENT_MAX_EVENTS_PER_STREAM} events`,
              );
            }
            eventChunks.push(page.data);
            logger.info(`Fetched healing events page for ${hostilityType}`, {
              reportCode,
              fightId: Number(fight.id),
              hostilityType,
              eventsInPage: page.data.length,
              totalEvents: streamEventCount,
            });
          }
          const followingTimestamp = page?.nextPageTimestamp ?? null;
          if (
            followingTimestamp != null &&
            (!Number.isFinite(followingTimestamp) || followingTimestamp <= requestedStartTime)
          ) {
            throw new Error('Healing event pagination cursor did not advance');
          }
          nextPageTimestamp = followingTimestamp;
        } while (nextPageTimestamp != null);
      }
    } catch (error) {
      return rejectWithValue(
        error instanceof Error ? error.message : 'Failed to fetch healing events',
      );
    }

    logger.info('Healing events fetch completed', {
      reportCode,
      fightId: Number(fight.id),
      totalEvents: eventChunks.reduce((count, chunk) => count + chunk.length, 0),
    });

    return eventChunks.flat() as HealEvent[];
  },
  {
    condition: ({ reportCode, fight }, { getState }) => {
      const state = (getState() as LocalRootState).events.healing;
      const { key } = resolveCacheKey({ reportCode, fightId: Number(fight.id) });
      const entry = state.entries[key];

      const lastFetchedTimestamp = entry?.cacheMetadata.lastFetchedTimestamp;
      const isCached = entry?.status === 'succeeded';
      const isFresh =
        typeof lastFetchedTimestamp === 'number' &&
        Date.now() - lastFetchedTimestamp < DATA_FETCH_CACHE_TIMEOUT;

      if (isCached && isFresh) {
        logger.info('Using cached healing events', {
          reportCode,
          fightId: Number(fight.id),
          cacheAge: lastFetchedTimestamp ? Date.now() - lastFetchedTimestamp : 0,
        });
        return false; // Prevent thunk execution
      }

      const inFlight = entry?.currentRequest;
      if (inFlight && inFlight.reportId === reportCode && inFlight.fightId === Number(fight.id)) {
        logger.info('Healing events fetch already in progress, skipping', {
          reportCode,
          fightId: Number(fight.id),
        });
        return false;
      }

      return true; // Allow thunk execution
    },
  },
);

const healingEventsSlice = createSlice({
  name: 'healingEvents',
  initialState,
  reducers: {
    clearHealingEvents(state) {
      resetCacheState(state);
    },
    resetHealingEventsLoading(state) {
      Object.values(state.entries).forEach((entry) => {
        if (entry.status === 'loading') {
          entry.status = 'idle';
        }
        entry.error = null;
        entry.currentRequest = null;
      });
    },
    clearHealingEventsForContext(
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
    trimHealingEventsCache(state, action: PayloadAction<{ maxEntries?: number } | undefined>) {
      const limit = action?.payload?.maxEntries ?? EVENT_CACHE_MAX_ENTRIES;
      trimCache(state, limit);
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchHealingEvents.pending, (state, action) => {
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
      .addCase(fetchHealingEvents.fulfilled, (state, action) => {
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
          logger.info('Ignoring stale healing events response', {
            reportCode: action.meta.arg.reportCode,
            fightId: Number(action.meta.arg.fight.id),
          });
          return;
        }
        entry.events = action.payload;
        entry.status = 'succeeded';
        entry.error = null;
        entry.cacheMetadata.lastFetchedTimestamp = Date.now();
        entry.currentRequest = null;
        touchAccessOrder(state, key);
        trimCache(state, EVENT_CACHE_MAX_ENTRIES);
      })
      .addCase(fetchHealingEvents.rejected, (state, action) => {
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
          logger.info('Ignoring stale healing events error response', {
            reportCode: action.meta.arg.reportCode,
            fightId: Number(action.meta.arg.fight.id),
          });
          return;
        }
        entry.status = 'failed';
        entry.error = action.payload ?? action.error.message ?? 'Failed to fetch healing events';
        entry.currentRequest = null;
        touchAccessOrder(state, key);
      });
  },
});

export const {
  clearHealingEvents,
  resetHealingEventsLoading,
  clearHealingEventsForContext,
  trimHealingEventsCache,
} = healingEventsSlice.actions;
export default healingEventsSlice.reducer;
