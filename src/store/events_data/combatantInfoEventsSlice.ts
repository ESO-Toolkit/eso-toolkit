import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';

import { DATA_FETCH_CACHE_TIMEOUT } from '../../Constants';
import { EsoLogsClient } from '../../esologsClient';
import {
  FightFragment,
  GetCombatantInfoEventsDocument,
  GetCombatantInfoEventsQuery,
  HostilityType,
} from '../../graphql/generated';
import { CombatantInfoEvent, LogEvent } from '../../types/combatlogEvents';
import type { RootState } from '../storeWithHistory';

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
  };
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
  },
};

export const fetchCombatantInfoEvents = createAsyncThunk<
  CombatantInfoEvent[],
  { reportCode: string; fight: FightFragment; client: EsoLogsClient },
  { state: RootState; rejectValue: string }
>(
  'combatantInfoEvents/fetchCombatantInfoEvents',
  async ({ reportCode, fight, client }) => {
    // Fetch both friendly and enemy combatant info events
    const hostilityTypes = [HostilityType.Friendlies, HostilityType.Enemies];
    let allEvents: LogEvent[] = [];

    for (const hostilityType of hostilityTypes) {
      let nextPageTimestamp: number | null = null;

      do {
        const response: GetCombatantInfoEventsQuery = await client.query({
          query: GetCombatantInfoEventsDocument,
          fetchPolicy: 'no-cache',
          variables: {
            code: reportCode,
            fightIds: [Number(fight.id)],
            startTime: nextPageTimestamp ?? fight.startTime,
            endTime: fight.endTime,
            hostilityType: hostilityType,
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
      (event) => event.type === 'combatantinfo'
    ) as CombatantInfoEvent[];
    return combatantInfoEvents;
  },
  {
    condition: ({ reportCode, fight }, { getState }) => {
      const state = getState().events.combatantInfo;
      const requestedReportId = reportCode;
      const requestedFightId = Number(fight.id);

      // Check if combatant info events are already cached for this report and fight
      const isCached =
        state.cacheMetadata.lastFetchedReportId === requestedReportId &&
        state.cacheMetadata.lastFetchedFightId === requestedFightId;
      const isFresh =
        state.cacheMetadata.lastFetchedTimestamp &&
        Date.now() - state.cacheMetadata.lastFetchedTimestamp < DATA_FETCH_CACHE_TIMEOUT;

      if (isCached && isFresh) {
        return false; // Prevent thunk execution
      }

      if (state.loading) {
        return false; // Prevent duplicate execution
      }

      return true; // Allow thunk execution
    },
  }
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
      };
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchCombatantInfoEvents.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchCombatantInfoEvents.fulfilled, (state, action) => {
        state.events = action.payload;
        state.loading = false;
        state.error = null;
        // Update cache metadata
        state.cacheMetadata = {
          lastFetchedReportId: action.meta.arg.reportCode,
          lastFetchedFightId: Number(action.meta.arg.fight.id),
          lastFetchedTimestamp: Date.now(),
          eventCount: action.payload.length,
        };
      })
      .addCase(fetchCombatantInfoEvents.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message || 'Failed to fetch combatant info events';
      });
  },
});

export const { clearCombatantInfoEvents } = combatantInfoEventsSlice.actions;
export default combatantInfoEventsSlice.reducer;
