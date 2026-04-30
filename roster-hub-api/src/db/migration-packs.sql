-- Pack Hub: user-created addon packs
-- Run: wrangler d1 execute roster-hub-db --file=src/db/migration-packs.sql

CREATE TABLE IF NOT EXISTS packs (
  id           TEXT PRIMARY KEY,
  author_id    TEXT NOT NULL,
  author_name  TEXT NOT NULL,
  is_anonymous INTEGER NOT NULL DEFAULT 0,
  title        TEXT NOT NULL,
  description  TEXT NOT NULL DEFAULT '',
  pack_type    TEXT NOT NULL DEFAULT 'addon-pack',
  addons       TEXT NOT NULL DEFAULT '[]',
  vote_count   INTEGER NOT NULL DEFAULT 0,
  created_at   TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at   TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS pack_tags (
  pack_id TEXT NOT NULL REFERENCES packs(id) ON DELETE CASCADE,
  tag     TEXT NOT NULL,
  PRIMARY KEY (pack_id, tag)
);

CREATE TABLE IF NOT EXISTS pack_votes (
  pack_id    TEXT NOT NULL REFERENCES packs(id) ON DELETE CASCADE,
  user_id    TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  PRIMARY KEY (pack_id, user_id)
);

-- Indexes for common queries
CREATE INDEX IF NOT EXISTS idx_packs_author   ON packs(author_id);
CREATE INDEX IF NOT EXISTS idx_packs_votes    ON packs(vote_count DESC);
CREATE INDEX IF NOT EXISTS idx_packs_created  ON packs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_packs_type     ON packs(pack_type);
CREATE INDEX IF NOT EXISTS idx_pack_tags_tag  ON pack_tags(tag);
CREATE INDEX IF NOT EXISTS idx_pack_votes_user ON pack_votes(user_id);
