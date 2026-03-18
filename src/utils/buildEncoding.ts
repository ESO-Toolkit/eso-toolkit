/**
 * Build encoding/decoding utilities for URL sharing.
 *
 * Implements the same two-layer compression as rosterEncoding:
 *   compact JSON (short keys, integer look-ups) → deflate-raw → base64url
 *
 * Excluded from URL encoding (too large / not needed for viewing):
 *   - guide.content  (markdown, can be long)
 *   - screenshots    (URL strings, omitted for safety)
 *   - addonImportString
 *   - id / createdAt / updatedAt  (regenerated on decode)
 */

import { ESO_POTION_LOOKUP } from '@/data/esoPotions';

import type {
  Build,
  BuildSetup,
  BuildChampionPoints,
  BuildConsumables,
  BuildAttributes,
  ESOClass,
  CombatRole,
  ClassSkillLineId,
  BuildVisibility,
} from '../features/build-editor/types/build.types';
import type { GearConfig, SkillsConfig } from '../features/loadout-manager/types/loadout.types';

import { deflateString, inflateBytes, toBase64Url, fromBase64Url } from './rosterEncoding';

// ─── Look-up tables ──────────────────────────────────────────────────────────

const ESO_CLASSES: ESOClass[] = [
  'any-class',
  'dragonknight',
  'sorcerer',
  'nightblade',
  'templar',
  'warden',
  'necromancer',
  'arcanist',
];

const COMBAT_ROLES: CombatRole[] = ['tank', 'healer', 'magicka-dps', 'stamina-dps', 'hybrid-dps'];

const CLASS_SKILL_LINE_IDS: ClassSkillLineId[] = [
  'class.ardent-flame',
  'class.draconic-power',
  'class.earthen-heart',
  'class.dark-magic',
  'class.daedric-summoning',
  'class.storm-calling',
  'class.assassination',
  'class.shadow',
  'class.siphoning',
  'class.aedric-spear',
  'class.dawns-wrath',
  'class.restoring-light',
  'class.animal-companions',
  'class.green-balance',
  'class.winters-embrace',
  'class.grave-lord',
  'class.bone-tyrant',
  'class.living-death',
  'class.herald-of-the-tome',
  'class.soldier-of-apocrypha',
  'class.curative-runeforms',
];

const VISIBILITIES: BuildVisibility[] = ['public', 'private', 'link-only'];

const CLASS_IDX = new Map(ESO_CLASSES.map((c, i) => [c, i] as const));
const ROLE_IDX = new Map(COMBAT_ROLES.map((r, i) => [r, i] as const));
const SKILL_LINE_IDX = new Map(CLASS_SKILL_LINE_IDS.map((s, i) => [s, i] as const));
const VISIBILITY_IDX = new Map(VISIBILITIES.map((v, i) => [v, i] as const));

// ─── Compact interfaces ───────────────────────────────────────────────────────

interface CompactChampionTree {
  s?: (number | null)[]; // slots (omit if all null)
  p?: Record<string, number>; // passives (omit if empty)
}

interface CompactCP {
  w?: CompactChampionTree; // warfare
  f?: CompactChampionTree; // fitness
  c?: CompactChampionTree; // craft
}

interface CompactSetup {
  nm?: string; // name (omit if 'Default')
  at?: [number, number, number]; // [magicka, health, stamina] (omit if all 0)
  cu?: string; // curse (omit if 'none' or empty)
  ms?: string; // mundusStone (omit if empty)
  g?: Record<string, number>; // gear: {slotIndex: itemId}
  gt?: Record<string, string>; // gear traits: {slotIndex: traitId}
  ge?: Record<string, string>; // gear enchants: {slotIndex: enchantId}
  sk?: { 0?: Record<string, number>; 1?: Record<string, number> }; // skills
  cp?: CompactCP; // champion points
  pt?: number[]; // potion IDs
  fo?: number; // food ID
  pa?: number[]; // passive IDs
}

interface CompactBuild {
  v: 1; // version marker
  n?: string; // name
  d?: string; // shortDescription
  ec?: number; // esoClass index
  csl?: (number | null)[]; // classSkillLines (3 items)
  r?: number; // role index
  gm?: 1; // gameMode: only set when 'pvp' (default pve)
  ra?: string[]; // races
  s: CompactSetup[]; // setups
  gy?: string; // guide.youtubeUrl
  gb?: string; // guide.bannerImageUrl
  vs?: number; // visibility index (omit if 'public')
  dl?: string; // dlc (omit if 'Base Game')
  so?: number[]; // setupOrder (omit if sequential)
}

// ─── Compact helpers ──────────────────────────────────────────────────────────

function compactGear(gear: GearConfig): Record<string, number> | undefined {
  const result: Record<string, number> = {};
  for (const [slot, piece] of Object.entries(gear)) {
    if (piece?.id != null) {
      result[slot] = Number(piece.id);
    }
  }
  return Object.keys(result).length > 0 ? result : undefined;
}

function compactGearTraits(gear: GearConfig): Record<string, string> | undefined {
  const result: Record<string, string> = {};
  for (const [slot, piece] of Object.entries(gear)) {
    if (piece?.trait) result[slot] = piece.trait;
  }
  return Object.keys(result).length > 0 ? result : undefined;
}

function compactGearEnchants(gear: GearConfig): Record<string, string> | undefined {
  const result: Record<string, string> = {};
  for (const [slot, piece] of Object.entries(gear)) {
    if (piece?.enchant) result[slot] = piece.enchant;
  }
  return Object.keys(result).length > 0 ? result : undefined;
}

function expandGear(
  compact?: Record<string, number>,
  traits?: Record<string, string>,
  enchants?: Record<string, string>,
): GearConfig {
  if (!compact) return {};
  const result: GearConfig = {};
  for (const [slot, id] of Object.entries(compact)) {
    result[Number(slot)] = {
      id,
      trait: traits?.[slot],
      enchant: enchants?.[slot],
    };
  }
  return result;
}

function compactSkills(
  skills: SkillsConfig,
): { 0?: Record<string, number>; 1?: Record<string, number> } | undefined {
  const result: { 0?: Record<string, number>; 1?: Record<string, number> } = {};
  for (const bar of [0, 1] as const) {
    const barData = skills[bar];
    if (barData && Object.keys(barData).length > 0) {
      const compactBar: Record<string, number> = {};
      for (const [slot, abilityId] of Object.entries(barData)) {
        compactBar[slot] = abilityId;
      }
      result[bar] = compactBar;
    }
  }
  return Object.keys(result).length > 0 ? result : undefined;
}

function expandSkills(compact?: {
  0?: Record<string, number>;
  1?: Record<string, number>;
}): SkillsConfig {
  const result: SkillsConfig = { 0: {}, 1: {} };
  if (!compact) return result;
  for (const bar of [0, 1] as const) {
    const barData = compact[bar];
    if (barData) {
      for (const [slot, abilityId] of Object.entries(barData)) {
        result[bar][Number(slot)] = abilityId;
      }
    }
  }
  return result;
}

function compactChampionTree(
  tree: BuildChampionPoints[keyof BuildChampionPoints],
): CompactChampionTree | undefined {
  const hasSlots = tree.slots.some((s) => s !== null);
  const hasPassives = Object.keys(tree.passives).length > 0;
  if (!hasSlots && !hasPassives) return undefined;
  const result: CompactChampionTree = {};
  if (hasSlots) result.s = tree.slots;
  if (hasPassives) result.p = tree.passives;
  return result;
}

function expandChampionTree(
  compact?: CompactChampionTree,
): BuildChampionPoints[keyof BuildChampionPoints] {
  return {
    slots: compact?.s ?? [null, null, null, null],
    passives: compact?.p ?? {},
  };
}

function compactCP(cp: BuildChampionPoints): CompactCP | undefined {
  const w = compactChampionTree(cp.warfare);
  const f = compactChampionTree(cp.fitness);
  const c = compactChampionTree(cp.craft);
  if (!w && !f && !c) return undefined;
  const result: CompactCP = {};
  if (w) result.w = w;
  if (f) result.f = f;
  if (c) result.c = c;
  return result;
}

function expandCP(compact?: CompactCP): BuildChampionPoints {
  return {
    warfare: expandChampionTree(compact?.w),
    fitness: expandChampionTree(compact?.f),
    craft: expandChampionTree(compact?.c),
  };
}

function compactConsumables(consumables: BuildConsumables): { pt?: number[]; fo?: number } {
  const result: { pt?: number[]; fo?: number } = {};
  const potionIds = consumables.potions.map((p) => p.id).filter((id) => id != null);
  if (potionIds.length > 0) result.pt = potionIds;
  if (consumables.food.id != null) result.fo = consumables.food.id;
  return result;
}

function compactSetup(setup: BuildSetup): CompactSetup {
  const c: CompactSetup = {};
  if (setup.name && setup.name !== 'Default') c.nm = setup.name;
  if (
    setup.attributes.magicka !== 0 ||
    setup.attributes.health !== 0 ||
    setup.attributes.stamina !== 0
  ) {
    c.at = [setup.attributes.magicka, setup.attributes.health, setup.attributes.stamina];
  }
  if (setup.curse && setup.curse !== 'none') c.cu = setup.curse;
  if (setup.mundusStone) c.ms = setup.mundusStone;
  const gear = compactGear(setup.gear);
  if (gear) c.g = gear;
  const gearTraits = compactGearTraits(setup.gear);
  if (gearTraits) c.gt = gearTraits;
  const gearEnchants = compactGearEnchants(setup.gear);
  if (gearEnchants) c.ge = gearEnchants;
  const skills = compactSkills(setup.skills);
  if (skills) c.sk = skills;
  const cp = compactCP(setup.cp);
  if (cp) c.cp = cp;
  const { pt, fo } = compactConsumables(setup.consumables);
  if (pt) c.pt = pt;
  if (fo != null) c.fo = fo;
  if (setup.passives.length > 0) c.pa = setup.passives;
  return c;
}

function expandSetup(compact: CompactSetup, index: number): BuildSetup {
  return {
    id: `decoded-setup-${index}`,
    name: compact.nm ?? 'Default',
    attributes: compact.at
      ? { magicka: compact.at[0], health: compact.at[1], stamina: compact.at[2] }
      : { magicka: 0, health: 0, stamina: 0 },
    curse: compact.cu ?? 'none',
    mundusStone: compact.ms ?? '',
    gear: expandGear(compact.g, compact.gt, compact.ge),
    skills: expandSkills(compact.sk),
    cp: expandCP(compact.cp),
    consumables: {
      potions: (compact.pt ?? []).map((id) => {
        const lookup = ESO_POTION_LOOKUP[id];
        return {
          id,
          name: lookup?.name ?? '',
          effects: lookup ? [...lookup.effects] : [],
        };
      }),
      food: compact.fo != null ? { id: compact.fo } : {},
    },
    passives: compact.pa ?? [],
    screenshots: [], // never encoded
  };
}

// ─── Top-level compact/expand ─────────────────────────────────────────────────

function compactifyBuild(build: Build): CompactBuild {
  const c: CompactBuild = { v: 1, s: build.setups.map(compactSetup) };

  if (build.name) c.n = build.name;
  if (build.shortDescription) c.d = build.shortDescription;

  const ecIdx = CLASS_IDX.get(build.esoClass);
  if (ecIdx !== undefined) c.ec = ecIdx;

  const csl = build.classSkillLines.map((sl) =>
    sl != null ? (SKILL_LINE_IDX.get(sl) ?? null) : null,
  );
  if (csl.some((v) => v !== null)) c.csl = csl;

  const roleIdx = ROLE_IDX.get(build.role);
  if (roleIdx !== undefined) c.r = roleIdx;

  if (build.gameMode === 'pvp') c.gm = 1;
  if (build.races.length > 0) c.ra = build.races;

  if (build.guide.youtubeUrl) c.gy = build.guide.youtubeUrl;
  if (build.guide.bannerImageUrl) c.gb = build.guide.bannerImageUrl;

  const visIdx = VISIBILITY_IDX.get(build.settings.visibility);
  if (visIdx !== undefined && visIdx !== 0) c.vs = visIdx; // 0 = public = default

  if (build.settings.dlc && build.settings.dlc !== 'Base Game') c.dl = build.settings.dlc;

  const isSequential = build.settings.setupOrder.every((v, i) => v === i);
  if (!isSequential) c.so = build.settings.setupOrder;

  return c;
}

function expandCompactBuild(c: CompactBuild): Build {
  const setups = c.s.map((cs, i) => expandSetup(cs, i));
  const esoClass: ESOClass = c.ec != null ? (ESO_CLASSES[c.ec] ?? 'dragonknight') : 'dragonknight';
  const role: CombatRole = c.r != null ? (COMBAT_ROLES[c.r] ?? 'tank') : 'tank';
  const classSkillLines: Build['classSkillLines'] = [
    c.csl?.[0] != null ? (CLASS_SKILL_LINE_IDS[c.csl[0]] ?? null) : null,
    c.csl?.[1] != null ? (CLASS_SKILL_LINE_IDS[c.csl[1]] ?? null) : null,
    c.csl?.[2] != null ? (CLASS_SKILL_LINE_IDS[c.csl[2]] ?? null) : null,
  ];
  const visibility: BuildVisibility = c.vs != null ? (VISIBILITIES[c.vs] ?? 'public') : 'public';
  const now = new Date().toISOString();

  return {
    id: `shared-${Date.now()}`,
    name: c.n ?? '',
    shortDescription: c.d ?? '',
    esoClass,
    classSkillLines,
    role,
    gameMode: c.gm === 1 ? 'pvp' : 'pve',
    races: c.ra ?? [],
    setups,
    guide: {
      content: '', // never encoded — not available in URL shares
      youtubeUrl: c.gy ?? '',
      bannerImageUrl: c.gb ?? '',
    },
    settings: {
      visibility,
      dlc: c.dl ?? 'Base Game',
      setupOrder: c.so ?? setups.map((_, i) => i),
    },
    addonImportString: '', // never encoded
    createdAt: now,
    updatedAt: now,
  };
}

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * Encode a build to a compact, deflate-compressed, URL-safe base64 string.
 * Result goes into `?b=<returned>`.
 * Also used as `build_data` when publishing to the hub API.
 */
export const encodeBuildToURL = async (build: Build): Promise<string> => {
  try {
    const compact = compactifyBuild(build);
    const json = JSON.stringify(compact);
    const compressed = await deflateString(json);
    return toBase64Url(compressed);
  } catch {
    return '';
  }
};

// 100 KB max compressed payload — guards against decompression bomb attacks
const MAX_COMPRESSED_BYTES = 100 * 1024;

/**
 * Decode a build from the `?b=` URL param value (or from hub `build_data`).
 */
export const decodeBuildFromURL = async (encoded: string): Promise<Build | null> => {
  try {
    const bytes = fromBase64Url(encoded);
    // Reject oversized payloads before inflating (decompression bomb protection)
    if (bytes.length > MAX_COMPRESSED_BYTES) return null;
    const json = await inflateBytes(bytes);
    const parsed = JSON.parse(json) as { v?: number };
    if (parsed.v === 1) {
      const compact = parsed as CompactBuild;
      // Require at least one setup, cap at 5
      if (!Array.isArray(compact.s) || compact.s.length === 0 || compact.s.length > 5) return null;
      return expandCompactBuild(compact);
    }
    return null;
  } catch {
    return null;
  }
};

// Re-export the build attributes type for convenience
export type { BuildAttributes };
