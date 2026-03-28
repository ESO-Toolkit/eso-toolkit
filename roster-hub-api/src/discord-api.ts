/**
 * Discord REST API helpers.
 *
 * Used by the roster-hub-api to:
 *   1. Exchange OAuth2 codes for user identity (Link Discord flow)
 *   2. Check guild membership and roles (publish-time server picker)
 *   3. Send messages to channels (post roster on publish)
 */

const DISCORD_API = 'https://discord.com/api/v10';

// ─── OAuth2 ─────────────────────────────────────────────────────────────────

interface DiscordTokenResponse {
  access_token: string;
  token_type: string;
  expires_in: number;
  refresh_token: string;
  scope: string;
}

interface DiscordOAuthUser {
  id: string;
  username: string;
  avatar: string | null;
  global_name: string | null;
}

/**
 * Exchange an OAuth2 authorization code for user identity.
 * Returns the Discord user's ID, username, and avatar.
 */
export async function exchangeCodeForUser(
  code: string,
  redirectUri: string,
  clientId: string,
  clientSecret: string,
): Promise<DiscordOAuthUser> {
  // Exchange code for token
  const tokenRes = await fetch(`${DISCORD_API}/oauth2/token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      grant_type: 'authorization_code',
      code,
      redirect_uri: redirectUri,
    }),
  });

  if (!tokenRes.ok) {
    const text = await tokenRes.text();
    throw new Error(`Discord token exchange failed (${tokenRes.status}): ${text}`);
  }

  const tokenData = (await tokenRes.json()) as DiscordTokenResponse;

  // Fetch user identity
  const userRes = await fetch(`${DISCORD_API}/users/@me`, {
    headers: { Authorization: `Bearer ${tokenData.access_token}` },
  });

  if (!userRes.ok) {
    throw new Error(`Discord user fetch failed (${userRes.status})`);
  }

  return userRes.json() as Promise<DiscordOAuthUser>;
}

// ─── Bot API calls ──────────────────────────────────────────────────────────

interface DiscordGuildMember {
  user?: { id: string; username: string };
  roles: string[];
  nick?: string | null;
}

/**
 * Check if a Discord user is a member of a guild and return their roles.
 * Returns null if the user is not a member.
 */
export async function getGuildMember(
  botToken: string,
  guildId: string,
  userId: string,
): Promise<DiscordGuildMember | null> {
  const res = await fetch(`${DISCORD_API}/guilds/${guildId}/members/${userId}`, {
    headers: {
      Authorization: `Bot ${botToken}`,
      'User-Agent': 'ESO-Toolkit-RosterHubAPI/1.0',
    },
  });

  if (res.status === 404 || res.status === 403) return null;
  if (!res.ok) return null;

  return res.json() as Promise<DiscordGuildMember>;
}

/**
 * Send a message to a Discord channel using the bot token.
 */
export async function sendChannelMessage(
  botToken: string,
  channelId: string,
  content: string,
): Promise<boolean> {
  const res = await fetch(`${DISCORD_API}/channels/${channelId}/messages`, {
    method: 'POST',
    headers: {
      Authorization: `Bot ${botToken}`,
      'Content-Type': 'application/json',
      'User-Agent': 'ESO-Toolkit-RosterHubAPI/1.0',
    },
    body: JSON.stringify({ content }),
  });

  return res.ok;
}

/**
 * Get basic guild info using the bot token.
 */
export async function getGuild(
  botToken: string,
  guildId: string,
): Promise<{ id: string; name: string; icon: string | null } | null> {
  const res = await fetch(`${DISCORD_API}/guilds/${guildId}`, {
    headers: {
      Authorization: `Bot ${botToken}`,
      'User-Agent': 'ESO-Toolkit-RosterHubAPI/1.0',
    },
  });

  if (!res.ok) return null;
  const data = (await res.json()) as { id: string; name: string; icon: string | null };
  return { id: data.id, name: data.name, icon: data.icon };
}

// ─── Guild channels & roles ────────────────────────────────────────────────

export interface DiscordChannel {
  id: string;
  name: string;
  type: number; // 0 = text, 2 = voice, 4 = category, etc.
  parent_id: string | null;
  position: number;
}

export interface DiscordRole {
  id: string;
  name: string;
  color: number;
  position: number;
  managed: boolean; // true = bot/integration role
}

/**
 * Fetch all channels in a guild. Returns text channels only (type 0).
 */
export async function getGuildChannels(
  botToken: string,
  guildId: string,
): Promise<DiscordChannel[]> {
  const res = await fetch(`${DISCORD_API}/guilds/${guildId}/channels`, {
    headers: {
      Authorization: `Bot ${botToken}`,
      'User-Agent': 'ESO-Toolkit-RosterHubAPI/1.0',
    },
  });
  if (!res.ok) return [];
  const channels = (await res.json()) as DiscordChannel[];
  // Return only text channels, sorted by position
  return channels
    .filter((c) => c.type === 0)
    .sort((a, b) => a.position - b.position);
}

/**
 * Fetch all roles in a guild. Excludes @everyone and managed (bot) roles.
 */
export async function getGuildRoles(
  botToken: string,
  guildId: string,
): Promise<DiscordRole[]> {
  const res = await fetch(`${DISCORD_API}/guilds/${guildId}/roles`, {
    headers: {
      Authorization: `Bot ${botToken}`,
      'User-Agent': 'ESO-Toolkit-RosterHubAPI/1.0',
    },
  });
  if (!res.ok) return [];
  const roles = (await res.json()) as DiscordRole[];
  // Exclude @everyone (id === guild_id) and managed/bot roles
  return roles
    .filter((r) => r.id !== guildId && !r.managed)
    .sort((a, b) => b.position - a.position);
}
