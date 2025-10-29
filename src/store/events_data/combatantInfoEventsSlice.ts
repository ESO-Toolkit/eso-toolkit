import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';

import { DATA_FETCH_CACHE_TIMEOUT } from '../../Constants';
import { EsoLogsClient } from '../../esologsClient';
import {
  FightFragment,
  GetCombatantInfoEventsDocument,
  GetCombatantInfoEventsQuery,
  HostilityType,
} from '../../graphql/gql/graphql';
import { CombatantInfoEvent, LogEvent } from '../../types/combatlogEvents';
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

const logger = new Logger({ level: LogLevel.INFO, contextPrefix: 'CombatantInfoEvents' });

type CombatantInfoEventsRequest = ReturnType<typeof createCurrentRequest> | null;

export interface CombatantInfoEventsEntry {
  events: CombatantInfoEvent[];
  status: 'idle' | 'loading' | 'succeeded' | 'failed';
  error: string | null;
  cacheMetadata: {
    lastFetchedTimestamp: number | null;
    eventCount: number;
    restrictToFightWindow: boolean | null;
  };
  currentRequest: CombatantInfoEventsRequest;
}

export type CombatantInfoEventsState = KeyedCacheState<CombatantInfoEventsEntry>;

interface LocalRootState {
  events: {
    combatantInfo: CombatantInfoEventsState;
  };
}

const createEmptyEntry = (): CombatantInfoEventsEntry => ({
  events: [],
  status: 'idle',
  error: null,
  cacheMetadata: {
    lastFetchedTimestamp: null,
    eventCount: 0,
    restrictToFightWindow: null,
  },
  currentRequest: null,
});

const ensureEntry = (state: CombatantInfoEventsState, key: string): CombatantInfoEventsEntry => {
  if (!state.entries[key]) {
    state.entries[key] = createEmptyEntry();
  }
  return state.entries[key];
};

const initialState: CombatantInfoEventsState = {
  entries: {},
  accessOrder: [],
};

export const fetchCombatantInfoEvents = createAsyncThunk<
  CombatantInfoEvent[],
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
  'combatantInfoEvents/fetchCombatantInfoEvents',
  async ({ reportCode, fight, client, restrictToFightWindow = true }) => {
    // Fetch both friendly and enemy combatant info events
    const hostilityTypes = [HostilityType.Friendlies, HostilityType.Enemies];
    let allEvents: LogEvent[] = [];

    const initialStartTime = restrictToFightWindow ? fight.startTime : undefined;
    const finalEndTime = restrictToFightWindow ? (fight.endTime ?? undefined) : undefined;

    for (const hostilityType of hostilityTypes) {
      let nextPageTimestamp: number | null = null;

      do {
        const response: GetCombatantInfoEventsQuery = await client.query({
          query: GetCombatantInfoEventsDocument,
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

    // Filter to only combatant info events
    const combatantInfoEvents = allEvents.filter(
      (event) => event.type === 'combatantinfo',
    ) as CombatantInfoEvent[];
    return combatantInfoEvents;
  },
  {
    condition: ({ reportCode, fight, restrictToFightWindow = true }, { getState }) => {
      const state = getState().events.combatantInfo;
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

const combatantInfoEventsSlice = createSlice({
  name: 'combatantInfoEvents',
  initialState,
  reducers: {
    clearCombatantInfoEvents(state) {
      resetCacheState(state);
    },
    resetCombatantInfoEventsLoading(state) {
      Object.values(state.entries).forEach((entry) => {
        if (entry.status === 'loading') {
          entry.status = 'idle';
        }
        entry.error = null;
        entry.currentRequest = null;
      });
    },
    clearCombatantInfoEventsForContext(
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
    trimCombatantInfoEventsCache(
      state,
      action: PayloadAction<{ maxEntries?: number } | undefined>,
    ) {
      const limit = action?.payload?.maxEntries ?? EVENT_CACHE_MAX_ENTRIES;
      trimCache(state, limit);
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchCombatantInfoEvents.pending, (state, action) => {
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
      .addCase(fetchCombatantInfoEvents.fulfilled, (state, action) => {
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
          logger.info('Ignoring stale combatant info events response', {
            reportCode: action.meta.arg.reportCode,
            fightId: Number(action.meta.arg.fight.id),
          });
          return;
        }
        entry.events = action.payload;
        entry.status = 'succeeded';
        entry.error = null;
        entry.cacheMetadata.lastFetchedTimestamp = Date.now();
        entry.cacheMetadata.eventCount = action.payload.length;
        entry.cacheMetadata.restrictToFightWindow = action.meta.arg.restrictToFightWindow ?? true;
        entry.currentRequest = null;
        touchAccessOrder(state, key);
        trimCache(state, EVENT_CACHE_MAX_ENTRIES);
      })
      .addCase(fetchCombatantInfoEvents.rejected, (state, action) => {
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
          logger.info('Ignoring stale combatant info events error response', {
            reportCode: action.meta.arg.reportCode,
            fightId: Number(action.meta.arg.fight.id),
          });
          return;
        }
        entry.status = 'failed';
        entry.error = action.error.message || 'Failed to fetch combatant info events';
        entry.currentRequest = null;
        touchAccessOrder(state, key);
      });
  },
});

export const {
  clearCombatantInfoEvents,
  resetCombatantInfoEventsLoading,
  clearCombatantInfoEventsForContext,
  trimCombatantInfoEventsCache,
} = combatantInfoEventsSlice.actions;
export default combatantInfoEventsSlice.reducer;
