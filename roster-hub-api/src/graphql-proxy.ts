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

// ─── Response caching ────────────────────────────────────────────────────────

// Event data queries are immutable once a report is uploaded; safe to cache.
const CACHEABLE_OPERATIONS = new Set([
  'getBuffEvents',
  'getDebuffEvents',
  'getDamageEvents',
  'getResourceEvents',
  'getCombatantInfoEvents',
  'getCastEvents',
  'getHealingEvents',
  'getDeathEvents',
  'getPlayersForReport',
  'getReportByCode',
  'getReportMasterData',
]);

const CACHE_TTL_SECONDS = 600; // 10 minutes

// Singleflight: coalesce concurrent identical cacheable requests so only one
// hits upstream. Each caller clones the shared response.
const inflight = new Map<string, Promise<Response>>();

async function buildCacheKey(url: string, bodyStr: string): Promise<string> {
  const data = new TextEncoder().encode(bodyStr);
  const hash = await crypto.subtle.digest('SHA-256', data);
  const hex = [...new Uint8Array(hash)].map((b) => b.toString(16).padStart(2, '0')).join('');
  return `${url}:${hex}`;
}

// ─── Proxy handler ────────────────────────────────────────────────────────────

export async function handleGraphqlProxy(
  c: Context<{ Bindings: Env }>,
  rateCounts: Map<string, { count: number; expires: number }>,
  rateLimit: number,
): Promise<Response> {
  let body: unknown;
  let bodyStr: string;
  try {
    bodyStr = await c.req.text();
    body = JSON.parse(bodyStr);
  } catch {
    return c.json({ error: 'Invalid JSON body' }, 400);
  }

  const operationHint = c.req.query('query');
  const isCacheable = Boolean(operationHint && CACHEABLE_OPERATIONS.has(operationHint));

  // Check edge cache BEFORE rate limiting — cache hits are free
  const cache = caches.default;
  let cacheKey: Request | undefined;
  if (isCacheable) {
    const key = await buildCacheKey(c.req.url, bodyStr);
    cacheKey = new Request(`https://cache.internal/${key}`, { method: 'GET' });
    const cached = await cache.match(cacheKey);
    if (cached) return cached;
  }

  // Cache miss — apply per-IP rate limiting
  const ip =
    c.req.header('CF-Connecting-IP') ??
    c.req.header('X-Forwarded-For')?.split(',')[0]?.trim() ??
    'unknown';
  const now = Date.now();

  // Probabilistic cleanup (~1-in-50 requests) instead of sweeping
  // every request. The per-IP bucket check below already handles
  // expiry for the current caller; stale entries from other IPs only
  // waste memory, so lazy cleanup is fine.
  if (Math.random() < 0.02) {
    for (const [k, val] of rateCounts) {
      if (val.expires <= now) rateCounts.delete(k);
    }
  }

  const bucket = rateCounts.get(ip);
  if (bucket && bucket.expires > now) {
    if (bucket.count >= rateLimit) {
      return c.json(
        { error: `Rate limit exceeded. Max ${rateLimit} GraphQL requests per minute.` },
        { status: 429, headers: { 'Retry-After': '60', 'X-Rate-Limit-Source': 'proxy' } },
      );
    }
    bucket.count++;
  } else {
    rateCounts.set(ip, { count: 1, expires: now + 60_000 });
  }

  // Singleflight: if an identical cacheable request is already in-flight,
  // piggyback on it instead of issuing a duplicate upstream fetch.
  const flightKey = isCacheable ? await buildCacheKey(c.req.url, bodyStr) : null;
  if (flightKey) {
    const pending = inflight.get(flightKey);
    if (pending) return (await pending).clone();
  }

  const doFetch = async (): Promise<Response> => {
    let token: string;
    try {
      token = await getCachedClientToken(c.env);
    } catch {
      return c.json({ error: 'Failed to obtain upstream API token' }, 502);
    }

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
    const response = new Response(responseBody, {
      status: upstream.status,
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': isCacheable ? `public, max-age=${CACHE_TTL_SECONDS}` : 'no-store',
      },
    });

    // Store successful cacheable responses
    if (isCacheable && upstream.status === 200 && cacheKey) {
      c.executionCtx.waitUntil(cache.put(cacheKey, response.clone()));
    }

    return response;
  };

  if (flightKey) {
    const promise = doFetch();
    inflight.set(flightKey, promise);
    try {
      const response = await promise;
      return response.clone();
    } finally {
      inflight.delete(flightKey);
    }
  }

  return doFetch();
}
