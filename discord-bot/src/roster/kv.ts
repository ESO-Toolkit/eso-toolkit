/**
 * KV storage helpers for roster ↔ Discord mappings and guild config.
 *
 * Key schema:
 *   roster-map:{guildId}:{rosterId}  → JSON RosterMapping
 *   guild-config:{guildId}           → JSON GuildConfig
 *   channel-roster:{channelId}       → "{guildId}:{rosterId}" (reverse lookup)
 */

import type { Env } from '../types.js';
import type { GuildConfig, RosterMapping } from './types.js';

// ── KV Key Prefixes ────────────────────────────────────────────────────────

export const KV_PREFIX = {
  ROSTER_MAP: 'roster-map',
  CHANNEL_ROSTER: 'channel-roster',
  GUILD_CONFIG: 'guild-config',
  ROSTER_DATA: 'roster-data',
} as const;

// ── Roster Mapping CRUD ─────────────────────────────────────────────────────

function mappingKey(guildId: string, rosterId: string): string {
  return `${KV_PREFIX.ROSTER_MAP}:${guildId}:${rosterId}`;
}

function reverseKey(channelId: string): string {
  return `${KV_PREFIX.CHANNEL_ROSTER}:${channelId}`;
}

export async function getMappingByRosterId(
  env: Env,
  guildId: string,
  rosterId: string,
): Promise<RosterMapping | null> {
  const raw = await env.ROSTERS.get(mappingKey(guildId, rosterId));
  if (raw === null) return null;
  try {
    return JSON.parse(raw) as RosterMapping;
  } catch {
    console.error(`[roster-kv] failed to parse mapping for ${guildId}:${rosterId}`);
    return null;
  }
}

export async function getMappingByChannelId(
  env: Env,
  channelId: string,
): Promise<RosterMapping | null> {
  const ref = await env.ROSTERS.get(reverseKey(channelId));
  if (!ref) return null;
  const idx = ref.indexOf(':');
  if (idx === -1) return null;
  const guildId = ref.slice(0, idx);
  const rosterId = ref.slice(idx + 1);
  if (!guildId || !rosterId) return null;
  return getMappingByRosterId(env, guildId, rosterId);
}

export async function upsertMapping(env: Env, mapping: RosterMapping): Promise<void> {
  const json = JSON.stringify(mapping);
  await Promise.all([
    env.ROSTERS.put(mappingKey(mapping.guildId, mapping.rosterId), json),
    env.ROSTERS.put(reverseKey(mapping.channelId), `${mapping.guildId}:${mapping.rosterId}`),
  ]);
}

export async function deleteMappingForRoster(
  env: Env,
  guildId: string,
  rosterId: string,
): Promise<void> {
  const existing = await getMappingByRosterId(env, guildId, rosterId);
  await env.ROSTERS.delete(mappingKey(guildId, rosterId));
  if (existing) {
    await env.ROSTERS.delete(reverseKey(existing.channelId));
  }
}

// ── All Mappings for a Guild (list by prefix) ───────────────────────────────

export async function listMappingsForGuild(
  env: Env,
  guildId: string,
): Promise<RosterMapping[]> {
  return listMappingsByPrefix(env, `${KV_PREFIX.ROSTER_MAP}:${guildId}:`);
}

// ── Find all mappings for a specific roster across guilds ──────────────────

/**
 * Find all guild mappings for a given rosterId.
 * Since KV doesn't support suffix-based queries, we scan the global prefix
 * and filter by rosterId. This is efficient because roster-map keys contain
 * the rosterId as the final segment: `roster-map:{guildId}:{rosterId}`.
 */
export async function findMappingsForRoster(
  env: Env,
  rosterId: string,
): Promise<RosterMapping[]> {
  // KV list doesn't support suffix matching, but we can list all roster-map keys
  // and filter. For most deployments this is a small set (<100 mappings total).
  return listMappingsByPrefix(env, `${KV_PREFIX.ROSTER_MAP}:`, (key) => key.endsWith(`:${rosterId}`));
}

// ── Shared listing helper ──────────────────────────────────────────────────

async function listMappingsByPrefix(
  env: Env,
  prefix: string,
  keyFilter?: (key: string) => boolean,
): Promise<RosterMapping[]> {
  const mappings: RosterMapping[] = [];
  let cursor: string | null = null;

  do {
    const opts: KVNamespaceListOptions = { prefix, limit: 100 };
    if (cursor) opts.cursor = cursor;
    const list = await env.ROSTERS.list(opts);
    const keys = keyFilter ? list.keys.filter((k) => keyFilter(k.name)) : list.keys;

    // Batch-fetch values (avoids N+1 by reading all at once)
    const values = await Promise.all(keys.map((k) => env.ROSTERS.get(k.name)));
    for (const raw of values) {
      if (raw) {
        try {
          mappings.push(JSON.parse(raw) as RosterMapping);
        } catch {
          // skip corrupt entries
        }
      }
    }

    cursor = list.list_complete ? null : (list.cursor ?? null);
  } while (cursor);

  return mappings;
}

// ── Guild Config CRUD ───────────────────────────────────────────────────────

function guildConfigKey(guildId: string): string {
  return `${KV_PREFIX.GUILD_CONFIG}:${guildId}`;
}

export async function getGuildConfig(env: Env, guildId: string): Promise<GuildConfig | null> {
  const raw = await env.ROSTERS.get(guildConfigKey(guildId));
  if (raw === null) return null;
  try {
    return JSON.parse(raw) as GuildConfig;
  } catch {
    console.error(`[roster-kv] failed to parse guild config for ${guildId}`);
    return null;
  }
}

export async function upsertGuildConfig(env: Env, config: GuildConfig): Promise<void> {
  await env.ROSTERS.put(guildConfigKey(config.guildId), JSON.stringify(config));
}

// ── Default Config ──────────────────────────────────────────────────────────

export const DEFAULT_NAME_PATTERN = '{label}';

export function getDefaultGuildConfig(guildId: string): GuildConfig {
  return {
    guildId,
    namePattern: DEFAULT_NAME_PATTERN,
  };
}
