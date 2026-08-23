/**
 * Compatibility client for the add-on-pack selector used by roster publishing.
 *
 * Packs are served by the same roster-hub-api Worker as the Pack Hub. This
 * module delegates to the canonical client instead of silently sending
 * production requests to a local Wrangler port when an optional API override
 * is absent.
 */

import { packHubApi } from '../../pack-hub/api/pack-hub-api';
import type { HubPack, PublishPackPayload } from '../../pack-hub/types/pack-hub.types';

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

function toLegacyPack(pack: HubPack): Pack {
  return {
    id: pack.id,
    name: pack.title,
    description: pack.description,
    type: pack.pack_type,
    tags: pack.tags,
    metadata: {
      createdBy: pack.author_name,
      createdAt: pack.created_at,
      updatedAt: pack.updated_at,
      version: 1,
    },
    addons: pack.addons,
  };
}

function toLegacyIndexItem(pack: HubPack): PackIndexItem {
  return {
    id: pack.id,
    name: pack.title,
    description: pack.description,
    type: pack.pack_type,
    tags: pack.tags,
    addonCount: pack.addons.length,
    // Build/roster references are not part of the roster-hub-api pack model.
    buildCount: 0,
    rosterCount: 0,
    updatedAt: pack.updated_at,
  };
}

export const packsApi = {
  /** List packs with optional filters. */
  list: async (params?: { type?: string; tag?: string; q?: string }) => {
    const { packs } = await packHubApi.list({
      packType: params?.type,
      tag: params?.tag,
      sort: 'recent',
      page: 1,
    });
    const query = params?.q?.trim().toLocaleLowerCase();
    const filtered = query
      ? packs.filter(
          (pack) =>
            pack.title.toLocaleLowerCase().includes(query) ||
            pack.description.toLocaleLowerCase().includes(query) ||
            pack.tags.some((tag) => tag.toLocaleLowerCase().includes(query)),
        )
      : packs;
    return { items: filtered.map(toLegacyIndexItem) };
  },

  /** Get a single pack by ID. */
  get: async (id: string) => {
    const { pack } = await packHubApi.get(id);
    return toLegacyPack(pack);
  },

  /** Create a pack through the roster-hub-api OAuth endpoint. */
  create: async (pack: Pack, token: string) => {
    const payload: PublishPackPayload = {
      title: pack.name,
      description: pack.description,
      pack_type: pack.type,
      addons: pack.addons,
      tags: pack.tags,
    };
    const { pack: created } = await packHubApi.create(payload, token);
    return toLegacyPack(created);
  },

  /** Update a pack through the roster-hub-api OAuth endpoint. */
  update: async (id: string, pack: Pack, token: string) => {
    const payload: PublishPackPayload = {
      title: pack.name,
      description: pack.description,
      pack_type: pack.type,
      addons: pack.addons,
      tags: pack.tags,
    };
    const { pack: updated } = await packHubApi.update(id, payload, token);
    return toLegacyPack(updated);
  },
};

export const KALPA_DOWNLOAD_URL = 'https://github.com/ESO-Toolkit/kalpa';

/**
 * Generate a deep link URL that opens Kalpa (ESO Addon Manager)
 * and navigates to a specific pack.
 *
 * Kalpa registers the `kalpa://` protocol scheme via Tauri's deep-link plugin.
 * Supported paths: `kalpa://pack/{id}`, `kalpa://install-pack/{id}`, `kalpa://share/{code}`
 */
export function getAddonManagerDeepLink(packId: string): string {
  return `kalpa://pack/${packId}`;
}

/**
 * Attempt to launch a deep-link URI without triggering the OS "open with" dialog.
 *
 * Uses a hidden iframe to silently probe the protocol handler. If the handler
 * is registered and the app opens (page loses visibility), the attempt is
 * considered successful and the fallback is skipped. Otherwise `onFallback`
 * fires after `timeoutMs` so the caller can show a download prompt.
 *
 * @returns A cancel function to abort the pending fallback (for unmount cleanup).
 */
export function tryLaunchDeepLink(
  uri: string,
  onFallback: () => void,
  timeoutMs = 1500,
): () => void {
  let cancelled = false;
  let timer: ReturnType<typeof setTimeout> | undefined;
  let iframe: HTMLIFrameElement | undefined;

  const cleanup = (): void => {
    cancelled = true;
    if (timer != null) clearTimeout(timer);
    if (iframe?.parentNode) iframe.parentNode.removeChild(iframe);
    document.removeEventListener('visibilitychange', onVisChange);
  };

  const onVisChange = (): void => {
    // The protocol handler stole focus — Kalpa opened successfully.
    if (document.hidden && !cancelled) cleanup();
  };

  document.addEventListener('visibilitychange', onVisChange);

  // Probe via hidden iframe — fails silently when the protocol is unregistered,
  // avoiding the OS "how do you want to open this?" dialog.
  iframe = document.createElement('iframe');
  iframe.style.display = 'none';
  iframe.src = uri;
  document.body.appendChild(iframe);

  timer = setTimeout(() => {
    if (!cancelled) {
      cleanup();
      onFallback();
    }
  }, timeoutMs);

  return cleanup;
}
