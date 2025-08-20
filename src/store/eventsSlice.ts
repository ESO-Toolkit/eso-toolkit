import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';

import { createEsoLogsClient } from '../esologsClient';
import {
  FightFragment,
  GetReportEventsDocument,
  CharacterFragment,
  GetPlayersForReportDocument,
  GetReportEventsQuery,
} from '../graphql/generated';
import { Event } from '../types/events';
import { PlayerDetails, PlayerTalent } from '../types/playerDetails';

export interface PlayerInfo {
  id: string | number;
  name: string;
  combatantInfo?: {
    talents?: PlayerTalent[];
  };
  displayName: string;
  [key: string]: string | number | boolean | null | undefined | object;
}

export interface EventsState {
  events: Event[];
  players: Record<string, PlayerInfo>;
  characters: Record<number, CharacterFragment>;
  loading: boolean;
  error: string | null;
  currentFetchFightId?: number | null;
  shouldExecuteFetch: boolean;
}

const initialState: EventsState = {
  events: [],
  players: {},
  characters: {},
  loading: false,
  error: null,
  currentFetchFightId: null,
  shouldExecuteFetch: false,
};

export const fetchEventsForFight = createAsyncThunk<
  {
    events: Event[];
    players: Record<string, PlayerInfo>;
  },
  { reportCode: string; fight: FightFragment; accessToken: string },
  { state: { events: EventsState }; rejectValue: string }
>(
  'events/fetchEventsForFight',
  async ({ reportCode, fight, accessToken }, { getState, rejectWithValue }) => {
    const state = getState().events;
    const requestedFightId = Number(fight.id);
    if (!state.shouldExecuteFetch) {
      // Already fetching this fight, do not trigger another fetch
      return rejectWithValue('Fetch already in progress for this fight');
    }
    try {
      const client = createEsoLogsClient(accessToken);
      // Fetch all pages of events
      let allEvents: Event[] = [];
      let nextPageTimestamp: number | null = null;
      do {
        const response: { data: GetReportEventsQuery } = await client.query({
          query: GetReportEventsDocument,
          variables: {
            code: reportCode,
            fightIds: [requestedFightId],
            startTime: nextPageTimestamp ?? fight.startTime,
            endTime: fight.endTime,
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
      // Fetch player details
      const { data: playerDetailsData } = await client.query({
        query: GetPlayersForReportDocument,
        variables: { code: reportCode, fightIDs: [requestedFightId] },
        context: {
          headers: {
            Authorization: accessToken ? `Bearer ${accessToken}` : undefined,
          },
        },
      });
      const players: Record<string, PlayerInfo> = {};
      const rawPlayerDetails: PlayerDetails = playerDetailsData?.reportData?.report?.playerDetails
        .data.playerDetails ?? { dps: [], healers: [], tanks: [] };
      // Index all DPS, healers, and tanks by their id
      const allPlayers = [
        ...(rawPlayerDetails?.dps ?? []),
        ...(rawPlayerDetails?.healers ?? []),
        ...(rawPlayerDetails?.tanks ?? []),
      ];
      for (const player of allPlayers) {
        if (player && (typeof player.id === 'string' || typeof player.id === 'number')) {
          players[String(player.id)] = player as unknown as PlayerInfo;
        }
      }

      return { events: allEvents, players };
    } catch (err) {
      const hasMessage = (e: unknown): e is { message: string } =>
        typeof e === 'object' &&
        e !== null &&
        'message' in e &&
        typeof (e as { message: unknown }).message === 'string';
      if (hasMessage(err)) {
        return rejectWithValue(err.message);
      }
      return rejectWithValue('Failed to fetch events');
    }
  }
);

const eventsSlice = createSlice({
  name: 'events',
  initialState,
  reducers: {
    clearEvents(state) {
      state.events = [];
      state.error = null;
      state.loading = false;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchEventsForFight.pending, (state, action) => {
        state.loading = true;
        state.error = null;

        const fightId = action.meta.arg.fight.id;

        if (fightId === state.currentFetchFightId) {
          state.shouldExecuteFetch = false;
        } else {
          state.shouldExecuteFetch = true;
          state.currentFetchFightId = Number(action.meta.arg.fight.id);
        }
      })
      .addCase(
        fetchEventsForFight.fulfilled,
        (
          state,
          action: PayloadAction<{ events: Event[]; players: Record<string, PlayerInfo> }>
        ) => {
          state.events = action.payload.events;
          state.players = action.payload.players;
          state.loading = false;
          state.error = null;
          state.currentFetchFightId = null;
        }
      )
      .addCase(fetchEventsForFight.rejected, (state, action) => {
        state.loading = false;
        state.error = (action.payload as string) || 'Failed to fetch events';
        state.currentFetchFightId = null;
      });
  },
});

export const { clearEvents } = eventsSlice.actions;
export default eventsSlice.reducer;
