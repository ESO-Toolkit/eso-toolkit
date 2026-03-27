-- Migration: Fix user_profiles collation + add author_name indexes
-- Fixes COLLATE NOCASE not being used by SQLite index lookups.
-- Run: wrangler d1 execute roster-hub-db --remote --file=src/db/migration-profiles-fix.sql

-- Recreate user_profiles with COLLATE NOCASE on the column so that any index
-- on author_name automatically inherits the collation, enabling index scans for
-- case-insensitive lookups (WHERE author_name = ? COLLATE NOCASE).
DROP TABLE IF EXISTS user_profiles;
CREATE TABLE IF NOT EXISTS user_profiles (
  author_id   TEXT PRIMARY KEY,
  author_name TEXT NOT NULL COLLATE NOCASE,
  bio         TEXT NOT NULL DEFAULT '',
  updated_at  TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_user_profiles_name ON user_profiles(author_name);

-- Add author_name indexes to builds and rosters so that the profile queries
-- (WHERE author_name = ? ... AND is_anonymous = 0) can use an index instead of
-- doing a full table scan.
CREATE INDEX IF NOT EXISTS idx_builds_author_name  ON builds(author_name);
CREATE INDEX IF NOT EXISTS idx_rosters_author_name ON rosters(author_name);
