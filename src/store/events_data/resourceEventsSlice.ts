import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';

import { DATA_FETCH_CACHE_TIMEOUT } from '../../Constants';
import { EsoLogsClient } from '../../esologsClient';
import {
  FightFragment,
  GetResourceEventsDocument,
  GetResourceEventsQuery,
  HostilityType,
} from '../../graphql/gql/graphql';
import { ResourceChangeEvent, LogEvent } from '../../types/combatlogEvents';
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

const logger = new Logger({ level: LogLevel.INFO, contextPrefix: 'ResourceEvents' });

type ResourceEventsRequest = ReturnType<typeof createCurrentRequest> | null;

export interface ResourceEventsEntry {
  events: ResourceChangeEvent[];
  status: 'idle' | 'loading' | 'succeeded' | 'failed';
  error: string | null;
  cacheMetadata: {
    lastFetchedTimestamp: number | null;
  };
  currentRequest: ResourceEventsRequest;
}

export type ResourceEventsState = KeyedCacheState<ResourceEventsEntry>;

// Local interface to avoid importing the full RootState and creating circular dependencies
interface LocalRootState {
  events: {
    resources: ResourceEventsState;
  };
}

const createEmptyEntry = (): ResourceEventsEntry => ({
  events: [],
  status: 'idle',
  error: null,
  cacheMetadata: {
    lastFetchedTimestamp: null,
  },
  currentRequest: null,
});

const ensureEntry = (state: ResourceEventsState, key: string): ResourceEventsEntry => {
  if (!state.entries[key]) {
    state.entries[key] = createEmptyEntry();
  }
  return state.entries[key];
};

const initialState: ResourceEventsState = {
  entries: {},
  accessOrder: [],
};

export const fetchResourceEvents = createAsyncThunk<
  ResourceChangeEvent[],
  { reportCode: string; fight: FightFragment; client: EsoLogsClient },
  { state: LocalRootState; rejectValue: string }
>(
  'resourceEvents/fetchResourceEvents',
  async ({ reportCode, fight, client }) => {
    logger.info('Fetching resource events', {
      reportCode,
      fightId: Number(fight.id),
    });

    const hostilityTypes = [HostilityType.Friendlies, HostilityType.Enemies];
    let allEvents: LogEvent[] = [];

    for (const hostilityType of hostilityTypes) {
      let nextPageTimestamp: number | null = null;

      do {
        const response: GetResourceEventsQuery = await client.query({
          query: GetResourceEventsDocument,
          fetchPolicy: 'no-cache',
          variables: {
            code: reportCode,
            fightIds: [Number(fight.id)],
            startTime: nextPageTimestamp ?? fight.startTime,
            endTime: fight.endTime,
            hostilityType,
            limit: EVENT_PAGE_LIMIT,
          },
        });

        const page = response.reportData?.report?.events;
        if (page?.data) {
          allEvents = allEvents.concat(page.data);
        }
        nextPageTimestamp = page?.nextPageTimestamp ?? null;
      } while (nextPageTimestamp);
    }

    logger.info('Resource events fetch completed', {
      reportCode,
      fightId: Number(fight.id),
      totalEvents: allEvents.length,
    });

    return allEvents as ResourceChangeEvent[];
  },
  {
    condition: ({ reportCode, fight }, { getState }) => {
      const state = getState().events.resources;
      const { key } = resolveCacheKey({ reportCode, fightId: Number(fight.id) });
      const entry = state.entries[key];

      const lastFetchedTimestamp = entry?.cacheMetadata.lastFetchedTimestamp;
      const isCached = Boolean(entry?.events.length);
      const isFresh =
        typeof lastFetchedTimestamp === 'number' &&
        Date.now() - lastFetchedTimestamp < DATA_FETCH_CACHE_TIMEOUT;

      if (isCached && isFresh) {
        logger.info('Using cached resource events', {
          reportCode,
          fightId: Number(fight.id),
          cacheAge: lastFetchedTimestamp ? Date.now() - lastFetchedTimestamp : null,
        });
        return false;
      }

      const inFlight = entry?.currentRequest;
      if (inFlight && inFlight.reportId === reportCode && inFlight.fightId === Number(fight.id)) {
        logger.info('Resource events fetch already in progress, skipping', {
          reportCode,
          fightId: Number(fight.id),
        });
        return false;
      }

      return true;
    },
  },
);

const resourceEventsSlice = createSlice({
  name: 'resourceEvents',
  initialState,
  reducers: {
    clearResourceEvents(state) {
      resetCacheState(state);
    },
    resetResourceEventsLoading(state) {
      Object.values(state.entries).forEach((entry) => {
        if (entry.status === 'loading') {
          entry.status = 'idle';
        }
        entry.error = null;
        entry.currentRequest = null;
      });
    },
    clearResourceEventsForContext(
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
    trimResourceEventsCache(state, action: PayloadAction<{ maxEntries?: number } | undefined>) {
      const limit = action?.payload?.maxEntries ?? EVENT_CACHE_MAX_ENTRIES;
      trimCache(state, limit);
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchResourceEvents.pending, (state, action) => {
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
      .addCase(fetchResourceEvents.fulfilled, (state, action) => {
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
          logger.info('Ignoring stale resource events response', {
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
      .addCase(fetchResourceEvents.rejected, (state, action) => {
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
          logger.info('Ignoring stale resource events error response', {
            reportCode: action.meta.arg.reportCode,
            fightId: Number(action.meta.arg.fight.id),
          });
          return;
        }
        entry.status = 'failed';
        entry.error = action.payload || action.error.message || 'Failed to fetch resource events';
        entry.currentRequest = null;
        touchAccessOrder(state, key);
      });
  },
});

export const {
  clearResourceEvents,
  resetResourceEventsLoading,
  clearResourceEventsForContext,
  trimResourceEventsCache,
} = resourceEventsSlice.actions;

export default resourceEventsSlice.reducer;
