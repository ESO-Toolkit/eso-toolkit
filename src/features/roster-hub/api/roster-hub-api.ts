/**
 * Roster Hub API client.
 * Reads VITE_ROSTER_HUB_API_URL from the environment; falls back to localhost
 * during development so the Worker dev server Just Works.
 */

import { getBaseUrl, getEnvVar } from '../../../utils/envUtils';
import type {
  HubRoster,
  ListCommentsResponse,
  ListRostersResponse,
  RecommendedAddons,
  SingleCommentResponse,
  SingleRosterResponse,
  SortOrder,
  UserProfileResponse,
  VoteResponse,
} from '../types/roster-hub.types';

/** Parse the recommended_addons JSON string from the API into a typed object. */
function parseRecommendedAddons(raw: string | null | undefined): RecommendedAddons | null {
  if (!raw) return null;
  try {
    return JSON.parse(raw) as RecommendedAddons;
  } catch {
    return null;
  }
}

/** Hydrate recommended_addons on a roster response (D1 stores it as a JSON string). */
function hydrateRoster(roster: HubRoster): HubRoster {
  return {
    ...roster,
    recommended_addons:
      typeof roster.recommended_addons === 'string'
        ? parseRecommendedAddons(roster.recommended_addons)
        : (roster.recommended_addons ?? null),
  };
}

const BASE_URL =
  getEnvVar('VITE_ROSTER_HUB_API_URL') ?? 'https://roster-hub-api.eso-toolkit.workers.dev';

const REQUEST_TIMEOUT_MS = 15_000;

async function request<T>(path: string, options: RequestInit = {}, token?: string): Promise<T> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string> | undefined),
  };
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  let res: Response;
  try {
    res = await fetch(`${BASE_URL}${path}`, {
      ...options,
      headers,
      cache: 'no-store',
      signal: controller.signal,
    });
  } catch (err) {
    clearTimeout(timer);
    if (err instanceof Error && err.name === 'AbortError') {
      throw new Error('Request timed out. Check your connection and try again.');
    }
    throw err;
  }
  clearTimeout(timer);

  if (!res.ok) {
    const text = await res.text();
    let message = `API error ${res.status}`;
    try {
      const json = JSON.parse(text) as { error?: string };
      if (json.error) message = json.error;
    } catch {
      // ignore parse failure
    }
    const error = new Error(message);
    (error as Error & { status: number }).status = res.status;
    throw error;
  }

  return res.json() as Promise<T>;
}

export const rosterHubApi = {
  async list(opts: {
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
    const data = await request<ListRostersResponse>(`/rosters${qs}`, {}, opts.token);
    return { ...data, rosters: data.rosters.map(hydrateRoster) };
  },

  async get(id: string, token?: string): Promise<SingleRosterResponse> {
    const data = await request<SingleRosterResponse>(`/rosters/${id}`, {}, token);
    return { roster: hydrateRoster(data.roster) };
  },

  create(
    data: {
      title: string;
      description: string;
      trial_id: string;
      roster_data: string;
      tags: string[];
      is_anonymous?: boolean;
      recommended_addons?: RecommendedAddons | null;
    },
    token: string,
  ): Promise<SingleRosterResponse> {
    return request<SingleRosterResponse>(
      '/rosters',
      { method: 'POST', body: JSON.stringify(data) },
      token,
    );
  },

  update(
    id: string,
    data: {
      title: string;
      description: string;
      trial_id: string;
      roster_data: string;
      tags: string[];
      is_anonymous?: boolean;
      recommended_addons?: RecommendedAddons | null;
    },
    token: string,
  ): Promise<SingleRosterResponse> {
    return request<SingleRosterResponse>(
      `/rosters/${id}`,
      { method: 'PUT', body: JSON.stringify(data) },
      token,
    );
  },

  delete(id: string, token: string): Promise<{ ok: boolean }> {
    return request<{ ok: boolean }>(`/rosters/${id}`, { method: 'DELETE' }, token);
  },

  vote(id: string, token: string): Promise<VoteResponse> {
    return request<VoteResponse>(`/rosters/${id}/vote`, { method: 'POST' }, token);
  },

  loadRosterIntoBuilder(roster: HubRoster): void {
    // Navigate to roster builder with the encoded roster data as the ?r= param
    window.location.href = `${getBaseUrl()}roster-builder?r=${encodeURIComponent(roster.roster_data)}`;
  },

  // ─── Comments ──────────────────────────────────────────────────────────────

  listComments(rosterId: string): Promise<ListCommentsResponse> {
    return request<ListCommentsResponse>(`/rosters/${rosterId}/comments`);
  },

  createComment(
    rosterId: string,
    data: { body: string; parent_id?: string },
    token: string,
  ): Promise<SingleCommentResponse> {
    return request<SingleCommentResponse>(
      `/rosters/${rosterId}/comments`,
      { method: 'POST', body: JSON.stringify(data) },
      token,
    );
  },

  deleteComment(rosterId: string, commentId: string, token: string): Promise<{ ok: boolean }> {
    return request<{ ok: boolean }>(
      `/rosters/${rosterId}/comments/${commentId}`,
      { method: 'DELETE' },
      token,
    );
  },

  // ─── Public profiles ────────────────────────────────────────────────────────

  getUserProfile(username: string): Promise<UserProfileResponse> {
    return request<UserProfileResponse>(`/users/${encodeURIComponent(username)}`);
  },

  updateBio(bio: string, token: string): Promise<{ ok: boolean }> {
    return request<{ ok: boolean }>(
      '/users/me/bio',
      { method: 'PUT', body: JSON.stringify({ bio }) },
      token,
    );
  },

  uploadAvatar(
    imageDataUrl: string,
    token: string,
  ): Promise<{ avatar_url: string; avatar_thumb_url: string }> {
    // Strip data-URL prefix if present
    let image = imageDataUrl;
    const idx = image.indexOf(',');
    if (idx !== -1 && image.startsWith('data:')) image = image.slice(idx + 1);

    return request<{ avatar_url: string; avatar_thumb_url: string }>(
      '/users/me/avatar',
      { method: 'PUT', body: JSON.stringify({ image }) },
      token,
    );
  },

  deleteAvatar(token: string): Promise<{ ok: boolean }> {
    return request<{ ok: boolean }>('/users/me/avatar', { method: 'DELETE' }, token);
  },

  syncDisplayNames(
    naDisplayName: string | null,
    euDisplayName: string | null,
    token: string,
  ): Promise<{ ok: boolean }> {
    return request<{ ok: boolean }>(
      '/users/me/display-names',
      {
        method: 'PUT',
        body: JSON.stringify({
          na_display_name: naDisplayName,
          eu_display_name: euDisplayName,
        }),
      },
      token,
    );
  },

  lookupPlayerAvatars(
    players: { display_name: string; server: 'na' | 'eu' }[],
  ): Promise<{ avatars: Record<string, string> }> {
    return request<{ avatars: Record<string, string> }>('/users/avatars/lookup', {
      method: 'POST',
      body: JSON.stringify({ players }),
    });
  },
};
