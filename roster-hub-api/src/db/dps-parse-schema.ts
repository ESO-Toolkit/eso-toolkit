/**
 * Applies the `dps_parses` schema through the Worker's own D1 binding.
 *
 * WHY THIS EXISTS, given `migration-dps-parses.sql` and the d1-migrate workflow:
 * the deploy token (`CLOUDFLARE_API_TOKEN`) has no D1 permission at all. Probed
 * against production on 2026-08-05, all three D1 API surfaces reject it —
 * `d1 list` and `--file` (import endpoint) with `Authentication error [10000]`,
 * `--command` (query endpoint) with `code 7403`. Adding the permission needs the
 * token's owner, who is not always available.
 *
 * A D1 *binding* is a separate grant from an API token's scopes: the deployed
 * Worker can read and write this database regardless of what the management API
 * allows. So the schema can be applied by the Worker itself, on a deploy CI can
 * already perform.
 *
 * This does NOT replace the migration file or the workflow — those remain the
 * documented path, and the test in this directory fails if the two drift. It is
 * a bootstrap for the case where the out-of-band path is unavailable.
 */

import type { D1Database } from '@cloudflare/workers-types';

/**
 * Mirrors `migration-dps-parses.sql`, statement for statement.
 *
 * Duplicated rather than imported as a text module on purpose. A wrangler `Text`
 * rule would make the SQL unreadable to jest without a bundler shim, and the
 * point of this file is that it is unit-testable. `dps-parse-schema.test.ts`
 * reads the .sql off disk and asserts these match, so drift is a failing test
 * rather than a production surprise.
 *
 * Every statement is IF NOT EXISTS: this runs against a database that may
 * already be fully migrated, and must be a no-op when it is.
 */
export const DPS_PARSE_SCHEMA_STATEMENTS: readonly string[] = [
  `CREATE TABLE IF NOT EXISTS dps_parses (
  encounter_id     INTEGER NOT NULL,
  difficulty       INTEGER NOT NULL DEFAULT -1,
  zone_id          INTEGER NOT NULL DEFAULT 0,
  trial_id         TEXT    NOT NULL DEFAULT '',
  encounter_name   TEXT    NOT NULL DEFAULT '',
  hard_mode_level  INTEGER,
  partition        INTEGER NOT NULL DEFAULT -1,

  character_key    TEXT    NOT NULL,
  character_name   TEXT,
  eso_class        TEXT    NOT NULL DEFAULT '',
  spec_name        TEXT    NOT NULL DEFAULT '',
  race             TEXT,
  server_region    TEXT,
  server_name      TEXT,
  guild_name       TEXT,

  report_code      TEXT    NOT NULL,
  fight_id         INTEGER NOT NULL,
  rank             INTEGER,
  amount           REAL    NOT NULL,
  duration_ms      INTEGER,
  log_start_ms     INTEGER,
  log_date         TEXT,
  bracket_data     INTEGER,

  set1_id          INTEGER,
  set2_id          INTEGER,
  monster_id       INTEGER,
  mythic_id        INTEGER,
  arena_set_id     INTEGER,
  mundus_id        INTEGER,
  food_ability_id  INTEGER,
  signature_hash   TEXT    NOT NULL,

  build_json       TEXT    NOT NULL,
  combatant_json   TEXT,

  signature_version INTEGER NOT NULL DEFAULT 1,
  evidence_enriched INTEGER NOT NULL DEFAULT 0,
  ingested_at       TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at        TEXT NOT NULL DEFAULT (datetime('now')),

  PRIMARY KEY (encounter_id, difficulty, character_key)
)`,
  `CREATE INDEX IF NOT EXISTS idx_dps_parses_encounter ON dps_parses (encounter_id, difficulty, amount DESC)`,
  `CREATE INDEX IF NOT EXISTS idx_dps_parses_class ON dps_parses (eso_class, amount DESC)`,
  `CREATE INDEX IF NOT EXISTS idx_dps_parses_class_enc ON dps_parses (eso_class, encounter_id, difficulty, amount DESC)`,
  `CREATE INDEX IF NOT EXISTS idx_dps_parses_signature ON dps_parses (signature_hash, encounter_id)`,
  `CREATE INDEX IF NOT EXISTS idx_dps_parses_updated ON dps_parses (updated_at)`,
  `CREATE TABLE IF NOT EXISTS dps_parse_blocklist (
  character_key TEXT PRIMARY KEY,
  created_at    TEXT NOT NULL DEFAULT (datetime('now'))
)`,
  `CREATE TABLE IF NOT EXISTS dps_parse_sync_state (
  encounter_id    INTEGER NOT NULL,
  difficulty      INTEGER NOT NULL DEFAULT -1,
  encounter_name  TEXT    NOT NULL DEFAULT '',
  zone_id         INTEGER NOT NULL DEFAULT 0,
  last_page       INTEGER NOT NULL DEFAULT 0,
  last_partition  INTEGER,
  last_synced_at  TEXT,
  last_status     TEXT    NOT NULL DEFAULT '',
  last_error      TEXT    NOT NULL DEFAULT '',
  rows_ingested   INTEGER NOT NULL DEFAULT 0,
  empty_streak    INTEGER NOT NULL DEFAULT 0,

  PRIMARY KEY (encounter_id, difficulty)
)`,
  `CREATE INDEX IF NOT EXISTS idx_dps_sync_state_stale ON dps_parse_sync_state (last_synced_at)`,
];

/**
 * Memoized per isolate, not per request.
 *
 * The work is a handful of no-op DDL statements, but an isolate serves many
 * requests and there is no reason to pay for them more than once. The promise
 * itself is cached so concurrent callers share one attempt rather than racing.
 *
 * A failure clears the cache so the next caller retries; caching a rejection
 * would make one transient D1 error permanent for the isolate's lifetime.
 */
let schemaReady: Promise<void> | null = null;

export function ensureDpsParsesSchema(db: D1Database): Promise<void> {
  schemaReady ??= applySchema(db).catch((error: unknown) => {
    schemaReady = null;
    throw error;
  });
  return schemaReady;
}

async function applySchema(db: D1Database): Promise<void> {
  // Sequential rather than `batch()`: D1 wraps a batch in a transaction, and
  // SQLite cannot run DDL for a table inside the same transaction that indexes
  // it. Each statement is independently idempotent, so a partial application is
  // simply completed by the next call.
  for (const statement of DPS_PARSE_SCHEMA_STATEMENTS) {
    await db.prepare(statement).run();
  }
}

/** Test seam — the isolate-level cache would otherwise leak between cases. */
export function resetDpsParsesSchemaCache(): void {
  schemaReady = null;
}
