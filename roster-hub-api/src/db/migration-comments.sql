-- Migration: Add roster_comments table
-- Run: wrangler d1 execute roster-hub-db --remote --file=src/db/migration-comments.sql

CREATE TABLE IF NOT EXISTS roster_comments (
  id          TEXT PRIMARY KEY,
  roster_id   TEXT NOT NULL REFERENCES rosters(id) ON DELETE CASCADE,
  parent_id   TEXT,
  author_id   TEXT NOT NULL,
  author_name TEXT NOT NULL,
  body        TEXT NOT NULL,
  created_at  TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (parent_id) REFERENCES roster_comments(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_comments_roster ON roster_comments(roster_id, created_at);
CREATE INDEX IF NOT EXISTS idx_comments_parent ON roster_comments(parent_id);
CREATE INDEX IF NOT EXISTS idx_comments_author ON roster_comments(author_id);
