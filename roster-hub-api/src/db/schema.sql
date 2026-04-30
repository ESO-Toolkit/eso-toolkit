-- Roster Hub D1 Schema
-- Run: wrangler d1 execute roster-hub-db --file=src/db/schema.sql

CREATE TABLE IF NOT EXISTS rosters (
  id           TEXT PRIMARY KEY,
  author_id    TEXT NOT NULL,
  author_name  TEXT NOT NULL,
  is_anonymous INTEGER NOT NULL DEFAULT 0,
  title        TEXT NOT NULL,
  description  TEXT NOT NULL DEFAULT '',
  trial_id     TEXT NOT NULL,
  roster_data  TEXT NOT NULL,
  vote_count   INTEGER NOT NULL DEFAULT 0,
  created_at   TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at   TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS roster_votes (
  roster_id  TEXT NOT NULL REFERENCES rosters(id) ON DELETE CASCADE,
  user_id    TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  PRIMARY KEY (roster_id, user_id)
);

CREATE TABLE IF NOT EXISTS roster_tags (
  roster_id TEXT NOT NULL REFERENCES rosters(id) ON DELETE CASCADE,
  tag       TEXT NOT NULL,
  PRIMARY KEY (roster_id, tag)
);

CREATE TABLE IF NOT EXISTS roster_comments (
  id          TEXT PRIMARY KEY,
  roster_id   TEXT NOT NULL REFERENCES rosters(id) ON DELETE CASCADE,
  parent_id   TEXT,
  author_id   TEXT NOT NULL,
  author_name TEXT NOT NULL,
  body        TEXT NOT NULL,
  created_at  TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (parent_id) REFERENCES roster_comments(id) ON DELETE CASCADE
);

-- Indexes for common query patterns
CREATE INDEX IF NOT EXISTS idx_rosters_trial    ON rosters(trial_id);
CREATE INDEX IF NOT EXISTS idx_rosters_votes    ON rosters(vote_count DESC);
CREATE INDEX IF NOT EXISTS idx_rosters_created  ON rosters(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_rosters_author   ON rosters(author_id);
CREATE INDEX IF NOT EXISTS idx_tags_tag         ON roster_tags(tag);
CREATE INDEX IF NOT EXISTS idx_votes_user       ON roster_votes(user_id);
CREATE INDEX IF NOT EXISTS idx_comments_roster  ON roster_comments(roster_id, created_at);
CREATE INDEX IF NOT EXISTS idx_comments_parent  ON roster_comments(parent_id);
CREATE INDEX IF NOT EXISTS idx_comments_author  ON roster_comments(author_id);
