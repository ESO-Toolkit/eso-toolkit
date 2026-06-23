-- Migration: Per-user saved loadouts (account-synced loadout library)
-- Run: wrangler d1 execute roster-hub-db --remote --file=src/db/migration-loadouts.sql
--
-- These are PRIVATE, per-user records — the cloud counterpart of the browser's
-- localStorage loadout library. There is no public list, no voting, no comments
-- and no visibility tier: a row is only ever readable/writable by its owner
-- (WHERE user_id = ?). The row id is the client-generated loadout uuid so a
-- local library can be pushed up idempotently (upsert by id).

CREATE TABLE IF NOT EXISTS user_loadouts (
  id             TEXT PRIMARY KEY,             -- client loadout uuid (stable across sync)
  user_id        TEXT NOT NULL,                -- owner (ESO Logs currentUser.id, as string)
  name           TEXT NOT NULL,
  description    TEXT NOT NULL DEFAULT '',
  trial_id       TEXT NOT NULL DEFAULT '',     -- light provenance (meta.trialId) for listing
  character_name TEXT NOT NULL DEFAULT '',     -- light provenance (meta.characterName)
  -- Canonical SavedLoadout payload as compact JSON ({ setup, meta, ... }).
  -- A single fully-populated setup is ~2-3 KB of JSON, far under D1's 2 MB
  -- per-row ceiling; the worker caps it at 20 KB to leave generous headroom.
  loadout_data   TEXT NOT NULL,
  -- Client-authored ISO timestamp of the loadout's last edit (the SavedLoadout's
  -- own updatedAt). Used for optimistic-concurrency / last-write-wins on bulk
  -- sync so a stale device can't clobber a newer edit made on another device.
  client_updated_at TEXT NOT NULL DEFAULT '',
  created_at     TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at     TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Owners list their own library newest-first; this covers both the WHERE and
-- the ORDER BY of the only hot query.
CREATE INDEX IF NOT EXISTS idx_user_loadouts_user ON user_loadouts(user_id, updated_at DESC);
