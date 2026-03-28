/**
 * Typed Discord REST API client.
 * All requests go to https://discord.com/api/v10.
 */

import type {
  DiscordChannel,
  DiscordEmbed,
  DiscordComponent,
  DiscordInteraction,
  DiscordMessage,
  DiscordUser,
  Env,
} from './types.js';

const API_BASE = 'https://discord.com/api/v10';

const MAX_RETRIES = 2;

async function discordFetch<T>(
  env: Env,
  method: string,
  path: string,
  body?: unknown,
): Promise<T> {
  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    const res = await fetch(`${API_BASE}${path}`, {
      method,
      headers: {
        Authorization: `Bot ${env.DISCORD_BOT_TOKEN}`,
        'Content-Type': 'application/json',
        'User-Agent': 'ESO-Toolkit-DiscordBot/1.0',
      },
      body: body !== undefined ? JSON.stringify(body) : null,
    });

    // Handle rate limits (429) — wait and retry
    if (res.status === 429) {
      const retryAfter = parseFloat(res.headers.get('Retry-After') ?? '1');
      const waitMs = Math.min(retryAfter * 1000, 5000); // cap at 5s
      console.warn(`[discord] rate limited on ${method} ${path}, retry after ${retryAfter}s`);
      if (attempt < MAX_RETRIES) {
        await new Promise((r) => setTimeout(r, waitMs));
        continue;
      }
    }

    // Retry on 5xx server errors
    if (res.status >= 500 && attempt < MAX_RETRIES) {
      console.warn(`[discord] server error ${res.status} on ${method} ${path}, retrying...`);
      await new Promise((r) => setTimeout(r, 1000 * (attempt + 1)));
      continue;
    }

    if (!res.ok) {
      const text = await res.text();
      throw new Error(`Discord API error ${res.status} on ${method} ${path}: ${text}`);
    }

    // 204 No Content
    if (res.status === 204) return undefined as T;

    return res.json() as Promise<T>;
  }

  throw new Error(`Discord API failed after ${MAX_RETRIES + 1} attempts on ${method} ${path}`);
}

// ── Channels ────────────────────────────────────────────────────────────────

export interface CreateChannelOptions {
  name: string;
  type: number;
  parent_id?: string;
  topic?: string;
  permission_overwrites?: PermissionOverwrite[];
}

export interface PermissionOverwrite {
  id: string;
  type: 0 | 1; // 0 = role, 1 = member
  allow?: string;
  deny?: string;
}

export function createChannel(
  env: Env,
  guildId: string,
  options: CreateChannelOptions,
): Promise<DiscordChannel> {
  return discordFetch<DiscordChannel>(env, 'POST', `/guilds/${guildId}/channels`, options);
}

export function deleteChannel(env: Env, channelId: string): Promise<DiscordChannel> {
  return discordFetch<DiscordChannel>(env, 'DELETE', `/channels/${channelId}`);
}

export function editChannelPermissions(
  env: Env,
  channelId: string,
  overwriteId: string,
  data: { allow?: string; deny?: string; type: 0 | 1 },
): Promise<void> {
  return discordFetch<void>(env, 'PUT', `/channels/${channelId}/permissions/${overwriteId}`, data);
}

export function deleteChannelPermission(
  env: Env,
  channelId: string,
  overwriteId: string,
): Promise<void> {
  return discordFetch<void>(env, 'DELETE', `/channels/${channelId}/permissions/${overwriteId}`);
}

/**
 * Add a user to a channel with specified permissions.
 * Uses type 1 (member) for the permission overwrite.
 */
export async function addChannelPermission(
  env: Env,
  channelId: string,
  userId: string,
  permissions: Record<string, boolean>,
): Promise<void> {
  let allowBits = 0n;
  let denyBits = 0n;

  for (const [perm, value] of Object.entries(permissions)) {
    const bit = Permission[perm as keyof typeof Permission];
    if (bit !== undefined) {
      if (value) {
        allowBits |= bit;
      } else {
        denyBits |= bit;
      }
    }
  }

  await editChannelPermissions(env, channelId, userId, {
    allow: allowBits.toString(),
    deny: denyBits.toString(),
    type: 1, // member
  });
}

/**
 * Remove a user's access to a channel.
 */
export function removeChannelPermission(
  env: Env,
  channelId: string,
  userId: string,
): Promise<void> {
  return deleteChannelPermission(env, channelId, userId);
}

// ── Messages ─────────────────────────────────────────────────────────────────

export interface SendMessageOptions {
  content?: string;
  embeds?: DiscordEmbed[];
  components?: DiscordComponent[];
}

export function sendMessage(
  env: Env,
  channelId: string,
  options: SendMessageOptions,
): Promise<DiscordMessage> {
  return discordFetch<DiscordMessage>(env, 'POST', `/channels/${channelId}/messages`, options);
}

export function editMessage(
  env: Env,
  channelId: string,
  messageId: string,
  options: SendMessageOptions,
): Promise<DiscordMessage> {
  return discordFetch<DiscordMessage>(
    env,
    'PATCH',
    `/channels/${channelId}/messages/${messageId}`,
    options,
  );
}

export function getMessages(
  env: Env,
  channelId: string,
  limit = 100,
): Promise<DiscordMessage[]> {
  return discordFetch<DiscordMessage[]>(
    env,
    'GET',
    `/channels/${channelId}/messages?limit=${limit}`,
  );
}

// ── Interaction followups ────────────────────────────────────────────────────

export interface FollowupOptions {
  content?: string;
  embeds?: DiscordEmbed[];
  components?: DiscordComponent[];
  flags?: number;
}

export function sendFollowup(
  env: Env,
  interactionToken: string,
  options: FollowupOptions,
): Promise<DiscordMessage> {
  return discordFetch<DiscordMessage>(
    env,
    'POST',
    `/webhooks/${env.DISCORD_APPLICATION_ID}/${interactionToken}`,
    options,
  );
}

export function editFollowup(
  env: Env,
  interactionToken: string,
  messageId: string,
  options: FollowupOptions,
): Promise<DiscordMessage> {
  return discordFetch<DiscordMessage>(
    env,
    'PATCH',
    `/webhooks/${env.DISCORD_APPLICATION_ID}/${interactionToken}/messages/${messageId}`,
    options,
  );
}

// ── Guild roles ──────────────────────────────────────────────────────────────

export interface DiscordRole {
  id: string;
  name: string;
  permissions: string;
}

export function getGuildRoles(env: Env, guildId: string): Promise<DiscordRole[]> {
  return discordFetch<DiscordRole[]>(env, 'GET', `/guilds/${guildId}/roles`);
}

// ── Guild channels ───────────────────────────────────────────────────────────

export function getGuildChannels(env: Env, guildId: string): Promise<DiscordChannel[]> {
  return discordFetch<DiscordChannel[]>(env, 'GET', `/guilds/${guildId}/channels`);
}

// ── Bot guilds ──────────────────────────────────────────────────────────────

export interface DiscordPartialGuild {
  id: string;
  name: string;
  icon: string | null;
}

export function getBotGuilds(env: Env): Promise<DiscordPartialGuild[]> {
  return discordFetch<DiscordPartialGuild[]>(env, 'GET', '/users/@me/guilds');
}

// Permission bits used throughout the bot
export const Permission = {
  // Decimal values as bigint for safe bitwise ops
  MANAGE_GUILD: 1n << 5n,
  MANAGE_CHANNELS: 1n << 4n,
  SEND_MESSAGES: 1n << 11n,
  READ_MESSAGE_HISTORY: 1n << 16n,
  VIEW_CHANNEL: 1n << 10n,
  EMBED_LINKS: 1n << 14n,
  ATTACH_FILES: 1n << 15n,
  ADD_REACTIONS: 1n << 6n,
  USE_EXTERNAL_EMOJIS: 1n << 18n,
} as const;

/** Compute combined permission bitfield string for a set of Permission flags. */
export function allow(...perms: bigint[]): string {
  return perms.reduce((acc, p) => acc | p, 0n).toString();
}

/** Returns true if the interaction member has MANAGE_CHANNELS permission (staff check). */
export function isStaff(interaction: DiscordInteraction): boolean {
  const memberPermissions = interaction.member?.permissions;
  if (!memberPermissions) return false;
  return (BigInt(memberPermissions) & Permission.MANAGE_CHANNELS) === Permission.MANAGE_CHANNELS;
}

/** Returns true if the interaction member has MANAGE_GUILD permission (admin check). */
export function isAdmin(interaction: DiscordInteraction): boolean {
  const memberPermissions = interaction.member?.permissions;
  if (!memberPermissions) return false;
  return (BigInt(memberPermissions) & Permission.MANAGE_GUILD) === Permission.MANAGE_GUILD;
}

/**
 * Fetch a guild member by user ID using the bot token.
 */
export function getGuildMember(
  env: Env,
  guildId: string,
  userId: string,
): Promise<{ user?: DiscordUser; roles: string[]; permissions?: string }> {
  return discordFetch(env, 'GET', `/guilds/${guildId}/members/${userId}`);
}
