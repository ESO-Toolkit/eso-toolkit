/**
 * Core roster publish and refresh logic.
 *
 * Shared between the HTTP endpoints and slash commands.
 * Handles channel creation/update, embed posting/editing, and mapping persistence.
 */

import {
  DiscordApiError,
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
import {
  buildRosterText,
  splitMessages,
  buildRosterActionRows,
  buildRolePingLine,
} from './embed-builder.js';
import {
  findMappingsForRoster,
  getMappingByRosterId,
  upsertMapping,
  getGuildConfig,
  getDefaultGuildConfig,
  acquirePublishLock,
  renewPublishLock,
  releasePublishLock,
  KV_PREFIX,
} from './kv.js';
import type {
  ChannelNameContext,
  DecodedRoster,
  GuildConfig,
  RosterMapping,
  RosterSnapshot,
} from './types.js';

// ── Snapshot → Channel Name Context ────────────────────────────────────────

const SHORT_DAYS = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'] as const;

const DEFAULT_TIMEZONE = 'America/New_York';

/**
 * TTL for direct-publish KV entries (mapping, roster-data, roster-meta). A
 * refresh re-applies it so an actively-used direct roster keeps a sliding
 * 90-day window and all of its keys expire together.
 */
const DIRECT_TTL = 60 * 60 * 24 * 90; // 90 days

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
      let dayOfWeek: number;
      let hour: number;
      try {
        ({ dayOfWeek, hour } = getDatePartsInTz(date, tz));
      } catch (err) {
        // Guild admins can configure the timezone. If it is mistyped or later
        // becomes invalid in the runtime's ICU data, do not fail publishing for
        // the whole server; fall back to the stable default and log the config
        // problem for follow-up.
        console.warn(
          `[publish] invalid timezone "${tz}", falling back to ${DEFAULT_TIMEZONE}:`,
          err,
        );
        ({ dayOfWeek, hour } = getDatePartsInTz(date, DEFAULT_TIMEZONE));
      }
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

// ── Publish target resolution ───────────────────────────────────────────────

export type PublishTarget = { mode: 'existing'; channelId: string } | { mode: 'create' };

const CHANNEL_SNOWFLAKE = /^\d{17,20}$/;

/**
 * Decide where a roster should be published:
 *   - into the guild's configured default channel (when set to a valid
 *     snowflake) — posting alongside other rosters, no channel created; or
 *   - a freshly created per-roster channel (the default behaviour).
 *
 * Exported for unit testing.
 */
export function resolvePublishTarget(config: GuildConfig): PublishTarget {
  if (config.defaultChannelId && CHANNEL_SNOWFLAKE.test(config.defaultChannelId)) {
    return { mode: 'existing', channelId: config.defaultChannelId };
  }
  return { mode: 'create' };
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

const LOCK_LOST_ERROR = 'The publish lease expired. Please retry.';
const LOCK_HEARTBEAT_MS = 60_000;

interface LeaseHeartbeat {
  assertHeld(): Promise<boolean>;
  stop(): Promise<void>;
}

function startLeaseHeartbeat(
  env: Env,
  guildId: string,
  operationKey: string,
  token: string,
): LeaseHeartbeat {
  let lost = false;
  let renewal: Promise<void> | undefined;
  const renew = (): Promise<void> => {
    if (renewal) return renewal;
    renewal = renewLock(env, guildId, operationKey, token)
      .then((held) => {
        if (!held) lost = true;
      })
      .finally(() => {
        renewal = undefined;
      });
    return renewal;
  };
  const timer = setInterval(() => void renew(), LOCK_HEARTBEAT_MS);
  return {
    async assertHeld() {
      await renewal;
      if (lost) return false;
      await renew();
      return !lost;
    },
    async stop() {
      clearInterval(timer);
      await renewal;
    },
  };
}

async function renewLock(
  env: Env,
  guildId: string,
  operationKey: string,
  token: string,
): Promise<boolean> {
  try {
    return await renewPublishLock(env, guildId, operationKey, token);
  } catch (error) {
    console.error('[publish] failed to renew coordinator lease:', error);
    return false;
  }
}

async function releaseLock(
  env: Env,
  guildId: string,
  operationKey: string,
  token: string,
): Promise<void> {
  try {
    await releasePublishLock(env, guildId, operationKey, token);
  } catch (error) {
    console.error('[publish] failed to release coordinator lease:', error);
  }
}

// ── Core Publish ────────────────────────────────────────────────────────────

export async function publishRoster(env: Env, req: PublishRequest): Promise<PublishResult> {
  // 0. Acquire publish lock to prevent concurrent channel creation
  const token = await acquirePublishLock(env, req.guildId, req.rosterId);
  if (!token) {
    return { ok: false, error: 'A publish is already in progress for this roster. Please wait.' };
  }

  const lease = startLeaseHeartbeat(env, req.guildId, req.rosterId, token);
  try {
    return await doPublishRoster(env, req, lease);
  } finally {
    await lease.stop();
    await releaseLock(env, req.guildId, req.rosterId, token);
  }
}

async function doPublishRoster(
  env: Env,
  req: PublishRequest,
  lease: LeaseHeartbeat,
): Promise<PublishResult> {
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

  // 3. Resolve the existing mapping before rendering so republishes retain
  // their original event time when a request omits it.
  let existing = await getMappingByRosterId(env, req.guildId, req.rosterId);
  const eventTime = req.eventTime ?? existing?.eventTime;
  const config = (await getGuildConfig(env, req.guildId)) ?? getDefaultGuildConfig(req.guildId);
  const channelName = resolveChannelName(
    config.namePattern,
    buildNameContext(snapshot, decoded, eventTime, config.timezone),
    req.channelNameOverride,
  );

  const categoryId =
    req.categoryId ?? config.defaultCategoryId ?? (await detectOpenRunsCategory(env, req.guildId));

  if (!(await lease.assertHeld())) {
    return { ok: false, error: LOCK_LOST_ERROR };
  }

  if (existing?.cleanupPendingMessageIds?.length) {
    const cleanup = await finishPendingMessageCleanup(env, existing);
    if (!cleanup.ok) {
      return { ok: false, error: cleanup.error };
    }
    existing = cleanup.mapping;
  }

  let mutation: InternalRefreshResult;

  if (existing) {
    // Update existing channel + message
    mutation = await refreshExistingMapping(
      env,
      existing,
      snapshot,
      decoded,
      channelName,
      categoryId,
      eventTime,
      true,
      config.defaultChannelId,
    );
    if (!mutation.ok) return mutation;
  } else {
    // Post into the configured default channel, or create a new channel.
    const target = resolvePublishTarget(config);
    mutation =
      target.mode === 'existing'
        ? await postRosterToDefaultChannel(
            env,
            target.channelId,
            snapshot,
            decoded,
            eventTime,
            config.rolePingIds,
          )
        : await createNewRosterChannel(
            env,
            req.guildId,
            channelName,
            categoryId,
            snapshot,
            decoded,
            eventTime,
            config.rolePingIds,
          );
    if (!mutation.ok) return mutation;
  }

  const channelId = mutation.channelId!;
  const messageId = mutation.messageId!;

  if (!(await lease.assertHeld())) {
    await cleanupUncommittedDiscordMutation(env, mutation);
    return { ok: false, error: LOCK_LOST_ERROR };
  }

  // 5. Persist mapping
  const now = new Date().toISOString();
  const mapping: RosterMapping = {
    rosterId: req.rosterId,
    guildId: req.guildId,
    channelId,
    messageId,
    cleanupPendingMessageIds: mutation.cleanupPendingMessageIds,
    categoryId,
    channelNameOverride: req.channelNameOverride,
    eventTime,
    ownerUserId: req.ownerUserId ?? '',
    createdAt: existing?.createdAt ?? now,
    updatedAt: now,
  };
  try {
    await upsertMapping(env, mapping);
  } catch (error) {
    console.error('[publish] failed to persist roster mapping:', error);
    await cleanupUncommittedDiscordMutation(env, mutation);
    return { ok: false, error: 'Failed to save the published roster. Please retry.' };
  }

  // The mapping is committed, so leave its cleanup journal intact if this
  // worker no longer owns the lease. The next owner can resume safely.
  if (!(await lease.assertHeld())) {
    return { ok: false, error: LOCK_LOST_ERROR };
  }

  const cleanup = await finishPendingMessageCleanup(env, mapping);
  if (!cleanup.ok) {
    return { ok: false, error: cleanup.error };
  }

  return { ok: true, channelId, channelName, messageId };
}

// ── Core Refresh ────────────────────────────────────────────────────────────

export interface RefreshResult {
  ok: boolean;
  error?: string | undefined;
  refreshedCount?: number | undefined;
  failedCount?: number | undefined;
}

export interface RefreshOptions {
  /**
   * When a roster's channel/messages are gone, recreate the channel. Defaults
   * to true for user-initiated refreshes. The hub webhook passes false so an
   * automatic re-sync never resurrects a channel staff deliberately deleted.
   */
  allowRecreate?: boolean;
}

export function summarizeRefreshResults(
  refreshedCount: number,
  failures: readonly string[],
): RefreshResult {
  return {
    ok: failures.length === 0,
    error: failures.length > 0 ? failures.join('; ') : undefined,
    refreshedCount,
    failedCount: failures.length,
  };
}

/**
 * Refresh all Discord channels linked to a roster across all guilds.
 * Called by the webhook from roster-hub-api and by /roster refresh.
 */
export async function refreshRoster(
  env: Env,
  rosterId: string,
  scopeGuildId?: string,
  opts: RefreshOptions = {},
): Promise<RefreshResult> {
  const allowRecreate = opts.allowRecreate ?? true;
  // Fetch the latest snapshot — hub API for normal IDs, KV for direct-publish
  const fetchResult = await fetchRosterSnapshot(env, rosterId);
  let snapshot = fetchResult.status === 'ok' ? fetchResult.snapshot : null;

  if (!snapshot && rosterId.startsWith('direct-')) {
    // Direct-publish rosters live in KV, not the hub API
    const kvData = await env.ROSTERS.get(`${KV_PREFIX.ROSTER_DATA}:${rosterId}`);
    if (kvData) {
      // Reconstruct the snapshot. Prefer persisted metadata (title/desc/tags)
      // so a refresh keeps the original embed faithful; fall back to
      // placeholders for rosters published before metadata persistence existed.
      const mappings = await findMappingsForRoster(env, rosterId);
      const mapping = mappings[0] ?? null;
      const meta = await readDirectRosterMeta(env, rosterId);
      snapshot = {
        id: rosterId,
        title: meta?.title ?? mapping?.channelNameOverride ?? 'Direct Roster',
        description: meta?.description ?? '',
        trial_id: meta?.trial_id ?? '',
        author_name: meta?.author_name ?? 'Unknown',
        roster_data: kvData,
        tags: meta?.tags ?? [],
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
  const failures: string[] = [];

  for (const candidate of mappings) {
    const token = await acquirePublishLock(env, candidate.guildId, rosterId);
    if (!token) {
      failures.push(
        `${candidate.guildId}: a publish or refresh is already in progress for this roster`,
      );
      continue;
    }

    const lease = startLeaseHeartbeat(env, candidate.guildId, rosterId, token);
    try {
      // Re-read under the lock so a publish that completed while this refresh
      // was queued cannot be overwritten with stale mapping data.
      let mapping = await getMappingByRosterId(env, candidate.guildId, rosterId);
      if (!mapping) continue;

      if (!(await lease.assertHeld())) {
        failures.push(`${candidate.guildId}: ${LOCK_LOST_ERROR}`);
        continue;
      }

      if (mapping.cleanupPendingMessageIds?.length) {
        const cleanup = await finishPendingMessageCleanup(env, mapping);
        if (!cleanup.ok) {
          failures.push(`${candidate.guildId}: ${cleanup.error}`);
          continue;
        }
        mapping = cleanup.mapping;
      }

      const config =
        (await getGuildConfig(env, mapping.guildId)) ?? getDefaultGuildConfig(mapping.guildId);
      const channelName = resolveChannelName(
        config.namePattern,
        buildNameContext(snapshot, decoded, mapping.eventTime, config.timezone),
        mapping.channelNameOverride,
      );

      const result = await refreshExistingMapping(
        env,
        mapping,
        snapshot,
        decoded,
        channelName,
        mapping.categoryId,
        mapping.eventTime,
        allowRecreate,
        config.defaultChannelId,
      );

      if (!result.ok) {
        failures.push(`${candidate.guildId}: ${result.error ?? 'refresh failed'}`);
        continue;
      }

      if (!(await lease.assertHeld())) {
        await cleanupUncommittedDiscordMutation(env, result);
        failures.push(`${candidate.guildId}: ${LOCK_LOST_ERROR}`);
        continue;
      }

      const updated: RosterMapping = {
        ...mapping,
        messageId: result.messageId ?? mapping.messageId,
        channelId: result.channelId ?? mapping.channelId,
        cleanupPendingMessageIds: result.cleanupPendingMessageIds,
        updatedAt: new Date().toISOString(),
      };
      const isDirect = rosterId.startsWith('direct-');
      try {
        // For direct rosters the mapping is the commit marker: publish the data
        // and metadata first, then make the Discord artifact discoverable.
        if (isDirect) {
          await persistDirectRosterData(env, snapshot);
          if (!(await lease.assertHeld())) {
            await cleanupUncommittedDiscordMutation(env, result);
            failures.push(`${candidate.guildId}: ${LOCK_LOST_ERROR}`);
            continue;
          }
        }
        await upsertMapping(env, updated, isDirect ? DIRECT_TTL : undefined);
      } catch (error) {
        console.error('[refresh] failed to persist refreshed roster:', error);
        await cleanupUncommittedDiscordMutation(env, result);
        failures.push(`${candidate.guildId}: failed to save the refreshed roster`);
        continue;
      }

      // Once the mapping is committed, only its current lease owner may
      // advance the cleanup journal. A later refresh will resume it otherwise.
      if (!(await lease.assertHeld())) {
        failures.push(`${candidate.guildId}: ${LOCK_LOST_ERROR}`);
        continue;
      }

      const cleanup = await finishPendingMessageCleanup(
        env,
        updated,
        isDirect ? DIRECT_TTL : undefined,
      );
      if (!cleanup.ok) {
        failures.push(`${candidate.guildId}: ${cleanup.error}`);
        continue;
      }
      refreshedCount++;
    } catch (error) {
      console.error('[refresh] unexpected guild refresh failure:', error);
      failures.push(`${candidate.guildId}: unexpected refresh failure`);
    } finally {
      await lease.stop();
      await releaseLock(env, candidate.guildId, rosterId, token);
    }
  }

  return summarizeRefreshResults(refreshedCount, failures);
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
 * Mint a synthetic id for a direct-publish roster.
 *
 * The suffix is the full 16-byte (128-bit) random value in hex with no
 * truncation: direct-* rosters are readable by an unauthenticated
 * GET /discord/roster/:id/data, so the id must not be enumerable — a
 * bracketable ms timestamp plus a short suffix would leave private-guild
 * payloads guessable. Exported for unit testing.
 */
export function mintDirectRosterId(): string {
  const rand = crypto.getRandomValues(new Uint8Array(16));
  const suffix = Array.from(rand)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
  return `direct-${Date.now().toString(36)}-${suffix}`;
}

/**
 * Publish a roster directly from raw data (e.g. from the roster builder).
 * Does not require the roster to exist on the Hub — builds a synthetic
 * snapshot from the provided fields.
 */
export async function publishDirect(env: Env, req: DirectPublishRequest): Promise<PublishResult> {
  // Build a synthetic snapshot from the raw data.
  const syntheticId = mintDirectRosterId();

  // Acquire lock keyed on the *content* (not the random synthetic ID): a rapid
  // double-click sends two identical requests that would each mint a different
  // synthetic ID, so locking on the ID would never collide and both would
  // create a channel. Hashing the payload makes duplicate submissions contend
  // on the same atomic coordinator lease while genuinely different payloads
  // receive independent operation keys.
  const lockKey = await contentLockKey(req);
  const token = await acquirePublishLock(env, req.guildId, lockKey);
  if (!token) {
    return { ok: false, error: 'A publish is already in progress for this roster. Please wait.' };
  }

  const lease = startLeaseHeartbeat(env, req.guildId, lockKey, token);
  try {
    return await doPublishDirect(env, req, syntheticId, lease);
  } finally {
    await lease.stop();
    await releaseLock(env, req.guildId, lockKey, token);
  }
}

/**
 * Derive a stable, collision-resistant lock key from a direct-publish payload.
 * Includes every field that distinguishes one publish from another, so a rapid
 * double-click (identical payload) contends on the lock, while genuinely
 * different submissions — e.g. the same roster scheduled for two event times —
 * don't falsely block each other. guildId is already in the KV key prefix;
 * ownerUserId is intentionally excluded so two users submitting identical
 * content still de-dupe. Fields are NUL-joined so values can't bleed across
 * boundaries.
 */
async function contentLockKey(req: DirectPublishRequest): Promise<string> {
  const material = [
    req.title,
    req.description ?? '',
    req.trial_id ?? '',
    (req.tags ?? []).join(','),
    req.channelNameOverride ?? '',
    req.categoryId ?? '',
    req.eventTime ?? '',
    req.roster_data,
  ].join('\0');
  const bytes = new TextEncoder().encode(material);
  const digest = await crypto.subtle.digest('SHA-256', bytes);
  const hex = Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
  return `dedupe-${hex.slice(0, 32)}`;
}

async function doPublishDirect(
  env: Env,
  req: DirectPublishRequest,
  syntheticId: string,
  lease: LeaseHeartbeat,
): Promise<PublishResult> {
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

  if (!(await lease.assertHeld())) {
    return { ok: false, error: LOCK_LOST_ERROR };
  }

  const target = resolvePublishTarget(config);
  const result =
    target.mode === 'existing'
      ? await postRosterToDefaultChannel(
          env,
          target.channelId,
          snapshot,
          decoded,
          req.eventTime,
          config.rolePingIds,
        )
      : await createNewRosterChannel(
          env,
          req.guildId,
          channelName,
          categoryId,
          snapshot,
          decoded,
          req.eventTime,
          config.rolePingIds,
        );

  if (!result.ok) return result;

  if (!(await lease.assertHeld())) {
    await cleanupUncommittedDiscordMutation(env, result);
    return { ok: false, error: LOCK_LOST_ERROR };
  }

  // Persist mapping with same TTL as roster data so they expire together
  const now = new Date().toISOString();
  const mapping: RosterMapping = {
    rosterId: syntheticId,
    guildId: req.guildId,
    channelId: result.channelId!,
    messageId: result.messageId!,
    categoryId,
    channelNameOverride: req.channelNameOverride,
    eventTime: req.eventTime,
    ownerUserId: req.ownerUserId ?? '',
    createdAt: now,
    updatedAt: now,
  };
  try {
    // The mapping is the commit marker. Store render data first, then expose
    // the mapping only after all prerequisite writes have landed.
    await persistDirectRosterData(env, snapshot);
    if (!(await lease.assertHeld())) {
      await cleanupUncommittedDiscordMutation(env, result);
      return { ok: false, error: LOCK_LOST_ERROR };
    }
    await upsertMapping(env, mapping, DIRECT_TTL);
  } catch (error) {
    console.error('[publish-direct] failed to persist published roster:', error);
    await cleanupUncommittedDiscordMutation(env, result);
    return { ok: false, error: 'Failed to save the published roster. Please retry.' };
  }

  // Persist snapshot metadata so a later refresh rebuilds the embed faithfully.
  // Direct rosters have no hub record, so without this a refresh would degrade
  // the title/description/tags to placeholders. Same TTL — expire together.
  return { ok: true, channelId: result.channelId, channelName, messageId: result.messageId };
}

/** Snapshot metadata persisted for direct-publish rosters (no hub record). */
interface DirectRosterMeta {
  title?: string;
  description?: string;
  trial_id?: string;
  author_name?: string;
  tags?: string[];
}

async function persistDirectRosterData(env: Env, snapshot: RosterSnapshot): Promise<void> {
  await Promise.all([
    env.ROSTERS.put(`${KV_PREFIX.ROSTER_DATA}:${snapshot.id}`, snapshot.roster_data, {
      expirationTtl: DIRECT_TTL,
    }),
    env.ROSTERS.put(
      `${KV_PREFIX.ROSTER_META}:${snapshot.id}`,
      JSON.stringify({
        title: snapshot.title,
        description: snapshot.description,
        trial_id: snapshot.trial_id,
        author_name: snapshot.author_name,
        tags: snapshot.tags,
      } satisfies DirectRosterMeta),
      { expirationTtl: DIRECT_TTL },
    ),
  ]);
}

/** Load persisted metadata for a direct-publish roster, or null if absent/corrupt. */
async function readDirectRosterMeta(env: Env, rosterId: string): Promise<DirectRosterMeta | null> {
  const raw = await env.ROSTERS.get(`${KV_PREFIX.ROSTER_META}:${rosterId}`);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as DirectRosterMeta;
  } catch {
    console.error(`[refresh] failed to parse direct roster meta for ${rosterId}`);
    return null;
  }
}

// ── Refresh a single channel for an existing mapping ────────────────────────

export interface InternalRefreshResult {
  ok: boolean;
  channelId?: string;
  messageId?: string;
  error?: string;
  createdChannel?: boolean;
  postedMessageIds?: string[];
  cleanupPendingMessageIds?: string[];
}

interface PendingCleanupResult {
  ok: boolean;
  mapping: RosterMapping;
  error?: string;
}

/**
 * Delete superseded messages recorded in the mapping. The journal is only
 * cleared after every deletion succeeds (or Discord confirms it is absent),
 * which makes cleanup retryable across worker restarts and transient errors.
 */
export async function finishPendingMessageCleanup(
  env: Env,
  mapping: RosterMapping,
  expirationTtl?: number,
): Promise<PendingCleanupResult> {
  const pending = mapping.cleanupPendingMessageIds ?? [];
  if (pending.length === 0) return { ok: true, mapping };

  const remaining: string[] = [];
  for (const messageId of pending) {
    try {
      await deleteMessage(env, mapping.channelId, messageId);
    } catch (error) {
      if (!isMissingDiscordResource(error)) {
        console.error('[publish] failed to remove superseded roster message:', error);
        remaining.push(messageId);
      }
    }
  }

  const updated: RosterMapping = {
    ...mapping,
    cleanupPendingMessageIds: remaining.length > 0 ? remaining : undefined,
    updatedAt: new Date().toISOString(),
  };
  try {
    await upsertMapping(env, updated, expirationTtl);
  } catch (error) {
    console.error('[publish] failed to persist message-cleanup progress:', error);
    return {
      ok: false,
      mapping,
      error: 'The roster was published, but cleanup progress could not be saved. Please retry.',
    };
  }

  if (remaining.length > 0) {
    return {
      ok: false,
      mapping: updated,
      error: 'The roster was published, but old messages could not be removed. Please retry.',
    };
  }
  return { ok: true, mapping: updated };
}

/** Roll back Discord artifacts that were created but never committed to KV. */
export async function cleanupUncommittedDiscordMutation(
  env: Env,
  result: InternalRefreshResult,
): Promise<void> {
  if (!result.ok || !result.channelId) return;

  try {
    if (result.createdChannel) {
      await deleteChannel(env, result.channelId);
      return;
    }
    for (const messageId of result.postedMessageIds ?? []) {
      try {
        await deleteMessage(env, result.channelId, messageId);
      } catch (error) {
        if (!isMissingDiscordResource(error)) {
          console.error('[publish] failed to compensate uncommitted message:', error);
        }
      }
    }
  } catch (error) {
    if (!isMissingDiscordResource(error)) {
      console.error('[publish] failed to compensate uncommitted channel:', error);
    }
  }
}

async function refreshExistingMapping(
  env: Env,
  mapping: RosterMapping,
  snapshot: RosterSnapshot,
  decoded: Awaited<ReturnType<typeof decodeRosterData>>,
  channelName: string,
  categoryId?: string,
  eventTime?: string,
  allowRecreate = true,
  defaultChannelId?: string,
): Promise<InternalRefreshResult> {
  const text = buildRosterText(snapshot, decoded, eventTime);
  const chunks = splitMessages(text);
  const components = buildRosterActionRows(snapshot.id);
  const oldMessageIds = mapping.messageId.split(',');

  // A single message can be replaced atomically enough for users. Multi-part
  // rosters are posted in full before the old set is removed, avoiding a
  // partially updated roster when one edit in the sequence fails.
  if (chunks.length === 1 && oldMessageIds.length === 1) {
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
      if (!isMissingDiscordResource(err)) {
        console.warn('[refresh] edit failed without a recoverable missing-resource error:', err);
        return { ok: false, error: 'Failed to edit the existing roster message.' };
      }
      console.warn('[refresh] roster message or channel is missing, will re-post:', err);
    }
  }

  // Re-post path: post the NEW messages first, and only delete the OLD ones
  // once the new post fully succeeds. This avoids a window where the old
  // messages are gone but the new ones are incomplete; sendRosterMessages
  // self-cleans its own partial posts on failure, so nothing is leaked.
  try {
    const messageIds = await sendRosterMessages(env, mapping.channelId, chunks, components);
    return {
      ok: true,
      channelId: mapping.channelId,
      messageId: messageIds,
      postedMessageIds: messageIds.split(','),
      cleanupPendingMessageIds: oldMessageIds,
    };
  } catch (err) {
    if (!isMissingDiscordChannel(err)) {
      console.warn('[refresh] re-post failed without a recoverable missing-channel error:', err);
      return { ok: false, error: 'Failed to post the refreshed roster message.' };
    }
    console.warn('[refresh] existing channel is missing:', err);
  }

  // Posting to the existing channel failed. If the roster was consolidated into
  // the guild's configured default channel, never silently create a new
  // per-roster channel — that would migrate it out of the default channel on a
  // transient failure. Leave the mapping intact so it recovers once access does.
  if (defaultChannelId && mapping.channelId === defaultChannelId) {
    return {
      ok: false,
      error: 'Failed to post into the configured default channel. Check the bot has access to it.',
    };
  }

  // The channel/messages are gone. Only recreate for user-initiated refreshes —
  // an automatic (webhook) re-sync must not resurrect a channel staff deleted on
  // purpose. The mapping is left intact so a transient failure can recover later.
  if (!allowRecreate) {
    return { ok: false, error: 'Channel no longer exists; skipping automatic recreate.' };
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

/** Only explicit Discord missing-resource errors are safe to recover from. */
function isMissingDiscordResource(error: unknown): boolean {
  return (
    error instanceof DiscordApiError &&
    error.status === 404 &&
    (error.code === 10003 || error.code === 10008)
  );
}

function isMissingDiscordChannel(error: unknown): boolean {
  return error instanceof DiscordApiError && error.status === 404 && error.code === 10003;
}

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
  try {
    for (let i = 0; i < chunks.length; i++) {
      const isLast = i === chunks.length - 1;
      const msg = await sendMessage(env, channelId, {
        content: chunks[i],
        ...(isLast ? { components } : {}),
      });
      ids.push(msg.id);
    }
    return ids.join(',');
  } catch (err) {
    // Best-effort cleanup: a mid-sequence failure must not leak the messages
    // already posted (callers treat a throw as a fully failed post).
    for (const id of ids) {
      try {
        await deleteMessage(env, channelId, id);
      } catch (cleanupError) {
        if (!isMissingDiscordResource(cleanupError)) {
          console.error('[publish] failed to clean up partial roster post:', cleanupError);
        }
      }
    }
    throw err;
  }
}

// ── Post roster into an existing channel ────────────────────────────────────

/**
 * Send the role ping (best-effort) + roster messages into an existing channel.
 * Used both after creating a fresh channel and when posting into a configured
 * default channel. Does not create or delete channels.
 */
async function sendRosterToChannel(
  env: Env,
  channelId: string,
  snapshot: RosterSnapshot,
  decoded: Awaited<ReturnType<typeof decodeRosterData>>,
  eventTime?: string,
  rolePingIds?: GuildConfig['rolePingIds'],
): Promise<string> {
  // Best-effort role ping (opt-in via guild config). Sent as its own message
  // so it's never re-sent on refresh and a ping failure can't block the post.
  const ping = buildRolePingLine(decoded, rolePingIds);
  if (ping) {
    try {
      await sendMessage(env, channelId, {
        content: ping.content,
        allowed_mentions: { parse: [], roles: ping.roleIds },
      });
    } catch (pingErr) {
      console.warn('[publish] role ping failed (non-fatal):', pingErr);
    }
  }

  const text = buildRosterText(snapshot, decoded, eventTime);
  const chunks = splitMessages(text);
  const components = buildRosterActionRows(snapshot.id);
  return sendRosterMessages(env, channelId, chunks, components);
}

/**
 * Post a roster into the guild's configured default channel (no channel
 * creation). Returns an error result if the channel rejects the message
 * (e.g. it was deleted or the bot lost access) — unlike the create path, we
 * never created the channel so there's nothing to clean up.
 */
async function postRosterToDefaultChannel(
  env: Env,
  channelId: string,
  snapshot: RosterSnapshot,
  decoded: Awaited<ReturnType<typeof decodeRosterData>>,
  eventTime?: string,
  rolePingIds?: GuildConfig['rolePingIds'],
): Promise<InternalRefreshResult> {
  try {
    const messageId = await sendRosterToChannel(
      env,
      channelId,
      snapshot,
      decoded,
      eventTime,
      rolePingIds,
    );
    return { ok: true, channelId, messageId, postedMessageIds: messageId.split(',') };
  } catch (err) {
    console.error('[publish] post to default channel failed:', err);
    return {
      ok: false,
      error: 'Failed to post into the configured default channel. Check the bot has access to it.',
    };
  }
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
  rolePingIds?: GuildConfig['rolePingIds'],
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
    const messageIds = await sendRosterToChannel(
      env,
      channel.id,
      snapshot,
      decoded,
      eventTime,
      rolePingIds,
    );
    return {
      ok: true,
      channelId: channel.id,
      messageId: messageIds,
      createdChannel: true,
      postedMessageIds: messageIds.split(','),
    };
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
