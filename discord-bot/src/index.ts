/**
 * ESO Toolkit Discord Bot — Cloudflare Worker entry point.
 *
 * Handles two types of requests:
 *   1. Discord HTTP Interactions (POST /, with Ed25519 signature)
 *   2. Internal HTTP API (POST /discord/roster/*, no signature)
 */

import { handleButton } from './handlers/buttons.js';
import { handleCommand } from './handlers/commands.js';
import { handleModal } from './handlers/modals.js';
import { publishRoster, refreshRoster, publishDirect } from './roster/index.js';
import type { PublishRequest, DirectPublishRequest } from './roster/index.js';
import { InteractionType } from './types.js';
import type { DiscordInteraction, Env } from './types.js';
import { verifyDiscordSignature } from './verify.js';

export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    const url = new URL(request.url);

    // ── Internal HTTP API routes ──────────────────────────────────────────
    if (url.pathname.startsWith('/discord/roster/')) {
      return handleRosterApi(request, url, env, ctx);
    }

    // ── Discord Interactions (default) ────────────────────────────────────
    if (request.method !== 'POST') {
      return new Response('Method Not Allowed', { status: 405 });
    }

    // Signature verification
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

    // Parse interaction
    let interaction: DiscordInteraction;
    try {
      interaction = JSON.parse(body) as DiscordInteraction;
    } catch {
      return new Response('Invalid JSON body', { status: 400 });
    }

    // Route
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

// ── Internal HTTP API for Roster Operations ─────────────────────────────────

async function handleRosterApi(
  request: Request,
  url: URL,
  env: Env,
  _ctx: ExecutionContext,
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

  return jsonResponse({
    ok: true,
    channelId: result.channelId,
    messageId: result.messageId,
  });
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

  return jsonResponse({
    ok: true,
    channelId: result.channelId,
    messageId: result.messageId,
  });
}

function jsonResponse(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}
