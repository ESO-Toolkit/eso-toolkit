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
} from './db/queries';
import type { Env } from './types';

const app = new Hono<{ Bindings: Env }>();

// ─── CORS ────────────────────────────────────────────────────────────────────

app.use('*', async (c, next) => {
  const allowedOrigins = c.env.ALLOWED_ORIGINS.split(',').map((o) => o.trim());
  const origin = c.req.header('Origin') ?? '';
  const corsMiddleware = cors({
    origin: allowedOrigins.includes(origin) ? origin : allowedOrigins[0],
    allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowHeaders: ['Content-Type', 'Authorization'],
    maxAge: 86400,
  });
  return corsMiddleware(c, next);
});

// ─── No-cache headers ─────────────────────────────────────────────────────────

app.use('*', async (c, next) => {
  await next();
  c.res.headers.set('Cache-Control', 'no-store');
});

// ─── Health check ─────────────────────────────────────────────────────────────

app.get('/health', (c) => c.json({ ok: true }));

// ─── GET /rosters — list with filtering & pagination ─────────────────────────

app.get('/rosters', async (c) => {
  const user = await validateToken(c.req.header('Authorization'), c.env);

  const trial = c.req.query('trial') ?? undefined;
  const tag = c.req.query('tag') ?? undefined;
  const sort = c.req.query('sort') === 'recent' ? 'recent' : 'votes';
  const page = Math.max(1, parseInt(c.req.query('page') ?? '1', 10));

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
  }

  let body: CreateBody;
  try {
    body = await c.req.json<CreateBody>();
  } catch {
    return c.json({ error: 'Invalid JSON' }, 400);
  }

  const { title, description = '', trial_id, roster_data, tags = [], is_anonymous = false } = body;

  if (!title?.trim()) return c.json({ error: 'title is required' }, 400);
  if (!trial_id?.trim()) return c.json({ error: 'trial_id is required' }, 400);
  if (!roster_data?.trim()) return c.json({ error: 'roster_data is required' }, 400);
  if (title.length > 100) return c.json({ error: 'title must be ≤ 100 characters' }, 400);
  if (description.length > 500) return c.json({ error: 'description must be ≤ 500 characters' }, 400);
  if (roster_data.length > 50_000) return c.json({ error: 'roster_data must be ≤ 50 000 characters' }, 400);

  // Generate a short unique ID (nanoid-style without the dep)
  const id = Array.from(crypto.getRandomValues(new Uint8Array(10)))
    .map((b) => b.toString(36).padStart(2, '0'))
    .join('')
    .slice(0, 12);

  await createRoster(c.env.DB, {
    id,
    authorId: user.id,
    authorName: user.name,
    title: title.trim(),
    description: description.trim(),
    trialId: trial_id.trim(),
    rosterData: roster_data,
    tags: Array.isArray(tags) ? tags.filter((t) => typeof t === 'string').slice(0, 10) : [],
    isAnonymous: !!is_anonymous,
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
  }

  let body: UpdateBody;
  try {
    body = await c.req.json<UpdateBody>();
  } catch {
    return c.json({ error: 'Invalid JSON' }, 400);
  }

  const { title, description = '', trial_id, roster_data, tags = [], is_anonymous = false } = body;

  if (!title?.trim()) return c.json({ error: 'title is required' }, 400);
  if (!trial_id?.trim()) return c.json({ error: 'trial_id is required' }, 400);
  if (!roster_data?.trim()) return c.json({ error: 'roster_data is required' }, 400);
  if (title.length > 100) return c.json({ error: 'title must be ≤ 100 characters' }, 400);
  if (description.length > 500) return c.json({ error: 'description must be ≤ 500 characters' }, 400);
  if (roster_data.length > 50_000) return c.json({ error: 'roster_data must be ≤ 50 000 characters' }, 400);

  const updated = await updateRoster(c.env.DB, c.req.param('id'), user.id, {
    title: title.trim(),
    description: description.trim(),
    trialId: trial_id,
    rosterData: roster_data,
    tags: Array.isArray(tags) ? tags.filter((t) => typeof t === 'string').slice(0, 10) : [],
    isAnonymous: !!is_anonymous,
  });

  if (!updated) return c.json({ error: 'Not found or forbidden' }, 404);
  const roster = await getRosterById(c.env.DB, c.req.param('id'), user.id);
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

  // Ensure roster exists
  const exists = await c.env.DB.prepare('SELECT id FROM rosters WHERE id = ?').bind(rosterId).first();
  if (!exists) return c.json({ error: 'Not found' }, 404);

  const result = await toggleVote(c.env.DB, rosterId, user.id);
  return c.json(result);
});

// ─── GET /rosters/:id/comments — list comments for a roster ─────────────────

app.get('/rosters/:id/comments', async (c) => {
  const rosterId = c.req.param('id');

  // Verify roster exists
  const exists = await c.env.DB.prepare('SELECT id FROM rosters WHERE id = ?').bind(rosterId).first();
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
  const exists = await c.env.DB.prepare('SELECT id FROM rosters WHERE id = ?').bind(rosterId).first();
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

export default app;
