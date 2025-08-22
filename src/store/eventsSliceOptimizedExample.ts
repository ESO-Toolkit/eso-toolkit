import { createAsyncThunk } from '@reduxjs/toolkit';

import { createEsoLogsClient } from '../esologsClient';
import {
  GetDamageEventsDocument,
  GetDamageEventsQuery,
  GetHealingEventsDocument,
  GetHealingEventsQuery,
  GetReportPlayersOnlyDocument,
  GetReportPlayersOnlyQuery,
} from '../graphql/generated';
import { LogEvent } from '../types/combatlogEvents';
import { cleanArray } from '../utils/cleanArray';

/**
 * Optimized Events Slice - Example implementation
 * This shows how to use the optimized GraphQL queries for better performance
 */

// Optimized thunk for fetching damage events only
export const fetchDamageEventsOptimized = createAsyncThunk<
  LogEvent[],
  {
    reportCode: string;
    fightId: number;
    fight: { startTime?: number; endTime?: number };
    accessToken: string;
  },
  { rejectValue: string }
>(
  'events/fetchDamageEventsOptimized',
  async ({ reportCode, fightId, fight, accessToken }, { rejectWithValue }) => {
    try {
      const client = createEsoLogsClient(accessToken);

      // Fetch only damage events with optimized query
      let allEvents: LogEvent[] = [];
      let nextPageTimestamp: number | null = null;

      do {
        const response: { data: GetDamageEventsQuery } = await client.query({
          query: GetDamageEventsDocument,
          variables: {
            code: reportCode,
            fightIds: [fightId],
            startTime: nextPageTimestamp ?? fight.startTime,
            endTime: fight.endTime,
            limit: 50000, // Much more reasonable limit
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

      return allEvents;
    } catch (err) {
      const hasMessage = (e: unknown): e is { message: string } =>
        typeof e === 'object' &&
        e !== null &&
        'message' in e &&
        typeof (e as { message: unknown }).message === 'string';
      if (hasMessage(err)) {
        return rejectWithValue(err.message);
      }
      return rejectWithValue('Failed to fetch damage events');
    }
  }
);

// Optimized thunk for fetching healing events only
export const fetchHealingEventsOptimized = createAsyncThunk<
  LogEvent[],
  {
    reportCode: string;
    fightId: number;
    fight: { startTime?: number; endTime?: number };
    accessToken: string;
  },
  { rejectValue: string }
>(
  'events/fetchHealingEventsOptimized',
  async ({ reportCode, fightId, fight, accessToken }, { rejectWithValue }) => {
    try {
      const client = createEsoLogsClient(accessToken);

      let allEvents: LogEvent[] = [];
      let nextPageTimestamp: number | null = null;

      do {
        const response: { data: GetHealingEventsQuery } = await client.query({
          query: GetHealingEventsDocument,
          variables: {
            code: reportCode,
            fightIds: [fightId],
            startTime: nextPageTimestamp ?? fight.startTime,
            endTime: fight.endTime,
            limit: 50000,
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

      return allEvents;
    } catch (err) {
      const hasMessage = (e: unknown): e is { message: string } =>
        typeof e === 'object' &&
        e !== null &&
        'message' in e &&
        typeof (e as { message: unknown }).message === 'string';
      if (hasMessage(err)) {
        return rejectWithValue(err.message);
      }
      return rejectWithValue('Failed to fetch healing events');
    }
  }
);

// Optimized thunk for fetching player master data only
export const fetchPlayerMasterDataOptimized = createAsyncThunk<
  any,
  { reportCode: string; accessToken: string },
  { rejectValue: string }
>(
  'masterData/fetchPlayerMasterDataOptimized',
  async ({ reportCode, accessToken }, { rejectWithValue }) => {
    try {
      const client = createEsoLogsClient(accessToken);
      const response: { data: GetReportPlayersOnlyQuery } = await client.query({
        query: GetReportPlayersOnlyDocument,
        variables: { code: reportCode },
        context: {
          headers: {
            Authorization: accessToken ? `Bearer ${accessToken}` : undefined,
          },
        },
      });

      const masterData = response.data?.reportData?.report?.masterData;

      // Only players are returned from the optimized query
      const actors = cleanArray(masterData?.actors) ?? [];
      const actorsById: Record<string | number, any> = {};
      for (const actor of actors) {
        if (actor && (typeof actor.id === 'string' || typeof actor.id === 'number')) {
          actorsById[actor.id] = actor;
        }
      }

      const abilities = cleanArray(masterData?.abilities) ?? [];
      const abilitiesById: Record<string | number, any> = {};
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
      return rejectWithValue('Failed to fetch player master data');
    }
  }
);
