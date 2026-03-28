/**
 * ESO Toolkit Discord Bot — Cloudflare Worker entry point.
 *
 * Handles three types of requests:
 *   1. Discord HTTP Interactions (POST /, with Ed25519 signature)
 *   2. Internal HTTP API (POST /discord/roster/*, no signature)
 *   3. Public API (GET /discord/bot/*, POST /discord/oauth/*, CORS-enabled)
 */

import { getBotGuilds } from './discord.js';
import { handleButton } from './handlers/buttons.js';
import { handleCommand } from './handlers/commands.js';
import { handleModal } from './handlers/modals.js';
import { publishRoster, refreshRoster, publishDirect } from './roster/index.js';
import type { PublishRequest, DirectPublishRequest } from './roster/index.js';
import { InteractionType } from './types.js';
import type { DiscordInteraction, Env } from './types.js';
import { verifyDiscordSignature } from './verify.js';

// Allowed origins for CORS (frontend domains)
const CORS_ORIGINS = new Set([
  'https://esohelpers.com',
  'https://www.esohelpers.com',
  'https://eso-toolkit.github.io',
  'http://localhost:3000',
  'http://localhost:3001',
  'http://localhost:3002',
  'http://localhost:3003',
  'http://localhost:5173',
]);

export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    const url = new URL(request.url);

    // ── CORS preflight ───────────────────────────────────────────────────
    if (request.method === 'OPTIONS') {
      return handleCorsPrelight(request);
    }

    // ── Public API routes (CORS-enabled) ─────────────────────────────────
    if (url.pathname === '/discord/bot/guilds') {
      return withCors(request, await handleBotGuilds(env));
    }
    if (url.pathname === '/discord/oauth/token') {
      return withCors(request, await handleOAuthTokenExchange(request, env));
    }

    // ── Roster API routes ────────────────────────────────────────────────
    if (url.pathname.startsWith('/discord/roster/')) {
      return withCors(request, await handleRosterApi(request, url, env));
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
            flags: 64,
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
        data: { content: '❌ Unsupported interaction type.', flags: 64 },
      };
  }
}

// ── Public API: Bot Guilds ──────────────────────────────────────────────────

async function handleBotGuilds(env: Env): Promise<Response> {
  try {
    const guilds = await getBotGuilds(env);
    return jsonResponse({
      guilds: guilds.map((g) => ({ id: g.id, name: g.name, icon: g.icon })),
    });
  } catch (err) {
    console.error('[bot-guilds] error:', err);
    return jsonResponse({ error: 'Failed to fetch bot guilds' }, 500);
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

    const data = await res.json();
    if (!res.ok) {
      console.error('[oauth-token] Discord error:', data);
      return jsonResponse({ error: 'Token exchange failed' }, 400);
    }

    return jsonResponse(data);
  } catch (err) {
    console.error('[oauth-token] error:', err);
    return jsonResponse({ error: 'Token exchange failed' }, 500);
  }
}

// ── Roster API ──────────────────────────────────────────────────────────────

async function handleRosterApi(
  request: Request,
  url: URL,
  env: Env,
): Promise<Response> {
  if (request.method !== 'POST') {
    return jsonResponse({ error: 'Method Not Allowed' }, 405);
  }

  const path = url.pathname;

  if (path === '/discord/roster/publish') {
    return handlePublish(request, env);
  }
  if (path === '/discord/roster/refresh') {
    return handleRefresh(request, env);
  }
  if (path === '/discord/roster/publish-direct') {
    return handlePublishDirect(request, env);
  }

  return jsonResponse({ error: 'Not Found' }, 404);
}

async function handlePublish(request: Request, env: Env): Promise<Response> {
  let body: PublishRequest;
  try {
    body = (await request.json()) as PublishRequest;
  } catch {
    return jsonResponse({ error: 'Invalid JSON' }, 400);
  }

  if (!body.guildId || !body.rosterId) {
    return jsonResponse({ error: 'guildId and rosterId are required' }, 400);
  }

  const result = await publishRoster(env, body);
  if (!result.ok) {
    return jsonResponse({ error: result.error }, 400);
  }

  return jsonResponse({ ok: true, channelId: result.channelId, messageId: result.messageId });
}

async function handleRefresh(request: Request, env: Env): Promise<Response> {
  let body: { rosterId?: string };
  try {
    body = (await request.json()) as { rosterId?: string };
  } catch {
    return jsonResponse({ error: 'Invalid JSON' }, 400);
  }

  if (!body.rosterId) {
    return jsonResponse({ error: 'rosterId is required' }, 400);
  }

  const result = await refreshRoster(env, body.rosterId);
  if (!result.ok) {
    return jsonResponse({ error: result.error }, 400);
  }

  return jsonResponse({ ok: true, refreshedCount: result.refreshedCount });
}

async function handlePublishDirect(request: Request, env: Env): Promise<Response> {
  let body: DirectPublishRequest;
  try {
    body = (await request.json()) as DirectPublishRequest;
  } catch {
    return jsonResponse({ error: 'Invalid JSON' }, 400);
  }

  if (!body.guildId || !body.title || !body.roster_data || !body.trial_id) {
    return jsonResponse({ error: 'guildId, title, trial_id, and roster_data are required' }, 400);
  }

  const result = await publishDirect(env, body);
  if (!result.ok) {
    return jsonResponse({ error: result.error }, 400);
  }

  return jsonResponse({ ok: true, channelId: result.channelId, messageId: result.messageId });
}

// ── CORS helpers ────────────────────────────────────────────────────────────

function getCorsOrigin(request: Request): string | null {
  const origin = request.headers.get('Origin');
  if (origin && CORS_ORIGINS.has(origin)) return origin;
  return null;
}

function handleCorsPrelight(request: Request): Response {
  const origin = getCorsOrigin(request);
  if (!origin) return new Response(null, { status: 204 });
  return new Response(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': origin,
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      'Access-Control-Max-Age': '86400',
    },
  });
}

function withCors(request: Request, response: Response): Response {
  const origin = getCorsOrigin(request);
  if (!origin) return response;
  const headers = new Headers(response.headers);
  headers.set('Access-Control-Allow-Origin', origin);
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
