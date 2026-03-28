/**
 * Core roster publish and refresh logic.
 *
 * Shared between the HTTP endpoints and slash commands.
 * Handles channel creation/update, embed posting/editing, and mapping persistence.
 */

import {
  createChannel,
  sendMessage,
  editMessage,
} from '../discord.js';
import { ChannelType } from '../types.js';
import type { Env } from '../types.js';
import { fetchRosterSnapshot } from './api.js';
import { resolveChannelName } from './channel-name.js';
import { decodeRosterData } from './decoder.js';
import { buildRosterEmbed, buildRosterActionRows } from './embed-builder.js';
import {
  getMappingByRosterId,
  upsertMapping,
  getGuildConfig,
  getDefaultGuildConfig,
} from './kv.js';
import type { RosterMapping, RosterSnapshot } from './types.js';

// ── Publish Request/Response ────────────────────────────────────────────────

export interface PublishRequest {
  guildId: string;
  rosterId: string;
  categoryId?: string | undefined;
  channelNameOverride?: string | undefined;
  ownerUserId?: string | undefined;
}

export interface PublishResult {
  ok: boolean;
  channelId?: string | undefined;
  messageId?: string | undefined;
  error?: string | undefined;
}

// ── Core Publish ────────────────────────────────────────────────────────────

export async function publishRoster(env: Env, req: PublishRequest): Promise<PublishResult> {
  // 1. Fetch roster snapshot
  const snapshot = await fetchRosterSnapshot(env, req.rosterId);
  if (!snapshot) {
    return { ok: false, error: 'Roster not found or API unavailable.' };
  }

  // 2. Decode roster data for embed
  let decoded;
  try {
    decoded = await decodeRosterData(snapshot.roster_data);
  } catch (err) {
    console.error('[publish] decode error:', err);
    return { ok: false, error: 'Failed to decode roster data.' };
  }

  // 3. Resolve channel name
  const config = (await getGuildConfig(env, req.guildId)) ?? getDefaultGuildConfig(req.guildId);
  const channelName = resolveChannelName(
    config.namePattern,
    { label: snapshot.title },
    req.channelNameOverride,
  );

  // 4. Check for existing mapping
  const existing = await getMappingByRosterId(env, req.guildId, req.rosterId);
  const categoryId = req.categoryId ?? config.defaultCategoryId;

  let channelId: string;
  let messageId: string;

  if (existing) {
    // Update existing channel + message
    const refreshed = await refreshExistingMapping(env, existing, snapshot, decoded, channelName, categoryId);
    if (!refreshed.ok) return refreshed;
    channelId = refreshed.channelId!;
    messageId = refreshed.messageId!;
  } else {
    // Create new channel + message
    const created = await createNewRosterChannel(env, req.guildId, channelName, categoryId, snapshot, decoded);
    if (!created.ok) return created;
    channelId = created.channelId!;
    messageId = created.messageId!;
  }

  // 5. Persist mapping
  const now = new Date().toISOString();
  const mapping: RosterMapping = {
    rosterId: req.rosterId,
    guildId: req.guildId,
    channelId,
    messageId,
    categoryId,
    channelNameOverride: req.channelNameOverride,
    ownerUserId: req.ownerUserId ?? '',
    createdAt: existing?.createdAt ?? now,
    updatedAt: now,
  };
  await upsertMapping(env, mapping);

  return { ok: true, channelId, messageId };
}

// ── Core Refresh ────────────────────────────────────────────────────────────

export interface RefreshResult {
  ok: boolean;
  error?: string | undefined;
  refreshedCount?: number | undefined;
}

/**
 * Refresh all Discord channels linked to a roster across all guilds.
 * Called by the webhook from roster-hub-api and by /roster refresh.
 */
export async function refreshRoster(env: Env, rosterId: string): Promise<RefreshResult> {
  // Fetch the latest snapshot
  const snapshot = await fetchRosterSnapshot(env, rosterId);
  if (!snapshot) {
    return { ok: false, error: 'Roster not found or API unavailable.' };
  }

  let decoded;
  try {
    decoded = await decodeRosterData(snapshot.roster_data);
  } catch (err) {
    console.error('[refresh] decode error:', err);
    return { ok: false, error: 'Failed to decode roster data.' };
  }

  // We need to find all guilds that have this roster mapped.
  // Since KV doesn't support cross-prefix queries efficiently,
  // we check the guild that the bot is configured for (single-guild for now).
  const guildId = env.GUILD_ID;
  const mapping = await getMappingByRosterId(env, guildId, rosterId);
  if (!mapping) {
    return { ok: true, refreshedCount: 0 };
  }

  const config = (await getGuildConfig(env, guildId)) ?? getDefaultGuildConfig(guildId);
  const channelName = resolveChannelName(
    config.namePattern,
    { label: snapshot.title },
    mapping.channelNameOverride,
  );

  const result = await refreshExistingMapping(
    env,
    mapping,
    snapshot,
    decoded,
    channelName,
    mapping.categoryId,
  );

  if (result.ok) {
    // Update the mapping's updatedAt
    const updated: RosterMapping = {
      ...mapping,
      messageId: result.messageId ?? mapping.messageId,
      channelId: result.channelId ?? mapping.channelId,
      updatedAt: new Date().toISOString(),
    };
    await upsertMapping(env, updated);
  }

  return { ok: result.ok, error: result.error, refreshedCount: result.ok ? 1 : 0 };
}

// ── Direct Publish (from raw roster data, no Hub ID needed) ─────────────────

export interface DirectPublishRequest {
  guildId: string;
  title: string;
  description?: string | undefined;
  trial_id?: string | undefined;
  roster_data: string;
  author_name?: string | undefined;
  channelNameOverride?: string | undefined;
  categoryId?: string | undefined;
  ownerUserId?: string | undefined;
}

/**
 * Publish a roster directly from raw data (e.g. from the roster builder).
 * Does not require the roster to exist on the Hub — builds a synthetic
 * snapshot from the provided fields.
 */
export async function publishDirect(env: Env, req: DirectPublishRequest): Promise<PublishResult> {
  // Build a synthetic snapshot from the raw data
  const syntheticId = `direct-${Date.now().toString(36)}`;
  const snapshot: RosterSnapshot = {
    id: syntheticId,
    title: req.title,
    description: req.description ?? '',
    trial_id: req.trial_id ?? '',
    author_name: req.author_name ?? 'Unknown',
    roster_data: req.roster_data,
    tags: [],
    vote_count: 0,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  let decoded;
  try {
    decoded = await decodeRosterData(snapshot.roster_data);
  } catch (err) {
    console.error('[publish-direct] decode error:', err);
    return { ok: false, error: 'Failed to decode roster data.' };
  }

  const config = (await getGuildConfig(env, req.guildId)) ?? getDefaultGuildConfig(req.guildId);
  const channelName = resolveChannelName(
    config.namePattern,
    { label: req.title },
    req.channelNameOverride,
  );
  const categoryId = req.categoryId ?? config.defaultCategoryId;

  const result = await createNewRosterChannel(
    env,
    req.guildId,
    channelName,
    categoryId,
    snapshot,
    decoded,
  );

  if (!result.ok) return result;

  // Persist mapping so refresh still works
  const now = new Date().toISOString();
  const mapping: RosterMapping = {
    rosterId: syntheticId,
    guildId: req.guildId,
    channelId: result.channelId!,
    messageId: result.messageId!,
    categoryId,
    channelNameOverride: req.channelNameOverride,
    ownerUserId: req.ownerUserId ?? '',
    createdAt: now,
    updatedAt: now,
  };
  await upsertMapping(env, mapping);

  return { ok: true, channelId: result.channelId, messageId: result.messageId };
}

// ── Refresh a single channel for an existing mapping ────────────────────────

interface InternalRefreshResult {
  ok: boolean;
  channelId?: string;
  messageId?: string;
  error?: string;
}

async function refreshExistingMapping(
  env: Env,
  mapping: RosterMapping,
  snapshot: RosterSnapshot,
  decoded: Awaited<ReturnType<typeof decodeRosterData>>,
  channelName: string,
  categoryId?: string,
): Promise<InternalRefreshResult> {
  const embed = buildRosterEmbed(snapshot, decoded);
  const components = buildRosterActionRows(snapshot.id);

  try {
    // Try to edit the existing message
    await editMessage(env, mapping.channelId, mapping.messageId, {
      embeds: [embed],
      components,
    });
    return { ok: true, channelId: mapping.channelId, messageId: mapping.messageId };
  } catch (err) {
    console.warn('[refresh] edit failed, recreating:', err);
  }

  // Channel or message was deleted — recreate
  try {
    const result = await createNewRosterChannel(
      env,
      mapping.guildId,
      channelName,
      categoryId,
      snapshot,
      decoded,
    );
    return result;
  } catch (err) {
    console.error('[refresh] recreate failed:', err);
    return { ok: false, error: 'Failed to recreate channel/message.' };
  }
}

// ── Create a new channel + post embed ───────────────────────────────────────

async function createNewRosterChannel(
  env: Env,
  guildId: string,
  channelName: string,
  categoryId: string | undefined,
  snapshot: RosterSnapshot,
  decoded: Awaited<ReturnType<typeof decodeRosterData>>,
): Promise<InternalRefreshResult> {
  try {
    const channelOptions: Parameters<typeof createChannel>[2] = {
      name: channelName,
      type: ChannelType.GUILD_TEXT,
      topic: `ESO Toolkit Roster: ${snapshot.title} (ID: ${snapshot.id})`,
    };
    if (categoryId) {
      channelOptions.parent_id = categoryId;
    }

    const channel = await createChannel(env, guildId, channelOptions);

    const embed = buildRosterEmbed(snapshot, decoded);
    const components = buildRosterActionRows(snapshot.id);

    const message = await sendMessage(env, channel.id, {
      embeds: [embed],
      components,
    });

    return { ok: true, channelId: channel.id, messageId: message.id };
  } catch (err) {
    console.error('[publish] create channel/message failed:', err);
    return { ok: false, error: `Failed to create Discord channel: ${err}` };
  }
}
