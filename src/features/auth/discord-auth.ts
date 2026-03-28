/**
 * Discord OAuth2 helpers for the server picker feature.
 *
 * Separate from the ESO Logs auth flow — Discord auth is optional
 * and only used when publishing rosters to Discord servers.
 */

const DISCORD_CLIENT_ID = import.meta.env.VITE_DISCORD_CLIENT_ID as string;
const DISCORD_BOT_API_URL =
  (import.meta.env.VITE_DISCORD_BOT_API_URL as string | undefined) ??
  'https://eso-toolkit-discord-bot.eso-toolkit.workers.dev';

const DISCORD_OAUTH_AUTHORIZE = 'https://discord.com/oauth2/authorize';
const DISCORD_API_BASE = 'https://discord.com/api/v10';
const SCOPES = 'identify guilds';

// localStorage keys
export const DISCORD_LS_TOKEN_KEY = 'discord_access_token';
const DISCORD_LS_RETURN_PATH_KEY = 'discord_oauth_return_path';

// ── Types ───────────────────────────────────────────────────────────────────

export interface DiscordUserGuild {
  id: string;
  name: string;
  icon: string | null;
  permissions: string;
}

export interface DiscordTokenResponse {
  access_token: string;
  token_type: string;
  expires_in: number;
  refresh_token: string;
  scope: string;
}

// ── OAuth Flow ──────────────────────────────────────────────────────────────

function getRedirectUri(): string {
  const base = window.location.origin + (import.meta.env.BASE_URL ?? '/');
  return `${base.replace(/\/$/, '')}/discord-oauth-redirect`;
}

/**
 * Start the Discord OAuth2 authorization code flow.
 * Stores the return path so we can navigate back after the redirect.
 */
export function startDiscordAuth(returnPath?: string): void {
  if (returnPath) {
    localStorage.setItem(DISCORD_LS_RETURN_PATH_KEY, returnPath);
  }

  const params = new URLSearchParams({
    client_id: DISCORD_CLIENT_ID,
    redirect_uri: getRedirectUri(),
    response_type: 'code',
    scope: SCOPES,
  });

  window.location.href = `${DISCORD_OAUTH_AUTHORIZE}?${params.toString()}`;
}

/**
 * Exchange the authorization code for an access token.
 * Uses the Worker as a proxy to keep the client secret server-side.
 */
export async function exchangeDiscordCode(code: string): Promise<DiscordTokenResponse> {
  const res = await fetch(`${DISCORD_BOT_API_URL}/discord/oauth/token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      code,
      redirect_uri: getRedirectUri(),
    }),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Token exchange failed: ${text}`);
  }

  return res.json() as Promise<DiscordTokenResponse>;
}

/**
 * Get the stored return path (page user was on before Discord auth).
 */
export function getDiscordReturnPath(): string {
  const path = localStorage.getItem(DISCORD_LS_RETURN_PATH_KEY);
  localStorage.removeItem(DISCORD_LS_RETURN_PATH_KEY);
  return path ?? '/';
}

// ── Discord API calls ───────────────────────────────────────────────────────

/**
 * Fetch the guilds the authenticated Discord user is a member of.
 */
export async function getDiscordUserGuilds(accessToken: string): Promise<DiscordUserGuild[]> {
  const res = await fetch(`${DISCORD_API_BASE}/users/@me/guilds`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  if (!res.ok) {
    if (res.status === 401) {
      throw new DiscordAuthExpiredError('Discord token expired');
    }
    throw new Error(`Failed to fetch guilds: ${res.status}`);
  }

  return res.json() as Promise<DiscordUserGuild[]>;
}

/**
 * Fetch the guilds the ESO Toolkit bot is a member of.
 */
export async function getBotGuilds(): Promise<{ id: string; name: string; icon: string | null }[]> {
  const res = await fetch(`${DISCORD_BOT_API_URL}/discord/bot/guilds`);

  if (!res.ok) {
    throw new Error(`Failed to fetch bot guilds: ${res.status}`);
  }

  const data = (await res.json()) as { guilds: { id: string; name: string; icon: string | null }[] };
  return data.guilds;
}

// ── Helpers ─────────────────────────────────────────────────────────────────

const MANAGE_GUILD = 0x20n;

/**
 * Filter user guilds to only those where:
 *   1. The bot is also a member
 *   2. The user has MANAGE_GUILD permission
 */
export function getMutualManagedGuilds(
  userGuilds: DiscordUserGuild[],
  botGuildIds: Set<string>,
): DiscordUserGuild[] {
  return userGuilds.filter((g) => {
    if (!botGuildIds.has(g.id)) return false;
    try {
      return (BigInt(g.permissions) & MANAGE_GUILD) === MANAGE_GUILD;
    } catch {
      return false;
    }
  });
}

/**
 * Build a Discord guild icon URL.
 */
export function getGuildIconUrl(guildId: string, iconHash: string | null, size = 64): string | null {
  if (!iconHash) return null;
  return `https://cdn.discordapp.com/icons/${guildId}/${iconHash}.png?size=${size}`;
}

/**
 * Build the URL to invite the bot to a server.
 */
export function getBotInviteUrl(): string {
  // Permissions: Manage Channels, Send Messages, Embed Links, View Channels
  const permissions = '19456';
  return `https://discord.com/oauth2/authorize?client_id=${DISCORD_CLIENT_ID}&permissions=${permissions}&scope=bot%20applications.commands`;
}

// ── Custom error for expired tokens ─────────────────────────────────────────

export class DiscordAuthExpiredError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'DiscordAuthExpiredError';
  }
}
