/**
 * CSPS → Build Converter
 *
 * Bridges between Caro's Skill Point Saver addon data and the Build Editor's
 * Build type. Uses the low-level CSPS parsing utilities from loadout-manager
 * and maps the result into the flat Build/BuildSetup structure.
 */

import { v4 as uuidv4 } from 'uuid';

import { CHAMPION_POINT_ABILITIES, ChampionPointTree } from '@/types/champion-points';
import { Logger } from '@/utils/logger';

import { getItemIdsBySet, getSetItemsBySlot } from '../../loadout-manager/data/itemIdMap';
import {
  findCollectionItemBySetAndSlotType,
  getSetNameOrFallback,
} from '../../loadout-manager/data/itemSetCollections';
import type { SlotType } from '../../loadout-manager/data/slotTypes';
import type { GearPiece, SkillBar, SkillsConfig } from '../../loadout-manager/types/loadout.types';
import {
  decompressComp1,
  decompressComp2,
  decompressSkillParts,
  detectCSPSData,
  extractCSPSCharacters,
  parseAttributes,
  parseChampionPoints,
  parseGearComp,
  parseHotbar,
  type CSPSCharacterData,
  type CSPSGearEntry,
  type CSPSProfile,
  type CSPSSkillData,
} from '../../loadout-manager/utils/cspsConverter';
import { parseLuaSavedVariables } from '../../loadout-manager/utils/luaParser';
import { getDefaultLinesForClass, EQUIP_SLOTS } from '../data/esoStaticData';
import { esoTypeToArmorWeight } from '../data/setArmorWeights';
import type {
  Build,
  BuildChampionPoints,
  BuildSetup,
  CombatRole,
  ESOClass,
  QuickslotEntry,
  SkilledAbility,
} from '../types/build.types';

import {
  isCSPSExportCode,
  isCSPSNativeCode,
  parseCSPSExportCode,
  parseCSPSNativeCode,
} from './cspsExportCodeParser';

const logger = new Logger({ contextPrefix: 'CSPSImport' });

// ── CSPS → Build Editor Mappings ─────────────────────────────────────

/**
 * CSPS mundus ability IDs → build editor mundus string IDs.
 * Source: csps_mundus.lua mundusAbs table.
 */
const CSPS_MUNDUS_MAP: Record<number, string> = {
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
 * CSPS LFG role values → build editor CombatRole.
 * Source: csps_role.lua — maps LFG_ROLE_DPS/TANK/HEAL.
 */
function cspsRoleToCombatRole(roleStr: string): CombatRole {
  switch (roleStr) {
    case '2':
      return 'tank';
    case '4':
      return 'healer';
    case '1':
      return 'magicka-dps'; // DPS — default to magicka-dps
    default:
      return 'magicka-dps';
  }
}

/**
 * Attempt to detect the ESO class from werte skill data.
 * Each class has a known set of base skill line ability ID ranges.
 * We check the prog (active) skills against known class skill IDs.
 */
const CLASS_SKILL_RANGES: Array<{ esoClass: ESOClass; minId: number; maxId: number }> = [
  // Dragonknight skill lines (Ardent Flame, Draconic Power, Earthen Heart)
  { esoClass: 'dragonknight', minId: 20657, maxId: 21014 },
  { esoClass: 'dragonknight', minId: 28988, maxId: 29230 },
  { esoClass: 'dragonknight', minId: 31816, maxId: 32084 },
  // Sorcerer (Dark Magic, Daedric Summoning, Storm Calling)
  { esoClass: 'sorcerer', minId: 24371, maxId: 24947 },
  { esoClass: 'sorcerer', minId: 23304, maxId: 23685 },
  { esoClass: 'sorcerer', minId: 18718, maxId: 19318 },
  // Nightblade (Assassination, Shadow, Siphoning)
  { esoClass: 'nightblade', minId: 18342, maxId: 18519 },
  { esoClass: 'nightblade', minId: 25255, maxId: 25476 },
  { esoClass: 'nightblade', minId: 33308, maxId: 33617 },
  // Templar (Aedric Spear, Dawn's Wrath, Restoring Light)
  { esoClass: 'templar', minId: 22057, maxId: 22362 },
  { esoClass: 'templar', minId: 21752, maxId: 22007 },
  { esoClass: 'templar', minId: 22253, maxId: 22523 },
  // Warden (Animal Companions, Green Balance, Winter's Embrace)
  { esoClass: 'warden', minId: 85982, maxId: 86287 },
  { esoClass: 'warden', minId: 85532, maxId: 85882 },
  { esoClass: 'warden', minId: 86132, maxId: 86537 },
  // Necromancer (Grave Lord, Bone Tyrant, Living Death)
  { esoClass: 'necromancer', minId: 114860, maxId: 115200 },
  { esoClass: 'necromancer', minId: 115800, maxId: 116200 },
  { esoClass: 'necromancer', minId: 115200, maxId: 115600 },
  // Arcanist (Herald of the Tome, Soldier of Apocrypha, Curative Runeforms)
  { esoClass: 'arcanist', minId: 183600, maxId: 184200 },
  { esoClass: 'arcanist', minId: 183000, maxId: 183600 },
  { esoClass: 'arcanist', minId: 184200, maxId: 184800 },
];

function detectClassFromWerte(werte: CSPSSkillData | undefined): ESOClass | null {
  if (!werte?.prog) return null;

  const skills = decompressSkillParts(werte.prog);
  const classCounts: Record<string, number> = {};

  for (const skill of skills) {
    for (const range of CLASS_SKILL_RANGES) {
      if (skill.abilityId >= range.minId && skill.abilityId <= range.maxId) {
        classCounts[range.esoClass] = (classCounts[range.esoClass] || 0) + 1;
      }
    }
  }

  // Return the class with the most skill matches (if any)
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
 * Resolve a CSPS set ID to an item ID for the build editor.
 * See cspsExportCodeParser.ts resolveSetIdToItemId for full strategy docs.
 */
function resolveSetIdToItemId(setId: number, esoSlot: number): number {
  const slotType = EQUIP_SLOTS.find((s) => s.slot === esoSlot)?.slotType as SlotType | undefined;
  if (slotType) {
    const collectionItem = findCollectionItemBySetAndSlotType(setId, slotType);
    if (collectionItem?.itemId) return collectionItem.itemId;
  }
  const setName = getSetNameOrFallback(setId);
  if (setName && !setName.startsWith('Unknown Set')) {
    // Prefer slot-specific item to avoid storing e.g. a ring ID in a weapon slot
    if (slotType) {
      const slotItems = getSetItemsBySlot(setName, slotType);
      if (slotItems.length > 0) return slotItems[0];
    }
    const itemIds = getItemIdsBySet(setName);
    if (itemIds.length > 0) return itemIds[0];
  }
  return setId;
}

// Apparel slot indices — only these carry an armor weight in CSPS gear `type`.
const APPAREL_SLOT_SET = new Set<number>(
  EQUIP_SLOTS.filter((s) => s.category === 'apparel').map((s) => s.slot),
);

/**
 * Convert parsed CSPS gear entries into the build editor's GearConfig.
 */
function convertGearToConfig(
  gearEntries: Record<number, CSPSGearEntry>,
): Record<number, GearPiece> {
  const gear: Record<number, GearPiece> = {};

  for (const [slotStr, entry] of Object.entries(gearEntries)) {
    const slot = Number(slotStr);
    if (entry.setId <= 0) continue;

    const piece: GearPiece = {
      id: resolveSetIdToItemId(entry.setId, slot),
      trait: String(entry.trait),
      enchant: String(entry.enchant),
    };

    // Deserialize the armor weight CSPS stores in `type` (1/2/3) back onto
    // apparel pieces, so a free set's light/medium choice survives the round
    // trip instead of falling back to heavy. Non-apparel / type 0 → no weight.
    if (APPAREL_SLOT_SET.has(slot)) {
      const weight = esoTypeToArmorWeight(entry.type);
      if (weight) piece.weight = weight;
    }

    gear[slot] = piece;
  }

  return gear;
}

/**
 * Extract passive ability IDs from werte.pass data.
 */
function extractPassives(werte: CSPSSkillData | undefined): number[] {
  if (!werte?.pass) return [];
  const entries = decompressSkillParts(werte.pass);
  return entries.map((e) => e.abilityId).filter((id) => id > 0);
}

/**
 * Extract active skill morph data from werte.prog.
 * Returns all purchased skills with their morph choice (0=base, 1=morph1, 2=morph2).
 */
function extractSkilledAbilities(werte: CSPSSkillData | undefined): SkilledAbility[] {
  if (!werte?.prog) return [];
  const entries = decompressSkillParts(werte.prog);
  return entries
    .filter((e) => e.abilityId > 0)
    .map((e) => ({ abilityId: e.abilityId, morph: e.value }));
}

/**
 * Parse CSPS quickslots string into QuickslotEntry array.
 *
 * CSPS quickslots format:
 * - New format: "qs;catIndex;bar1Data;bar2Data;...;aq:activeIndex"
 * - Old format: "slot1,slot2,..."
 *
 * Each slot is either "0" (empty) or "type:id" / "type:id1:id2:id3:id4" (items).
 */
function parseQuickslots(qsStr: string): QuickslotEntry[] {
  if (!qsStr || qsStr === '-') return [];

  const entries: QuickslotEntry[] = [];

  // Determine format: new format starts with "qs"
  let barData: string;
  if (qsStr.startsWith('qs;') || qsStr.startsWith('qs,')) {
    // New format: "qs;catIndex;bar1slots;bar2slots;...;aq:N"
    const segments = qsStr.split(';');
    // Skip "qs" header and catIndex, collect bar data segments
    // Last segment may be "aq:N" — skip it
    const barSegments = segments.slice(2).filter((s) => !s.startsWith('aq:'));
    barData = barSegments.join(',');
  } else {
    // Old format: direct comma-separated slots
    barData = qsStr;
  }

  const slots = barData.split(',');
  for (const slot of slots) {
    const trimmed = slot.trim();
    if (!trimmed || trimmed === '0' || trimmed === '-') continue;

    const parts = trimmed.split(':');
    if (parts.length < 2) continue;

    const type = parseInt(parts[0], 10);
    const id = parseInt(parts[1], 10);
    if (isNaN(type) || isNaN(id) || id <= 0) continue;

    entries.push({ type, id });
  }

  return entries;
}

// ── Types ────────────────────────────────────────────────────────────

export interface CSPSCharacterOption {
  compositeKey: string;
  name: string;
  accountName: string;
  profileCount: number;
  data: CSPSCharacterData;
}

export interface CSPSParseResult {
  /** 'saved-variables' requires character selection; 'export-code' has a ready Build */
  format: 'saved-variables' | 'export-code';
  characters: CSPSCharacterOption[];
  /** Present when format is 'export-code' — the Build is ready to load directly */
  directBuild?: Build;
}

// ── Parsing ──────────────────────────────────────────────────────────

/**
 * Parse raw CSPS input — auto-detects whether it's an ESO-Hub export code
 * or a SavedVariables Lua file.
 *
 * - Export code: returns { format: 'export-code', directBuild, characters: [] }
 * - SavedVariables: returns { format: 'saved-variables', characters: [...] }
 *
 * Throws if neither format matches.
 */
export function parseCSPSInput(input: string): CSPSParseResult {
  // Try ESO-Hub export code first (fast string check)
  if (isCSPSExportCode(input)) {
    const { build } = parseCSPSExportCode(input);
    logger.info('Parsed CSPS ESO-Hub export code', { esoClass: build.esoClass, role: build.role });
    return { format: 'export-code', characters: [], directBuild: build };
  }

  // Try CSPS native compressed code (#-delimited)
  if (isCSPSNativeCode(input)) {
    const { build } = parseCSPSNativeCode(input);
    logger.info('Parsed CSPS native export code', { role: build.role });
    return { format: 'export-code', characters: [], directBuild: build };
  }

  // Fall back to SavedVariables Lua parsing
  const parsed = parseLuaSavedVariables(input);
  const detected = detectCSPSData(parsed);
  if (!detected) {
    throw new Error(
      "No CSPS (Caro's Skill Point Saver) data found. " +
        'Paste either a SavedVariables file or an export code from the addon.',
    );
  }

  const characterMap = extractCSPSCharacters(detected.data);
  const entries = Object.entries(characterMap);
  if (entries.length === 0) {
    throw new Error('CSPS data found but contains no characters.');
  }

  const characters: CSPSCharacterOption[] = entries.map(([key, { data, name, accountName }]) => ({
    compositeKey: key,
    name,
    accountName,
    profileCount: data.profiles ? Object.keys(data.profiles).length : 0,
    data,
  }));

  logger.info('Parsed CSPS input (SavedVariables)', {
    characterCount: characters.length,
    names: characters.map((c) => c.name),
  });

  return { format: 'saved-variables', characters };
}

// ── Hotbar → SkillsConfig ────────────────────────────────────────────

function convertHotbarToSkills(frontBar: number[], backBar: number[]): SkillsConfig {
  const convertBar = (bar: number[]): SkillBar => {
    const skillBar: SkillBar = {};
    // CSPS slots 0-4 (abilities) → our slots 3-7
    for (let i = 0; i < 5; i++) {
      if (bar[i] && bar[i] > 0) {
        skillBar[i + 3] = bar[i];
      }
    }
    // CSPS slot 5 (ultimate) → our slot 8
    if (bar[5] && bar[5] > 0) {
      skillBar[8] = bar[5];
    }
    return skillBar;
  };

  return {
    0: convertBar(frontBar),
    1: convertBar(backBar),
  };
}

// ── CP → BuildChampionPoints ─────────────────────────────────────────

/**
 * Map CSPS champion point hotbar (slotted perks) into Build's 3-tree structure.
 * Uses CHAMPION_POINT_ABILITIES to determine which tree each CP belongs to.
 */
function convertCPHotbarToChampionPoints(cpHotbarStr: string): BuildChampionPoints {
  const cp: BuildChampionPoints = {
    warfare: { slots: [null, null, null, null], passives: {} },
    fitness: { slots: [null, null, null, null], passives: {} },
    craft: { slots: [null, null, null, null], passives: {} },
  };

  if (!cpHotbarStr) return cp;

  // cpHotbar format: "id,id,id,id;id,id,id,id;id,id,id,id"
  // Three groups separated by semicolons: craft, warfare, fitness (4 slots each)
  const groups = cpHotbarStr.split(';');
  const treeOrder: Array<keyof BuildChampionPoints> = ['craft', 'warfare', 'fitness'];

  for (let g = 0; g < groups.length && g < treeOrder.length; g++) {
    const tree = treeOrder[g];
    const ids = (groups[g] || '').split(',').map((s) => {
      const n = parseInt(s.trim(), 10);
      return isNaN(n) || n <= 0 ? null : n;
    });

    for (let s = 0; s < 4; s++) {
      cp[tree].slots[s] = ids[s] ?? null;
    }
  }

  return cp;
}

/**
 * Merge passive CP allocations (cpPoints) into the BuildChampionPoints.
 * CSPS cpPoints format: "skillId-value;skillId-value;..."
 */
function mergeCPPassives(cp: BuildChampionPoints, cpPointsStr: string): void {
  const points = parseChampionPoints(cpPointsStr);

  for (const { skillId, value } of points) {
    if (skillId <= 0 || value <= 0) continue;

    // Look up which tree this CP belongs to
    const meta = CHAMPION_POINT_ABILITIES[skillId as keyof typeof CHAMPION_POINT_ABILITIES];
    if (!meta) continue;

    const treeKey =
      meta.tree === ChampionPointTree.Warfare
        ? 'warfare'
        : meta.tree === ChampionPointTree.Fitness
          ? 'fitness'
          : 'craft';

    cp[treeKey].passives[String(skillId)] = value;
  }
}

// ── Character → Build ────────────────────────────────────────────────

function buildSetupFromCharData(
  data: CSPSCharacterData | CSPSProfile,
  name: string,
): BuildSetup | null {
  const comp1 = decompressComp1(data.comp1);

  const setup: BuildSetup = {
    id: uuidv4(),
    name,
    attributes: { magicka: 0, health: 0, stamina: 0 },
    curse: 'none',
    mundusStone: '',
    gear: {},
    skills: { 0: {}, 1: {} },
    cp: {
      warfare: { slots: [null, null, null, null], passives: {} },
      fitness: { slots: [null, null, null, null], passives: {} },
      craft: { slots: [null, null, null, null], passives: {} },
    },
    consumables: { potions: [], food: {} },
    passives: [],
    screenshots: [],
  };

  if (!comp1) return setup;

  // Skills from hotbar (handles scribed "c" prefix)
  const hotbar = parseHotbar(comp1.hotbar);
  setup.skills = convertHotbarToSkills(hotbar.frontBar, hotbar.backBar);

  // Preserve scribed ability IDs for round-trip export
  if (hotbar.scribedIds && hotbar.scribedIds.size > 0) {
    setup.scribedAbilityIds = Array.from(hotbar.scribedIds);
  }

  // Attributes
  if (comp1.attributes) {
    const attrs = parseAttributes(comp1.attributes);
    setup.attributes = {
      magicka: attrs.magicka,
      health: attrs.health,
      stamina: attrs.stamina,
    };
  }

  // Mundus stone
  if (comp1.mundus && comp1.mundus !== '-') {
    const mundusId = parseInt(comp1.mundus, 10);
    if (!isNaN(mundusId) && CSPS_MUNDUS_MAP[mundusId]) {
      setup.mundusStone = CSPS_MUNDUS_MAP[mundusId];
    }
  }

  // Champion Points — slotted perks from cpHotbar, passives from cpPoints
  if (comp1.cpHotbar) {
    setup.cp = convertCPHotbarToChampionPoints(comp1.cpHotbar);
  }
  if (comp1.cpPoints) {
    mergeCPPassives(setup.cp, comp1.cpPoints);
  }

  // Quickslots
  if (comp1.quickslots && comp1.quickslots !== '-') {
    const qs = parseQuickslots(comp1.quickslots);
    if (qs.length > 0) {
      setup.quickslots = qs;
    }
  }

  // Gear from comp2
  const comp2 = decompressComp2(data.comp2);
  if (comp2?.gearComp) {
    const gearEntries = parseGearComp(comp2.gearComp);
    setup.gear = convertGearToConfig(gearEntries);
  }

  // Passives from werte.pass
  setup.passives = extractPassives(data.werte);

  // Active skills with morph choices from werte.prog
  const skilled = extractSkilledAbilities(data.werte);
  if (skilled.length > 0) {
    setup.skilledAbilities = skilled;
  }

  return setup;
}

/**
 * Convert a single CSPS character into a Build.
 * Creates one setup for the active build and additional setups for each profile.
 */
export function convertCSPSCharacterToBuild(character: CSPSCharacterOption): Build {
  const setups: BuildSetup[] = [];

  // Main active build
  const mainSetup = buildSetupFromCharData(character.data, 'Active Build');
  if (mainSetup) {
    setups.push(mainSetup);
  }

  // Profiles (up to 4 more, Build supports max 5 setups)
  if (character.data.profiles) {
    const profileEntries = Object.entries(character.data.profiles)
      .filter(([, p]) => p && typeof p === 'object')
      .sort(([a], [b]) => {
        const numA = Number(a);
        const numB = Number(b);
        if (!isNaN(numA) && !isNaN(numB)) return numA - numB;
        return a.localeCompare(b);
      });

    for (const [key, profile] of profileEntries) {
      if (setups.length >= 5) break;
      if (!profile) continue;
      const profileName = profile.name || `Profile ${key}`;
      const profileSetup = buildSetupFromCharData(profile as CSPSCharacterData, profileName);
      if (profileSetup) {
        setups.push(profileSetup);
      }
    }
  }

  // Ensure at least one setup
  if (setups.length === 0) {
    setups.push({
      id: uuidv4(),
      name: 'Default',
      attributes: { magicka: 0, health: 0, stamina: 0 },
      curse: 'none',
      mundusStone: '',
      gear: {},
      skills: { 0: {}, 1: {} },
      cp: {
        warfare: { slots: [null, null, null, null], passives: {} },
        fitness: { slots: [null, null, null, null], passives: {} },
        craft: { slots: [null, null, null, null], passives: {} },
      },
      consumables: { potions: [], food: {} },
      passives: [],
      screenshots: [],
    });
  }

  const now = new Date().toISOString();

  // Detect class from werte skill data (falls back to 'dragonknight')
  const detectedClass = detectClassFromWerte(character.data.werte) ?? 'dragonknight';

  // Detect role from comp1 (falls back to 'magicka-dps')
  const comp1 = decompressComp1(character.data.comp1);
  const role: CombatRole = comp1?.role ? cspsRoleToCombatRole(comp1.role) : 'magicka-dps';

  // Default class skill lines for the detected class
  const classSkillLines = getDefaultLinesForClass(detectedClass);

  return {
    id: uuidv4(),
    name: character.name,
    shortDescription: `Imported from CSPS — ${character.accountName}`,
    esoClass: detectedClass,
    classSkillLines,
    role,
    gameMode: 'pve',
    races: [],
    setups,
    guide: { content: '', youtubeUrl: '', bannerImageUrl: '' },
    settings: {
      visibility: 'public',
      dlc: 'Base Game',
      setupOrder: setups.map((_, i) => i),
    },
    addonImportString: '',
    createdAt: now,
    updatedAt: now,
  };
}
