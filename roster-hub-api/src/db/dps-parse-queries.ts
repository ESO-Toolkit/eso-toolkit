/**
 * Queries for the DPS-parse leaderboard.
 *
 * A sibling module rather than another section of queries.ts, which is already
 * ~1650 lines. Follows the same conventions: exported async functions taking
 * `db` first, a conditions/bindings array for filtered lists, and row types from
 * ../types.
 */

import type {
  DpsEncounterSummary,
  DpsParsePublic,
  DpsParseRow,
  DpsParseSyncStateRow,
} from '../types';

/** Hard ceiling on a single page of parses, regardless of what the caller asks. */
export const MAX_PARSE_LIMIT = 200;
export const DEFAULT_PARSE_LIMIT = 100;
/** Bounds how deep a client can page, so no request can scan the whole table. */
export const MAX_PARSE_OFFSET = 1000;

/**
 * Master switch for storing character names.
 *
 * These names are already public on esologs.com's own leaderboards, and the
 * click-through is the credibility affordance. Dedupe always keys on the
 * pseudonymous `character_key`, so flipping this off degrades display only and
 * never breaks ingest. Account handles (`displayName`, "@Foo") are never stored
 * regardless.
 */
export const INCLUDE_CHARACTER_NAMES = true;

/**
 * Stable public identifier for a parse.
 *
 * Derived from the composite primary key rather than a random id, so it survives
 * re-ingest: `character_key` is a hash of name+region, and the encounter and
 * difficulty are fixed. That keeps frontend deep links from rotting nightly.
 */
export function toParseId(
  row: Pick<DpsParseRow, 'encounter_id' | 'difficulty' | 'character_key'>,
): string {
  return `${row.encounter_id}-${row.difficulty}-${row.character_key}`;
}

export function parseParseId(
  parseId: string,
): { encounterId: number; difficulty: number; characterKey: string } | null {
  const match = /^(-?\d+)-(-?\d+)-([0-9a-f]+)$/.exec(parseId);
  if (!match) return null;
  return {
    encounterId: Number(match[1]),
    difficulty: Number(match[2]),
    characterKey: match[3],
  };
}

// ─── Read ────────────────────────────────────────────────────────────────────

function toPublic(row: DpsParseRow): DpsParsePublic {
  const {
    build_json,
    combatant_json: _combatant,
    character_key: _key,
    character_name,
    signature_version: _version,
    evidence_enriched: _enriched,
    ...rest
  } = row;

  let build: unknown = null;
  try {
    build = JSON.parse(build_json);
  } catch {
    // A row with a corrupt signature is still rankable; serve it without a build
    // rather than failing the whole page.
    build = null;
  }

  return {
    ...rest,
    // The client needs an addressable id for the detail route, but must not see
    // the raw dedupe key; the composite id embeds it opaquely.
    parse_id: toParseId(row),
    build,
    character_label: (INCLUDE_CHARACTER_NAMES && character_name) || 'Anonymous',
    source_url: `https://www.esologs.com/reports/${row.report_code}#fight=${row.fight_id}`,
  };
}

export interface ListDpsParsesOptions {
  encounterId?: number;
  difficulty?: number;
  esoClass?: string;
  signatureHash?: string;
  limit?: number;
  offset?: number;
  sort?: 'amount' | 'recent';
}

/**
 * Serves both frontend tabs: the encounter view passes `encounterId`, the class
 * view passes `esoClass`.
 *
 * Callers MUST supply at least one of them — enforced at the route layer — so no
 * request can trigger an unbounded table scan.
 */
export async function listDpsParses(
  db: D1Database,
  opts: ListDpsParsesOptions,
): Promise<{ parses: DpsParsePublic[]; total: number; limit: number; offset: number }> {
  const limit = Math.min(Math.max(1, opts.limit ?? DEFAULT_PARSE_LIMIT), MAX_PARSE_LIMIT);
  const offset = Math.min(Math.max(0, opts.offset ?? 0), MAX_PARSE_OFFSET);

  const conditions: string[] = [];
  const bindings: (string | number)[] = [];

  if (opts.encounterId !== undefined) {
    conditions.push('encounter_id = ?');
    bindings.push(opts.encounterId);
    // Difficulty only narrows an encounter; on its own it is meaningless.
    if (opts.difficulty !== undefined) {
      conditions.push('difficulty = ?');
      bindings.push(opts.difficulty);
    }
  }
  if (opts.esoClass) {
    conditions.push('eso_class = ?');
    bindings.push(opts.esoClass);
  }
  if (opts.signatureHash) {
    conditions.push('signature_hash = ?');
    bindings.push(opts.signatureHash);
  }

  const where = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
  const orderBy = opts.sort === 'recent' ? 'updated_at DESC, amount DESC' : 'amount DESC';

  const [rows, countRow] = await Promise.all([
    db
      .prepare(`SELECT * FROM dps_parses ${where} ORDER BY ${orderBy} LIMIT ? OFFSET ?`)
      .bind(...bindings, limit, offset)
      .all<DpsParseRow>(),
    db
      .prepare(`SELECT COUNT(*) AS total FROM dps_parses ${where}`)
      .bind(...bindings)
      .first<{ total: number }>(),
  ]);

  return {
    parses: rows.results.map(toPublic),
    total: countRow?.total ?? 0,
    limit,
    offset,
  };
}

/** Raw gear + talents for one parse, for the Build Editor handoff. */
export async function getDpsParseCombatant(
  db: D1Database,
  parseId: string,
): Promise<{ parseId: string; playerName: string; combatant: unknown } | null> {
  const key = parseParseId(parseId);
  if (!key) return null;

  const row = await db
    .prepare(
      `SELECT character_name, combatant_json FROM dps_parses
        WHERE encounter_id = ? AND difficulty = ? AND character_key = ?`,
    )
    .bind(key.encounterId, key.difficulty, key.characterKey)
    .first<Pick<DpsParseRow, 'character_name' | 'combatant_json'>>();

  if (!row?.combatant_json) return null;

  try {
    return {
      parseId,
      playerName: (INCLUDE_CHARACTER_NAMES && row.character_name) || 'Anonymous',
      combatant: JSON.parse(row.combatant_json),
    };
  } catch {
    return null;
  }
}

/** Picker feed: which encounters have data, and how much. */
export async function listDpsEncounters(db: D1Database): Promise<DpsEncounterSummary[]> {
  const rows = await db
    .prepare(
      `SELECT encounter_id, difficulty,
              MAX(encounter_name) AS encounter_name,
              MAX(zone_id)        AS zone_id,
              MAX(trial_id)       AS trial_id,
              COUNT(*)            AS parse_count,
              MAX(amount)         AS top_amount,
              COUNT(DISTINCT eso_class) AS class_count,
              MAX(updated_at)     AS updated_at
         FROM dps_parses
        GROUP BY encounter_id, difficulty
        ORDER BY zone_id DESC, encounter_id ASC`,
    )
    .all<DpsEncounterSummary>();

  return rows.results;
}

// ─── Write ───────────────────────────────────────────────────────────────────

/**
 * D1 caps bound parameters per statement, so a multi-row VALUES insert is not
 * viable at ~40 columns. One prepared statement per row, chunked into batches;
 * `db.batch()` is a single round trip and does not consume subrequests.
 */
const BATCH_SIZE = 25;

const UPSERT_SQL = `
INSERT INTO dps_parses (
  encounter_id, difficulty, zone_id, trial_id, encounter_name, hard_mode_level, partition,
  character_key, character_name, eso_class, spec_name, race, server_region, server_name, guild_name,
  report_code, fight_id, rank, amount, duration_ms, log_start_ms, log_date, bracket_data,
  set1_id, set2_id, monster_id, mythic_id, arena_set_id, mundus_id, food_ability_id, signature_hash,
  build_json, combatant_json, signature_version, updated_at
) VALUES (
  ?, ?, ?, ?, ?, ?, ?,
  ?, ?, ?, ?, ?, ?, ?, ?,
  ?, ?, ?, ?, ?, ?, ?, ?,
  ?, ?, ?, ?, ?, ?, ?, ?,
  ?, ?, ?, datetime('now')
)
ON CONFLICT (encounter_id, difficulty, character_key) DO UPDATE SET
  zone_id = excluded.zone_id,
  trial_id = excluded.trial_id,
  encounter_name = excluded.encounter_name,
  hard_mode_level = excluded.hard_mode_level,
  partition = excluded.partition,
  character_name = excluded.character_name,
  eso_class = excluded.eso_class,
  spec_name = excluded.spec_name,
  server_region = excluded.server_region,
  server_name = excluded.server_name,
  guild_name = excluded.guild_name,
  report_code = excluded.report_code,
  fight_id = excluded.fight_id,
  rank = excluded.rank,
  amount = excluded.amount,
  duration_ms = excluded.duration_ms,
  log_start_ms = excluded.log_start_ms,
  log_date = excluded.log_date,
  bracket_data = excluded.bracket_data,
  set1_id = excluded.set1_id,
  set2_id = excluded.set2_id,
  monster_id = excluded.monster_id,
  mythic_id = excluded.mythic_id,
  arena_set_id = excluded.arena_set_id,
  signature_hash = excluded.signature_hash,
  build_json = excluded.build_json,
  combatant_json = excluded.combatant_json,
  signature_version = excluded.signature_version,
  updated_at = datetime('now')
-- Rewrite when the parse improved, when a newer patch supersedes it, OR when the
-- signature format has moved on. Without that last clause a signature change
-- (a new field, a fixed categorisation) never reaches rows already stored: the
-- re-ingest sees identical data, the amount is not greater, and nothing updates.
WHERE excluded.signature_version > dps_parses.signature_version
   OR excluded.partition > dps_parses.partition
   OR (excluded.partition = dps_parses.partition AND excluded.amount > dps_parses.amount)`;

export type DpsParseInsert = Omit<DpsParseRow, 'ingested_at' | 'updated_at' | 'evidence_enriched'>;

/**
 * Insert-or-improve a batch of parses.
 *
 * The ON CONFLICT guard resolves all three collisions with one statement:
 *  - a re-run over identical data writes nothing (idempotent),
 *  - a character re-parsing keeps whichever attempt scored higher,
 *  - a newer partition always wins, even at LOWER dps, so the table tracks the
 *    current patch's meta instead of pinning a record from a prior balance state.
 */
export async function upsertDpsParses(db: D1Database, rows: DpsParseInsert[]): Promise<number> {
  if (rows.length === 0) return 0;

  const statements = rows.map((row) =>
    db
      .prepare(UPSERT_SQL)
      .bind(
        row.encounter_id,
        row.difficulty,
        row.zone_id,
        row.trial_id,
        row.encounter_name,
        row.hard_mode_level,
        row.partition,
        row.character_key,
        INCLUDE_CHARACTER_NAMES ? row.character_name : null,
        row.eso_class,
        row.spec_name,
        row.race,
        row.server_region,
        row.server_name,
        row.guild_name,
        row.report_code,
        row.fight_id,
        row.rank,
        row.amount,
        row.duration_ms,
        row.log_start_ms,
        row.log_date,
        row.bracket_data,
        row.set1_id,
        row.set2_id,
        row.monster_id,
        row.mythic_id,
        row.arena_set_id,
        row.mundus_id,
        row.food_ability_id,
        row.signature_hash,
        row.build_json,
        row.combatant_json,
        row.signature_version,
      ),
  );

  for (let i = 0; i < statements.length; i += BATCH_SIZE) {
    await db.batch(statements.slice(i, i + BATCH_SIZE));
  }

  return rows.length;
}

/** Characters who have asked not to appear. Checked before insert. */
export async function getBlockedCharacterKeys(db: D1Database): Promise<Set<string>> {
  const rows = await db
    .prepare('SELECT character_key FROM dps_parse_blocklist')
    .all<{ character_key: string }>();
  return new Set(rows.results.map((r) => r.character_key));
}

/**
 * Trim an encounter back to its top N and drop long-stale rows.
 *
 * Written without window functions: the cut-off is read as a single value via
 * LIMIT/OFFSET, which SQLite handles with the existing index.
 */
export async function pruneDpsParses(
  db: D1Database,
  encounterId: number,
  difficulty: number,
  keepTop: number,
  staleDays = 60,
): Promise<void> {
  await db.batch([
    db
      .prepare(
        `DELETE FROM dps_parses
          WHERE encounter_id = ?1 AND difficulty = ?2
            AND amount < COALESCE(
              (SELECT amount FROM dps_parses
                WHERE encounter_id = ?1 AND difficulty = ?2
                ORDER BY amount DESC LIMIT 1 OFFSET ?3), -1)`,
      )
      .bind(encounterId, difficulty, keepTop),
    db
      .prepare(`DELETE FROM dps_parses WHERE updated_at < datetime('now', ?)`)
      .bind(`-${staleDays} days`),
  ]);
}

// ─── Sync cursor ─────────────────────────────────────────────────────────────

/** Stalest targets first; never-synced ones ahead of everything else. */
export async function listStaleSyncTargets(
  db: D1Database,
  limit: number,
): Promise<DpsParseSyncStateRow[]> {
  const rows = await db
    .prepare(
      `SELECT * FROM dps_parse_sync_state
        ORDER BY last_synced_at IS NOT NULL, last_synced_at ASC
        LIMIT ?`,
    )
    .bind(limit)
    .all<DpsParseSyncStateRow>();
  return rows.results;
}

export async function recordSyncResult(
  db: D1Database,
  state: {
    encounterId: number;
    difficulty: number;
    encounterName: string;
    zoneId: number;
    lastPage: number;
    status: string;
    error: string;
    rowsIngested: number;
    /** Reset to 0 on a productive run; incremented when a target yields nothing. */
    emptyStreak: number;
  },
): Promise<void> {
  await db
    .prepare(
      `INSERT INTO dps_parse_sync_state (
         encounter_id, difficulty, encounter_name, zone_id,
         last_page, last_synced_at, last_status, last_error, rows_ingested, empty_streak
       ) VALUES (?, ?, ?, ?, ?, datetime('now'), ?, ?, ?, ?)
       ON CONFLICT (encounter_id, difficulty) DO UPDATE SET
         encounter_name = excluded.encounter_name,
         zone_id        = excluded.zone_id,
         last_page      = excluded.last_page,
         last_synced_at = excluded.last_synced_at,
         last_status    = excluded.last_status,
         last_error     = excluded.last_error,
         rows_ingested  = excluded.rows_ingested,
         empty_streak   = excluded.empty_streak`,
    )
    .bind(
      state.encounterId,
      state.difficulty,
      state.encounterName,
      state.zoneId,
      state.lastPage,
      state.status,
      state.error,
      state.rowsIngested,
      state.emptyStreak,
    )
    .run();
}

export async function getSyncState(
  db: D1Database,
  encounterId: number,
  difficulty: number,
): Promise<DpsParseSyncStateRow | null> {
  return db
    .prepare('SELECT * FROM dps_parse_sync_state WHERE encounter_id = ? AND difficulty = ?')
    .bind(encounterId, difficulty)
    .first<DpsParseSyncStateRow>();
}
