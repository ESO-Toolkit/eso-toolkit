import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';

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

const logger = new Logger({ level: LogLevel.INFO, contextPrefix: 'DamageEvents' });

const EVENT_PAGE_LIMIT = 100000;

// Local interface to avoid circular dependency with RootState
interface LocalRootState {
  events: {
    damage: DamageEventsState;
  };
}

export interface DamageEventsState {
  events: DamageEvent[];
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

const initialState: DamageEventsState = {
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

export const fetchDamageEvents = createAsyncThunk(
  'damageEvents/fetchDamageEvents',
  async (
    {
      reportCode,
      fight,
      client,
      restrictToFightWindow = true,
    }: {
      reportCode: string;
      fight: FightFragment;
      client: EsoLogsClient;
      restrictToFightWindow?: boolean;
    },
    { getState: _getState, rejectWithValue: _rejectWithValue },
  ) => {
    logger.info('Fetching damage events', {
      reportCode,
      fightId: fight.id,
      restrictToFightWindow,
    });

    // Fetch both friendly and enemy damage events
    const hostilityTypes = [HostilityType.Friendlies, HostilityType.Enemies];
    let allEvents: LogEvent[] = [];

    const initialStartTime = restrictToFightWindow ? fight.startTime : undefined;
    const finalEndTime = restrictToFightWindow ? (fight.endTime ?? undefined) : undefined;

    for (const hostilityType of hostilityTypes) {
      let nextPageTimestamp: number | null = null;
      let pageCount = 0;

      do {
        pageCount++;
        const response: GetDamageEventsQuery = await client.query({
          query: GetDamageEventsDocument,
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
          logger.info(`Fetched damage events page ${pageCount} for ${hostilityType}`, {
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
      const state = (getState() as LocalRootState).events.damage;
      const requestedReportId = reportCode;
      const requestedFightId = Number(fight.id);

      const cachedRestrict = state.cacheMetadata.lastRestrictToFightWindow ?? true;
      const restrictMatches = cachedRestrict === restrictToFightWindow;

      // Check if damage events are already cached for this report and fight
      const isCached =
        state.cacheMetadata.lastFetchedReportId === requestedReportId &&
        state.cacheMetadata.lastFetchedFightId === requestedFightId;
      const isFresh =
        state.cacheMetadata.lastFetchedTimestamp &&
        Date.now() - state.cacheMetadata.lastFetchedTimestamp < DATA_FETCH_CACHE_TIMEOUT;

      if (isCached && isFresh && restrictMatches) {
        logger.info('Using cached damage events', {
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
        logger.info('Damage events fetch already in progress for requested fight, skipping', {
          reportCode: requestedReportId,
          fightId: requestedFightId,
          restrictToFightWindow,
        });
        return false;
      }

      return true;
    },
  },
);

const damageEventsSlice = createSlice({
  name: 'damageEvents',
  initialState,
  reducers: {
    clearDamageEvents(state) {
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
    resetDamageEventsLoading(state) {
      state.loading = false;
      state.error = null;
      state.currentRequest = null;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchDamageEvents.pending, (state, action) => {
        state.loading = true;
        state.error = null;
        state.currentRequest = {
          reportId: action.meta.arg.reportCode,
          fightId: Number(action.meta.arg.fight.id),
          requestId: action.meta.requestId,
          restrictToFightWindow: action.meta.arg.restrictToFightWindow ?? true,
        };
      })
      .addCase(fetchDamageEvents.fulfilled, (state, action) => {
        if (!state.currentRequest || state.currentRequest.requestId !== action.meta.requestId) {
          logger.info('Ignoring stale damage events response', {
            reportCode: action.meta.arg.reportCode,
            fightId: Number(action.meta.arg.fight.id),
          });
          return;
        }
        state.events = action.payload;
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
      .addCase(fetchDamageEvents.rejected, (state, action) => {
        if (state.currentRequest && state.currentRequest.requestId !== action.meta.requestId) {
          logger.info('Ignoring stale damage events error response', {
            reportCode: action.meta.arg.reportCode,
            fightId: Number(action.meta.arg.fight.id),
          });
          return;
        }
        state.loading = false;
        state.error = action.error.message || 'Failed to fetch damage events';
        state.currentRequest = null;
      });
  },
});

export const { clearDamageEvents, resetDamageEventsLoading } = damageEventsSlice.actions;
export default damageEventsSlice.reducer;
