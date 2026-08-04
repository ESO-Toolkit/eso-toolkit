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

import { ALLOWED_OPERATIONS } from './graphql-allowed-operations';
import { hashGraphqlDocument } from './graphql-document-hash';
import { GRAPHQL_QUERY_HASHES } from './graphql-query-manifest';
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
// Profile log lists are mutable (a user can upload new logs) but tolerate the
// short CACHE_TTL_SECONDS staleness in exchange for far less upstream pressure
// on popular profiles.
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
  'getProfileUploadedReports',
]);

const CACHE_TTL_SECONDS = 600; // 10 minutes

const MAX_BODY_BYTES = 100_000; // 100 KB

const OPERATION_NAME_RE = /\b(?:query|mutation|subscription)\s+([A-Za-z_]\w*)/g;

function extractOperationNames(queryDoc: string): string[] {
  const names: string[] = [];
  let match;
  while ((match = OPERATION_NAME_RE.exec(queryDoc)) !== null) {
    names.push(match[1]);
  }
  OPERATION_NAME_RE.lastIndex = 0;
  return names;
}

// Singleflight: coalesce concurrent identical cacheable requests so only one
// hits upstream. Each caller clones the shared response.
const inflight = new Map<string, Promise<Response>>();

async function buildCacheKey(url: string, bodyStr: string): Promise<string> {
  const data = new TextEncoder().encode(bodyStr);
  const hash = await crypto.subtle.digest('SHA-256', data);
  const hex = [...new Uint8Array(hash)].map((b) => b.toString(16).padStart(2, '0')).join('');
  return `${url}:${hex}`;
}

/**
 * True when a `getReportByCode` response contains at least one fight.
 *
 * ESO Logs returns an empty `fights` list while a freshly uploaded log is still
 * being processed. Caching that transient empty state would keep serving a stale
 * "No fights available" detail for the whole cache TTL — even after the log
 * finishes parsing and gains fights — which is exactly what makes a recent report
 * in Latest Reports open into an empty page. We therefore refuse to cache an
 * empty-fights report so the next request re-fetches fresh data.
 *
 * Returns false on any parse failure (treat as not-cacheable) so we never cache a
 * response we could not verify.
 */
function reportResponseHasFights(responseBody: string): boolean {
  try {
    const parsed = JSON.parse(responseBody) as {
      data?: { reportData?: { report?: { fights?: unknown } | null } | null };
    };
    const fights = parsed?.data?.reportData?.report?.fights;
    return Array.isArray(fights) && fights.length > 0;
  } catch {
    return false;
  }
}

// ─── Per-IP rate limiting (token bucket, best-effort per-isolate) ─────────────
//
// The proxy forwards every request to esologs.com with the site's shared
// client-credentials token, so the upstream OAuth points budget is common to all
// callers. `/graphql` has no auth, so without a limiter a single client can spend
// that shared budget arbitrarily fast and take report loading down for everyone.
// This bucket caps per-IP request rate. Like the token cache above it lives in V8
// isolate scope, so it is a coarse best-effort control (each edge isolate keeps its
// own buckets), not a globally-consistent limiter.
//
// A token is spent only when a request actually reaches upstream — cache hits
// and singleflight piggybacks cost the shared budget nothing, so charging them
// would only punish normal use. The budget also has to fit one honest cold
// load: the buff slices split a fight into 30s intervals and issue them with
// Promise.all (friendly AND hostile), so a 16-minute fight alone is ~64
// requests before the report's other queries, and each can paginate. An
// interval that gets a 429 is swallowed into an empty event list, so a bucket
// too small does not merely slow the page down — it silently renders a fight
// with missing events.
const RATE_LIMIT_CAPACITY = 240; // burst size (tokens)
const RATE_LIMIT_REFILL_PER_SEC = 4; // sustained ≈ 240 upstream requests / minute per IP
const RATE_LIMIT_MAX_IPS = 10_000; // bound the Map so unique-IP floods can't grow it unbounded

interface TokenBucket {
  tokens: number;
  updatedAt: number; // Unix ms
}

const ipBuckets = new Map<string, TokenBucket>();

/** Consume one token for `ip`; returns false when the bucket is empty (rate limited). */
function allowRequestFromIp(ip: string): boolean {
  const now = Date.now();
  let bucket = ipBuckets.get(ip);
  if (!bucket) {
    if (ipBuckets.size >= RATE_LIMIT_MAX_IPS) {
      // Evict the oldest entry to bound memory (Map preserves insertion order).
      const oldest = ipBuckets.keys().next().value;
      if (oldest !== undefined) ipBuckets.delete(oldest);
    }
    bucket = { tokens: RATE_LIMIT_CAPACITY, updatedAt: now };
    ipBuckets.set(ip, bucket);
  } else {
    const elapsedSec = (now - bucket.updatedAt) / 1000;
    bucket.tokens = Math.min(
      RATE_LIMIT_CAPACITY,
      bucket.tokens + elapsedSec * RATE_LIMIT_REFILL_PER_SEC,
    );
    bucket.updatedAt = now;
  }
  if (bucket.tokens < 1) return false;
  bucket.tokens -= 1;
  return true;
}

// GraphQL introspection has no place in a persisted-query proxy; block it so a
// caller can't map the schema through the site's credentials.
const INTROSPECTION_RE = /\b__schema\b|\b__type\b/;

// ─── Persisted-query pinning ─────────────────────────────────────────────────
//
// Validating only the operation NAME left the proxy wide open: any body at all
// could be sent under, say, `getReportByCode` and it would be forwarded to ESO
// Logs with the site's client-credentials token — an unmetered query proxy on
// our OAuth budget. Every allowlisted operation therefore has its document
// hash(es) pinned in the generated manifest, and a body that does not hash to
// one of them is refused.
//
// `GRAPHQL_HASH_PINNING=off` is a last-resort escape hatch that restores
// name-only validation without a code change.
//
// DEPLOY SKEW: Pages auto-deploys on merge to main, the Worker deploy is
// manual, so the frontend's documents routinely move before this Worker's
// bundled manifest does. Pinning against the bundle alone would turn any query
// edit into a site outage. The frontend therefore publishes the same manifest
// at /graphql-manifest.json, and the accepted set is the UNION of:
//   - the manifest bundled with this Worker (the previous release, and the
//     answer when the site is unreachable)
//   - the manifest the live frontend is currently serving
// which covers skew in both directions. Only our own origin can widen the set,
// and a frontend that can be made to serve an attacker's manifest is already a
// full compromise of the site.
const RUNTIME_MANIFEST_URL = 'https://esotk.com/graphql-manifest.json';
const RUNTIME_MANIFEST_TTL_MS = 5 * 60 * 1000;

interface PublishedManifest {
  version?: number;
  operations?: Record<string, string[]>;
}

let runtimeManifest: Record<string, string[]> = {};
let runtimeManifestFetchedAt = 0;
let runtimeManifestInFlight: Promise<void> | null = null;

/**
 * Refresh the published manifest at most once per TTL. Any failure leaves the
 * previous value in place — a frontend that is down or slow must never turn
 * into a 400 storm on the proxy.
 */
async function refreshRuntimeManifest(env: Env): Promise<void> {
  const now = Date.now();
  if (now - runtimeManifestFetchedAt < RUNTIME_MANIFEST_TTL_MS) return;
  if (runtimeManifestInFlight) return runtimeManifestInFlight;

  runtimeManifestInFlight = (async () => {
    try {
      const res = await fetch(env.GRAPHQL_MANIFEST_URL || RUNTIME_MANIFEST_URL, {
        cf: { cacheTtl: 300, cacheEverything: true },
      });
      if (!res.ok) return;
      const parsed = (await res.json()) as PublishedManifest;
      const operations = parsed?.operations;
      if (!operations || typeof operations !== 'object') return;
      const next: Record<string, string[]> = {};
      for (const [operation, hashes] of Object.entries(operations)) {
        if (!ALLOWED_OPERATIONS.has(operation)) continue; // never widen the allowlist itself
        if (!Array.isArray(hashes)) continue;
        const clean = hashes.filter((h) => typeof h === 'string' && /^[0-9a-f]{64}$/.test(h));
        if (clean.length) next[operation] = clean;
      }
      runtimeManifest = next;
    } catch {
      // keep the last known good manifest
    } finally {
      runtimeManifestFetchedAt = Date.now();
      runtimeManifestInFlight = null;
    }
  })();

  return runtimeManifestInFlight;
}

async function documentMatchesPin(env: Env, operation: string, queryDoc: string): Promise<boolean> {
  const bundled = GRAPHQL_QUERY_HASHES[operation] ?? [];
  const hash = await hashGraphqlDocument(queryDoc);
  if (bundled.includes(hash)) return true;

  await refreshRuntimeManifest(env);
  return (runtimeManifest[operation] ?? []).includes(hash);
}

// ─── Proxy handler ────────────────────────────────────────────────────────────

export async function handleGraphqlProxy(c: Context<{ Bindings: Env }>): Promise<Response> {
  const clientIp = c.req.header('CF-Connecting-IP') ?? c.req.header('x-forwarded-for') ?? 'unknown';

  let body: unknown;
  let bodyStr: string;
  try {
    bodyStr = await c.req.text();
    if (bodyStr.length > MAX_BODY_BYTES) {
      return c.json({ error: 'Request body too large' }, 413);
    }
    body = JSON.parse(bodyStr);
  } catch {
    return c.json({ error: 'Invalid JSON body' }, 400);
  }

  const operationHint = c.req.query('query');

  if (!operationHint || !ALLOWED_OPERATIONS.has(operationHint)) {
    return c.json({ error: 'Unknown or missing operation' }, 400);
  }

  const parsed = body as { operationName?: string; query?: string };
  if (!parsed.operationName || parsed.operationName !== operationHint) {
    return c.json({ error: 'operationName must match the query parameter' }, 400);
  }

  if (typeof parsed.query !== 'string' || !parsed.query.trim()) {
    return c.json({ error: 'Missing query document' }, 400);
  }

  const docOps = extractOperationNames(parsed.query);
  if (docOps.length !== 1 || docOps[0] !== operationHint) {
    return c.json({ error: 'Query document must contain exactly the declared operation' }, 400);
  }

  if (INTROSPECTION_RE.test(parsed.query)) {
    return c.json({ error: 'Introspection is not permitted' }, 400);
  }

  if (
    c.env.GRAPHQL_HASH_PINNING !== 'off' &&
    !(await documentMatchesPin(c.env, operationHint, parsed.query))
  ) {
    return c.json(
      { error: 'Query document does not match the pinned document for this operation' },
      400,
    );
  }

  const isCacheable = Boolean(operationHint && CACHEABLE_OPERATIONS.has(operationHint));

  // Check edge cache first — cache hits avoid upstream entirely
  const cache = caches.default;
  let cacheKey: Request | undefined;
  if (isCacheable) {
    const key = await buildCacheKey(c.req.url, bodyStr);
    cacheKey = new Request(`https://cache.internal/${key}`, { method: 'GET' });
    const cached = await cache.match(cacheKey);
    if (cached) return cached;
  }

  // Singleflight: if an identical cacheable request is already in-flight,
  // piggyback on it instead of issuing a duplicate upstream fetch.
  const flightKey = isCacheable ? await buildCacheKey(c.req.url, bodyStr) : null;
  if (flightKey) {
    const pending = inflight.get(flightKey);
    if (pending) return (await pending).clone();
  }

  const doFetch = async (): Promise<Response> => {
    // Charged here, not at the top of the handler: only a call that actually
    // reaches ESO Logs spends the shared credentials budget this protects, so
    // cache hits and singleflight piggybacks stay free.
    if (!allowRequestFromIp(clientIp)) {
      return c.json({ error: 'Rate limit exceeded' }, 429);
    }

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

    // Store successful cacheable responses — but never cache a report detail that
    // came back with no fights. A still-processing log reports an empty `fights`
    // list, and caching it would serve a stale "No fights available" for the full
    // TTL even after the log finishes parsing. Skipping the store lets the next
    // request re-fetch fresh data once the fights are available.
    let storeInCache = isCacheable && upstream.status === 200 && Boolean(cacheKey);
    if (storeInCache && operationHint === 'getReportByCode') {
      storeInCache = reportResponseHasFights(responseBody);
    }
    if (storeInCache && cacheKey) {
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
