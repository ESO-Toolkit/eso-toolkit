/**
 * Account loadout sync REST client.
 * Mirrors build-hub-api: thin fetch wrappers, auth via Bearer token. All
 * endpoints require auth — loadouts are private to their owner.
 */

import { getRosterHubBaseUrl } from '../../../utils/envUtils';
import type {
  LoadoutSyncPayload,
  LoadoutTombstone,
  UserLoadoutRow,
} from '../types/loadout-sync.types';

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

/** A loadout list/sync response: the library plus the account's deletion tombstones. */
export interface LoadoutListResponse {
  loadouts: UserLoadoutRow[];
  /** Tombstones — loadouts deleted on the account, with delete times. */
  deletions: LoadoutTombstone[];
  /**
   * Ids from a /loadouts/sync batch that the account-cap race left unsaved. Present
   * (non-empty) only on a partial sync: the rest of `loadouts` is authoritative and
   * should still be reconciled; the client surfaces these as a non-fatal warning.
   */
  skipped?: string[];
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

  /**
   * Delete a loadout from the account. `deletedAt` (ISO) is the tombstone's
   * version — an edit on another device newer than this revives the loadout.
   */
  remove(id: string, token: string, deletedAt?: string): Promise<{ ok: boolean }> {
    const qs = deletedAt ? `?ts=${encodeURIComponent(deletedAt)}` : '';
    return apiFetch(`/loadouts/${id}${qs}`, { method: 'DELETE' }, token);
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
