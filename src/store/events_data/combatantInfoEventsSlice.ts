import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';

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
import type { RootState } from '../storeWithHistory';

import { EVENT_PAGE_LIMIT } from './constants';
import { createCurrentRequest, isStaleResponse } from './utils/requestTracking';

const logger = new Logger({ level: LogLevel.INFO, contextPrefix: 'CombatantInfoEvents' });

export interface CombatantInfoEventsState {
  events: CombatantInfoEvent[];
  loading: boolean;
  error: string | null;
  // Cache metadata for better cache management
  cacheMetadata: {
    lastFetchedReportId: string | null;
    lastFetchedFightId: number | null;
    lastFetchedTimestamp: number | null;
    eventCount: number;
    lastRestrictToFightWindow: boolean | null;
  };
  currentRequest: {
    reportId: string;
    fightId: number;
    requestId: string;
    restrictToFightWindow: boolean;
  } | null;
}

const initialState: CombatantInfoEventsState = {
  events: [],
  loading: false,
  error: null,
  cacheMetadata: {
    lastFetchedReportId: null,
    lastFetchedFightId: null,
    lastFetchedTimestamp: null,
    eventCount: 0,
    lastRestrictToFightWindow: null,
  },
  currentRequest: null,
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
  { state: RootState; rejectValue: string }
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
      const requestedReportId = reportCode;
      const requestedFightId = Number(fight.id);

      const cachedRestrict = state.cacheMetadata.lastRestrictToFightWindow ?? true;
      const restrictMatches = cachedRestrict === restrictToFightWindow;

      // Check if combatant info events are already cached for this report and fight
      const isCached =
        state.cacheMetadata.lastFetchedReportId === requestedReportId &&
        state.cacheMetadata.lastFetchedFightId === requestedFightId;
      const isFresh =
        state.cacheMetadata.lastFetchedTimestamp &&
        Date.now() - state.cacheMetadata.lastFetchedTimestamp < DATA_FETCH_CACHE_TIMEOUT;

      if (isCached && isFresh && restrictMatches) {
        return false; // Prevent thunk execution
      }

      const inFlight = state.currentRequest;
      if (
        inFlight &&
        inFlight.reportId === requestedReportId &&
        inFlight.fightId === requestedFightId &&
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
      state.events = [];
      state.loading = false;
      state.error = null;
      state.cacheMetadata = {
        lastFetchedReportId: null,
        lastFetchedFightId: null,
        lastFetchedTimestamp: null,
        eventCount: 0,
        lastRestrictToFightWindow: null,
      };
      state.currentRequest = null;
    },
    resetCombatantInfoEventsLoading(state) {
      state.loading = false;
      state.error = null;
      state.currentRequest = null;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchCombatantInfoEvents.pending, (state, action) => {
        state.loading = true;
        state.error = null;
        state.currentRequest = createCurrentRequest(
          action.meta.arg.reportCode,
          Number(action.meta.arg.fight.id),
          action.meta.requestId,
          action.meta.arg.restrictToFightWindow ?? true,
        );
      })
      .addCase(fetchCombatantInfoEvents.fulfilled, (state, action) => {
        if (
          isStaleResponse(
            state.currentRequest,
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
        state.events = action.payload;
        state.loading = false;
        state.error = null;
        // Update cache metadata
        state.cacheMetadata = {
          lastFetchedReportId: action.meta.arg.reportCode,
          lastFetchedFightId: Number(action.meta.arg.fight.id),
          lastFetchedTimestamp: Date.now(),
          eventCount: action.payload.length,
          lastRestrictToFightWindow: action.meta.arg.restrictToFightWindow ?? true,
        };
        state.currentRequest = null;
      })
      .addCase(fetchCombatantInfoEvents.rejected, (state, action) => {
        if (
          isStaleResponse(
            state.currentRequest,
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
        state.loading = false;
        state.error = action.error.message || 'Failed to fetch combatant info events';
        state.currentRequest = null;
      });
  },
});

export const { clearCombatantInfoEvents, resetCombatantInfoEventsLoading } =
  combatantInfoEventsSlice.actions;
export default combatantInfoEventsSlice.reducer;
