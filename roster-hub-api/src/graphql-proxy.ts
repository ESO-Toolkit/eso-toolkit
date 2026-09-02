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
// short cache staleness in exchange for far less upstream pressure
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
  // The Latest Reports list. Every visit to /latest-reports issued this
  // uncached, so each one paid a ~500 ms upstream round trip on the shared
  // credentials budget for a page that is identical for every visitor on the
  // default filters. Short TTL only — see OPERATION_CACHE_TIERS.
  'getLatestReports',
]);

const CACHE_TTL_SECONDS = 600; // 10 minutes
const CACHE_SWR_SECONDS = 600; // 10 minutes of stale-while-revalidate

/**
 * Per-operation cache freshness, mirroring the REST side's `CacheTier` in
 * index.ts.
 *
 * `ttl` is how long an entry is served as FRESH. `swr` is how much longer it
 * may still be served — instantly — while a refresh runs in the background.
 * The two together are what the stored `max-age` is set to, so an entry
 * survives into its stale window instead of being evicted at `ttl`.
 *
 * Why SWR at all, measured on production `getLatestReports`: a warm edge hit is
 * ~70-130 ms, while a cold miss is ~770 ms at p50 (min 681, p90 941) in steady
 * state — and there are real, reproducible excursion windows where every miss
 * costs 4.9-6.9 s for half a minute at a time. With a bare 60 s TTL, whichever
 * visitor lands on the expiry pays that. SWR takes the typical ~770 ms off the
 * critical path, and more valuably makes the multi-second excursion tail
 * invisible: the stale entry goes out instantly no matter how slow upstream is
 * being at that moment.
 */
interface OperationCacheTier {
  /** Seconds an entry counts as fresh. */
  ttl: number;
  /** Extra seconds an entry may be served stale while it refreshes behind. */
  swr: number;
}

const OPERATION_CACHE_TIERS: Record<string, OperationCacheTier> = {
  // `getLatestReports` is a "what was uploaded just now" feed, so it stays
  // fresh for only a minute: long enough to collapse the traffic of a busy
  // minute onto a single upstream call, short enough that a freshly uploaded
  // log shows up about as fast as it did uncached. The 10-minute stale window
  // is generous on purpose — the page is identical for every visitor and a
  // list that is a few minutes behind is still useful, whereas an 8 s blank
  // page is not. It also bounds the empty-log staleness the list already
  // handles: a still-parsing log is hidden by the client and self-heals on the
  // next background refresh, which is at most a minute away.
  getLatestReports: { ttl: 60, swr: 600 },
};

/**
 * The default tier: 10 minutes fresh, 10 more stale. The generic cacheable
 * operations are per-report event slices that are effectively immutable once a
 * log has finished processing, so serving one up to 20 minutes old costs
 * nothing in correctness.
 */
const DEFAULT_CACHE_TIER: OperationCacheTier = {
  ttl: CACHE_TTL_SECONDS,
  swr: CACHE_SWR_SECONDS,
};

function cacheTierFor(operation: string): OperationCacheTier {
  return OPERATION_CACHE_TIERS[operation] ?? DEFAULT_CACHE_TIER;
}

/**
 * Stamped on every cacheable response at store time, and the ONLY staleness
 * signal the read path consults.
 *
 * The Cache API does synthesize `Date`/`Age`, but relying on that would couple
 * correctness to runtime-specific header synthesis that the tests cannot
 * reproduce. An explicit millisecond stamp we wrote ourselves is unambiguous.
 * It is left on the client-facing response too — it is harmless, and it makes
 * "was this a cache hit, and how old" answerable from a browser devtools panel.
 */
const CACHE_TIMESTAMP_HEADER = 'X-Proxy-Cached-At';

/**
 * Age of a cached entry in seconds, or `null` when it carries no usable stamp.
 *
 * A missing or unparseable stamp is deliberately NOT treated as fresh: the
 * caller maps `null` onto the stale path, so such an entry is still served
 * instantly but is refreshed behind the request. Fail safe, never fail fresh.
 */
function cachedAgeSeconds(cached: Response): number | null {
  const raw = cached.headers?.get?.(CACHE_TIMESTAMP_HEADER);
  const stampedAt = raw === null || raw === undefined ? Number.NaN : Number(raw);
  if (!Number.isFinite(stampedAt)) return null;
  return (Date.now() - stampedAt) / 1000;
}

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
/**
 * True when a `getLatestReports` response actually carries a page of reports.
 *
 * A degraded response (upstream error, rate limit) still comes back 200 with a
 * null `reports`, and caching that would hand every visitor an empty list for
 * the whole TTL. Same reasoning as reportResponseHasFights below.
 */
function latestReportsResponseHasData(responseBody: string): boolean {
  try {
    const parsed = JSON.parse(responseBody) as {
      data?: { reportData?: { reports?: { data?: unknown } | null } | null };
    };
    return Array.isArray(parsed?.data?.reportData?.reports?.data);
  } catch {
    return false;
  }
}

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
/**
 * How long a document that the published manifest did NOT explain stays
 * "recently tried". Suppression is per document, never global: a successful
 * refresh for one new query must not stop the NEXT deploy's query from being
 * discovered, or a second deploy inside the window would 400 the live site —
 * the very outage this union prevents.
 */
const MANIFEST_MISS_BACKOFF_MS = 15 * 1000;
/**
 * Floor between origin reads regardless of which document missed, so a caller
 * rotating fabricated documents cannot turn every rejected request into a
 * fetch of our Pages origin. A genuine new deploy still resolves within it.
 */
const MANIFEST_MIN_REFRESH_INTERVAL_MS = 2 * 1000;
/** Bound the back-off map so fabricated documents cannot grow it without limit. */
const MANIFEST_MISS_MAX_KEYS = 1_000;
/** Cap the hashes retained per operation as successive deploys are learned. */
const MANIFEST_MAX_HASHES_PER_OPERATION = 8;

/** The document a refresh is trying to resolve — see refreshRuntimeManifest. */
interface WantedDocument {
  operation: string;
  hash: string;
}

interface PublishedManifest {
  version?: number;
  operations?: Record<string, string[]>;
}

let runtimeManifest: Record<string, string[]> = {};
let runtimeManifestFetchedAt = 0;
let runtimeManifestInFlight: Promise<void> | null = null;
/** `operation:hash` → earliest ms at which it is worth asking the origin again. */
const manifestMissBackoff = new Map<string, number>();

function markManifestMiss(key: string, now: number): void {
  if (manifestMissBackoff.size >= MANIFEST_MISS_MAX_KEYS) {
    const oldest = manifestMissBackoff.keys().next().value; // insertion-ordered
    if (oldest !== undefined) manifestMissBackoff.delete(oldest);
  }
  manifestMissBackoff.set(key, now + MANIFEST_MISS_BACKOFF_MS);
}

/**
 * Read the manifest the live frontend publishes, to resolve `want`.
 *
 * Any failure leaves the previous value in place — a frontend that is down or
 * slow must never turn into a 400 storm on the proxy.
 */
async function refreshRuntimeManifest(env: Env, want: WantedDocument): Promise<void> {
  const now = Date.now();
  const missKey = `${want.operation}:${want.hash}`;
  // Only THIS document's recent failure suppresses a retry; a different missing
  // document is always worth one look, subject to the global floor below.
  if (now < (manifestMissBackoff.get(missKey) ?? 0)) return;
  if (now - runtimeManifestFetchedAt < MANIFEST_MIN_REFRESH_INTERVAL_MS) return;
  if (runtimeManifestInFlight) return runtimeManifestInFlight;

  runtimeManifestInFlight = (async () => {
    let answeredTheMiss = false;
    try {
      // This runs ONLY after a bundled-hash miss, i.e. exactly when the site may
      // have deployed a query the Worker has never seen. A cached copy is worth
      // nothing here: it would be the same stale manifest that caused the miss.
      // Bypass the edge cache and cache-bust the origin so we always read what
      // Pages is serving right now.
      const base = env.GRAPHQL_MANIFEST_URL || RUNTIME_MANIFEST_URL;
      const url = `${base}${base.includes('?') ? '&' : '?'}t=${now}`;
      const res = await fetch(url, {
        headers: { 'Cache-Control': 'no-cache' },
        cf: { cacheTtl: 0, cacheEverything: false },
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
      // MERGE, never clobber: a valid-but-previous manifest would otherwise
      // evict a hash this isolate had already learned from the live frontend,
      // and the next request for that document would 400 until another refresh
      // happened to land. Every retained entry was published by our own site at
      // some point, and the per-operation cap keeps the set from growing across
      // deploys.
      const merged: Record<string, string[]> = { ...runtimeManifest };
      for (const [operation, hashes] of Object.entries(next)) {
        merged[operation] = [...new Set([...hashes, ...(merged[operation] ?? [])])].slice(
          0,
          MANIFEST_MAX_HASHES_PER_OPERATION,
        );
      }
      runtimeManifest = merged;
      // A 200 is not the same as an ANSWER. Pages/CDN propagation can hand back
      // the PREVIOUS manifest — valid JSON that simply lacks the hash we just
      // missed on — and treating that as success would suppress the next
      // refresh for the full TTL and keep 400ing the frontend that is already
      // live. Only a manifest that actually contains the missed document has
      // resolved anything.
      answeredTheMiss = (merged[want.operation] ?? []).includes(want.hash);
    } catch {
      // keep the last known good manifest
    } finally {
      // A read that did not answer the miss — unreachable Pages, or a
      // mid-propagation CDN handing back the previous manifest — backs THIS
      // document off briefly. It never blocks a different document, so the
      // next deploy is still discovered immediately.
      const finishedAt = Date.now();
      if (answeredTheMiss) manifestMissBackoff.delete(missKey);
      else markManifestMiss(missKey, finishedAt);
      runtimeManifestFetchedAt = finishedAt;
      runtimeManifestInFlight = null;
    }
  })();

  return runtimeManifestInFlight;
}

async function documentMatchesPin(env: Env, operation: string, queryDoc: string): Promise<boolean> {
  const bundled = GRAPHQL_QUERY_HASHES[operation] ?? [];
  const hash = await hashGraphqlDocument(queryDoc);
  if (bundled.includes(hash)) return true;

  if ((runtimeManifest[operation] ?? []).includes(hash)) return true;

  await refreshRuntimeManifest(env, { operation, hash });
  return (runtimeManifest[operation] ?? []).includes(hash);
}

// ─── Proxy handler ────────────────────────────────────────────────────────────

/** Explicit "swallow it" handler, so background failures are never unhandled. */
function noop(): void {}

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
  const tier = cacheTierFor(operationHint);

  const cache = caches.default;
  // One SHA-256 of the body, used for BOTH the cache key and the singleflight
  // key (they are the same string by design). This used to be digested twice.
  const flightKey = isCacheable ? await buildCacheKey(c.req.url, bodyStr) : null;
  const cacheKey = flightKey
    ? new Request(`https://cache.internal/${flightKey}`, { method: 'GET' })
    : undefined;

  /**
   * Hand work to the runtime to finish after the response is sent.
   *
   * Guarded: Hono THROWS when a handler runs without an ExecutionContext, and
   * neither a cache write nor a background refresh may be the reason a request
   * fails. The fallback still attaches handlers so nothing rejects unhandled.
   */
  const scheduleBackgroundWork = (work: Promise<unknown>): void => {
    try {
      c.executionCtx?.waitUntil?.(work);
    } catch {
      void work.then(noop, noop);
    }
  };

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
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      // max-age is ttl + swr so the entry SURVIVES into its stale window
      // instead of being evicted the moment it stops being fresh; the
      // X-Proxy-Cached-At check below is what separates fresh from stale.
      // INTERNAL ONLY: the global middleware in index.ts rewrites the
      // browser-facing Cache-Control to no-store (POST /graphql gets no cache
      // tier), so this header exists purely to drive Cache API freshness on the
      // clone taken before that middleware runs.
      'Cache-Control': isCacheable
        ? `public, max-age=${tier.ttl + tier.swr}, stale-while-revalidate=${tier.swr}`
        : 'no-store',
    };
    if (isCacheable) headers[CACHE_TIMESTAMP_HEADER] = String(Date.now());
    const response = new Response(responseBody, { status: upstream.status, headers });

    // Store successful cacheable responses — but never cache a report detail that
    // came back with no fights. A still-processing log reports an empty `fights`
    // list, and caching it would serve a stale "No fights available" for the full
    // TTL even after the log finishes parsing. Skipping the store lets the next
    // request re-fetch fresh data once the fights are available.
    let storeInCache = isCacheable && upstream.status === 200 && Boolean(cacheKey);
    if (storeInCache && operationHint === 'getReportByCode') {
      storeInCache = reportResponseHasFights(responseBody);
    }
    if (storeInCache && operationHint === 'getLatestReports') {
      storeInCache = latestReportsResponseHasData(responseBody);
    }
    // A response that fails a guard (or is not a 200) is simply not stored.
    // Under stale-while-revalidate that no longer means "next request
    // refetches" — it means the EXISTING stale entry keeps being served until
    // it ages out. That is deliberate: a degraded upstream should not be able
    // to replace a good cached answer with an empty one. The `max-age` of
    // ttl + swr is what bounds it, so a permanently-broken upstream stops
    // being papered over once the entry expires out of the Cache API entirely.
    //
    // Note `latestReportsResponseHasData` also refuses a genuinely EMPTY page,
    // so a zero-row Latest Reports answer is never stored and therefore misses
    // every time. That predates this change and is unaffected by it: with no
    // entry there is nothing to serve stale, so those requests keep taking the
    // normal singleflight-and-fetch path.
    if (storeInCache && cacheKey) {
      scheduleBackgroundWork(cache.put(cacheKey, response.clone()));
    }

    return response;
  };

  /**
   * Run `doFetch` under the singleflight map, or join the call already running.
   *
   * The map entry is removed when the fetch SETTLES rather than when the
   * originating request returns: a background revalidation outlives its
   * request, so tying removal to the caller would either leave a settled entry
   * pinned in the map or delete an entry a later caller is still joining.
   */
  const startUpstreamFlight = (): Promise<Response> => {
    if (!flightKey) return doFetch();
    const pending = inflight.get(flightKey);
    if (pending) return pending;

    const key = flightKey;
    const promise = doFetch();
    inflight.set(key, promise);
    void promise.then(
      () => {
        if (inflight.get(key) === promise) inflight.delete(key);
      },
      () => {
        if (inflight.get(key) === promise) inflight.delete(key);
      },
    );
    return promise;
  };

  /**
   * Refresh a stale entry behind the request that was just served from it.
   *
   * Everything here is swallowed. The client already has a body, so a 429 from
   * the per-IP bucket (charged inside doFetch, because this DOES reach
   * upstream), a network error, or a guard rejection must never surface — and
   * must never delete or replace the stale entry that is still serving.
   */
  const revalidateStaleEntry = (): void => {
    if (!flightKey) return;
    // Concurrent stale hits in this isolate collapse onto the one refresh.
    if (inflight.has(flightKey)) return;
    scheduleBackgroundWork(startUpstreamFlight().then(noop, noop));
  };

  if (cacheKey) {
    const cached = await cache.match(cacheKey);
    if (cached) {
      // A `null` age (missing or unparseable stamp) counts as STALE, never as
      // fresh: the entry still goes out instantly, it just refreshes behind.
      const age = cachedAgeSeconds(cached);
      if (age === null || age > tier.ttl) revalidateStaleEntry();
      // Return a copy so the cache-derived body is never consumed or mutated,
      // matching the REST middleware in index.ts.
      return new Response(cached.body, cached);
    }
  }

  const response = await startUpstreamFlight();
  // Cloned because a singleflight joiner shares one Response instance.
  return flightKey ? response.clone() : response;
}
