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
  checkBuildVoteRateLimit,
  checkBuildCreateRateLimit,
  createTempBuild,
  getTempBuild,
  checkTempBuildRateLimit,
  recordTempBuildRateLimit,
  cleanupExpiredTempBuilds,
} from './db/queries';
import { moderateImage, MAX_IMAGE_BYTES } from './image-moderation';
import type { Env } from './types';

const app = new Hono<{ Bindings: Env }>();

// ─── Validation helpers ──────────────────────────────────────────────────────

/** Verify that an encoded payload is valid base64url (no special chars that break URLs). */
const isValidBase64Url = (s: string): boolean => /^[A-Za-z0-9_-]*=*$/.test(s);

/** Escape HTML entities in user-generated text (defense-in-depth against stored XSS). */
const escapeHtml = (s: string): string =>
  s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;');

/** Sanitize and trim a user-provided text field. */
const sanitize = (s: string): string => escapeHtml(s.trim());

/** Validate a tag: must be non-empty, ≤30 chars, alphanumeric/hyphens/underscores/spaces. */
const isValidTag = (t: string): boolean =>
  typeof t === 'string' && t.length > 0 && t.length <= 30 && /^[\w\s-]+$/.test(t);

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
    maxAge: 86400,
  });
  return corsMiddleware(c, next);
});

// ─── Cache headers ─────────────────────────────────────────────────────────────
// Public profile responses get a short edge-cache TTL; all other endpoints
// are no-store so React UIs always get fresh data.

app.use('*', async (c, next) => {
  await next();
  if (c.req.method === 'GET' && c.req.path.startsWith('/users/')) {
    // Cache public profiles at the edge for 5 minutes
    c.res.headers.set('Cache-Control', 'public, s-maxage=300, stale-while-revalidate=60');
  } else {
    c.res.headers.set('Cache-Control', 'no-store');
  }
});

// ─── Health check ─────────────────────────────────────────────────────────────

app.get('/health', async (c) => {
  const result = await c.env.DB.prepare('SELECT 1').run();
  const sizeBytes = result.meta?.size_after ?? null;
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
    roster_data: string;
    tags?: string[];
    is_anonymous?: boolean;
    recommended_addons?: { packId?: string; addons: { esouiId: number; name: string; required?: boolean; note?: string }[] } | null;
  }

  let body: CreateBody;
  try {
    body = await c.req.json<CreateBody>();
  } catch {
    return c.json({ error: 'Invalid JSON' }, 400);
  }

  const { title, description = '', trial_id, roster_data, tags = [], is_anonymous = false, recommended_addons = null } = body;

  if (!title?.trim()) return c.json({ error: 'title is required' }, 400);
  if (!trial_id?.trim()) return c.json({ error: 'trial_id is required' }, 400);
  if (!roster_data?.trim()) return c.json({ error: 'roster_data is required' }, 400);
  if (title.length > 100) return c.json({ error: 'title must be ≤ 100 characters' }, 400);
  if (description.length > 500)
    return c.json({ error: 'description must be ≤ 500 characters' }, 400);
  if (roster_data.length > 50_000)
    return c.json({ error: 'roster_data must be ≤ 50 000 characters' }, 400);

  // Generate a short unique ID (nanoid-style without the dep)
  const id = Array.from(crypto.getRandomValues(new Uint8Array(10)))
    .map((b) => b.toString(36).padStart(2, '0'))
    .join('')
    .slice(0, 12);

  await createRoster(c.env.DB, {
    id,
    authorId: user.id,
    authorName: escapeHtml(user.name),
    title: sanitize(title),
    description: sanitize(description),
    trialId: sanitize(trial_id),
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

  interface UpdateBody {
    title: string;
    description?: string;
    trial_id: string;
    roster_data: string;
    tags?: string[];
    is_anonymous?: boolean;
    recommended_addons?: { packId?: string; addons: { esouiId: number; name: string; required?: boolean; note?: string }[] } | null;
  }

  let body: UpdateBody;
  try {
    body = await c.req.json<UpdateBody>();
  } catch {
    return c.json({ error: 'Invalid JSON' }, 400);
  }

  const { title, description = '', trial_id, roster_data, tags = [], is_anonymous = false, recommended_addons = null } = body;

  if (!title?.trim()) return c.json({ error: 'title is required' }, 400);
  if (!trial_id?.trim()) return c.json({ error: 'trial_id is required' }, 400);
  if (!roster_data?.trim()) return c.json({ error: 'roster_data is required' }, 400);
  if (title.length > 100) return c.json({ error: 'title must be ≤ 100 characters' }, 400);
  if (description.length > 500)
    return c.json({ error: 'description must be ≤ 500 characters' }, 400);
  if (roster_data.length > 50_000)
    return c.json({ error: 'roster_data must be ≤ 50 000 characters' }, 400);

  const updated = await updateRoster(c.env.DB, c.req.param('id'), user.id, {
    title: sanitize(title),
    description: sanitize(description),
    trialId: sanitize(trial_id),
    rosterData: roster_data,
    tags: Array.isArray(tags) ? tags.filter(isValidTag).slice(0, 10).map(sanitize) : [],
    isAnonymous: !!is_anonymous,
    recommendedAddons: recommendedAddonsJson,
  });

  if (!updated) return c.json({ error: 'Not found or forbidden' }, 404);
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
    body: escapeHtml(body.body.trim()),
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
  const page = Math.max(1, parseInt(c.req.query('page') ?? '1', 10));

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

  const createAllowed = await checkBuildCreateRateLimit(c.env.DB, user.id);
  if (!createAllowed)
    return c.json({ error: 'Rate limit exceeded. You can only publish 5 builds per hour.' }, 429);

  const id = Array.from(crypto.getRandomValues(new Uint8Array(10)))
    .map((b) => b.toString(36).padStart(2, '0'))
    .join('')
    .slice(0, 12);

  await createBuild(c.env.DB, {
    id,
    authorId: user.id,
    authorName: user.name,
    title: title.trim(),
    description: description.trim(),
    esoClass: eso_class.trim(),
    role: role.trim(),
    gameMode: game_mode.trim(),
    buildData: build_data,
    tags: Array.isArray(tags) ? tags.filter((t) => typeof t === 'string').slice(0, 10) : [],
    isAnonymous: !!is_anonymous,
  });

  const build = await getBuildById(c.env.DB, id, user.id);
  return c.json({ build }, 201);
});

// ─── PUT /builds/:id — update own build ──────────────────────────────────────

app.put('/builds/:id', async (c) => {
  const user = await validateToken(c.req.header('Authorization'), c.env);
  if (!user) return c.json({ error: 'Unauthorized' }, 401);

  interface UpdateBuildBody {
    title: string;
    description?: string;
    eso_class: string;
    role: string;
    game_mode?: string;
    build_data: string;
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

  const updated = await updateBuild(c.env.DB, c.req.param('id'), user.id, {
    title: title.trim(),
    description: description.trim(),
    esoClass: eso_class.trim(),
    role: role.trim(),
    gameMode: game_mode.trim(),
    buildData: build_data,
    tags: Array.isArray(tags) ? tags.filter((t) => typeof t === 'string').slice(0, 10) : [],
    isAnonymous: !!is_anonymous,
  });

  if (!updated) return c.json({ error: 'Not found or forbidden' }, 404);
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
  const exists = await c.env.DB.prepare('SELECT id FROM builds WHERE id = ?').bind(buildId).first();
  if (!exists) return c.json({ error: 'Not found' }, 404);

  const allowed = await checkBuildVoteRateLimit(c.env.DB, user.id);
  if (!allowed)
    return c.json({ error: 'Rate limit exceeded. Too many votes in the last hour.' }, 429);

  const result = await toggleBuildVote(c.env.DB, buildId, user.id);
  return c.json(result);
});

// ─── GET /builds/:id/comments ─────────────────────────────────────────────────

app.get('/builds/:id/comments', async (c) => {
  const buildId = c.req.param('id');
  const exists = await c.env.DB.prepare('SELECT id FROM builds WHERE id = ?').bind(buildId).first();
  if (!exists) return c.json({ error: 'Not found' }, 404);

  const comments = await listBuildComments(c.env.DB, buildId);
  return c.json({ comments });
});

// ─── POST /builds/:id/comments ────────────────────────────────────────────────

app.post('/builds/:id/comments', async (c) => {
  const user = await validateToken(c.req.header('Authorization'), c.env);
  if (!user) return c.json({ error: 'Unauthorized' }, 401);

  const buildId = c.req.param('id');
  const exists = await c.env.DB.prepare('SELECT id FROM builds WHERE id = ?').bind(buildId).first();
  if (!exists) return c.json({ error: 'Build not found' }, 404);

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

  // Rate limit by IP (10 per hour)
  const ip = c.req.header('CF-Connecting-IP') ?? c.req.header('X-Forwarded-For') ?? 'unknown';
  const allowed = await checkTempBuildRateLimit(c.env.DB, ip);
  if (!allowed)
    return c.json({ error: 'Rate limit exceeded. You can create up to 10 temp builds per hour.' }, 429);

  const id = Array.from(crypto.getRandomValues(new Uint8Array(10)))
    .map((b) => b.toString(36).padStart(2, '0'))
    .join('')
    .slice(0, 12);

  const row = await createTempBuild(c.env.DB, { id, buildData: body.build_data });
  await recordTempBuildRateLimit(c.env.DB, ip);

  return c.json({ id: row.id, expires_at: row.expires_at }, 201);
});

// ─── GET /temp-builds/:id — fetch a temporary build ──────────────────────────

app.get('/temp-builds/:id', async (c) => {
  const id = c.req.param('id');

  // Lazy cleanup: remove expired builds on read
  await cleanupExpiredTempBuilds(c.env.DB);

  const row = await getTempBuild(c.env.DB, id);
  if (!row) {
    return c.json({ error: 'This build link has expired or does not exist.' }, 410);
  }

  return c.json({
    build_data: row.build_data,
    created_at: row.created_at,
    expires_at: row.expires_at,
  });
});

<<<<<<< HEAD
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

  await upsertUserBio(c.env.DB, user.id, escapeHtml(user.name), sanitize(body.bio));
  return c.json({ ok: true });
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
    addons: { esouiId: number; name: string; required?: boolean; note?: string }[];
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
  if (addons.length > 30)
    return c.json({ error: 'Maximum 30 addons per pack' }, 400);

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
    authorName: escapeHtml(user.name),
    title: sanitize(title),
    description: sanitize(description),
    packType: sanitize(pack_type),
    addons: JSON.stringify(addons),
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

  interface UpdatePackBody {
    title: string;
    description?: string;
    pack_type?: string;
    addons: { esouiId: number; name: string; required?: boolean; note?: string }[];
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
  if (addons.length > 30)
    return c.json({ error: 'Maximum 30 addons per pack' }, 400);

  const updated = await updatePack(c.env.DB, c.req.param('id'), user.id, {
    title: sanitize(title),
    description: sanitize(description),
    packType: sanitize(pack_type),
    addons: JSON.stringify(addons),
    tags: Array.isArray(tags) ? tags.filter(isValidTag).slice(0, 10).map(sanitize) : [],
    isAnonymous: !!is_anonymous,
  });

  if (!updated) return c.json({ error: 'Not found or forbidden' }, 404);
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
  if (!voteAllowed)
    return c.json({ error: 'Rate limit exceeded. Max 30 votes per hour.' }, 429);

  const result = await togglePackVote(c.env.DB, c.req.param('id'), user.id);
  return c.json(result);
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

// ═══════════════════════════════════════════════════════════════════════════════
// Worker export — fetch (Hono) + scheduled (cron: cleanup + leaderboard sync)
// ═══════════════════════════════════════════════════════════════════════════════

import { syncLeaderboardRosters } from './leaderboard-sync/sync';

export default {
  fetch: app.fetch,

  async scheduled(_event: ScheduledEvent, env: Env, _ctx: ExecutionContext): Promise<void> {
    await cleanupExpiredTempBuilds(env.DB);
    await syncLeaderboardRosters(env);
  },
};
