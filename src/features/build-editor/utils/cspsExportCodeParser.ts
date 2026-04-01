/**
 * CSPS Export Code Parser
 *
 * Parses the two text-based export codes that Caro's Skill Point Saver can
 * generate in-game — distinct from the full SavedVariables .lua file.
 *
 * Supported formats:
 *
 * 1. ESO-Hub format — 15 sections separated by `;`
 *    classId;raceId;roleIndex;attributes;curseId;mundusId;subclasses;
 *    hb1;hb2;passives;slottedCP;passiveCP;gear;buffFood;potions
 *
 * 2. CSPS Native format — 9 sections separated by `#`
 *    skills#hotbars#attributes#mundus#championPoints#gear#quickslots#outfits#role
 *    (sub-sections within each use `*` and `;` and `,` delimiters)
 */

import { v4 as uuidv4 } from 'uuid';

import { CHAMPION_POINT_ABILITIES, ChampionPointTree } from '@/types/champion-points';
import { Logger } from '@/utils/logger';

import { getItemIdsBySet } from '../../loadout-manager/data/itemIdMap';
import {
  findCollectionItemBySetAndSlotType,
  getSetNameOrFallback,
} from '../../loadout-manager/data/itemSetCollections';
import type { SlotType } from '../../loadout-manager/data/slotTypes';
import type { GearPiece, SkillBar, SkillsConfig } from '../../loadout-manager/types/loadout.types';
import { getDefaultLinesForClass, EQUIP_SLOTS } from '../data/esoStaticData';
import type {
  Build,
  BuildChampionPoints,
  BuildConsumables,
  BuildSetup,
  ClassSkillLineId,
  CombatRole,
  ESOClass,
  QuickslotEntry,
  SkilledAbility,
} from '../types/build.types';

const logger = new Logger({ contextPrefix: 'CSPSExportCode' });

// ── ESO ID → Build Editor mappings ──────────────────────────────────

/** ESO class IDs → build editor class keys */
const ESO_CLASS_MAP: Record<number, ESOClass> = {
  1: 'dragonknight',
  2: 'sorcerer',
  3: 'nightblade',
  4: 'warden',
  5: 'necromancer',
  6: 'templar',
  7: 'arcanist',
};

/** ESO race IDs → build editor race keys */
const ESO_RACE_MAP: Record<number, string> = {
  1: 'breton',
  2: 'redguard',
  3: 'orc',
  4: 'darkelf',
  5: 'nord',
  6: 'argonian',
  7: 'highelf',
  8: 'woodelf',
  9: 'khajiit',
  10: 'imperial',
};

/** CSPS mundus ability IDs → build editor mundus string IDs */
const MUNDUS_MAP: Record<number, string> = {
  13940: 'warrior',
  13943: 'mage',
  13974: 'serpent',
  13975: 'thief',
  13976: 'lady',
  13977: 'steed',
  13978: 'lord',
  13979: 'apprentice',
  13980: 'ritual',
  13981: 'lover',
  13982: 'atronach',
  13984: 'shadow',
  13985: 'tower',
};

/**
 * ESO-Hub curse ID → build editor curse string.
 * Vampire stages from GetUnitActiveVampireStage(), werewolf from IsUnitActiveWerewolf().
 */
const CURSE_MAP: Record<number, string> = {
  0: 'none',
  1: 'vampire-1',
  2: 'vampire-2',
  3: 'vampire-3',
  4: 'vampire-4',
  // Werewolf encoding varies — try common values
  5: 'werewolf',
  10: 'werewolf',
};

/**
 * Detect ESO class from ability IDs on the hotbar.
 * Reuses the same range-based approach as the SavedVariables import.
 */
const CLASS_SKILL_RANGES: Array<{ esoClass: ESOClass; minId: number; maxId: number }> = [
  { esoClass: 'dragonknight', minId: 20657, maxId: 21014 },
  { esoClass: 'dragonknight', minId: 28988, maxId: 29230 },
  { esoClass: 'dragonknight', minId: 31816, maxId: 32084 },
  { esoClass: 'sorcerer', minId: 24371, maxId: 24947 },
  { esoClass: 'sorcerer', minId: 23304, maxId: 23685 },
  { esoClass: 'sorcerer', minId: 18718, maxId: 19318 },
  { esoClass: 'nightblade', minId: 18342, maxId: 18519 },
  { esoClass: 'nightblade', minId: 25255, maxId: 25476 },
  { esoClass: 'nightblade', minId: 33308, maxId: 33617 },
  { esoClass: 'templar', minId: 22057, maxId: 22362 },
  { esoClass: 'templar', minId: 21752, maxId: 22007 },
  { esoClass: 'templar', minId: 22253, maxId: 22523 },
  { esoClass: 'warden', minId: 85982, maxId: 86287 },
  { esoClass: 'warden', minId: 85532, maxId: 85882 },
  { esoClass: 'warden', minId: 86132, maxId: 86537 },
  { esoClass: 'necromancer', minId: 114860, maxId: 115200 },
  { esoClass: 'necromancer', minId: 115800, maxId: 116200 },
  { esoClass: 'necromancer', minId: 115200, maxId: 115600 },
  { esoClass: 'arcanist', minId: 183600, maxId: 184200 },
  { esoClass: 'arcanist', minId: 183000, maxId: 183600 },
  { esoClass: 'arcanist', minId: 184200, maxId: 184800 },
];

function detectClassFromAbilityIds(abilityIds: number[]): ESOClass | null {
  const classCounts: Record<string, number> = {};
  for (const id of abilityIds) {
    for (const range of CLASS_SKILL_RANGES) {
      if (id >= range.minId && id <= range.maxId) {
        classCounts[range.esoClass] = (classCounts[range.esoClass] || 0) + 1;
      }
    }
  }
  let bestClass: ESOClass | null = null;
  let bestCount = 0;
  for (const [cls, count] of Object.entries(classCounts)) {
    if (count > bestCount) {
      bestCount = count;
      bestClass = cls as ESOClass;
    }
  }
  return bestClass;
}

/**
 * ESO skill line IDs → build editor ClassSkillLineId.
 * Source: GetSkillLineId(SKILL_TYPE_CLASS, skillLineIndex) in the ESO API.
 */
const ESO_SKILL_LINE_MAP: Record<number, ClassSkillLineId> = {
  // Dragonknight
  35: 'class.ardent-flame',
  36: 'class.draconic-power',
  37: 'class.earthen-heart',
  // Nightblade
  38: 'class.assassination',
  39: 'class.shadow',
  40: 'class.siphoning',
  // Sorcerer
  41: 'class.dark-magic',
  42: 'class.daedric-summoning',
  43: 'class.storm-calling',
  // Templar
  22: 'class.aedric-spear',
  27: 'class.dawns-wrath',
  28: 'class.restoring-light',
  // Warden
  127: 'class.animal-companions',
  128: 'class.green-balance',
  129: 'class.winters-embrace',
  // Necromancer
  131: 'class.grave-lord',
  132: 'class.bone-tyrant',
  133: 'class.living-death',
  // Arcanist
  218: 'class.herald-of-the-tome',
  219: 'class.soldier-of-apocrypha',
  220: 'class.curative-runeforms',
};

/**
 * Parse subclass skill line IDs from section 7 and map to ClassSkillLineId.
 * Returns [line1, line2, line3] or nulls if IDs are unknown.
 */
function parseSubclassLines(
  subclassStr: string,
  fallbackClass: ESOClass,
): [ClassSkillLineId | null, ClassSkillLineId | null, ClassSkillLineId | null] {
  if (!subclassStr || subclassStr === '0' || subclassStr === '-') {
    return getDefaultLinesForClass(fallbackClass);
  }

  const ids = subclassStr.split(',').map((s) => parseInt(s.trim(), 10));
  const mapped: Array<ClassSkillLineId | null> = ids
    .filter((id) => !isNaN(id) && id > 0)
    .map((id) => ESO_SKILL_LINE_MAP[id] ?? null);

  // Pad to 3 slots
  while (mapped.length < 3) mapped.push(null);

  return [mapped[0], mapped[1], mapped[2]];
}

/** CSPS role index → build editor CombatRole */
function roleIndexToRole(index: number): CombatRole {
  switch (index) {
    case 2:
      return 'tank';
    case 4:
      return 'healer';
    case 1:
    default:
      return 'magicka-dps';
  }
}

// ── Detection ────────────────────────────────────────────────────────

/**
 * Detect whether a string looks like a CSPS ESO-Hub export code.
 *
 * Heuristics:
 * - Contains at least 13 semicolons (15 sections → 14 separators, but some may be empty)
 * - Does NOT start with Lua-like patterns (table assignments, comments)
 * - First section is a small number (class ID 1–7)
 */
export function isCSPSExportCode(input: string): boolean {
  const trimmed = input.trim();

  // Must not look like Lua
  if (trimmed.startsWith('--') || trimmed.includes(' = {') || trimmed.includes(' =\n')) {
    return false;
  }

  const sections = trimmed.split(';');
  if (sections.length < 13) return false;

  // First section should be a valid class ID (1–7)
  const classId = parseInt(sections[0], 10);
  if (isNaN(classId) || classId < 1 || classId > 7) return false;

  // Second section should be a valid race ID (1–10)
  const raceId = parseInt(sections[1], 10);
  if (isNaN(raceId) || raceId < 1 || raceId > 10) return false;

  return true;
}

// ── Parsing helpers ──────────────────────────────────────────────────

function parseIntSafe(s: string): number {
  const n = parseInt(s, 10);
  return isNaN(n) ? 0 : n;
}

function parseCommaInts(s: string): number[] {
  if (!s || s === '0') return [];
  return s
    .split(',')
    .map((v) => parseIntSafe(v.trim()))
    .filter((n) => n > 0);
}

/**
 * Parse comma-separated "abilityId:morph" entries into SkilledAbility[].
 * Used for both ESO-Hub passives section and native format prog skills.
 */
function parseSkilledAbilities(s: string): SkilledAbility[] {
  if (!s || s === '0' || s === '-') return [];
  const result: SkilledAbility[] = [];
  for (const entry of s.split(',')) {
    const parts = entry.trim().split(':');
    const abilityId = parseIntSafe(parts[0]);
    if (abilityId <= 0) continue;
    const morph = parts.length > 1 ? parseIntSafe(parts[1]) : 0;
    result.push({ abilityId, morph });
  }
  return result;
}

/**
 * Parse hotbar section: 6 comma-separated ability IDs.
 * Scribing abilities may have format "abilityId:script1:script2:script3".
 */
function parseHotbarSection(s: string): { bar: number[]; scribedIds: number[] } {
  const scribedIds: number[] = [];
  if (!s) return { bar: [0, 0, 0, 0, 0, 0], scribedIds };

  const bar = s.split(',').map((slot) => {
    const trimmed = slot.trim();
    if (!trimmed || trimmed === '0' || trimmed === '-') return 0;

    // Scribing format: "abilityId:script1:script2:script3"
    if (trimmed.includes(':')) {
      const parts = trimmed.split(':');
      const id = parseIntSafe(parts[0]);
      if (id > 0 && parts.length >= 4) {
        scribedIds.push(id);
      }
      return id;
    }

    return parseIntSafe(trimmed);
  });

  // Pad to 6 slots
  while (bar.length < 6) bar.push(0);
  return { bar: bar.slice(0, 6), scribedIds };
}

/**
 * Convert front/back bar arrays (6 slots each) into SkillsConfig.
 * CSPS slots 0-4 (abilities) → our slots 3-7, slot 5 (ult) → slot 8.
 */
function hotbarsToSkillsConfig(frontBar: number[], backBar: number[]): SkillsConfig {
  const convertBar = (bar: number[]): SkillBar => {
    const result: SkillBar = {};
    for (let i = 0; i < 5; i++) {
      if (bar[i] && bar[i] > 0) result[i + 3] = bar[i];
    }
    if (bar[5] && bar[5] > 0) result[8] = bar[5];
    return result;
  };
  return { 0: convertBar(frontBar), 1: convertBar(backBar) };
}

/**
 * Parse slotted CP: 12 comma-separated IDs (craft×4, warfare×4, fitness×4).
 */
function parseSlottedCP(s: string): BuildChampionPoints {
  const cp: BuildChampionPoints = {
    craft: { slots: [null, null, null, null], passives: {} },
    warfare: { slots: [null, null, null, null], passives: {} },
    fitness: { slots: [null, null, null, null], passives: {} },
  };
  if (!s) return cp;

  const ids = s.split(',').map((v) => {
    const n = parseIntSafe(v.trim());
    return n > 0 ? n : null;
  });

  // Order: craft(0-3), warfare(4-7), fitness(8-11)
  const treeOrder: Array<keyof BuildChampionPoints> = ['craft', 'warfare', 'fitness'];
  for (let t = 0; t < 3; t++) {
    for (let slot = 0; slot < 4; slot++) {
      const idx = t * 4 + slot;
      cp[treeOrder[t]].slots[slot] = ids[idx] ?? null;
    }
  }

  return cp;
}

/**
 * Merge passive CP allocations: comma-separated "cpId:value" pairs.
 *
 * NOTE: ESO-Hub format uses CSPS-internal CP ability IDs which may differ
 * from our CHAMPION_POINT_ABILITIES enum. Unmapped IDs are silently skipped.
 * A full mapping table would be needed to preserve all passive allocations.
 */
function mergePassiveCP(cp: BuildChampionPoints, s: string): void {
  if (!s) return;

  for (const pair of s.split(',')) {
    const [idStr, valStr] = pair.split(':');
    const cpId = parseIntSafe(idStr);
    const value = parseIntSafe(valStr);
    if (cpId <= 0 || value <= 0) continue;

    const meta = CHAMPION_POINT_ABILITIES[cpId as keyof typeof CHAMPION_POINT_ABILITIES];
    if (!meta) continue;

    const treeKey =
      meta.tree === ChampionPointTree.Warfare
        ? 'warfare'
        : meta.tree === ChampionPointTree.Fitness
          ? 'fitness'
          : 'craft';

    cp[treeKey].passives[String(cpId)] = value;
  }
}

/**
 * Map an ESO equip slot index to our SlotType string.
 * Returns undefined for unmapped slots.
 */
function esoSlotToSlotType(esoSlot: number): SlotType | undefined {
  return EQUIP_SLOTS.find((s) => s.slot === esoSlot)?.slotType as SlotType | undefined;
}

/**
 * Resolve a CSPS set ID to an item ID for the build editor.
 *
 * CSPS exports set IDs (from GetItemLinkSetInfo) but the build editor
 * needs item IDs for icon/name lookup via getItemInfo().
 *
 * Strategy:
 * 1. Try collection lookup by set ID + slot type (works for monster sets)
 * 2. Fall back to set name → getItemIdsBySet (works for body/jewelry sets)
 * 3. Last resort: return the raw set ID (won't display but won't crash)
 */
function resolveSetIdToItemId(setId: number, esoSlot: number): number {
  // 1. Try slot-specific collection lookup (monster sets, crafted)
  const slotType = esoSlotToSlotType(esoSlot);
  if (slotType) {
    const collectionItem = findCollectionItemBySetAndSlotType(setId, slotType);
    if (collectionItem?.itemId) return collectionItem.itemId;
  }

  // 2. Fall back to set name → item ID lookup
  const setName = getSetNameOrFallback(setId);
  if (setName && !setName.startsWith('Unknown Set')) {
    const itemIds = getItemIdsBySet(setName);
    if (itemIds.length > 0) return itemIds[0];
  }

  // 3. Return raw set ID as last resort
  return setId;
}

/**
 * Parse gear section: comma-separated "slot:type:setId:trait:enchant" entries.
 */
function parseGearSection(s: string): Record<number, GearPiece> {
  const gear: Record<number, GearPiece> = {};
  if (!s) return gear;

  for (const entry of s.split(',')) {
    const parts = entry.split(':');
    if (parts.length < 5) continue;

    const slot = parseIntSafe(parts[0]);
    const setId = parseIntSafe(parts[2]);
    const trait = parseIntSafe(parts[3]);
    const enchant = parseIntSafe(parts[4]);

    if (setId <= 0) continue;

    gear[slot] = {
      id: resolveSetIdToItemId(setId, slot),
      trait: String(trait),
      enchant: String(enchant),
    };
  }

  return gear;
}

/**
 * Parse consumables sections (buff food and potions).
 * Format: comma-separated "itemId:secondId" pairs.
 */
function parseConsumables(foodStr: string, potionStr: string): BuildConsumables {
  const consumables: BuildConsumables = {
    potions: [],
    food: {},
  };

  if (foodStr && foodStr !== '0') {
    const parts = foodStr.split(',');
    if (parts.length > 0) {
      const [idStr] = parts[0].split(':');
      const id = parseIntSafe(idStr);
      if (id > 0) {
        consumables.food = { id };
      }
    }
  }

  if (potionStr && potionStr !== '0') {
    for (const entry of potionStr.split(',')) {
      const [idStr] = entry.split(':');
      const id = parseIntSafe(idStr);
      if (id > 0) {
        consumables.potions.push({ id, name: '', effects: [] });
      }
    }
  }

  return consumables;
}

// ── Main parser ──────────────────────────────────────────────────────

export interface CSPSExportCodeResult {
  build: Build;
}

/**
 * Parse a CSPS ESO-Hub format export code into a Build.
 * Throws if the input is not a valid export code.
 */
export function parseCSPSExportCode(input: string): CSPSExportCodeResult {
  const trimmed = input.trim();
  const sections = trimmed.split(';');

  if (sections.length < 13) {
    throw new Error(
      `Invalid CSPS export code: expected at least 13 sections, got ${sections.length}.`,
    );
  }

  // Section 1: Class ID
  const classId = parseIntSafe(sections[0]);
  const esoClass = ESO_CLASS_MAP[classId] ?? 'dragonknight';

  // Section 2: Race ID
  const raceId = parseIntSafe(sections[1]);
  const race = ESO_RACE_MAP[raceId];

  // Section 3: Role
  const roleIndex = parseIntSafe(sections[2]);
  const role = roleIndexToRole(roleIndex);

  // Section 4: Attributes (health:magicka:stamina)
  const attrParts = (sections[3] || '0:0:0').split(':');
  const attributes = {
    health: parseIntSafe(attrParts[0]),
    magicka: parseIntSafe(attrParts[1]),
    stamina: parseIntSafe(attrParts[2]),
  };

  // Section 5: Curse ID (0=none, 1-4=vampire stages, 5/10=werewolf)
  const curseId = parseIntSafe(sections[4]);
  const curse = CURSE_MAP[curseId] ?? 'none';

  // Section 6: Mundus ability ID
  const mundusId = parseIntSafe(sections[5]);
  const mundusStone = MUNDUS_MAP[mundusId] ?? '';

  // Section 7: Subclass skill line IDs (comma-separated)
  const classSkillLines = parseSubclassLines(sections[6] || '', esoClass);

  // Section 8 & 9: Hotbars
  const frontParsed = parseHotbarSection(sections[7] || '');
  const backParsed = parseHotbarSection(sections[8] || '');
  const skills = hotbarsToSkillsConfig(frontParsed.bar, backParsed.bar);
  const scribedAbilityIds = [...frontParsed.scribedIds, ...backParsed.scribedIds];

  // Section 10: Passives (comma-separated ability IDs)
  const passives = parseCommaInts(sections[9] || '');

  // Section 11 & 12: Champion Points
  const cp = parseSlottedCP(sections[10] || '');
  mergePassiveCP(cp, sections[11] || '');

  // Section 13: Gear
  const gear = parseGearSection(sections[12] || '');

  // Section 14 & 15: Consumables
  const consumables = parseConsumables(sections[13] || '', sections[14] || '');

  const now = new Date().toISOString();

  const setup: BuildSetup = {
    id: uuidv4(),
    name: 'Imported Setup',
    attributes,
    curse,
    mundusStone,
    gear,
    skills,
    cp,
    consumables,
    passives,
    screenshots: [],
    ...(scribedAbilityIds.length > 0 ? { scribedAbilityIds } : {}),
  };

  const build: Build = {
    id: uuidv4(),
    name: 'Imported Build',
    shortDescription: 'Imported from CSPS export code',
    esoClass,
    classSkillLines,
    role,
    gameMode: 'pve',
    races: race ? [race] : [],
    setups: [setup],
    guide: { content: '', youtubeUrl: '', bannerImageUrl: '' },
    settings: {
      visibility: 'public',
      dlc: 'Base Game',
      setupOrder: [0],
    },
    addonImportString: trimmed,
    createdAt: now,
    updatedAt: now,
  };

  logger.info('Parsed CSPS export code', {
    esoClass,
    role,
    race,
    mundusStone,
    frontBarSkills: frontParsed.bar.filter((n) => n > 0).length,
    backBarSkills: backParsed.bar.filter((n) => n > 0).length,
    passiveCount: passives.length,
    gearSlots: Object.keys(gear).length,
  });

  return { build };
}

// ══════════════════════════════════════════════════════════════════════
// CSPS Native Format (#-delimited, 9 sections)
// ══════════════════════════════════════════════════════════════════════

/**
 * Detect whether a string looks like a CSPS native compressed export code.
 *
 * Heuristics:
 * - Contains `#` delimiters (at least 4 — some trailing sections may be `-`)
 * - Does NOT look like Lua or an ESO-Hub code
 * - First section contains skill data with `*` sub-delimiters or is `-`
 */
export function isCSPSNativeCode(input: string): boolean {
  const trimmed = input.trim();

  // Must not look like Lua
  if (trimmed.startsWith('--') || trimmed.includes(' = {') || trimmed.includes(' =\n')) {
    return false;
  }

  // Must not look like ESO-Hub (starts with a class ID digit and uses `;`)
  if (isCSPSExportCode(trimmed)) return false;

  const sections = trimmed.split('#');
  if (sections.length < 5) return false;

  // Native format: section 1 is skills (contains `*` or `,` or is `-`)
  // Section 3 is attributes (contains `;` for health;magicka;stamina)
  const skillsSection = sections[0];
  const attrSection = sections[2];

  const skillsLooksValid =
    skillsSection === '-' ||
    skillsSection.includes('*') ||
    skillsSection.includes(',') ||
    skillsSection.includes(':');

  const attrLooksValid = attrSection === '-' || attrSection.includes(';');

  return skillsLooksValid && attrLooksValid;
}

/**
 * Parse CSPS native hotbar section.
 * Format: up to 3 bars separated by `;`, each bar has 6 slots separated by `,`.
 * Scribing abilities prefixed with `c`.
 */
function parseNativeHotbar(s: string): {
  frontBar: number[];
  backBar: number[];
  scribedIds: number[];
} {
  const scribedIds: number[] = [];
  const emptyBar = [0, 0, 0, 0, 0, 0];
  if (!s || s === '-') return { frontBar: emptyBar, backBar: [...emptyBar], scribedIds };

  const bars = s.split(';');

  const parseBar = (barStr: string | undefined): number[] => {
    if (!barStr || barStr === '-') return [0, 0, 0, 0, 0, 0];
    const ids = barStr.split(',').map((slot) => {
      const trimmed = slot.trim();
      if (!trimmed || trimmed === '-' || trimmed === '0') return 0;

      const isScribed = trimmed.startsWith('c');
      const numStr = isScribed ? trimmed.slice(1) : trimmed;
      const n = parseIntSafe(numStr);
      if (n <= 0) return 0;
      if (isScribed) scribedIds.push(n);
      return n;
    });
    while (ids.length < 6) ids.push(0);
    return ids.slice(0, 6);
  };

  return {
    frontBar: parseBar(bars[0]),
    backBar: parseBar(bars[1]),
    scribedIds,
  };
}

/**
 * Parse CSPS native skills section.
 * Format: `progSkills*passiveSkills*craftedScribing*skillStyles*subclasses`
 * Each sub-section uses comma-separated entries.
 * prog: "abilityId:morph,..."   pass: "abilityId:rank,..."
 */
function parseNativeSkills(s: string): {
  passives: number[];
  scribedIds: number[];
  skilledAbilities: SkilledAbility[];
} {
  if (!s || s === '-') return { passives: [], scribedIds: [], skilledAbilities: [] };

  const parts = s.split('*');
  // parts[0] = prog (active skills with morph choices)
  // parts[1] = pass (passive skills)
  // parts[2] = crafted scribing
  const passives: number[] = [];
  const scribedIds: number[] = [];

  // Parse active skills with morph data from part[0] (prog)
  const skilledAbilities = parseSkilledAbilities(parts[0] || '-');

  // Parse passives from part[1]
  if (parts[1] && parts[1] !== '-') {
    for (const entry of parts[1].split(',')) {
      const trimmed = entry.trim();
      if (!trimmed) continue;
      const [idStr] = trimmed.split(':');
      const id = parseIntSafe(idStr);
      if (id > 0) passives.push(id);
    }
  }

  // Parse crafted/scribing from part[2]
  if (parts[2] && parts[2] !== '-') {
    for (const entry of parts[2].split(',')) {
      const trimmed = entry.trim();
      if (!trimmed) continue;
      const [idStr] = trimmed.split(':');
      const id = parseIntSafe(idStr);
      if (id > 0) scribedIds.push(id);
    }
  }

  return { passives, scribedIds, skilledAbilities };
}

/**
 * Parse CSPS native champion points section.
 * Format: `cpValues*cpHotbar`
 * cpValues: "skillId-value;skillId-value;..."
 * cpHotbar: "id,id,id,id;id,id,id,id;id,id,id,id" (craft;warfare;fitness, 4 each)
 */
function parseNativeCP(s: string): BuildChampionPoints {
  const cp: BuildChampionPoints = {
    craft: { slots: [null, null, null, null], passives: {} },
    warfare: { slots: [null, null, null, null], passives: {} },
    fitness: { slots: [null, null, null, null], passives: {} },
  };
  if (!s || s === '-') return cp;

  const parts = s.split('*');

  // cpValues (passive allocations): "skillId-value;skillId-value;..."
  if (parts[0] && parts[0] !== '-') {
    for (const entry of parts[0].split(';')) {
      if (!entry.includes('-')) continue;
      const [idStr, valStr] = entry.split('-');
      const cpId = parseIntSafe(idStr);
      const value = parseIntSafe(valStr);
      if (cpId <= 0 || value <= 0) continue;

      const meta = CHAMPION_POINT_ABILITIES[cpId as keyof typeof CHAMPION_POINT_ABILITIES];
      if (!meta) continue;

      const treeKey =
        meta.tree === ChampionPointTree.Warfare
          ? 'warfare'
          : meta.tree === ChampionPointTree.Fitness
            ? 'fitness'
            : 'craft';
      cp[treeKey].passives[String(cpId)] = value;
    }
  }

  // cpHotbar (slotted perks): "craft1,craft2,craft3,craft4;warfare1,...;fitness1,..."
  if (parts[1] && parts[1] !== '-') {
    const groups = parts[1].split(';');
    const treeOrder: Array<keyof BuildChampionPoints> = ['craft', 'warfare', 'fitness'];
    for (let g = 0; g < groups.length && g < 3; g++) {
      const ids = (groups[g] || '').split(',').map((v) => {
        const n = parseIntSafe(v.trim());
        return n > 0 ? n : null;
      });
      for (let slot = 0; slot < 4; slot++) {
        cp[treeOrder[g]].slots[slot] = ids[slot] ?? null;
      }
    }
  }

  return cp;
}

/**
 * Parse CSPS native gear section.
 * 16 slots separated by `;` in CSPS gear slot order.
 * Each entry: "setId:type:trait:quality:enchant" or "0" for empty.
 *
 * CSPS gear slot order → ESO equip slot index:
 * [HEAD(0), SHOULDERS(3), CHEST(2), HAND(16), WAIST(6), LEGS(8), FEET(9),
 *  NECK(1), RING1(11), RING2(12), MAIN(4), OFF(5), BACKUP_MAIN(20), BACKUP_OFF(21),
 *  POISON, BACKUP_POISON]
 */
const NATIVE_GEAR_SLOT_ORDER = [0, 3, 2, 16, 6, 8, 9, 1, 11, 12, 4, 5, 20, 21] as const;

function parseNativeGear(s: string): Record<number, GearPiece> {
  const gear: Record<number, GearPiece> = {};
  if (!s || s === '-') return gear;

  const entries = s.split(';');
  for (let i = 0; i < entries.length && i < NATIVE_GEAR_SLOT_ORDER.length; i++) {
    const raw = entries[i]?.trim();
    if (!raw || raw === '0' || raw === '-') continue;
    if (raw.startsWith('mara:')) continue;

    const parts = raw.split(':');
    if (parts.length < 5) continue;

    const setId = parseIntSafe(parts[0]);
    const trait = parseIntSafe(parts[2]);
    const enchant = parseIntSafe(parts[4]);
    if (setId <= 0) continue;

    const esoSlot = NATIVE_GEAR_SLOT_ORDER[i];
    gear[esoSlot] = {
      id: resolveSetIdToItemId(setId, esoSlot),
      trait: String(trait),
      enchant: String(enchant),
    };
  }

  return gear;
}

/**
 * Parse a CSPS native compressed export code into a Build.
 * Throws if the input is not valid.
 *
 * Format: skills#hotbars#attributes#mundus#cp#gear#quickslots#outfits#role
 */
export function parseCSPSNativeCode(input: string): CSPSExportCodeResult {
  const trimmed = input.trim();
  const sections = trimmed.split('#');

  if (sections.length < 5) {
    throw new Error(
      `Invalid CSPS native code: expected at least 5 sections, got ${sections.length}.`,
    );
  }

  // Section 1: Skills (prog*pass*crafted*styles*subclasses)
  const {
    passives: skillPassives,
    scribedIds: skillScribedIds,
    skilledAbilities: nativeSkilledAbilities,
  } = parseNativeSkills(sections[0]);

  // Section 2: Hotbars (bar1;bar2;bar3 — slots comma-separated, scribed prefixed "c")
  const hotbar = parseNativeHotbar(sections[1]);
  const allScribedIds = [...new Set([...hotbar.scribedIds, ...skillScribedIds])];
  const skills = hotbarsToSkillsConfig(hotbar.frontBar, hotbar.backBar);

  // Section 3: Attributes (health;magicka;stamina)
  let attributes = { health: 0, magicka: 0, stamina: 0 };
  if (sections[2] && sections[2] !== '-') {
    const attrParts = sections[2].split(';');
    attributes = {
      health: parseIntSafe(attrParts[0]),
      magicka: parseIntSafe(attrParts[1]),
      stamina: parseIntSafe(attrParts[2]),
    };
  }

  // Section 4: Mundus (ability ID)
  const mundusId = sections[3] && sections[3] !== '-' ? parseIntSafe(sections[3]) : 0;
  const mundusStone = MUNDUS_MAP[mundusId] ?? '';

  // Section 5: Champion Points (cpValues*cpHotbar)
  const cp = parseNativeCP(sections[4] || '-');

  // Section 6: Gear (16 slots separated by `;`)
  const gear = parseNativeGear(sections[5] || '-');

  // Section 7: Quickslots (same type:id format as SavedVariables)
  const quickslots: QuickslotEntry[] = [];
  if (sections[6] && sections[6] !== '-') {
    // Native quickslots: "qs;catIndex;bar1;bar2;...;aq:N" or simple "type:id,type:id,..."
    const qsStr = sections[6];
    let barData: string;
    if (qsStr.startsWith('qs;') || qsStr.startsWith('qs,')) {
      const segments = qsStr.split(';');
      barData = segments
        .slice(2)
        .filter((s) => !s.startsWith('aq:'))
        .join(',');
    } else {
      barData = qsStr;
    }
    for (const slot of barData.split(',')) {
      const trimmed = slot.trim();
      if (!trimmed || trimmed === '0' || trimmed === '-') continue;
      const parts = trimmed.split(':');
      if (parts.length < 2) continue;
      const type = parseIntSafe(parts[0]);
      const id = parseIntSafe(parts[1]);
      if (id > 0) quickslots.push({ type, id });
    }
  }

  // Section 8: Outfits — not mapped (Build type doesn't support outfits)

  // Section 9: Role
  const roleIndex = sections[8] && sections[8] !== '-' ? parseIntSafe(sections[8]) : 0;
  const role = roleIndexToRole(roleIndex);

  // Detect class from hotbar ability IDs (no explicit class field in native format)
  const allBarIds = [...hotbar.frontBar, ...hotbar.backBar].filter((n) => n > 0);
  const detectedClass = detectClassFromAbilityIds(allBarIds);
  const esoClass: ESOClass = detectedClass ?? 'any-class';
  const classSkillLines = getDefaultLinesForClass(esoClass);
  const now = new Date().toISOString();

  const setup: BuildSetup = {
    id: uuidv4(),
    name: 'Imported Setup',
    attributes,
    curse: 'none',
    mundusStone,
    gear,
    skills,
    cp,
    consumables: { potions: [], food: {} },
    passives: skillPassives,
    screenshots: [],
    ...(allScribedIds.length > 0 ? { scribedAbilityIds: allScribedIds } : {}),
    ...(nativeSkilledAbilities.length > 0 ? { skilledAbilities: nativeSkilledAbilities } : {}),
    ...(quickslots.length > 0 ? { quickslots } : {}),
  };

  const build: Build = {
    id: uuidv4(),
    name: 'Imported Build',
    shortDescription: 'Imported from CSPS native export code',
    esoClass,
    classSkillLines,
    role,
    gameMode: 'pve',
    races: [],
    setups: [setup],
    guide: { content: '', youtubeUrl: '', bannerImageUrl: '' },
    settings: {
      visibility: 'public',
      dlc: 'Base Game',
      setupOrder: [0],
    },
    addonImportString: trimmed,
    createdAt: now,
    updatedAt: now,
  };

  logger.info('Parsed CSPS native code', {
    role,
    mundusStone,
    frontBarSkills: hotbar.frontBar.filter((n) => n > 0).length,
    backBarSkills: hotbar.backBar.filter((n) => n > 0).length,
    passiveCount: skillPassives.length,
    gearSlots: Object.keys(gear).length,
  });

  return { build };
}
