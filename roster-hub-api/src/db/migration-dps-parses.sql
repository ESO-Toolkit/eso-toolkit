-- Top DPS parses ingested from ESO Logs `characterRankings`
-- Run: wrangler d1 execute roster-hub-db --remote --file=src/db/migration-dps-parses.sql

-- One row per character per (encounter, difficulty): their best current-meta parse.
--
-- Storage is hybrid on purpose: scalar columns for everything filtered or sorted
-- on, plus JSON for the multi-valued parts. No child tables — neither query
-- pattern (by encounter, or by class across encounters) needs to search *inside* a
-- build, so normalizing sets/abilities would add ~20 write rows per parse for zero
-- read benefit.
--
-- The JSON is stored uncompressed, unlike rosters.roster_data. That column is
-- deflate+base64 because a roster has to fit in a URL; there is no such constraint
-- here, and inflating 200 rows on every cache miss would spend Worker CPU (scarce,
-- metered) to save database bytes (abundant).
CREATE TABLE IF NOT EXISTS dps_parses (
  -- Encounter context.
  encounter_id     INTEGER NOT NULL,
  -- -1 means "API default difficulty". NEVER NULL: SQLite treats NULLs as distinct
  -- in a PRIMARY KEY, which would silently defeat the dedupe below.
  difficulty       INTEGER NOT NULL DEFAULT -1,
  zone_id          INTEGER NOT NULL DEFAULT 0,
  trial_id         TEXT    NOT NULL DEFAULT '',
  encounter_name   TEXT    NOT NULL DEFAULT '',
  hard_mode_level  INTEGER,
  partition        INTEGER NOT NULL DEFAULT -1,

  -- Identity. character_key = sha256(lower(name)|region)[0..15]; dedupe ALWAYS
  -- keys on this, so character_name can be blanked without breaking ingest.
  character_key    TEXT    NOT NULL,
  character_name   TEXT,
  eso_class        TEXT    NOT NULL DEFAULT '',
  spec_name        TEXT    NOT NULL DEFAULT '',
  -- Not returned by characterRankings; reserved for the R2 evidence enrichment pass.
  race             TEXT,
  server_region    TEXT,
  server_name      TEXT,
  guild_name       TEXT,

  -- Parse facts.
  report_code      TEXT    NOT NULL,
  fight_id         INTEGER NOT NULL,
  rank             INTEGER,
  amount           REAL    NOT NULL,
  duration_ms      INTEGER,
  log_start_ms     INTEGER,
  log_date         TEXT,
  bracket_data     INTEGER,

  -- Denormalized headline build slots, for facet queries without opening the JSON.
  set1_id          INTEGER,
  set2_id          INTEGER,
  monster_id       INTEGER,
  mythic_id        INTEGER,
  arena_set_id     INTEGER,
  -- Always NULL in v1: characterRankings returns no mundus or food.
  mundus_id        INTEGER,
  food_ability_id  INTEGER,
  signature_hash   TEXT    NOT NULL,

  -- BuildSignatureV1 — canonical, compact, served in list responses.
  build_json       TEXT    NOT NULL,
  -- Raw gear + talents, served ONLY by the detail route. Feeds playerToBuild() so
  -- "open this archetype in the Build Editor" reuses the existing converter.
  combatant_json   TEXT,

  signature_version INTEGER NOT NULL DEFAULT 1,
  evidence_enriched INTEGER NOT NULL DEFAULT 0,
  ingested_at       TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at        TEXT NOT NULL DEFAULT (datetime('now')),

  -- A composite natural key rather than the `id TEXT PRIMARY KEY` used by
  -- rosters/builds/packs: these rows are machine-generated and never
  -- user-addressable, and a natural key gives the upsert a single ON CONFLICT
  -- target. `partition` is deliberately NOT part of the key — including it would
  -- retain every patch's parses, and "top builds" means current meta.
  PRIMARY KEY (encounter_id, difficulty, character_key)
);

-- Per-encounter leaderboard page.
CREATE INDEX IF NOT EXISTS idx_dps_parses_encounter
  ON dps_parses (encounter_id, difficulty, amount DESC);

-- Per-class overview across all encounters.
CREATE INDEX IF NOT EXISTS idx_dps_parses_class
  ON dps_parses (eso_class, amount DESC);

-- Class drilldown within one encounter.
CREATE INDEX IF NOT EXISTS idx_dps_parses_class_enc
  ON dps_parses (eso_class, encounter_id, difficulty, amount DESC);

-- "Show everyone running this exact build".
CREATE INDEX IF NOT EXISTS idx_dps_parses_signature
  ON dps_parses (signature_hash, encounter_id);

-- Age-based pruning.
CREATE INDEX IF NOT EXISTS idx_dps_parses_updated
  ON dps_parses (updated_at);

-- Takedown list, checked before insert.
CREATE TABLE IF NOT EXISTS dps_parse_blocklist (
  character_key TEXT PRIMARY KEY,
  created_at    TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Cursor so a cron run can resume where the last one stopped, and so a persistently
-- empty encounter is visible rather than silently skipped.
CREATE TABLE IF NOT EXISTS dps_parse_sync_state (
  encounter_id   INTEGER NOT NULL,
  difficulty     INTEGER NOT NULL DEFAULT -1,
  encounter_name TEXT    NOT NULL DEFAULT '',
  zone_id        INTEGER NOT NULL DEFAULT 0,
  last_page      INTEGER NOT NULL DEFAULT 0,
  last_partition INTEGER,
  last_synced_at TEXT,
  last_status    TEXT    NOT NULL DEFAULT '',
  last_error     TEXT    NOT NULL DEFAULT '',
  rows_ingested  INTEGER NOT NULL DEFAULT 0,
  empty_streak   INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (encounter_id, difficulty)
);

CREATE INDEX IF NOT EXISTS idx_dps_sync_state_stale
  ON dps_parse_sync_state (last_synced_at);
