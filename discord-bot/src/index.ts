/**
 * ESO Toolkit Discord Bot — Cloudflare Worker entry point.
 *
 * Handles Discord HTTP Interactions:
 *   1. Verify Ed25519 signature (required by Discord)
 *   2. Respond to PING
 *   3. Route to command / button / modal handlers
 */

import { handleButton } from './handlers/buttons.js';
import { handleCommand } from './handlers/commands.js';
import { handleModal } from './handlers/modals.js';
import { InteractionType } from './types.js';
import type { DiscordInteraction, Env } from './types.js';
import { verifyDiscordSignature } from './verify.js';

export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    // Only accept POST requests from Discord
    if (request.method !== 'POST') {
      return new Response('Method Not Allowed', { status: 405 });
    }

    // ── Signature verification ───────────────────────────────────────────────
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

    // ── Parse interaction ────────────────────────────────────────────────────
    let interaction: DiscordInteraction;
    try {
      interaction = JSON.parse(body) as DiscordInteraction;
    } catch {
      return new Response('Invalid JSON body', { status: 400 });
    }

    // ── Route ────────────────────────────────────────────────────────────────
    try {
      const response = await routeInteraction(env, interaction, ctx);
      return new Response(JSON.stringify(response), {
        headers: { 'Content-Type': 'application/json' },
      });
    } catch (err) {
      console.error('[index] unhandled error:', err);
      // Return a generic ephemeral error so Discord doesn't show a blank interaction
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

async function routeInteraction(
  env: Env,
  interaction: DiscordInteraction,
  ctx: ExecutionContext,
): Promise<unknown> {
  switch (interaction.type) {
    // Discord PING — must respond with PONG immediately
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
