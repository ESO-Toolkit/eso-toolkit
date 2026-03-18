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

import type { BuildChampionPoints, ChampionTree } from '../features/build-editor/types/build.types';
import type { SkillsConfig } from '../features/loadout-manager/types/loadout.types';
import { KnownSetIDs } from '../types/abilities';
import {
  CLASS_SKILL_LINES,
  SupportUltimate,
  HealerBuff,
  HealerChampionPoint,
  JailDDType,
  RaidRoster,
  RosterDetailLevel,
  TankSetup,
  TankGearSet,
  HealerSetup,
  DPSSlot,
  SkillLineConfig,
  BuildReference,
  defaultTankSetup,
  defaultHealerSetup,
  createDefaultDPSSlots,
  createDefaultTanks,
  createDefaultHealers,
} from '../types/roster';
import type {
  TrialBuildOverrides,
  EncounterOverrides,
  PlayerOverride,
} from '../types/trial-encounters';

import { Logger, LogLevel } from './logger';
import { makeSlotKey } from './slotKey';

const logger = new Logger({ level: LogLevel.WARN, contextPrefix: 'rosterEncoding' });

// ============================================================
// Compact interfaces — short key names for minimal JSON size
// ============================================================

/** Compact form of BuildReference — stored inline with the slot */
export interface CompactBuildRef {
  bi?: string; // buildId
  si: number; // setupIndex
  bn?: string; // buildName
  cl?: string; // esoClass
  ro?: string; // role
}

/** Compact food selection */
export interface CompactFood {
  i?: number; // id
  n?: string; // name
}

/** Compact champion point tree */
export interface CompactCPTree {
  s?: Array<number | null>; // slots (trailing nulls trimmed)
  p?: Record<string, number>; // passive allocations (zero values omitted)
}

/** Compact full champion points (three trees) */
export interface CompactCPFull {
  w?: CompactCPTree; // warfare
  fi?: CompactCPTree; // fitness (avoid 'f' collision with food)
  c?: CompactCPTree; // craft
}

/** Compact skill bars: front bar + back bar */
export interface CompactSkillBars {
  f?: Record<number, number>; // front bar: slot → abilityId
  b?: Record<number, number>; // back bar: slot → abilityId
}

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
  pt?: string; // positionTag (e.g. "portal", "bridge")
  pi?: string; // playerNumber / position (e.g. "left", "right")
  rl?: string; // roleLabel
  lb?: string[]; // labels
  rn?: string; // roleNotes
  gs?: CompactGear; // gearSets
  sl?: CompactSkills; // skillLines
  ul?: number | string; // ultimate: SupportUltimate index or custom string
  ss?: (number | string)[]; // specificSkills: ability IDs (new) or names (legacy)
  grs?: string[]; // groups (multi-group memberships)
  gr?: CompactGroup; // @deprecated — legacy single group, decode only
  no?: string; // notes
  br?: CompactBuildRef; // buildRef
  fo?: CompactFood; // food
  sk?: CompactSkillBars; // full skill bars (Full mode)
  cp2?: CompactCPFull; // champion points (Full mode)
  pa?: number[]; // passive ability IDs (Full mode)
}

export interface CompactHealer {
  pn?: string; // playerName
  pt?: string; // positionTag (e.g. "portal", "tomb")
  pi?: string; // playerNumber / position (e.g. "left", "right")
  rl?: string; // roleLabel
  lb?: string[]; // labels
  rn?: string; // roleNotes
  s1?: number; // set1
  s2?: number; // set2
  ms?: number; // monsterSet
  aw?: string; // arenaWeapon (free text)
  a?: number[]; // additionalSets
  sl?: CompactSkills; // skillLines
  hb?: number; // healerBuff: HealerBuff index
  cp?: number; // championPoint: HealerChampionPoint index
  ss?: (number | string)[]; // specificSkills: ability IDs (new) or names (legacy)
  ul?: number | string; // ultimate: SupportUltimate index or custom string
  grs?: string[]; // groups (multi-group memberships)
  gr?: CompactGroup; // @deprecated — legacy single group, decode only
  no?: string; // notes
  br?: CompactBuildRef; // buildRef
  fo?: CompactFood; // food
  sk?: CompactSkillBars; // full skill bars (Full mode)
  cp2?: CompactCPFull; // champion points (Full mode)
  pa?: number[]; // passive ability IDs (Full mode)
}

export interface CompactDPS {
  sn: number; // slotNumber (required)
  pn?: string; // playerName
  pt?: string; // positionTag (e.g. "portal", "slayer", "banner")
  pi?: string; // playerNumber / position (e.g. "left", "right", "1")
  rl?: string; // roleLabel
  lb?: string[]; // labels
  rn?: string; // roleNotes
  s1?: number; // set1 (primary 5-piece)
  s2?: number; // set2 (secondary 5-piece)
  ms?: number; // monsterSet
  aw?: string; // arenaWeapon (free text)
  as?: number[]; // additionalSets
  gs?: number[]; // legacy gearSets (backward compat decode only)
  sl?: CompactSkills; // skillLines
  cp?: string; // championPoint
  ss?: (number | string)[]; // specificSkills: ability IDs (new) or names (legacy)
  ul?: number | string; // ultimate: SupportUltimate index or custom string
  grs?: string[]; // groups (multi-group memberships)
  gr?: CompactGroup; // @deprecated — legacy single group, decode only
  no?: string; // notes
  jt?: number; // jailDDType index
  cd?: string; // customDescription
  br?: CompactBuildRef; // buildRef
  fo?: CompactFood; // food
  sk?: CompactSkillBars; // full skill bars (Full mode)
  cp2?: CompactCPFull; // champion points (Full mode)
  pa?: number[]; // passive ability IDs (Full mode)
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
  /** v3: SlotKey-keyed record (e.g., {"tank:0": {...}, "dps:3": {...}}) */
  sk?: Record<string, CompactPlayerOverride>;
  /** @deprecated v2 fields — decode only */
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

/**
 * v2 compact roster — decode only (kept for backward compat).
 * Uses named t1/t2/h1/h2 fields for the fixed 2-tank/2-healer layout.
 */
export interface CompactRosterV2 {
  v: 2;
  n?: string;
  t1?: CompactTank;
  t2?: CompactTank;
  h1?: CompactHealer;
  h2?: CompactHealer;
  dp?: CompactDPS[]; // only filled DPS slots
  ag?: string[]; // availableGroups
  no?: string; // notes
  to?: CompactTrialOverrides; // trialOverrides (per-fight builds)
  dl?: number; // detail level: 0=simple 1=full
}

/**
 * v3 compact roster — current format.
 * Uses arrays for tanks/healers and a composition tuple.
 */
export interface CompactRosterV3 {
  v: 3;
  n?: string;
  /** Composition: [tanks, healers, dps] */
  co?: [number, number, number];
  ts?: CompactTank[];
  hs?: CompactHealer[];
  dp?: CompactDPS[];
  ag?: string[];
  no?: string;
  to?: CompactTrialOverrides;
  dl?: number;
}

/** Union of all compact roster formats */
export type CompactRoster = CompactRosterV2 | CompactRosterV3;

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

function compactBuildRef(ref: BuildReference): CompactBuildRef {
  const c: CompactBuildRef = { si: ref.setupIndex };
  if (ref.buildId) c.bi = ref.buildId;
  if (ref.buildName) c.bn = ref.buildName;
  if (ref.esoClass) c.cl = ref.esoClass;
  if (ref.role) c.ro = ref.role;
  return c;
}

function expandBuildRef(c: CompactBuildRef): BuildReference {
  return {
    buildId: c.bi,
    setupIndex: c.si,
    buildName: c.bn,
    esoClass: c.cl,
    role: c.ro,
  };
}

function compactFood(food?: { id?: number; name?: string }): CompactFood | undefined {
  if (!food || (food.id == null && !food.name)) return undefined;
  const c: CompactFood = {};
  if (food.id != null) c.i = food.id;
  if (food.name) c.n = food.name;
  return c;
}

/** Decode specificSkills: keep only numbers (ability IDs). Legacy string entries are dropped. */
function decodeSpecificSkills(ss?: (number | string)[]): number[] {
  if (!ss) return [];
  return ss.filter((v): v is number => typeof v === 'number');
}

function expandFood(c?: CompactFood): { id?: number; name?: string } | undefined {
  if (!c) return undefined;
  return { id: c.i, name: c.n };
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

// ──────────────────────────────────────────────────────────────────────────────
// Skill bars + Champion points helpers (Full detail mode)
// ──────────────────────────────────────────────────────────────────────────────

function compactSkillBars(skills?: SkillsConfig): CompactSkillBars | undefined {
  if (!skills) return undefined;
  const f = Object.keys(skills[0]).length > 0 ? (skills[0] as Record<number, number>) : undefined;
  const b = Object.keys(skills[1]).length > 0 ? (skills[1] as Record<number, number>) : undefined;
  if (!f && !b) return undefined;
  const c: CompactSkillBars = {};
  if (f) c.f = f;
  if (b) c.b = b;
  return c;
}

function expandSkillBars(c?: CompactSkillBars): SkillsConfig | undefined {
  if (!c) return undefined;
  return { 0: (c.f as SkillsConfig[0]) ?? {}, 1: (c.b as SkillsConfig[1]) ?? {} };
}

function compactCPTree(tree: ChampionTree): CompactCPTree | undefined {
  const trimmedSlots = [...tree.slots];
  // Trim trailing nulls
  while (trimmedSlots.length > 0 && trimmedSlots[trimmedSlots.length - 1] === null) {
    trimmedSlots.pop();
  }
  const hasSlots = trimmedSlots.length > 0;
  const nonZeroPassives = Object.fromEntries(
    Object.entries(tree.passives).filter(([, v]) => v !== 0),
  );
  const hasPassives = Object.keys(nonZeroPassives).length > 0;
  if (!hasSlots && !hasPassives) return undefined;
  const c: CompactCPTree = {};
  if (hasSlots) c.s = trimmedSlots;
  if (hasPassives) c.p = nonZeroPassives;
  return c;
}

function expandCPTree(c?: CompactCPTree): ChampionTree {
  const rawSlots = c?.s ?? [];
  // Pad back to 4 slots
  const slots: Array<number | null> = [...rawSlots];
  while (slots.length < 4) slots.push(null);
  return { slots: slots as ChampionTree['slots'], passives: c?.p ?? {} };
}

function compactCPFull(cp?: BuildChampionPoints): CompactCPFull | undefined {
  if (!cp) return undefined;
  const w = compactCPTree(cp.warfare);
  const fi = compactCPTree(cp.fitness);
  const c = compactCPTree(cp.craft);
  if (!w && !fi && !c) return undefined;
  const out: CompactCPFull = {};
  if (w) out.w = w;
  if (fi) out.fi = fi;
  if (c) out.c = c;
  return out;
}

function expandCPFull(c?: CompactCPFull): BuildChampionPoints | undefined {
  if (!c) return undefined;
  return {
    warfare: expandCPTree(c.w),
    fitness: expandCPTree(c.fi),
    craft: expandCPTree(c.c),
  };
}

function compactTank(t: TankSetup): CompactTank {
  const c: CompactTank = {};
  if (t.playerName) c.pn = t.playerName;
  if (t.positionTag) c.pt = t.positionTag;
  if (t.playerNumber) c.pi = t.playerNumber;
  if (t.roleLabel) c.rl = t.roleLabel;
  if (t.labels?.length) c.lb = t.labels;
  if (t.roleNotes) c.rn = t.roleNotes;
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
  if (t.buildRef) c.br = compactBuildRef(t.buildRef);
  const fo = compactFood(t.food);
  if (fo) c.fo = fo;
  const sk = compactSkillBars(t.skills);
  if (sk) c.sk = sk;
  const cp2 = compactCPFull(t.cpPoints);
  if (cp2) c.cp2 = cp2;
  if (t.passives?.length) c.pa = t.passives;
  return c;
}

function expandTank(c?: CompactTank, slotNumber = 1): TankSetup {
  return {
    ...defaultTankSetup(slotNumber),
    playerName: c?.pn,
    positionTag: c?.pt,
    playerNumber: c?.pi != null ? String(c.pi) : undefined,
    roleLabel: c?.rl,
    labels: c?.lb,
    roleNotes: c?.rn,
    gearSets: expandGear(c?.gs),
    skillLines: expandSkills(c?.sl),
    ultimate: decodeUltimate(c?.ul),
    specificSkills: decodeSpecificSkills(c?.ss),
    groups: expandGroups(c?.grs, c?.gr),
    notes: c?.no,
    buildRef: c?.br ? expandBuildRef(c.br) : undefined,
    food: expandFood(c?.fo),
    skills: expandSkillBars(c?.sk),
    cpPoints: expandCPFull(c?.cp2),
    passives: c?.pa,
  };
}

function compactHealer(h: HealerSetup): CompactHealer {
  const c: CompactHealer = {};
  if (h.playerName) c.pn = h.playerName;
  if (h.positionTag) c.pt = h.positionTag;
  if (h.playerNumber) c.pi = h.playerNumber;
  if (h.roleLabel) c.rl = h.roleLabel;
  if (h.labels?.length) c.lb = h.labels;
  if (h.roleNotes) c.rn = h.roleNotes;
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
  if (h.specificSkills?.length) c.ss = h.specificSkills;
  const ul = encodeUltimate(h.ultimate);
  if (ul != null) c.ul = ul;
  const grs = compactGroups(h.groups);
  if (grs) c.grs = grs;
  if (h.notes) c.no = h.notes;
  if (h.buildRef) c.br = compactBuildRef(h.buildRef);
  const fo = compactFood(h.food);
  if (fo) c.fo = fo;
  const sk = compactSkillBars(h.skills);
  if (sk) c.sk = sk;
  const cp2 = compactCPFull(h.cpPoints);
  if (cp2) c.cp2 = cp2;
  if (h.passives?.length) c.pa = h.passives;
  return c;
}

function expandHealer(c?: CompactHealer, slotNumber = 1): HealerSetup {
  return {
    ...defaultHealerSetup(slotNumber),
    playerName: c?.pn,
    positionTag: c?.pt,
    playerNumber: c?.pi != null ? String(c.pi) : undefined,
    roleLabel: c?.rl,
    labels: c?.lb,
    roleNotes: c?.rn,
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
      c?.cp != null ? ((CHAMPION_POINT_LIST[c.cp] as HealerChampionPoint) ?? null) : null,
    specificSkills: decodeSpecificSkills(c?.ss),
    ultimate: decodeUltimate(c?.ul),
    groups: expandGroups(c?.grs, c?.gr),
    notes: c?.no,
    buildRef: c?.br ? expandBuildRef(c.br) : undefined,
    food: expandFood(c?.fo),
    skills: expandSkillBars(c?.sk),
    cpPoints: expandCPFull(c?.cp2),
    passives: c?.pa,
  };
}

function compactDPS(d: DPSSlot): CompactDPS {
  const c: CompactDPS = { sn: d.slotNumber };
  if (d.playerName) c.pn = d.playerName;
  if (d.positionTag) c.pt = d.positionTag;
  if (d.playerNumber) c.pi = d.playerNumber;
  if (d.roleLabel) c.rl = d.roleLabel;
  if (d.labels?.length) c.lb = d.labels;
  if (d.roleNotes) c.rn = d.roleNotes;
  if (d.set1 != null) c.s1 = d.set1 as number;
  if (d.set2 != null) c.s2 = d.set2 as number;
  if (d.monsterSet != null) c.ms = d.monsterSet as number;
  if (d.additionalSets?.length) c.as = d.additionalSets as number[];
  const sl = d.skillLines ? compactSkills(d.skillLines) : undefined;
  if (sl) c.sl = sl;
  if (d.championPoint) c.cp = d.championPoint;
  if (d.specificSkills?.length) c.ss = d.specificSkills;
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
  if (d.buildRef) c.br = compactBuildRef(d.buildRef);
  const fo = compactFood(d.food);
  if (fo) c.fo = fo;
  const sk = compactSkillBars(d.skills);
  if (sk) c.sk = sk;
  const cp2 = compactCPFull(d.cpPoints);
  if (cp2) c.cp2 = cp2;
  if (d.passives?.length) c.pa = d.passives;
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
    positionTag: c.pt,
    // c.pi was stored as number in old encoded rosters — coerce to string for compat
    playerNumber: c.pi != null ? String(c.pi) : undefined,
    roleLabel: c.rl,
    labels: c.lb,
    roleNotes: c.rn,
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
    specificSkills: decodeSpecificSkills(c.ss),
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
    buildRef: c.br ? expandBuildRef(c.br) : undefined,
    food: expandFood(c.fo),
    skills: expandSkillBars(c.sk),
    cpPoints: expandCPFull(c.cp2),
    passives: c.pa,
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
  // v3: write as SlotKey-keyed record
  const sk: Record<string, CompactPlayerOverride> = {};
  for (const [slotKey, override] of Object.entries(o.slots)) {
    sk[slotKey] = compactPlayerOverride(override);
  }
  if (Object.keys(sk).length > 0) c.sk = sk;
  return c;
}

function expandEncounterOverrides(c: CompactEncounterOverrides): EncounterOverrides {
  const slots: Record<string, PlayerOverride> = {};

  // v3: SlotKey-keyed record
  if (c.sk) {
    for (const [slotKey, compact] of Object.entries(c.sk)) {
      slots[slotKey] = expandPlayerOverride(compact);
    }
  }

  // v2 backward compat: named t1/t2/h1/h2 + dpsSlots
  if (c.t1) slots[makeSlotKey('tank', 0)] = expandPlayerOverride(c.t1);
  if (c.t2) slots[makeSlotKey('tank', 1)] = expandPlayerOverride(c.t2);
  if (c.h1) slots[makeSlotKey('healer', 0)] = expandPlayerOverride(c.h1);
  if (c.h2) slots[makeSlotKey('healer', 1)] = expandPlayerOverride(c.h2);
  if (c.dp?.length) {
    for (const { sn, ...rest } of c.dp) {
      slots[makeSlotKey('dps', sn - 1)] = expandPlayerOverride(rest);
    }
  }

  return { slots };
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

export function compactifyRoster(roster: RaidRoster): CompactRosterV3 {
  const c: CompactRosterV3 = { v: 3 };
  if (roster.rosterName && roster.rosterName !== 'New Roster') c.n = roster.rosterName;

  // Only encode composition if it differs from the default 2/2/8
  const comp = roster.composition;
  if (comp.tanks !== 2 || comp.healers !== 2 || comp.dps !== 8) {
    c.co = [comp.tanks, comp.healers, comp.dps];
  }

  // Tanks array
  const compactTanks = roster.tanks.map(compactTank);
  if (compactTanks.length > 0) c.ts = compactTanks;

  // Healers array
  const compactHealers = roster.healers.map(compactHealer);
  if (compactHealers.length > 0) c.hs = compactHealers;

  // DPS — only encode filled slots
  const filledSlots = roster.dpsSlots.filter(
    (slot) =>
      slot.playerName ||
      slot.positionTag ||
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
      slot.customDescription ||
      slot.notes ||
      slot.groups?.length ||
      slot.group ||
      slot.skillLines ||
      slot.specificSkills?.length ||
      slot.championPoint ||
      slot.buildRef ||
      slot.food ||
      slot.skills ||
      slot.cpPoints ||
      slot.passives?.length,
  );
  if (filledSlots.length) c.dp = filledSlots.map(compactDPS);
  if (roster.availableGroups?.length) c.ag = roster.availableGroups;
  if (roster.notes) c.no = roster.notes;
  if (roster.trialOverrides) c.to = compactTrialOverrides(roster.trialOverrides);
  if (roster.rosterDetailLevel) {
    const DL_MAP: Record<RosterDetailLevel, number> = { simple: 0, full: 1 };
    c.dl = DL_MAP[roster.rosterDetailLevel];
  }
  return c;
}

const DL_LEVELS: RosterDetailLevel[] = ['simple', 'full'];

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
    composition: comp,
    tanks: [expandTank(c.t1, 1), expandTank(c.t2, 2)],
    healers: [expandHealer(c.h1, 1), expandHealer(c.h2, 2)],
    dpsSlots,
    availableGroups: c.ag ?? [],
    notes: c.no,
    trialOverrides: c.to ? expandTrialOverrides(c.to) : undefined,
    rosterDetailLevel: c.dl != null ? DL_LEVELS[c.dl] : undefined,
  };
}

export function expandCompactRoster(c: CompactRoster): RaidRoster {
  if (c.v === 3) return expandCompactRosterV3(c as CompactRosterV3);
  return expandCompactRosterV2(c as CompactRosterV2);
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

/** Base64url decode back to byte array. Throws on invalid input. */
export function fromBase64Url(str: string): Uint8Array {
  const base64 = str.replace(/-/g, '+').replace(/_/g, '/');
  const padded = base64 + '='.repeat((4 - (base64.length % 4)) % 4);
  let binary: string;
  try {
    binary = atob(padded);
  } catch {
    throw new Error(`Invalid base64url input (length=${str.length})`);
  }
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

/** Maximum decompressed output size (5 MB). Prevents decompression bomb attacks. */
const MAX_DECOMPRESSED_BYTES = 5 * 1024 * 1024;

async function readAllChunks(readable: ReadableStream<Uint8Array>): Promise<Uint8Array> {
  const chunks: Uint8Array[] = [];
  const reader = readable.getReader();
  let total = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    total += value.length;
    if (total > MAX_DECOMPRESSED_BYTES) {
      await reader.cancel();
      throw new Error(`Decompressed payload exceeds ${MAX_DECOMPRESSED_BYTES} bytes — aborting`);
    }
    chunks.push(value);
  }
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
// 500 KB max compressed roster payload — guards against decompression bomb attacks
const MAX_ROSTER_COMPRESSED_BYTES = 500 * 1024;

export const decodeRosterFromURL = async (encoded: string): Promise<RaidRoster | null> => {
  // Try v3/v2: deflate-raw + compact format
  try {
    const bytes = fromBase64Url(encoded);
    if (bytes.length > MAX_ROSTER_COMPRESSED_BYTES) return null;
    const json = await inflateBytes(bytes);
    const parsed = JSON.parse(json) as { v?: number };
    if (parsed.v === 3) {
      return expandCompactRoster(parsed as CompactRosterV3);
    }
    if (parsed.v === 2) {
      return expandCompactRoster(parsed as CompactRosterV2);
    }
  } catch (error) {
    // fall through to v1, but log errors for debugging
    logger.debug('v3/v2 decode failed, trying v1:', error);
  }
  // Try v1: btoa(encodeURIComponent(json)) — legacy format with named fields
  try {
    const json = decodeURIComponent(atob(encoded));
    const parsed: unknown = JSON.parse(json);
    if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
      // Legacy v1 may have old named fields — migrate to array format
      return migrateLegacyRoster(parsed as Record<string, unknown>);
    }
    return null;
  } catch (error) {
    logger.warn('Failed to decode roster from URL:', error);
    return null;
  }
};

/**
 * Migrate a legacy v1 roster (with tank1/tank2/healer1/healer2 named fields)
 * into the new array-based RaidRoster format.
 */
function migrateLegacyRoster(raw: Record<string, unknown>): RaidRoster {
  // If it already has the new format fields, use it directly
  if (Array.isArray(raw.tanks) && Array.isArray(raw.healers)) {
    return raw as unknown as RaidRoster;
  }

  // Convert old named fields to arrays
  const tank1 = (raw.tank1 as TankSetup) ?? defaultTankSetup(1);
  const tank2 = (raw.tank2 as TankSetup) ?? defaultTankSetup(2);
  const healer1 = (raw.healer1 as HealerSetup) ?? defaultHealerSetup(1);
  const healer2 = (raw.healer2 as HealerSetup) ?? defaultHealerSetup(2);

  // Ensure slotNumbers are set
  tank1.slotNumber = 1;
  tank2.slotNumber = 2;
  healer1.slotNumber = 1;
  healer2.slotNumber = 2;

  return {
    rosterName: (raw.rosterName as string) ?? 'New Roster',
    createdAt: (raw.createdAt as string) ?? new Date().toISOString(),
    updatedAt: (raw.updatedAt as string) ?? new Date().toISOString(),
    composition: { ...DEFAULT_COMPOSITION },
    tanks: [tank1, tank2],
    healers: [healer1, healer2],
    dpsSlots: (raw.dpsSlots as DPSSlot[]) ?? createDefaultDPSSlots(),
    availableGroups: (raw.availableGroups as string[]) ?? [],
    notes: raw.notes as string | undefined,
    rosterDetailLevel: raw.rosterDetailLevel as RosterDetailLevel | undefined,
    trialOverrides: raw.trialOverrides as TrialBuildOverrides | undefined,
  };
}
