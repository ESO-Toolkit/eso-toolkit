-- Migration: Discord integration — guild configs + user Discord linking
-- Run: wrangler d1 execute roster-hub-db --file=src/db/migration-discord.sql

-- ── Guild configs: stores bot installation + admin settings per server ──────

CREATE TABLE IF NOT EXISTS guild_configs (
  guild_id          TEXT PRIMARY KEY,
  guild_name        TEXT NOT NULL DEFAULT '',
  guild_icon        TEXT,                              -- Discord CDN hash
  roster_channel_id TEXT NOT NULL,                     -- channel where rosters post
  allowed_role_ids  TEXT NOT NULL DEFAULT '[]',         -- JSON array of role IDs
  configured_by     TEXT NOT NULL,                     -- Discord user ID of admin
  created_at        TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at        TEXT NOT NULL DEFAULT (datetime('now'))
);

-- ── Extend user_profiles with Discord identity ─────────────────────────────

ALTER TABLE user_profiles ADD COLUMN discord_id TEXT;
ALTER TABLE user_profiles ADD COLUMN discord_username TEXT;
ALTER TABLE user_profiles ADD COLUMN discord_avatar TEXT;
ALTER TABLE user_profiles ADD COLUMN discord_linked_at TEXT;

CREATE INDEX IF NOT EXISTS idx_user_profiles_discord ON user_profiles(discord_id);
