/**
 * Cron ingest for the top-DPS-builds leaderboard.
 *
 * Pulls `characterRankings` per boss, extracts each parser's build, and upserts
 * into `dps_parses`.
 *
 * Fetches are scoped PER CLASS, not per page of a global board. A global top-N
 * is a winner-take-all list: on a Necromancer/Arcanist meta it left Dragonknight
 * with 5 rows and Sorcerer with 4 out of 201 — below the frontend's clustering
 * minimum, so those class views could never show a pattern no matter how many
 * pages we pulled. One board per class costs the same order of requests and
 * guarantees every class its own real top-N.
 *
 * Budget note: ESO Logs is NOT the binding constraint. Measured cost is ~1.1
 * points per page against a 9000/hour limit, so a full run spends well under 1%.
 * The real limits are Cloudflare's per-invocation subrequest cap and CPU time —
 * hence the page cap, the explicit subrequest counter, and the cursor that lets a
 * run stop early and resume where it left off.
 */

import {
  fetchCharacterRankings,
  fetchRateLimitData,
  fetchTrialZones,
  getClientToken,
} from './esologs-client';
import { buildDpsEncounterTargets, type DpsEncounterTarget } from './dps-encounter-targets';
import {
  hasRealCombatantInfo,
  isDpsSpec,
  parseCharacterRankingsPage,
  type ParsedCharacterRanking,
} from './character-rankings-parser';
import { SIGNATURE_VERSION, computeSignatureHash, extractBuildSignature } from './build-signature';
import {
  getBlockedCharacterKeys,
  getSyncState,
  listStaleSyncTargets,
  pruneDpsParses,
  purgeBlockedDpsParses,
  recordSyncResult,
  upsertDpsParses,
  type DpsParseInsert,
} from '../db/dps-parse-queries';
import type { Env } from '../types';

// ─── Budget ──────────────────────────────────────────────────────────────────

/**
 * Ceiling on outbound fetches per invocation.
 *
 * The account is on the Workers FREE plan (see wrangler.toml — it is why this
 * worker gets one cron slot), which caps a single invocation at 50 subrequests.
 * The previous 120 was written against paid-plan limits and could never fire,
 * so it guarded nothing. 45 leaves headroom for the morning pass, where the
 * roster sync shares this invocation's budget.
 */
const MAX_SUBREQUESTS_PER_RUN = 45;
/**
 * Classes fetched per boss, one ranking board each.
 *
 * These strings are ESO Logs' own `class` values — confirmed against the
 * `eso_class` column already populated from live ingest, not guessed.
 */
const CLASS_NAMES = [
  'Arcanist',
  'DragonKnight',
  'Necromancer',
  'Nightblade',
  'Sorcerer',
  'Templar',
  'Warden',
] as const;
/** Fetches one encounter costs at the default one page per class. */
const REQUESTS_PER_ENCOUNTER = CLASS_NAMES.length;
/**
 * Encounters per run, sized to fit MAX_SUBREQUESTS_PER_RUN after the three
 * fixed preflight fetches (token, rate limit, zones). The cron fires four times
 * a day, so the full ~35-target rotation still completes in ~1.5 days — better
 * coverage than the two-pass schedule it replaces, despite the smaller slice.
 */
const MAX_ENCOUNTERS_PER_RUN = Math.floor((MAX_SUBREQUESTS_PER_RUN - 3) / REQUESTS_PER_ENCOUNTER);
// Global cap per (encounter, difficulty). Sized so a meta dominated by one or
// two classes still leaves meaningful samples of the others once the board is
// sliced per class — the frontend's class view needs >=10 parses to cluster,
// and a 200-cap on a 54%-one-class board left minority classes with 2-5.
const KEEP_TOP_PER_ENCOUNTER = 400;
/**
 * Best N rows of each class survive the global cap, so every class view has data.
 *
 * Comfortably above the frontend's MIN_PARSES_TO_CLUSTER of 10, because the
 * stubbed-combat-info and non-DPS-spec filters thin every class board before it
 * reaches D1. 7 x 40 = 280 < KEEP_TOP_PER_ENCOUNTER, so the two caps never fight.
 */
const KEEP_PER_CLASS = 40;
/** Polite spacing between upstream calls. */
const REQUEST_DELAY_MS = 150;
/** Abort before spending the last of the hourly point budget. */
const RATE_LIMIT_ABORT_RATIO = 0.85;
/** Stop re-checking an encounter that has returned nothing this many runs running. */
const EMPTY_STREAK_LIMIT = 3;

const sleep = (ms: number): Promise<void> => new Promise((resolve) => setTimeout(resolve, ms));

// ─── Identity ────────────────────────────────────────────────────────────────

/**
 * Pseudonymous dedupe key: sha256(lower(name)|region), truncated.
 *
 * Dedupe deliberately keys on this rather than the display name, so name storage
 * can be switched off without changing row identity.
 */
async function characterKey(name: string | undefined, region: string | undefined): Promise<string> {
  const input = `${(name ?? '').toLowerCase()}|${(region ?? '').toLowerCase()}`;
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(input));
  return [...new Uint8Array(digest)]
    .map((byte) => byte.toString(16).padStart(2, '0'))
    .join('')
    .slice(0, 16);
}

function toLogDate(startMs: number | undefined): string | null {
  if (!startMs || !Number.isFinite(startMs)) return null;
  return new Date(startMs).toISOString().slice(0, 10);
}

// ─── Row construction ────────────────────────────────────────────────────────

async function toInsertRow(
  entry: ParsedCharacterRanking,
  target: DpsEncounterTarget,
  onWarn: (message: string) => void,
): Promise<DpsParseInsert | null> {
  const signature = extractBuildSignature(entry, onWarn);
  if (!signature) return null;

  const [key, hash] = await Promise.all([
    characterKey(entry.characterName, entry.serverRegion),
    computeSignatureHash(signature),
  ]);

  return {
    encounter_id: target.encounterId,
    difficulty: target.difficulty,
    zone_id: target.zoneId,
    trial_id: target.trialId,
    encounter_name: target.encounterName,
    hard_mode_level: entry.hardModeLevel ?? null,
    // The zone's latest partition from the zone probe (buildDpsEncounterTargets),
    // or the -1 "API default" sentinel for zones that expose no partitions.
    // Storing the REAL id matters: the upsert's `excluded.partition >` guard uses
    // it to supersede rows, and -1-vs--1 could never distinguish patch generations.
    partition: target.partitionId ?? -1,

    character_key: key,
    character_name: entry.characterName ?? null,
    eso_class: entry.esoClass ?? '',
    spec_name: entry.spec ?? '',
    // characterRankings returns no race; reserved for the R2 enrichment pass.
    race: null,
    server_region: entry.serverRegion ?? null,
    server_name: entry.serverName ?? null,
    guild_name: entry.guildName ?? null,

    report_code: entry.reportCode ?? '',
    fight_id: entry.fightId ?? 0,
    rank: entry.rank ?? null,
    amount: entry.amount ?? 0,
    duration_ms: entry.durationMs ?? null,
    log_start_ms: entry.startTimeMs ?? null,
    log_date: toLogDate(entry.startTimeMs),
    bracket_data: entry.bracketData ?? null,

    set1_id: signature.sets.fivePiece[0] ?? null,
    set2_id: signature.sets.fivePiece[1] ?? null,
    monster_id: signature.sets.monster ?? null,
    mythic_id: signature.sets.mythic ?? null,
    arena_set_id: signature.sets.arena ?? null,
    mundus_id: null,
    food_ability_id: null,
    signature_hash: hash,

    build_json: JSON.stringify(signature),
    // Raw gear + talents, so the frontend can hand a real build to playerToBuild().
    combatant_json: JSON.stringify({ gear: entry.gear, talents: entry.talents, sets: entry.sets }),
    signature_version: SIGNATURE_VERSION,
  };
}

// ─── Orchestration ───────────────────────────────────────────────────────────

export interface DpsSyncResult {
  encounter: string;
  encounterId: number;
  status: 'ok' | 'empty' | 'error' | 'skipped';
  rows: number;
  detail?: string;
}

export interface SyncDpsParsesOptions {
  /** Ingest only this encounter (manual backfill via the admin route). */
  encounterId?: number;
  difficulty?: number;
  pages?: number;
  maxEncounters?: number;
  /** Ignore the cursor ordering and the empty-streak skip. */
  force?: boolean;
}

/**
 * Ingest a budgeted slice of encounters.
 *
 * Ordering: never-synced targets first, then stalest. A run that exhausts its
 * budget simply stops; the cursor means the next run picks up the remainder
 * rather than restarting from the top.
 */
export async function syncDpsParses(
  env: Env,
  opts: SyncDpsParsesOptions = {},
): Promise<DpsSyncResult[]> {
  const results: DpsSyncResult[] = [];
  let subrequests = 0;

  const token = await getClientToken(env);
  subrequests++;

  const rateLimit = await fetchRateLimitData(token);
  subrequests++;
  if (rateLimit && rateLimit.limitPerHour > 0) {
    const used = rateLimit.pointsSpentThisHour / rateLimit.limitPerHour;
    if (used > RATE_LIMIT_ABORT_RATIO) {
      return [
        {
          encounter: '(run aborted)',
          encounterId: 0,
          status: 'skipped',
          rows: 0,
          detail: `rate limit ${Math.round(used * 100)}% consumed`,
        },
      ];
    }
  }

  const zones = await fetchTrialZones(token);
  subrequests++;

  const allTargets = buildDpsEncounterTargets(zones);
  if (allTargets.length === 0) {
    return [{ encounter: '(no targets)', encounterId: 0, status: 'error', rows: 0 }];
  }

  // Pages PER CLASS BOARD. One is the right default: a class board's first page
  // already exceeds KEEP_PER_CLASS after filtering, so a second page would be
  // fetched only to be pruned. The knob survives for manual backfill of a single
  // boss through /admin/sync-dps-parses.
  const pages = Math.max(1, opts.pages ?? 1);

  // Pre-flight database reads, guarded because they sit OUTSIDE the per-encounter
  // try/catch below. A schema-level problem here throws past every encounter at
  // once, and the cron handler's own catch only `console.error`s it — so the run
  // wrote nothing, advanced no cursor, and left no trace. Returning it as a result
  // instead means `/admin/sync-dps-parses` answers with the real reason.
  let targets: DpsEncounterTarget[];
  let blocked: Set<string>;
  try {
    targets = await selectTargets(env, allTargets, opts);
    blocked = await getBlockedCharacterKeys(env.DB);
  } catch (error) {
    const detail = error instanceof Error ? error.message : String(error);
    console.error('[dps-sync] preflight failed:', detail);
    return [{ encounter: '(preflight failed)', encounterId: 0, status: 'error', rows: 0, detail }];
  }

  // The blocklist is enforced pre-insert, but rows stored before a character
  // opted out persisted forever. Sweep them once per run, up front, so the
  // takedown takes effect on the very next pass.
  try {
    await purgeBlockedDpsParses(env.DB, blocked);
  } catch (error) {
    const detail = error instanceof Error ? error.message : String(error);
    console.error('[dps-sync] blocklist purge failed:', detail);
  }

  for (const target of targets) {
    if (subrequests + pages * REQUESTS_PER_ENCOUNTER > MAX_SUBREQUESTS_PER_RUN) {
      results.push({
        encounter: target.encounterName,
        encounterId: target.encounterId,
        status: 'skipped',
        rows: 0,
        detail: 'subrequest budget exhausted',
      });
      continue;
    }

    const outcome = await syncOneEncounter(env, token, target, pages, blocked, () => {
      subrequests++;
    });
    results.push(outcome);

    await sleep(REQUEST_DELAY_MS);
  }

  return results;
}

/**
 * Pick this run's encounters.
 *
 * The cursor table only knows about targets that have been attempted, so anything
 * absent from it is treated as never-synced and prioritised. Targets that have
 * come back empty repeatedly are DEMOTED to the back of the queue rather than
 * removed — a boss can gain rankings when a new patch lands, so it must stay in
 * rotation (just last), which is what the EMPTY_STREAK_LIMIT threshold promises.
 *
 * Exported for tests: the ordering contract is the whole point.
 */
export async function selectTargets(
  env: Env,
  allTargets: DpsEncounterTarget[],
  opts: SyncDpsParsesOptions,
): Promise<DpsEncounterTarget[]> {
  if (opts.encounterId !== undefined) {
    const match = allTargets.find((t) => t.encounterId === opts.encounterId);
    if (!match) return [];
    return [{ ...match, difficulty: opts.difficulty ?? match.difficulty }];
  }

  const limit = Math.max(1, opts.maxEncounters ?? MAX_ENCOUNTERS_PER_RUN);
  if (opts.force) return allTargets.slice(0, limit);

  // Stalest-first ordering comes from the cursor; anything not in it is new.
  const stale = await listStaleSyncTargets(env.DB, allTargets.length);
  const rank = new Map<string, number>();
  const skip = new Set<string>();
  stale.forEach((row, index) => {
    const id = `${row.encounter_id}:${row.difficulty}`;
    rank.set(id, index);
    if (row.empty_streak >= EMPTY_STREAK_LIMIT) skip.add(id);
  });

  const keyOf = (t: DpsEncounterTarget): string => `${t.encounterId}:${t.difficulty}`;
  // Demoted targets sort AFTER everything else but are never filtered out; the
  // slice below then takes the freshest `limit` from the reordered list.
  const demotedLast = (t: DpsEncounterTarget): number => (skip.has(keyOf(t)) ? 1 : 0);

  return [...allTargets]
    .sort(
      (a, b) =>
        demotedLast(a) - demotedLast(b) || (rank.get(keyOf(a)) ?? -1) - (rank.get(keyOf(b)) ?? -1),
    )
    .slice(0, limit);
}

async function syncOneEncounter(
  env: Env,
  token: string,
  target: DpsEncounterTarget,
  pages: number,
  blocked: Set<string>,
  onSubrequest: () => void,
): Promise<DpsSyncResult> {
  const warnings = new Set<string>();
  const onWarn = (message: string): void => {
    warnings.add(message);
  };

  // Keyed by character_key: one character can only hold one row per board (that
  // is the table's PK), and two statements writing the same PK inside a single
  // db.batch() resolve last-writer-wins. The class boards are disjoint in
  // principle, but a mislabelled or reclassified entry must not be able to turn
  // that into a nondeterministic write.
  const rowsByCharacter = new Map<string, DpsParseInsert>();
  let lastPage = 0;
  let stubbed = 0;
  let misfiltered = 0;

  // Per-CLASS failures are isolated below. Splitting one fetch into seven
  // multiplied the chance that a target hits a transient upstream error, and
  // letting any single board abort the encounter would throw away the six that
  // succeeded and record the whole boss as failed. Only a total wipeout is an
  // error; anything less is a partial success worth keeping.
  let boardsFailed = 0;
  let boardsAttempted = 0;
  let firstBoardError = '';

  try {
    for (const [classIndex, className] of CLASS_NAMES.entries()) {
      boardsAttempted++;
      try {
        for (let page = 1; page <= pages; page++) {
          const raw = await fetchCharacterRankings(token, {
            encounterId: target.encounterId,
            difficulty: target.difficulty >= 0 ? target.difficulty : undefined,
            // Pin the zone's latest partition so the fetched leaderboard, the rows we
            // store, and the upsert's supersede guard all agree on patch generation.
            // Omitted (undefined) only when the zone exposes no partitions at all.
            partition: target.partitionId ?? undefined,
            page,
            // Never rely on the API default: it was observed returning entries with
            // combat info stripped where `dps` returned it in full.
            metric: 'dps',
            className,
          });
          onSubrequest();
          lastPage = page;

          const parsed = parseCharacterRankingsPage(raw, page);
          stubbed += parsed.dropped.stubbed;

          for (const entry of parsed.rankings) {
            if (!hasRealCombatantInfo(entry)) continue;
            // A DPS leaderboard should not be polluted by tank and healer parses.
            // A class-scoped board still contains that class's tanks and healers.
            if (!isDpsSpec(entry.spec)) continue;
            // `className` is an unvalidated String in the upstream schema, so a
            // rejected value comes back as the UNFILTERED global board rather than
            // an error — which would silently store seven copies of the same top
            // parses and leave the starvation exactly as it was. Drop the
            // mismatches and surface the count.
            if (entry.esoClass && entry.esoClass !== className) {
              misfiltered++;
              continue;
            }

            const row = await toInsertRow(entry, target, onWarn);
            if (!row) continue;
            if (blocked.has(row.character_key)) continue;
            rowsByCharacter.set(row.character_key, row);
          }

          if (!parsed.hasMorePages) break;
          if (page < pages) await sleep(REQUEST_DELAY_MS);
        }
      } catch (boardError) {
        boardsFailed++;
        const reason = boardError instanceof Error ? boardError.message : String(boardError);
        if (!firstBoardError) firstBoardError = reason;
        onWarn(`${className} board failed: ${reason}`);
      }

      // Between class boards only. The run loop already spaces encounters, so
      // sleeping after the last board would just add dead time to every target.
      if (classIndex < CLASS_NAMES.length - 1) await sleep(REQUEST_DELAY_MS);
    }

    // Every board failed: this is an upstream outage, not a boss with no
    // rankings. Throwing routes it to the error path, which preserves
    // last_synced_at and the empty streak so the target is retried promptly
    // instead of being recorded as legitimately empty.
    if (boardsAttempted > 0 && boardsFailed === boardsAttempted) {
      // Carry the underlying reason, not just the count — otherwise the real
      // upstream failure is replaced by a summary and the recorded error says
      // nothing an operator can act on.
      throw new Error(`all ${boardsFailed} class boards failed: ${firstBoardError}`);
    }

    const rows = [...rowsByCharacter.values()];
    if (rows.length > 0) {
      await upsertDpsParses(env.DB, rows);
    }
    // Prune after EVERY successful fetch, empty results included: an encounter
    // whose rankings have dried up must still age its stored rows out, or the
    // scoped stale DELETE never reaches it and its old board lives forever.
    await pruneDpsParses(
      env.DB,
      target.encounterId,
      target.difficulty,
      KEEP_TOP_PER_ENCOUNTER,
      60,
      KEEP_PER_CLASS,
    );

    warnings.forEach((message) => {
      console.warn(`[dps-sync] ${target.encounterName}: ${message}`);
    });
    // Loud on purpose: a class filter the API ignored is invisible in the data
    // (the board just looks meta-skewed again) but obvious in this number.
    if (misfiltered > 0) {
      console.warn(
        `[dps-sync] ${target.encounterName}: ${misfiltered} entries did not match their ` +
          `requested class — the className filter may be being ignored upstream`,
      );
    }

    const previousStreak = rows.length === 0 ? await currentEmptyStreak(env, target) : 0;
    await recordSyncResult(env.DB, {
      encounterId: target.encounterId,
      difficulty: target.difficulty,
      encounterName: target.encounterName,
      zoneId: target.zoneId,
      lastPage,
      status: rows.length > 0 ? 'ok' : 'empty',
      error: '',
      rowsIngested: rows.length,
      emptyStreak: rows.length > 0 ? 0 : previousStreak + 1,
    });

    return {
      encounter: target.encounterName,
      encounterId: target.encounterId,
      status: rows.length > 0 ? 'ok' : 'empty',
      rows: rows.length,
      detail:
        [
          stubbed > 0 ? `${stubbed} entries had combat info hidden` : '',
          misfiltered > 0 ? `${misfiltered} entries failed the class filter` : '',
          boardsFailed > 0 ? `${boardsFailed}/${boardsAttempted} class boards failed` : '',
        ]
          .filter(Boolean)
          .join('; ') || undefined,
    };
  } catch (error) {
    const detail = error instanceof Error ? error.message : String(error);
    console.error(`[dps-sync] ${target.encounterName} failed:`, detail);

    // Record and continue: one bad encounter must not abort the whole run.
    // The streak is carried through UNCHANGED — an error says nothing about
    // whether the encounter yields parses, and resetting it to 0 would let a
    // flaky endpoint mask a genuinely dead one. recordSyncResult likewise
    // preserves the prior last_synced_at for 'error', so the encounter stays at
    // the front of the stalest-first queue and is retried on the next run.
    // Both reads/writes are guarded: if D1 itself is what failed, bookkeeping
    // must not throw out of this catch.
    let priorStreak = 0;
    try {
      priorStreak = await currentEmptyStreak(env, target);
    } catch (streakError) {
      console.error(
        `[dps-sync] ${target.encounterName} streak read failed:`,
        streakError instanceof Error ? streakError.message : String(streakError),
      );
    }
    await recordSyncResult(env.DB, {
      encounterId: target.encounterId,
      difficulty: target.difficulty,
      encounterName: target.encounterName,
      zoneId: target.zoneId,
      lastPage,
      status: 'error',
      error: detail.slice(0, 500),
      rowsIngested: 0,
      emptyStreak: priorStreak,
    }).catch(() => undefined);

    return {
      encounter: target.encounterName,
      encounterId: target.encounterId,
      status: 'error',
      rows: 0,
      detail,
    };
  }
}

async function currentEmptyStreak(env: Env, target: DpsEncounterTarget): Promise<number> {
  const state = await getSyncState(env.DB, target.encounterId, target.difficulty);
  return state?.empty_streak ?? 0;
}
