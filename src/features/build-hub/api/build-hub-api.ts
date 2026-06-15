/**
 * Build Hub REST API client.
 * Mirrors the roster-hub-api pattern: thin fetch wrappers, auth via Bearer token.
 */

import { getRosterHubBaseUrl } from '../../../utils/envUtils';
import type {
  HubBuild,
  HubBuildComment,
  ListBuildsOptions,
  PublishBuildPayload,
} from '../types/build-hub.types';

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

export const buildHubApi = {
  list(
    opts: ListBuildsOptions = {},
    token?: string,
  ): Promise<{ builds: HubBuild[]; page: number; sort: string }> {
    const params = new URLSearchParams();
    if (opts.esoClass) params.set('class', opts.esoClass);
    if (opts.role) params.set('role', opts.role);
    if (opts.mode) params.set('mode', opts.mode);
    if (opts.tag) params.set('tag', opts.tag);
    if (opts.sort) params.set('sort', opts.sort);
    if (opts.page) params.set('page', String(opts.page));
    const qs = params.toString();
    return apiFetch(`/builds${qs ? `?${qs}` : ''}`, {}, token);
  },

  get(id: string, token?: string): Promise<{ build: HubBuild }> {
    return apiFetch(`/builds/${id}`, {}, token);
  },

  create(payload: PublishBuildPayload, token: string): Promise<{ build: HubBuild }> {
    return apiFetch('/builds', { method: 'POST', body: JSON.stringify(payload) }, token);
  },

  update(id: string, payload: PublishBuildPayload, token: string): Promise<{ build: HubBuild }> {
    return apiFetch(`/builds/${id}`, { method: 'PUT', body: JSON.stringify(payload) }, token);
  },

  delete(id: string, token: string): Promise<{ ok: boolean }> {
    return apiFetch(`/builds/${id}`, { method: 'DELETE' }, token);
  },

  vote(id: string, token: string): Promise<{ voted: boolean; voteCount: number }> {
    return apiFetch(`/builds/${id}/vote`, { method: 'POST' }, token);
  },

  listComments(id: string): Promise<{ comments: HubBuildComment[] }> {
    return apiFetch(`/builds/${id}/comments`);
  },

  createComment(
    id: string,
    body: string,
    token: string,
    parentId?: string,
  ): Promise<{ comment: HubBuildComment }> {
    return apiFetch(
      `/builds/${id}/comments`,
      { method: 'POST', body: JSON.stringify({ body, parent_id: parentId }) },
      token,
    );
  },

  deleteComment(buildId: string, commentId: string, token: string): Promise<{ ok: boolean }> {
    return apiFetch(`/builds/${buildId}/comments/${commentId}`, { method: 'DELETE' }, token);
  },
};
