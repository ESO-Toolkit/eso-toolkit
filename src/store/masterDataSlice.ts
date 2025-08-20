import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';

import { createEsoLogsClient } from '../esologsClient';
import {
  GetReportMasterDataDocument,
  GetReportMasterDataQuery,
  ReportAbilityFragment,
  ReportActorFragment,
} from '../graphql/generated';
import { cleanArray } from '../utils/cleanArray';

interface MasterDataState {
  abilities: ReportAbilityFragment[];
  abilitiesById: Record<string | number, ReportAbilityFragment>;
  actors: ReportActorFragment[];
  actorsById: Record<string | number, ReportActorFragment>;
  loading: boolean;
  error: string | null;
}

const initialState: MasterDataState = {
  abilities: [],
  abilitiesById: {},
  actors: [],
  actorsById: {},
  loading: false,
  error: null,
};

export interface MasterDataPayload {
  abilities: ReportAbilityFragment[];
  abilitiesById: Record<string | number, ReportAbilityFragment>;
  actors: ReportActorFragment[];
  actorsById: Record<string | number, ReportActorFragment>;
}

export const fetchReportMasterData = createAsyncThunk<
  MasterDataPayload,
  { reportCode: string; accessToken: string },
  { rejectValue: string }
>('masterData/fetchReportMasterData', async ({ reportCode, accessToken }, { rejectWithValue }) => {
  try {
    const client = createEsoLogsClient(accessToken);
    const response: { data: GetReportMasterDataQuery } = await client.query({
      query: GetReportMasterDataDocument,
      variables: { code: reportCode },
      context: {
        headers: {
          Authorization: accessToken ? `Bearer ${accessToken}` : undefined,
        },
      },
    });
    const masterData = response.data?.reportData?.report?.masterData;
    const actors = cleanArray(masterData?.actors) ?? [];
    const actorsById: Record<string | number, ReportActorFragment> = {};
    for (const actor of actors) {
      if (actor && (typeof actor.id === 'string' || typeof actor.id === 'number')) {
        actorsById[actor.id] = actor;
      }
    }
    const abilities = cleanArray(masterData?.abilities) ?? [];
    const abilitiesById: Record<string | number, ReportAbilityFragment> = {};
    for (const ability of abilities) {
      if (ability && (typeof ability.gameID === 'string' || typeof ability.gameID === 'number')) {
        abilitiesById[ability.gameID] = ability;
      }
    }
    return {
      abilities,
      abilitiesById,
      actors,
      actorsById,
    };
  } catch (err) {
    const hasMessage = (e: unknown): e is { message: string } =>
      typeof e === 'object' &&
      e !== null &&
      'message' in e &&
      typeof (e as { message: unknown }).message === 'string';
    if (hasMessage(err)) {
      return rejectWithValue(err.message);
    }
    return rejectWithValue('Failed to fetch master data');
  }
});

const masterDataSlice = createSlice({
  name: 'masterData',
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(fetchReportMasterData.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(
        fetchReportMasterData.fulfilled,
        (state, action: PayloadAction<MasterDataPayload>) => {
          state.abilities = action.payload.abilities;
          state.abilitiesById = action.payload.abilitiesById;
          state.actors = action.payload.actors;
          state.actorsById = action.payload.actorsById;
          state.loading = false;
          state.error = null;
        }
      )
      .addCase(fetchReportMasterData.rejected, (state, action) => {
        state.loading = false;
        state.error = (action.payload as string) || 'Failed to fetch master data';
      });
  },
});

export default masterDataSlice.reducer;
