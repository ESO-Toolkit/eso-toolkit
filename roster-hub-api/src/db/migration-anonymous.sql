-- Migration: Add is_anonymous column to rosters
-- Run: wrangler d1 execute roster-hub-db --file=src/db/migration-anonymous.sql
-- Remote: wrangler d1 execute roster-hub-db --file=src/db/migration-anonymous.sql --remote

ALTER TABLE rosters ADD COLUMN is_anonymous INTEGER NOT NULL DEFAULT 0;
