/**
 * Cloudflare Worker proxy for ESO Logs GraphQL API.
 *
 * Injects a server-side client-credentials token so the frontend can query
 * public data on /api/v2/client without requiring the user to log in.
 *
 * Token is cached in module scope (within a V8 isolate) and refreshed 60 s
 * before expiry to avoid stale-token errors at the edge.
 */

import type { Context } from 'hono';

import type { Env } from './types';

const ESOLOGS_TOKEN_URL = 'https://www.esologs.com/oauth/token';
const ESOLOGS_CLIENT_API = 'https://www.esologs.com/api/v2/client';

// ─── Token cache (module scope) ───────────────────────────────────────────────

let cachedToken: string | null = null;
let tokenExpiresAt = 0; // Unix ms

async function getCachedClientToken(env: Env): Promise<string> {
  const now = Date.now();
  if (cachedToken && now < tokenExpiresAt) return cachedToken;

  const res = await fetch(ESOLOGS_TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'client_credentials',
      client_id: env.ESOLOGS_CLIENT_ID,
      client_secret: env.ESOLOGS_CLIENT_SECRET,
    }),
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`ESO Logs OAuth failed (${res.status}): ${body}`);
  }

  const json = (await res.json()) as { access_token: string; expires_in?: number };
  if (!json.access_token) throw new Error('ESO Logs OAuth: no access_token in response');

  const expiresIn = json.expires_in ?? 3600;
  cachedToken = json.access_token;
  tokenExpiresAt = now + (expiresIn - 60) * 1000; // refresh 60 s early

  return cachedToken;
}

// ─── Proxy handler ────────────────────────────────────────────────────────────

export async function handleGraphqlProxy(c: Context<{ Bindings: Env }>): Promise<Response> {
  let body: unknown;
  try {
    body = await c.req.json();
  } catch {
    return c.json({ error: 'Invalid JSON body' }, 400);
  }

  let token: string;
  try {
    token = await getCachedClientToken(c.env);
  } catch {
    return c.json({ error: 'Failed to obtain upstream API token' }, 502);
  }

  // Forward the ?query=<operationName> hint if present (used by ESO Logs for tracing)
  const operationHint = c.req.query('query');
  const upstreamUrl = operationHint
    ? `${ESOLOGS_CLIENT_API}?query=${encodeURIComponent(operationHint)}`
    : ESOLOGS_CLIENT_API;

  const upstream = await fetch(upstreamUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(body),
  });

  // Invalidate cached token on 401 so the next request triggers a fresh fetch
  if (upstream.status === 401) {
    cachedToken = null;
    tokenExpiresAt = 0;
  }

  const responseBody = await upstream.text();
  return new Response(responseBody, {
    status: upstream.status,
    headers: { 'Content-Type': 'application/json' },
  });
}
