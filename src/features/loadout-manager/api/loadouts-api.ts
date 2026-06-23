/**
 * Account loadout sync REST client.
 * Mirrors build-hub-api: thin fetch wrappers, auth via Bearer token. All
 * endpoints require auth — loadouts are private to their owner.
 */

import { getRosterHubBaseUrl } from '../../../utils/envUtils';
import type { LoadoutSyncPayload, UserLoadoutRow } from '../types/loadout-sync.types';

const BASE_URL = getRosterHubBaseUrl();

async function apiFetch<T>(path: string, options: RequestInit = {}, token?: string): Promise<T> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string>),
  };
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const res = await fetch(`${BASE_URL}${path}`, { ...options, headers });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }));
    const error = new Error((err as { error?: string }).error ?? res.statusText);
    (error as Error & { status: number }).status = res.status;
    throw error;
  }
  return res.json() as Promise<T>;
}

/** A loadout list/sync response: the library plus ids the account has deleted. */
export interface LoadoutListResponse {
  loadouts: UserLoadoutRow[];
  /** Tombstoned ids — loadouts deleted on the account; clients purge these. */
  deletions: string[];
}

export const loadoutsApi = {
  /** List the signed-in user's own loadouts + deletion tombstones. */
  list(token: string): Promise<LoadoutListResponse> {
    return apiFetch('/loadouts', {}, token);
  },

  /** Create/replace a single loadout (idempotent by id). */
  create(payload: LoadoutSyncPayload, token: string): Promise<{ loadout: UserLoadoutRow }> {
    return apiFetch('/loadouts', { method: 'POST', body: JSON.stringify(payload) }, token);
  },

  /** Update an existing loadout. */
  update(
    id: string,
    payload: LoadoutSyncPayload,
    token: string,
  ): Promise<{ loadout: UserLoadoutRow }> {
    return apiFetch(`/loadouts/${id}`, { method: 'PUT', body: JSON.stringify(payload) }, token);
  },

  /** Delete a loadout from the account. */
  remove(id: string, token: string): Promise<{ ok: boolean }> {
    return apiFetch(`/loadouts/${id}`, { method: 'DELETE' }, token);
  },

  /** Non-destructive bulk upsert; returns the full server library + tombstones. */
  sync(loadouts: LoadoutSyncPayload[], token: string): Promise<LoadoutListResponse> {
    return apiFetch(
      '/loadouts/sync',
      { method: 'POST', body: JSON.stringify({ loadouts }) },
      token,
    );
  },
};
