/**
 * Caro's Skill Point Saver (CSPS) SavedVariables Converter
 *
 * Converts the in-game CSPS addon data into our internal LoadoutState format
 * and back, enabling bi-directional import/export of skill builds.
 *
 * CSPS SavedVariables structure:
 *   CSPSSavedVariables.Default["@AccountName"]["$AccountWide"] = {
 *     settings: { ... },
 *     charData: {
 *       [characterId]: {
 *         werte: {
 *           prog: { part1: "abilityId:morph,...", part2: "...", ... },
 *           pass: { part1: "abilityId:rank,...", part2: "...", ... },
 *         },
 *         comp1: "attributes#hotbar#cpPoints#cpHotbar#quickslots#role#mundus",
 *         comp2: "gearComp#gearCompUnique#outfitComp",
 *         profiles: { [profileId]: { ... } },
 *         $lastCharacterName: "CharacterName",
 *       }
 *     }
 *   }
 *
 * CSPS uses string-based compression:
 * - Skills stored as comma-separated "abilityId:morph" pairs, chunked into partN (100 per part)
 * - Hotbar, attributes, CP packed into #-delimited comp1/comp2 strings
 * - Hotbar format: abilities comma-separated per bar, semicolon between bars
 * - Attributes: "health;magicka;stamina"
 * - CP: "skillId-value;skillId-value;..."
 */

import { Logger } from '@/utils/logger';

import type {
  ChampionPointsConfig,
  LoadoutSetup,
  LoadoutState,
  SetupPage,
  SkillBar,
  SkillsConfig,
} from '../types/loadout.types';

const logger = new Logger({ contextPrefix: 'CSPSConverter' });

// ── CSPS raw types ──────────────────────────────────────────────────

/** Individual skill entry: abilityId and morph index (for active) or rank (for passive) */
export interface CSPSSkillEntry {
  abilityId: number;
  value: number; // morph index for prog, rank for pass
}

/** Skill data stored as delimited strings, chunked into parts of 100 */
export interface CSPSSkillData {
  prog?: Record<string, string>; // Active skills: "abilityId:morph,abilityId:morph,..."
  pass?: Record<string, string>; // Passive skills: "abilityId:rank,abilityId:rank,..."
  scribeStyleSubclass?: string; // "*"-delimited scribing data
  [key: string]: unknown;
}

/** Parsed hotbar: two bars of 6 slots each (5 abilities + 1 ultimate) */
export interface CSPSHotbar {
  frontBar: number[]; // 6 ability IDs
  backBar: number[]; // 6 ability IDs
  /** Set of ability IDs that are scribed/crafted (prefixed with "c" in CSPS) */
  scribedIds?: Set<number>;
}

/** Parsed attributes */
export interface CSPSAttributes {
  health: number;
  magicka: number;
  stamina: number;
}

/** Parsed champion point allocation */
export interface CSPSChampionPoint {
  skillId: number;
  value: number;
}

/** Parsed comp1 components */
export interface CSPSComp1 {
  attributes: string;
  hotbar: string;
  cpPoints: string;
  cpHotbar: string;
  quickslots: string;
  role: string;
  mundus: string;
}

/** Parsed comp2 components */
export interface CSPSComp2 {
  gearComp: string;
  gearCompUnique: string;
  outfitComp: string;
}

/**
 * Single gear entry parsed from comp2.gearComp.
 * Format per slot: "setId:type:trait:quality:enchant"
 */
export interface CSPSGearEntry {
  setId: number;
  type: number;     // armor type (light/medium/heavy) or weapon type
  trait: number;     // trait ID from GetItemLinkTraitInfo()
  quality: number;   // display quality (0=Trash..5=Legendary)
  enchant: number;   // final enchant ID from GetItemLinkFinalEnchantId()
}

/**
 * CSPS gear slot order — maps array index to ESO equip slot index.
 * CSPS iterates gear in this fixed order (from csps_gear.lua gearSlots).
 */
export const CSPS_GEAR_SLOT_ORDER = [
  0,   // HEAD
  3,   // SHOULDERS
  2,   // CHEST
  16,  // HAND (Gloves)
  6,   // WAIST (Belt)
  8,   // LEGS
  9,   // FEET
  1,   // NECK
  11,  // RING1
  12,  // RING2
  4,   // MAIN_HAND
  5,   // OFF_HAND
  20,  // BACKUP_MAIN
  21,  // BACKUP_OFF
  // indices 14,15 are POISON / BACKUP_POISON — we skip them
] as const;

/** Profile within a character's data */
export interface CSPSProfile {
  werte?: CSPSSkillData;
  comp1?: string;
  comp2?: string;
  name?: string;
  $lastCharacterName?: string;
  [key: string]: unknown;
}

/** Per-character data */
export interface CSPSCharacterData {
  werte?: CSPSSkillData;
  comp1?: string;
  comp2?: string;
  profiles?: Record<string | number, CSPSProfile>;
  bindings?: Record<string, unknown>;
  cpHbProfiles?: Record<string, unknown>;
  auxProfile?: unknown;
  history?: unknown[];
  svApi?: number;
  $lastCharacterName?: string;
  [key: string]: unknown;
}

/** Account-wide data containing settings and all character data */
export interface CSPSAccountData {
  settings?: Record<string, unknown>;
  charData?: Record<string, CSPSCharacterData>;
  bindings?: Record<string, unknown>;
  cpHbProfiles?: Record<string, unknown>;
  spHotkeys?: Record<string, unknown>;
  [key: string]: unknown;
}

/** Top-level saved variables structure */
export interface CSPSSavedVariables {
  Default?: Record<string, Record<string, CSPSAccountData>>;
  [key: string]: unknown;
}

// ── Constants ────────────────────────────────────────────────────────

const CSPS_TABLE_NAMES = ['CSPSSavedVariables', 'CSPS_SavedVariables', 'CarosSkillPointSaver'];

const SKILLS_PER_PART = 100;

// ── Detection ────────────────────────────────────────────────────────

/**
 * Check if parsed Lua assignments contain CSPS data.
 * Returns the table name and data if found.
 */
export function detectCSPSData(
  parsed: Record<string, unknown>,
): { tableName: string; data: CSPSSavedVariables } | null {
  for (const tableName of CSPS_TABLE_NAMES) {
    if (tableName in parsed) {
      const candidate = parsed[tableName];
      if (candidate && typeof candidate === 'object' && 'Default' in (candidate as object)) {
        logger.info('Detected CSPS data', { tableName });
        return { tableName, data: candidate as CSPSSavedVariables };
      }
    }
  }
  return null;
}

// ── String decompression ─────────────────────────────────────────────

/**
 * Parse CSPS skill parts into an array of skill entries.
 * Skills are stored as comma-separated "abilityId:value" pairs,
 * chunked into part1, part2, etc. (100 entries per part).
 */
export function decompressSkillParts(parts: Record<string, string> | undefined): CSPSSkillEntry[] {
  if (!parts) return [];

  const entries: CSPSSkillEntry[] = [];

  // Collect parts in order (part1, part2, ...)
  const partKeys = Object.keys(parts)
    .filter((key) => key.startsWith('part'))
    .sort((a, b) => {
      const numA = parseInt(a.replace('part', ''), 10);
      const numB = parseInt(b.replace('part', ''), 10);
      return numA - numB;
    });

  for (const partKey of partKeys) {
    const partValue = parts[partKey];
    if (typeof partValue !== 'string' || partValue.length === 0) continue;

    const pairs = partValue.split(',');
    for (const pair of pairs) {
      const trimmed = pair.trim();
      if (!trimmed) continue;

      const [idStr, valueStr] = trimmed.split(':');
      const abilityId = parseInt(idStr, 10);
      const value = parseInt(valueStr, 10);

      if (!isNaN(abilityId) && !isNaN(value)) {
        entries.push({ abilityId, value });
      }
    }
  }

  return entries;
}

/**
 * Compress skill entries back into chunked part strings.
 * Each part holds up to 100 entries.
 */
export function compressSkillEntries(entries: CSPSSkillEntry[]): Record<string, string> {
  const parts: Record<string, string> = {};

  for (let i = 0; i < entries.length; i += SKILLS_PER_PART) {
    const chunk = entries.slice(i, i + SKILLS_PER_PART);
    const partIndex = Math.floor(i / SKILLS_PER_PART) + 1;
    parts[`part${partIndex}`] = chunk.map((e) => `${e.abilityId}:${e.value}`).join(',');
  }

  return parts;
}

/**
 * Parse comp1 string into its component fields.
 * Format: "attributes#hotbar#cpPoints#cpHotbar#quickslots#role#mundus"
 */
export function decompressComp1(comp1: string | undefined): CSPSComp1 | null {
  if (!comp1 || typeof comp1 !== 'string') return null;

  const segments = comp1.split('#');
  return {
    attributes: segments[0] ?? '',
    hotbar: segments[1] ?? '',
    cpPoints: segments[2] ?? '',
    cpHotbar: segments[3] ?? '',
    quickslots: segments[4] ?? '',
    role: segments[5] ?? '',
    mundus: segments[6] ?? '',
  };
}

/**
 * Recompress comp1 components back into a #-delimited string.
 */
export function compressComp1(comp1: CSPSComp1): string {
  return [
    comp1.attributes,
    comp1.hotbar,
    comp1.cpPoints,
    comp1.cpHotbar,
    comp1.quickslots,
    comp1.role,
    comp1.mundus,
  ].join('#');
}

/**
 * Parse comp2 string into its component fields.
 * Format: "gearComp#gearCompUnique#outfitComp"
 */
export function decompressComp2(comp2: string | undefined): CSPSComp2 | null {
  if (!comp2 || typeof comp2 !== 'string') return null;

  const segments = comp2.split('#');
  return {
    gearComp: segments[0] ?? '',
    gearCompUnique: segments[1] ?? '',
    outfitComp: segments[2] ?? '',
  };
}

/**
 * Recompress comp2 components back into a #-delimited string.
 */
export function compressComp2(comp2: CSPSComp2): string {
  return [comp2.gearComp, comp2.gearCompUnique, comp2.outfitComp].join('#');
}

/**
 * Parse the gearComp segment of comp2 into individual gear entries.
 *
 * Slots are semicolon-separated in CSPS_GEAR_SLOT_ORDER.
 * Each entry: "setId:type:trait:quality:enchant" (5 colon-separated ints)
 * Special cases: "0" = empty, poison slots use "firstId:secondId",
 *   Ring of Mara uses "mara:44904".
 *
 * Returns a map of ESO equip slot index → CSPSGearEntry.
 */
export function parseGearComp(
  gearCompStr: string,
): Record<number, CSPSGearEntry> {
  const result: Record<number, CSPSGearEntry> = {};
  if (!gearCompStr) return result;

  const entries = gearCompStr.split(';');

  for (let i = 0; i < entries.length && i < CSPS_GEAR_SLOT_ORDER.length + 2; i++) {
    const raw = entries[i]?.trim();
    if (!raw || raw === '0' || raw === '-') continue;

    // Skip poison slots (indices 14, 15 in the CSPS array)
    if (i >= 14) continue;

    const esoSlot = CSPS_GEAR_SLOT_ORDER[i];
    if (esoSlot === undefined) continue;

    // Skip Ring of Mara entries ("mara:...")
    if (raw.startsWith('mara:')) continue;

    const parts = raw.split(':');
    if (parts.length < 5) continue;

    const setId = parseInt(parts[0], 10);
    const type = parseInt(parts[1], 10);
    const trait = parseInt(parts[2], 10);
    const quality = parseInt(parts[3], 10);
    const enchant = parseInt(parts[4], 10);

    if (isNaN(setId)) continue;

    result[esoSlot] = {
      setId,
      type: isNaN(type) ? 0 : type,
      trait: isNaN(trait) ? 0 : trait,
      quality: isNaN(quality) ? 0 : quality,
      enchant: isNaN(enchant) ? 0 : enchant,
    };
  }

  return result;
}

/**
 * Serialize gear entries back to CSPS gearComp format.
 * Produces semicolon-separated entries in CSPS_GEAR_SLOT_ORDER + two poison slots.
 */
export function serializeGearComp(
  gear: Record<number, CSPSGearEntry>,
): string {
  const parts: string[] = [];

  for (const esoSlot of CSPS_GEAR_SLOT_ORDER) {
    const entry = gear[esoSlot];
    if (!entry || entry.setId === 0) {
      parts.push('0');
    } else {
      parts.push(
        `${entry.setId}:${entry.type}:${entry.trait}:${entry.quality}:${entry.enchant}`,
      );
    }
  }

  // Append two empty poison slots
  parts.push('0', '0');

  return parts.join(';');
}

/**
 * Parse hotbar string into front and back bar ability arrays.
 * Format: "a1,a2,a3,a4,a5,ult;a1,a2,a3,a4,a5,ult"
 *
 * Scribed/crafted abilities are prefixed with "c" (e.g. "c12345").
 * These are tracked in the scribedIds set so they can be re-exported correctly.
 */
export function parseHotbar(hotbarStr: string): CSPSHotbar {
  const bars = hotbarStr.split(';');
  const scribedIds = new Set<number>();

  const parseSingleBar = (barStr: string | undefined): number[] => {
    if (!barStr) return [0, 0, 0, 0, 0, 0];
    const ids = barStr.split(',').map((s) => {
      const trimmed = s.trim();
      if (!trimmed || trimmed === '-') return 0;

      // Handle scribed/crafted ability prefix "c"
      const isScribed = trimmed.startsWith('c');
      const numStr = isScribed ? trimmed.slice(1) : trimmed;
      const n = parseInt(numStr, 10);
      if (isNaN(n) || n <= 0) return 0;

      if (isScribed) scribedIds.add(n);
      return n;
    });
    // Pad to 6 slots if needed
    while (ids.length < 6) ids.push(0);
    return ids.slice(0, 6);
  };

  return {
    frontBar: parseSingleBar(bars[0]),
    backBar: parseSingleBar(bars[1]),
    scribedIds: scribedIds.size > 0 ? scribedIds : undefined,
  };
}

/**
 * Serialize hotbar back to CSPS format.
 * Scribed abilities are re-prefixed with "c".
 */
export function serializeHotbar(hotbar: CSPSHotbar): string {
  const scribed = hotbar.scribedIds;
  const serializeSlot = (id: number): string => {
    if (id <= 0) return '0';
    return scribed?.has(id) ? `c${id}` : String(id);
  };
  const serializeBar = (bar: number[]): string => bar.map(serializeSlot).join(',');
  return `${serializeBar(hotbar.frontBar)};${serializeBar(hotbar.backBar)}`;
}

/**
 * Parse attributes string.
 * Format: "health;magicka;stamina"
 */
export function parseAttributes(attrStr: string): CSPSAttributes {
  const parts = attrStr.split(';');
  return {
    health: parseInt(parts[0], 10) || 0,
    magicka: parseInt(parts[1], 10) || 0,
    stamina: parseInt(parts[2], 10) || 0,
  };
}

/**
 * Serialize attributes back to CSPS format.
 */
export function serializeAttributes(attrs: CSPSAttributes): string {
  return `${attrs.health};${attrs.magicka};${attrs.stamina}`;
}

/**
 * Parse champion point string.
 * Format: "skillId-value;skillId-value;..."
 */
export function parseChampionPoints(cpStr: string): CSPSChampionPoint[] {
  if (!cpStr) return [];
  return cpStr
    .split(';')
    .filter((s) => s.includes('-'))
    .map((pair) => {
      const [skillIdStr, valueStr] = pair.split('-');
      return {
        skillId: parseInt(skillIdStr, 10),
        value: parseInt(valueStr, 10),
      };
    })
    .filter((cp) => !isNaN(cp.skillId) && !isNaN(cp.value));
}

/**
 * Serialize champion points back to CSPS format.
 */
export function serializeChampionPoints(cps: CSPSChampionPoint[]): string {
  return cps.map((cp) => `${cp.skillId}-${cp.value}`).join(';');
}

// ── Extraction ───────────────────────────────────────────────────────

/**
 * Extract all character data from CSPS saved variables.
 * Returns a map of characterId → { characterData, characterName }.
 *
 * CSPS uses account-wide storage with charData containing all characters:
 *   Default["@Account"]["$AccountWide"].charData[characterId] = { ... }
 */
export function extractCSPSCharacters(
  data: CSPSSavedVariables,
): Record<string, { data: CSPSCharacterData; name: string; accountName: string }> {
  const characters: Record<string, { data: CSPSCharacterData; name: string; accountName: string }> =
    {};

  const defaultData = data.Default;
  if (!defaultData) {
    logger.warn('No "Default" key found in CSPS data');
    return characters;
  }

  for (const [accountKey, accountData] of Object.entries(defaultData)) {
    if (!accountData || typeof accountData !== 'object') continue;

    logger.debug('Processing CSPS account', { accountKey });

    // CSPS stores data under $AccountWide (or potentially server-keyed entries)
    for (const [serverOrScope, scopeData] of Object.entries(accountData)) {
      if (!scopeData || typeof scopeData !== 'object') continue;

      const typedScope = scopeData as CSPSAccountData;
      const charData = typedScope.charData;
      if (!charData || typeof charData !== 'object') continue;

      for (const [charId, charEntry] of Object.entries(charData)) {
        if (!charEntry || typeof charEntry !== 'object') continue;

        // Use $lastCharacterName if available, otherwise use the character ID
        const charName =
          (charEntry as CSPSCharacterData).$lastCharacterName || `Character ${charId}`;

        const compositeKey = `${accountKey}/${serverOrScope}/${charId}`;
        characters[compositeKey] = {
          data: charEntry as CSPSCharacterData,
          name: charName,
          accountName: accountKey,
        };

        logger.debug('Found CSPS character', {
          accountKey,
          serverOrScope,
          charId,
          charName,
          hasWerte: !!(charEntry as CSPSCharacterData).werte,
          hasComp1: !!(charEntry as CSPSCharacterData).comp1,
        });
      }
    }
  }

  return characters;
}

// ── Conversion to LoadoutState ───────────────────────────────────────

/**
 * Convert CSPS hotbar data to our internal SkillsConfig format.
 *
 * CSPS hotbar: 6 slots per bar (5 abilities + 1 ultimate)
 * Our format: slots 3-7 for abilities, slot 8 for ultimate
 */
function convertHotbarToSkills(hotbar: CSPSHotbar): SkillsConfig {
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
    0: convertBar(hotbar.frontBar),
    1: convertBar(hotbar.backBar),
  };
}

/**
 * Convert our internal SkillsConfig back to CSPS hotbar format.
 */
export function convertSkillsToHotbar(skills: SkillsConfig): CSPSHotbar {
  const convertBar = (bar: SkillBar): number[] => {
    const result = [0, 0, 0, 0, 0, 0];
    // Our slots 3-7 → CSPS slots 0-4
    for (let i = 3; i <= 7; i++) {
      if (bar[i] && bar[i] > 0) {
        result[i - 3] = bar[i];
      }
    }
    // Our slot 8 → CSPS slot 5
    if (bar[8] && bar[8] > 0) {
      result[5] = bar[8];
    }
    return result;
  };

  return {
    frontBar: convertBar(skills[0] ?? {}),
    backBar: convertBar(skills[1] ?? {}),
  };
}

/**
 * Convert CSPS champion points to our ChampionPointsConfig.
 * Maps CSPS "skillId-value" pairs to slot indices.
 */
function convertCPToConfig(cpPoints: CSPSChampionPoint[]): ChampionPointsConfig {
  const config: ChampionPointsConfig = {};
  cpPoints.forEach((cp, index) => {
    if (cp.skillId > 0) {
      config[index + 1] = cp.skillId;
    }
  });
  return config;
}

/**
 * Convert a single CSPS character's data to setup pages.
 * Creates a main page from the base build and additional pages for profiles.
 */
function convertCharacterToPages(
  characterData: CSPSCharacterData,
  characterName: string,
): SetupPage[] {
  const pages: SetupPage[] = [];

  // ── 1. Main build ──────────────────────────────────────────────────
  const mainSetup = convertCharacterDataToSetup(characterData, characterName);
  if (mainSetup) {
    pages.push({
      name: 'Active Build',
      setups: [mainSetup],
    });
  }

  // ── 2. Profiles ────────────────────────────────────────────────────
  if (characterData.profiles) {
    const profileEntries = Object.entries(characterData.profiles)
      .filter(([, profile]) => profile && typeof profile === 'object')
      .sort(([a], [b]) => {
        const numA = Number(a);
        const numB = Number(b);
        if (!isNaN(numA) && !isNaN(numB)) return numA - numB;
        return a.localeCompare(b);
      });

    for (const [profileKey, profile] of profileEntries) {
      if (!profile) continue;

      const profileName = profile.name || `Profile ${profileKey}`;
      const profileSetup = convertCharacterDataToSetup(profile as CSPSCharacterData, profileName);

      if (profileSetup) {
        pages.push({
          name: profileName,
          setups: [profileSetup],
        });
      }
    }
  }

  return pages;
}

/**
 * Convert character data (or profile data) with comp1/werte into a LoadoutSetup.
 * Extracts hotbar skills and champion points.
 */
function convertCharacterDataToSetup(
  data: CSPSCharacterData | CSPSProfile,
  name: string,
): LoadoutSetup | null {
  const comp1 = decompressComp1(data.comp1);
  if (!comp1) {
    // No comp1 means no hotbar/attribute data — check if werte has anything
    if (!data.werte?.prog && !data.werte?.pass) {
      return null;
    }
    // Has skill data but no comp1 — create minimal setup
    return {
      name,
      disabled: false,
      condition: {},
      skills: { 0: {}, 1: {} },
      cp: {},
      food: {},
      gear: {},
    };
  }

  // Parse hotbar for skill bar configuration
  const hotbar = parseHotbar(comp1.hotbar);
  const skills = convertHotbarToSkills(hotbar);

  // Check if there are any skills at all
  const hasSkills =
    Object.values(skills[0]).some((v) => v > 0) || Object.values(skills[1]).some((v) => v > 0);

  if (!hasSkills && !data.werte?.prog) {
    return null;
  }

  // Parse champion points
  const cpPoints = parseChampionPoints(comp1.cpPoints);
  const cp = convertCPToConfig(cpPoints);

  return {
    name,
    disabled: false,
    condition: {},
    skills,
    cp,
    food: {},
    gear: {},
  };
}

/**
 * Convert all CSPS character data into our internal LoadoutState format.
 *
 * Each character becomes a character entry with their builds placed under
 * the "GEN" (General) trial category (since CSPS doesn't have trial associations).
 */
export function convertCSPSToLoadoutState(
  characterMap: Record<string, { data: CSPSCharacterData; name: string; accountName: string }>,
): LoadoutState {
  const pages: LoadoutState['pages'] = {};
  const characters: LoadoutState['characters'] = [];
  let firstCharacterId: string | null = null;

  for (const [compositeKey, { data: characterData, name: characterName }] of Object.entries(
    characterMap,
  )) {
    const characterId = compositeKey.toLowerCase().replace(/[^a-z0-9]+/g, '-');

    if (!firstCharacterId) {
      firstCharacterId = characterId;
    }

    characters.push({
      id: characterId,
      name: characterName,
      role: 'DPS', // Default; CSPS doesn't store role information
    });

    const characterPages = convertCharacterToPages(characterData, characterName);

    if (characterPages.length > 0) {
      pages[characterId] = {
        GEN: characterPages,
      };
    }
  }

  return {
    currentCharacter: firstCharacterId,
    characters,
    currentTrial: 'GEN',
    currentPage: 0,
    mode: 'basic',
    pages,
  };
}

// ── Reverse conversion: LoadoutState → CSPS ──────────────────────────

/**
 * Merge changes from a LoadoutState back into the original CSPS data.
 *
 * This is the "round-trip preservation" approach: we take the user's original
 * CSPS data and only update the fields we model (hotbar skills, CP), leaving
 * all other fields (passives, quickslots, mundus, gear, etc.) untouched.
 *
 * @param originalData The original parsed CSPS saved variables
 * @param state The modified LoadoutState from the roster builder
 * @returns Updated CSPS saved variables ready for Lua serialization
 */
export function mergeLoadoutStateIntoCSPS(
  originalData: CSPSSavedVariables,
  state: LoadoutState,
): CSPSSavedVariables {
  // Deep clone the original to avoid mutation
  const result = JSON.parse(JSON.stringify(originalData)) as CSPSSavedVariables;

  const defaultData = result.Default;
  if (!defaultData) return result;

  // Build a lookup of character IDs from the state
  for (const character of state.characters) {
    const charPages = state.pages[character.id];
    if (!charPages?.GEN?.[0]?.setups?.[0]) continue;

    const mainSetup = charPages.GEN[0].setups[0];

    // Find the matching character in the CSPS data by name
    for (const accountData of Object.values(defaultData)) {
      for (const scopeData of Object.values(accountData)) {
        const typedScope = scopeData as CSPSAccountData;
        if (!typedScope.charData) continue;

        for (const [charId, charEntry] of Object.entries(typedScope.charData)) {
          const typedChar = charEntry as CSPSCharacterData;
          if (typedChar.$lastCharacterName !== character.name) continue;

          // Match found — update hotbar and CP in comp1
          const comp1 = decompressComp1(typedChar.comp1);
          if (!comp1) continue;

          // Update hotbar
          const hotbar = convertSkillsToHotbar(mainSetup.skills);
          comp1.hotbar = serializeHotbar(hotbar);

          // Update CP if we have any
          if (mainSetup.cp && Object.keys(mainSetup.cp).length > 0) {
            const cpPoints: CSPSChampionPoint[] = Object.entries(mainSetup.cp)
              .map(([, skillId]) => ({
                skillId: skillId as number,
                value: 1,
              }))
              .filter((cp) => cp.skillId > 0);
            comp1.cpPoints = serializeChampionPoints(cpPoints);
          }

          // Write back the updated comp1
          (typedScope.charData[charId] as CSPSCharacterData).comp1 = compressComp1(comp1);

          // Update profiles if we have additional pages
          if (charPages.GEN && charPages.GEN.length > 1 && typedChar.profiles) {
            const profileKeys = Object.keys(typedChar.profiles)
              .filter((k) => !isNaN(Number(k)))
              .sort((a, b) => Number(a) - Number(b));

            for (
              let pageIdx = 1;
              pageIdx < charPages.GEN.length && pageIdx - 1 < profileKeys.length;
              pageIdx++
            ) {
              const page = charPages.GEN[pageIdx];
              if (!page.setups[0]) continue;

              const profileKey = profileKeys[pageIdx - 1];
              const profile = typedChar.profiles[profileKey] as CSPSProfile;
              if (!profile) continue;

              const profileComp1 = decompressComp1(profile.comp1);
              if (!profileComp1) continue;

              const profileHotbar = convertSkillsToHotbar(page.setups[0].skills);
              profileComp1.hotbar = serializeHotbar(profileHotbar);
              (typedChar.profiles[profileKey] as CSPSProfile).comp1 = compressComp1(profileComp1);
            }
          }

          logger.debug('Updated CSPS character data', { charId, characterName: character.name });
        }
      }
    }
  }

  return result;
}

/**
 * Serialize CSPS saved variables to Lua source code string.
 *
 * Produces output compatible with ESO's saved variables format:
 *   CSPSSavedVariables = { ... }
 *
 * @param data The CSPS saved variables object
 * @param tableName Top-level Lua table name (defaults to "CSPSSavedVariables")
 */
export function serializeCSPSToLua(
  data: CSPSSavedVariables,
  tableName: string = 'CSPSSavedVariables',
): string {
  const indent = '    ';
  const newline = '\n';
  const body = serializeCSPSValue(data as CSPSLuaValue, 0, indent, newline);
  return `${tableName} =${newline}${body}${newline}`;
}

// ── Internal Lua value serializer (CSPS dialect) ─────────────────────

type CSPSLuaPrimitive = string | number | boolean | null;
type CSPSLuaValue = CSPSLuaPrimitive | CSPSLuaValue[] | { [key: string]: CSPSLuaValue };

function serializeCSPSValue(
  value: CSPSLuaValue,
  depth: number,
  indent: string,
  newline: string,
): string {
  if (value === null || value === undefined) {
    return 'nil';
  }
  if (Array.isArray(value)) {
    return serializeCSPSArray(value, depth, indent, newline);
  }
  switch (typeof value) {
    case 'string':
      return `"${escapeCSPSString(value)}"`;
    case 'number':
      return Number.isFinite(value) ? String(value) : 'nil';
    case 'boolean':
      return value ? 'true' : 'false';
    case 'object':
      return serializeCSPSObject(value as Record<string, CSPSLuaValue>, depth, indent, newline);
    default:
      return 'nil';
  }
}

function serializeCSPSArray(
  value: CSPSLuaValue[],
  depth: number,
  indent: string,
  newline: string,
): string {
  if (value.length === 0) return '{}';
  const next = depth + 1;
  const pre = indent.repeat(next);
  const lines = value.map(
    (entry, i) => `${pre}[${i + 1}] = ${serializeCSPSValue(entry, next, indent, newline)},`,
  );
  return `{${newline}${lines.join(newline)}${newline}${indent.repeat(depth)}}`;
}

function serializeCSPSObject(
  value: Record<string, CSPSLuaValue>,
  depth: number,
  indent: string,
  newline: string,
): string {
  const entries = Object.entries(value);
  if (entries.length === 0) return '{}';

  const next = depth + 1;
  const pre = indent.repeat(next);
  const lines = entries.map(([key, entry]) => {
    const luaKey = serializeCSPSKey(key);
    const serialized = serializeCSPSValue(entry, next, indent, newline);
    return `${pre}${luaKey} = ${serialized},`;
  });
  return `{${newline}${lines.join(newline)}${newline}${indent.repeat(depth)}}`;
}

function serializeCSPSKey(key: string): string {
  // Numeric keys → [N]
  if (key.trim() !== '' && Number.isInteger(Number(key)) && String(Number(key)) === key) {
    return `[${key}]`;
  }
  // All string keys use ["key"] to match ESO SavedVariables format
  return `["${escapeCSPSString(key)}"]`;
}

function escapeCSPSString(value: string): string {
  return value
    .replace(/\\/g, '\\\\')
    .replace(/\n/g, '\\n')
    .replace(/\r/g, '\\r')
    .replace(/\t/g, '\\t')
    .replace(/"/g, '\\"');
}
