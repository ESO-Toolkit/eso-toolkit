-- Migration: Add user profiles
-- Storage: ~80 bytes per user (bio text only — all content derived from existing tables)
-- Run: wrangler d1 execute roster-hub-db --remote --file=src/db/migration-profiles.sql

CREATE TABLE IF NOT EXISTS user_profiles (
  author_id   TEXT PRIMARY KEY,
  -- COLLATE NOCASE on the column so any index on this column inherits it,
  -- enabling index scans for case-insensitive WHERE author_name = ? lookups.
  author_name TEXT NOT NULL COLLATE NOCASE,
  bio         TEXT NOT NULL DEFAULT '',
  updated_at  TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Lookup by name (case-insensitive) for /users/:username endpoint
CREATE INDEX IF NOT EXISTS idx_user_profiles_name ON user_profiles(author_name);

-- author_name indexes on content tables for profile aggregation queries
CREATE INDEX IF NOT EXISTS idx_builds_author_name  ON builds(author_name);
CREATE INDEX IF NOT EXISTS idx_rosters_author_name ON rosters(author_name);
