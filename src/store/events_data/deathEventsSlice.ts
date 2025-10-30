import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';

import { DATA_FETCH_CACHE_TIMEOUT } from '../../Constants';
import { EsoLogsClient } from '../../esologsClient';
import {
  FightFragment,
  GetDeathEventsDocument,
  GetDeathEventsQuery,
  HostilityType,
} from '../../graphql/gql/graphql';
import { DeathEvent, LogEvent } from '../../types/combatlogEvents';
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

type DeathEventsRequest = ReturnType<typeof createCurrentRequest> | null;

export interface DeathEventsEntry {
  events: DeathEvent[];
  status: 'idle' | 'loading' | 'succeeded' | 'failed';
  error: string | null;
  cacheMetadata: {
    lastFetchedTimestamp: number | null;
    intervalCount: number;
    failedIntervals: number;
  };
  currentRequest: DeathEventsRequest;
}

export type DeathEventsState = KeyedCacheState<DeathEventsEntry>;

interface LocalRootState {
  events: {
    deaths: DeathEventsState;
  };
}

const createEmptyEntry = (): DeathEventsEntry => ({
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

const ensureEntry = (state: DeathEventsState, key: string): DeathEventsEntry => {
  if (!state.entries[key]) {
    state.entries[key] = createEmptyEntry();
  }
  return state.entries[key];
};

const initialState: DeathEventsState = {
  entries: {},
  accessOrder: [],
};

export const fetchDeathEvents = createAsyncThunk<
  DeathEvent[],
  { reportCode: string; fight: FightFragment; client: EsoLogsClient },
  { state: LocalRootState; rejectValue: string }
>(
  'deathEvents/fetchDeathEvents',
  async ({ reportCode, fight, client }) => {
    // Fetch both friendly and enemy death events
    const hostilityTypes = [HostilityType.Friendlies, HostilityType.Enemies];
    let allEvents: LogEvent[] = [];

    for (const hostilityType of hostilityTypes) {
      let nextPageTimestamp: number | null = null;

      do {
        const response: GetDeathEventsQuery = await client.query({
          query: GetDeathEventsDocument,
          fetchPolicy: 'no-cache',
          variables: {
            code: reportCode,
            fightIds: [Number(fight.id)],
            startTime: nextPageTimestamp ?? fight.startTime,
            endTime: fight.endTime,
            hostilityType: hostilityType,
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

    // Filter to only death events
    const deathEvents = allEvents.filter((event) => event.type === 'death') as DeathEvent[];
    return deathEvents;
  },
  {
    condition: ({ reportCode, fight }, { getState }) => {
      const state = getState().events.deaths;
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
      if (inFlight && inFlight.reportId === reportCode && inFlight.fightId === Number(fight.id)) {
        return false; // Prevent duplicate execution
      }

      return true; // Allow thunk execution
    },
  },
);

const deathEventsSlice = createSlice({
  name: 'deathEvents',
  initialState,
  reducers: {
    clearDeathEvents(state) {
      resetCacheState(state);
    },
    resetDeathEventsLoading(state) {
      Object.values(state.entries).forEach((entry) => {
        if (entry.status === 'loading') {
          entry.status = 'idle';
        }
        entry.error = null;
        entry.currentRequest = null;
      });
    },
    clearDeathEventsForContext(
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
    trimDeathEventsCache(state, action: PayloadAction<{ maxEntries?: number } | undefined>) {
      const limit = action?.payload?.maxEntries ?? EVENT_CACHE_MAX_ENTRIES;
      trimCache(state, limit);
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchDeathEvents.pending, (state, action) => {
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
      .addCase(fetchDeathEvents.fulfilled, (state, action) => {
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
        entry.events = action.payload;
        entry.status = 'succeeded';
        entry.error = null;
        entry.cacheMetadata.lastFetchedTimestamp = Date.now();
        entry.cacheMetadata.intervalCount = 1;
        entry.cacheMetadata.failedIntervals = 0;
        entry.currentRequest = null;
        touchAccessOrder(state, key);
        trimCache(state, EVENT_CACHE_MAX_ENTRIES);
      })
      .addCase(fetchDeathEvents.rejected, (state, action) => {
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
        entry.error = action.error.message || 'Failed to fetch death events';
        entry.currentRequest = null;
        touchAccessOrder(state, key);
      });
  },
});

export const {
  clearDeathEvents,
  resetDeathEventsLoading,
  clearDeathEventsForContext,
  trimDeathEventsCache,
} = deathEventsSlice.actions;
export default deathEventsSlice.reducer;
