/**
 * ESOTK Companion saved-variables parser.
 *
 * Reads the `ESOTKCompanionSV` file written by the in-game ESOTK Companion add-on
 * (see `addon/ESOTKCompanion/`) and normalises it into typed build snapshots.
 *
 * This is the data ESO Logs structurally cannot provide: the encounter log carries
 * champion-point *rank* and the slotted stars (as buffs) but never the full point
 * *allocation*, and the ESO Logs API exposes neither the allocation nor final stats
 * (crit / penetration / recovery). The add-on captures them live; this parser turns
 * the on-disk Lua into objects the rest of ESOTK can match to a report and render.
 */

import { Logger } from '@/utils/logger';

import { parseLuaAssignments, type LuaValue } from './wizardsWardrobeSavedVariables';

const logger = new Logger({ contextPrefix: 'ESOTKCompanionParser' });

/** Champion-point allocation for a single discipline (Craft / Warfare / Fitness). */
export interface CompanionCpDiscipline {
  id: number;
  /** ESO discipline type enum, if captured. */
  type?: number;
  /** Total points spent in this discipline. */
  spent?: number;
  /** Points spent per champion skill, keyed by skill id. The core gap ESO Logs lacks. */
  skills: Record<number, number>;
}

/** Full champion-point state for a snapshot. */
export interface CompanionChampionPoints {
  /** Total earned champion points (CP rank). */
  total?: number;
  /** Per-discipline allocation, keyed by discipline id. */
  disciplines: Record<number, CompanionCpDiscipline>;
  /** The 12 slotted stars, keyed by slot (1-12) → champion skill id. */
  slotted: Record<number, number>;
  /**
   * Client-provided star names, keyed by champion skill id. Ground truth from the game
   * (localized), used as a fallback when ESOTK's canonical id→name map doesn't know an id
   * — so even obscure passive stars read cleanly. Absent on pre-name-capture snapshots.
   */
  names?: Record<number, string>;
}

/** Final derived stats the log/API never carries. */
export interface CompanionStats {
  maxMagicka?: number;
  maxHealth?: number;
  maxStamina?: number;
  spellDamage?: number;
  weaponDamage?: number;
  spellCrit?: number;
  weaponCrit?: number;
  /**
   * Crit damage percent. NOT captured by the addon — ESO exposes no crit-damage stat
   * constant, so ESOTK computes it from CP + sets + mundus. Kept optional/defensive in
   * case a future source provides it; expect it to be undefined from real snapshots.
   */
  critDamage?: number;
  spellPen?: number;
  physicalPen?: number;
  magickaRegen?: number;
  staminaRegen?: number;
  healthRegen?: number;
  physicalResist?: number;
  spellResist?: number;
  critResist?: number;
}

/** Attribute point split. */
export interface CompanionAttributes {
  magicka?: number;
  health?: number;
  stamina?: number;
}

/** A long-term effect (mundus is permanent; food/drink is long). */
export interface CompanionEffect {
  id: number;
  name?: string;
  /** Duration in ms; 0 means permanent (e.g. mundus). */
  duration?: number;
}

/** One active scribing script slotted on a crafted ability. */
export interface CompanionScribingScript {
  id: number;
  /** Script slot: 1 = focus, 2 = signature, 3 = affix. */
  slot?: number;
  name?: string;
  icon?: string;
}

/** One scribed skill captured from the local action bars. */
export interface CompanionScribedSkill {
  /** Crafted ability / grimoire id from the action slot. */
  abilityId: number;
  name?: string;
  bar?: string;
  slot?: number;
  /** Active scripts keyed by script slot. */
  scripts: Record<number, CompanionScribingScript>;
}

/** One captured build snapshot, taken on combat end or on demand. */
export interface CompanionSnapshot {
  schemaVersion?: number;
  season?: string;
  /** UNIX seconds (server/UTC) from GetTimeStamp() — primary match key vs report time. */
  ts: number;
  /** Character name — match key vs report masterData actors. */
  char: string;
  /** Account (@display) — kept locally, not used for matching (API may not expose it). */
  account?: string;
  /** Server / world (e.g. "NA") — disambiguates name collisions. */
  server?: string;
  zoneId?: number;
  classId?: number;
  className?: string;
  raceId?: number;
  raceName?: string;
  level?: number;
  cpRank?: number;
  role?: number;
  /** How the snapshot was taken: "combatEnd" | "manual". */
  reason?: string;
  championPoints?: CompanionChampionPoints;
  stats?: CompanionStats;
  attributes?: CompanionAttributes;
  effects?: CompanionEffect[];
  bars?: { front?: Record<number, number>; back?: Record<number, number> };
  scribing?: CompanionScribedSkill[];
}

/** Parsed companion file: snapshots grouped by account. */
export interface CompanionParseResult {
  schemaVersion: number;
  season?: string;
  /** Snapshots keyed by account display name. */
  byAccount: Record<string, CompanionSnapshot[]>;
  /** All snapshots flattened, newest last. */
  all: CompanionSnapshot[];
}

const SV_TABLE_NAME = 'ESOTKCompanionSV';

function isRecord(v: unknown): v is Record<string, LuaValue> {
  return typeof v === 'object' && v !== null && !Array.isArray(v);
}

function asNumber(v: LuaValue | undefined): number | undefined {
  return typeof v === 'number' ? v : undefined;
}

function asString(v: LuaValue | undefined): string | undefined {
  return typeof v === 'string' ? v : undefined;
}

/**
 * Lua tables with numeric keys may be parsed as a JS array (1-indexed Lua → 0-indexed
 * JS) or as an object with numeric-string keys ("1", "2", …), and sparse tables almost
 * always become objects. Normalise both to `[luaKey, value]` pairs so callers don't
 * care which representation the parser produced.
 */
function numericEntries(v: LuaValue | undefined): Array<[number, LuaValue]> {
  const out: Array<[number, LuaValue]> = [];
  if (Array.isArray(v)) {
    v.forEach((item, i) => {
      if (item !== null && item !== undefined) out.push([i + 1, item]); // restore Lua 1-index
    });
  } else if (isRecord(v)) {
    for (const [k, val] of Object.entries(v)) {
      const n = Number(k);
      if (Number.isFinite(n) && val !== null && val !== undefined) out.push([n, val]);
    }
  }
  return out;
}

/** Values of a numeric-keyed Lua table, ordered by key. */
function luaArray(v: LuaValue | undefined): LuaValue[] {
  return numericEntries(v)
    .sort((a, b) => a[0] - b[0])
    .map(([, val]) => val);
}

/** Build a `{ [numericId]: number }` map from a Lua table of numeric→numeric entries. */
function numericMap(v: LuaValue | undefined): Record<number, number> {
  const out: Record<number, number> = {};
  for (const [id, val] of numericEntries(v)) {
    const n = asNumber(val);
    if (typeof n === 'number') out[id] = n;
  }
  return out;
}

/** Build a `{ [numericId]: string }` map from a Lua table of numeric→string entries. */
function numericStringMap(v: LuaValue | undefined): Record<number, string> {
  const out: Record<number, string> = {};
  for (const [id, val] of numericEntries(v)) {
    if (typeof val === 'string' && val) out[id] = val;
  }
  return out;
}

function normalizeChampionPoints(v: LuaValue | undefined): CompanionChampionPoints | undefined {
  if (!isRecord(v)) return undefined;
  const disciplines: Record<number, CompanionCpDiscipline> = {};
  for (const [id, d] of numericEntries(v.disciplines)) {
    if (!isRecord(d)) continue;
    disciplines[id] = {
      id: asNumber(d.id) ?? id,
      type: asNumber(d.type),
      spent: asNumber(d.spent),
      skills: numericMap(d.skills),
    };
  }
  const names = numericStringMap(v.names);
  return {
    total: asNumber(v.total),
    disciplines,
    slotted: numericMap(v.slotted),
    ...(Object.keys(names).length > 0 ? { names } : {}),
  };
}

function normalizeStats(v: LuaValue | undefined): CompanionStats | undefined {
  if (!isRecord(v)) return undefined;
  const keys: (keyof CompanionStats)[] = [
    'maxMagicka',
    'maxHealth',
    'maxStamina',
    'spellDamage',
    'weaponDamage',
    'spellCrit',
    'weaponCrit',
    'critDamage',
    'spellPen',
    'physicalPen',
    'magickaRegen',
    'staminaRegen',
    'healthRegen',
    'physicalResist',
    'spellResist',
    'critResist',
  ];
  const out: CompanionStats = {};
  for (const key of keys) {
    const n = asNumber(v[key]);
    if (typeof n === 'number') out[key] = n;
  }
  return out;
}

function normalizeEffects(v: LuaValue | undefined): CompanionEffect[] | undefined {
  const arr = luaArray(v);
  if (arr.length === 0) return undefined;
  const out: CompanionEffect[] = [];
  for (const item of arr) {
    if (!isRecord(item)) continue;
    const id = asNumber(item.id);
    if (typeof id !== 'number') continue;
    out.push({ id, name: asString(item.name), duration: asNumber(item.duration) });
  }
  return out.length > 0 ? out : undefined;
}

function normalizeScribing(v: LuaValue | undefined): CompanionScribedSkill[] | undefined {
  const arr = luaArray(v);
  if (arr.length === 0) return undefined;

  const out: CompanionScribedSkill[] = [];
  for (const item of arr) {
    if (!isRecord(item)) continue;
    const abilityId = asNumber(item.abilityId);
    if (typeof abilityId !== 'number') continue;

    const scripts: Record<number, CompanionScribingScript> = {};
    for (const [scriptSlot, scriptRaw] of numericEntries(item.scripts)) {
      if (!isRecord(scriptRaw)) continue;
      const id = asNumber(scriptRaw.id);
      if (typeof id !== 'number') continue;
      const slot = asNumber(scriptRaw.slot) ?? scriptSlot;
      scripts[slot] = {
        id,
        slot,
        name: asString(scriptRaw.name),
        icon: asString(scriptRaw.icon),
      };
    }

    if (Object.keys(scripts).length === 0) continue;
    out.push({
      abilityId,
      name: asString(item.name),
      bar: asString(item.bar),
      slot: asNumber(item.slot),
      scripts,
    });
  }

  return out.length > 0 ? out : undefined;
}

interface SnapshotDefaults {
  account?: string;
  schemaVersion?: number;
  season?: string;
}

function normalizeSnapshot(v: LuaValue, defaults: SnapshotDefaults = {}): CompanionSnapshot | null {
  if (!isRecord(v)) return null;
  const ts = asNumber(v.ts);
  const char = asString(v.char);
  // ts + char are the match keys; without them the snapshot is unusable.
  if (typeof ts !== 'number' || !char) return null;

  const attrsRaw = v.attrs;
  const attributes: CompanionAttributes | undefined = isRecord(attrsRaw)
    ? {
        magicka: asNumber(attrsRaw.magicka),
        health: asNumber(attrsRaw.health),
        stamina: asNumber(attrsRaw.stamina),
      }
    : undefined;

  const barsRaw = v.bars;
  const bars = isRecord(barsRaw)
    ? { front: numericMap(barsRaw.front), back: numericMap(barsRaw.back) }
    : undefined;

  return {
    schemaVersion: asNumber(v.schemaVersion) ?? defaults.schemaVersion,
    season: asString(v.season) ?? defaults.season,
    ts,
    char,
    account: asString(v.account) ?? defaults.account,
    server: asString(v.server),
    zoneId: asNumber(v.zoneId),
    classId: asNumber(v.classId),
    className: asString(v.className),
    raceId: asNumber(v.raceId),
    raceName: asString(v.raceName),
    level: asNumber(v.level),
    cpRank: asNumber(v.cpRank),
    role: asNumber(v.role),
    reason: asString(v.reason),
    championPoints: normalizeChampionPoints(v.cp),
    stats: normalizeStats(v.stats),
    attributes,
    effects: normalizeEffects(v.effects),
    bars,
    scribing: normalizeScribing(v.scribing),
  };
}

/** Quick check whether a Lua file looks like an ESOTK Companion save. */
export function isESOTKCompanionFormat(luaContent: string): boolean {
  return luaContent.includes(SV_TABLE_NAME) && luaContent.includes('Default');
}

/**
 * Parse an `ESOTKCompanionSV` saved-variables file into typed snapshots.
 * Returns `null` when the file is not an ESOTK Companion save.
 */
export function parseESOTKCompanionSavedVariables(luaContent: string): CompanionParseResult | null {
  let assignments: Record<string, LuaValue>;
  try {
    assignments = parseLuaAssignments(luaContent);
  } catch (error) {
    const err = error instanceof Error ? error : new Error(String(error));
    logger.debug('Failed to parse Lua', { error: err.message });
    return null;
  }

  const root = assignments[SV_TABLE_NAME];
  if (!isRecord(root)) {
    return null;
  }

  // ZO_SavedVars layout: ESOTKCompanionSV.Default["@account"]["$AccountWide"].snapshots
  const defaultData = root.Default;
  if (!isRecord(defaultData)) {
    return null;
  }

  const byAccount: Record<string, CompanionSnapshot[]> = {};
  const all: CompanionSnapshot[] = [];
  let schemaVersion = 1;
  let season: string | undefined;

  for (const accountKey of Object.keys(defaultData)) {
    const accountData = defaultData[accountKey];
    if (!isRecord(accountData)) continue;

    // Account-wide bucket holds our data; tolerate per-character buckets too.
    const buckets: LuaValue[] = [];
    if (isRecord(accountData.$AccountWide)) buckets.push(accountData.$AccountWide);
    for (const key of Object.keys(accountData)) {
      if (key !== '$AccountWide' && isRecord(accountData[key])) buckets.push(accountData[key]);
    }

    const accountSnapshots: CompanionSnapshot[] = [];
    for (const bucket of buckets) {
      if (!isRecord(bucket)) continue;
      const sv = asNumber(bucket.schemaVersion);
      if (typeof sv === 'number') schemaVersion = sv;
      const s = asString(bucket.season);
      if (s) season = s;

      for (const snapRaw of luaArray(bucket.snapshots)) {
        const snap = normalizeSnapshot(snapRaw, {
          account: accountKey,
          schemaVersion: sv,
          season: s,
        });
        if (snap) accountSnapshots.push(snap);
      }
    }

    if (accountSnapshots.length > 0) {
      accountSnapshots.sort((a, b) => a.ts - b.ts);
      byAccount[accountKey] = accountSnapshots;
      all.push(...accountSnapshots);
    }
  }

  if (all.length === 0) {
    logger.info('ESOTKCompanionSV found but contained no usable snapshots');
    return null;
  }

  all.sort((a, b) => a.ts - b.ts);
  logger.info('Parsed ESOTK Companion snapshots', {
    accounts: Object.keys(byAccount).length,
    snapshots: all.length,
    season,
  });

  return { schemaVersion, season, byAccount, all };
}
