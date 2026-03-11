/**
 * Roster Hub API client.
 * Reads VITE_ROSTER_HUB_API_URL from the environment; falls back to localhost
 * during development so the Worker dev server Just Works.
 */

import type {
  HubRoster,
  ListRostersResponse,
  SingleRosterResponse,
  VoteResponse,
  SortOrder,
} from '../types/roster-hub.types';

const BASE_URL = (import.meta.env.VITE_ROSTER_HUB_API_URL as string | undefined) ?? 'http://localhost:8787';

async function request<T>(
  path: string,
  options: RequestInit = {},
  token?: string,
): Promise<T> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string> | undefined),
  };
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const res = await fetch(`${BASE_URL}${path}`, { ...options, headers });

  if (!res.ok) {
    const text = await res.text();
    let message = `API error ${res.status}`;
    try {
      const json = JSON.parse(text) as { error?: string };
      if (json.error) message = json.error;
    } catch {
      // ignore parse failure
    }
    throw new Error(message);
  }

  return res.json() as Promise<T>;
}

export const rosterHubApi = {
  list(opts: {
    trial?: string;
    tag?: string;
    sort?: SortOrder;
    page?: number;
    token?: string;
  }): Promise<ListRostersResponse> {
    const params = new URLSearchParams();
    if (opts.trial) params.set('trial', opts.trial);
    if (opts.tag) params.set('tag', opts.tag);
    if (opts.sort) params.set('sort', opts.sort);
    if (opts.page) params.set('page', String(opts.page));
    const qs = params.toString() ? `?${params.toString()}` : '';
    return request<ListRostersResponse>(`/rosters${qs}`, {}, opts.token);
  },

  get(id: string, token?: string): Promise<SingleRosterResponse> {
    return request<SingleRosterResponse>(`/rosters/${id}`, {}, token);
  },

  create(
    data: {
      title: string;
      description: string;
      trial_id: string;
      roster_data: string;
      tags: string[];
    },
    token: string,
  ): Promise<SingleRosterResponse> {
    return request<SingleRosterResponse>('/rosters', { method: 'POST', body: JSON.stringify(data) }, token);
  },

  update(
    id: string,
    data: {
      title: string;
      description: string;
      trial_id: string;
      roster_data: string;
      tags: string[];
    },
    token: string,
  ): Promise<SingleRosterResponse> {
    return request<SingleRosterResponse>(`/rosters/${id}`, { method: 'PUT', body: JSON.stringify(data) }, token);
  },

  delete(id: string, token: string): Promise<{ ok: boolean }> {
    return request<{ ok: boolean }>(`/rosters/${id}`, { method: 'DELETE' }, token);
  },

  vote(id: string, token: string): Promise<VoteResponse> {
    return request<VoteResponse>(`/rosters/${id}/vote`, { method: 'POST' }, token);
  },

  loadRosterIntoBuilder(roster: HubRoster): void {
    // Navigate to roster builder with the encoded roster data as the ?r= param
    window.location.href = `/roster-builder?r=${roster.roster_data}`;
  },
};
