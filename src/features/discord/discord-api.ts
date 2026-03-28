/**
 * Discord integration API client.
 *
 * Calls the roster-hub-api's /discord/* endpoints for:
 *   - Linking/unlinking Discord accounts
 *   - Fetching servers where the user can post rosters
 *   - Posting a roster to a server's channel
 */

const BASE_URL =
  (import.meta.env.VITE_ROSTER_HUB_API_URL as string | undefined) ?? 'http://localhost:8787';

// Discord OAuth2 app credentials (public — safe for client-side)
export const DISCORD_CLIENT_ID = import.meta.env.VITE_DISCORD_CLIENT_ID as string | undefined;

async function request<T>(path: string, options: RequestInit = {}, token?: string): Promise<T> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string> | undefined),
  };
  if (token) headers.Authorization = `Bearer ${token}`;

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 15_000);

  try {
    const res = await fetch(`${BASE_URL}${path}`, {
      ...options,
      headers,
      signal: controller.signal,
    });
    if (!res.ok) {
      const data = (await res.json().catch(() => ({}))) as { error?: string };
      throw new Error(data.error ?? `Request failed (${res.status})`);
    }
    return res.json() as Promise<T>;
  } finally {
    clearTimeout(timeout);
  }
}

// ─── Types ──────────────────────────────────────────────────────────────────

export interface DiscordLinkStatus {
  linked: boolean;
  discord_id?: string;
  discord_username?: string;
  discord_avatar?: string | null;
}

export interface DiscordServer {
  guild_id: string;
  guild_name: string;
  guild_icon: string | null;
  roster_channel_id: string;
}

export interface MyServersResponse {
  servers: DiscordServer[];
  linked: boolean;
}

// ─── API methods ────────────────────────────────────────────────────────────

export const discordApi = {
  /** Check if user has Discord linked. */
  getLinkStatus(token: string): Promise<DiscordLinkStatus> {
    return request<DiscordLinkStatus>('/discord/link', {}, token);
  },

  /** Link Discord account using OAuth2 code. */
  link(
    code: string,
    redirectUri: string,
    token: string,
  ): Promise<{ discord_id: string; discord_username: string; discord_avatar: string | null }> {
    return request(
      '/discord/link',
      { method: 'POST', body: JSON.stringify({ code, redirect_uri: redirectUri }) },
      token,
    );
  },

  /** Unlink Discord account. */
  unlink(token: string): Promise<{ ok: boolean }> {
    return request<{ ok: boolean }>('/discord/link', { method: 'DELETE' }, token);
  },

  /** Get servers where user can post rosters. */
  getMyServers(token: string): Promise<MyServersResponse> {
    return request<MyServersResponse>('/discord/my-servers', {}, token);
  },

  /** Post a roster to a server's configured channel. */
  postRoster(
    rosterId: string,
    guildId: string,
    token: string,
  ): Promise<{ ok: boolean; channel_id: string }> {
    return request(
      '/discord/post-roster',
      { method: 'POST', body: JSON.stringify({ roster_id: rosterId, guild_id: guildId }) },
      token,
    );
  },
};

// ─── OAuth2 helpers ─────────────────────────────────────────────────────────

/**
 * Build the Discord OAuth2 authorization URL.
 * Scope: `identify` — we only need the user's ID and username.
 */
export function buildDiscordOAuthUrl(redirectUri: string, state: string): string | null {
  if (!DISCORD_CLIENT_ID) return null;
  const params = new URLSearchParams({
    client_id: DISCORD_CLIENT_ID,
    redirect_uri: redirectUri,
    response_type: 'code',
    scope: 'identify',
    state,
    prompt: 'consent',
  });
  return `https://discord.com/oauth2/authorize?${params}`;
}

/**
 * Get the redirect URI for Discord OAuth callback.
 */
export function getDiscordRedirectUri(): string {
  return `${window.location.origin}/discord/callback`;
}
