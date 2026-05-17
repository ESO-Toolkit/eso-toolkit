/**
 * ESO Toolkit Discord Bot — Cloudflare Worker entry point.
 *
 * Handles three types of requests:
 *   1. Discord HTTP Interactions (POST /, with Ed25519 signature)
 *   2. Internal HTTP API (POST /discord/roster/*, authenticated)
 *   3. Public API (GET /discord/bot/*, POST /discord/oauth/*, CORS-enabled)
 */

import { verifyHttpCaller, verifyWebhookSecret } from './auth.js';
import { getBotGuilds, getGuildChannels, getGuildRoles } from './discord.js';
import { handleButton } from './handlers/buttons.js';
import { handleCommand } from './handlers/commands.js';
import { handleModal } from './handlers/modals.js';
import { publishRoster, refreshRoster, publishDirect } from './roster/index.js';
import { getGuildConfig, upsertGuildConfig, getDefaultGuildConfig } from './roster/kv.js';
import type { GuildConfig } from './roster/types.js';
import type { PublishRequest, DirectPublishRequest } from './roster/index.js';
import { KV_PREFIX } from './roster/kv.js';
import { InteractionType, MessageFlags } from './types.js';
import type { DiscordInteraction, Env } from './types.js';
import { verifyDiscordSignature } from './verify.js';

// Production-only CORS origins
const PROD_CORS_ORIGINS = new Set([
  'https://esotk.com',
  'https://www.esotk.com',
  'https://eso-toolkit.github.io',
]);

// Additional origins for development
const DEV_CORS_ORIGINS = new Set([
  'http://localhost:3000',
  'http://localhost:3001',
  'http://localhost:3002',
  'http://localhost:3003',
  'http://localhost:5173',
]);

// Allowed redirect URIs for OAuth token exchange
const PROD_REDIRECT_URIS = new Set([
  'https://esotk.com/discord-oauth-redirect',
  'https://www.esotk.com/discord-oauth-redirect',
  'https://eso-toolkit.github.io/eso-toolkit/discord-oauth-redirect',
]);

const DEV_REDIRECT_URIS = new Set([
  'http://localhost:3000/discord-oauth-redirect',
  'http://localhost:3000/eso-toolkit/discord-oauth-redirect',
  'http://localhost:5173/discord-oauth-redirect',
  'http://localhost:5173/eso-toolkit/discord-oauth-redirect',
]);

// Pre-computed merged sets for development mode (avoids re-creating per request)
const ALL_CORS_ORIGINS = new Set([...PROD_CORS_ORIGINS, ...DEV_CORS_ORIGINS]);
const ALL_REDIRECT_URIS = new Set([...PROD_REDIRECT_URIS, ...DEV_REDIRECT_URIS]);

function getAllowedOrigins(env: Env): Set<string> {
  return env.ENVIRONMENT === 'development' ? ALL_CORS_ORIGINS : PROD_CORS_ORIGINS;
}

function isAllowedRedirectUri(uri: string, env: Env): boolean {
  const uris = env.ENVIRONMENT === 'development' ? ALL_REDIRECT_URIS : PROD_REDIRECT_URIS;
  if (uris.has(uri)) return true;
  // Allow dev-preview redirect URIs (dynamic PR number in path)
  if (
    uri.match(/^https:\/\/eso-toolkit\.github\.io\/dev-previews\/pr-\d+\/discord-oauth-redirect$/)
  )
    return true;
  return false;
}

export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    const url = new URL(request.url);

    // ── CORS preflight ───────────────────────────────────────────────────
    if (request.method === 'OPTIONS') {
      return handleCorsPreflight(request, env);
    }

    // ── Public API routes (CORS-enabled) ─────────────────────────────────
    if (url.pathname === '/discord/bot/guilds') {
      return withCors(request, env, await handleBotGuilds(request, env));
    }
    if (url.pathname === '/discord/oauth/token') {
      return withCors(request, env, await handleOAuthTokenExchange(request, env));
    }

    // ── Guild config API routes (CORS-enabled, admin auth) ────────────
    if (url.pathname.startsWith('/discord/guild/')) {
      return withCors(request, env, await handleGuildApi(request, url, env));
    }

    // ── Roster API routes ────────────────────────────────────────────────
    if (url.pathname.startsWith('/discord/roster/')) {
      return withCors(request, env, await handleRosterApi(request, url, env));
    }

    // ── Discord Interactions (default) ────────────────────────────────────
    if (request.method !== 'POST') {
      return new Response('Method Not Allowed', { status: 405 });
    }

    const signature = request.headers.get('x-signature-ed25519');
    const timestamp = request.headers.get('x-signature-timestamp');

    if (!signature || !timestamp) {
      return new Response('Missing signature headers', { status: 401 });
    }

    const body = await request.text();

    const isValid = await verifyDiscordSignature(
      env.DISCORD_PUBLIC_KEY,
      signature,
      timestamp,
      body,
    );

    if (!isValid) {
      return new Response('Invalid request signature', { status: 401 });
    }

    let interaction: DiscordInteraction;
    try {
      interaction = JSON.parse(body) as DiscordInteraction;
    } catch {
      return new Response('Invalid JSON body', { status: 400 });
    }

    try {
      const response = await routeInteraction(env, interaction, ctx);
      return new Response(JSON.stringify(response), {
        headers: { 'Content-Type': 'application/json' },
      });
    } catch (err) {
      console.error('[index] unhandled error:', err);
      return new Response(
        JSON.stringify({
          type: 4,
          data: {
            content: '❌ An internal error occurred. Please try again.',
            flags: MessageFlags.EPHEMERAL,
          },
        }),
        { headers: { 'Content-Type': 'application/json' } },
      );
    }
  },
};

// ── Discord Interaction Router ──────────────────────────────────────────────

async function routeInteraction(
  env: Env,
  interaction: DiscordInteraction,
  ctx: ExecutionContext,
): Promise<unknown> {
  switch (interaction.type) {
    case InteractionType.PING:
      return { type: 1 };
    case InteractionType.APPLICATION_COMMAND:
      return handleCommand(env, interaction, ctx);
    case InteractionType.MESSAGE_COMPONENT:
      return handleButton(env, interaction, ctx);
    case InteractionType.MODAL_SUBMIT:
      return handleModal(env, interaction, ctx);
    default:
      console.warn('[index] unknown interaction type:', interaction.type);
      return {
        type: 4,
        data: { content: '❌ Unsupported interaction type.', flags: MessageFlags.EPHEMERAL },
      };
  }
}

// ── Public API: Mutual Guilds (authenticated) ──────────────────────────────

const DISCORD_API = 'https://discord.com/api/v10';

// Module-level cache for bot guilds (changes rarely, avoids hammering Discord API)
let botGuildsCache: { data: Awaited<ReturnType<typeof getBotGuilds>>; expiresAt: number } | null =
  null;
const BOT_GUILDS_TTL_MS = 60_000; // 1 minute

async function getCachedBotGuilds(env: Env): ReturnType<typeof getBotGuilds> {
  if (botGuildsCache && Date.now() < botGuildsCache.expiresAt) {
    return botGuildsCache.data;
  }
  const data = await getBotGuilds(env);
  botGuildsCache = { data, expiresAt: Date.now() + BOT_GUILDS_TTL_MS };
  return data;
}

async function handleBotGuilds(request: Request, env: Env): Promise<Response> {
  // Require user's Discord Bearer token
  const authHeader = request.headers.get('Authorization');
  if (!authHeader?.startsWith('Bearer ')) {
    return jsonResponse({ error: 'Authorization required. Provide a Discord Bearer token.' }, 401);
  }
  const userToken = authHeader.slice(7);

  try {
    // Fetch user guilds and bot guilds in parallel
    const [userGuildsRes, botGuilds] = await Promise.all([
      fetch(`${DISCORD_API}/users/@me/guilds`, {
        headers: { Authorization: `Bearer ${userToken}` },
      }),
      getCachedBotGuilds(env),
    ]);

    if (!userGuildsRes.ok) {
      return jsonResponse({ error: 'Invalid or expired Discord token.' }, 401);
    }

    const userGuilds = (await userGuildsRes.json()) as {
      id: string;
      name: string;
      icon: string | null;
    }[];
    const botGuildIds = new Set(botGuilds.map((g) => g.id));

    // Return only mutual guilds (user + bot both members)
    const mutual = userGuilds.filter((g) => botGuildIds.has(g.id));
    return jsonResponse({
      guilds: mutual.map((g) => ({ id: g.id, name: g.name, icon: g.icon })),
    });
  } catch (err) {
    console.error('[bot-guilds] error:', err);
    return jsonResponse({ error: 'Failed to fetch guilds' }, 500);
  }
}

// ── Public API: OAuth Token Exchange Proxy ───────────────────────────────────

async function handleOAuthTokenExchange(request: Request, env: Env): Promise<Response> {
  if (request.method !== 'POST') {
    return jsonResponse({ error: 'Method Not Allowed' }, 405);
  }

  let body: { code?: string; redirect_uri?: string };
  try {
    body = (await request.json()) as { code?: string; redirect_uri?: string };
  } catch {
    return jsonResponse({ error: 'Invalid JSON' }, 400);
  }

  if (!body.code || !body.redirect_uri) {
    return jsonResponse({ error: 'code and redirect_uri are required' }, 400);
  }

  // Validate redirect_uri against allowlist
  if (!isAllowedRedirectUri(body.redirect_uri, env)) {
    return jsonResponse({ error: 'Invalid redirect_uri' }, 400);
  }

  try {
    const params = new URLSearchParams({
      client_id: env.DISCORD_APPLICATION_ID,
      client_secret: env.DISCORD_CLIENT_SECRET,
      grant_type: 'authorization_code',
      code: body.code,
      redirect_uri: body.redirect_uri,
    });

    const res = await fetch('https://discord.com/api/oauth2/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: params.toString(),
    });

    const data = (await res.json()) as Record<string, unknown>;
    if (!res.ok) {
      console.error('[oauth-token] Discord error:', JSON.stringify(data));
      const discordError =
        typeof data.error_description === 'string'
          ? data.error_description
          : typeof data.error === 'string'
            ? data.error
            : 'Token exchange failed';
      return jsonResponse({ error: discordError }, 400);
    }

    return jsonResponse({
      access_token: data.access_token,
      token_type: data.token_type,
      expires_in: data.expires_in,
      scope: data.scope,
    });
  } catch (err) {
    console.error('[oauth-token] error:', err);
    return jsonResponse({ error: 'Token exchange failed' }, 500);
  }
}

// ── Roster API ──────────────────────────────────────────────────────────────

async function handleRosterApi(request: Request, url: URL, env: Env): Promise<Response> {
  // Public GET: fetch roster data for direct-publish rosters stored in KV
  const dataMatch = url.pathname.match(/^\/discord\/roster\/([^/]+)\/data$/);
  if (dataMatch && request.method === 'GET') {
    const rosterId = dataMatch[1];
    if (rosterId.length > 64 || !/^[a-zA-Z0-9_-]+$/.test(rosterId))
      return jsonResponse({ error: 'Invalid roster ID' }, 400);
    const rosterData = await env.ROSTERS.get(`${KV_PREFIX.ROSTER_DATA}:${rosterId}`);
    if (!rosterData) return jsonResponse({ error: 'Not found' }, 404);
    return new Response(JSON.stringify({ roster_data: rosterData }), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'public, max-age=300, stale-while-revalidate=60',
      },
    });
  }

  if (request.method !== 'POST') {
    return jsonResponse({ error: 'Method Not Allowed' }, 405);
  }

  let body: Record<string, unknown>;
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return jsonResponse({ error: 'Invalid JSON' }, 400);
  }

  const path = url.pathname;

  // Refresh endpoint supports both webhook secret (server-to-server) and user auth
  if (path === '/discord/roster/refresh') {
    return handleRefresh(body, request, env);
  }

  // Publish endpoints require user authentication
  const guildId = body.guildId as string | undefined;
  if (!guildId) {
    return jsonResponse({ error: 'guildId is required' }, 400);
  }

  const auth = await verifyHttpCaller(env, guildId, request.headers.get('Authorization'));
  if (!auth.authorized) {
    return jsonResponse({ error: auth.error ?? 'Forbidden' }, 403);
  }

  if (path === '/discord/roster/publish') {
    return handlePublish(body, env, auth.userId);
  }
  if (path === '/discord/roster/publish-direct') {
    return handlePublishDirect(body, env, auth.userId);
  }

  return jsonResponse({ error: 'Not Found' }, 404);
}

async function handlePublish(
  body: Record<string, unknown>,
  env: Env,
  ownerUserId?: string | undefined,
): Promise<Response> {
  const guildId = body.guildId as string | undefined;
  const rosterId = body.rosterId as string | undefined;

  if (!guildId || !rosterId) {
    return jsonResponse({ error: 'guildId and rosterId are required' }, 400);
  }

  const req: PublishRequest = {
    guildId,
    rosterId,
    categoryId: (body.categoryId as string | undefined) ?? undefined,
    channelNameOverride: (body.channelNameOverride as string | undefined) ?? undefined,
    ownerUserId: ownerUserId ?? '',
    eventTime: (body.event_time as string | undefined) ?? undefined,
  };

  const result = await publishRoster(env, req);
  if (!result.ok) {
    return jsonResponse({ error: result.error }, 400);
  }

  return jsonResponse({
    ok: true,
    channelId: result.channelId,
    channelName: result.channelName,
    messageId: result.messageId,
  });
}

async function handleRefresh(
  body: Record<string, unknown>,
  request: Request,
  env: Env,
): Promise<Response> {
  const rosterId = body.rosterId as string | undefined;
  if (!rosterId) {
    return jsonResponse({ error: 'rosterId is required' }, 400);
  }

  // Accept either webhook secret (server-to-server) or user Discord token
  const authHeader = request.headers.get('Authorization');
  const isWebhook = await verifyWebhookSecret(env, authHeader);

  if (!isWebhook) {
    // For user-initiated refresh, require an explicit guildId
    const guildId = body.guildId as string | undefined;
    if (!guildId) {
      return jsonResponse({ error: 'guildId is required for user-initiated refresh' }, 400);
    }
    const auth = await verifyHttpCaller(env, guildId, authHeader);
    if (!auth.authorized) {
      return jsonResponse({ error: auth.error ?? 'Forbidden' }, 403);
    }
  }

  const result = await refreshRoster(env, rosterId);
  if (!result.ok) {
    return jsonResponse({ error: result.error }, 400);
  }

  return jsonResponse({ ok: true, refreshedCount: result.refreshedCount });
}

async function handlePublishDirect(
  body: Record<string, unknown>,
  env: Env,
  ownerUserId?: string | undefined,
): Promise<Response> {
  const guildId = body.guildId as string | undefined;
  const title = body.title as string | undefined;
  const rosterData = body.roster_data as string | undefined;

  if (!guildId || !title || !rosterData) {
    return jsonResponse({ error: 'guildId, title, and roster_data are required' }, 400);
  }

  if (rosterData.length > 500_000) {
    return jsonResponse({ error: 'roster_data exceeds maximum allowed size' }, 400);
  }

  const rawTags = Array.isArray(body.tags) ? (body.tags as string[]).filter(Boolean) : undefined;

  const req: DirectPublishRequest = {
    guildId,
    title,
    description: (body.description as string | undefined) ?? undefined,
    trial_id: (body.trial_id as string | undefined) ?? undefined,
    tags: rawTags,
    roster_data: rosterData,
    author_name: (body.author_name as string | undefined) ?? undefined,
    channelNameOverride: (body.channelNameOverride as string | undefined) ?? undefined,
    categoryId: (body.categoryId as string | undefined) ?? undefined,
    ownerUserId: ownerUserId ?? '',
    eventTime: (body.event_time as string | undefined) ?? undefined,
  };

  const result = await publishDirect(env, req);
  if (!result.ok) {
    return jsonResponse({ error: result.error }, 400);
  }

  return jsonResponse({
    ok: true,
    channelId: result.channelId,
    channelName: result.channelName,
    messageId: result.messageId,
  });
}

// ── Guild config API ────────────────────────────────────────────────────────

function extractGuildId(pathname: string): string | null {
  // Matches /discord/guild/{guildId}/... — snowflake IDs are numeric
  const match = pathname.match(/^\/discord\/guild\/(\d+)\//);
  return match?.[1] ?? null;
}

async function handleGuildApi(request: Request, url: URL, env: Env): Promise<Response> {
  const guildId = extractGuildId(url.pathname);
  if (!guildId) return jsonResponse({ error: 'Invalid guild ID.' }, 400);

  // All guild config routes require admin auth
  const auth = await verifyHttpCaller(env, guildId, request.headers.get('Authorization'));
  if (!auth.authorized) {
    return jsonResponse({ error: auth.error ?? 'Unauthorized.' }, 403);
  }

  const subpath = url.pathname.slice(`/discord/guild/${guildId}/`.length);

  if (subpath === 'channels' && request.method === 'GET') {
    const channels = await getGuildChannels(env, guildId);
    // Return text channels (type 0) and categories (type 4) for grouping
    const filtered = channels
      .filter((c) => c.type === 0 || c.type === 4)
      .map((c) => ({
        id: c.id,
        name: c.name,
        type: c.type,
        parent_id: c.parent_id,
        position: c.position,
      }))
      .sort((a, b) => (a.position ?? 0) - (b.position ?? 0));
    return jsonResponse({ channels: filtered });
  }

  if (subpath === 'roles' && request.method === 'GET') {
    const roles = await getGuildRoles(env, guildId);
    // Filter out @everyone (id === guildId) and managed/bot roles
    const filtered = roles
      .filter(
        (r) => r.id !== guildId && !('managed' in r && (r as Record<string, unknown>).managed),
      )
      .map((r) => ({ id: r.id, name: r.name, color: (r as Record<string, unknown>).color ?? 0 }));
    return jsonResponse({ roles: filtered });
  }

  if (subpath === 'config' && request.method === 'GET') {
    const config = (await getGuildConfig(env, guildId)) ?? getDefaultGuildConfig(guildId);
    return jsonResponse({ config });
  }

  if (subpath === 'config' && request.method === 'PUT') {
    let body: Record<string, unknown>;
    try {
      body = (await request.json()) as Record<string, unknown>;
    } catch {
      return jsonResponse({ error: 'Invalid JSON body.' }, 400);
    }

    const existing = (await getGuildConfig(env, guildId)) ?? getDefaultGuildConfig(guildId);
    const updated = {
      ...existing,
      guildId,
      ...(typeof body.defaultChannelId === 'string' && { defaultChannelId: body.defaultChannelId }),
      ...(typeof body.defaultCategoryId === 'string' && {
        defaultCategoryId: body.defaultCategoryId,
      }),
      ...(typeof body.namePattern === 'string' &&
        body.namePattern.length <= 100 && { namePattern: body.namePattern }),
      ...(Array.isArray(body.allowedRoleIds) && {
        allowedRoleIds: (body.allowedRoleIds as unknown[])
          .filter((id): id is string => typeof id === 'string' && /^\d+$/.test(id)),
      }),
      ...(typeof body.rolePingIds === 'object' &&
        body.rolePingIds !== null && {
          rolePingIds: body.rolePingIds as GuildConfig['rolePingIds'],
        }),
      ...(typeof body.timezone === 'string' && { timezone: body.timezone }),
    };

    await upsertGuildConfig(env, updated);
    return jsonResponse({ ok: true, config: updated });
  }

  return jsonResponse({ error: 'Not found.' }, 404);
}

// ── CORS helpers ────────────────────────────────────────────────────────────

function getCorsOrigin(request: Request, env: Env): string | null {
  const origin = request.headers.get('Origin');
  if (origin && getAllowedOrigins(env).has(origin)) return origin;
  return null;
}

function handleCorsPreflight(request: Request, env: Env): Response {
  const origin = getCorsOrigin(request, env);
  if (!origin) return new Response(null, { status: 204 });
  return new Response(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': origin,
      'Access-Control-Allow-Methods': 'GET, POST, PUT, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      'Access-Control-Max-Age': '86400',
    },
  });
}

function withCors(request: Request, env: Env, response: Response): Response {
  const origin = getCorsOrigin(request, env);
  if (!origin) return response;
  const headers = new Headers(response.headers);
  headers.set('Access-Control-Allow-Origin', origin);
  headers.set('X-Content-Type-Options', 'nosniff');
  headers.set('X-Frame-Options', 'DENY');
  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  });
}

function jsonResponse(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}
