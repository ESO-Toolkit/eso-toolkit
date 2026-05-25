/**
 * D1 query helpers for the roster hub.
 * All SQL is parameterised — no string interpolation, no injection risk.
 */

import type { D1Database } from '@cloudflare/workers-types';
import type {
  BuildSummary,
  CommentRow,
  CommentWithReplies,
  ImageReportRow,
  ImageUploadRow,
  PackRow,
  PackTagRow,
  PackWithMeta,
  RosterRow,
  RosterSummary,
  RosterTagRow,
  RosterWithMeta,
  UserProfileResponse,
  UserProfileRow,
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

  return rows.results.map((row) => {
    const isAnon = row.is_anonymous ? true : false;
    const isOwner = opts.userId === row.author_id;
    return {
      ...row,
      author_id: isAnon && !isOwner ? '' : row.author_id,
      author_name: isAnon && !isOwner ? 'Anonymous' : row.author_name,
      is_anonymous: isAnon,
      tags: row.tags_concat ? row.tags_concat.split(',') : [],
      user_voted: opts.userId ? votedSet.has(row.id) : undefined,
    };
  });
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

  const isAnon = row.is_anonymous ? true : false;
  const isOwner = userId === row.author_id;
  return {
    ...row,
    author_id: isAnon && !isOwner ? '' : row.author_id,
    author_name: isAnon && !isOwner ? 'Anonymous' : row.author_name,
    is_anonymous: isAnon,
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
    recommendedAddons: string | null;
  },
): Promise<void> {
  await db
    .prepare(
      'INSERT INTO rosters (id, author_id, author_name, title, description, trial_id, roster_data, is_anonymous, recommended_addons) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
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
      data.recommendedAddons,
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
    recommendedAddons: string | null;
  },
): Promise<boolean> {
  const result = await db
    .prepare(
      "UPDATE rosters SET title = ?, description = ?, trial_id = ?, roster_data = ?, is_anonymous = ?, recommended_addons = ?, updated_at = datetime('now') WHERE id = ? AND author_id = ?",
    )
    .bind(
      data.title,
      data.description,
      data.trialId,
      data.rosterData,
      data.isAnonymous ? 1 : 0,
      data.recommendedAddons,
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
  // INSERT OR IGNORE is atomic — concurrent requests cannot both insert the same
  // UNIQUE (roster_id, user_id) pair, eliminating the read-then-write race.
  const insertResult = await db
    .prepare('INSERT OR IGNORE INTO roster_votes (roster_id, user_id) VALUES (?, ?)')
    .bind(rosterId, userId)
    .run();

  const voted = (insertResult.meta.changes ?? 0) > 0;

  if (!voted) {
    // Row already existed → this is an un-vote
    await db
      .prepare('DELETE FROM roster_votes WHERE roster_id = ? AND user_id = ?')
      .bind(rosterId, userId)
      .run();
  }

  // Derive the true count from the votes table instead of incrementing/decrementing,
  // so any prior drift is corrected on the next toggle.
  const countRow = await db
    .prepare('SELECT COUNT(*) AS cnt FROM roster_votes WHERE roster_id = ?')
    .bind(rosterId)
    .first<{ cnt: number }>();
  const voteCount = countRow?.cnt ?? 0;

  await db
    .prepare('UPDATE rosters SET vote_count = ? WHERE id = ?')
    .bind(voteCount, rosterId)
    .run();

  return { voted, voteCount };
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

  return rows.results.map((row) => {
    const isAnon = row.is_anonymous ? true : false;
    const isOwner = opts.userId === row.author_id;
    return {
      ...row,
      author_id: isAnon && !isOwner ? '' : row.author_id,
      author_name: isAnon && !isOwner ? 'Anonymous' : row.author_name,
      is_anonymous: isAnon,
      tags: row.tags_concat ? row.tags_concat.split(',') : [],
      user_voted: opts.userId ? votedSet.has(row.id) : undefined,
    };
  });
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

  const isAnon = row.is_anonymous ? true : false;
  const isOwner = userId === row.author_id;
  return {
    ...row,
    author_id: isAnon && !isOwner ? '' : row.author_id,
    author_name: isAnon && !isOwner ? 'Anonymous' : row.author_name,
    is_anonymous: isAnon,
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
  const insertResult = await db
    .prepare('INSERT OR IGNORE INTO build_votes (build_id, user_id) VALUES (?, ?)')
    .bind(buildId, userId)
    .run();

  const voted = (insertResult.meta.changes ?? 0) > 0;

  if (!voted) {
    await db
      .prepare('DELETE FROM build_votes WHERE build_id = ? AND user_id = ?')
      .bind(buildId, userId)
      .run();
  }

  const countRow = await db
    .prepare('SELECT COUNT(*) AS cnt FROM build_votes WHERE build_id = ?')
    .bind(buildId)
    .first<{ cnt: number }>();
  const voteCount = countRow?.cnt ?? 0;

  await db
    .prepare('UPDATE builds SET vote_count = ? WHERE id = ?')
    .bind(voteCount, buildId)
    .run();

  return { voted, voteCount };
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

export async function checkRosterVoteRateLimit(db: D1Database, userId: string): Promise<boolean> {
  const row = await db
    .prepare(
      `SELECT COUNT(*) AS cnt FROM rate_limit_events
       WHERE user_id = ? AND action = 'roster_vote' AND created_at > datetime('now', '-${VOTE_RATE_LIMIT_WINDOW_SEC} seconds')`,
    )
    .bind(userId)
    .first<{ cnt: number }>();
  return (row?.cnt ?? 0) < VOTE_RATE_LIMIT_MAX;
}

export async function checkBuildVoteRateLimit(db: D1Database, userId: string): Promise<boolean> {
  const row = await db
    .prepare(
      `SELECT COUNT(*) AS cnt FROM rate_limit_events
       WHERE user_id = ? AND action = 'build_vote' AND created_at > datetime('now', '-${VOTE_RATE_LIMIT_WINDOW_SEC} seconds')`,
    )
    .bind(userId)
    .first<{ cnt: number }>();
  return (row?.cnt ?? 0) < VOTE_RATE_LIMIT_MAX;
}

export async function recordRateLimitEvent(
  db: D1Database,
  userId: string,
  action: string,
): Promise<void> {
  await db
    .prepare("INSERT INTO rate_limit_events (user_id, action, created_at) VALUES (?, ?, datetime('now'))")
    .bind(userId, action)
    .run();
}

export async function pruneRateLimitEvents(db: D1Database): Promise<void> {
  await db
    .prepare("DELETE FROM rate_limit_events WHERE created_at < datetime('now', '-2 hours')")
    .run();
}

// Roster create rate limit: 5 creates per hour per user
const ROSTER_CREATE_RATE_LIMIT_WINDOW_SEC = 3600;
const ROSTER_CREATE_RATE_LIMIT_MAX = 5;

export async function checkRosterCreateRateLimit(db: D1Database, userId: string): Promise<boolean> {
  const row = await db
    .prepare(
      `SELECT COUNT(*) AS cnt FROM rosters
       WHERE author_id = ? AND created_at > datetime('now', '-${ROSTER_CREATE_RATE_LIMIT_WINDOW_SEC} seconds')`,
    )
    .bind(userId)
    .first<{ cnt: number }>();
  return (row?.cnt ?? 0) < ROSTER_CREATE_RATE_LIMIT_MAX;
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

export async function getTempBuild(db: D1Database, id: string): Promise<TempBuildRow | null> {
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
  // Prune expired entries on every write so the table stays bounded even if the
  // scheduled cleanup (cleanupExpiredTempBuilds) is delayed or skipped.
  await db
    .prepare(
      `DELETE FROM temp_build_rate_limits WHERE created_at < datetime('now', '-${TEMP_BUILD_RATE_LIMIT_WINDOW_SEC} seconds')`,
    )
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

// ═══════════════════════════════════════════════════════════════════════════════
// Image uploads — CRUD + rate limiting + reporting
// ═══════════════════════════════════════════════════════════════════════════════

const IMAGE_UPLOAD_RATE_LIMIT_MAX = 10;
const IMAGE_UPLOAD_RATE_LIMIT_WINDOW_SEC = 3600; // 1 hour

export async function createImageUpload(
  db: D1Database,
  data: {
    id: string;
    uploaderId: string;
    uploaderName: string;
    url: string;
    thumbUrl: string;
    deleteUrl: string;
  },
): Promise<ImageUploadRow> {
  await db
    .prepare(
      `INSERT INTO image_uploads (id, uploader_id, uploader_name, url, thumb_url, delete_url)
       VALUES (?, ?, ?, ?, ?, ?)`,
    )
    .bind(data.id, data.uploaderId, data.uploaderName, data.url, data.thumbUrl, data.deleteUrl)
    .run();

  const row = await db
    .prepare('SELECT * FROM image_uploads WHERE id = ?')
    .bind(data.id)
    .first<ImageUploadRow>();

  return row!;
}

export async function getImageUpload(db: D1Database, id: string): Promise<ImageUploadRow | null> {
  const row = await db
    .prepare('SELECT * FROM image_uploads WHERE id = ?')
    .bind(id)
    .first<ImageUploadRow>();

  return row ?? null;
}

export async function deleteImageUpload(
  db: D1Database,
  id: string,
  userId: string,
): Promise<{ deleted: boolean; deleteUrl: string | null }> {
  const row = await db
    .prepare('SELECT delete_url FROM image_uploads WHERE id = ? AND uploader_id = ?')
    .bind(id, userId)
    .first<{ delete_url: string }>();

  if (!row) return { deleted: false, deleteUrl: null };

  await db
    .prepare('DELETE FROM image_uploads WHERE id = ? AND uploader_id = ?')
    .bind(id, userId)
    .run();

  return { deleted: true, deleteUrl: row.delete_url };
}

export async function createImageReport(
  db: D1Database,
  data: { id: string; imageId: string; reporterId: string; reason: string },
): Promise<ImageReportRow> {
  await db
    .prepare(
      `INSERT INTO image_reports (id, image_id, reporter_id, reason)
       VALUES (?, ?, ?, ?)`,
    )
    .bind(data.id, data.imageId, data.reporterId, data.reason)
    .run();

  const row = await db
    .prepare('SELECT * FROM image_reports WHERE id = ?')
    .bind(data.id)
    .first<ImageReportRow>();

  return row!;
}

export async function checkImageUploadRateLimit(db: D1Database, userId: string): Promise<boolean> {
  const row = await db
    .prepare(
      `SELECT COUNT(*) AS cnt FROM rate_limit_events
       WHERE user_id = ? AND action = 'image_upload' AND created_at > datetime('now', '-${IMAGE_UPLOAD_RATE_LIMIT_WINDOW_SEC} seconds')`,
    )
    .bind(userId)
    .first<{ cnt: number }>();

  return (row?.cnt ?? 0) < IMAGE_UPLOAD_RATE_LIMIT_MAX;
}

// ═══════════════════════════════════════════════════════════════════════════════
// User profiles — zero content storage; aggregates from existing builds/rosters
// ═══════════════════════════════════════════════════════════════════════════════

const PROFILE_PAGE_SIZE = 12;

type BuildSummaryRow = BuildSummary & { tags_concat: string | null; author_name: string };
type RosterSummaryRow = RosterSummary & { tags_concat: string | null; author_name: string };

export async function getUserProfile(
  db: D1Database,
  username: string,
): Promise<UserProfileResponse | null> {
  // Run all 5 reads in a single parallel batch — counts included upfront to
  // avoid a second round-trip to D1.
  const [profileRow, buildsResult, rostersResult, buildCountRow, rosterCountRow] =
    await Promise.all([
      db
        .prepare('SELECT * FROM user_profiles WHERE author_name = ? COLLATE NOCASE')
        .bind(username)
        .first<UserProfileRow>(),

      db
        .prepare(
          `SELECT b.id, b.author_name, b.title, b.description, b.eso_class, b.role, b.game_mode,
                  b.vote_count, b.created_at, GROUP_CONCAT(DISTINCT bt.tag) AS tags_concat
           FROM builds b
           LEFT JOIN build_tags bt ON bt.build_id = b.id
           WHERE b.author_name = ? COLLATE NOCASE AND b.is_anonymous = 0
           GROUP BY b.id
           ORDER BY b.vote_count DESC, b.created_at DESC
           LIMIT ?`,
        )
        .bind(username, PROFILE_PAGE_SIZE)
        .all<BuildSummaryRow>(),

      db
        .prepare(
          `SELECT r.id, r.author_name, r.title, r.description, r.trial_id,
                  r.vote_count, r.created_at, GROUP_CONCAT(DISTINCT rt.tag) AS tags_concat
           FROM rosters r
           LEFT JOIN roster_tags rt ON rt.roster_id = r.id
           WHERE r.author_name = ? COLLATE NOCASE AND r.is_anonymous = 0
           GROUP BY r.id
           ORDER BY r.vote_count DESC, r.created_at DESC
           LIMIT ?`,
        )
        .bind(username, PROFILE_PAGE_SIZE)
        .all<RosterSummaryRow>(),

      db
        .prepare(
          'SELECT COUNT(*) AS cnt FROM builds WHERE author_name = ? COLLATE NOCASE AND is_anonymous = 0',
        )
        .bind(username)
        .first<{ cnt: number }>(),

      db
        .prepare(
          'SELECT COUNT(*) AS cnt FROM rosters WHERE author_name = ? COLLATE NOCASE AND is_anonymous = 0',
        )
        .bind(username)
        .first<{ cnt: number }>(),
    ]);

  // Unknown user — no bio row and no public content
  if (!profileRow && buildsResult.results.length === 0 && rostersResult.results.length === 0) {
    return null;
  }

  // Prefer the canonical casing from content rows, fall back to the URL slug
  const displayName =
    buildsResult.results[0]?.author_name ??
    rostersResult.results[0]?.author_name ??
    profileRow?.author_name ??
    username;

  return {
    username: displayName,
    bio: profileRow?.bio ?? '',
    avatar_url: profileRow?.avatar_url ?? null,
    avatar_thumb_url: profileRow?.avatar_thumb_url ?? null,
    build_count: buildCountRow?.cnt ?? 0,
    roster_count: rosterCountRow?.cnt ?? 0,
    builds: buildsResult.results.map((b) => ({
      id: b.id,
      title: b.title,
      description: b.description,
      eso_class: b.eso_class,
      role: b.role,
      game_mode: b.game_mode,
      vote_count: b.vote_count,
      tags: b.tags_concat ? b.tags_concat.split(',') : [],
      created_at: b.created_at,
    })),
    rosters: rostersResult.results.map((r) => ({
      id: r.id,
      title: r.title,
      description: r.description,
      trial_id: r.trial_id,
      vote_count: r.vote_count,
      tags: r.tags_concat ? r.tags_concat.split(',') : [],
      created_at: r.created_at,
    })),
  };
}

export async function upsertUserBio(
  db: D1Database,
  authorId: string,
  authorName: string,
  bio: string,
): Promise<void> {
  await db
    .prepare(
      `INSERT INTO user_profiles (author_id, author_name, bio, updated_at)
       VALUES (?, ?, ?, datetime('now'))
       ON CONFLICT (author_id) DO UPDATE SET
         author_name = excluded.author_name,
         bio         = excluded.bio,
         updated_at  = excluded.updated_at`,
    )
    .bind(authorId, authorName, bio)
    .run();
}

export async function upsertUserAvatar(
  db: D1Database,
  authorId: string,
  authorName: string,
  avatarUrl: string,
  avatarThumbUrl: string,
  avatarDeleteUrl: string,
): Promise<void> {
  await db
    .prepare(
      `INSERT INTO user_profiles (author_id, author_name, avatar_url, avatar_thumb_url, avatar_delete_url, avatar_uploaded_at, updated_at)
       VALUES (?, ?, ?, ?, ?, datetime('now'), datetime('now'))
       ON CONFLICT (author_id) DO UPDATE SET
         author_name       = excluded.author_name,
         avatar_url        = excluded.avatar_url,
         avatar_thumb_url  = excluded.avatar_thumb_url,
         avatar_delete_url = excluded.avatar_delete_url,
         avatar_uploaded_at = excluded.avatar_uploaded_at,
         updated_at        = excluded.updated_at`,
    )
    .bind(authorId, authorName, avatarUrl, avatarThumbUrl, avatarDeleteUrl)
    .run();
}

export async function deleteUserAvatar(
  db: D1Database,
  authorId: string,
): Promise<{ avatarDeleteUrl: string | null }> {
  // Retrieve the host-side delete URL before clearing it
  const row = await db
    .prepare('SELECT avatar_delete_url FROM user_profiles WHERE author_id = ?')
    .bind(authorId)
    .first<{ avatar_delete_url: string | null }>();

  await db
    .prepare(
      `UPDATE user_profiles
       SET avatar_url = NULL, avatar_thumb_url = NULL, avatar_delete_url = NULL, updated_at = datetime('now')
       WHERE author_id = ?`,
    )
    .bind(authorId)
    .run();

  return { avatarDeleteUrl: row?.avatar_delete_url ?? null };
}

/** Retrieve the current avatar's ImgBB delete URL (used before overwriting). */
export async function getAvatarDeleteUrl(
  db: D1Database,
  authorId: string,
): Promise<string | null> {
  const row = await db
    .prepare('SELECT avatar_delete_url FROM user_profiles WHERE author_id = ?')
    .bind(authorId)
    .first<{ avatar_delete_url: string | null }>();
  return row?.avatar_delete_url ?? null;
}

export async function checkAvatarUploadRateLimit(
  db: D1Database,
  authorId: string,
): Promise<boolean> {
  // Allow 1 avatar upload per hour — uses dedicated avatar_uploaded_at column
  // so bio updates / display-name syncs don't interfere with the cooldown.
  const row = await db
    .prepare(
      `SELECT 1 FROM user_profiles
       WHERE author_id = ? AND avatar_uploaded_at > datetime('now', '-3600 seconds')`,
    )
    .bind(authorId)
    .first();
  return !row;
}

// ─── Display name sync ──────────────────────────────────────────────────────

export async function updateDisplayNames(
  db: D1Database,
  authorId: string,
  authorName: string,
  naDisplayName: string | null,
  euDisplayName: string | null,
): Promise<void> {
  await db
    .prepare(
      `INSERT INTO user_profiles (author_id, author_name, na_display_name, eu_display_name, updated_at)
       VALUES (?, ?, ?, ?, datetime('now'))
       ON CONFLICT (author_id) DO UPDATE SET
         author_name      = excluded.author_name,
         na_display_name  = excluded.na_display_name,
         eu_display_name  = excluded.eu_display_name,
         updated_at       = excluded.updated_at`,
    )
    .bind(authorId, authorName, naDisplayName, euDisplayName)
    .run();
}

/** A player identity: @displayName + megaserver region (na or eu). */
export interface PlayerLookupEntry {
  display_name: string;
  server: 'na' | 'eu';
}

/**
 * Batch-lookup avatar thumbnails for players, keyed by `displayName|server`.
 * Queries the correct column (na_display_name or eu_display_name) per entry
 * so two users with the same @handle on different megaservers are never confused.
 */
export async function lookupAvatarsByDisplayNames(
  db: D1Database,
  players: PlayerLookupEntry[],
): Promise<Record<string, string>> {
  if (players.length === 0) return {};

  const naNames = players.filter((p) => p.server === 'na').map((p) => p.display_name);
  const euNames = players.filter((p) => p.server === 'eu').map((p) => p.display_name);

  const result: Record<string, string> = {};

  // Query NA matches
  if (naNames.length > 0) {
    const ph = naNames.map(() => '?').join(', ');
    const rows = await db
      .prepare(
        `SELECT na_display_name, avatar_thumb_url FROM user_profiles
         WHERE avatar_thumb_url IS NOT NULL AND na_display_name IN (${ph})`,
      )
      .bind(...naNames)
      .all<{ na_display_name: string; avatar_thumb_url: string }>();
    for (const row of rows.results) {
      result[`${row.na_display_name}|na`] = row.avatar_thumb_url;
    }
  }

  // Query EU matches
  if (euNames.length > 0) {
    const ph = euNames.map(() => '?').join(', ');
    const rows = await db
      .prepare(
        `SELECT eu_display_name, avatar_thumb_url FROM user_profiles
         WHERE avatar_thumb_url IS NOT NULL AND eu_display_name IN (${ph})`,
      )
      .bind(...euNames)
      .all<{ eu_display_name: string; avatar_thumb_url: string }>();
    for (const row of rows.results) {
      result[`${row.eu_display_name}|eu`] = row.avatar_thumb_url;
    }
  }

  return result;
}

// ─── Leaderboard sync queries ───────────────────────────────────────────────

export async function findSystemRoster(
  db: D1Database,
  authorId: string,
  trialId: string,
): Promise<{ id: string } | null> {
  return db
    .prepare('SELECT id FROM rosters WHERE author_id = ? AND trial_id = ? LIMIT 1')
    .bind(authorId, trialId)
    .first<{ id: string }>();
}

export async function upsertSystemRoster(
  db: D1Database,
  opts: {
    existingId?: string;
    newId: string;
    authorId: string;
    authorName: string;
    title: string;
    description: string;
    trialId: string;
    rosterData: string;
    tags: string[];
  },
): Promise<void> {
  if (opts.existingId) {
    await db
      .prepare(
        `UPDATE rosters SET title = ?, description = ?, roster_data = ?, updated_at = datetime('now')
         WHERE id = ?`,
      )
      .bind(opts.title, opts.description, opts.rosterData, opts.existingId)
      .run();
  } else {
    await db
      .prepare(
        `INSERT INTO rosters (id, author_id, author_name, is_anonymous, title, description, trial_id, roster_data, vote_count, created_at, updated_at)
         VALUES (?, ?, ?, 0, ?, ?, ?, ?, 0, datetime('now'), datetime('now'))`,
      )
      .bind(
        opts.newId,
        opts.authorId,
        opts.authorName,
        opts.title,
        opts.description,
        opts.trialId,
        opts.rosterData,
      )
      .run();
  }

  // Upsert tags
  const rosterId = opts.existingId ?? opts.newId;
  await db.prepare('DELETE FROM roster_tags WHERE roster_id = ?').bind(rosterId).run();
  for (const tag of opts.tags) {
    await db
      .prepare('INSERT INTO roster_tags (roster_id, tag) VALUES (?, ?)')
      .bind(rosterId, tag)
      .run();
  }
}

// ─── Pack Hub queries ─────────────────────────────────────────────────────────

export interface ListPacksOptions {
  packType?: string;
  tag?: string;
  sort: 'votes' | 'recent';
  page: number;
  userId?: string;
}

export async function listPacks(db: D1Database, opts: ListPacksOptions): Promise<PackWithMeta[]> {
  const offset = (opts.page - 1) * PAGE_SIZE;
  const orderBy =
    opts.sort === 'votes' ? 'p.vote_count DESC, p.created_at DESC' : 'p.created_at DESC';

  const conditions: string[] = [];
  const bindings: (string | number)[] = [];

  if (opts.packType) {
    conditions.push('p.pack_type = ?');
    bindings.push(opts.packType);
  }
  if (opts.tag) {
    conditions.push('EXISTS (SELECT 1 FROM pack_tags pt WHERE pt.pack_id = p.id AND pt.tag = ?)');
    bindings.push(opts.tag);
  }

  const where = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

  const sql = `
    SELECT p.*, GROUP_CONCAT(DISTINCT pt.tag) AS tags_concat
    FROM packs p
    LEFT JOIN pack_tags pt ON pt.pack_id = p.id
    ${where}
    GROUP BY p.id
    ORDER BY ${orderBy}
    LIMIT ${PAGE_SIZE} OFFSET ${offset}
  `;

  const rows = await db
    .prepare(sql)
    .bind(...bindings)
    .all<PackRow & { tags_concat: string | null }>();

  let votedSet = new Set<string>();
  if (opts.userId && rows.results.length > 0) {
    const ids = rows.results.map((r) => r.id);
    const placeholders = ids.map(() => '?').join(',');
    const voteRows = await db
      .prepare(`SELECT pack_id FROM pack_votes WHERE user_id = ? AND pack_id IN (${placeholders})`)
      .bind(opts.userId, ...ids)
      .all<{ pack_id: string }>();
    votedSet = new Set(voteRows.results.map((v) => v.pack_id));
  }

  return rows.results.map((row) => {
    const isAnon = row.is_anonymous ? true : false;
    const isOwner = opts.userId === row.author_id;
    return {
      ...row,
      author_id: isAnon && !isOwner ? '' : row.author_id,
      author_name: isAnon && !isOwner ? 'Anonymous' : row.author_name,
      is_anonymous: isAnon,
      tags: row.tags_concat ? row.tags_concat.split(',') : [],
      user_voted: opts.userId ? votedSet.has(row.id) : undefined,
    };
  });
}

export async function getPackById(
  db: D1Database,
  id: string,
  userId?: string,
): Promise<PackWithMeta | null> {
  const row = await db.prepare('SELECT * FROM packs WHERE id = ?').bind(id).first<PackRow>();
  if (!row) return null;

  const tagRows = await db
    .prepare('SELECT tag FROM pack_tags WHERE pack_id = ?')
    .bind(id)
    .all<PackTagRow>();

  let userVoted = false;
  if (userId) {
    const vote = await db
      .prepare('SELECT 1 FROM pack_votes WHERE pack_id = ? AND user_id = ?')
      .bind(id, userId)
      .first();
    userVoted = vote !== null;
  }

  const isAnon = row.is_anonymous ? true : false;
  const isOwner = userId === row.author_id;
  return {
    ...row,
    author_id: isAnon && !isOwner ? '' : row.author_id,
    author_name: isAnon && !isOwner ? 'Anonymous' : row.author_name,
    is_anonymous: isAnon,
    tags: tagRows.results.map((t) => t.tag),
    user_voted: userId ? userVoted : undefined,
  };
}

async function insertPackTags(db: D1Database, packId: string, tags: string[]): Promise<void> {
  for (const tag of tags) {
    await db
      .prepare('INSERT OR IGNORE INTO pack_tags (pack_id, tag) VALUES (?, ?)')
      .bind(packId, tag)
      .run();
  }
}

export async function createPack(
  db: D1Database,
  data: {
    id: string;
    authorId: string;
    authorName: string;
    title: string;
    description: string;
    packType: string;
    addons: string; // JSON array
    tags: string[];
    isAnonymous: boolean;
  },
): Promise<void> {
  await db
    .prepare(
      'INSERT INTO packs (id, author_id, author_name, title, description, pack_type, addons, is_anonymous) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
    )
    .bind(
      data.id,
      data.authorId,
      data.authorName,
      data.title,
      data.description,
      data.packType,
      data.addons,
      data.isAnonymous ? 1 : 0,
    )
    .run();

  if (data.tags.length > 0) {
    await insertPackTags(db, data.id, data.tags);
  }
}

export async function updatePack(
  db: D1Database,
  id: string,
  authorId: string,
  data: {
    title: string;
    description: string;
    packType: string;
    addons: string;
    tags: string[];
    isAnonymous: boolean;
  },
): Promise<boolean> {
  const result = await db
    .prepare(
      "UPDATE packs SET title = ?, description = ?, pack_type = ?, addons = ?, is_anonymous = ?, updated_at = datetime('now') WHERE id = ? AND author_id = ?",
    )
    .bind(
      data.title,
      data.description,
      data.packType,
      data.addons,
      data.isAnonymous ? 1 : 0,
      id,
      authorId,
    )
    .run();

  if (!result.meta.changes || result.meta.changes === 0) return false;

  await db.prepare('DELETE FROM pack_tags WHERE pack_id = ?').bind(id).run();
  if (data.tags.length > 0) {
    await insertPackTags(db, id, data.tags);
  }
  return true;
}

export async function deletePack(db: D1Database, id: string, authorId: string): Promise<boolean> {
  const result = await db
    .prepare('DELETE FROM packs WHERE id = ? AND author_id = ?')
    .bind(id, authorId)
    .run();
  return (result.meta.changes ?? 0) > 0;
}

export async function togglePackVote(
  db: D1Database,
  packId: string,
  userId: string,
): Promise<{ voted: boolean; voteCount: number }> {
  // INSERT OR IGNORE is atomic — concurrent requests cannot both insert the same
  // UNIQUE (pack_id, user_id) pair, eliminating the read-then-write race.
  const insertResult = await db
    .prepare(
      "INSERT OR IGNORE INTO pack_votes (pack_id, user_id, created_at) VALUES (?, ?, datetime('now'))",
    )
    .bind(packId, userId)
    .run();

  const voted = (insertResult.meta.changes ?? 0) > 0;

  if (!voted) {
    // Row already existed → this is an un-vote
    await db
      .prepare('DELETE FROM pack_votes WHERE pack_id = ? AND user_id = ?')
      .bind(packId, userId)
      .run();
  }

  // Derive the true count from the votes table instead of incrementing/decrementing,
  // so any prior drift is corrected on the next toggle.
  const countRow = await db
    .prepare('SELECT COUNT(*) AS cnt FROM pack_votes WHERE pack_id = ?')
    .bind(packId)
    .first<{ cnt: number }>();
  const voteCount = countRow?.cnt ?? 0;

  await db.prepare('UPDATE packs SET vote_count = ? WHERE id = ?').bind(voteCount, packId).run();

  return { voted, voteCount };
}

export async function checkPackCreateRateLimit(db: D1Database, userId: string): Promise<boolean> {
  const row = await db
    .prepare(
      "SELECT COUNT(*) AS cnt FROM packs WHERE author_id = ? AND created_at > datetime('now', '-1 hour')",
    )
    .bind(userId)
    .first<{ cnt: number }>();
  return (row?.cnt ?? 0) < 10;
}

export async function checkPackVoteRateLimit(db: D1Database, userId: string): Promise<boolean> {
  const row = await db
    .prepare(
      "SELECT COUNT(*) AS cnt FROM rate_limit_events WHERE user_id = ? AND action = 'pack_vote' AND created_at > datetime('now', '-1 hour')",
    )
    .bind(userId)
    .first<{ cnt: number }>();
  return (row?.cnt ?? 0) < 30;
}
