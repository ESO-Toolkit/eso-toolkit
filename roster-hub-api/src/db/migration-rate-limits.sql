-- Append-only rate limit events table.
-- Unlike domain tables (roster_votes, image_uploads, etc.), rows here are
-- never deleted by user actions — only pruned by age. This prevents the
-- vote/unvote and upload/delete reset attacks on rate-limit windows.

CREATE TABLE IF NOT EXISTS rate_limit_events (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id    TEXT NOT NULL,
  action     TEXT NOT NULL,  -- e.g. 'roster_vote', 'build_vote', 'pack_vote', 'image_upload'
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_rle_user_action
  ON rate_limit_events (user_id, action, created_at);
