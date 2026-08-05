/**
 * Roster Hub API — Cloudflare Worker
 *
 * Hono router serving the REST endpoints for the roster marketplace.
 * Auth: Bearer JWT validated against ESO Logs JWKS.
 * DB: Cloudflare D1 (SQLite at the edge).
 */

import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { validateToken } from './auth';
import {
  listRosters,
  getRosterById,
  createRoster,
  updateRoster,
  deleteRoster,
  toggleVote,
  listComments,
  createComment,
  deleteComment,
  checkCommentRateLimit,
  listBuilds,
  getBuildById,
  createBuild,
  updateBuild,
  deleteBuild,
  toggleBuildVote,
  listBuildComments,
  createBuildComment,
  deleteBuildComment,
  checkBuildCommentRateLimit,
  checkRosterVoteRateLimit,
  checkRosterCreateRateLimit,
  checkBuildVoteRateLimit,
  checkBuildCreateRateLimit,
  createTempBuild,
  getTempBuild,
  checkTempBuildRateLimit,
  recordTempBuildRateLimit,
  cleanupExpiredTempBuilds,
  createImageUpload,
  getImageUpload,
  deleteImageUpload,
  createImageReport,
  checkImageUploadRateLimit,
  getUserProfile,
  upsertUserBio,
  upsertUserAvatar,
  deleteUserAvatar,
  getAvatarDeleteUrl,
  checkAvatarUploadRateLimit,
  updateDisplayNames,
  lookupAvatarsByDisplayNames,
  type PlayerLookupEntry,
  listPacks,
  getPackById,
  createPack,
  updatePack,
  deletePack,
  togglePackVote,
  checkPackCreateRateLimit,
  checkPackVoteRateLimit,
  recordRateLimitEvent,
  pruneRateLimitEvents,
} from './db/queries';
import { moderateImage, MAX_IMAGE_BYTES } from './image-moderation';
import { handleGraphqlProxy } from './graphql-proxy';
import { getReportBuildEvidence, putReportBuildEvidence } from './report-build-evidence';
import type { Env, RecommendedAddonEntry, RecommendedAddons } from './types';
import { getDpsParseCombatant, listDpsEncounters, listDpsParses } from './db/dps-parse-queries';
import { ensureDpsParsesSchema } from './db/dps-parse-schema';
import { syncDpsParses } from './leaderboard-sync/dps-parse-sync';

const app = new Hono<{ Bindings: Env }>();

// ─── Global error handler ───────────────────────────────────────────────────
// Returns a JSON body with the error message instead of Cloudflare's generic
// "Internal Server Error" plain-text response.

app.onError((err, c) => {
  console.error(`[${c.req.method} ${c.req.path}]`, err.message, err.stack);
  const status = 'status' in err && typeof err.status === 'number' ? err.status : 500;
  const msg = status >= 500 ? 'Internal server error' : err.message || 'Internal server error';
  return c.json({ error: msg }, status as 500);
});

/** Best-effort delete of an ImgBB-hosted image via its delete URL (fire-and-forget). */
function tryDeleteImgBBImage(deleteUrl: string | null): void {
  if (deleteUrl && /^https:\/\/ibb\.co\//.test(deleteUrl)) {
    fetch(deleteUrl).catch(() => {});
  }
}

// ─── Validation helpers ──────────────────────────────────────────────────────

/** Verify that an encoded payload is valid base64url (no special chars that break URLs). */
const isValidBase64Url = (s: string): boolean => /^[A-Za-z0-9_-]*=*$/.test(s);

import { cleanText, sanitize } from './sanitize';

/** Validate and sanitize an addon entry. Returns null if invalid. */
const sanitizeAddonEntry = (a: unknown): RecommendedAddonEntry | null => {
  if (!a || typeof a !== 'object') return null;
  const entry = a as Record<string, unknown>;
  if (typeof entry.esouiId !== 'number' || !Number.isInteger(entry.esouiId) || entry.esouiId <= 0)
    return null;
  if (typeof entry.name !== 'string' || !entry.name.trim() || entry.name.length > 200) return null;
  return {
    esouiId: entry.esouiId,
    name: cleanText(entry.name),
    required: typeof entry.required === 'boolean' ? entry.required : undefined,
    note: typeof entry.note === 'string' ? cleanText(entry.note.slice(0, 500)) : undefined,
  };
};

/** Validate a tag: must be non-empty, ≤30 chars, alphanumeric/hyphens/underscores/spaces. */
const isValidTag = (t: string): boolean =>
  typeof t === 'string' && t.length > 0 && t.length <= 30 && /^[\w\s-]+$/.test(t);

// Trial ids are short alphanumeric codes (e.g. "AA", "DSR"). Validate, dedupe,
// sanitize and cap to 10 so a roster can't be tagged with arbitrary content.
const isValidTrialId = (t: unknown): t is string =>
  typeof t === 'string' && t.length > 0 && t.length <= 16 && /^[A-Za-z0-9_-]+$/.test(t);
const sanitizeTrialIds = (ids: unknown): string[] => {
  if (!Array.isArray(ids)) return [];
  return [...new Set(ids.filter(isValidTrialId).map(sanitize))].slice(0, 10);
};

// ─── Per-user update rate limiting ────────────────────────────────────────────
// PUT handlers replace up-to-50 KB blobs; without a cap an authed user could issue
// unbounded D1 writes. Backed by the append-only rate_limit_events table (like the
// vote limiters) so it can't be reset by deleting rows.
const UPDATE_RATE_LIMIT_WINDOW_SEC = 3600;
const UPDATE_RATE_LIMIT_MAX = 60; // 60 updates per hour per resource type per user

async function checkUpdateRateLimit(
  db: D1Database,
  userId: string,
  action: string,
): Promise<boolean> {
  const row = await db
    .prepare(
      `SELECT COUNT(*) AS cnt FROM rate_limit_events
       WHERE user_id = ? AND action = ? AND created_at > datetime('now', '-${UPDATE_RATE_LIMIT_WINDOW_SEC} seconds')`,
    )
    .bind(userId, action)
    .first<{ cnt: number }>();
  return (row?.cnt ?? 0) < UPDATE_RATE_LIMIT_MAX;
}

const UPDATE_RATE_LIMIT_MESSAGE =
  'Rate limit exceeded. You are updating too quickly — please try again later.';

/** Validate an ESO @handle: leading @, then 3-20 word/./- chars. */
const isValidDisplayName = (v: string): boolean => /^@[\w.\-]{3,20}$/.test(v);

/** Allowed build visibility values. Mirrors BuildVisibility in the frontend. */
const BUILD_VISIBILITIES = ['public', 'private', 'link-only'] as const;

/** Validate a build visibility value against the allowlist. */
const isValidVisibility = (v: unknown): v is (typeof BUILD_VISIBILITIES)[number] =>
  typeof v === 'string' && (BUILD_VISIBILITIES as readonly string[]).includes(v);

/** `vs` index → visibility, mirroring VISIBILITIES in src/utils/buildEncoding.ts. */
const VISIBILITY_BY_INDEX = ['public', 'private', 'link-only'] as const;

/**
 * Decode the visibility embedded in an encoded build_data blob (base64url +
 * deflate-raw, mirroring the frontend encoder). Returns the visibility, or null
 * if the blob can't be decoded — callers must fail closed (treat null as
 * not-public) so an undecodable or hostile blob can't slip through as public.
 */
const MAX_COMPRESSED_BUILD_BYTES = 100 * 1024; // 100 KB compressed
const MAX_DECOMPRESSED_BUILD_BYTES = 1024 * 1024; // 1 MB decompressed — hard cap

async function decodeEmbeddedVisibility(
  buildData: string,
): Promise<(typeof BUILD_VISIBILITIES)[number] | null> {
  try {
    const b64 = buildData.replace(/-/g, '+').replace(/_/g, '/');
    const bytes = Uint8Array.from(atob(b64), (ch) => ch.charCodeAt(0));
    // Cap compressed input first (matches the frontend decode-bomb guard).
    if (bytes.length > MAX_COMPRESSED_BUILD_BYTES) return null;

    const ds = new DecompressionStream('deflate-raw');
    const reader = new Blob([bytes]).stream().pipeThrough(ds).getReader();
    // Stream-decode with a hard decompressed-byte cap so a small bomb can't
    // expand into unbounded memory; abort as soon as the cap is exceeded.
    const chunks: Uint8Array[] = [];
    let total = 0;
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      total += value.byteLength;
      if (total > MAX_DECOMPRESSED_BUILD_BYTES) {
        await reader.cancel();
        return null;
      }
      chunks.push(value);
    }

    const merged = new Uint8Array(total);
    let offset = 0;
    for (const chunk of chunks) {
      merged.set(chunk, offset);
      offset += chunk.byteLength;
    }
    const json = new TextDecoder().decode(merged);
    const compact = JSON.parse(json) as { vs?: number };
    const idx = typeof compact.vs === 'number' ? compact.vs : 0;
    return VISIBILITY_BY_INDEX[idx] ?? null;
  } catch {
    return null;
  }
}

// ─── Security headers ────────────────────────────────────────────────────────

app.use('*', async (c, next) => {
  await next();
  c.res.headers.set('X-Content-Type-Options', 'nosniff');
  c.res.headers.set('X-Frame-Options', 'DENY');
});

// ─── CORS ────────────────────────────────────────────────────────────────────

app.use('*', async (c, next) => {
  const allowedOrigins = c.env.ALLOWED_ORIGINS.split(',').map((o) => o.trim());
  const origin = c.req.header('Origin') ?? '';
  const isAllowed =
    allowedOrigins.includes(origin) ||
    /^https:\/\/[a-z0-9-]+\.eso-toolkit\.pages\.dev$/.test(origin);
  const corsMiddleware = cors({
    origin: isAllowed ? origin : allowedOrigins[0],
    allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowHeaders: ['Content-Type', 'Authorization'],
    exposeHeaders: ['Retry-After'],
    maxAge: 86400,
  });
  return corsMiddleware(c, next);
});

// ─── Edge caching ──────────────────────────────────────────────────────────────
// Cache unauthenticated GET responses at the edge via the Workers Cache API.
// Authenticated requests always bypass the cache so user-specific fields
// (user_voted, author identity) are never leaked to other users.

interface CacheTier {
  edgeTtl: number;
  swr: number;
  /**
   * Browser freshness, in seconds.
   *
   * REQUIRED for correctness, not just tuning. `s-maxage` binds shared caches
   * only; a browser is a private cache, so without an explicit `max-age` it
   * falls back to heuristic freshness and can hold a `public` response for
   * hours. Observed live: after a re-ingest the page kept rendering the
   * previous signature version until the cache was busted by hand.
   *
   * Defaults to 0 (always revalidate) so a route that forgets to set it is
   * merely chatty rather than silently stale.
   */
  browserTtl?: number;
}

function getCacheTier(path: string): CacheTier | null {
  // Build/profile responses include mutable build visibility. Without targeted
  // cache invalidation, edge caching can serve stale public data after a build
  // is made private, so those routes intentionally fall through to no-store.
  if (/^\/(rosters|packs)$/.test(path)) return { edgeTtl: 30, swr: 300 };
  if (/^\/(rosters|packs)\/[^/]+$/.test(path)) return { edgeTtl: 10, swr: 60 };
  if (/^\/rosters\/[^/]+\/comments$/.test(path)) return { edgeTtl: 15, swr: 60 };
  if (/^\/reports\/[A-Za-z0-9]+\/build-evidence$/.test(path)) {
    return { edgeTtl: 60, swr: 300 };
  }
  if (path === '/search-addons') return { edgeTtl: 60, swr: 300 };
  // DPS leaderboard is cron-owned and refreshes once or twice a day, so it can
  // be cached aggressively. Nothing here is user-specific.
  if (path === '/dps-leaderboard/encounters') {
    return { edgeTtl: 900, swr: 3600, browserTtl: 60 };
  }
  if (path === '/dps-leaderboard/parses') {
    return { edgeTtl: 600, swr: 3600, browserTtl: 60 };
  }
  if (/^\/dps-leaderboard\/parses\/[^/]+\/build$/.test(path)) {
    // Keyed to a specific parse, so its content is effectively immutable.
    return { edgeTtl: 3600, swr: 86400, browserTtl: 3600 };
  }
  return null;
}

app.use('*', async (c, next) => {
  const isGet = c.req.method === 'GET';
  const hasAuth = !!c.req.header('Authorization');
  const tier = isGet ? getCacheTier(c.req.path) : null;

  // Cacheable unauthenticated GET — check edge cache before running handler
  if (tier && !hasAuth) {
    const cache = caches.default;
    const url = new URL(c.req.url);
    const origin = c.req.header('Origin') ?? '_none';
    const cacheKey = new Request(
      `https://cache.internal/rest${url.pathname}${url.search}&_origin=${encodeURIComponent(origin)}`,
    );
    const cached = await cache.match(cacheKey);
    if (cached) {
      c.res = new Response(cached.body, cached);
      return;
    }

    await next();

    if (c.res.status >= 200 && c.res.status < 300) {
      const cc = `public, max-age=${tier.browserTtl ?? 0}, s-maxage=${tier.edgeTtl}, stale-while-revalidate=${tier.swr}`;
      c.res.headers.set('Cache-Control', cc);
      c.res.headers.set('Vary', 'Authorization, Origin');
      c.executionCtx.waitUntil(cache.put(cacheKey, c.res.clone()));
    } else {
      c.res.headers.set('Cache-Control', 'no-store');
    }
    return;
  }

  await next();
  c.res.headers.set('Cache-Control', 'no-store');
});

// ─── ESO Logs GQL proxy ────────────────────────────────────────────────────────
// Forwards POST /graphql to https://www.esologs.com/api/v2/client, injecting
// a server-side OAuth token so unauthenticated users can query public data.

app.post('/graphql', handleGraphqlProxy);
app.get('/reports/:reportCode/build-evidence', getReportBuildEvidence);
app.put('/reports/:reportCode/build-evidence', putReportBuildEvidence);

// ─── Health check ─────────────────────────────────────────────────────────────

app.get('/health', async (c) => {
  const result = await c.env.DB.prepare('SELECT 1').run();
  const sizeBytes = result.meta?.size_after ?? null;
  if (Math.random() < 0.05) {
    c.executionCtx.waitUntil(pruneRateLimitEvents(c.env.DB));
  }
  return c.json({
    ok: true,
    db_size_bytes: sizeBytes,
    db_size_mb: sizeBytes != null ? +(sizeBytes / 1_048_576).toFixed(2) : null,
    db_limit_mb: 500,
  });
});

// ─── GET /rosters — list with filtering & pagination ─────────────────────────

app.get('/rosters', async (c) => {
  const user = await validateToken(c.req.header('Authorization'), c.env);

  const trial = c.req.query('trial') ?? undefined;
  const tag = c.req.query('tag') ?? undefined;
  const sort = c.req.query('sort') === 'recent' ? 'recent' : 'votes';
  const page = Math.max(1, parseInt(c.req.query('page') ?? '1', 10) || 1);

  const rosters = await listRosters(c.env.DB, {
    trial,
    tag,
    sort,
    page,
    userId: user?.id,
  });

  return c.json({ rosters, page, sort });
});

// ─── GET /rosters/:id — single roster ────────────────────────────────────────

app.get('/rosters/:id', async (c) => {
  const user = await validateToken(c.req.header('Authorization'), c.env);
  const roster = await getRosterById(c.env.DB, c.req.param('id'), user?.id);

  if (!roster) {
    return c.json({ error: 'Not found' }, 404);
  }
  return c.json({ roster });
});

// ─── POST /rosters — publish a roster ────────────────────────────────────────

app.post('/rosters', async (c) => {
  const user = await validateToken(c.req.header('Authorization'), c.env);
  if (!user) return c.json({ error: 'Unauthorized' }, 401);

  interface CreateBody {
    title: string;
    description?: string;
    trial_id: string;
    trial_ids?: string[];
    roster_data: string;
    tags?: string[];
    is_anonymous?: boolean;
    recommended_addons?: RecommendedAddons | null;
  }

  let body: CreateBody;
  try {
    body = await c.req.json<CreateBody>();
  } catch {
    return c.json({ error: 'Invalid JSON' }, 400);
  }

  const {
    title,
    description = '',
    trial_id,
    trial_ids = [],
    roster_data,
    tags = [],
    is_anonymous = false,
    recommended_addons = null,
  } = body;

  if (!title?.trim()) return c.json({ error: 'title is required' }, 400);
  if (!trial_id?.trim()) return c.json({ error: 'trial_id is required' }, 400);
  if (!roster_data?.trim()) return c.json({ error: 'roster_data is required' }, 400);
  if (title.length > 100) return c.json({ error: 'title must be ≤ 100 characters' }, 400);
  if (description.length > 500)
    return c.json({ error: 'description must be ≤ 500 characters' }, 400);
  if (roster_data.length > 50_000)
    return c.json({ error: 'roster_data must be ≤ 50 000 characters' }, 400);
  if (!isValidBase64Url(roster_data))
    return c.json({ error: 'roster_data must be valid base64url' }, 400);

  // Validate recommended_addons if provided
  let recommendedAddonsJson: string | null = null;
  if (
    recommended_addons &&
    Array.isArray(recommended_addons.addons) &&
    recommended_addons.addons.length > 0
  ) {
    if (recommended_addons.addons.length > 20)
      return c.json({ error: 'recommended_addons: max 20 addons' }, 400);
    const sanitizedAddons = recommended_addons.addons
      .map(sanitizeAddonEntry)
      .filter(Boolean) as RecommendedAddonEntry[];
    if (sanitizedAddons.length > 0) {
      recommendedAddonsJson = JSON.stringify({
        packId:
          typeof recommended_addons.packId === 'string'
            ? sanitize(recommended_addons.packId)
            : undefined,
        packTitle:
          typeof recommended_addons.packTitle === 'string'
            ? cleanText(recommended_addons.packTitle)
            : undefined,
        addons: sanitizedAddons,
      });
    }
  }

  const createAllowed = await checkRosterCreateRateLimit(c.env.DB, user.id);
  if (!createAllowed)
    return c.json({ error: 'Rate limit exceeded. You can only publish 5 rosters per hour.' }, 429);

  // Generate a short unique ID (nanoid-style without the dep)
  const id = Array.from(crypto.getRandomValues(new Uint8Array(10)))
    .map((b) => b.toString(36).padStart(2, '0'))
    .join('')
    .slice(0, 12);

  await createRoster(c.env.DB, {
    id,
    authorId: user.id,
    authorName: user.name,
    title: cleanText(title),
    description: cleanText(description),
    trialId: sanitize(trial_id),
    trialIds: sanitizeTrialIds(trial_ids),
    rosterData: roster_data,
    tags: Array.isArray(tags) ? tags.filter(isValidTag).slice(0, 10).map(sanitize) : [],
    isAnonymous: !!is_anonymous,
    recommendedAddons: recommendedAddonsJson,
  });

  const roster = await getRosterById(c.env.DB, id, user.id);
  return c.json({ roster }, 201);
});

// ─── PUT /rosters/:id — update own roster ────────────────────────────────────

app.put('/rosters/:id', async (c) => {
  const user = await validateToken(c.req.header('Authorization'), c.env);
  if (!user) return c.json({ error: 'Unauthorized' }, 401);

  if (!(await checkUpdateRateLimit(c.env.DB, user.id, 'roster_update')))
    return c.json({ error: UPDATE_RATE_LIMIT_MESSAGE }, 429);

  interface UpdateBody {
    title: string;
    description?: string;
    trial_id: string;
    trial_ids?: string[];
    roster_data: string;
    tags?: string[];
    is_anonymous?: boolean;
    recommended_addons?: RecommendedAddons | null;
  }

  let body: UpdateBody;
  try {
    body = await c.req.json<UpdateBody>();
  } catch {
    return c.json({ error: 'Invalid JSON' }, 400);
  }

  const { title, description = '', trial_id, trial_ids = [], roster_data, tags = [] } = body;
  const is_anonymous = 'is_anonymous' in body ? (body.is_anonymous ?? false) : undefined;
  const recommended_addons =
    'recommended_addons' in body ? (body.recommended_addons ?? null) : undefined;

  if (!title?.trim()) return c.json({ error: 'title is required' }, 400);
  if (!trial_id?.trim()) return c.json({ error: 'trial_id is required' }, 400);
  if (!roster_data?.trim()) return c.json({ error: 'roster_data is required' }, 400);
  if (title.length > 100) return c.json({ error: 'title must be ≤ 100 characters' }, 400);
  if (description.length > 500)
    return c.json({ error: 'description must be ≤ 500 characters' }, 400);
  if (roster_data.length > 50_000)
    return c.json({ error: 'roster_data must be ≤ 50 000 characters' }, 400);
  if (!isValidBase64Url(roster_data))
    return c.json({ error: 'roster_data must be valid base64url' }, 400);

  // Validate recommended_addons if provided
  let recommendedAddonsJson: string | null = null;
  if (
    recommended_addons &&
    Array.isArray(recommended_addons.addons) &&
    recommended_addons.addons.length > 0
  ) {
    if (recommended_addons.addons.length > 20)
      return c.json({ error: 'recommended_addons: max 20 addons' }, 400);
    const sanitizedAddons = recommended_addons.addons
      .map(sanitizeAddonEntry)
      .filter(Boolean) as RecommendedAddonEntry[];
    if (sanitizedAddons.length > 0) {
      recommendedAddonsJson = JSON.stringify({
        packId:
          typeof recommended_addons.packId === 'string'
            ? sanitize(recommended_addons.packId)
            : undefined,
        packTitle:
          typeof recommended_addons.packTitle === 'string'
            ? cleanText(recommended_addons.packTitle)
            : undefined,
        addons: sanitizedAddons,
      });
    }
  }

  const existing = await getRosterById(c.env.DB, c.req.param('id'), user.id);
  const updated = await updateRoster(c.env.DB, c.req.param('id'), user.id, {
    title: cleanText(title),
    description: cleanText(description),
    trialId: sanitize(trial_id),
    trialIds: sanitizeTrialIds(trial_ids),
    rosterData: roster_data,
    tags: Array.isArray(tags) ? tags.filter(isValidTag).slice(0, 10).map(sanitize) : [],
    isAnonymous: is_anonymous !== undefined ? !!is_anonymous : !!existing?.is_anonymous,
    recommendedAddons:
      recommended_addons !== undefined
        ? recommendedAddonsJson
        : ((existing?.recommended_addons as string | null) ?? null),
  });

  if (!updated) return c.json({ error: 'Not found or forbidden' }, 404);
  await recordRateLimitEvent(c.env.DB, user.id, 'roster_update');
  const roster = await getRosterById(c.env.DB, c.req.param('id'), user.id);

  // Notify Discord bot to refresh any linked channels (fire-and-forget)
  c.executionCtx.waitUntil(notifyDiscordSync(c.env, c.req.param('id')));

  return c.json({ roster });
});

// ─── DELETE /rosters/:id — delete own roster ─────────────────────────────────

app.delete('/rosters/:id', async (c) => {
  const user = await validateToken(c.req.header('Authorization'), c.env);
  if (!user) return c.json({ error: 'Unauthorized' }, 401);

  const deleted = await deleteRoster(c.env.DB, c.req.param('id'), user.id);
  if (!deleted) return c.json({ error: 'Not found or forbidden' }, 404);
  return c.json({ ok: true });
});

// ─── POST /rosters/:id/vote — toggle upvote ──────────────────────────────────

app.post('/rosters/:id/vote', async (c) => {
  const user = await validateToken(c.req.header('Authorization'), c.env);
  if (!user) return c.json({ error: 'Unauthorized' }, 401);

  const rosterId = c.req.param('id');

  const voteAllowed = await checkRosterVoteRateLimit(c.env.DB, user.id);
  if (!voteAllowed)
    return c.json({ error: 'Rate limit exceeded. You can only cast 20 votes per hour.' }, 429);

  // Ensure roster exists
  const exists = await c.env.DB.prepare('SELECT id FROM rosters WHERE id = ?')
    .bind(rosterId)
    .first();
  if (!exists) return c.json({ error: 'Not found' }, 404);

  await recordRateLimitEvent(c.env.DB, user.id, 'roster_vote');
  const result = await toggleVote(c.env.DB, rosterId, user.id);
  return c.json(result);
});

// ─── GET /rosters/:id/comments — list comments for a roster ─────────────────

app.get('/rosters/:id/comments', async (c) => {
  const rosterId = c.req.param('id');

  // Verify roster exists
  const exists = await c.env.DB.prepare('SELECT id FROM rosters WHERE id = ?')
    .bind(rosterId)
    .first();
  if (!exists) return c.json({ error: 'Not found' }, 404);

  const comments = await listComments(c.env.DB, rosterId);
  return c.json({ comments });
});

// ─── POST /rosters/:id/comments — add a comment ────────────────────────────

app.post('/rosters/:id/comments', async (c) => {
  const user = await validateToken(c.req.header('Authorization'), c.env);
  if (!user) return c.json({ error: 'Unauthorized' }, 401);

  const rosterId = c.req.param('id');

  // Verify roster exists
  const exists = await c.env.DB.prepare('SELECT id FROM rosters WHERE id = ?')
    .bind(rosterId)
    .first();
  if (!exists) return c.json({ error: 'Roster not found' }, 404);

  // Rate limit: 5 comments per minute per user
  const allowed = await checkCommentRateLimit(c.env.DB, user.id);
  if (!allowed) return c.json({ error: 'Rate limit exceeded. Try again in a minute.' }, 429);

  interface CommentBody {
    body: string;
    parent_id?: string;
  }

  let body: CommentBody;
  try {
    body = await c.req.json<CommentBody>();
  } catch {
    return c.json({ error: 'Invalid JSON' }, 400);
  }

  if (!body.body?.trim()) return c.json({ error: 'body is required' }, 400);
  if (body.body.length > 1000) return c.json({ error: 'Comment must be ≤ 1000 characters' }, 400);

  // If replying, verify parent exists and belongs to same roster
  if (body.parent_id) {
    const parent = await c.env.DB.prepare(
      'SELECT id, parent_id FROM roster_comments WHERE id = ? AND roster_id = ?',
    )
      .bind(body.parent_id, rosterId)
      .first<{ id: string; parent_id: string | null }>();
    if (!parent) return c.json({ error: 'Parent comment not found' }, 404);
    // Only allow 1-level nesting
    if (parent.parent_id) return c.json({ error: 'Cannot reply to a reply' }, 400);
  }

  const id = Array.from(crypto.getRandomValues(new Uint8Array(10)))
    .map((b) => b.toString(36).padStart(2, '0'))
    .join('')
    .slice(0, 12);

  const comment = await createComment(c.env.DB, {
    id,
    rosterId,
    parentId: body.parent_id ?? null,
    authorId: user.id,
    authorName: user.name,
    body: body.body.trim(),
  });

  return c.json({ comment }, 201);
});

// ─── DELETE /rosters/:rosterId/comments/:commentId — delete own comment ─────

app.delete('/rosters/:rosterId/comments/:commentId', async (c) => {
  const user = await validateToken(c.req.header('Authorization'), c.env);
  if (!user) return c.json({ error: 'Unauthorized' }, 401);

  const deleted = await deleteComment(c.env.DB, c.req.param('commentId'), user.id);
  if (!deleted) return c.json({ error: 'Not found or forbidden' }, 404);
  return c.json({ ok: true });
});

// ═══════════════════════════════════════════════════════════════════════════════
// Build Hub routes — mirror the roster routes with /builds prefix
// ═══════════════════════════════════════════════════════════════════════════════

// ─── GET /builds — list with filtering & pagination ──────────────────────────

app.get('/builds', async (c) => {
  const user = await validateToken(c.req.header('Authorization'), c.env);

  const esoClass = c.req.query('class') ?? undefined;
  const role = c.req.query('role') ?? undefined;
  const gameMode = c.req.query('mode') ?? undefined;
  const tag = c.req.query('tag') ?? undefined;
  const sort = c.req.query('sort') === 'recent' ? 'recent' : 'votes';
  const page = Math.max(1, parseInt(c.req.query('page') ?? '1', 10) || 1);

  const builds = await listBuilds(c.env.DB, {
    esoClass,
    role,
    gameMode,
    tag,
    sort,
    page,
    userId: user?.id,
  });

  return c.json({ builds, page, sort });
});

// ─── GET /builds/:id — single build ──────────────────────────────────────────

app.get('/builds/:id', async (c) => {
  const user = await validateToken(c.req.header('Authorization'), c.env);
  const build = await getBuildById(c.env.DB, c.req.param('id'), user?.id);

  if (!build) {
    return c.json({ error: 'Not found' }, 404);
  }
  return c.json({ build });
});

// ─── POST /builds — publish a build ──────────────────────────────────────────

app.post('/builds', async (c) => {
  const user = await validateToken(c.req.header('Authorization'), c.env);
  if (!user) return c.json({ error: 'Unauthorized' }, 401);

  interface CreateBuildBody {
    title: string;
    description?: string;
    eso_class: string;
    role: string;
    game_mode?: string;
    build_data: string;
    visibility?: string;
    tags?: string[];
    is_anonymous?: boolean;
  }

  let body: CreateBuildBody;
  try {
    body = await c.req.json<CreateBuildBody>();
  } catch {
    return c.json({ error: 'Invalid JSON' }, 400);
  }

  const {
    title,
    description = '',
    eso_class,
    role,
    game_mode = 'pve',
    build_data,
    tags = [],
    is_anonymous = false,
  } = body;

  if (!title?.trim()) return c.json({ error: 'title is required' }, 400);
  if (!eso_class?.trim()) return c.json({ error: 'eso_class is required' }, 400);
  if (!role?.trim()) return c.json({ error: 'role is required' }, 400);
  if (!build_data?.trim()) return c.json({ error: 'build_data is required' }, 400);
  if (title.length > 100) return c.json({ error: 'title must be ≤ 100 characters' }, 400);
  if (description.length > 500)
    return c.json({ error: 'description must be ≤ 500 characters' }, 400);
  if (build_data.length > 50_000)
    return c.json({ error: 'build_data must be ≤ 50 000 characters' }, 400);
  if (!isValidBase64Url(build_data))
    return c.json({ error: 'build_data must be valid base64url' }, 400);
  if (body.visibility !== undefined && !isValidVisibility(body.visibility))
    return c.json({ error: 'visibility must be one of public, private, link-only' }, 400);

  // Rate-limit BEFORE decompressing attacker-controlled build_data (matches the
  // /temp-builds ordering) so a flood can't force unbounded inflate work per request.
  const createAllowed = await checkBuildCreateRateLimit(c.env.DB, user.id);
  if (!createAllowed)
    return c.json({ error: 'Rate limit exceeded. You can only publish 5 builds per hour.' }, 429);

  // Visibility is authoritative only when we can actually decode it from
  // build_data. Fail closed if the blob is undecodable — never store a caller's
  // claimed visibility for a payload the server couldn't verify (that would let
  // a malformed/opaque blob be published as public). Then reconcile: trust the
  // blob when the field is omitted, and reject a body value that contradicts it.
  const embeddedVisibility = await decodeEmbeddedVisibility(build_data);
  if (embeddedVisibility === null)
    return c.json({ error: 'Could not verify build visibility from build_data.' }, 400);
  if (body.visibility !== undefined && body.visibility !== embeddedVisibility)
    return c.json({ error: 'visibility does not match the encoded build.' }, 400);
  const visibility: (typeof BUILD_VISIBILITIES)[number] = embeddedVisibility;

  const id = Array.from(crypto.getRandomValues(new Uint8Array(10)))
    .map((b) => b.toString(36).padStart(2, '0'))
    .join('')
    .slice(0, 12);

  await createBuild(c.env.DB, {
    id,
    authorId: user.id,
    authorName: user.name,
    title: cleanText(title),
    description: cleanText(description),
    esoClass: sanitize(eso_class),
    role: sanitize(role),
    gameMode: sanitize(game_mode),
    buildData: build_data,
    visibility,
    tags: Array.isArray(tags) ? tags.filter(isValidTag).slice(0, 10).map(sanitize) : [],
    isAnonymous: !!is_anonymous,
  });

  const build = await getBuildById(c.env.DB, id, user.id);
  return c.json({ build }, 201);
});

// ─── PUT /builds/:id — update own build ──────────────────────────────────────

app.put('/builds/:id', async (c) => {
  const user = await validateToken(c.req.header('Authorization'), c.env);
  if (!user) return c.json({ error: 'Unauthorized' }, 401);

  // Rate-limit BEFORE decompressing attacker-controlled build_data.
  if (!(await checkUpdateRateLimit(c.env.DB, user.id, 'build_update')))
    return c.json({ error: UPDATE_RATE_LIMIT_MESSAGE }, 429);

  interface UpdateBuildBody {
    title: string;
    description?: string;
    eso_class: string;
    role: string;
    game_mode?: string;
    build_data: string;
    visibility?: string;
    tags?: string[];
    is_anonymous?: boolean;
  }

  let body: UpdateBuildBody;
  try {
    body = await c.req.json<UpdateBuildBody>();
  } catch {
    return c.json({ error: 'Invalid JSON' }, 400);
  }

  const {
    title,
    description = '',
    eso_class,
    role,
    game_mode = 'pve',
    build_data,
    tags = [],
    is_anonymous = false,
  } = body;

  if (!title?.trim()) return c.json({ error: 'title is required' }, 400);
  if (!eso_class?.trim()) return c.json({ error: 'eso_class is required' }, 400);
  if (!role?.trim()) return c.json({ error: 'role is required' }, 400);
  if (!build_data?.trim()) return c.json({ error: 'build_data is required' }, 400);
  if (title.length > 100) return c.json({ error: 'title must be ≤ 100 characters' }, 400);
  if (description.length > 500)
    return c.json({ error: 'description must be ≤ 500 characters' }, 400);
  if (build_data.length > 50_000)
    return c.json({ error: 'build_data must be ≤ 50 000 characters' }, 400);
  if (!isValidBase64Url(build_data))
    return c.json({ error: 'build_data must be valid base64url' }, 400);
  if (body.visibility !== undefined && !isValidVisibility(body.visibility))
    return c.json({ error: 'visibility must be one of public, private, link-only' }, 400);

  // build_data is always replaced on update, so the stored visibility column
  // must track the new blob — and only a decodable blob yields an authoritative
  // value. Fail closed if undecodable (don't let an opaque payload replace a
  // build and be marked public from the request); otherwise trust the blob and
  // reject a body value that contradicts it.
  const embeddedVisibility = await decodeEmbeddedVisibility(build_data);
  if (embeddedVisibility === null)
    return c.json({ error: 'Could not verify build visibility from build_data.' }, 400);
  if (body.visibility !== undefined && body.visibility !== embeddedVisibility)
    return c.json({ error: 'visibility does not match the encoded build.' }, 400);
  const visibility: (typeof BUILD_VISIBILITIES)[number] = embeddedVisibility;

  const updated = await updateBuild(c.env.DB, c.req.param('id'), user.id, {
    title: cleanText(title),
    description: cleanText(description),
    esoClass: sanitize(eso_class),
    role: sanitize(role),
    gameMode: sanitize(game_mode),
    buildData: build_data,
    visibility,
    tags: Array.isArray(tags) ? tags.filter(isValidTag).slice(0, 10).map(sanitize) : [],
    isAnonymous: !!is_anonymous,
  });

  if (!updated) return c.json({ error: 'Not found or forbidden' }, 404);
  await recordRateLimitEvent(c.env.DB, user.id, 'build_update');
  const build = await getBuildById(c.env.DB, c.req.param('id'), user.id);
  return c.json({ build });
});

// ─── DELETE /builds/:id — delete own build ────────────────────────────────────

app.delete('/builds/:id', async (c) => {
  const user = await validateToken(c.req.header('Authorization'), c.env);
  if (!user) return c.json({ error: 'Unauthorized' }, 401);

  const deleted = await deleteBuild(c.env.DB, c.req.param('id'), user.id);
  if (!deleted) return c.json({ error: 'Not found or forbidden' }, 404);
  return c.json({ ok: true });
});

// ─── POST /builds/:id/vote — toggle upvote ────────────────────────────────────

app.post('/builds/:id/vote', async (c) => {
  const user = await validateToken(c.req.header('Authorization'), c.env);
  if (!user) return c.json({ error: 'Unauthorized' }, 401);

  const buildId = c.req.param('id');
  const build = await getBuildById(c.env.DB, buildId, user.id);
  if (!build) return c.json({ error: 'Not found' }, 404);

  const allowed = await checkBuildVoteRateLimit(c.env.DB, user.id);
  if (!allowed)
    return c.json({ error: 'Rate limit exceeded. Too many votes in the last hour.' }, 429);

  await recordRateLimitEvent(c.env.DB, user.id, 'build_vote');
  const result = await toggleBuildVote(c.env.DB, buildId, user.id);
  return c.json(result);
});

// ─── GET /builds/:id/comments ─────────────────────────────────────────────────

app.get('/builds/:id/comments', async (c) => {
  const user = await validateToken(c.req.header('Authorization'), c.env);
  const buildId = c.req.param('id');
  const build = await getBuildById(c.env.DB, buildId, user?.id);
  if (!build) return c.json({ error: 'Not found' }, 404);

  const comments = await listBuildComments(c.env.DB, buildId);
  return c.json({ comments });
});

// ─── POST /builds/:id/comments ────────────────────────────────────────────────

app.post('/builds/:id/comments', async (c) => {
  const user = await validateToken(c.req.header('Authorization'), c.env);
  if (!user) return c.json({ error: 'Unauthorized' }, 401);

  const buildId = c.req.param('id');
  const build = await getBuildById(c.env.DB, buildId, user.id);
  if (!build) return c.json({ error: 'Build not found' }, 404);

  const allowed = await checkBuildCommentRateLimit(c.env.DB, user.id);
  if (!allowed) return c.json({ error: 'Rate limit exceeded. Try again in a minute.' }, 429);

  interface CommentBody {
    body: string;
    parent_id?: string;
  }

  let body: CommentBody;
  try {
    body = await c.req.json<CommentBody>();
  } catch {
    return c.json({ error: 'Invalid JSON' }, 400);
  }

  if (!body.body?.trim()) return c.json({ error: 'body is required' }, 400);
  if (body.body.length > 1000) return c.json({ error: 'Comment must be ≤ 1000 characters' }, 400);

  if (body.parent_id) {
    const parent = await c.env.DB.prepare(
      'SELECT id, parent_id FROM build_comments WHERE id = ? AND build_id = ?',
    )
      .bind(body.parent_id, buildId)
      .first<{ id: string; parent_id: string | null }>();
    if (!parent) return c.json({ error: 'Parent comment not found' }, 404);
    if (parent.parent_id) return c.json({ error: 'Cannot reply to a reply' }, 400);
  }

  const id = Array.from(crypto.getRandomValues(new Uint8Array(10)))
    .map((b) => b.toString(36).padStart(2, '0'))
    .join('')
    .slice(0, 12);

  const comment = await createBuildComment(c.env.DB, {
    id,
    buildId,
    parentId: body.parent_id ?? null,
    authorId: user.id,
    authorName: user.name,
    body: body.body.trim(),
  });

  return c.json({ comment }, 201);
});

// ─── DELETE /builds/:buildId/comments/:commentId ──────────────────────────────

app.delete('/builds/:buildId/comments/:commentId', async (c) => {
  const user = await validateToken(c.req.header('Authorization'), c.env);
  if (!user) return c.json({ error: 'Unauthorized' }, 401);

  const deleted = await deleteBuildComment(c.env.DB, c.req.param('commentId'), user.id);
  if (!deleted) return c.json({ error: 'Not found or forbidden' }, 404);
  return c.json({ ok: true });
});

// ═══════════════════════════════════════════════════════════════════════════════
// Temp builds — guest-created builds with 5-day expiry, no auth required
// ═══════════════════════════════════════════════════════════════════════════════

// ─── POST /temp-builds — create a temporary build link ──────────────────────

app.post('/temp-builds', async (c) => {
  interface TempBuildBody {
    build_data: string;
  }

  let body: TempBuildBody;
  try {
    body = await c.req.json<TempBuildBody>();
  } catch {
    return c.json({ error: 'Invalid JSON' }, 400);
  }

  if (!body.build_data?.trim()) return c.json({ error: 'build_data is required' }, 400);
  if (body.build_data.length > 50_000)
    return c.json({ error: 'build_data must be ≤ 50 000 characters' }, 400);
  if (!isValidBase64Url(body.build_data))
    return c.json({ error: 'build_data must be valid base64url' }, 400);

  // Rate limit by IP (10 per hour) BEFORE decompressing attacker-supplied data —
  // decompression is the expensive step, so throttle first to blunt a
  // decompression-bomb DoS on this unauthenticated endpoint.
  const ip = c.req.header('CF-Connecting-IP') ?? 'unknown';
  const allowed = await checkTempBuildRateLimit(c.env.DB, ip);
  if (!allowed)
    return c.json(
      { error: 'Rate limit exceeded. You can create up to 10 temp builds per hour.' },
      429,
    );

  await recordTempBuildRateLimit(c.env.DB, ip);

  // A temp link is a public, unauthenticated share surface. Refuse to host a
  // Private build (and fail closed if the blob can't be decoded) so the UI guard
  // can't be bypassed by a direct API call or an out-of-date client.
  const tempVisibility = await decodeEmbeddedVisibility(body.build_data);
  if (tempVisibility !== 'public' && tempVisibility !== 'link-only') {
    return c.json({ error: 'Private builds cannot be shared as a temporary link.' }, 403);
  }

  const id = Array.from(crypto.getRandomValues(new Uint8Array(10)))
    .map((b) => b.toString(36).padStart(2, '0'))
    .join('')
    .slice(0, 12);

  const row = await createTempBuild(c.env.DB, { id, buildData: body.build_data });

  return c.json({ id: row.id, expires_at: row.expires_at }, 201);
});

// ─── GET /temp-builds/:id — fetch a temporary build ──────────────────────────

app.get('/temp-builds/:id', async (c) => {
  const id = c.req.param('id');

  // Probabilistic cleanup: run ~1-in-50 reads to keep the table small without
  // adding a synchronous write to every request.
  if (Math.random() < 0.02) {
    void cleanupExpiredTempBuilds(c.env.DB);
  }

  const row = await getTempBuild(c.env.DB, id);
  if (!row) {
    return c.json({ error: 'This build link has expired or does not exist.' }, 410);
  }

  // Enforce visibility at read time too — POST only began rejecting private
  // payloads recently, so a temp row created earlier can still embed a private
  // build. Decode and refuse to disclose it (fail closed on undecodable rows).
  // Return 410 (same as missing) so a private link is indistinguishable from an
  // expired one and existence isn't leaked.
  const tempVisibility = await decodeEmbeddedVisibility(row.build_data);
  if (tempVisibility !== 'public' && tempVisibility !== 'link-only') {
    return c.json({ error: 'This build link has expired or does not exist.' }, 410);
  }

  return c.json({
    build_data: row.build_data,
    created_at: row.created_at,
    expires_at: row.expires_at,
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// Image uploads — AI-moderated image hosting via ImgBB
// ═══════════════════════════════════════════════════════════════════════════════

// ─── POST /images/upload — upload with AI moderation ─────────────────────────

app.post('/images/upload', async (c) => {
  const user = await validateToken(c.req.header('Authorization'), c.env);
  if (!user) return c.json({ error: 'Unauthorized' }, 401);

  // Rate limit: 10 uploads per hour
  const allowed = await checkImageUploadRateLimit(c.env.DB, user.id);
  if (!allowed)
    return c.json({ error: 'Rate limit exceeded. You can upload up to 10 images per hour.' }, 429);

  await recordRateLimitEvent(c.env.DB, user.id, 'image_upload');

  interface UploadBody {
    image: string; // base64 (raw or data-URL)
    name?: string;
  }

  let body: UploadBody;
  try {
    body = await c.req.json<UploadBody>();
  } catch {
    return c.json({ error: 'Invalid JSON' }, 400);
  }

  if (!body.image?.trim()) return c.json({ error: 'image is required' }, 400);

  // Strip data-URL prefix if present
  let base64 = body.image;
  const commaIdx = base64.indexOf(',');
  if (commaIdx !== -1 && base64.startsWith('data:')) {
    base64 = base64.slice(commaIdx + 1);
  }

  // Decode base64 → bytes
  let imageBytes: Uint8Array;
  try {
    const binaryString = atob(base64);
    imageBytes = Uint8Array.from(binaryString, (ch) => ch.charCodeAt(0));
  } catch {
    return c.json({ error: 'Invalid base64 image data' }, 400);
  }

  if (imageBytes.byteLength > MAX_IMAGE_BYTES) {
    return c.json({ error: 'Image must be ≤ 10 MB' }, 400);
  }

  // Validate image magic numbers (PNG, JPEG, WebP, GIF)
  const isValidImage =
    (imageBytes[0] === 0x89 &&
      imageBytes[1] === 0x50 &&
      imageBytes[2] === 0x4e &&
      imageBytes[3] === 0x47) || // PNG
    (imageBytes[0] === 0xff && imageBytes[1] === 0xd8 && imageBytes[2] === 0xff) || // JPEG
    (imageBytes[0] === 0x52 &&
      imageBytes[1] === 0x49 &&
      imageBytes[2] === 0x46 &&
      imageBytes[3] === 0x46 &&
      imageBytes[8] === 0x57 &&
      imageBytes[9] === 0x45 &&
      imageBytes[10] === 0x42 &&
      imageBytes[11] === 0x50) || // WebP
    (imageBytes[0] === 0x47 && imageBytes[1] === 0x49 && imageBytes[2] === 0x46); // GIF
  if (!isValidImage) {
    return c.json({ error: 'Unsupported image format. Use PNG, JPEG, WebP, or GIF.' }, 400);
  }

  // ── Workers AI moderation ────────────────────────────────────────────────
  try {
    const moderation = await moderateImage(c.env.AI, imageBytes);
    if (!moderation.safe) {
      return c.json(
        {
          error: 'Image flagged as inappropriate and cannot be uploaded.',
          label: moderation.blockedLabel,
        },
        400,
      );
    }
  } catch (err) {
    console.error('Workers AI moderation unavailable:', err);
    return c.json({ error: 'Image moderation service unavailable. Please try again.' }, 503);
  }

  // ── Proxy to ImgBB ───────────────────────────────────────────────────────
  const formData = new FormData();
  formData.append('key', c.env.IMGBB_API_KEY);
  formData.append('image', base64);
  if (body.name) formData.append('name', body.name);

  const imgbbRes = await fetch('https://api.imgbb.com/1/upload', {
    method: 'POST',
    body: formData,
  });

  if (!imgbbRes.ok) {
    const errBody = await imgbbRes.text();
    console.error('ImgBB upload failed:', errBody);
    return c.json({ error: 'Image host upload failed' }, 502);
  }

  interface ImgBBResponse {
    data: {
      id: string;
      url: string;
      thumb: { url: string };
      delete_url: string;
    };
  }

  const imgbb = (await imgbbRes.json()) as ImgBBResponse;

  // ── Store metadata in D1 ─────────────────────────────────────────────────
  const id = Array.from(crypto.getRandomValues(new Uint8Array(10)))
    .map((b) => b.toString(36).padStart(2, '0'))
    .join('')
    .slice(0, 12);

  await createImageUpload(c.env.DB, {
    id,
    uploaderId: user.id,
    uploaderName: user.name,
    url: imgbb.data.url,
    thumbUrl: imgbb.data.thumb.url,
    deleteUrl: imgbb.data.delete_url,
  });

  return c.json({ id, url: imgbb.data.url, thumb_url: imgbb.data.thumb.url }, 201);
});

// ─── POST /images/:id/report — flag an image ────────────────────────────────

app.post('/images/:id/report', async (c) => {
  const user = await validateToken(c.req.header('Authorization'), c.env);
  if (!user) return c.json({ error: 'Unauthorized' }, 401);

  const imageId = c.req.param('id');
  const image = await getImageUpload(c.env.DB, imageId);
  if (!image) return c.json({ error: 'Image not found' }, 404);

  interface ReportBody {
    reason: string;
  }

  let body: ReportBody;
  try {
    body = await c.req.json<ReportBody>();
  } catch {
    return c.json({ error: 'Invalid JSON' }, 400);
  }

  if (!body.reason?.trim()) return c.json({ error: 'reason is required' }, 400);
  if (body.reason.length > 500) return c.json({ error: 'reason must be ≤ 500 characters' }, 400);

  const existing = await c.env.DB.prepare(
    'SELECT id FROM image_reports WHERE image_id = ? AND reporter_id = ?',
  )
    .bind(imageId, user.id)
    .first();
  if (existing) return c.json({ error: 'You have already reported this image' }, 409);

  const id = Array.from(crypto.getRandomValues(new Uint8Array(10)))
    .map((b) => b.toString(36).padStart(2, '0'))
    .join('')
    .slice(0, 12);

  await createImageReport(c.env.DB, {
    id,
    imageId,
    reporterId: user.id,
    reason: body.reason.trim(),
  });

  return c.json({ ok: true }, 201);
});

// ─── DELETE /images/:id — delete own image ───────────────────────────────────

app.delete('/images/:id', async (c) => {
  const user = await validateToken(c.req.header('Authorization'), c.env);
  if (!user) return c.json({ error: 'Unauthorized' }, 401);

  const result = await deleteImageUpload(c.env.DB, c.req.param('id'), user.id);
  if (!result.deleted) return c.json({ error: 'Not found or forbidden' }, 404);

  // Best-effort delete from ImgBB (fire-and-forget)
  // Validate the URL is an ImgBB domain before fetching to prevent SSRF
  if (result.deleteUrl && /^https:\/\/ibb\.co\//.test(result.deleteUrl)) {
    fetch(result.deleteUrl).catch(() => {});
  }

  return c.json({ ok: true });
});

// ═══════════════════════════════════════════════════════════════════════════════
// User profiles — public pages, no new content storage
// ═══════════════════════════════════════════════════════════════════════════════

// Valid ESO Logs username characters — letters, digits, underscores, hyphens, dots,
// apostrophes, and spaces (ESO display names commonly include ' and spaces).
// All queries are parameterised so special characters carry no injection risk.
const VALID_USERNAME_RE = /^[a-zA-Z0-9_.\-' ]{1,100}$/;

// Names reserved by the API namespace — prevent /users/me matching the profile route
const RESERVED_USERNAMES = new Set(['me']);

// ─── GET /users/:username — public profile ────────────────────────────────────

app.get('/users/:username', async (c) => {
  const username = c.req.param('username');

  if (!VALID_USERNAME_RE.test(username)) {
    return c.json({ error: 'Invalid username' }, 400);
  }
  if (RESERVED_USERNAMES.has(username.toLowerCase())) {
    return c.json({ error: 'User not found' }, 404);
  }

  const profile = await getUserProfile(c.env.DB, username);
  if (!profile) {
    return c.json({ error: 'User not found' }, 404);
  }

  return c.json({ profile });
});

// ─── PUT /users/me/bio — update own bio ──────────────────────────────────────

app.put('/users/me/bio', async (c) => {
  const user = await validateToken(c.req.header('Authorization'), c.env);
  if (!user) return c.json({ error: 'Unauthorized' }, 401);

  // Rate limit: 1 bio update per 60 seconds using the profile row's updated_at
  const recent = await c.env.DB.prepare(
    "SELECT 1 FROM user_profiles WHERE author_id = ? AND updated_at > datetime('now', '-60 seconds')",
  )
    .bind(user.id)
    .first();
  if (recent) {
    return c.json({ error: 'Rate limit exceeded. Wait 60 seconds between bio updates.' }, 429);
  }

  interface BioBody {
    bio: string;
  }

  let body: BioBody;
  try {
    body = await c.req.json<BioBody>();
  } catch {
    return c.json({ error: 'Invalid JSON' }, 400);
  }

  if (typeof body.bio !== 'string') return c.json({ error: 'bio must be a string' }, 400);
  if (body.bio.length > 200) return c.json({ error: 'bio must be ≤ 200 characters' }, 400);

  await upsertUserBio(c.env.DB, user.id, user.name, cleanText(body.bio));
  return c.json({ ok: true });
});

// ─── PUT /users/me/avatar — upload avatar image ─────────────────────────────

/** Maximum avatar size in bytes (2 MB). */
const MAX_AVATAR_BYTES = 2 * 1024 * 1024;

app.put('/users/me/avatar', async (c) => {
  const user = await validateToken(c.req.header('Authorization'), c.env);
  if (!user) return c.json({ error: 'Unauthorized' }, 401);

  // Rate limit: 1 avatar upload per hour
  const allowed = await checkAvatarUploadRateLimit(c.env.DB, user.id);
  if (!allowed) {
    return c.json({ error: 'Rate limit exceeded. You can update your avatar once per hour.' }, 429);
  }

  interface AvatarBody {
    image: string; // base64 (raw or data-URL)
  }

  let body: AvatarBody;
  try {
    body = await c.req.json<AvatarBody>();
  } catch {
    return c.json({ error: 'Invalid JSON' }, 400);
  }

  if (!body.image?.trim()) return c.json({ error: 'image is required' }, 400);

  // Strip data-URL prefix if present
  let base64 = body.image;
  const commaIdx = base64.indexOf(',');
  if (commaIdx !== -1 && base64.startsWith('data:')) {
    base64 = base64.slice(commaIdx + 1);
  }

  // Decode base64 → bytes
  let imageBytes: Uint8Array;
  try {
    const binaryString = atob(base64);
    imageBytes = Uint8Array.from(binaryString, (ch) => ch.charCodeAt(0));
  } catch {
    return c.json({ error: 'Invalid base64 image data' }, 400);
  }

  if (imageBytes.byteLength > MAX_AVATAR_BYTES) {
    return c.json({ error: 'Avatar image must be ≤ 2 MB' }, 400);
  }

  // Validate image magic numbers (PNG, JPEG, WebP, GIF)
  const isValidAvatar =
    (imageBytes[0] === 0x89 &&
      imageBytes[1] === 0x50 &&
      imageBytes[2] === 0x4e &&
      imageBytes[3] === 0x47) || // PNG
    (imageBytes[0] === 0xff && imageBytes[1] === 0xd8 && imageBytes[2] === 0xff) || // JPEG
    (imageBytes[0] === 0x52 &&
      imageBytes[1] === 0x49 &&
      imageBytes[2] === 0x46 &&
      imageBytes[3] === 0x46 &&
      imageBytes[8] === 0x57 &&
      imageBytes[9] === 0x45 &&
      imageBytes[10] === 0x42 &&
      imageBytes[11] === 0x50) || // WebP
    (imageBytes[0] === 0x47 && imageBytes[1] === 0x49 && imageBytes[2] === 0x46); // GIF
  if (!isValidAvatar) {
    return c.json({ error: 'Unsupported image format. Use PNG, JPEG, WebP, or GIF.' }, 400);
  }

  // ── Workers AI moderation ────────────────────────────────────────────────
  try {
    const moderation = await moderateImage(c.env.AI, imageBytes);
    if (!moderation.safe) {
      return c.json(
        {
          error: 'Image flagged as inappropriate and cannot be used as an avatar.',
          label: moderation.blockedLabel,
        },
        400,
      );
    }
  } catch (err) {
    console.error('Workers AI moderation unavailable:', err);
    return c.json({ error: 'Image moderation service unavailable. Please try again.' }, 503);
  }

  // ── Proxy to ImgBB ───────────────────────────────────────────────────────
  const formData = new FormData();
  formData.append('key', c.env.IMGBB_API_KEY);
  formData.append('image', base64);
  formData.append('name', `avatar_${user.id}`);

  const imgbbRes = await fetch('https://api.imgbb.com/1/upload', {
    method: 'POST',
    body: formData,
  });

  if (!imgbbRes.ok) {
    const errBody = await imgbbRes.text();
    console.error('ImgBB avatar upload failed:', errBody);
    return c.json({ error: 'Image host upload failed' }, 502);
  }

  interface ImgBBResponse {
    data: {
      id: string;
      url: string;
      thumb: { url: string };
      delete_url: string;
    };
  }

  const imgbb = (await imgbbRes.json()) as ImgBBResponse;

  // ── Delete previous avatar from ImgBB before overwriting ────────────────
  const oldDeleteUrl = await getAvatarDeleteUrl(c.env.DB, user.id);
  tryDeleteImgBBImage(oldDeleteUrl);

  // ── Store avatar URL + delete handle in profile ─────────────────────────
  await upsertUserAvatar(
    c.env.DB,
    user.id,
    user.name,
    imgbb.data.url,
    imgbb.data.thumb.url,
    imgbb.data.delete_url,
  );

  return c.json({ avatar_url: imgbb.data.url, avatar_thumb_url: imgbb.data.thumb.url });
});

// ─── DELETE /users/me/avatar — remove avatar ────────────────────────────────

app.delete('/users/me/avatar', async (c) => {
  const user = await validateToken(c.req.header('Authorization'), c.env);
  if (!user) return c.json({ error: 'Unauthorized' }, 401);

  const { avatarDeleteUrl } = await deleteUserAvatar(c.env.DB, user.id);
  tryDeleteImgBBImage(avatarDeleteUrl);
  return c.json({ ok: true });
});

// ─── PUT /users/me/display-names — sync ESO @handles ────────────────────────

app.put('/users/me/display-names', async (c) => {
  const user = await validateToken(c.req.header('Authorization'), c.env);
  if (!user) return c.json({ error: 'Unauthorized' }, 401);

  // Rate limit: 1 display-name update per 60 seconds (shares the profile row's
  // updated_at with the bio route). Prevents flooding unbounded D1 writes and
  // rapid @handle churn.
  const recent = await c.env.DB.prepare(
    "SELECT 1 FROM user_profiles WHERE author_id = ? AND updated_at > datetime('now', '-60 seconds')",
  )
    .bind(user.id)
    .first();
  if (recent) {
    return c.json(
      { error: 'Rate limit exceeded. Wait 60 seconds between display-name updates.' },
      429,
    );
  }

  let body: { na_display_name?: string | null; eu_display_name?: string | null };
  try {
    body = await c.req.json();
  } catch {
    return c.json({ error: 'Invalid JSON' }, 400);
  }

  const na = body.na_display_name?.trim() || null;
  const eu = body.eu_display_name?.trim() || null;

  // Validate @handle shape/length so a caller can't claim an arbitrary or oversized
  // handle. A UNIQUE index per column (migration-display-names-unique.sql) then
  // blocks two accounts binding the same @handle (avatar-impersonation guard).
  if (na !== null && !isValidDisplayName(na))
    return c.json({ error: 'na_display_name must be a valid @handle' }, 400);
  if (eu !== null && !isValidDisplayName(eu))
    return c.json({ error: 'eu_display_name must be a valid @handle' }, 400);

  try {
    await updateDisplayNames(c.env.DB, user.id, user.name, na, eu);
  } catch (err) {
    if (err instanceof Error && /UNIQUE constraint failed/i.test(err.message)) {
      return c.json({ error: 'That @handle is already claimed by another account.' }, 409);
    }
    throw err;
  }
  return c.json({ ok: true });
});

// ─── POST /users/avatars/lookup — batch avatar lookup by @displayName+server ─

app.post('/users/avatars/lookup', async (c) => {
  let body: { players?: unknown };
  try {
    body = await c.req.json();
  } catch {
    return c.json({ error: 'Invalid JSON' }, 400);
  }

  if (!Array.isArray(body.players) || body.players.length === 0) {
    return c.json({ avatars: {} });
  }

  // Validate each entry before it reaches D1 — drop anything that isn't a
  // { server: 'na'|'eu', display_name: string } so a malformed element can't throw
  // a TypeError (unauthenticated 500 amplifier).
  const players: PlayerLookupEntry[] = body.players
    .filter(
      (p): p is PlayerLookupEntry =>
        !!p &&
        typeof p === 'object' &&
        typeof (p as PlayerLookupEntry).display_name === 'string' &&
        (p as PlayerLookupEntry).display_name.length <= 64 &&
        ((p as PlayerLookupEntry).server === 'na' || (p as PlayerLookupEntry).server === 'eu'),
    )
    // Cap at 24 entries (max group size in ESO)
    .slice(0, 24);

  if (players.length === 0) return c.json({ avatars: {} });

  const avatars = await lookupAvatarsByDisplayNames(c.env.DB, players);
  return c.json({ avatars });
});

// ═════════════════════════════════════════════════════════════════════════════
// Pack Hub endpoints
// ═════════════════════════════════════════════════════════════════════════════

const VALID_PACK_TYPES = ['addon-pack', 'build-pack', 'roster-pack'];

// ─── GET /packs — list with filtering & pagination ──────────────────────────

app.get('/packs', async (c) => {
  const user = await validateToken(c.req.header('Authorization'), c.env);

  const packType = c.req.query('type') ?? undefined;
  const tag = c.req.query('tag') ?? undefined;
  const sort = c.req.query('sort') === 'recent' ? 'recent' : 'votes';
  const page = Math.max(1, parseInt(c.req.query('page') ?? '1', 10) || 1);

  const packs = await listPacks(c.env.DB, {
    packType,
    tag,
    sort,
    page,
    userId: user?.id,
  });

  return c.json({ packs, page, sort });
});

// ─── GET /packs/:id — single pack ──────────────────────────────────────────

app.get('/packs/:id', async (c) => {
  const user = await validateToken(c.req.header('Authorization'), c.env);
  const pack = await getPackById(c.env.DB, c.req.param('id'), user?.id);

  if (!pack) return c.json({ error: 'Not found' }, 404);
  return c.json({ pack });
});

// ─── POST /packs — create a pack ───────────────────────────────────────────

app.post('/packs', async (c) => {
  const user = await validateToken(c.req.header('Authorization'), c.env);
  if (!user) return c.json({ error: 'Unauthorized' }, 401);

  interface CreatePackBody {
    title: string;
    description?: string;
    pack_type?: string;
    addons: RecommendedAddonEntry[];
    tags?: string[];
    is_anonymous?: boolean;
  }

  let body: CreatePackBody;
  try {
    body = await c.req.json<CreatePackBody>();
  } catch {
    return c.json({ error: 'Invalid JSON' }, 400);
  }

  const {
    title,
    description = '',
    pack_type = 'addon-pack',
    addons,
    tags = [],
    is_anonymous = false,
  } = body;

  if (!title?.trim()) return c.json({ error: 'title is required' }, 400);
  if (title.length > 100) return c.json({ error: 'title must be ≤ 100 characters' }, 400);
  if (description.length > 500)
    return c.json({ error: 'description must be ≤ 500 characters' }, 400);
  if (!VALID_PACK_TYPES.includes(pack_type))
    return c.json({ error: `pack_type must be one of: ${VALID_PACK_TYPES.join(', ')}` }, 400);
  if (!Array.isArray(addons) || addons.length === 0)
    return c.json({ error: 'At least one addon is required' }, 400);
  if (addons.length > 30) return c.json({ error: 'Maximum 30 addons per pack' }, 400);

  const sanitizedAddons = addons.map(sanitizeAddonEntry).filter(Boolean) as RecommendedAddonEntry[];
  if (sanitizedAddons.length === 0)
    return c.json({ error: 'No valid addon entries provided' }, 400);

  const createAllowed = await checkPackCreateRateLimit(c.env.DB, user.id);
  if (!createAllowed)
    return c.json({ error: 'Rate limit exceeded. You can only create 10 packs per hour.' }, 429);

  const id = Array.from(crypto.getRandomValues(new Uint8Array(10)))
    .map((b) => b.toString(36).padStart(2, '0'))
    .join('')
    .slice(0, 12);

  await createPack(c.env.DB, {
    id,
    authorId: user.id,
    authorName: user.name,
    title: cleanText(title),
    description: cleanText(description),
    packType: sanitize(pack_type),
    addons: JSON.stringify(sanitizedAddons),
    tags: Array.isArray(tags) ? tags.filter(isValidTag).slice(0, 10).map(sanitize) : [],
    isAnonymous: !!is_anonymous,
  });

  const pack = await getPackById(c.env.DB, id, user.id);
  return c.json({ pack }, 201);
});

// ─── PUT /packs/:id — update own pack ──────────────────────────────────────

app.put('/packs/:id', async (c) => {
  const user = await validateToken(c.req.header('Authorization'), c.env);
  if (!user) return c.json({ error: 'Unauthorized' }, 401);

  if (!(await checkUpdateRateLimit(c.env.DB, user.id, 'pack_update')))
    return c.json({ error: UPDATE_RATE_LIMIT_MESSAGE }, 429);

  interface UpdatePackBody {
    title: string;
    description?: string;
    pack_type?: string;
    addons: RecommendedAddonEntry[];
    tags?: string[];
    is_anonymous?: boolean;
  }

  let body: UpdatePackBody;
  try {
    body = await c.req.json<UpdatePackBody>();
  } catch {
    return c.json({ error: 'Invalid JSON' }, 400);
  }

  const {
    title,
    description = '',
    pack_type = 'addon-pack',
    addons,
    tags = [],
    is_anonymous = false,
  } = body;

  if (!title?.trim()) return c.json({ error: 'title is required' }, 400);
  if (title.length > 100) return c.json({ error: 'title must be ≤ 100 characters' }, 400);
  if (description.length > 500)
    return c.json({ error: 'description must be ≤ 500 characters' }, 400);
  if (!VALID_PACK_TYPES.includes(pack_type))
    return c.json({ error: `pack_type must be one of: ${VALID_PACK_TYPES.join(', ')}` }, 400);
  if (!Array.isArray(addons) || addons.length === 0)
    return c.json({ error: 'At least one addon is required' }, 400);
  if (addons.length > 30) return c.json({ error: 'Maximum 30 addons per pack' }, 400);

  const sanitizedAddons = addons.map(sanitizeAddonEntry).filter(Boolean) as RecommendedAddonEntry[];
  if (sanitizedAddons.length === 0)
    return c.json({ error: 'No valid addon entries provided' }, 400);

  const updated = await updatePack(c.env.DB, c.req.param('id'), user.id, {
    title: cleanText(title),
    description: cleanText(description),
    packType: sanitize(pack_type),
    addons: JSON.stringify(sanitizedAddons),
    tags: Array.isArray(tags) ? tags.filter(isValidTag).slice(0, 10).map(sanitize) : [],
    isAnonymous: !!is_anonymous,
  });

  if (!updated) return c.json({ error: 'Not found or forbidden' }, 404);
  await recordRateLimitEvent(c.env.DB, user.id, 'pack_update');
  const pack = await getPackById(c.env.DB, c.req.param('id'), user.id);
  return c.json({ pack });
});

// ─── DELETE /packs/:id — delete own pack ────────────────────────────────────

app.delete('/packs/:id', async (c) => {
  const user = await validateToken(c.req.header('Authorization'), c.env);
  if (!user) return c.json({ error: 'Unauthorized' }, 401);

  const deleted = await deletePack(c.env.DB, c.req.param('id'), user.id);
  if (!deleted) return c.json({ error: 'Not found or forbidden' }, 404);
  return c.json({ ok: true });
});

// ─── POST /packs/:id/vote — toggle upvote ──────────────────────────────────

app.post('/packs/:id/vote', async (c) => {
  const user = await validateToken(c.req.header('Authorization'), c.env);
  if (!user) return c.json({ error: 'Unauthorized' }, 401);

  const pack = await getPackById(c.env.DB, c.req.param('id'));
  if (!pack) return c.json({ error: 'Not found' }, 404);

  const voteAllowed = await checkPackVoteRateLimit(c.env.DB, user.id);
  if (!voteAllowed) return c.json({ error: 'Rate limit exceeded. Max 30 votes per hour.' }, 429);

  await recordRateLimitEvent(c.env.DB, user.id, 'pack_vote');
  const result = await togglePackVote(c.env.DB, c.req.param('id'), user.id);
  return c.json(result);
});

// ─── GET /fetch-guide — fetch a build-guide page server-side (CORS proxy) ────
// Lets the build editor import a guide by URL: the browser can't fetch a third-
// party page (CORS), so we fetch it here and return the raw HTML for the client
// to parse. Hardened against SSRF (public http(s) only, private ranges blocked),
// with size + timeout caps and a per-IP rate limit.

const FETCH_GUIDE_MAX_BYTES = 3 * 1024 * 1024; // 3 MB
const FETCH_GUIDE_TIMEOUT_MS = 12_000;
const FETCH_GUIDE_RATE_LIMIT = 20; // per IP per minute
const fetchGuideRateCounts = new Map<string, { count: number; expires: number }>();

// Allowlisted ESO build-guide domains. /fetch-guide is unauthenticated, so we
// restrict it to reputable guide sites rather than running an open fetch proxy.
// This is also the real SSRF backstop: a DNS-rebind/redirect to an internal
// address can't pass because internal hosts aren't on this list (and the literal
// IP / IPv4-mapped checks below are defense-in-depth). Add domains here as
// users request them.
const GUIDE_DOMAIN_ALLOWLIST = [
  'hyperioxes.com',
  'skinnycheeks.gg',
  'alcasthq.com',
  'eso-hub.com',
  'esohub.com',
  'deltiasgaming.com',
  'arzyelbuilds.com',
  'dottzgaming.com',
  'xynodegaming.com',
  'eso-skillbook.com',
  'tamrieljournal.com',
  'uesp.net',
];

function isAllowedGuideHost(host: string): boolean {
  return GUIDE_DOMAIN_ALLOWLIST.some((d) => host === d || host.endsWith('.' + d));
}

/** Validate a URL is a safe, allowlisted public http(s) target (blocks SSRF). */
function safeGuideUrl(raw: string): URL | null {
  let u: URL;
  try {
    u = new URL(raw);
  } catch {
    return null;
  }
  if (u.protocol !== 'http:' && u.protocol !== 'https:') return null;
  const host = u.hostname.toLowerCase().replace(/^\[|\]$/g, '');
  if (!isAllowedGuideHost(host)) return null;
  if (
    host === 'localhost' ||
    host === '::1' ||
    host.endsWith('.localhost') ||
    host.endsWith('.internal') ||
    host.endsWith('.local')
  ) {
    return null;
  }
  // IPv4 literal in a loopback / private / link-local / unspecified range.
  const m = host.match(/^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/);
  if (m) {
    const a = Number(m[1]);
    const b = Number(m[2]);
    if (
      a === 0 ||
      a === 127 ||
      a === 10 ||
      (a === 192 && b === 168) ||
      (a === 169 && b === 254) ||
      (a === 172 && b >= 16 && b <= 31)
    ) {
      return null;
    }
  }
  // IPv6 unspecified / loopback / unique-local (fc00::/7) / link-local (fe80::/10).
  if (host === '::' || host === '::1') return null;
  if (/^f[cd][0-9a-f]{2}:/i.test(host) || /^fe[89ab][0-9a-f]:/i.test(host)) return null;
  // IPv4-mapped IPv6 (e.g. ::ffff:127.0.0.1 or ::ffff:7f00:1) — unwrap the
  // embedded v4 and re-check it against the private/loopback ranges above.
  const mapped = host.match(/^(?:0:0:0:0:0:ffff:|::ffff:)([0-9a-f.:]+)$/i);
  if (mapped) {
    const tail = mapped[1];
    let a = -1;
    let b = -1;
    const dotted = tail.match(/^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/);
    if (dotted) {
      a = Number(dotted[1]);
      b = Number(dotted[2]);
    } else {
      const hex = tail.match(/^([0-9a-f]{1,4}):([0-9a-f]{1,4})$/i);
      if (hex) {
        const hi = parseInt(hex[1], 16);
        a = (hi >> 8) & 0xff;
        b = hi & 0xff;
      }
    }
    if (
      a === 0 ||
      a === 127 ||
      a === 10 ||
      (a === 192 && b === 168) ||
      (a === 169 && b === 254) ||
      (a === 172 && b >= 16 && b <= 31)
    ) {
      return null;
    }
  }
  return u;
}

app.get('/fetch-guide', async (c) => {
  const url = safeGuideUrl((c.req.query('url') ?? '').trim());
  if (!url)
    return c.json(
      {
        error:
          'Please paste a link from a supported guide site (e.g. hyperioxes.com, alcasthq.com, eso-hub.com, skinnycheeks.gg, deltiasgaming.com).',
      },
      400,
    );

  // In-memory per-IP rate limit (mirrors /search-addons).
  const ip = c.req.header('CF-Connecting-IP') ?? 'unknown';
  const now = Date.now();
  if (Math.random() < 0.02) {
    for (const [key, val] of fetchGuideRateCounts) {
      if (val.expires <= now) fetchGuideRateCounts.delete(key);
    }
  }
  const bucket = fetchGuideRateCounts.get(ip);
  if (bucket && bucket.expires > now) {
    if (bucket.count >= FETCH_GUIDE_RATE_LIMIT)
      return c.json({ error: 'Rate limit exceeded.' }, 429);
    bucket.count++;
  } else {
    fetchGuideRateCounts.set(ip, { count: 1, expires: now + 60_000 });
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), FETCH_GUIDE_TIMEOUT_MS);
  try {
    // Follow redirects MANUALLY so every hop's target is re-validated — a public
    // URL must not be able to 30x its way to an internal/link-local host.
    const FETCH_GUIDE_MAX_REDIRECTS = 4;
    let target = url;
    let res: Response | null = null;
    for (let hop = 0; ; hop++) {
      res = await fetch(target.href, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (compatible; ESO-Toolkit-BuildImporter/1.0)',
          Accept: 'text/html,application/xhtml+xml,text/plain',
        },
        redirect: 'manual',
        signal: controller.signal,
      });
      const location = res.status >= 300 && res.status < 400 ? res.headers.get('location') : null;
      if (!location) break;
      if (hop >= FETCH_GUIDE_MAX_REDIRECTS)
        return c.json({ error: 'That link redirected too many times.' }, 502);
      let next: URL | null = null;
      try {
        next = safeGuideUrl(new URL(location, target.href).href);
      } catch {
        next = null;
      }
      if (!next) return c.json({ error: 'That link redirected to a blocked target.' }, 400);
      target = next;
    }
    if (!res) return c.json({ error: 'Could not fetch that link.' }, 502);
    if (!res.ok) return c.json({ error: `That link returned ${res.status}.` }, 502);
    const contentType = res.headers.get('content-type') ?? '';
    if (!/text\/html|application\/xhtml|text\/plain/i.test(contentType)) {
      return c.json({ error: 'That link is not a readable web page.' }, 415);
    }
    const reader = res.body?.getReader();
    if (!reader) return c.json({ error: 'Empty response from that link.' }, 502);
    const chunks: Uint8Array[] = [];
    let collected = 0;
    let truncated = false;
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      if (!value || value.byteLength === 0) continue;
      if (collected + value.byteLength > FETCH_GUIDE_MAX_BYTES) {
        // Keep only what fits, then stop — never allocate past what we copied.
        const room = FETCH_GUIDE_MAX_BYTES - collected;
        if (room > 0) {
          chunks.push(value.subarray(0, room));
          collected += room;
        }
        truncated = true;
        await reader.cancel();
        break;
      }
      chunks.push(value);
      collected += value.byteLength;
    }
    const merged = new Uint8Array(collected);
    let offset = 0;
    for (const chunk of chunks) {
      merged.set(chunk, offset);
      offset += chunk.byteLength;
    }
    const html = new TextDecoder('utf-8').decode(merged);
    return c.json({ html, finalUrl: target.href, truncated });
  } catch (err) {
    const aborted = err instanceof Error && err.name === 'AbortError';
    return c.json(
      { error: aborted ? 'That link took too long to load.' : 'Could not fetch that link.' },
      502,
    );
  } finally {
    clearTimeout(timer);
  }
});

// ─── GET /search-addons — ESOUI addon search via MMOUI API ─────────────────
// Fetches the full addon catalog from api.mmoui.com and caches it in Worker
// memory.  Search is a case-insensitive substring match on title + author,
// ranked: exact title match → title startsWith → title/author includes.

const MMOUI_FILELIST_URL = 'https://api.mmoui.com/v4/game/ESO/filelist.json';
const ADDON_CACHE_TTL_MS = 60 * 60 * 1000; // 1 hour
const SEARCH_RATE_LIMIT = 20; // max requests per minute per IP
const searchRateCounts = new Map<string, { count: number; expires: number }>();

interface MmoUiAddon {
  id: number;
  title: string;
  author: string;
  downloads: number;
  downloadsMonthly: number;
  favorites: number;
}

let addonCache: { addons: MmoUiAddon[]; fetchedAt: number } | null = null;

async function getAddonCatalog(): Promise<MmoUiAddon[]> {
  const now = Date.now();
  if (addonCache && now - addonCache.fetchedAt < ADDON_CACHE_TTL_MS) {
    return addonCache.addons;
  }

  const res = await fetch(MMOUI_FILELIST_URL, {
    headers: { 'User-Agent': 'ESO-Toolkit/1.0' },
  });
  if (!res.ok) throw new Error(`MMOUI API returned ${res.status}`);

  const raw = (await res.json()) as MmoUiAddon[];
  addonCache = { addons: raw, fetchedAt: now };
  return raw;
}

app.get('/search-addons', async (c) => {
  const q = (c.req.query('q') ?? '').trim();
  if (!q || q.length < 2) return c.json({ results: [] });
  if (q.length > 100) return c.json({ error: 'Query too long' }, 400);

  // Simple in-memory rate limit per IP (resets each minute)
  const ip = c.req.header('CF-Connecting-IP') ?? 'unknown';
  const now = Date.now();

  if (Math.random() < 0.02) {
    for (const [key, val] of searchRateCounts) {
      if (val.expires <= now) searchRateCounts.delete(key);
    }
  }

  const bucket = searchRateCounts.get(ip);
  if (bucket && bucket.expires > now) {
    if (bucket.count >= SEARCH_RATE_LIMIT) {
      return c.json({ error: 'Rate limit exceeded' }, 429);
    }
    bucket.count++;
  } else {
    searchRateCounts.set(ip, { count: 1, expires: now + 60_000 });
  }

  try {
    const addons = await getAddonCatalog();
    const lower = q.toLowerCase();

    // Bucket matches by relevance
    const exact: typeof results = [];
    const starts: typeof results = [];
    const contains: typeof results = [];

    interface SearchResult {
      id: number;
      title: string;
      author: string;
      category: string;
      downloads: string;
    }

    const results: SearchResult[] = [];

    for (const a of addons) {
      const tLower = a.title.toLowerCase();
      const aLower = a.author.toLowerCase();
      if (tLower !== lower && !tLower.includes(lower) && !aLower.includes(lower)) continue;

      const hit: SearchResult = {
        id: a.id,
        title: a.title,
        author: a.author,
        category: '',
        downloads: String(a.downloads),
      };

      if (tLower === lower) exact.push(hit);
      else if (tLower.startsWith(lower)) starts.push(hit);
      else contains.push(hit);
    }

    results.push(...exact, ...starts, ...contains);
    return c.json({ results: results.slice(0, 25) });
  } catch (err) {
    console.error('Addon search failed:', err);
    return c.json({ error: 'Search failed' }, 502);
  }
});

// ═══════════════════════════════════════════════════════════════════════════════
// Discord sync webhook — notify discord-bot when a roster changes
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Fire-and-forget notification to the discord-bot Worker to refresh
 * any Discord channels linked to the given roster. Non-blocking and
 * failure-safe: if the bot is unavailable the roster save still succeeds.
 */
async function notifyDiscordSync(env: Env, rosterId: string): Promise<void> {
  if (!env.DISCORD_BOT_URL) return;
  try {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };
    if (env.DISCORD_WEBHOOK_SECRET) {
      headers['Authorization'] = `Bearer ${env.DISCORD_WEBHOOK_SECRET}`;
    }
    await fetch(`${env.DISCORD_BOT_URL}/discord/roster/refresh`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ rosterId }),
    });
  } catch (err) {
    console.error('[discord-sync] failed to notify:', err);
  }
}

// ─── DPS builds leaderboard ─────────────────────────────────────────────────
// Read-only. This data is owned by the cron; there is no public write path.

/** Which encounters have data — feeds the trial/boss picker. */
app.get('/dps-leaderboard/encounters', async (c) => {
  await ensureDpsParsesSchema(c.env.DB);
  const encounters = await listDpsEncounters(c.env.DB);
  return c.json({ encounters });
});

/**
 * Serves both frontend tabs: `?encounter=` for the per-boss view, `?class=` for
 * the per-class overview.
 *
 * At least one of them is REQUIRED. Without a filter this degenerates into an
 * unbounded table scan, so an unfiltered request is a 400 rather than a slow 200.
 */
app.get('/dps-leaderboard/parses', async (c) => {
  const num = (value: string | undefined): number | undefined => {
    if (value === undefined) return undefined;
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : undefined;
  };

  const encounterId = num(c.req.query('encounter'));
  const esoClass = c.req.query('class');

  if (encounterId === undefined && !esoClass) {
    return c.json({ error: 'Provide at least one of: encounter, class' }, 400);
  }

  await ensureDpsParsesSchema(c.env.DB);

  const sortParam = c.req.query('sort');
  const result = await listDpsParses(c.env.DB, {
    encounterId,
    difficulty: num(c.req.query('difficulty')),
    esoClass,
    signatureHash: c.req.query('signature'),
    limit: num(c.req.query('limit')),
    offset: num(c.req.query('offset')),
    sort: sortParam === 'recent' ? 'recent' : 'amount',
  });

  return c.json(result);
});

/**
 * Raw gear + talents for one parse.
 *
 * Split from the list route on purpose: this payload is ~3.7 KB per parse, so
 * inlining it would make a 200-row page roughly 750 KB. Fetched only when the user
 * opens an archetype in the Build Editor.
 */
app.get('/dps-leaderboard/parses/:parseId/build', async (c) => {
  await ensureDpsParsesSchema(c.env.DB);
  const build = await getDpsParseCombatant(c.env.DB, c.req.param('parseId'));
  if (!build) return c.json({ error: 'Parse not found' }, 404);
  return c.json(build);
});

// ─── POST /admin/sync-leaderboard — manual trigger ──────────────────────────

import { syncLeaderboardRosters } from './leaderboard-sync/sync';

/**
 * Shared guard for the admin triggers. Compares SHA-256 digests with
 * timingSafeEqual so the check is constant-time regardless of key length.
 */
async function isAuthorizedInternalRequest(
  providedKey: string | undefined,
  expectedKey: string | undefined,
): Promise<boolean> {
  if (!providedKey || !expectedKey) return false;
  const enc = new TextEncoder();
  const [hashA, hashB] = await Promise.all([
    crypto.subtle.digest('SHA-256', enc.encode(providedKey)),
    crypto.subtle.digest('SHA-256', enc.encode(expectedKey)),
  ]);
  return (
    crypto.subtle as unknown as { timingSafeEqual(a: ArrayBuffer, b: ArrayBuffer): boolean }
  ).timingSafeEqual(hashA, hashB);
}

app.post('/admin/sync-leaderboard', async (c) => {
  if (
    !(await isAuthorizedInternalRequest(c.req.header('X-Internal-Key'), c.env.INTERNAL_API_KEY))
  ) {
    return c.json({ error: 'Unauthorized' }, 401);
  }
  const results = await syncLeaderboardRosters(c.env);
  return c.json({ results });
});

/**
 * Manual DPS-parse ingest. Query params let a one-off backfill target a single
 * encounter, or force a full pass outside the nightly budget:
 *   ?encounterId=60&difficulty=122&pages=3&force=1
 */
app.post('/admin/sync-dps-parses', async (c) => {
  if (
    !(await isAuthorizedInternalRequest(c.req.header('X-Internal-Key'), c.env.INTERNAL_API_KEY))
  ) {
    return c.json({ error: 'Unauthorized' }, 401);
  }

  const num = (value: string | undefined): number | undefined => {
    if (value === undefined) return undefined;
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : undefined;
  };

  const results = await syncDpsParses(c.env, {
    encounterId: num(c.req.query('encounterId')),
    difficulty: num(c.req.query('difficulty')),
    pages: num(c.req.query('pages')),
    maxEncounters: num(c.req.query('maxEncounters')),
    force: c.req.query('force') === '1',
  });

  return c.json({ results });
});

// ═══════════════════════════════════════════════════════════════════════════════
// Worker export — fetch (Hono) + scheduled (cron)
// ═══════════════════════════════════════════════════════════════════════════════

export default {
  fetch: app.fetch,

  /**
   * Two triggers (see wrangler.toml):
   *   04:00 UTC — temp-build cleanup + roster sync + DPS parse ingest
   *   16:00 UTC — DPS parse ingest only
   *
   * Each job is isolated in its own try/catch. Previously a throw in
   * `cleanupExpiredTempBuilds` would silently skip the roster sync for that day.
   */
  async scheduled(event: ScheduledEvent, env: Env, _ctx: ExecutionContext): Promise<void> {
    const isDailyRun = event.cron === '0 4 * * *';

    if (isDailyRun) {
      try {
        await cleanupExpiredTempBuilds(env.DB);
      } catch (error) {
        console.error('[cron] temp-build cleanup failed:', error);
      }

      try {
        await syncLeaderboardRosters(env);
      } catch (error) {
        console.error('[cron] roster sync failed:', error);
      }
    }

    // Runs on both triggers: two passes a day cover the full boss rotation.
    try {
      await syncDpsParses(env);
    } catch (error) {
      console.error('[cron] dps parse sync failed:', error);
    }
  },
};
