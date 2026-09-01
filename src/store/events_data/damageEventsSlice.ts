import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';

import { DATA_FETCH_CACHE_TIMEOUT } from '../../Constants';
import { EsoLogsClient } from '../../esologsClient';
import {
  FightFragment,
  GetDamageEventsDocument,
  GetDamageEventsQuery,
  HostilityType,
} from '../../graphql/gql/graphql';
import { DamageEvent, LogEvent } from '../../types/combatlogEvents';
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
import {
  createCurrentRequest,
  hasFreshCacheForMode,
  isStaleResponse,
} from './utils/requestTracking';

const logger = new Logger({ level: LogLevel.INFO, contextPrefix: 'DamageEvents' });

type DamageEventsRequest = ReturnType<typeof createCurrentRequest> | null;

export interface DamageEventsEntry {
  events: DamageEvent[];
  status: 'idle' | 'loading' | 'succeeded' | 'failed';
  error: string | null;
  cacheMetadata: {
    lastFetchedTimestamp: number | null;
    restrictToFightWindow: boolean | null;
  };
  currentRequest: DamageEventsRequest;
}

export type DamageEventsState = KeyedCacheState<DamageEventsEntry>;

// Local interface to avoid circular dependency with RootState
interface LocalRootState {
  events: {
    damage: DamageEventsState;
  };
}

const createEmptyEntry = (): DamageEventsEntry => ({
  events: [],
  status: 'idle',
  error: null,
  cacheMetadata: {
    lastFetchedTimestamp: null,
    restrictToFightWindow: null,
  },
  currentRequest: null,
});

const ensureEntry = (state: DamageEventsState, key: string): DamageEventsEntry => {
  if (!state.entries[key]) {
    state.entries[key] = createEmptyEntry();
  }
  return state.entries[key];
};

const initialState: DamageEventsState = {
  entries: {},
  accessOrder: [],
};

export const fetchDamageEvents = createAsyncThunk<
  DamageEvent[],
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
  'damageEvents/fetchDamageEvents',
  async (
    { reportCode, fight, client, restrictToFightWindow = true },
    { rejectWithValue, signal },
  ) => {
    logger.info('Fetching damage events', {
      reportCode,
      fightId: fight.id,
      restrictToFightWindow,
    });

    // Fetch both friendly and enemy damage events
    const hostilityTypes = [HostilityType.Friendlies, HostilityType.Enemies];
    const eventChunks: LogEvent[][] = [];

    const initialStartTime = restrictToFightWindow ? fight.startTime : undefined;
    const finalEndTime = restrictToFightWindow ? (fight.endTime ?? undefined) : undefined;

    try {
      for (const hostilityType of hostilityTypes) {
        let nextPageTimestamp: number | null = null;
        let pageCount = 0;
        let streamEventCount = 0;

        do {
          signal.throwIfAborted();
          if (pageCount >= EVENT_MAX_PAGES_PER_STREAM) {
            throw new Error(`Damage event pagination exceeded ${EVENT_MAX_PAGES_PER_STREAM} pages`);
          }

          const requestedStartTime = nextPageTimestamp ?? initialStartTime;
          const response: GetDamageEventsQuery = await client.query({
            query: GetDamageEventsDocument,
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
          pageCount += 1;

          const page = response.reportData?.report?.events;
          if (page?.data?.length) {
            streamEventCount += page.data.length;
            if (streamEventCount > EVENT_MAX_EVENTS_PER_STREAM) {
              throw new Error(
                `Damage event pagination exceeded ${EVENT_MAX_EVENTS_PER_STREAM} events`,
              );
            }
            eventChunks.push(page.data);
            logger.info(`Fetched damage events page ${pageCount} for ${hostilityType}`, {
              reportCode,
              fightId: fight.id,
              hostilityType,
              pageCount,
              eventsInPage: page.data.length,
              streamEventCount,
            });
          }

          const followingTimestamp = page?.nextPageTimestamp ?? null;
          if (
            followingTimestamp != null &&
            requestedStartTime != null &&
            followingTimestamp <= requestedStartTime
          ) {
            throw new Error('Damage event pagination cursor did not advance');
          }
          nextPageTimestamp = followingTimestamp;
        } while (nextPageTimestamp != null);
      }
    } catch (error) {
      return rejectWithValue(
        error instanceof Error ? error.message : 'Failed to fetch damage events',
      );
    }

    const allEvents = eventChunks.flat();

    logger.info('Damage events fetch completed', {
      reportCode,
      fightId: fight.id,
      totalEvents: allEvents.length,
      restrictToFightWindow,
    });

    return allEvents as DamageEvent[];
  },
  {
    condition: ({ reportCode, fight, restrictToFightWindow = true }, { getState }) => {
      const state = getState().events.damage;
      const { key } = resolveCacheKey({ reportCode, fightId: Number(fight.id) });
      const entry = state.entries[key];

      const lastFetchedTimestamp = entry?.cacheMetadata.lastFetchedTimestamp;
      if (
        hasFreshCacheForMode(entry?.cacheMetadata, restrictToFightWindow, DATA_FETCH_CACHE_TIMEOUT)
      ) {
        logger.info('Using cached damage events', {
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
        logger.info('Damage events fetch already in progress for requested fight, skipping', {
          reportCode,
          fightId: Number(fight.id),
          restrictToFightWindow,
        });
        return false;
      }

      return true;
    },
    dispatchConditionRejection: true,
  },
);

const damageEventsSlice = createSlice({
  name: 'damageEvents',
  initialState,
  reducers: {
    clearDamageEvents(state) {
      resetCacheState(state);
    },
    resetDamageEventsLoading(state) {
      Object.values(state.entries).forEach((entry) => {
        if (entry.status === 'loading') {
          entry.status = 'idle';
        }
        entry.error = null;
        entry.currentRequest = null;
      });
    },
    clearDamageEventsForContext(
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
    trimDamageEventsCache(state, action: PayloadAction<{ maxEntries?: number } | undefined>) {
      const limit = action?.payload?.maxEntries ?? EVENT_CACHE_MAX_ENTRIES;
      trimCache(state, limit);
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchDamageEvents.pending, (state, action) => {
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
      .addCase(fetchDamageEvents.fulfilled, (state, action) => {
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
          logger.info('Ignoring stale damage events response', {
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
      .addCase(fetchDamageEvents.rejected, (state, action) => {
        const { key } = resolveCacheKey({
          reportCode: action.meta.arg.reportCode,
          fightId: Number(action.meta.arg.fight.id),
        });
        const entry = ensureEntry(state, key);
        if (action.meta.condition) {
          const restrictToFightWindow = action.meta.arg.restrictToFightWindow ?? true;
          if (
            hasFreshCacheForMode(
              entry.cacheMetadata,
              restrictToFightWindow,
              DATA_FETCH_CACHE_TIMEOUT,
            )
          ) {
            entry.status = 'succeeded';
            entry.error = null;
            entry.currentRequest = null;
            touchAccessOrder(state, key);
          }
          return;
        }
        if (
          isStaleResponse(
            entry.currentRequest,
            action.meta.requestId,
            action.meta.arg.reportCode,
            Number(action.meta.arg.fight.id),
          )
        ) {
          logger.info('Ignoring stale damage events error response', {
            reportCode: action.meta.arg.reportCode,
            fightId: Number(action.meta.arg.fight.id),
          });
          return;
        }
        entry.status = 'failed';
        entry.error = action.payload ?? action.error.message ?? 'Failed to fetch damage events';
        entry.currentRequest = null;
        touchAccessOrder(state, key);
      });
  },
});

export const {
  clearDamageEvents,
  resetDamageEventsLoading,
  clearDamageEventsForContext,
  trimDamageEventsCache,
} = damageEventsSlice.actions;
export default damageEventsSlice.reducer;
