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
const DISCORD_SS_RETURN_PATH_KEY = 'discord_oauth_return_path';

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

// sessionStorage key for OAuth CSRF state
const DISCORD_SS_STATE_KEY = 'discord_oauth_state';

/**
 * Start the Discord OAuth2 authorization code flow.
 * Stores the return path so we can navigate back after the redirect.
 * Generates a random state parameter for CSRF protection.
 */
export function startDiscordAuth(returnPath?: string): void {
  if (returnPath) {
    sessionStorage.setItem(DISCORD_SS_RETURN_PATH_KEY, returnPath);
  }

  const state = crypto.randomUUID();
  sessionStorage.setItem(DISCORD_SS_STATE_KEY, state);

  const params = new URLSearchParams({
    client_id: DISCORD_CLIENT_ID,
    redirect_uri: getRedirectUri(),
    response_type: 'code',
    scope: SCOPES,
    state,
  });

  window.location.href = `${DISCORD_OAUTH_AUTHORIZE}?${params.toString()}`;
}

/**
 * Validate the OAuth state parameter returned by Discord.
 * Consumes the stored state (one-time use).
 */
export function validateOAuthState(stateParam: string | null): boolean {
  const stored = sessionStorage.getItem(DISCORD_SS_STATE_KEY);
  sessionStorage.removeItem(DISCORD_SS_STATE_KEY);
  return !!stored && stored === stateParam;
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
  const path = sessionStorage.getItem(DISCORD_SS_RETURN_PATH_KEY);
  sessionStorage.removeItem(DISCORD_SS_RETURN_PATH_KEY);
  return path ?? '/';
}

// ── Discord API calls ───────────────────────────────────────────────────────


/**
 * Fetch mutual guilds (where both the user and bot are members).
 * Requires the user's Discord access token for server-side filtering.
 */
export async function getMutualGuildsFromApi(accessToken: string): Promise<{ id: string; name: string; icon: string | null }[]> {
  const res = await fetch(`${DISCORD_BOT_API_URL}/discord/bot/guilds`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  if (!res.ok) {
    if (res.status === 401) {
      throw new DiscordAuthExpiredError('Discord token expired');
    }
    throw new Error(`Failed to fetch mutual guilds: ${res.status}`);
  }

  const data = (await res.json()) as { guilds: { id: string; name: string; icon: string | null }[] };
  return data.guilds;
}

// ── Helpers ─────────────────────────────────────────────────────────────────


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
  // Permissions: Manage Channels (1<<4), View Channel (1<<10), Send Messages (1<<11),
  // Embed Links (1<<14), Read Message History (1<<16)
  const permissions = '85008';
  return `https://discord.com/oauth2/authorize?client_id=${DISCORD_CLIENT_ID}&permissions=${permissions}&scope=bot%20applications.commands`;
}

// ── Custom error for expired tokens ─────────────────────────────────────────

export class DiscordAuthExpiredError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'DiscordAuthExpiredError';
  }
}
