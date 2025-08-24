import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';

import { DATA_FETCH_CACHE_TIMEOUT } from '../../Constants';
import { createEsoLogsClient } from '../../esologsClient';
import {
  FightFragment,
  GetDebuffEventsDocument,
  GetDebuffEventsQuery,
  HostilityType,
} from '../../graphql/generated';
import { DebuffEvent, LogEvent } from '../../types/combatlogEvents';
import { RootState } from '../storeWithHistory';

export interface DebuffEventsState {
  events: DebuffEvent[];
  loading: boolean;
  error: string | null;
  // Cache metadata for better cache management
  cacheMetadata: {
    lastFetchedReportId: string | null;
    lastFetchedFightId: number | null;
    lastFetchedTimestamp: number | null;
  };
}

const initialState: DebuffEventsState = {
  events: [],
  loading: false,
  error: null,
  cacheMetadata: {
    lastFetchedReportId: null,
    lastFetchedFightId: null,
    lastFetchedTimestamp: null,
  },
};

export const fetchDebuffEvents = createAsyncThunk<
  DebuffEvent[],
  { reportCode: string; fight: FightFragment; accessToken: string },
  { state: RootState; rejectValue: string }
>(
  'debuffEvents/fetchDebuffEvents',
  async ({ reportCode, fight, accessToken }) => {
    const client = createEsoLogsClient(accessToken);

    // Fetch both friendly and enemy debuff events
    const hostilityTypes = [HostilityType.Friendlies, HostilityType.Enemies];
    let allEvents: LogEvent[] = [];

    for (const hostilityType of hostilityTypes) {
      let nextPageTimestamp: number | null = null;

      do {
        const response: { data: GetDebuffEventsQuery } = await client.query({
          query: GetDebuffEventsDocument,
          variables: {
            code: reportCode,
            fightIds: [Number(fight.id)],
            startTime: nextPageTimestamp ?? fight.startTime,
            endTime: fight.endTime,
            hostilityType: hostilityType,
          },
          context: {
            headers: {
              Authorization: accessToken ? `Bearer ${accessToken}` : undefined,
            },
          },
        });

        const page = response.data?.reportData?.report?.events;
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
        event.type === 'removedebuffstack'
    ) as DebuffEvent[];
    return debuffEvents;
  },
  {
    condition: ({ reportCode, fight }, { getState }) => {
      const state = getState().events.debuffs;
      const requestedReportId = reportCode;
      const requestedFightId = Number(fight.id);

      // Check if debuff events are already cached for this fight
      const isCached =
        state.cacheMetadata.lastFetchedReportId === requestedReportId &&
        state.cacheMetadata.lastFetchedFightId === requestedFightId;
      const isFresh =
        state.cacheMetadata.lastFetchedTimestamp &&
        Date.now() - state.cacheMetadata.lastFetchedTimestamp < DATA_FETCH_CACHE_TIMEOUT;

      if (isCached && isFresh && state.events.length > 0) {
        return false; // Prevent thunk execution
      }

      if (state.loading) {
        return false; // Prevent duplicate execution
      }

      return true; // Allow thunk execution
    },
  }
);

const debuffEventsSlice = createSlice({
  name: 'debuffEvents',
  initialState,
  reducers: {
    clearDebuffEvents(state) {
      state.events = [];
      state.loading = false;
      state.error = null;
      state.cacheMetadata = {
        lastFetchedReportId: null,
        lastFetchedFightId: null,
        lastFetchedTimestamp: null,
      };
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchDebuffEvents.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchDebuffEvents.fulfilled, (state, action) => {
        state.events = action.payload;
        state.loading = false;
        state.error = null;
        // Update cache metadata
        state.cacheMetadata = {
          lastFetchedReportId: action.meta.arg.reportCode,
          lastFetchedFightId: Number(action.meta.arg.fight.id),
          lastFetchedTimestamp: Date.now(),
        };
      })
      .addCase(fetchDebuffEvents.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message || 'Failed to fetch debuff events';
      });
  },
});

export const { clearDebuffEvents } = debuffEventsSlice.actions;
export default debuffEventsSlice.reducer;
