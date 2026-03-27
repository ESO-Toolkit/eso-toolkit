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

// ── Roster Mapping CRUD ─────────────────────────────────────────────────────

function mappingKey(guildId: string, rosterId: string): string {
  return `roster-map:${guildId}:${rosterId}`;
}

function reverseKey(channelId: string): string {
  return `channel-roster:${channelId}`;
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
  const [guildId, rosterId] = ref.split(':');
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
  const prefix = `roster-map:${guildId}:`;
  const list = await env.ROSTERS.list({ prefix });
  const mappings: RosterMapping[] = [];
  for (const key of list.keys) {
    const raw = await env.ROSTERS.get(key.name);
    if (raw) {
      try {
        mappings.push(JSON.parse(raw) as RosterMapping);
      } catch {
        // skip corrupt entries
      }
    }
  }
  return mappings;
}

// ── Guild Config CRUD ───────────────────────────────────────────────────────

function guildConfigKey(guildId: string): string {
  return `guild-config:${guildId}`;
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
