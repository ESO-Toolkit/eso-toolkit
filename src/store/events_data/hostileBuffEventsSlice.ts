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

type HostileBuffEventsRequest = ReturnType<typeof createCurrentRequest> | null;

export interface HostileBuffEventsEntry {
  events: BuffEvent[];
  status: 'idle' | 'loading' | 'succeeded' | 'failed';
  error: string | null;
  cacheMetadata: {
    lastFetchedTimestamp: number | null;
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

const INTERVAL_SIZE = 30000;

const fetchInterval = async (
  client: EsoLogsClient,
  reportCode: string,
  fightId: number,
  startTime: number,
  endTime: number,
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
        hostilityType: HostilityType.Enemies,
        limit: EVENT_PAGE_LIMIT,
      },
    });
    const page = response.reportData?.report?.events;
    if (page?.data) events = events.concat(page.data);
    nextPage = page?.nextPageTimestamp ?? null;
  } while (nextPage && nextPage < endTime);
  return events;
};

export const fetchHostileBuffEvents = createAsyncThunk<
  BuffEvent[],
  { reportCode: string; fight: FightFragment; client: EsoLogsClient },
  { state: LocalRootState; rejectValue: string }
>(
  'hostileBuffEvents/fetchHostileBuffEvents',
  async ({ reportCode, fight, client }) => {
    const fightId = Number(fight.id);
    let allEvents: LogEvent[] = [];

    let windowStart = fight.startTime;
    while (windowStart < fight.endTime) {
      const windowEnd = Math.min(windowStart + INTERVAL_SIZE, fight.endTime);
      try {
        const events = await fetchInterval(client, reportCode, fightId, windowStart, windowEnd);
        allEvents = allEvents.concat(events);
      } catch {
        // Continue fetching remaining intervals on failure
      }
      windowStart = windowEnd;
    }

    return (allEvents as BuffEvent[]).sort((a, b) => a.timestamp - b.timestamp);
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
        return false;
      }

      const inFlight = entry?.currentRequest;
      if (inFlight && inFlight.reportId === reportCode && inFlight.fightId === Number(fight.id)) {
        return false;
      }

      return true;
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
        entry.events = action.payload;
        entry.status = 'succeeded';
        entry.error = null;
        entry.cacheMetadata.lastFetchedTimestamp = Date.now();
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
