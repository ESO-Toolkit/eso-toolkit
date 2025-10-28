import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';

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
import { RootState } from '../storeWithHistory';

import { EVENT_PAGE_LIMIT } from './constants';
import { createCurrentRequest, isStaleResponse } from './utils/requestTracking';

const logger = new Logger({ level: LogLevel.INFO, contextPrefix: 'CastEvents' });

export interface CastEventsState {
  events: UnifiedCastEvent[];
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

const initialState: CastEventsState = {
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
  { state: RootState; rejectValue: string }
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
      const requestedReportId = reportCode;
      const requestedFightId = Number(fight.id);

      const cachedRestrict = state.cacheMetadata.lastRestrictToFightWindow ?? true;
      const restrictMatches = cachedRestrict === restrictToFightWindow;

      // Check if cast events are already cached for this fight
      const isCached =
        state.cacheMetadata.lastFetchedReportId === requestedReportId &&
        state.cacheMetadata.lastFetchedFightId === requestedFightId;
      const isFresh =
        state.cacheMetadata.lastFetchedTimestamp &&
        Date.now() - state.cacheMetadata.lastFetchedTimestamp < DATA_FETCH_CACHE_TIMEOUT;

      if (isCached && isFresh && restrictMatches) {
        logger.info('Using cached cast events', {
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
        logger.info('Cast events fetch already in progress for requested fight, skipping', {
          reportCode: requestedReportId,
          fightId: requestedFightId,
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
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchCastEvents.pending, (state, action) => {
        state.loading = true;
        state.error = null;
        state.currentRequest = createCurrentRequest(
          action.meta.arg.reportCode,
          Number(action.meta.arg.fight.id),
          action.meta.requestId,
          action.meta.arg.restrictToFightWindow ?? true,
        );
      })
      .addCase(fetchCastEvents.fulfilled, (state, action) => {
        if (
          isStaleResponse(
            state.currentRequest,
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
      .addCase(fetchCastEvents.rejected, (state, action) => {
        if (
          isStaleResponse(
            state.currentRequest,
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
        state.loading = false;
        state.error = action.error.message || 'Failed to fetch cast events';
        state.currentRequest = null;
      });
  },
});

export const { clearCastEvents } = castEventsSlice.actions;
export default castEventsSlice.reducer;
