/**
 * Pack service — thin façade over the pack hub API client.
 * Provides roster-specific pack helpers used by the roster builder.
 */

import { packHubApi } from '../features/pack-hub/api/pack-hub-api';
import type { HubPack, PublishPackPayload, SinglePackResponse } from '../features/pack-hub/types/pack-hub.types';

/** Fetch packs filtered to the roster-pack type. */
export async function fetchRosterPacks(token?: string): Promise<HubPack[]> {
  const res = await packHubApi.list({ packType: 'roster-pack', token });
  return res.packs;
}

/** Fetch a single pack by ID. */
export async function fetchPackById(id: string, token?: string): Promise<HubPack> {
  const res: SinglePackResponse = await packHubApi.get(id, token);
  return res.pack;
}

/** Create a new pack and return the created record. */
export async function createPack(data: PublishPackPayload, token: string): Promise<HubPack> {
  const res: SinglePackResponse = await packHubApi.create(data, token);
  return res.pack;
}
