-- Migration: Add roster_trials table for multi-trial roster tagging
-- Run: wrangler d1 execute roster-hub-db --remote --file=src/db/migration-roster-trials.sql

-- A roster can be tagged with several trials so it surfaces under each in the
-- Hub. The primary trial remains on rosters.trial_id; this table holds the full
-- set (including the primary). Existing rosters keep working via trial_id until
-- they are re-published.
CREATE TABLE IF NOT EXISTS roster_trials (
  roster_id TEXT NOT NULL REFERENCES rosters(id) ON DELETE CASCADE,
  trial_id  TEXT NOT NULL,
  PRIMARY KEY (roster_id, trial_id)
);

CREATE INDEX IF NOT EXISTS idx_roster_trials ON roster_trials(trial_id);

-- Backfill: seed each existing roster's primary trial into the join table so
-- filtering is consistent across old and new rosters.
INSERT OR IGNORE INTO roster_trials (roster_id, trial_id)
SELECT id, trial_id FROM rosters WHERE trial_id IS NOT NULL AND trial_id <> '';
