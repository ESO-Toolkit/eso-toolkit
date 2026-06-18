-- Migration: Add visibility column to builds
-- Run: wrangler d1 execute roster-hub-db --remote --file=src/db/migration-build-visibility.sql

ALTER TABLE builds ADD COLUMN visibility TEXT NOT NULL DEFAULT 'public';

CREATE INDEX IF NOT EXISTS idx_builds_visibility ON builds(visibility);
