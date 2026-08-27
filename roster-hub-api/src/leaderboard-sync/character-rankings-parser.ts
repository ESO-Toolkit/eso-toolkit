/**
 * Defensive parser for the `Encounter.characterRankings` JSON scalar.
 *
 * Shape confirmed by scripts/probe-character-rankings.ts (2026-07-27) against
 * Opulent Ordeal and Aetherian Archive. The field is an untyped `JSON` scalar, so
 * everything here is written to tolerate drift rather than trust the schema.
 *
 * Observed envelope (object, NOT a string, NOT wrapped in `data`):
 *   { page, hasMorePages, count, rankings: [...] }
 *
 * Observed ranking entry:
 *   { name, class, spec, amount, hardModeLevel, duration, startTime,
 *     report: { code, fightID, startTime },
 *     server: { id, name, region },
 *     bracketData, displayName, talents, gear, sets }
 *
 * Findings that drive the code below:
 *  - `gear` is ALWAYS length 16, padded at the end with `id: 0` stubs. Real pieces
 *    have `id > 0`. There is no `slot` field — array position is the slot.
 *  - Numeric gear fields (`setID`, `trait`, `cp`, `enchantType`, `enchantQuality`)
 *    arrive as STRINGS. Every one is coerced here so nothing downstream has to care.
 *  - `talents` is ALWAYS exactly 12 when populated: [0..5] front bar, [6..11] back
 *    bar, with index 5 and 11 being the ultimates. No ordering field exists; the
 *    split is positional, which the probe verified holds across every entry.
 *  - ~19% of entries are fully stubbed (`id: null`, name "Unknown Item", empty
 *    `sets`) — the player hid their combat info, or the log predates the feature.
 *    These must be dropped; `hasRealCombatantInfo` is the guard.
 *  - `race`, `championPoints`, `mundus` and `food` are NOT returned. Do not look
 *    for them.
 *  - `displayName` is the ACCOUNT HANDLE (@Foo). Deliberately never read here.
 *  - `metric: default` returned stubbed gear where `metric: dps` returned real
 *    gear on the same encounter, so callers must always pass `dps` explicitly.
 */

/** Bar layout is positional; these are the invariants the probe confirmed. */
export const TALENTS_PER_BAR = 6;
export const EXPECTED_TALENT_COUNT = 12;
/** Index of the ultimate within each bar (last slot). */
export const ULTIMATE_BAR_INDEX = 5;

// ─── Ingest sanity gates ─────────────────────────────────────────────────────
// A leaderboard entry can be technically parseable and still useless. These
// thresholds reject "real-looking but meaningless" rows before they reach the
// table, and their drops are counted in `dropped.trivial` so sync logs show WHY
// a page shrank.

/**
 * Zero or negative DPS is never a real ranked parse — it is an API artifact
 * (wipe attempts and abandoned pulls have leaked through with amount = 0).
 */
export const MIN_PARSE_AMOUNT = 1;

/**
 * Sub-30-second fights are trash-fight inflation, not trial parses: a 12-player
 * trial boss cannot die meaningfully faster than that, but leaderboard pages
 * occasionally carry short pulls that out-score real kills on paper.
 */
export const MIN_PARSE_DURATION_MS = 30_000;

/**
 * Minimum REAL (id > 0) gear pieces for an entry to carry a usable build. ESO has
 * 14 gear slots, and even mythic/arena-heavy builds keep most of them populated;
 * anything below ~half is either combat-info stripping the API failed to flag or
 * a partially-padded array. The old `length > 0` check let single-piece entries
 * through as "builds".
 */
export const MIN_REAL_GEAR_PIECES = 7;

// ─── Safe coercion ───────────────────────────────────────────────────────────
// Duplicated rather than imported: this Worker is a separate package and cannot
// reach into src/. Same precedent as gear-categorizer.ts's copied set-ID tables.
// Mirrors scripts/leaderboard/leaderboardHelpers.ts.

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

/** Accepts numbers and numeric strings; rejects NaN, Infinity, null, ''. */
function safeNumber(value: unknown): number | undefined {
  if (typeof value === 'number') return Number.isFinite(value) ? value : undefined;
  if (typeof value === 'string' && value.trim() !== '') {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : undefined;
  }
  return undefined;
}

function safeString(value: unknown): string | undefined {
  if (typeof value === 'string' && value.trim() !== '') return value;
  return undefined;
}

function safeArray(value: unknown): unknown[] {
  return Array.isArray(value) ? value : [];
}

// ─── Parsed shapes ───────────────────────────────────────────────────────────

export interface ParsedGearPiece {
  /** Array position in the source `gear` array — this IS the slot. */
  slot: number;
  itemId: number;
  setId: number;
  name?: string;
  icon?: string;
  trait?: number;
  cp?: number;
  enchantType?: number;
  enchantQuality?: number;
  /** ESO Logs' `quality` is a bar designation ("primary"/"backup"), not an item tier. */
  quality?: string;
}

export interface ParsedTalent {
  /** Array position — [0..5] front bar, [6..11] back bar. */
  slot: number;
  abilityId: number;
  name?: string;
  icon?: string;
}

/** Distinct sets as ESO Logs reports them. No piece counts — those come from gear. */
export interface ParsedSetRef {
  setId: number;
  name?: string;
}

export interface ParsedCharacterRanking {
  rank?: number;
  characterName?: string;
  esoClass?: string;
  spec?: string;
  amount?: number;
  durationMs?: number;
  startTimeMs?: number;
  hardModeLevel?: number;
  bracketData?: number;
  reportCode?: string;
  fightId?: number;
  reportStartMs?: number;
  serverName?: string;
  serverRegion?: string;
  guildName?: string;
  gear: ParsedGearPiece[];
  talents: ParsedTalent[];
  sets: ParsedSetRef[];
}

export interface ParsedCharacterRankingsPage {
  rankings: ParsedCharacterRanking[];
  page: number;
  hasMorePages: boolean;
  count?: number;
  /** Entries discarded for being unusable, by reason. Surfaced in sync logs. */
  dropped: { stubbed: number; malformed: number; trivial: number };
}

// ─── Entry parsing ───────────────────────────────────────────────────────────

/**
 * Combat info sat directly on the entry in every probe response, but a nested
 * `combatantInfo` is the shape the sibling playerDetails endpoint uses. Reading
 * both costs three lines and removes an entire class of future breakage.
 */
function readCombatantArray(entry: Record<string, unknown>, key: 'gear' | 'talents'): unknown[] {
  const direct = entry[key];
  if (Array.isArray(direct)) return direct;
  const nested = entry.combatantInfo;
  if (isRecord(nested) && Array.isArray(nested[key])) return nested[key] as unknown[];
  return [];
}

function parseGear(raw: unknown[]): ParsedGearPiece[] {
  const pieces: ParsedGearPiece[] = [];
  raw.forEach((item, slot) => {
    if (!isRecord(item)) return;
    const itemId = safeNumber(item.id);
    // The trailing `id: 0` / `id: null` entries are padding, not equipment.
    if (itemId === undefined || itemId <= 0) return;
    const setId = safeNumber(item.setID) ?? 0;
    pieces.push({
      slot,
      itemId,
      setId,
      name: safeString(item.name),
      icon: safeString(item.icon),
      trait: safeNumber(item.trait),
      cp: safeNumber(item.cp),
      enchantType: safeNumber(item.enchantType),
      enchantQuality: safeNumber(item.enchantQuality),
      quality: safeString(item.quality),
    });
  });
  return pieces;
}

function parseTalents(raw: unknown[]): ParsedTalent[] {
  const talents: ParsedTalent[] = [];
  raw.forEach((item, slot) => {
    if (!isRecord(item)) return;
    const abilityId = safeNumber(item.id);
    if (abilityId === undefined || abilityId <= 0) return;
    talents.push({
      slot,
      abilityId,
      name: safeString(item.name),
      icon: safeString(item.icon),
    });
  });
  return talents;
}

function parseSets(raw: unknown[]): ParsedSetRef[] {
  const sets: ParsedSetRef[] = [];
  raw.forEach((item) => {
    if (!isRecord(item)) return;
    const setId = safeNumber(item.id);
    if (setId === undefined || setId <= 0) return;
    // ESO Logs returns "Unknown Set" for sets missing from its own name table
    // (observed: id 848). Drop the placeholder so our SET_DISPLAY_NAMES wins.
    const name = safeString(item.name);
    sets.push({ setId, name: name === 'Unknown Set' ? undefined : name });
  });
  return sets;
}

/**
 * Why an entry was rejected:
 *  - 'malformed' — structurally unusable (no amount, no report code),
 *  - 'trivial'   — parseable but not a meaningful trial parse (zero/negative
 *                  DPS, or a sub-MIN_PARSE_DURATION_MS trash fight).
 */
type EntryRejection = 'malformed' | 'trivial';

type ParseEntryResult =
  | { ok: true; ranking: ParsedCharacterRanking }
  | { ok: false; reason: EntryRejection };

function parseEntry(raw: unknown, index: number): ParseEntryResult {
  if (!isRecord(raw)) return { ok: false, reason: 'malformed' };

  const amount = safeNumber(raw.amount);
  const report = isRecord(raw.report) ? raw.report : undefined;
  const reportCode = safeString(report?.code);
  // Without a metric or a source log the row is useless — it can neither be
  // ranked nor attributed back to esologs.com.
  if (amount === undefined || !reportCode) return { ok: false, reason: 'malformed' };

  // Zero/negative DPS is an API artifact, not a parse.
  if (amount < MIN_PARSE_AMOUNT) return { ok: false, reason: 'trivial' };

  const durationMs = safeNumber(raw.duration);
  // Only reject when the API TELLS us it was a trash-length fight; a missing
  // duration stays tolerated (defensive parsing beats strictness here).
  if (durationMs !== undefined && durationMs < MIN_PARSE_DURATION_MS) {
    return { ok: false, reason: 'trivial' };
  }

  const server = isRecord(raw.server) ? raw.server : undefined;
  const guild = isRecord(raw.guild) ? raw.guild : undefined;

  return {
    ok: true,
    ranking: {
      // The API returns rankings pre-sorted by amount and omits an explicit rank.
      rank: safeNumber(raw.rank) ?? index + 1,
      characterName: safeString(raw.name),
      esoClass: safeString(raw.class),
      spec: safeString(raw.spec),
      amount,
      durationMs,
      startTimeMs: safeNumber(raw.startTime),
      hardModeLevel: safeNumber(raw.hardModeLevel),
      bracketData: safeNumber(raw.bracketData),
      reportCode,
      fightId: safeNumber(report?.fightID),
      reportStartMs: safeNumber(report?.startTime),
      serverName: safeString(server?.name),
      serverRegion: safeString(server?.region),
      guildName: safeString(guild?.name),
      gear: parseGear(readCombatantArray(raw, 'gear')),
      talents: parseTalents(readCombatantArray(raw, 'talents')),
      sets: parseSets(safeArray(raw.sets)),
    },
  };
}

// ─── Guards ──────────────────────────────────────────────────────────────────

/**
 * True when the entry carries a usable build. Roughly 19% of ranked entries come
 * back with combat info stripped; they rank fine but say nothing about builds, so
 * the ingest drops them rather than storing an empty signature.
 *
 * "Usable" means at least MIN_REAL_GEAR_PIECES real pieces — a lone id>0 item in
 * an otherwise padded array is stripping, not a build.
 */
export function hasRealCombatantInfo(entry: ParsedCharacterRanking): boolean {
  return entry.gear.length >= MIN_REAL_GEAR_PIECES && entry.talents.length > 0;
}

/**
 * ESO Logs' `spec` doubles as the role. Only damage specs belong in a DPS
 * leaderboard — observed values include MagickaDPS, StaminaDPS, WerewolfDPS,
 * Tank and (on healing encounters) Healer.
 */
export function isDpsSpec(spec: string | undefined): boolean {
  if (!spec) return false;
  const normalized = spec.toLowerCase();
  if (normalized.includes('tank') || normalized.includes('heal')) return false;
  return normalized.includes('dps');
}

// ─── Page parsing ────────────────────────────────────────────────────────────

/** Unwraps a `{ data: {...} }` envelope if one ever appears. */
function unwrapEnvelope(value: unknown): unknown {
  if (isRecord(value) && isRecord(value.data) && !Array.isArray(value.rankings)) {
    return value.data;
  }
  return value;
}

function extractRankingsArray(value: unknown): unknown[] {
  if (!isRecord(value)) return [];
  for (const key of ['rankings', 'data']) {
    const candidate = value[key];
    if (Array.isArray(candidate)) return candidate;
  }
  return [];
}

/**
 * Parse one page of `characterRankings`.
 *
 * Contract: NEVER throws. Any unparseable input yields an empty page, because a
 * malformed response from one encounter must not abort a whole cron run.
 */
export function parseCharacterRankingsPage(
  raw: unknown,
  pageHint = 1,
): ParsedCharacterRankingsPage {
  const empty: ParsedCharacterRankingsPage = {
    rankings: [],
    page: pageHint,
    hasMorePages: false,
    dropped: { stubbed: 0, malformed: 0, trivial: 0 },
  };

  let value: unknown = raw;
  if (typeof raw === 'string') {
    try {
      value = JSON.parse(raw);
    } catch {
      return empty;
    }
  }

  const envelope = unwrapEnvelope(value);
  if (!isRecord(envelope)) return empty;

  const rawRankings = extractRankingsArray(envelope);
  const rankings: ParsedCharacterRanking[] = [];
  let stubbed = 0;
  let malformed = 0;
  let trivial = 0;

  rawRankings.forEach((item, index) => {
    const result = parseEntry(item, index);
    if (!result.ok) {
      if (result.reason === 'trivial') trivial++;
      else malformed++;
      return;
    }
    if (!hasRealCombatantInfo(result.ranking)) {
      stubbed++;
      return;
    }
    rankings.push(result.ranking);
  });

  return {
    rankings,
    page: safeNumber(envelope.page) ?? pageHint,
    // Tolerate a snake_case variant even though the API returns camelCase.
    hasMorePages: Boolean(envelope.hasMorePages ?? envelope.has_more_pages ?? false),
    count: safeNumber(envelope.count),
    dropped: { stubbed, malformed, trivial },
  };
}
