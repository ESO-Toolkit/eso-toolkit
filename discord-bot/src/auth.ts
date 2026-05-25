/**
 * Authorization helpers for the roster feature.
 *
 * Two auth paths:
 *   1. Discord interactions (slash commands, buttons) — check member roles from the interaction payload
 *   2. HTTP API calls (web UI publish) — verify the caller's Discord Bearer token server-side
 *
 * Permission tiers (from most to least privileged):
 *   - MANAGE_GUILD (admin)  → /roster config (set-role, set-name-pattern, etc.)
 *   - allowedRole OR MANAGE_GUILD → /roster publish, /roster refresh, publish-direct
 *   - Webhook secret (server-to-server) → /roster refresh (from roster-hub-api)
 *
 * If no `allowedRoleIds` are configured, all role-gated actions fall back to
 * requiring MANAGE_GUILD (admin-only until a role is set up via /roster config set-role).
 */

import { getGuildMember, Permission } from './discord.js';
import { getGuildConfig } from './roster/kv.js';
import type { DiscordInteraction, Env } from './types.js';

const DISCORD_API = 'https://discord.com/api/v10';

// ── Interaction-based permission check (slash commands + buttons) ──────────

/**
 * Check if an interaction member has permission to manage rosters.
 * Uses the member's roles from the interaction payload (no API calls needed).
 */
export function hasRosterPermission(
  interaction: DiscordInteraction,
  allowedRoleIds: string[] | undefined,
): boolean {
  const memberRoles = interaction.member?.roles ?? [];

  // If specific roles are configured, check for overlap
  if (allowedRoleIds && allowedRoleIds.length > 0) {
    return memberRoles.some((r) => allowedRoleIds.includes(r));
  }

  // Fallback: require MANAGE_GUILD
  const perms = interaction.member?.permissions;
  if (!perms) return false;
  return (BigInt(perms) & Permission.MANAGE_GUILD) === Permission.MANAGE_GUILD;
}

// ── HTTP-based permission check (web UI publish) ──────────────────────────

export interface HttpAuthResult {
  authorized: boolean;
  userId?: string | undefined;
  error?: string | undefined;
}

/**
 * Verify that an HTTP caller has permission to publish to the given guild.
 *
 * Flow:
 *   1. Extract Bearer token from Authorization header
 *   2. Call Discord /users/@me to get user ID
 *   3. Load guild config to check allowedRoleIds
 *   4. If roles configured: fetch member via bot token, check role overlap
 *   5. If no roles: check MANAGE_GUILD via user's guild list
 */
export async function verifyHttpCaller(
  env: Env,
  guildId: string,
  authHeader: string | null,
): Promise<HttpAuthResult> {
  if (!authHeader?.startsWith('Bearer ')) {
    return { authorized: false, error: 'Missing or invalid Authorization header.' };
  }
  const userToken = authHeader.slice(7);

  // 1. Get user identity
  const meRes = await fetch(`${DISCORD_API}/users/@me`, {
    headers: { Authorization: `Bearer ${userToken}` },
  });
  if (!meRes.ok) {
    return { authorized: false, error: 'Invalid or expired Discord token.' };
  }
  const me = (await meRes.json()) as { id: string };

  // 2. Load guild config
  const config = await getGuildConfig(env, guildId);
  const allowedRoles = config?.allowedRoleIds;

  if (allowedRoles && allowedRoles.length > 0) {
    // 3a. Roles are configured — check member's roles via bot token
    try {
      const member = await getGuildMember(env, guildId, me.id);
      const hasRole = member.roles.some((r) => allowedRoles.includes(r));
      if (!hasRole) {
        return {
          authorized: false,
          userId: me.id,
          error: 'You do not have the required role to publish rosters in this server.',
        };
      }
      return { authorized: true, userId: me.id };
    } catch {
      return { authorized: false, userId: me.id, error: 'You are not a member of this server.' };
    }
  }

  // 3b. No roles configured — check MANAGE_GUILD via user's guild list
  const guildsRes = await fetch(`${DISCORD_API}/users/@me/guilds`, {
    headers: { Authorization: `Bearer ${userToken}` },
  });
  if (!guildsRes.ok) {
    return { authorized: false, userId: me.id, error: 'Failed to verify guild permissions.' };
  }

  const guilds = (await guildsRes.json()) as { id: string; permissions: string }[];
  const guild = guilds.find((g) => g.id === guildId);
  if (!guild) {
    return { authorized: false, userId: me.id, error: 'You are not a member of this server.' };
  }

  const hasManage =
    (BigInt(guild.permissions) & Permission.MANAGE_GUILD) === Permission.MANAGE_GUILD;
  if (!hasManage) {
    return {
      authorized: false,
      userId: me.id,
      error:
        'No allowed roles are configured for this server. Only server admins can publish until a role is set up with /roster config set-role.',
    };
  }

  return { authorized: true, userId: me.id };
}

// ── Webhook secret check (server-to-server calls) ─────────────────────────

/**
 * Verify a webhook request from roster-hub-api using a shared secret.
 * Uses crypto.subtle.timingSafeEqual for constant-time comparison.
 */
export async function verifyWebhookSecret(env: Env, authHeader: string | null): Promise<boolean> {
  if (!env.WEBHOOK_SECRET) return false;
  if (!authHeader) return false;
  const expected = `Bearer ${env.WEBHOOK_SECRET}`;
  const enc = new TextEncoder();
  const a = enc.encode(authHeader);
  const b = enc.encode(expected);
  if (a.byteLength !== b.byteLength) return false;
  // timingSafeEqual is available in Cloudflare Workers runtime
  return (
    crypto.subtle as unknown as { timingSafeEqual(a: ArrayBuffer, b: ArrayBuffer): boolean }
  ).timingSafeEqual(a.buffer as ArrayBuffer, b.buffer as ArrayBuffer);
}
