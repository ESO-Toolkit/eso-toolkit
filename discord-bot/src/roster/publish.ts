/**
 * Core roster publish and refresh logic.
 *
 * Shared between the HTTP endpoints and slash commands.
 * Handles channel creation/update, embed posting/editing, and mapping persistence.
 */

import {
  createChannel,
  deleteChannel,
  deleteMessage,
  sendMessage,
  editMessage,
  getGuildChannels,
} from '../discord.js';
import { ChannelType } from '../types.js';
import type { DiscordComponent, Env } from '../types.js';
import { fetchRosterSnapshot } from './api.js';
import { resolveChannelName } from './channel-name.js';
import { decodeRosterData } from './decoder.js';
import { buildRosterText, splitMessages, buildRosterActionRows } from './embed-builder.js';
import {
  findMappingsForRoster,
  getMappingByRosterId,
  upsertMapping,
  getGuildConfig,
  getDefaultGuildConfig,
  acquirePublishLock,
  releasePublishLock,
  KV_PREFIX,
} from './kv.js';
import type { ChannelNameContext, DecodedRoster, RosterMapping, RosterSnapshot } from './types.js';

// ── Snapshot → Channel Name Context ────────────────────────────────────────

const SHORT_DAYS = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'] as const;

const DEFAULT_TIMEZONE = 'America/New_York';

/** Get the day-of-week and hour for a Date in a specific IANA timezone. */
function getDatePartsInTz(date: Date, tz: string): { dayOfWeek: number; hour: number } {
  const dayFmt = new Intl.DateTimeFormat('en-US', { timeZone: tz, weekday: 'short' });
  const dayStr = dayFmt.format(date).toLowerCase(); // "sun", "mon", etc.
  const dayOfWeek = SHORT_DAYS.indexOf(dayStr as (typeof SHORT_DAYS)[number]);
  const hourFmt = new Intl.DateTimeFormat('en-US', {
    timeZone: tz,
    hour: 'numeric',
    hour12: false,
  });
  const hour = parseInt(hourFmt.format(date), 10);
  return { dayOfWeek: dayOfWeek >= 0 ? dayOfWeek : date.getUTCDay(), hour };
}

function formatTime12h(hour: number): string {
  const suffix = hour >= 12 ? 'pm' : 'am';
  const h = hour % 12 || 12;
  return `${h}${suffix}`;
}

/**
 * Build channel name context from snapshot + decoded roster data.
 * Uses snapshot fields first, falls back to decoded data (e.g. trialId
 * extracted from the compact roster's trialOverrides).
 *
 * If eventTime is provided (ISO 8601), it is used for day/time tokens
 * instead of the current time. Times are formatted in the guild's timezone.
 */
function buildNameContext(
  snapshot: RosterSnapshot,
  decoded: DecodedRoster,
  eventTime?: string,
  timezone?: string,
): ChannelNameContext {
  const ctx: ChannelNameContext = {};
  if (eventTime) {
    const date = new Date(eventTime);
    if (!isNaN(date.getTime())) {
      const tz = timezone || DEFAULT_TIMEZONE;
      const { dayOfWeek, hour } = getDatePartsInTz(date, tz);
      ctx.dayShort = SHORT_DAYS[dayOfWeek];
      ctx.time = formatTime12h(hour);
    }
  }
  const trial = snapshot.trial_id || decoded.trialId;
  if (trial) ctx.trial = trial;

  // Extract difficulty from tags ('vet' → 'veteran', 'normal' → 'normal')
  const tags = snapshot.tags.map((t) => t.toLowerCase());
  if (tags.includes('vet') || tags.includes('veteran')) {
    ctx.difficulty = 'veteran';
  } else if (tags.includes('normal')) {
    ctx.difficulty = 'normal';
  }

  // Non-difficulty tags get appended to the channel name (e.g. hm, score-push)
  const extraTags = snapshot.tags.filter(
    (t) => !['vet', 'veteran', 'normal'].includes(t.toLowerCase()),
  );
  if (extraTags.length > 0) {
    ctx.extraTags = extraTags;
    // Legacy: first extra tag also populates {tag} for old stored patterns
    ctx.tag = extraTags[0];
  }

  return ctx;
}

// ── Auto-detect "Open Runs" category ──────────────────────────────────────

const OPEN_RUNS_RE = /open\s*runs/i;

/**
 * If no category is configured, scan the guild's channels for a category
 * whose name contains "open runs" (case-insensitive) and return its ID.
 */
async function detectOpenRunsCategory(env: Env, guildId: string): Promise<string | undefined> {
  try {
    const channels = await getGuildChannels(env, guildId);
    // type 4 = GUILD_CATEGORY
    const match = channels.find((c) => c.type === 4 && OPEN_RUNS_RE.test(c.name));
    return match?.id;
  } catch (err) {
    console.warn('[publish] failed to auto-detect category:', err);
    return undefined;
  }
}

// ── Publish Request/Response ────────────────────────────────────────────────

export interface PublishRequest {
  guildId: string;
  rosterId: string;
  categoryId?: string | undefined;
  channelNameOverride?: string | undefined;
  ownerUserId?: string | undefined;
  /** ISO 8601 event date/time — used for channel name tokens and Discord timestamp in embed */
  eventTime?: string | undefined;
}

export interface PublishResult {
  ok: boolean;
  channelId?: string | undefined;
  channelName?: string | undefined;
  messageId?: string | undefined;
  error?: string | undefined;
}

// ── Core Publish ────────────────────────────────────────────────────────────

export async function publishRoster(env: Env, req: PublishRequest): Promise<PublishResult> {
  // 0. Acquire publish lock to prevent concurrent channel creation
  const locked = await acquirePublishLock(env, req.guildId, req.rosterId);
  if (!locked) {
    return { ok: false, error: 'A publish is already in progress for this roster. Please wait.' };
  }

  try {
    return await doPublishRoster(env, req);
  } finally {
    await releasePublishLock(env, req.guildId, req.rosterId);
  }
}

async function doPublishRoster(env: Env, req: PublishRequest): Promise<PublishResult> {
  // 1. Fetch roster snapshot
  const result = await fetchRosterSnapshot(env, req.rosterId);
  if (result.status === 'not_found') {
    return { ok: false, error: 'Roster not found.' };
  }
  if (result.status === 'error') {
    return { ok: false, error: 'Roster API unavailable. Please try again later.' };
  }
  const snapshot = result.snapshot;

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
    buildNameContext(snapshot, decoded, req.eventTime, config.timezone),
    req.channelNameOverride,
  );

  // 4. Check for existing mapping
  const existing = await getMappingByRosterId(env, req.guildId, req.rosterId);
  const categoryId =
    req.categoryId ?? config.defaultCategoryId ?? (await detectOpenRunsCategory(env, req.guildId));

  let channelId: string;
  let messageId: string;

  if (existing) {
    // Update existing channel + message
    const refreshed = await refreshExistingMapping(
      env,
      existing,
      snapshot,
      decoded,
      channelName,
      categoryId,
      req.eventTime,
    );
    if (!refreshed.ok) return refreshed;
    channelId = refreshed.channelId!;
    messageId = refreshed.messageId!;
  } else {
    // Create new channel + message
    const created = await createNewRosterChannel(
      env,
      req.guildId,
      channelName,
      categoryId,
      snapshot,
      decoded,
      req.eventTime,
    );
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

  return { ok: true, channelId, channelName, messageId };
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
export async function refreshRoster(
  env: Env,
  rosterId: string,
  scopeGuildId?: string,
): Promise<RefreshResult> {
  // Fetch the latest snapshot — hub API for normal IDs, KV for direct-publish
  const fetchResult = await fetchRosterSnapshot(env, rosterId);
  let snapshot = fetchResult.status === 'ok' ? fetchResult.snapshot : null;

  if (!snapshot && rosterId.startsWith('direct-')) {
    // Direct-publish rosters live in KV, not the hub API
    const kvData = await env.ROSTERS.get(`${KV_PREFIX.ROSTER_DATA}:${rosterId}`);
    if (kvData) {
      // Reconstruct a minimal snapshot — find any mapping for this roster
      const mappings = await findMappingsForRoster(env, rosterId);
      const mapping = mappings[0] ?? null;
      snapshot = {
        id: rosterId,
        title: mapping?.channelNameOverride ?? 'Direct Roster',
        description: '',
        trial_id: '',
        author_name: 'Unknown',
        roster_data: kvData,
        tags: [],
        vote_count: 0,
        created_at: mapping?.createdAt ?? new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
    }
  }

  if (!snapshot) {
    if (fetchResult.status === 'error') {
      return { ok: false, error: 'Roster API unavailable. Please try again later.' };
    }
    return { ok: false, error: 'Roster not found.' };
  }

  let decoded;
  try {
    decoded = await decodeRosterData(snapshot.roster_data);
  } catch (err) {
    console.error('[refresh] decode error:', err);
    return { ok: false, error: 'Failed to decode roster data.' };
  }

  // Find all guilds that have this roster mapped by scanning KV prefix.
  // For direct-publish rosters with a known guild, check that guild first.
  // For hub rosters, scan all roster-map entries matching this rosterId.
  let mappings = await findMappingsForRoster(env, rosterId);
  if (scopeGuildId) {
    mappings = mappings.filter((m) => m.guildId === scopeGuildId);
  }
  if (mappings.length === 0) {
    return { ok: true, refreshedCount: 0 };
  }

  let refreshedCount = 0;
  let lastError: string | undefined;

  for (const mapping of mappings) {
    const config =
      (await getGuildConfig(env, mapping.guildId)) ?? getDefaultGuildConfig(mapping.guildId);
    const channelName = resolveChannelName(
      config.namePattern,
      buildNameContext(snapshot, decoded, undefined, config.timezone),
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
      const updated: RosterMapping = {
        ...mapping,
        messageId: result.messageId ?? mapping.messageId,
        channelId: result.channelId ?? mapping.channelId,
        updatedAt: new Date().toISOString(),
      };
      await upsertMapping(env, updated);
      refreshedCount++;
    } else {
      lastError = result.error;
    }
  }

  return {
    ok: refreshedCount > 0 || lastError === undefined,
    error: lastError,
    refreshedCount,
  };
}

// ── Direct Publish (from raw roster data, no Hub ID needed) ─────────────────

export interface DirectPublishRequest {
  guildId: string;
  title: string;
  description?: string | undefined;
  trial_id?: string | undefined;
  tags?: string[] | undefined;
  roster_data: string;
  author_name?: string | undefined;
  channelNameOverride?: string | undefined;
  categoryId?: string | undefined;
  ownerUserId?: string | undefined;
  /** ISO 8601 event date/time — used for channel name tokens and Discord timestamp in embed */
  eventTime?: string | undefined;
}

/**
 * Publish a roster directly from raw data (e.g. from the roster builder).
 * Does not require the roster to exist on the Hub — builds a synthetic
 * snapshot from the provided fields.
 */
export async function publishDirect(env: Env, req: DirectPublishRequest): Promise<PublishResult> {
  // Build a synthetic snapshot from the raw data
  const rand = crypto.getRandomValues(new Uint8Array(4));
  const suffix = Array.from(rand)
    .map((b) => b.toString(36))
    .join('')
    .slice(0, 6);
  const syntheticId = `direct-${Date.now().toString(36)}-${suffix}`;

  // Acquire lock using the synthetic ID (unique, so no contention here —
  // but guards against rapid double-clicks sending the same request twice)
  const locked = await acquirePublishLock(env, req.guildId, syntheticId);
  if (!locked) {
    return { ok: false, error: 'A publish is already in progress. Please wait.' };
  }

  try {
    return await doPublishDirect(env, req, syntheticId);
  } finally {
    await releasePublishLock(env, req.guildId, syntheticId);
  }
}

async function doPublishDirect(
  env: Env,
  req: DirectPublishRequest,
  syntheticId: string,
): Promise<PublishResult> {
  const DIRECT_TTL = 60 * 60 * 24 * 90; // 90 days

  const snapshot: RosterSnapshot = {
    id: syntheticId,
    title: req.title,
    description: req.description ?? '',
    trial_id: req.trial_id ?? '',
    author_name: req.author_name ?? 'Unknown',
    roster_data: req.roster_data,
    tags: req.tags ?? [],
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
    buildNameContext(snapshot, decoded, req.eventTime, config.timezone),
    req.channelNameOverride,
  );
  const categoryId =
    req.categoryId ?? config.defaultCategoryId ?? (await detectOpenRunsCategory(env, req.guildId));

  const result = await createNewRosterChannel(
    env,
    req.guildId,
    channelName,
    categoryId,
    snapshot,
    decoded,
    req.eventTime,
  );

  if (!result.ok) return result;

  // Persist mapping with same TTL as roster data so they expire together
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
  await upsertMapping(env, mapping, DIRECT_TTL);

  // Persist roster data so the "View on ESO Toolkit" link can resolve direct-* IDs
  await env.ROSTERS.put(`${KV_PREFIX.ROSTER_DATA}:${syntheticId}`, req.roster_data, {
    expirationTtl: DIRECT_TTL,
  });

  return { ok: true, channelId: result.channelId, channelName, messageId: result.messageId };
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
  eventTime?: string,
): Promise<InternalRefreshResult> {
  const text = buildRosterText(snapshot, decoded, eventTime);
  const chunks = splitMessages(text);
  const components = buildRosterActionRows(snapshot.id);
  const oldMessageIds = mapping.messageId.split(',');

  // If chunk count matches, try editing in-place
  if (chunks.length === oldMessageIds.length) {
    try {
      for (let i = 0; i < chunks.length; i++) {
        const isLast = i === chunks.length - 1;
        await editMessage(env, mapping.channelId, oldMessageIds[i], {
          content: chunks[i],
          ...(isLast ? { components } : {}),
        });
      }
      return { ok: true, channelId: mapping.channelId, messageId: mapping.messageId };
    } catch (err) {
      console.warn('[refresh] edit failed, will delete and re-post:', err);
    }
  }

  // Delete old messages, then re-post fresh
  for (const id of oldMessageIds) {
    try {
      await deleteMessage(env, mapping.channelId, id);
    } catch {
      // Message may already be deleted — ignore
    }
  }

  try {
    const messageIds = await sendRosterMessages(env, mapping.channelId, chunks, components);
    return { ok: true, channelId: mapping.channelId, messageId: messageIds };
  } catch (err) {
    console.warn('[refresh] re-post to existing channel failed, recreating:', err);
  }

  // Channel was deleted — recreate
  try {
    const result = await createNewRosterChannel(
      env,
      mapping.guildId,
      channelName,
      categoryId,
      snapshot,
      decoded,
      eventTime,
    );
    return result;
  } catch (err) {
    console.error('[refresh] recreate failed:', err);
    return { ok: false, error: 'Failed to recreate channel/message.' };
  }
}

// ── Send roster as raw text messages ────────────────────────────────────────

/**
 * Send roster text as one or more messages. Action rows go on the last message.
 * Returns comma-separated message IDs for storage in the mapping.
 */
async function sendRosterMessages(
  env: Env,
  channelId: string,
  chunks: string[],
  components: DiscordComponent[],
): Promise<string> {
  const ids: string[] = [];
  for (let i = 0; i < chunks.length; i++) {
    const isLast = i === chunks.length - 1;
    const msg = await sendMessage(env, channelId, {
      content: chunks[i],
      ...(isLast ? { components } : {}),
    });
    ids.push(msg.id);
  }
  return ids.join(',');
}

// ── Create a new channel + post roster ──────────────────────────────────────

async function createNewRosterChannel(
  env: Env,
  guildId: string,
  channelName: string,
  categoryId: string | undefined,
  snapshot: RosterSnapshot,
  decoded: Awaited<ReturnType<typeof decodeRosterData>>,
  eventTime?: string,
): Promise<InternalRefreshResult> {
  const channelOptions: Parameters<typeof createChannel>[2] = {
    name: channelName,
    type: ChannelType.GUILD_TEXT,
    topic:
      `ESO Toolkit Roster: ${snapshot.title.replace(/<@[!&]?\d+>|<#\d+>|@everyone|@here/g, '')} (ID: ${snapshot.id})`.slice(
        0,
        1024,
      ),
  };
  if (categoryId) {
    channelOptions.parent_id = categoryId;
  }

  let channel: Awaited<ReturnType<typeof createChannel>>;
  try {
    channel = await createChannel(env, guildId, channelOptions);
  } catch (err) {
    console.error('[publish] create channel failed:', err);
    return { ok: false, error: 'Failed to create Discord channel. Please try again.' };
  }

  try {
    const text = buildRosterText(snapshot, decoded, eventTime);
    const chunks = splitMessages(text);
    const components = buildRosterActionRows(snapshot.id);
    const messageIds = await sendRosterMessages(env, channel.id, chunks, components);

    return { ok: true, channelId: channel.id, messageId: messageIds };
  } catch (err) {
    console.error('[publish] send message failed, cleaning up orphaned channel:', err);
    try {
      await deleteChannel(env, channel.id);
    } catch (cleanupErr) {
      console.error('[publish] failed to clean up orphaned channel:', cleanupErr);
    }
    return { ok: false, error: 'Failed to post roster message. Please try again.' };
  }
}
