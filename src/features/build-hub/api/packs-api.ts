/**
 * Packs API client — talks to the eso-packs-worker (VITE_PACKS_API_URL).
 *
 * NOTE: This is separate from pack-hub-api.ts which talks to the roster-hub-api
 * worker (VITE_ROSTER_HUB_API_URL). The two backends serve different pack
 * scopes: this one serves build-hub packs, pack-hub-api serves roster-hub packs.
 * Both expose /packs endpoints but are distinct data stores.
 */

const PACKS_API_URL = (import.meta.env.VITE_PACKS_API_URL || 'http://localhost:8787').replace(
  /\/+$/,
  '',
);

export interface PackAddonEntry {
  esouiId: number;
  name: string;
  required?: boolean;
  note?: string;
}

export interface BuildReference {
  buildHubId: string;
  title: string;
  esoClass?: string;
  role?: string;
}

export interface RosterReference {
  rosterHubId: string;
  title: string;
  trialId?: string;
}

export interface PackMetadata {
  createdBy: string;
  createdAt: string;
  updatedAt: string;
  originUrl?: string;
  version: number;
}

export type PackType = 'addon-pack' | 'build-pack' | 'roster-pack';

export interface Pack {
  id: string;
  name: string;
  description: string;
  type: PackType;
  tags: string[];
  metadata: PackMetadata;
  addons: PackAddonEntry[];
  builds?: BuildReference[];
  rosters?: RosterReference[];
}

export interface PackIndexItem {
  id: string;
  name: string;
  description: string;
  type: PackType;
  tags: string[];
  addonCount: number;
  buildCount: number;
  rosterCount: number;
  updatedAt: string;
}

async function apiFetch<T>(path: string, options: RequestInit = {}): Promise<T> {
  const res = await fetch(`${PACKS_API_URL}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error((body as { error?: string }).error ?? `HTTP ${res.status}`);
  }
  return res.json() as Promise<T>;
}

export const packsApi = {
  /** List packs with optional filters. */
  list: (params?: { type?: string; tag?: string; q?: string }) => {
    const sp = new URLSearchParams();
    if (params?.type) sp.set('type', params.type);
    if (params?.tag) sp.set('tag', params.tag);
    if (params?.q) sp.set('q', params.q);
    const qs = sp.toString();
    return apiFetch<{ items: PackIndexItem[] }>(`/packs${qs ? `?${qs}` : ''}`);
  },

  /** Get a single pack by ID. */
  get: (id: string) => apiFetch<Pack>(`/packs/${id}`),

  /** Create a new pack (requires admin API key). */
  create: (pack: Pack, apiKey: string) =>
    apiFetch<Pack>('/packs', {
      method: 'POST',
      headers: { 'X-API-Key': apiKey },
      body: JSON.stringify(pack),
    }),

  /** Update an existing pack (requires admin API key). */
  update: (id: string, pack: Pack, apiKey: string) =>
    apiFetch<Pack>(`/packs/${id}`, {
      method: 'PUT',
      headers: { 'X-API-Key': apiKey },
      body: JSON.stringify(pack),
    }),
};

export interface DeepLinkOptions {
  /** When true, tells the addon manager to skip addons already installed and preserve their settings. */
  preserveSettings?: boolean;
}

/**
 * Generate a deep link URL that opens Kalpa (ESO Addon Manager)
 * and installs a specific pack.
 *
 * Usage: `eso-addon-manager://pack/trial-essentials?preserve_settings=true`
 */
export function getAddonManagerDeepLink(packId: string, options: DeepLinkOptions = {}): string {
  const { preserveSettings = true } = options;
  const params = new URLSearchParams();
  if (preserveSettings) params.set('preserve_settings', 'true');
  const qs = params.toString();
  return `eso-addon-manager://pack/${packId}${qs ? `?${qs}` : ''}`;
}
