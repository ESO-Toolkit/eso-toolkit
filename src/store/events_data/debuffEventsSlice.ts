import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';

import { DATA_FETCH_CACHE_TIMEOUT } from '../../Constants';
import { EsoLogsClient } from '../../esologsClient';
import {
  FightFragment,
  GetDebuffEventsDocument,
  GetDebuffEventsQuery,
  HostilityType,
} from '../../graphql/gql/graphql';
import { DebuffEvent, LogEvent } from '../../types/combatlogEvents';
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

const logger = new Logger({ level: LogLevel.INFO, contextPrefix: 'DebuffEvents' });

type DebuffEventsRequest = ReturnType<typeof createCurrentRequest> | null;

export interface DebuffEventsEntry {
  events: DebuffEvent[];
  status: 'idle' | 'loading' | 'succeeded' | 'failed';
  error: string | null;
  cacheMetadata: {
    lastFetchedTimestamp: number | null;
    restrictToFightWindow: boolean | null;
  };
  currentRequest: DebuffEventsRequest;
}

export type DebuffEventsState = KeyedCacheState<DebuffEventsEntry>;

interface LocalRootState {
  events: {
    debuffs: DebuffEventsState;
  };
}

const createEmptyEntry = (): DebuffEventsEntry => ({
  events: [],
  status: 'idle',
  error: null,
  cacheMetadata: {
    lastFetchedTimestamp: null,
    restrictToFightWindow: null,
  },
  currentRequest: null,
});

const ensureEntry = (state: DebuffEventsState, key: string): DebuffEventsEntry => {
  if (!state.entries[key]) {
    state.entries[key] = createEmptyEntry();
  }
  return state.entries[key];
};

const initialState: DebuffEventsState = {
  entries: {},
  accessOrder: [],
};

export const fetchDebuffEvents = createAsyncThunk<
  DebuffEvent[],
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
  'debuffEvents/fetchDebuffEvents',
  async ({ reportCode, fight, client, restrictToFightWindow = true }) => {
    // Fetch both friendly and enemy debuff events
    const hostilityTypes = [HostilityType.Friendlies, HostilityType.Enemies];
    let allEvents: LogEvent[] = [];

    const initialStartTime = restrictToFightWindow ? fight.startTime : undefined;
    const finalEndTime = restrictToFightWindow ? (fight.endTime ?? undefined) : undefined;

    for (const hostilityType of hostilityTypes) {
      let nextPageTimestamp: number | null = null;

      do {
        const response: GetDebuffEventsQuery = await client.query({
          query: GetDebuffEventsDocument,
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
      } while (nextPageTimestamp);
    }

    // Filter to only debuff events
    const debuffEvents = allEvents.filter(
      (event) =>
        event.type === 'removedebuff' ||
        event.type === 'applydebuff' ||
        event.type === 'applydebuffstack' ||
        event.type === 'removedebuffstack',
    ) as DebuffEvent[];
    return debuffEvents;
  },
  {
    condition: ({ reportCode, fight, restrictToFightWindow = true }, { getState }) => {
      const state = getState().events.debuffs;
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
        return false; // Prevent thunk execution
      }

      const inFlight = entry?.currentRequest;
      if (
        inFlight &&
        inFlight.reportId === reportCode &&
        inFlight.fightId === Number(fight.id) &&
        inFlight.restrictToFightWindow === restrictToFightWindow
      ) {
        return false; // Prevent duplicate execution for same fight
      }

      return true; // Allow thunk execution
    },
  },
);

const debuffEventsSlice = createSlice({
  name: 'debuffEvents',
  initialState,
  reducers: {
    clearDebuffEvents(state) {
      resetCacheState(state);
    },
    resetDebuffEventsLoading(state) {
      Object.values(state.entries).forEach((entry) => {
        if (entry.status === 'loading') {
          entry.status = 'idle';
        }
        entry.error = null;
        entry.currentRequest = null;
      });
    },
    clearDebuffEventsForContext(
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
    trimDebuffEventsCache(state, action: PayloadAction<{ maxEntries?: number } | undefined>) {
      const limit = action?.payload?.maxEntries ?? EVENT_CACHE_MAX_ENTRIES;
      trimCache(state, limit);
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchDebuffEvents.pending, (state, action) => {
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
      .addCase(fetchDebuffEvents.fulfilled, (state, action) => {
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
          logger.info('Ignoring stale debuff events response', {
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
      .addCase(fetchDebuffEvents.rejected, (state, action) => {
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
          logger.info('Ignoring stale debuff events error response', {
            reportCode: action.meta.arg.reportCode,
            fightId: Number(action.meta.arg.fight.id),
          });
          return;
        }
        entry.status = 'failed';
        entry.error = action.error.message || 'Failed to fetch debuff events';
        entry.currentRequest = null;
        touchAccessOrder(state, key);
      });
  },
});

export const {
  clearDebuffEvents,
  resetDebuffEventsLoading,
  clearDebuffEventsForContext,
  trimDebuffEventsCache,
} = debuffEventsSlice.actions;
export default debuffEventsSlice.reducer;
