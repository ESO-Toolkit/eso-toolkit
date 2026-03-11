/**
 * D1 query helpers for the roster hub.
 * All SQL is parameterised — no string interpolation, no injection risk.
 */

import type { D1Database } from '@cloudflare/workers-types';
import type { RosterRow, RosterTagRow, RosterWithMeta } from '../types';

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
  const orderBy = opts.sort === 'votes' ? 'r.vote_count DESC, r.created_at DESC' : 'r.created_at DESC';

  // Build WHERE clauses
  const conditions: string[] = [];
  const bindings: (string | number)[] = [];

  if (opts.trial) {
    conditions.push('r.trial_id = ?');
    bindings.push(opts.trial);
  }
  if (opts.tag) {
    conditions.push('EXISTS (SELECT 1 FROM roster_tags rt WHERE rt.roster_id = r.id AND rt.tag = ?)');
    bindings.push(opts.tag);
  }

  const where = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

  const sql = `
    SELECT r.*, GROUP_CONCAT(rt.tag) AS tags_concat
    FROM rosters r
    LEFT JOIN roster_tags rt ON rt.roster_id = r.id
    ${where}
    GROUP BY r.id
    ORDER BY ${orderBy}
    LIMIT ${PAGE_SIZE} OFFSET ${offset}
  `;

  const rows = await db.prepare(sql).bind(...bindings).all<RosterRow & { tags_concat: string | null }>();

  // Attach vote status if user is logged in
  let votedSet = new Set<string>();
  if (opts.userId && rows.results.length > 0) {
    const ids = rows.results.map((r) => r.id);
    const placeholders = ids.map(() => '?').join(',');
    const voteRows = await db
      .prepare(`SELECT roster_id FROM roster_votes WHERE user_id = ? AND roster_id IN (${placeholders})`)
      .bind(opts.userId, ...ids)
      .all<{ roster_id: string }>();
    votedSet = new Set(voteRows.results.map((v) => v.roster_id));
  }

  return rows.results.map((row) => ({
    ...row,
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
  },
): Promise<void> {
  await db
    .prepare(
      'INSERT INTO rosters (id, author_id, author_name, title, description, trial_id, roster_data) VALUES (?, ?, ?, ?, ?, ?, ?)',
    )
    .bind(data.id, data.authorId, data.authorName, data.title, data.description, data.trialId, data.rosterData)
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
  },
): Promise<boolean> {
  const result = await db
    .prepare(
      'UPDATE rosters SET title = ?, description = ?, trial_id = ?, roster_data = ?, updated_at = datetime(\'now\') WHERE id = ? AND author_id = ?',
    )
    .bind(data.title, data.description, data.trialId, data.rosterData, id, authorId)
    .run();

  if (!result.meta.changes || result.meta.changes === 0) return false;

  // Replace tags
  await db.prepare('DELETE FROM roster_tags WHERE roster_id = ?').bind(id).run();
  if (data.tags.length > 0) {
    await insertTags(db, id, data.tags);
  }
  return true;
}

export async function deleteRoster(
  db: D1Database,
  id: string,
  authorId: string,
): Promise<boolean> {
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

async function insertTags(db: D1Database, rosterId: string, tags: string[]): Promise<void> {
  // D1 doesn't support multi-row VALUES yet; batch individual inserts
  const stmts = tags
    .slice(0, 10) // max 10 tags per roster
    .map((tag) =>
      db.prepare('INSERT OR IGNORE INTO roster_tags (roster_id, tag) VALUES (?, ?)').bind(rosterId, tag.toLowerCase().trim()),
    );
  await db.batch(stmts);
}
