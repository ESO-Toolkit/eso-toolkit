-- Migration: add content_fingerprint to user_loadouts (equal-timestamp tie-break)
-- Run: wrangler d1 execute roster-hub-db --remote --file=src/db/migration-loadouts-fingerprint.sql
--
-- A client-computed content hash (fixed-width lowercase hex). On a bulk /loadouts/sync
-- upsert, an exact client_updated_at collision is now settled DETERMINISTICALLY by the
-- greater content_fingerprint (see upsertUserLoadouts) so the server picks the SAME
-- winner the client merge does (mergeLoadoutsByNewest/selectOutgoing) instead of by
-- arrival order. Existing rows default to '' (which sorts oldest, so a legacy row loses
-- any real tie until a client that sends a fingerprint rewrites it).
ALTER TABLE user_loadouts ADD COLUMN content_fingerprint TEXT NOT NULL DEFAULT '';
