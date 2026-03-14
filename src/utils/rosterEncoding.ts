/**
 * Shared roster encoding/decoding utilities for URL sharing.
 *
 * Implements a two-layer compression scheme:
 *   v2: compact JSON (short keys, integer look-ups) → deflate-raw → base64url
 *   v1: plain JSON → btoa(encodeURIComponent) — legacy, decode only
 *
 * The result is placed in the `?r=` query parameter and is typically ~60-80 % smaller
 * than naïve base64 encoding.
 */

import { KnownSetIDs } from '../types/abilities';
import {
  CLASS_SKILL_LINES,
  SupportUltimate,
  HealerBuff,
  HealerChampionPoint,
  JailDDType,
  RaidRoster,
  TankSetup,
  TankGearSet,
  HealerSetup,
  DPSSlot,
  SkillLineConfig,
  defaultTankSetup,
  defaultHealerSetup,
  createDefaultDPSSlots,
} from '../types/roster';
import type {
  TrialBuildOverrides,
  EncounterOverrides,
  PlayerOverride,
} from '../types/trial-encounters';

import { Logger, LogLevel } from './logger';

const logger = new Logger({ level: LogLevel.WARN, contextPrefix: 'rosterEncoding' });

// ============================================================
// Compact interfaces — short key names for minimal JSON size
// ============================================================

export interface CompactSkills {
  l1?: number | string; // line1: CLASS_SKILL_LINES index or custom string
  l2?: number | string; // line2: CLASS_SKILL_LINES index or custom string
  l3?: number | string; // line3: CLASS_SKILL_LINES index or custom string
  fl?: 1; // isFlex (only stored when true)
  no?: string; // notes
}

export interface CompactGear {
  s1?: number; // set1
  s2?: number; // set2
  ms?: number; // monsterSet
  a?: number[]; // additionalSets
  no?: string; // notes
}

export interface CompactGroup {
  g?: string; // groupName
  n?: number; // groupNumber
}

export interface CompactTank {
  pn?: string; // playerName
  pi?: number; // playerNumber
  rl?: string; // roleLabel
  lb?: string[]; // labels
  gs?: CompactGear; // gearSets
  sl?: CompactSkills; // skillLines
  ul?: number | string; // ultimate: SupportUltimate index or custom string
  ss?: string[]; // specificSkills
  grs?: string[]; // groups (multi-group memberships)
  gr?: CompactGroup; // @deprecated — legacy single group, decode only
  no?: string; // notes
}

export interface CompactHealer {
  pn?: string; // playerName
  pi?: number; // playerNumber
  rl?: string; // roleLabel
  lb?: string[]; // labels
  s1?: number; // set1
  s2?: number; // set2
  ms?: number; // monsterSet
  aw?: string; // arenaWeapon (free text)
  a?: number[]; // additionalSets
  sl?: CompactSkills; // skillLines
  hb?: number; // healerBuff: HealerBuff index
  cp?: number; // championPoint: HealerChampionPoint index
  ul?: number | string; // ultimate: SupportUltimate index or custom string
  grs?: string[]; // groups (multi-group memberships)
  gr?: CompactGroup; // @deprecated — legacy single group, decode only
  no?: string; // notes
}

export interface CompactDPS {
  sn: number; // slotNumber (required)
  pn?: string; // playerName
  pi?: number; // playerNumber
  rl?: string; // roleLabel
  lb?: string[]; // labels
  s1?: number; // set1 (primary 5-piece)
  s2?: number; // set2 (secondary 5-piece)
  ms?: number; // monsterSet
  aw?: string; // arenaWeapon (free text)
  as?: number[]; // additionalSets
  gs?: number[]; // legacy gearSets (backward compat decode only)
  sl?: CompactSkills; // skillLines
  cp?: string; // championPoint
  ul?: number | string; // ultimate: SupportUltimate index or custom string
  grs?: string[]; // groups (multi-group memberships)
  gr?: CompactGroup; // @deprecated — legacy single group, decode only
  no?: string; // notes
  jt?: number; // jailDDType index
  cd?: string; // customDescription
}

/** Compact representation of a PlayerOverride (per-fight set/ultimate/notes changes) */
export interface CompactPlayerOverride {
  s1?: number; // set1
  s2?: number; // set2
  ms?: number; // monsterSet
  ul?: string | null; // ultimate
  no?: string; // notes
}

/** Compact representation of EncounterOverrides (overrides per player for one encounter) */
export interface CompactEncounterOverrides {
  t1?: CompactPlayerOverride; // tank1
  t2?: CompactPlayerOverride; // tank2
  h1?: CompactPlayerOverride; // healer1
  h2?: CompactPlayerOverride; // healer2
  dp?: Array<{ sn: number } & CompactPlayerOverride>; // dpsSlots (sparse)
}

/** Compact representation of TrialBuildOverrides */
export interface CompactTrialOverrides {
  ti: string; // trialId
  sa: boolean; // useSameBuildForAll
  eb: Record<string, CompactEncounterOverrides>; // encounterBuilds
}

export interface CompactRoster {
  v: 2; // version marker
  n?: string; // rosterName
  t1?: CompactTank;
  t2?: CompactTank;
  h1?: CompactHealer;
  h2?: CompactHealer;
  dp?: CompactDPS[]; // only filled DPS slots
  ag?: string[]; // availableGroups
  no?: string; // notes
  to?: CompactTrialOverrides; // trialOverrides (per-fight builds)
}

// ============================================================
// Look-up tables for encoding/decoding fixed-vocabulary strings
// ============================================================

const SKILL_LINE_TO_IDX = new Map(CLASS_SKILL_LINES.map((sl, i) => [sl, i] as const));
const ULTIMATE_LIST = Object.values(SupportUltimate); // 4 preset ultimates
const ULTIMATE_TO_IDX = new Map(ULTIMATE_LIST.map((u, i) => [u, i] as const));
const HEALER_BUFF_LIST = Object.values(HealerBuff); // 2 values
const HEALER_BUFF_TO_IDX = new Map(HEALER_BUFF_LIST.map((b, i) => [b, i] as const));
const CHAMPION_POINT_LIST = Object.values(HealerChampionPoint); // 2 values
const CHAMPION_POINT_TO_IDX = new Map(CHAMPION_POINT_LIST.map((cp, i) => [cp, i] as const));
const JAIL_DD_TYPE_LIST: JailDDType[] = ['banner', 'zenkosh', 'wm', 'wm-mk', 'mk', 'custom'];
const JAIL_DD_TYPE_TO_IDX = new Map(JAIL_DD_TYPE_LIST.map((t, i) => [t, i] as const));

// ============================================================
// Primitive encode/decode helpers
// ============================================================

/**
 * Safely validate a number is a valid enum index in an array
 */
function isValidEnumIndex(value: number, arrayLength: number): boolean {
  return Number.isInteger(value) && value >= 0 && value < arrayLength;
}

/**
 * Safely convert a number to KnownSetIDs, returning undefined if invalid
 * Since KnownSetIDs is a numeric enum, we can't validate the exact values,
 * but we can at least ensure it's a safe integer
 */
function toValidSetId(value: unknown): KnownSetIDs | undefined {
  if (typeof value === 'number' && Number.isInteger(value) && value >= 0) {
    return value as KnownSetIDs;
  }
  return undefined;
}

function encodeSkillLine(s?: string): number | string | undefined {
  if (!s) return undefined;
  const idx = SKILL_LINE_TO_IDX.get(s as (typeof CLASS_SKILL_LINES)[number]);
  return idx !== undefined ? idx : s;
}

function decodeSkillLine(v?: number | string): string {
  if (v == null) return '';
  if (typeof v === 'number') {
    return isValidEnumIndex(v, CLASS_SKILL_LINES.length) ? CLASS_SKILL_LINES[v] : '';
  }
  return v;
}

function encodeUltimate(u?: string | null): number | string | undefined {
  if (!u) return undefined;
  const idx = ULTIMATE_TO_IDX.get(u as SupportUltimate);
  return idx !== undefined ? idx : u;
}

function decodeUltimate(v?: number | string): string | null {
  if (v == null) return null;
  if (typeof v === 'number') {
    return isValidEnumIndex(v, ULTIMATE_LIST.length) ? (ULTIMATE_LIST[v] ?? null) : null;
  }
  return v;
}

function compactSkills(sl: SkillLineConfig): CompactSkills | undefined {
  const c: CompactSkills = {};
  const l1 = encodeSkillLine(sl.line1);
  if (l1 != null) c.l1 = l1;
  const l2 = encodeSkillLine(sl.line2);
  if (l2 != null) c.l2 = l2;
  const l3 = encodeSkillLine(sl.line3);
  if (l3 != null) c.l3 = l3;
  if (sl.isFlex) c.fl = 1;
  if (sl.notes) c.no = sl.notes;
  return Object.keys(c).length > 0 ? c : undefined;
}

function expandSkills(c?: CompactSkills): SkillLineConfig {
  return {
    line1: decodeSkillLine(c?.l1),
    line2: decodeSkillLine(c?.l2),
    line3: decodeSkillLine(c?.l3),
    isFlex: c?.fl === 1,
    notes: c?.no,
  };
}

function compactGear(gs: TankGearSet): CompactGear | undefined {
  const c: CompactGear = {};
  if (gs.set1 != null) c.s1 = gs.set1 as number;
  if (gs.set2 != null) c.s2 = gs.set2 as number;
  if (gs.monsterSet != null) c.ms = gs.monsterSet as number;
  if (gs.additionalSets?.length) c.a = gs.additionalSets as number[];
  if (gs.notes) c.no = gs.notes;
  return Object.keys(c).length > 0 ? c : undefined;
}

function expandGear(c?: CompactGear): TankGearSet {
  return {
    set1: toValidSetId(c?.s1),
    set2: toValidSetId(c?.s2),
    monsterSet: toValidSetId(c?.ms),
    additionalSets: c?.a?.map(toValidSetId).filter((id) => id !== undefined) as
      | KnownSetIDs[]
      | undefined,
    notes: c?.no,
  };
}

/** Encode groups array; returns undefined when empty. */
function compactGroups(groups?: string[]): string[] | undefined {
  return groups?.length ? groups : undefined;
}

/**
 * Decode groups from the new `grs` field, falling back to the legacy single
 * `gr` CompactGroup so that old share URLs continue to decode correctly.
 */
function expandGroups(grs?: string[], gr?: CompactGroup): string[] | undefined {
  if (grs?.length) return grs;
  if (gr?.g) return [gr.g];
  return undefined;
}

function compactTank(t: TankSetup): CompactTank {
  const c: CompactTank = {};
  if (t.playerName) c.pn = t.playerName;
  if (t.playerNumber != null) c.pi = t.playerNumber;
  if (t.roleLabel) c.rl = t.roleLabel;
  if (t.labels?.length) c.lb = t.labels;
  const gs = compactGear(t.gearSets);
  if (gs) c.gs = gs;
  const sl = compactSkills(t.skillLines);
  if (sl) c.sl = sl;
  const ul = encodeUltimate(t.ultimate);
  if (ul != null) c.ul = ul;
  if (t.specificSkills?.length) c.ss = t.specificSkills;
  const grs = compactGroups(t.groups);
  if (grs) c.grs = grs;
  if (t.notes) c.no = t.notes;
  return c;
}

function expandTank(c?: CompactTank): TankSetup {
  return {
    ...defaultTankSetup(),
    playerName: c?.pn,
    playerNumber: c?.pi,
    roleLabel: c?.rl,
    labels: c?.lb,
    gearSets: expandGear(c?.gs),
    skillLines: expandSkills(c?.sl),
    ultimate: decodeUltimate(c?.ul),
    specificSkills: c?.ss ?? [],
    groups: expandGroups(c?.grs, c?.gr),
    notes: c?.no,
  };
}

function compactHealer(h: HealerSetup): CompactHealer {
  const c: CompactHealer = {};
  if (h.playerName) c.pn = h.playerName;
  if (h.playerNumber != null) c.pi = h.playerNumber;
  if (h.roleLabel) c.rl = h.roleLabel;
  if (h.labels?.length) c.lb = h.labels;
  if (h.set1 != null) c.s1 = h.set1 as number;
  if (h.set2 != null) c.s2 = h.set2 as number;
  if (h.monsterSet != null) c.ms = h.monsterSet as number;
  if (h.arenaWeapon) c.aw = h.arenaWeapon;
  if (h.additionalSets?.length) c.a = h.additionalSets as number[];
  const sl = compactSkills(h.skillLines);
  if (sl) c.sl = sl;
  if (h.healerBuff != null) {
    const idx = HEALER_BUFF_TO_IDX.get(h.healerBuff);
    if (idx !== undefined) c.hb = idx;
  }
  if (h.championPoint != null) {
    const idx = CHAMPION_POINT_TO_IDX.get(h.championPoint);
    if (idx !== undefined) c.cp = idx;
  }
  const ul = encodeUltimate(h.ultimate);
  if (ul != null) c.ul = ul;
  const grs = compactGroups(h.groups);
  if (grs) c.grs = grs;
  if (h.notes) c.no = h.notes;
  return c;
}

function expandHealer(c?: CompactHealer): HealerSetup {
  return {
    ...defaultHealerSetup(),
    playerName: c?.pn,
    playerNumber: c?.pi,
    roleLabel: c?.rl,
    labels: c?.lb,
    set1: toValidSetId(c?.s1),
    set2: toValidSetId(c?.s2),
    monsterSet: toValidSetId(c?.ms),
    arenaWeapon: c?.aw,
    additionalSets: c?.a?.map(toValidSetId).filter((id) => id !== undefined) as
      | KnownSetIDs[]
      | undefined,
    skillLines: expandSkills(c?.sl),
    healerBuff:
      c?.hb != null
        ? isValidEnumIndex(c.hb, HEALER_BUFF_LIST.length)
          ? (HEALER_BUFF_LIST[c.hb] as HealerBuff)
          : null
        : null,
    championPoint:
      c?.cp != null
        ? isValidEnumIndex(c.cp, CHAMPION_POINT_LIST.length)
          ? (CHAMPION_POINT_LIST[c.cp] as HealerChampionPoint)
          : null
        : null,
    ultimate: decodeUltimate(c?.ul),
    groups: expandGroups(c?.grs, c?.gr),
    notes: c?.no,
  };
}

function compactDPS(d: DPSSlot): CompactDPS {
  const c: CompactDPS = { sn: d.slotNumber };
  if (d.playerName) c.pn = d.playerName;
  if (d.playerNumber != null) c.pi = d.playerNumber;
  if (d.roleLabel) c.rl = d.roleLabel;
  if (d.labels?.length) c.lb = d.labels;
  if (d.set1 != null) c.s1 = d.set1 as number;
  if (d.set2 != null) c.s2 = d.set2 as number;
  if (d.monsterSet != null) c.ms = d.monsterSet as number;
  if (d.additionalSets?.length) c.as = d.additionalSets as number[];
  const sl = d.skillLines ? compactSkills(d.skillLines) : undefined;
  if (sl) c.sl = sl;
  if (d.championPoint) c.cp = d.championPoint;
  const ul = encodeUltimate(d.ultimate);
  if (ul != null) c.ul = ul;
  const grs = compactGroups(d.groups);
  if (grs) c.grs = grs;
  if (d.arenaWeapon) c.aw = d.arenaWeapon;
  if (d.notes) c.no = d.notes;
  if (d.jailDDType) {
    const idx = JAIL_DD_TYPE_TO_IDX.get(d.jailDDType);
    if (idx !== undefined) c.jt = idx;
  }
  if (d.customDescription) c.cd = d.customDescription;
  return c;
}

function expandDPS(c: CompactDPS): DPSSlot {
  // Legacy migration: if old compact data has gs but no structured s1/s2, promote to set1/set2
  const legacySet1 = c.gs && c.s1 == null ? toValidSetId(c.gs[0]) : undefined;
  const legacySet2 = c.gs && c.s2 == null ? toValidSetId(c.gs[1]) : undefined;
  const legacyAdditional =
    c.gs && c.s1 == null && c.s2 == null
      ? (c.gs
          .slice(2)
          .map(toValidSetId)
          .filter((id) => id !== undefined) as KnownSetIDs[])
      : undefined;

  return {
    slotNumber: c.sn,
    playerName: c.pn,
    playerNumber: c.pi,
    roleLabel: c.rl,
    labels: c.lb,
    set1: toValidSetId(c.s1) ?? legacySet1,
    set2: toValidSetId(c.s2) ?? legacySet2,
    monsterSet: toValidSetId(c.ms),
    arenaWeapon: c.aw,
    additionalSets:
      c.as != null
        ? (c.as.map(toValidSetId).filter((id) => id !== undefined) as KnownSetIDs[])
        : legacyAdditional,
    skillLines: c.sl ? expandSkills(c.sl) : undefined,
    championPoint: c.cp || undefined,
    ultimate: c.ul != null ? decodeUltimate(c.ul) : null,
    groups: expandGroups(c.grs, c.gr),
    notes: c.no,
    jailDDType:
      c.jt != null
        ? isValidEnumIndex(c.jt, JAIL_DD_TYPE_LIST.length)
          ? JAIL_DD_TYPE_LIST[c.jt]
          : undefined
        : undefined,
    customDescription: c.cd,
  };
}

// ============================================================
// Per-fight build (TrialBuildOverrides) compact/expand helpers
// ============================================================

function compactPlayerOverride(o: PlayerOverride): CompactPlayerOverride {
  const c: CompactPlayerOverride = {};
  if (o.set1 != null) c.s1 = o.set1;
  if (o.set2 != null) c.s2 = o.set2;
  if (o.monsterSet != null) c.ms = o.monsterSet;
  if (o.ultimate !== undefined) c.ul = o.ultimate;
  if (o.notes) c.no = o.notes;
  return c;
}

function expandPlayerOverride(c: CompactPlayerOverride): PlayerOverride {
  const o: PlayerOverride = {};
  if (c.s1 != null) o.set1 = c.s1;
  if (c.s2 != null) o.set2 = c.s2;
  if (c.ms != null) o.monsterSet = c.ms;
  if (c.ul !== undefined) o.ultimate = c.ul;
  if (c.no) o.notes = c.no;
  return o;
}

function compactEncounterOverrides(o: EncounterOverrides): CompactEncounterOverrides {
  const c: CompactEncounterOverrides = {};
  if (o.tank1) c.t1 = compactPlayerOverride(o.tank1);
  if (o.tank2) c.t2 = compactPlayerOverride(o.tank2);
  if (o.healer1) c.h1 = compactPlayerOverride(o.healer1);
  if (o.healer2) c.h2 = compactPlayerOverride(o.healer2);
  if (o.dpsSlots?.length) {
    c.dp = o.dpsSlots.map((s) => ({ sn: s.slotNumber, ...compactPlayerOverride(s) }));
  }
  return c;
}

function expandEncounterOverrides(c: CompactEncounterOverrides): EncounterOverrides {
  const o: EncounterOverrides = {};
  if (c.t1) o.tank1 = expandPlayerOverride(c.t1);
  if (c.t2) o.tank2 = expandPlayerOverride(c.t2);
  if (c.h1) o.healer1 = expandPlayerOverride(c.h1);
  if (c.h2) o.healer2 = expandPlayerOverride(c.h2);
  if (c.dp?.length) {
    o.dpsSlots = c.dp.map(({ sn, ...rest }) => ({ slotNumber: sn, ...expandPlayerOverride(rest) }));
  }
  return o;
}

function compactTrialOverrides(t: TrialBuildOverrides): CompactTrialOverrides {
  const eb: Record<string, CompactEncounterOverrides> = {};
  for (const [encId, overrides] of Object.entries(t.encounterBuilds)) {
    eb[encId] = compactEncounterOverrides(overrides);
  }
  return { ti: t.trialId, sa: t.useSameBuildForAll, eb };
}

function expandTrialOverrides(c: CompactTrialOverrides): TrialBuildOverrides {
  const encounterBuilds: Record<string, EncounterOverrides> = {};
  for (const [encId, compact] of Object.entries(c.eb)) {
    encounterBuilds[encId] = expandEncounterOverrides(compact);
  }
  return { trialId: c.ti, useSameBuildForAll: c.sa, encounterBuilds };
}

// ============================================================
// Top-level compact/expand for a full roster
// ============================================================

export function compactifyRoster(roster: RaidRoster): CompactRoster {
  const c: CompactRoster = { v: 2 };
  if (roster.rosterName && roster.rosterName !== 'New Roster') c.n = roster.rosterName;
  c.t1 = compactTank(roster.tank1);
  c.t2 = compactTank(roster.tank2);
  c.h1 = compactHealer(roster.healer1);
  c.h2 = compactHealer(roster.healer2);
  const filledSlots = roster.dpsSlots.filter(
    (slot) =>
      slot.playerName ||
      slot.playerNumber != null ||
      slot.roleLabel ||
      slot.labels?.length ||
      slot.set1 != null ||
      slot.set2 != null ||
      slot.monsterSet != null ||
      slot.additionalSets?.length ||
      slot.gearSets?.length ||
      slot.championPoint ||
      slot.ultimate ||
      slot.jailDDType ||
      slot.notes ||
      slot.groups?.length ||
      slot.group ||
      slot.skillLines ||
      slot.championPoint,
  );
  if (filledSlots.length) c.dp = filledSlots.map(compactDPS);
  if (roster.availableGroups?.length) c.ag = roster.availableGroups;
  if (roster.notes) c.no = roster.notes;
  if (roster.trialOverrides) c.to = compactTrialOverrides(roster.trialOverrides);
  return c;
}

export function expandCompactRoster(c: CompactRoster): RaidRoster {
  const dpsSlots = createDefaultDPSSlots();
  if (c.dp) {
    for (const compactSlot of c.dp) {
      const idx = compactSlot.sn - 1;
      if (idx >= 0 && idx < 8) {
        dpsSlots[idx] = expandDPS(compactSlot);
      }
    }
  }
  return {
    rosterName: c.n ?? 'New Roster',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    tank1: expandTank(c.t1),
    tank2: expandTank(c.t2),
    healer1: expandHealer(c.h1),
    healer2: expandHealer(c.h2),
    dpsSlots,
    availableGroups: c.ag ?? [],
    notes: c.no,
    trialOverrides: c.to ? expandTrialOverrides(c.to) : undefined,
  };
}

// ============================================================
// Binary helpers
// ============================================================

/** Base64url encode a byte array (URL-safe, no padding) */
export function toBase64Url(bytes: Uint8Array): string {
  let binary = '';
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

/** Base64url decode back to byte array */
export function fromBase64Url(str: string): Uint8Array {
  const base64 = str.replace(/-/g, '+').replace(/_/g, '/');
  const padded = base64 + '='.repeat((4 - (base64.length % 4)) % 4);
  const binary = atob(padded);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

async function readAllChunks(readable: ReadableStream<Uint8Array>): Promise<Uint8Array> {
  const chunks: Uint8Array[] = [];
  const reader = readable.getReader();
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    chunks.push(value);
  }
  const total = chunks.reduce((s, c) => s + c.length, 0);
  const out = new Uint8Array(total);
  let offset = 0;
  for (const chunk of chunks) {
    out.set(chunk, offset);
    offset += chunk.length;
  }
  return out;
}

export async function deflateString(str: string): Promise<Uint8Array> {
  const input = new TextEncoder().encode(str);
  const cs = new CompressionStream('deflate-raw') as unknown as TransformStream<
    Uint8Array,
    Uint8Array
  >;
  const writer = cs.writable.getWriter();
  const writeAndClose = writer.write(input).then(() => writer.close());
  // Await both sides so neither rejection goes unhandled (ESO-705).
  const [, readResult] = await Promise.allSettled([writeAndClose, readAllChunks(cs.readable)]);
  if (readResult.status === 'rejected') {
    const reason = readResult.reason;
    throw reason instanceof Error ? reason : new Error(String(reason));
  }
  return readResult.value;
}

export async function inflateBytes(bytes: Uint8Array): Promise<string> {
  const ds = new DecompressionStream('deflate-raw') as unknown as TransformStream<
    Uint8Array,
    Uint8Array
  >;
  const writer = ds.writable.getWriter();
  const writeAndClose = writer.write(bytes).then(() => writer.close());
  // Await both sides so neither rejection goes unhandled (ESO-705).
  const [, readResult] = await Promise.allSettled([writeAndClose, readAllChunks(ds.readable)]);
  if (readResult.status === 'rejected') {
    const reason = readResult.reason;
    throw reason instanceof Error ? reason : new Error(String(reason));
  }
  return new TextDecoder().decode(readResult.value);
}

// ============================================================
// Public API — encode/decode a full roster for a URL param
// ============================================================

/**
 * Encode a roster to a compact, deflate-compressed, URL-safe base64 string.
 * Result goes into `?r=<returned>`.
 * Returns empty string on error (with console warning logged).
 */
export const encodeRosterToURL = async (roster: RaidRoster): Promise<string> => {
  try {
    const compact = compactifyRoster(roster);
    const json = JSON.stringify(compact);
    const compressed = await deflateString(json);
    return toBase64Url(compressed);
  } catch (error) {
    logger.warn('Failed to encode roster to URL:', error);
    return '';
  }
};

/**
 * Decode a roster from the `?r=` URL param value.
 * Supports v2 (deflate-raw + compact) and legacy v1 (plain base64 JSON).
 * Logs warnings on decode failures for debugging.
 */
export const decodeRosterFromURL = async (encoded: string): Promise<RaidRoster | null> => {
  // Try v2: deflate-raw + compact format
  try {
    const bytes = fromBase64Url(encoded);
    const json = await inflateBytes(bytes);
    const parsed = JSON.parse(json) as { v?: number };
    if (parsed.v === 2) {
      return expandCompactRoster(parsed as CompactRoster);
    }
  } catch (error) {
    // fall through to v1, but log v2 errors for debugging
    logger.debug('v2 decode failed, trying v1:', error);
  }
  // Try v1: btoa(encodeURIComponent(json))
  try {
    const json = decodeURIComponent(atob(encoded));
    const parsed: unknown = JSON.parse(json);
    if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
      return parsed as RaidRoster;
    }
    return null;
  } catch (error) {
    logger.warn('Failed to decode roster from URL:', error);
    return null;
  }
};
