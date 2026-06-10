/**
 * Pack Hub API client — talks to the roster-hub-api Worker (VITE_ROSTER_HUB_API_URL).
 *
 * NOTE: This is separate from packs-api.ts (build-hub) which talks to the
 * eso-packs-worker (VITE_PACKS_API_URL). Both expose /packs endpoints but
 * serve different data stores. This one is used by roster-hub and pack-hub features.
 */

import { decodeHtmlEntities } from '../../../utils/decodeHtmlEntities';
import { getRosterHubBaseUrl } from '../../../utils/envUtils';
import type {
  HubPack,
  ListPacksResponse,
  PackAddonEntry,
  PublishPackPayload,
  SinglePackResponse,
  SortOrder,
  VoteResponse,
} from '../types/pack-hub.types';

const BASE_URL = getRosterHubBaseUrl();

const REQUEST_TIMEOUT_MS = 15_000;

async function request<T>(
  path: string,
  options: RequestInit = {},
  token?: string,
  externalSignal?: AbortSignal,
): Promise<T> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string> | undefined),
  };
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  // Forward external abort to our internal controller
  const onExternalAbort = (): void => controller.abort();
  externalSignal?.addEventListener('abort', onExternalAbort);

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
    externalSignal?.removeEventListener('abort', onExternalAbort);
    if (externalSignal?.aborted) throw new DOMException('Aborted', 'AbortError');
    if (err instanceof Error && err.name === 'AbortError') {
      throw new Error('Request timed out. Check your connection and try again.');
    }
    throw err;
  }
  clearTimeout(timer);
  externalSignal?.removeEventListener('abort', onExternalAbort);

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

/** Parse the addons JSON string from D1 into typed array. */
function hydrateAddons(raw: string | PackAddonEntry[]): PackAddonEntry[] {
  if (Array.isArray(raw)) return raw;
  try {
    return JSON.parse(raw) as PackAddonEntry[];
  } catch {
    return [];
  }
}

function hydratePack(pack: HubPack): HubPack {
  const addons = hydrateAddons(pack.addons as unknown as string | PackAddonEntry[]);
  return {
    ...pack,
    author_name: decodeHtmlEntities(pack.author_name),
    title: decodeHtmlEntities(pack.title),
    description: decodeHtmlEntities(pack.description),
    tags: pack.tags.map(decodeHtmlEntities),
    addons: addons.map((a) => ({
      ...a,
      name: decodeHtmlEntities(a.name),
      note: a.note ? decodeHtmlEntities(a.note) : a.note,
    })),
  };
}

// ─── ESOUI addon search (proxied via the worker) ────────────────────────────

export interface EsouiAddonSearchResult {
  id: number;
  title: string;
  author: string;
  category: string;
  downloads: string;
}

export async function searchEsouiAddons(query: string): Promise<EsouiAddonSearchResult[]> {
  if (!query || query.trim().length < 2) return [];
  const params = new URLSearchParams({ q: query.trim() });
  const data = await request<{ results: EsouiAddonSearchResult[] }>(
    `/search-addons?${params.toString()}`,
  );
  return data.results;
}

// ─── Pack Hub CRUD ───────────────────────────────────────────────────────────

export const packHubApi = {
  async list(opts: {
    packType?: string;
    tag?: string;
    sort?: SortOrder;
    page?: number;
    token?: string;
    signal?: AbortSignal;
  }): Promise<ListPacksResponse> {
    const params = new URLSearchParams();
    if (opts.packType) params.set('type', opts.packType);
    if (opts.tag) params.set('tag', opts.tag);
    if (opts.sort) params.set('sort', opts.sort);
    if (opts.page) params.set('page', String(opts.page));
    const qs = params.toString() ? `?${params.toString()}` : '';
    const data = await request<ListPacksResponse>(`/packs${qs}`, {}, opts.token, opts.signal);
    return { ...data, packs: data.packs.map(hydratePack) };
  },

  async get(id: string, token?: string): Promise<SinglePackResponse> {
    const data = await request<SinglePackResponse>(`/packs/${id}`, {}, token);
    return { pack: hydratePack(data.pack) };
  },

  async create(data: PublishPackPayload, token: string): Promise<SinglePackResponse> {
    const res = await request<SinglePackResponse>(
      '/packs',
      { method: 'POST', body: JSON.stringify(data) },
      token,
    );
    return { pack: hydratePack(res.pack) };
  },

  async update(id: string, data: PublishPackPayload, token: string): Promise<SinglePackResponse> {
    const res = await request<SinglePackResponse>(
      `/packs/${id}`,
      { method: 'PUT', body: JSON.stringify(data) },
      token,
    );
    return { pack: hydratePack(res.pack) };
  },

  delete(id: string, token: string): Promise<{ ok: boolean }> {
    return request<{ ok: boolean }>(`/packs/${id}`, { method: 'DELETE' }, token);
  },

  vote(id: string, token: string): Promise<VoteResponse> {
    return request<VoteResponse>(`/packs/${id}/vote`, { method: 'POST' }, token);
  },
};
