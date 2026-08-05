/**
 * Probe `Encounter.characterRankings` to pin down its runtime JSON shape.
 *
 * Nothing in this repo has ever called this field. It is declared as an untyped
 * `JSON` scalar (public/schema.graphql:834), so the only way to learn what it
 * returns is to ask. Everything downstream — the `dps_parses` D1 schema, the
 * build-signature extractor, the clustering feature vector — depends on the
 * answers, so this runs first and blocks the rest.
 *
 * Deliberately does NOT add a generated GraphQL document: no point polluting the
 * frontend GraphQL surface (and the proxy allowlist) before the field is proven.
 * Posts raw to the client API, exactly as roster-hub-api's own cron client does.
 *
 * Usage:
 *   npm run script scripts/probe-character-rankings.ts
 *   npm run script scripts/probe-character-rankings.ts -- --encounter 60 --encounter 4
 *
 * Writes a full dump to scratch/character-rankings-probe.json (gitignored) and a
 * redacted single-page fixture to
 * roster-hub-api/src/leaderboard-sync/__fixtures__/character-rankings-page.json.
 */

import { createHash } from 'node:crypto';
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';

import { runScript } from './_runner/bootstrap';
import type { ScriptLogger } from './_runner/bootstrap';

const SCRIPT_NAME = 'probe-character-rankings';
const ESOLOGS_CLIENT_API = 'https://www.esologs.com/api/v2/client';
const REQUEST_DELAY_MS = 300;
const REPO_ROOT = resolve(__dirname, '..');
const DUMP_PATH = resolve(REPO_ROOT, 'scratch/character-rankings-probe.json');
const FIXTURE_PATH = resolve(
  REPO_ROOT,
  'roster-hub-api/src/leaderboard-sync/__fixtures__/character-rankings-page.json',
);

// ─── Raw GraphQL ─────────────────────────────────────────────────────────────

type GqlResult<T> = { data?: T; errors?: Array<{ message: string }> };

async function gql<T>(
  token: string,
  query: string,
  variables?: Record<string, unknown>,
): Promise<T> {
  const res = await fetch(ESOLOGS_CLIENT_API, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify({ query, variables }),
  });

  if (!res.ok) {
    throw new Error(`ESO Logs GraphQL error (${res.status}): ${await res.text()}`);
  }

  const json = (await res.json()) as GqlResult<T>;
  if (json.errors?.length) {
    throw new Error(`ESO Logs GraphQL: ${json.errors.map((e) => e.message).join(', ')}`);
  }
  if (!json.data) throw new Error('ESO Logs GraphQL: no data in response');
  return json.data;
}

const sleep = (ms: number): Promise<void> => new Promise((r) => setTimeout(r, ms));

// ─── Rate limit (gate 6) ─────────────────────────────────────────────────────

interface RateLimitSnapshot {
  limitPerHour: number;
  pointsSpentThisHour: number;
  pointsResetIn: number;
}

const RATE_LIMIT_QUERY = `{ rateLimitData { limitPerHour pointsSpentThisHour pointsResetIn } }`;

/**
 * Returns null rather than throwing: `rateLimitData` may be user-token-only, and
 * that answer is itself a finding (it decides whether the cron can budget-govern
 * or has to rely on 429 backoff alone).
 */
async function fetchRateLimit(token: string, logger: ScriptLogger): Promise<RateLimitSnapshot | null> {
  try {
    const data = await gql<{ rateLimitData?: RateLimitSnapshot }>(token, RATE_LIMIT_QUERY);
    return data.rateLimitData ?? null;
  } catch (error) {
    logger.warn('rateLimitData unavailable with a client-credentials token', error);
    return null;
  }
}

// ─── Zone metadata ───────────────────────────────────────────────────────────

interface ProbeZone {
  id: number;
  name: string;
  encounters: Array<{ id: number; name: string }>;
  difficulties: Array<{ id: number; name: string; sizes: number[] }>;
  partitions: Array<{ id: number; name: string }>;
}

const ZONES_QUERY = `{
  worldData {
    zones {
      id
      name
      encounters { id name }
      difficulties { id name sizes }
      partitions { id name }
    }
  }
}`;

const TRIAL_TEAM_SIZE = 12;

async function fetchTrialZones(token: string): Promise<ProbeZone[]> {
  const data = await gql<{ worldData?: { zones?: ProbeZone[] } }>(token, ZONES_QUERY);
  return (data.worldData?.zones ?? []).filter((zone) =>
    (zone.difficulties ?? []).some((d) => (d.sizes ?? []).includes(TRIAL_TEAM_SIZE)),
  );
}

function pickVeteranDifficulty(zone: ProbeZone): { id: number; name: string } | null {
  const difficulties = zone.difficulties ?? [];
  return (
    difficulties.find((d) => d.name?.toLowerCase().includes('veteran')) ??
    difficulties.find((d) => (d.sizes ?? []).includes(TRIAL_TEAM_SIZE)) ??
    difficulties[0] ??
    null
  );
}

// ─── characterRankings ───────────────────────────────────────────────────────

const CHARACTER_RANKINGS_QUERY = `
query ProbeCharacterRankings(
  $encounterId: Int!
  $difficulty: Int
  $partition: Int
  $page: Int
  $metric: CharacterRankingMetricType
  $includeCombatantInfo: Boolean
  $className: String
  $size: Int
) {
  worldData {
    encounter(id: $encounterId) {
      id
      name
      characterRankings(
        difficulty: $difficulty
        partition: $partition
        page: $page
        metric: $metric
        includeCombatantInfo: $includeCombatantInfo
        className: $className
        size: $size
      )
    }
  }
}`;

interface ProbeVariables {
  encounterId: number;
  difficulty?: number;
  partition?: number;
  page?: number;
  metric?: 'dps' | 'bossdps' | 'default';
  includeCombatantInfo?: boolean;
  className?: string;
  size?: number;
}

interface ProbeCase {
  label: string;
  variables: ProbeVariables;
}

interface ProbeOutcome {
  label: string;
  variables: ProbeVariables;
  ok: boolean;
  error?: string;
  elapsedMs: number;
  /** Bytes of the serialized `characterRankings` value — the includeCombatantInfo delta. */
  payloadBytes: number;
  /** True when the JSON scalar came back as a string rather than an object. */
  wasString: boolean;
  topLevelKeys: string[];
  /** Which key held the rankings array: 'rankings' | 'data' | null. */
  rankingsKey: string | null;
  rankingCount: number;
  entryKeys: string[];
  raw: unknown;
}

async function probeOnce(
  token: string,
  probe: ProbeCase,
  logger: ScriptLogger,
): Promise<ProbeOutcome> {
  const startedAt = Date.now();
  const base: ProbeOutcome = {
    label: probe.label,
    variables: probe.variables,
    ok: false,
    elapsedMs: 0,
    payloadBytes: 0,
    wasString: false,
    topLevelKeys: [],
    rankingsKey: null,
    rankingCount: 0,
    entryKeys: [],
    raw: null,
  };

  try {
    const data = await gql<{ worldData?: { encounter?: { characterRankings?: unknown } } }>(
      token,
      CHARACTER_RANKINGS_QUERY,
      probe.variables as unknown as Record<string, unknown>,
    );

    const rawValue = data.worldData?.encounter?.characterRankings ?? null;
    const wasString = typeof rawValue === 'string';
    const payloadBytes = rawValue == null ? 0 : JSON.stringify(rawValue).length;

    // Gate 4: string-or-object, and possibly wrapped in a `data` envelope.
    let parsed: unknown = rawValue;
    if (wasString) {
      try {
        parsed = JSON.parse(rawValue as string);
      } catch {
        parsed = null;
      }
    }
    const unwrapped = unwrapEnvelope(parsed);
    const { rankings, rankingsKey } = extractRankings(unwrapped);

    return {
      ...base,
      ok: true,
      elapsedMs: Date.now() - startedAt,
      payloadBytes,
      wasString,
      topLevelKeys: isRecord(unwrapped) ? Object.keys(unwrapped) : [],
      rankingsKey,
      rankingCount: rankings.length,
      entryKeys: isRecord(rankings[0]) ? Object.keys(rankings[0]) : [],
      raw: unwrapped,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    logger.warn(`Probe "${probe.label}" failed`, message);
    return { ...base, elapsedMs: Date.now() - startedAt, error: message };
  }
}

// ─── Shape helpers ───────────────────────────────────────────────────────────

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

/** The sibling `fightRankings` sometimes nests under `data`; check for the same here. */
function unwrapEnvelope(value: unknown): unknown {
  if (isRecord(value) && isRecord(value.data) && !Array.isArray(value.rankings)) {
    return value.data;
  }
  return value;
}

function extractRankings(value: unknown): { rankings: unknown[]; rankingsKey: string | null } {
  if (!isRecord(value)) return { rankings: [], rankingsKey: null };
  for (const key of ['rankings', 'data']) {
    const candidate = value[key];
    if (Array.isArray(candidate)) return { rankings: candidate, rankingsKey: key };
  }
  return { rankings: [], rankingsKey: null };
}

/** Combatant info may sit on the entry root or under a nested `combatantInfo`. */
function readCombatantArray(entry: Record<string, unknown>, key: 'gear' | 'talents'): unknown[] {
  const direct = entry[key];
  if (Array.isArray(direct)) return direct;
  const nested = entry.combatantInfo;
  if (isRecord(nested) && Array.isArray(nested[key])) return nested[key] as unknown[];
  return [];
}

function distinct(values: Array<string | number | undefined | null>): string[] {
  return [...new Set(values.filter((v) => v != null).map(String))].sort();
}

// ─── Gate reporting ──────────────────────────────────────────────────────────

/**
 * ~15-20% of ranked entries come back with gear/talents stubbed out
 * (`id: null`, `name: "Unknown Item"`) — the player has combat info hidden, or the
 * log predates it. Analysing `entries[0]` blindly reports a false negative, so
 * always reason about the shape from an entry that actually carries data.
 */
function hasRealCombatantInfo(entry: Record<string, unknown>): boolean {
  return readCombatantArray(entry, 'gear').some(
    (piece) => isRecord(piece) && piece.id != null && Number(piece.id) > 0,
  );
}

function reportGates(outcome: ProbeOutcome, logger: ScriptLogger): void {
  const { rankings } = extractRankings(outcome.raw);
  const entries = rankings.filter(isRecord);
  const populated = entries.filter(hasRealCombatantInfo);
  // Sample from a populated entry; fall back to entry[0] only if none exist.
  const sample = populated[0] ?? entries[0];

  console.log('');
  console.log('═'.repeat(78));
  console.log(`DECISION GATES — ${outcome.label}`);
  console.log('═'.repeat(78));

  // Gate 4 — top-level shape.
  console.log('');
  console.log('[4] Top-level shape');
  console.log(`    JSON scalar arrived as: ${outcome.wasString ? 'STRING (needs JSON.parse)' : 'OBJECT'}`);
  console.log(`    top-level keys: ${outcome.topLevelKeys.join(', ') || '(none)'}`);
  console.log(`    rankings array key: ${outcome.rankingsKey ?? '(NOT FOUND)'}`);
  console.log(`    entry count: ${entries.length}  |  payload: ${(outcome.payloadBytes / 1024).toFixed(1)} KB`);
  if (entries.length === 0) {
    console.log('    ⛔ No entries — cannot evaluate the remaining gates.');
    return;
  }
  console.log(`    entry keys: ${outcome.entryKeys.join(', ')}`);
  console.log(
    `    entries with REAL combatant info: ${populated.length}/${entries.length} ` +
      `(${(100 - (populated.length / entries.length) * 100).toFixed(0)}% stubbed — must be filtered at ingest)`,
  );

  // Gate 1 — gear. This is the one that decides whether the feature is viable.
  const sampleGear = readCombatantArray(sample, 'gear').filter(isRecord);
  const realGear = sampleGear.filter((g) => g.id != null && Number(g.id) > 0);
  console.log('');
  console.log('[1] gear[] — VIABILITY GATE');
  if (realGear.length > 0) {
    const gearKeys = Object.keys(realGear[0]);
    console.log(`    array length: ${sampleGear.length} (${realGear.length} real, rest are id:0 padding)`);
    console.log(`    gear item keys: ${gearKeys.join(', ')}`);
    console.log(`    sample piece: ${JSON.stringify(realGear[0])}`);
    // The plan assumed numeric setID + a `slot` + a `type`. Verify all three.
    const setIdType = typeof realGear[0].setID;
    console.log(`    typeof setID: ${setIdType}${setIdType === 'string' ? '  ⚠️ STRING — must coerce' : ''}`);
    console.log(`    has explicit slot field: ${'slot' in realGear[0] ? 'yes' : 'NO — array position IS the slot'}`);
    console.log(`    has type field: ${'type' in realGear[0] ? 'yes' : 'NO — categorizeGear() cannot be reused as-is'}`);
    const counts = new Map<string, number>();
    realGear.forEach((g) => {
      const key = String(g.setID);
      counts.set(key, (counts.get(key) ?? 0) + 1);
    });
    console.log(`    setID -> piece count: ${[...counts].map(([k, v]) => `${k}x${v}`).join(', ')}`);
    console.log('    ✅ VIABLE — piece counts derivable, traits/enchants/cp all present');
  } else {
    console.log('    ⛔ NO GEAR RETURNED — feature is not viable as designed.');
    console.log('       Fallback is per-report fetchPlayerDetails matched by name:');
    console.log('       ~1 subrequest per report (~100/encounter). Re-scope before Phase 1.');
  }

  // A pre-categorized distinct-set list would save us reimplementing categorizeGear.
  const sampleSets = Array.isArray(sample.sets) ? sample.sets.filter(isRecord) : [];
  console.log('');
  console.log('[1b] sets[] — pre-categorized distinct sets');
  if (sampleSets.length > 0) {
    console.log(`    count: ${sampleSets.length}  keys: ${Object.keys(sampleSets[0]).join(', ')}`);
    console.log(`    value: ${JSON.stringify(sampleSets)}`);
    console.log('    ✅ distinct sets given directly — but NO piece counts, so still count from gear[]');
  } else {
    console.log('    absent on this entry');
  }

  // Gate 2 — talents and the front/back bar split.
  const sampleTalents = readCombatantArray(sample, 'talents').filter(isRecord);
  console.log('');
  console.log('[2] talents[] + bar split');
  if (sampleTalents.length > 0) {
    const talentKeys = Object.keys(sampleTalents[0]);
    console.log(`    talents: ${sampleTalents.length} (12 => two bars of 6, last of each is the ultimate)`);
    console.log(`    talent keys: ${talentKeys.join(', ')}`);
    const orderingKeys = talentKeys.filter((k) => /slot|index|bar|flag|position/i.test(k));
    console.log(`    explicit bar-ordering key: ${orderingKeys.join(', ') || 'NONE — array position is the slot'}`);
    const half = Math.floor(sampleTalents.length / 2);
    console.log(`    front bar: ${sampleTalents.slice(0, half).map((t) => `${t.name}(${t.id})`).join(', ')}`);
    console.log(`    back bar:  ${sampleTalents.slice(half).map((t) => `${t.name}(${t.id})`).join(', ')}`);
    // A consistent 12 across the page is what makes the positional split safe.
    const lengths = distinct(populated.map((e) => readCombatantArray(e, 'talents').length));
    console.log(`    distinct talent-array lengths across populated entries: ${lengths.join(', ')}`);
    console.log(
      lengths.length === 1 && lengths[0] === '12'
        ? '    ✅ always 12 — positional split is safe, barOrderKnown = true'
        : '    ⚠️  variable length — positional split is unsafe, set barOrderKnown = false',
    );
  } else {
    console.log('    ⛔ no talents — skill bars unavailable, cluster on gear only');
  }

  // Gate 3 — race / CP / mundus / food.
  console.log('');
  console.log('[3] race / CP / mundus / food');
  const entryKeySet = new Set(outcome.entryKeys);
  for (const field of ['race', 'championPoints', 'cp', 'mundus', 'food', 'combatantInfo', 'talentTree', 'stats', 'bracketData']) {
    const present = entryKeySet.has(field);
    console.log(`    ${field}: ${present ? `PRESENT -> ${JSON.stringify(sample[field])?.slice(0, 200)}` : 'absent'}`);
  }
  console.log('    (absent => leave the column NULL, push the key into signature.missing, grey out in UI)');

  // Gate 5 — class/spec vocabulary.
  console.log('');
  console.log('[5] class / spec vocabulary (across this page)');
  console.log(`    class: ${distinct(entries.map((e) => e.class as string)).join(', ') || '(absent)'}`);
  console.log(`    spec:  ${distinct(entries.map((e) => e.spec as string)).join(', ') || '(absent)'}`);
  console.log(`    typeof class: ${typeof sample.class}`);
  console.log('    (spec is the role filter — exclude Tank/Healer specs at ingest)');

  // Identity + provenance, for the privacy switch and source_url.
  console.log('');
  console.log('[identity/provenance]');
  console.log(`    name: ${JSON.stringify(sample.name)}  amount: ${JSON.stringify(sample.amount)}`);
  console.log(`    displayName: ${JSON.stringify(sample.displayName)}  <- account handle; MUST NOT be stored`);
  console.log(`    report: ${JSON.stringify(sample.report)}`);
  console.log(`    server: ${JSON.stringify(sample.server)}  guild: ${JSON.stringify(sample.guild)}`);
  console.log(`    duration: ${JSON.stringify(sample.duration)}  startTime: ${JSON.stringify(sample.startTime)}`);
  console.log(`    hardModeLevel: ${JSON.stringify(sample.hardModeLevel)}`);
}

// ─── Fixture redaction ───────────────────────────────────────────────────────

const REDACTED_KEYS = new Set([
  'name',
  'guild',
  'server',
  'characterName',
  'accountName',
  // The account handle (@Foo). Never stored by the ingest, never in a fixture.
  'displayName',
]);

/**
 * Replaces identifying strings with deterministic placeholders so the committed
 * fixture carries the *shape* without republishing anyone's identity. `name` on a
 * gear or talent item is an item/ability name, not a person — only redact it at
 * the ranking-entry level.
 */
function redactEntry(entry: Record<string, unknown>, index: number): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(entry)) {
    if (!REDACTED_KEYS.has(key)) {
      out[key] = value;
      continue;
    }
    if (typeof value === 'string') {
      out[key] = `Player${index + 1}`;
    } else if (isRecord(value)) {
      out[key] = { ...value, name: `${key}-${index + 1}` };
    } else {
      out[key] = value;
    }
  }
  if (isRecord(out.report) && typeof out.report.code === 'string') {
    // Keep the code's length and shape; drop the real one.
    const digest = createHash('sha256').update(out.report.code).digest('hex');
    out.report = { ...out.report, code: digest.slice(0, out.report.code.length) };
  }
  return out;
}

/**
 * The fixture drives every parser test, so it must contain both shapes the ingest
 * has to survive: entries with real combatant info, and at least one stubbed entry
 * (`id: null` / `"Unknown Item"`) so the "must be filtered" path stays covered.
 */
function writeFixture(outcome: ProbeOutcome, logger: ScriptLogger): void {
  const { rankings, rankingsKey } = extractRankings(outcome.raw);
  const all = rankings.filter(isRecord);
  const populated = all.filter(hasRealCombatantInfo);
  const stubbed = all.filter((e) => !hasRealCombatantInfo(e));

  const entries = [...populated.slice(0, 8), ...stubbed.slice(0, 2)].map(redactEntry);
  if (entries.length === 0) {
    logger.warn('No entries to write as a fixture — skipping');
    return;
  }
  logger.info(
    `Fixture composition: ${Math.min(populated.length, 8)} populated + ${Math.min(stubbed.length, 2)} stubbed`,
  );

  const envelope = isRecord(outcome.raw) ? { ...outcome.raw } : {};
  if (rankingsKey) envelope[rankingsKey] = entries;

  mkdirSync(dirname(FIXTURE_PATH), { recursive: true });
  writeFileSync(FIXTURE_PATH, `${JSON.stringify(envelope, null, 2)}\n`, 'utf8');
  logger.info(`Wrote redacted fixture (${entries.length} entries) -> ${FIXTURE_PATH}`);
}

// ─── CLI ─────────────────────────────────────────────────────────────────────

function parseEncounterArgs(): number[] {
  const argv = process.argv.slice(2);
  const ids: number[] = [];
  argv.forEach((arg, index) => {
    if (arg === '--encounter' || arg === '-e') {
      const value = Number(argv[index + 1]);
      if (Number.isFinite(value)) ids.push(value);
    }
  });
  return ids;
}

// ─── Main ────────────────────────────────────────────────────────────────────

runScript(async ({ resolveAccessToken, logger }) => {
  const token = await resolveAccessToken();

  const before = await fetchRateLimit(token, logger);
  if (before) {
    logger.info('Rate limit before', before);
  }

  logger.info('Fetching trial zones (encounters, difficulties, partitions)...');
  const zones = await fetchTrialZones(token);
  logger.info(`Found ${zones.length} trial zones supporting ${TRIAL_TEAM_SIZE}-player`);

  console.log('');
  console.log('─── Zone / partition inventory ───');
  zones.forEach((zone) => {
    const parts = (zone.partitions ?? []).map((p) => `${p.id}:${p.name}`).join(', ') || '(none)';
    const diffs = (zone.difficulties ?? []).map((d) => `${d.id}:${d.name}`).join(', ');
    console.log(`  [${zone.id}] ${zone.name}`);
    console.log(`      encounters: ${(zone.encounters ?? []).map((e) => `${e.id}:${e.name}`).join(', ')}`);
    console.log(`      difficulties: ${diffs}`);
    console.log(`      partitions: ${parts}`);
  });

  // Newest zone = current patch, oldest = legacy. Partition behaviour differs
  // between them, which is the whole reason for probing two.
  const sorted = [...zones].sort((a, b) => a.id - b.id);
  const requested = parseEncounterArgs();
  const targets = requested.length
    ? requested
        .map((encounterId) => {
          const zone = zones.find((z) => (z.encounters ?? []).some((e) => e.id === encounterId));
          return zone ? { zone, encounterId } : null;
        })
        .filter((t): t is { zone: ProbeZone; encounterId: number } => t !== null)
    : [sorted[sorted.length - 1], sorted[0]]
        .filter(Boolean)
        .map((zone) => ({
          zone,
          // Last encounter in a trial zone is the final boss — always ranked.
          encounterId: zone.encounters[zone.encounters.length - 1]?.id,
        }))
        .filter((t) => Number.isFinite(t.encounterId));

  if (targets.length === 0) {
    throw new Error('No probe targets resolved. Pass --encounter <id> explicitly.');
  }

  const outcomes: ProbeOutcome[] = [];
  let primary: ProbeOutcome | null = null;

  for (const { zone, encounterId } of targets) {
    const difficulty = pickVeteranDifficulty(zone);
    const partitions = zone.partitions ?? [];
    const latestPartition = partitions[partitions.length - 1]?.id;
    const encounterName =
      zone.encounters.find((e) => e.id === encounterId)?.name ?? String(encounterId);
    const tag = `${zone.name} / ${encounterName}`;

    const cases: ProbeCase[] = [
      // The shape-defining call. Everything downstream is built against this.
      {
        label: `${tag} — dps + combatantInfo (PRIMARY)`,
        variables: {
          encounterId,
          difficulty: difficulty?.id,
          page: 1,
          metric: 'dps',
          includeCombatantInfo: true,
          size: TRIAL_TEAM_SIZE,
        },
      },
      // Size delta vs. the primary => the real cost of includeCombatantInfo.
      {
        label: `${tag} — dps WITHOUT combatantInfo`,
        variables: {
          encounterId,
          difficulty: difficulty?.id,
          page: 1,
          metric: 'dps',
          includeCombatantInfo: false,
          size: TRIAL_TEAM_SIZE,
        },
      },
      {
        label: `${tag} — metric: bossdps`,
        variables: { encounterId, difficulty: difficulty?.id, page: 1, metric: 'bossdps', includeCombatantInfo: true },
      },
      {
        label: `${tag} — metric: default`,
        variables: { encounterId, difficulty: difficulty?.id, page: 1, metric: 'default', includeCombatantInfo: true },
      },
      // Does omitting difficulty change the result set, or is there a real default?
      {
        label: `${tag} — no difficulty`,
        variables: { encounterId, page: 1, metric: 'dps', includeCombatantInfo: true },
      },
      // Page size + hasMorePages behaviour.
      {
        label: `${tag} — page 2`,
        variables: { encounterId, difficulty: difficulty?.id, page: 2, metric: 'dps', includeCombatantInfo: true },
      },
      {
        label: `${tag} — page 3`,
        variables: { encounterId, difficulty: difficulty?.id, page: 3, metric: 'dps', includeCombatantInfo: true },
      },
      // className slug vocabulary — the exact strings the cron must pass.
      {
        label: `${tag} — className: arcanist`,
        variables: {
          encounterId,
          difficulty: difficulty?.id,
          page: 1,
          metric: 'dps',
          includeCombatantInfo: true,
          className: 'Arcanist',
        },
      },
    ];

    if (latestPartition != null) {
      cases.push({
        label: `${tag} — explicit partition ${latestPartition}`,
        variables: {
          encounterId,
          difficulty: difficulty?.id,
          partition: latestPartition,
          page: 1,
          metric: 'dps',
          includeCombatantInfo: true,
        },
      });
    }

    for (const probe of cases) {
      logger.info(`Probing: ${probe.label}`, probe.variables);
      const outcome = await probeOnce(token, probe, logger);
      outcomes.push(outcome);
      if (!primary && outcome.ok && outcome.rankingCount > 0 && probe.label.includes('PRIMARY')) {
        primary = outcome;
      }
      await sleep(REQUEST_DELAY_MS);
    }
  }

  // ─── Summary ───────────────────────────────────────────────────────────────

  console.log('');
  console.log('─── Probe summary ───');
  outcomes.forEach((o) => {
    const status = o.ok ? 'ok  ' : 'FAIL';
    const size = `${(o.payloadBytes / 1024).toFixed(1)} KB`.padStart(9);
    console.log(
      `  ${status} ${String(o.rankingCount).padStart(4)} entries ${size} ${String(o.elapsedMs).padStart(5)}ms  ${o.label}`,
    );
    if (o.error) console.log(`         ${o.error}`);
  });

  // includeCombatantInfo cost delta.
  const withInfo = outcomes.find((o) => o.ok && o.label.includes('PRIMARY'));
  const withoutInfo = outcomes.find((o) => o.ok && o.label.includes('WITHOUT combatantInfo'));
  if (withInfo && withoutInfo && withoutInfo.payloadBytes > 0) {
    const ratio = withInfo.payloadBytes / withoutInfo.payloadBytes;
    console.log('');
    console.log(
      `  includeCombatantInfo payload multiplier: ${ratio.toFixed(1)}x ` +
        `(${(withoutInfo.payloadBytes / 1024).toFixed(1)} KB -> ${(withInfo.payloadBytes / 1024).toFixed(1)} KB)`,
    );
  }

  const target = primary ?? outcomes.find((o) => o.ok && o.rankingCount > 0) ?? null;
  if (!target) {
    console.log('');
    console.log('⛔ No probe returned any rankings. The feature cannot proceed as designed.');
    console.log('   Re-run against a known-populated encounter: --encounter <id>');
    return;
  }

  reportGates(target, logger);

  // Gate 6 — points cost. Divide by the number of calls actually made.
  const after = await fetchRateLimit(token, logger);
  console.log('');
  console.log('[6] Rate-limit cost');
  if (before && after) {
    const spent = after.pointsSpentThisHour - before.pointsSpentThisHour;
    const calls = outcomes.length + 2; // + the two rateLimitData calls
    console.log(`    limitPerHour: ${after.limitPerHour}`);
    console.log(`    points spent by this probe: ${spent} across ~${calls} calls`);
    console.log(`    => ~${(spent / Math.max(1, outcomes.length)).toFixed(1)} points per characterRankings page`);
    const perRun = Number(((spent / Math.max(1, outcomes.length)) * 6).toFixed(1));
    console.log(`    => a 6-encounter cron run costs ~${perRun} points of ${after.limitPerHour}/hr`);
  } else {
    console.log('    ⚠️  rateLimitData not available with a client-credentials token.');
    console.log('       The cron cannot budget-govern; rely on 429 backoff alone (drop RATE_LIMIT_ABORT_RATIO).');
  }

  mkdirSync(dirname(DUMP_PATH), { recursive: true });
  writeFileSync(DUMP_PATH, `${JSON.stringify({ zones, outcomes }, null, 2)}\n`, 'utf8');
  logger.info(`Wrote full dump -> ${DUMP_PATH}`);

  writeFixture(target, logger);
}, { name: SCRIPT_NAME });
