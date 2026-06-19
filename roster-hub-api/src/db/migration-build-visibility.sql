-- Migration: Add visibility column to builds
-- Run: wrangler d1 execute roster-hub-db --remote --file=src/db/migration-build-visibility.sql
--
-- IMPORTANT — this DEFAULT 'public' backfills EVERY existing row as public, but
-- builds encoded before the server column existed may already carry
-- private / link-only inside build_data (the `vs` field). Run the backfill
-- IMMEDIATELY AFTER this migration and BEFORE the new visibility checks go live,
-- so pre-existing private/link-only builds are not exposed as public:
--   wrangler d1 execute roster-hub-db --remote --json \
--     --command "SELECT id, build_data FROM builds" > builds-export.json
--   node src/db/backfill-visibility.mjs builds-export.json > src/db/backfill-visibility.sql
--   wrangler d1 execute roster-hub-db --remote --file=src/db/backfill-visibility.sql

ALTER TABLE builds ADD COLUMN visibility TEXT NOT NULL DEFAULT 'public';

CREATE INDEX IF NOT EXISTS idx_builds_visibility ON builds(visibility);
