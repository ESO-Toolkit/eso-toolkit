/**
 * D1 query helpers for the roster hub.
 * All SQL is parameterised — no string interpolation, no injection risk.
 */

import type { D1Database } from '@cloudflare/workers-types';
import type {
  CommentRow,
  CommentWithReplies,
  RosterRow,
  RosterTagRow,
  RosterWithMeta,
} from '../types';

const PAGE_SIZE = 20;

export interface ListOptions {
  trial?: string;
  tag?: string;
  sort: 'votes' | 'recent';
  page: number;
  userId?: string;
}

export async function listRosters(db: D1Database, opts: ListOptions): Promise<RosterWithMeta[]> {
  const offset = (opts.page - 1) * PAGE_SIZE;
  const orderBy =
    opts.sort === 'votes' ? 'r.vote_count DESC, r.created_at DESC' : 'r.created_at DESC';

  // Build WHERE clauses
  const conditions: string[] = [];
  const bindings: (string | number)[] = [];

  if (opts.trial) {
    conditions.push('r.trial_id = ?');
    bindings.push(opts.trial);
  }
  if (opts.tag) {
    conditions.push(
      'EXISTS (SELECT 1 FROM roster_tags rt WHERE rt.roster_id = r.id AND rt.tag = ?)',
    );
    bindings.push(opts.tag);
  }

  const where = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

  const sql = `
    SELECT r.*, GROUP_CONCAT(DISTINCT rt.tag) AS tags_concat
    FROM rosters r
    LEFT JOIN roster_tags rt ON rt.roster_id = r.id
    ${where}
    GROUP BY r.id
    ORDER BY ${orderBy}
    LIMIT ${PAGE_SIZE} OFFSET ${offset}
  `;

  const rows = await db
    .prepare(sql)
    .bind(...bindings)
    .all<RosterRow & { tags_concat: string | null }>();

  // Attach vote status if user is logged in
  let votedSet = new Set<string>();
  if (opts.userId && rows.results.length > 0) {
    const ids = rows.results.map((r) => r.id);
    const placeholders = ids.map(() => '?').join(',');
    const voteRows = await db
      .prepare(
        `SELECT roster_id FROM roster_votes WHERE user_id = ? AND roster_id IN (${placeholders})`,
      )
      .bind(opts.userId, ...ids)
      .all<{ roster_id: string }>();
    votedSet = new Set(voteRows.results.map((v) => v.roster_id));
  }

  return rows.results.map((row) => ({
    ...row,
    is_anonymous: row.is_anonymous ? true : false,
    tags: row.tags_concat ? row.tags_concat.split(',') : [],
    user_voted: opts.userId ? votedSet.has(row.id) : undefined,
  }));
}

export async function getRosterById(
  db: D1Database,
  id: string,
  userId?: string,
): Promise<RosterWithMeta | null> {
  const row = await db.prepare('SELECT * FROM rosters WHERE id = ?').bind(id).first<RosterRow>();
  if (!row) return null;

  const tagRows = await db
    .prepare('SELECT tag FROM roster_tags WHERE roster_id = ?')
    .bind(id)
    .all<RosterTagRow>();

  let userVoted = false;
  if (userId) {
    const vote = await db
      .prepare('SELECT 1 FROM roster_votes WHERE roster_id = ? AND user_id = ?')
      .bind(id, userId)
      .first();
    userVoted = vote !== null;
  }

  return {
    ...row,
    is_anonymous: row.is_anonymous ? true : false,
    tags: tagRows.results.map((t) => t.tag),
    user_voted: userId ? userVoted : undefined,
  };
}

export async function createRoster(
  db: D1Database,
  data: {
    id: string;
    authorId: string;
    authorName: string;
    title: string;
    description: string;
    trialId: string;
    rosterData: string;
    tags: string[];
    isAnonymous: boolean;
  },
): Promise<void> {
  await db
    .prepare(
      'INSERT INTO rosters (id, author_id, author_name, title, description, trial_id, roster_data, is_anonymous) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
    )
    .bind(
      data.id,
      data.authorId,
      data.authorName,
      data.title,
      data.description,
      data.trialId,
      data.rosterData,
      data.isAnonymous ? 1 : 0,
    )
    .run();

  if (data.tags.length > 0) {
    await insertTags(db, data.id, data.tags);
  }
}

export async function updateRoster(
  db: D1Database,
  id: string,
  authorId: string,
  data: {
    title: string;
    description: string;
    trialId: string;
    rosterData: string;
    tags: string[];
    isAnonymous: boolean;
  },
): Promise<boolean> {
  const result = await db
    .prepare(
      "UPDATE rosters SET title = ?, description = ?, trial_id = ?, roster_data = ?, is_anonymous = ?, updated_at = datetime('now') WHERE id = ? AND author_id = ?",
    )
    .bind(
      data.title,
      data.description,
      data.trialId,
      data.rosterData,
      data.isAnonymous ? 1 : 0,
      id,
      authorId,
    )
    .run();

  if (!result.meta.changes || result.meta.changes === 0) return false;

  // Replace tags
  await db.prepare('DELETE FROM roster_tags WHERE roster_id = ?').bind(id).run();
  if (data.tags.length > 0) {
    await insertTags(db, id, data.tags);
  }
  return true;
}

export async function deleteRoster(db: D1Database, id: string, authorId: string): Promise<boolean> {
  const result = await db
    .prepare('DELETE FROM rosters WHERE id = ? AND author_id = ?')
    .bind(id, authorId)
    .run();
  return (result.meta.changes ?? 0) > 0;
}

export async function toggleVote(
  db: D1Database,
  rosterId: string,
  userId: string,
): Promise<{ voted: boolean; voteCount: number }> {
  const existing = await db
    .prepare('SELECT 1 FROM roster_votes WHERE roster_id = ? AND user_id = ?')
    .bind(rosterId, userId)
    .first();

  if (existing) {
    // Remove vote
    await db
      .prepare('DELETE FROM roster_votes WHERE roster_id = ? AND user_id = ?')
      .bind(rosterId, userId)
      .run();
    await db
      .prepare('UPDATE rosters SET vote_count = vote_count - 1 WHERE id = ? AND vote_count > 0')
      .bind(rosterId)
      .run();
    const updated = await db
      .prepare('SELECT vote_count FROM rosters WHERE id = ?')
      .bind(rosterId)
      .first<{ vote_count: number }>();
    return { voted: false, voteCount: updated?.vote_count ?? 0 };
  } else {
    // Add vote
    await db
      .prepare('INSERT INTO roster_votes (roster_id, user_id) VALUES (?, ?)')
      .bind(rosterId, userId)
      .run();
    await db
      .prepare('UPDATE rosters SET vote_count = vote_count + 1 WHERE id = ?')
      .bind(rosterId)
      .run();
    const updated = await db
      .prepare('SELECT vote_count FROM rosters WHERE id = ?')
      .bind(rosterId)
      .first<{ vote_count: number }>();
    return { voted: true, voteCount: updated?.vote_count ?? 1 };
  }
}

// ─── Comments ──────────────────────────────────────────────────────────────

const RATE_LIMIT_WINDOW_SEC = 60;
const RATE_LIMIT_MAX = 5;

export async function listComments(
  db: D1Database,
  rosterId: string,
): Promise<CommentWithReplies[]> {
  const rows = await db
    .prepare('SELECT * FROM roster_comments WHERE roster_id = ? ORDER BY created_at ASC')
    .bind(rosterId)
    .all<CommentRow>();

  // Build threaded structure: top-level comments with nested replies (1-level)
  const topLevel: CommentWithReplies[] = [];
  const replyMap = new Map<string, CommentRow[]>();

  for (const row of rows.results) {
    if (row.parent_id) {
      const replies = replyMap.get(row.parent_id) ?? [];
      replies.push(row);
      replyMap.set(row.parent_id, replies);
    } else {
      topLevel.push({ ...row, replies: [] });
    }
  }

  for (const comment of topLevel) {
    comment.replies = replyMap.get(comment.id) ?? [];
  }

  return topLevel;
}

export async function createComment(
  db: D1Database,
  data: {
    id: string;
    rosterId: string;
    parentId: string | null;
    authorId: string;
    authorName: string;
    body: string;
  },
): Promise<CommentRow> {
  await db
    .prepare(
      'INSERT INTO roster_comments (id, roster_id, parent_id, author_id, author_name, body) VALUES (?, ?, ?, ?, ?, ?)',
    )
    .bind(data.id, data.rosterId, data.parentId, data.authorId, data.authorName, data.body)
    .run();

  const row = await db
    .prepare('SELECT * FROM roster_comments WHERE id = ?')
    .bind(data.id)
    .first<CommentRow>();

  return row!;
}

export async function deleteComment(
  db: D1Database,
  commentId: string,
  authorId: string,
): Promise<boolean> {
  const result = await db
    .prepare('DELETE FROM roster_comments WHERE id = ? AND author_id = ?')
    .bind(commentId, authorId)
    .run();
  return (result.meta.changes ?? 0) > 0;
}

export async function checkCommentRateLimit(db: D1Database, userId: string): Promise<boolean> {
  const row = await db
    .prepare(
      `SELECT COUNT(*) AS cnt FROM roster_comments
       WHERE author_id = ? AND created_at > datetime('now', '-${RATE_LIMIT_WINDOW_SEC} seconds')`,
    )
    .bind(userId)
    .first<{ cnt: number }>();
  return (row?.cnt ?? 0) < RATE_LIMIT_MAX;
}

async function insertTags(db: D1Database, rosterId: string, tags: string[]): Promise<void> {
  // D1 doesn't support multi-row VALUES yet; batch individual inserts
  const stmts = tags
    .slice(0, 10) // max 10 tags per roster
    .map((tag) =>
      db
        .prepare('INSERT OR IGNORE INTO roster_tags (roster_id, tag) VALUES (?, ?)')
        .bind(rosterId, tag.toLowerCase().trim()),
    );
  await db.batch(stmts);
}

// ═══════════════════════════════════════════════════════════════════════════════
// Build Hub queries — mirror the roster queries with build_* tables
// ═══════════════════════════════════════════════════════════════════════════════

import type {
  BuildRow,
  BuildTagRow,
  BuildWithMeta,
  BuildCommentRow,
  BuildCommentWithReplies,
} from '../types';

export interface ListBuildsOptions {
  esoClass?: string;
  role?: string;
  gameMode?: string;
  tag?: string;
  sort: 'votes' | 'recent';
  page: number;
  userId?: string;
}

export async function listBuilds(
  db: D1Database,
  opts: ListBuildsOptions,
): Promise<BuildWithMeta[]> {
  const offset = (opts.page - 1) * PAGE_SIZE;
  const orderBy =
    opts.sort === 'votes' ? 'b.vote_count DESC, b.created_at DESC' : 'b.created_at DESC';

  const conditions: string[] = [];
  const bindings: (string | number)[] = [];

  if (opts.esoClass) {
    conditions.push('b.eso_class = ?');
    bindings.push(opts.esoClass);
  }
  if (opts.role) {
    conditions.push('b.role = ?');
    bindings.push(opts.role);
  }
  if (opts.gameMode) {
    conditions.push('b.game_mode = ?');
    bindings.push(opts.gameMode);
  }
  if (opts.tag) {
    conditions.push('EXISTS (SELECT 1 FROM build_tags bt WHERE bt.build_id = b.id AND bt.tag = ?)');
    bindings.push(opts.tag);
  }

  const where = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

  const sql = `
    SELECT b.*, GROUP_CONCAT(DISTINCT bt.tag) AS tags_concat
    FROM builds b
    LEFT JOIN build_tags bt ON bt.build_id = b.id
    ${where}
    GROUP BY b.id
    ORDER BY ${orderBy}
    LIMIT ${PAGE_SIZE} OFFSET ${offset}
  `;

  const rows = await db
    .prepare(sql)
    .bind(...bindings)
    .all<BuildRow & { tags_concat: string | null }>();

  let votedSet = new Set<string>();
  if (opts.userId && rows.results.length > 0) {
    const ids = rows.results.map((r) => r.id);
    const placeholders = ids.map(() => '?').join(',');
    const voteRows = await db
      .prepare(
        `SELECT build_id FROM build_votes WHERE user_id = ? AND build_id IN (${placeholders})`,
      )
      .bind(opts.userId, ...ids)
      .all<{ build_id: string }>();
    votedSet = new Set(voteRows.results.map((v) => v.build_id));
  }

  return rows.results.map((row) => ({
    ...row,
    is_anonymous: row.is_anonymous ? true : false,
    tags: row.tags_concat ? row.tags_concat.split(',') : [],
    user_voted: opts.userId ? votedSet.has(row.id) : undefined,
  }));
}

export async function getBuildById(
  db: D1Database,
  id: string,
  userId?: string,
): Promise<BuildWithMeta | null> {
  const row = await db.prepare('SELECT * FROM builds WHERE id = ?').bind(id).first<BuildRow>();
  if (!row) return null;

  const tagRows = await db
    .prepare('SELECT tag FROM build_tags WHERE build_id = ?')
    .bind(id)
    .all<BuildTagRow>();

  let userVoted = false;
  if (userId) {
    const vote = await db
      .prepare('SELECT 1 FROM build_votes WHERE build_id = ? AND user_id = ?')
      .bind(id, userId)
      .first();
    userVoted = vote !== null;
  }

  return {
    ...row,
    is_anonymous: row.is_anonymous ? true : false,
    tags: tagRows.results.map((t) => t.tag),
    user_voted: userId ? userVoted : undefined,
  };
}

export async function createBuild(
  db: D1Database,
  data: {
    id: string;
    authorId: string;
    authorName: string;
    title: string;
    description: string;
    esoClass: string;
    role: string;
    gameMode: string;
    buildData: string;
    tags: string[];
    isAnonymous: boolean;
  },
): Promise<void> {
  await db
    .prepare(
      'INSERT INTO builds (id, author_id, author_name, title, description, eso_class, role, game_mode, build_data, is_anonymous) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
    )
    .bind(
      data.id,
      data.authorId,
      data.authorName,
      data.title,
      data.description,
      data.esoClass,
      data.role,
      data.gameMode,
      data.buildData,
      data.isAnonymous ? 1 : 0,
    )
    .run();

  if (data.tags.length > 0) {
    await insertBuildTags(db, data.id, data.tags);
  }
}

export async function updateBuild(
  db: D1Database,
  id: string,
  authorId: string,
  data: {
    title: string;
    description: string;
    esoClass: string;
    role: string;
    gameMode: string;
    buildData: string;
    tags: string[];
    isAnonymous: boolean;
  },
): Promise<boolean> {
  const result = await db
    .prepare(
      "UPDATE builds SET title = ?, description = ?, eso_class = ?, role = ?, game_mode = ?, build_data = ?, is_anonymous = ?, updated_at = datetime('now') WHERE id = ? AND author_id = ?",
    )
    .bind(
      data.title,
      data.description,
      data.esoClass,
      data.role,
      data.gameMode,
      data.buildData,
      data.isAnonymous ? 1 : 0,
      id,
      authorId,
    )
    .run();

  if (!result.meta.changes || result.meta.changes === 0) return false;

  await db.prepare('DELETE FROM build_tags WHERE build_id = ?').bind(id).run();
  if (data.tags.length > 0) {
    await insertBuildTags(db, id, data.tags);
  }
  return true;
}

export async function deleteBuild(db: D1Database, id: string, authorId: string): Promise<boolean> {
  const result = await db
    .prepare('DELETE FROM builds WHERE id = ? AND author_id = ?')
    .bind(id, authorId)
    .run();
  return (result.meta.changes ?? 0) > 0;
}

export async function toggleBuildVote(
  db: D1Database,
  buildId: string,
  userId: string,
): Promise<{ voted: boolean; voteCount: number }> {
  const existing = await db
    .prepare('SELECT 1 FROM build_votes WHERE build_id = ? AND user_id = ?')
    .bind(buildId, userId)
    .first();

  if (existing) {
    await db
      .prepare('DELETE FROM build_votes WHERE build_id = ? AND user_id = ?')
      .bind(buildId, userId)
      .run();
    await db
      .prepare('UPDATE builds SET vote_count = vote_count - 1 WHERE id = ? AND vote_count > 0')
      .bind(buildId)
      .run();
    const updated = await db
      .prepare('SELECT vote_count FROM builds WHERE id = ?')
      .bind(buildId)
      .first<{ vote_count: number }>();
    return { voted: false, voteCount: updated?.vote_count ?? 0 };
  } else {
    await db
      .prepare('INSERT INTO build_votes (build_id, user_id) VALUES (?, ?)')
      .bind(buildId, userId)
      .run();
    await db
      .prepare('UPDATE builds SET vote_count = vote_count + 1 WHERE id = ?')
      .bind(buildId)
      .run();
    const updated = await db
      .prepare('SELECT vote_count FROM builds WHERE id = ?')
      .bind(buildId)
      .first<{ vote_count: number }>();
    return { voted: true, voteCount: updated?.vote_count ?? 1 };
  }
}

// ─── Build Comments ───────────────────────────────────────────────────────────

export async function listBuildComments(
  db: D1Database,
  buildId: string,
): Promise<BuildCommentWithReplies[]> {
  const rows = await db
    .prepare('SELECT * FROM build_comments WHERE build_id = ? ORDER BY created_at ASC')
    .bind(buildId)
    .all<BuildCommentRow>();

  const topLevel: BuildCommentWithReplies[] = [];
  const replyMap = new Map<string, BuildCommentRow[]>();

  for (const row of rows.results) {
    if (row.parent_id) {
      const replies = replyMap.get(row.parent_id) ?? [];
      replies.push(row);
      replyMap.set(row.parent_id, replies);
    } else {
      topLevel.push({ ...row, replies: [] });
    }
  }

  for (const comment of topLevel) {
    comment.replies = replyMap.get(comment.id) ?? [];
  }

  return topLevel;
}

export async function createBuildComment(
  db: D1Database,
  data: {
    id: string;
    buildId: string;
    parentId: string | null;
    authorId: string;
    authorName: string;
    body: string;
  },
): Promise<BuildCommentRow> {
  await db
    .prepare(
      'INSERT INTO build_comments (id, build_id, parent_id, author_id, author_name, body) VALUES (?, ?, ?, ?, ?, ?)',
    )
    .bind(data.id, data.buildId, data.parentId, data.authorId, data.authorName, data.body)
    .run();

  const row = await db
    .prepare('SELECT * FROM build_comments WHERE id = ?')
    .bind(data.id)
    .first<BuildCommentRow>();

  return row!;
}

export async function deleteBuildComment(
  db: D1Database,
  commentId: string,
  authorId: string,
): Promise<boolean> {
  const result = await db
    .prepare('DELETE FROM build_comments WHERE id = ? AND author_id = ?')
    .bind(commentId, authorId)
    .run();
  return (result.meta.changes ?? 0) > 0;
}

export async function checkBuildCommentRateLimit(db: D1Database, userId: string): Promise<boolean> {
  const row = await db
    .prepare(
      `SELECT COUNT(*) AS cnt FROM build_comments
       WHERE author_id = ? AND created_at > datetime('now', '-${RATE_LIMIT_WINDOW_SEC} seconds')`,
    )
    .bind(userId)
    .first<{ cnt: number }>();
  return (row?.cnt ?? 0) < RATE_LIMIT_MAX;
}

// Vote rate limit: 20 votes per hour per user
const VOTE_RATE_LIMIT_WINDOW_SEC = 3600;
const VOTE_RATE_LIMIT_MAX = 20;

export async function checkBuildVoteRateLimit(db: D1Database, userId: string): Promise<boolean> {
  const row = await db
    .prepare(
      `SELECT COUNT(*) AS cnt FROM build_votes
       WHERE user_id = ? AND created_at > datetime('now', '-${VOTE_RATE_LIMIT_WINDOW_SEC} seconds')`,
    )
    .bind(userId)
    .first<{ cnt: number }>();
  return (row?.cnt ?? 0) < VOTE_RATE_LIMIT_MAX;
}

// Build create rate limit: 5 creates per hour per user
const BUILD_CREATE_RATE_LIMIT_WINDOW_SEC = 3600;
const BUILD_CREATE_RATE_LIMIT_MAX = 5;

export async function checkBuildCreateRateLimit(db: D1Database, userId: string): Promise<boolean> {
  const row = await db
    .prepare(
      `SELECT COUNT(*) AS cnt FROM builds
       WHERE author_id = ? AND created_at > datetime('now', '-${BUILD_CREATE_RATE_LIMIT_WINDOW_SEC} seconds')`,
    )
    .bind(userId)
    .first<{ cnt: number }>();
  return (row?.cnt ?? 0) < BUILD_CREATE_RATE_LIMIT_MAX;
}

async function insertBuildTags(db: D1Database, buildId: string, tags: string[]): Promise<void> {
  const stmts = tags
    .slice(0, 10)
    .map((tag) =>
      db
        .prepare('INSERT OR IGNORE INTO build_tags (build_id, tag) VALUES (?, ?)')
        .bind(buildId, tag.toLowerCase().trim()),
    );
  await db.batch(stmts);
}

// ═══════════════════════════════════════════════════════════════════════════════
// Temp builds — guest-created builds with 5-day expiry
// ═══════════════════════════════════════════════════════════════════════════════

import type { TempBuildRow } from '../types';

const TEMP_BUILD_RATE_LIMIT_WINDOW_SEC = 3600;
const TEMP_BUILD_RATE_LIMIT_MAX = 10;

export async function createTempBuild(
  db: D1Database,
  data: { id: string; buildData: string },
): Promise<TempBuildRow> {
  await db
    .prepare(
      "INSERT INTO temp_builds (id, build_data, created_at, expires_at) VALUES (?, ?, datetime('now'), datetime('now', '+5 days'))",
    )
    .bind(data.id, data.buildData)
    .run();

  const row = await db
    .prepare('SELECT * FROM temp_builds WHERE id = ?')
    .bind(data.id)
    .first<TempBuildRow>();

  return row!;
}

export async function getTempBuild(
  db: D1Database,
  id: string,
): Promise<TempBuildRow | null> {
  const row = await db
    .prepare("SELECT * FROM temp_builds WHERE id = ? AND expires_at > datetime('now')")
    .bind(id)
    .first<TempBuildRow>();

  return row ?? null;
}

export async function checkTempBuildRateLimit(db: D1Database, ip: string): Promise<boolean> {
  const row = await db
    .prepare(
      `SELECT COUNT(*) AS cnt FROM temp_build_rate_limits
       WHERE ip = ? AND created_at > datetime('now', '-${TEMP_BUILD_RATE_LIMIT_WINDOW_SEC} seconds')`,
    )
    .bind(ip)
    .first<{ cnt: number }>();
  return (row?.cnt ?? 0) < TEMP_BUILD_RATE_LIMIT_MAX;
}

export async function recordTempBuildRateLimit(db: D1Database, ip: string): Promise<void> {
  await db
    .prepare("INSERT INTO temp_build_rate_limits (ip, created_at) VALUES (?, datetime('now'))")
    .bind(ip)
    .run();
}

export async function cleanupExpiredTempBuilds(db: D1Database): Promise<void> {
  await db.prepare("DELETE FROM temp_builds WHERE expires_at < datetime('now')").run();
  // Also clean up old rate limit entries (older than the window)
  await db
    .prepare(
      `DELETE FROM temp_build_rate_limits WHERE created_at < datetime('now', '-${TEMP_BUILD_RATE_LIMIT_WINDOW_SEC} seconds')`,
    )
    .run();
}
