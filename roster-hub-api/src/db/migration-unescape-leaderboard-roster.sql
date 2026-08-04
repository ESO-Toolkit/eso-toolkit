-- ONE-SHOT backfill: un-HTML-escape auto-imported leaderboard roster text.
--
-- Companion to migration-unescape-author-name.sql / migration-unescape-content.sql.
-- The leaderboard sync encoder (leaderboard-sync/roster-encoder.ts) previously ran
-- escapeHtml() on the roster title and description (buildRosterTitle /
-- buildRosterDescription), so a guild name with ' < > " & stored as literal entities
-- (e.g. "Spike&#x27;jo") and rendered as mojibake (React escapes again on output).
-- The encoder now stores these RAW via cleanText(); this repairs existing rows.
--
-- ⚠️ NOT IDEMPOTENT — run EXACTLY ONCE. Free-text can legitimately contain a literal
-- "&amp;" / "<", and re-running the decode would corrupt those. Scoped tightly to the
-- deterministic "Auto-imported #1 " description prefix emitted by buildRosterDescription
-- so only encoder-produced rows are touched. Decodes in reverse escape order (&amp; last).
--
-- SCOPE NOTE: player/guild names embedded INSIDE the compressed `roster_data` blob
-- (deflate-raw + base64url) cannot be repaired by SQL — the blob is opaque here. Those
-- names self-heal on the next scheduled leaderboard re-sync, now that the encoder emits
-- raw names. This migration only fixes the flat `title` / `description` columns.
--
-- Apply once, alongside the worker deploy:
--   wrangler d1 execute roster-hub-db --remote --file=src/db/migration-unescape-leaderboard-roster.sql

UPDATE rosters SET
  title = REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(title, '&#x27;', ''''), '&quot;', '"'), '&gt;', '>'), '&lt;', '<'), '&amp;', '&'),
  description = REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(description, '&#x27;', ''''), '&quot;', '"'), '&gt;', '>'), '&lt;', '<'), '&amp;', '&')
WHERE description LIKE 'Auto-imported #1 %'
  AND (title LIKE '%&%' OR description LIKE '%&%');
