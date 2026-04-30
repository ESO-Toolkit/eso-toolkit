-- Migration: Add builds hub tables
-- Run: wrangler d1 execute roster-hub-db --remote --file=src/db/migration-builds.sql

CREATE TABLE IF NOT EXISTS builds (
  id           TEXT PRIMARY KEY,
  author_id    TEXT NOT NULL,
  author_name  TEXT NOT NULL,
  is_anonymous INTEGER NOT NULL DEFAULT 0,
  title        TEXT NOT NULL,
  description  TEXT NOT NULL DEFAULT '',
  eso_class    TEXT NOT NULL,
  role         TEXT NOT NULL,
  game_mode    TEXT NOT NULL DEFAULT 'pve',
  build_data   TEXT NOT NULL,
  vote_count   INTEGER NOT NULL DEFAULT 0,
  created_at   TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at   TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS build_votes (
  build_id   TEXT NOT NULL REFERENCES builds(id) ON DELETE CASCADE,
  user_id    TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  PRIMARY KEY (build_id, user_id)
);

CREATE TABLE IF NOT EXISTS build_tags (
  build_id TEXT NOT NULL REFERENCES builds(id) ON DELETE CASCADE,
  tag      TEXT NOT NULL,
  PRIMARY KEY (build_id, tag)
);

CREATE TABLE IF NOT EXISTS build_comments (
  id          TEXT PRIMARY KEY,
  build_id    TEXT NOT NULL REFERENCES builds(id) ON DELETE CASCADE,
  parent_id   TEXT,
  author_id   TEXT NOT NULL,
  author_name TEXT NOT NULL,
  body        TEXT NOT NULL,
  created_at  TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (parent_id) REFERENCES build_comments(id) ON DELETE CASCADE
);

-- Indexes for common query patterns
CREATE INDEX IF NOT EXISTS idx_builds_class          ON builds(eso_class);
CREATE INDEX IF NOT EXISTS idx_builds_role           ON builds(role);
CREATE INDEX IF NOT EXISTS idx_builds_mode           ON builds(game_mode);
CREATE INDEX IF NOT EXISTS idx_builds_votes          ON builds(vote_count DESC);
CREATE INDEX IF NOT EXISTS idx_builds_created        ON builds(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_builds_author         ON builds(author_id);
CREATE INDEX IF NOT EXISTS idx_build_tags_tag        ON build_tags(tag);
CREATE INDEX IF NOT EXISTS idx_build_votes_user      ON build_votes(user_id);
CREATE INDEX IF NOT EXISTS idx_build_comments_build  ON build_comments(build_id, created_at);
CREATE INDEX IF NOT EXISTS idx_build_comments_parent ON build_comments(parent_id);
CREATE INDEX IF NOT EXISTS idx_build_comments_author ON build_comments(author_id);
