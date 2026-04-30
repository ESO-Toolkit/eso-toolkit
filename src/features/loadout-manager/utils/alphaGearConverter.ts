/**
 * AlphaGear 2 (AGX2) SavedVariables Converter
 *
 * Converts the in-game AlphaGear 2 addon data into our internal LoadoutState format.
 *
 * AlphaGear SavedVariables structure:
 * - AGX2_Account: Account-wide settings (options, UI positions, integrations)
 * - AGX2_Character: Per-character gear/skill sets and profiles
 *
 * Character data layout:
 *   AGX2_Character.Default["@Account"]["CharacterName"] = {
 *     setamount: number,                // Total number of set slots
 *     [1..N]: {                          // Numbered set entries (top-level quick sets)
 *       Skill: { [1-6]: abilityId },    // 1-5 = abilities, 6 = ultimate
 *       Gear: { [slotIndex]: { link, id } },
 *       Set: { text, icon, lock, gear, skill, outfit }
 *     },
 *     profiles: {                        // Named profiles (each contains nested builds)
 *       [1..N]: {
 *         name: string,
 *         currentBuild: number,
 *         setdata?: {
 *           lastset: number|false,
 *           [1..N]: { Skill, Gear, Set } // Same format as top-level sets
 *         }
 *       }
 *     }
 *   }
 *
 * AlphaGear gear slot indices (SLOTS array) map to ESO EQUIP_SLOT constants:
 *   1=MainHand, 2=OffHand, 3=BackupMain, 4=BackupOff, 5=Head, 6=Chest,
 *   7=Legs, 8=Shoulders, 9=Feet, 10=Waist, 11=Hands, 12=Neck,
 *   13=Ring1, 14=Ring2, 15=Poison, 16=BackupPoison
 */

import { Logger } from '@/utils/logger';

import type {
  GearConfig,
  GearPiece,
  LoadoutSetup,
  LoadoutState,
  SetupPage,
  SkillBar,
  SkillsConfig,
} from '../types/loadout.types';

const logger = new Logger({ contextPrefix: 'AlphaGearConverter' });

// ── Lua parser array normalization ───────────────────────────────────
// The Lua parser converts tables with consecutive integer keys starting
// from 1 (e.g., { [1]=a, [2]=b }) into JavaScript 0-indexed arrays.
// AlphaGear data uses 1-based Lua indices everywhere, so this helper
// transparently handles both representations.

/**
 * Access a value from a Lua 1-indexed table that may have been
 * converted to a JavaScript 0-indexed array by the Lua parser.
 */
function luaGet<T>(
  data: T[] | Record<number | string, T> | undefined | null,
  luaIndex: number,
): T | undefined {
  if (!data) return undefined;
  if (Array.isArray(data)) {
    return data[luaIndex - 1];
  }
  return (data as Record<number, T>)[luaIndex] ?? (data as Record<string, T>)[String(luaIndex)];
}

/**
 * Iterate over a Lua 1-indexed table/array, yielding [luaIndex, value] pairs.
 * Handles both JS arrays (0-indexed from parser) and plain objects.
 */
function* luaEntries<T>(
  data: T[] | Record<number | string, T> | undefined | null,
): Generator<[number, T]> {
  if (!data) return;
  if (Array.isArray(data)) {
    for (let i = 0; i < data.length; i++) {
      if (data[i] !== undefined) {
        yield [i + 1, data[i]]; // Convert 0-based JS index to 1-based Lua index
      }
    }
  } else {
    for (const [key, value] of Object.entries(data)) {
      const n = Number(key);
      if (!isNaN(n) && value !== undefined) {
        yield [n, value];
      }
    }
  }
}

// ── AlphaGear raw types ──────────────────────────────────────────────

export interface AlphaGearSkillData {
  [slotIndex: number]: number; // 1-6: ability IDs (1-5 abilities, 6 ultimate)
}

export interface AlphaGearGearPiece {
  link: string | number; // ESO item link string, or 0 for empty slots
  id: string | number; // Unique item instance ID, or 0 for empty slots
}

export interface AlphaGearGearData {
  [slotIndex: number]: AlphaGearGearPiece;
}

export interface AlphaGearSetMetadata {
  text?: {
    [index: number]: string | number; // [1] = set name, [2],[3] = extra labels (0 = unused)
  };
  icon?: { [index: number]: number };
  lock?: number;
  gear?: number;
  skill?: { [index: number]: number }; // Skill bar references
  outfit?: number;
}

export interface AlphaGearSetEntry {
  Skill?: AlphaGearSkillData;
  Gear?: AlphaGearGearData;
  Set?: AlphaGearSetMetadata;
}

export interface AlphaGearProfileSetData {
  lastset?: number | boolean;
  [buildIndex: number]: AlphaGearSetEntry;
}

export interface AlphaGearProfile {
  name?: string;
  sortKey?: string;
  currentBuild?: number;
  setdata?: AlphaGearProfileSetData;
}

export interface AlphaGearCharacterData {
  setamount?: number;
  version?: number;
  lastset?: number | boolean;
  currentProfileId?: number;
  profiles?: { [profileIndex: number]: AlphaGearProfile };
  [setIndex: number]: AlphaGearSetEntry;
}

export interface AlphaGearSavedVariables {
  Default?: Record<string, Record<string, AlphaGearCharacterData>>;
  [key: string]: unknown;
}

// ── Gear slot mapping ──────────────────────────────────────────────────
// AlphaGear uses its own internal SLOTS array (1-based) which differs from
// the ESO EQUIP_SLOT enum ordering. This mapping was verified against the
// AlphaGear 2 source code (mesota72/AlphaGear2, AlphaGear/AlphaGear.lua).
//
// Source SLOTS array:
//   {EQUIP_SLOT_MAIN_HAND}, {EQUIP_SLOT_OFF_HAND}, {EQUIP_SLOT_BACKUP_MAIN},
//   {EQUIP_SLOT_BACKUP_OFF}, {EQUIP_SLOT_HEAD}, {EQUIP_SLOT_CHEST},
//   {EQUIP_SLOT_LEGS}, {EQUIP_SLOT_SHOULDERS}, {EQUIP_SLOT_FEET},
//   {EQUIP_SLOT_WAIST}, {EQUIP_SLOT_HAND}, {EQUIP_SLOT_NECK},
//   {EQUIP_SLOT_RING1}, {EQUIP_SLOT_RING2}, {EQUIP_SLOT_POISON},
//   {EQUIP_SLOT_BACKUP_POISON}

const ALPHAGEAR_SLOT_MAP: Record<number, number | null> = {
  1: 4, // AG slot 1 (Main Hand)         → internal 4 (Main Hand)
  2: 5, // AG slot 2 (Off Hand)          → internal 5 (Off Hand)
  3: 20, // AG slot 3 (Backup Main Hand)  → internal 20 (Back Bar Main)
  4: 21, // AG slot 4 (Backup Off Hand)   → internal 21 (Back Bar Off)
  5: 0, // AG slot 5 (Head)              → internal 0 (Head)
  6: 2, // AG slot 6 (Chest)             → internal 2 (Chest)
  7: 8, // AG slot 7 (Legs)              → internal 8 (Legs)
  8: 3, // AG slot 8 (Shoulders)         → internal 3 (Shoulders)
  9: 9, // AG slot 9 (Feet)              → internal 9 (Feet)
  10: 6, // AG slot 10 (Waist/Belt)       → internal 6 (Belt)
  11: 16, // AG slot 11 (Hands/Gloves)     → internal 16 (Hands)
  12: 1, // AG slot 12 (Neck)             → internal 1 (Neck)
  13: 11, // AG slot 13 (Ring 1)           → internal 11 (Ring 1)
  14: 12, // AG slot 14 (Ring 2)           → internal 12 (Ring 2)
  15: null, // AG slot 15 (Poison)           → not tracked
  16: null, // AG slot 16 (Backup Poison)   → not tracked
};

// ── Detection ──────────────────────────────────────────────────────────

const ALPHAGEAR_TABLE_NAMES = ['AGX2_Character', 'AlphaGear2_Data', 'AlphaGear_Data'];

/**
 * Check if parsed Lua assignments contain AlphaGear data.
 * Returns the table name and data if found.
 */
export function detectAlphaGearData(
  parsed: Record<string, unknown>,
): { tableName: string; data: AlphaGearSavedVariables } | null {
  for (const tableName of ALPHAGEAR_TABLE_NAMES) {
    if (tableName in parsed) {
      const candidate = parsed[tableName];
      if (candidate && typeof candidate === 'object' && 'Default' in (candidate as object)) {
        logger.info('Detected AlphaGear data', { tableName });
        return { tableName, data: candidate as AlphaGearSavedVariables };
      }
    }
  }
  return null;
}

// ── Skill conversion ────────────────────────────────────────────────────

/**
 * Convert AlphaGear skill data to our SkillsConfig format.
 *
 * AlphaGear stores skills as { [1]: abilityId, ..., [6]: ultimateId } for a single bar.
 * Each top-level set entry contains ONE bar of skills. The Set.skill metadata
 * references which bars map to front/back (e.g., skill: { 1: 1, 2: 2 } means
 * set 1 is front bar, set 2 is back bar).
 *
 * Since a single AlphaGear set entry only has one bar, we place them as front bar
 * and leave back bar empty. When we group into profiles, pairs can be combined.
 */
function convertSkills(agSkills: AlphaGearSkillData | undefined): SkillsConfig {
  if (!agSkills) {
    return { 0: {}, 1: {} };
  }

  const frontBar: SkillBar = {};

  // AlphaGear slots 1-5 = abilities → our slots 3-7
  // AlphaGear slot 6 = ultimate → our slot 8
  // Use luaGet because the parser may convert {[1]=a,...} to a 0-indexed array
  for (let i = 1; i <= 5; i++) {
    const abilityId = luaGet(agSkills as unknown as number[], i);
    if (typeof abilityId === 'number' && abilityId > 0) {
      frontBar[i + 2] = abilityId; // AG slot 1 → internal slot 3, etc.
    }
  }

  // Ultimate in slot 6 → our slot 8
  const ultimate = luaGet(agSkills as unknown as number[], 6);
  if (typeof ultimate === 'number' && ultimate > 0) {
    frontBar[8] = ultimate;
  }

  return { 0: frontBar, 1: {} };
}

/**
 * Merge two single-bar skill configs into a front+back bar config.
 * Used when AlphaGear's Set metadata pairs two entries as front/back.
 */
function mergeSkillBars(
  frontSkills: SkillsConfig | undefined,
  backSkills: SkillsConfig | undefined,
): SkillsConfig {
  return {
    0: frontSkills?.[0] ?? {},
    1: backSkills?.[0] ?? {}, // Back bar's "front" data becomes our back bar
  };
}

// ── Gear conversion ────────────────────────────────────────────────────

/** Parse an ESO item link to extract the item ID */
function parseItemLink(link: string): { link: string; itemId?: number } | null {
  if (!link || typeof link !== 'string' || !link.startsWith('|H')) {
    return null;
  }
  const match = link.match(/\|H[01]:item:(\d+)/);
  return { link, itemId: match ? parseInt(match[1], 10) : undefined };
}

/**
 * Convert AlphaGear gear data to our GearConfig format.
 * Filters out empty slots (link === 0 or id === 0).
 */
function convertGear(agGear: AlphaGearGearData | undefined): GearConfig {
  if (!agGear) {
    return {};
  }

  const gear: GearConfig = {};

  // Use luaEntries to handle both 0-indexed arrays and 1-indexed objects
  for (const [agSlot, piece] of luaEntries(agGear as unknown as AlphaGearGearPiece[])) {
    if (!piece || typeof piece !== 'object') {
      continue;
    }

    // Skip empty slots
    if (piece.link === 0 || piece.id === 0) {
      continue;
    }

    const internalSlot = ALPHAGEAR_SLOT_MAP[agSlot];
    if (internalSlot === null || internalSlot === undefined) {
      continue;
    }

    if (typeof piece.link === 'string' && piece.link.startsWith('|H')) {
      const parsed = parseItemLink(piece.link);
      if (parsed) {
        const gearPiece: GearPiece = {
          link: parsed.link,
          id: piece.id,
        };
        gear[internalSlot] = gearPiece;
      }
    }
  }

  return gear;
}

/**
 * Merge gear from two sets (e.g., front bar weapons + back bar weapons).
 * The second set's back-bar weapon slots (13/14 → 20/21) extend the first set's gear.
 */
function mergeGear(primary: GearConfig, secondary: GearConfig): GearConfig {
  return { ...primary, ...secondary };
}

// ── Set entry conversion ────────────────────────────────────────────────

/**
 * Get the display name for an AlphaGear set entry.
 * Uses Set.text[1] if available and meaningful, otherwise falls back to a default.
 */
function getSetName(setEntry: AlphaGearSetEntry, fallback: string): string {
  const text = setEntry.Set?.text;
  if (text) {
    const name = luaGet(text as unknown as (string | number)[], 1);
    if (typeof name === 'string' && name.trim().length > 0) {
      return name.trim();
    }
  }
  return fallback;
}

/**
 * Convert a single AlphaGear set entry to a LoadoutSetup.
 * Since AlphaGear sets contain only one skill bar, this creates a setup
 * with just the front bar populated.
 */
function convertSetEntry(setEntry: AlphaGearSetEntry, name: string): LoadoutSetup {
  return {
    name,
    disabled: false,
    condition: {},
    skills: convertSkills(setEntry.Skill),
    cp: {},
    food: {},
    gear: convertGear(setEntry.Gear),
    code: '',
  };
}

/**
 * Try to pair front + back bar sets using AlphaGear's Set.skill metadata.
 *
 * AlphaGear allows a "set" to reference two skill bar assignments:
 *   Set.skill = { 1: frontBarSetIndex, 2: backBarSetIndex }
 *
 * When we find such a pairing, we merge the two set entries into a single
 * LoadoutSetup with both bars populated.
 */
function tryPairSets(
  sets: Record<number, AlphaGearSetEntry>,
  setIndex: number,
): { paired: boolean; backBarIndex?: number } {
  const entry = sets[setIndex];
  if (!entry?.Set?.skill) {
    return { paired: false };
  }

  const skillRefs = entry.Set.skill;
  const frontRef = luaGet(skillRefs as unknown as number[], 1);
  const backRef = luaGet(skillRefs as unknown as number[], 2);

  // If the set references itself as both bars, or both refs are the same, no pairing
  if (!frontRef || !backRef || frontRef === backRef) {
    return { paired: false };
  }

  // Check if this set is the "front" set and the back bar references a different set
  if (frontRef === setIndex && backRef !== setIndex && sets[backRef]) {
    return { paired: true, backBarIndex: backRef };
  }

  return { paired: false };
}

// ── Main conversion ──────────────────────────────────────────────────

/**
 * Extract all character data from AlphaGear saved variables.
 * Returns a map of characterName → characterData.
 */
export function extractAlphaGearCharacters(
  data: AlphaGearSavedVariables,
): Record<string, AlphaGearCharacterData> {
  const characters: Record<string, AlphaGearCharacterData> = {};

  const defaultData = data.Default;
  if (!defaultData) {
    logger.warn('No "Default" key found in AlphaGear data');
    return characters;
  }

  for (const [accountKey, accountData] of Object.entries(defaultData)) {
    if (!accountData || typeof accountData !== 'object') continue;

    logger.debug('Processing AlphaGear account', { accountKey });

    for (const [characterName, characterData] of Object.entries(accountData)) {
      if (!characterData || typeof characterData !== 'object' || characterName === '$AccountWide') {
        continue;
      }

      // Validate this looks like character data (has setamount or numbered entries)
      if ('setamount' in characterData || 'profiles' in characterData) {
        characters[characterName] = characterData;
        logger.debug('Found AlphaGear character', {
          characterName,
          setamount: characterData.setamount,
          profileCount: characterData.profiles ? Object.keys(characterData.profiles).length : 0,
        });
      }
    }
  }

  return characters;
}

/**
 * Convert a single AlphaGear character's data to setup pages.
 *
 * Strategy:
 * 1. Convert top-level numbered sets (1..setamount) into a "Gear Sets" page.
 *    - When Set.skill metadata pairs two sets as front+back, merge them.
 *    - Otherwise treat each set as a standalone setup.
 * 2. Convert each named profile's builds into separate pages (one per profile).
 */
function convertCharacterToPages(characterData: AlphaGearCharacterData): SetupPage[] {
  const pages: SetupPage[] = [];

  // ── 1. Top-level sets ──────────────────────────────────────────────
  const setamount = characterData.setamount ?? 16;
  const topLevelSets: Record<number, AlphaGearSetEntry> = {};

  for (let i = 1; i <= setamount; i++) {
    const entry = characterData[i];
    if (entry && typeof entry === 'object' && ('Skill' in entry || 'Gear' in entry)) {
      topLevelSets[i] = entry;
    }
  }

  if (Object.keys(topLevelSets).length > 0) {
    const setups = convertSetCollection(topLevelSets, 'Set');
    if (setups.length > 0) {
      pages.push({
        name: 'Gear Sets',
        setups,
      });
    }
  }

  // ── 2. Profiles ──────────────────────────────────────────────────────
  if (characterData.profiles) {
    const profileEntries = Object.entries(characterData.profiles)
      .filter(([key]) => !isNaN(Number(key)))
      .sort(([a], [b]) => Number(a) - Number(b));

    for (const [, profile] of profileEntries) {
      if (!profile || typeof profile !== 'object') continue;

      const profileName = profile.name || 'Unnamed Profile';
      const setdata = profile.setdata;

      if (!setdata || typeof setdata !== 'object') {
        // Empty profile — skip it
        continue;
      }

      // Collect builds from setdata
      const builds: Record<number, AlphaGearSetEntry> = {};
      for (const [buildKey, buildValue] of Object.entries(setdata)) {
        const buildIdx = Number(buildKey);
        if (
          !isNaN(buildIdx) &&
          buildValue &&
          typeof buildValue === 'object' &&
          ('Skill' in buildValue || 'Gear' in buildValue)
        ) {
          builds[buildIdx] = buildValue as AlphaGearSetEntry;
        }
      }

      if (Object.keys(builds).length === 0) continue;

      const setups = convertSetCollection(builds, 'Build');
      if (setups.length > 0) {
        pages.push({
          name: profileName,
          setups,
        });
      }
    }
  }

  return pages;
}

/**
 * Convert a collection of AlphaGear set entries (either top-level or from a profile)
 * into LoadoutSetup arrays. Handles front/back bar pairing via Set.skill metadata.
 */
function convertSetCollection(
  sets: Record<number, AlphaGearSetEntry>,
  labelPrefix: string,
): LoadoutSetup[] {
  const setups: LoadoutSetup[] = [];
  const consumed = new Set<number>(); // Track sets already merged as back bars

  const sortedIndices = Object.keys(sets)
    .map(Number)
    .filter((n) => !isNaN(n))
    .sort((a, b) => a - b);

  for (const idx of sortedIndices) {
    if (consumed.has(idx)) continue;

    const entry = sets[idx];
    if (!entry) continue;

    const baseName = getSetName(entry, `${labelPrefix} ${idx}`);

    // Check if this set has a front/back bar pairing
    const pairing = tryPairSets(sets, idx);

    if (pairing.paired && pairing.backBarIndex !== undefined) {
      const backEntry = sets[pairing.backBarIndex];
      if (backEntry) {
        consumed.add(pairing.backBarIndex);

        // Merge the two sets into one setup with both bars
        const setup: LoadoutSetup = {
          name: baseName,
          disabled: false,
          condition: {},
          skills: mergeSkillBars(convertSkills(entry.Skill), convertSkills(backEntry.Skill)),
          cp: {},
          food: {},
          gear: mergeGear(convertGear(entry.Gear), convertGear(backEntry.Gear)),
          code: '',
        };
        setups.push(setup);
        continue;
      }
    }

    // No pairing — standalone set
    const setup = convertSetEntry(entry, baseName);

    // Check if all skills are 0 and all gear is empty — skip truly empty sets
    const hasSkills = Object.values(setup.skills[0]).some((v) => v > 0);
    const hasGear = Object.keys(setup.gear).length > 0;
    if (!hasSkills && !hasGear) continue;

    setups.push(setup);
  }

  return setups;
}

/**
 * Convert all AlphaGear character data into our internal LoadoutState format.
 *
 * Each character becomes a character entry. Their top-level gear sets are
 * placed under a "GEN" (General) trial category, and each named profile
 * gets its own page within that trial.
 */
export function convertAlphaGearToLoadoutState(
  characterMap: Record<string, AlphaGearCharacterData>,
): LoadoutState {
  const pages: LoadoutState['pages'] = {};
  const characters: LoadoutState['characters'] = [];
  let firstCharacterId: string | null = null;

  for (const [characterName, characterData] of Object.entries(characterMap)) {
    const characterId = characterName.toLowerCase().replace(/\s+/g, '-');

    if (!firstCharacterId) {
      firstCharacterId = characterId;
    }

    characters.push({
      id: characterId,
      name: characterName,
      role: 'DPS', // Default; AlphaGear doesn't store role information
    });

    const characterPages = convertCharacterToPages(characterData);

    if (characterPages.length > 0) {
      // Place all AlphaGear sets under the "GEN" (General) trial
      // since AlphaGear doesn't have trial/zone associations
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

// ═══════════════════════════════════════════════════════════════════════
// Reverse conversion: LoadoutState → AlphaGear saved variables
// ═══════════════════════════════════════════════════════════════════════

/**
 * Build the inverse of ALPHAGEAR_SLOT_MAP: internal slot → AG slot.
 * Only includes non-null mappings.
 */
const INTERNAL_TO_AG_SLOT_MAP: Record<number, number> = {};
for (const [agStr, internal] of Object.entries(ALPHAGEAR_SLOT_MAP)) {
  if (internal !== null) {
    INTERNAL_TO_AG_SLOT_MAP[internal] = Number(agStr);
  }
}

/**
 * Convert internal SkillBar (slot indices 3-8) back to AlphaGear format (1-6).
 * AG slot 1-5 = abilities (our 3-7), AG slot 6 = ultimate (our 8).
 */
function reverseConvertSkills(bar: SkillBar | undefined): Record<number, number> {
  const agSkills: Record<number, number> = {};
  if (!bar) return agSkills;

  // Internal slots 3-7 → AG slots 1-5
  for (let internal = 3; internal <= 7; internal++) {
    const abilityId = bar[internal];
    agSkills[internal - 2] = typeof abilityId === 'number' && abilityId > 0 ? abilityId : 0;
  }

  // Internal slot 8 (ultimate) → AG slot 6
  const ult = bar[8];
  agSkills[6] = typeof ult === 'number' && ult > 0 ? ult : 0;

  return agSkills;
}

/**
 * Convert internal GearConfig back to AlphaGear gear format for a single bar side.
 * Populates all 16 AG slots: slots with equipment get the item link/id,
 * empty slots get { link: 0, id: 0 }.
 */
function reverseConvertGear(gear: GearConfig | undefined): Record<number, AlphaGearGearPiece> {
  const agGear: Record<number, AlphaGearGearPiece> = {};

  // Initialize all 16 AG slots as empty
  for (let agSlot = 1; agSlot <= 16; agSlot++) {
    agGear[agSlot] = { link: 0, id: 0 };
  }

  if (!gear) return agGear;

  for (const [slotKey, piece] of Object.entries(gear)) {
    const internalSlot = Number(slotKey);
    if (isNaN(internalSlot)) continue;

    const agSlot = INTERNAL_TO_AG_SLOT_MAP[internalSlot];
    if (agSlot === undefined) continue;

    if (piece && typeof piece.link === 'string' && piece.link.startsWith('|H')) {
      agGear[agSlot] = {
        link: piece.link,
        id: piece.id ?? 0,
      };
    }
  }

  return agGear;
}

/**
 * Convert a LoadoutSetup into one or two AlphaGear set entries.
 *
 * If the setup has both front and back bar skills, it produces two entries
 * (to be assigned consecutive set indices) and a Set.skill pairing reference.
 * If it only has a front bar, it produces a single entry.
 */
function reverseConvertSetup(
  setup: LoadoutSetup,
  setIndex: number,
): { entries: AlphaGearSetEntry[]; pairedBackIndex?: number } {
  const frontSkills = reverseConvertSkills(setup.skills?.[0]);
  const backSkills = reverseConvertSkills(setup.skills?.[1]);
  const gear = reverseConvertGear(setup.gear);

  const hasBackBar = Object.values(backSkills).some((v) => v > 0);

  const frontEntry: AlphaGearSetEntry = {
    Skill: frontSkills,
    Gear: gear,
    Set: {
      text: { 1: setup.name || `Set ${setIndex}`, 2: 0, 3: 0 },
      icon: { 1: 0, 2: 0 },
      lock: 0,
      gear: 1,
      skill: hasBackBar ? { 1: setIndex, 2: setIndex + 1 } : { 1: setIndex, 2: 0 },
      outfit: -1,
    },
  };

  if (hasBackBar) {
    const backEntry: AlphaGearSetEntry = {
      Skill: backSkills,
      Gear: { ...gear }, // Same gear snapshot for both bars
      Set: {
        text: { 1: 0, 2: 0, 3: 0 },
        icon: { 1: 0, 2: 0 },
        lock: 0,
        gear: 0,
        skill: { 1: 0, 2: 0 },
        outfit: -1,
      },
    };
    return { entries: [frontEntry, backEntry], pairedBackIndex: setIndex + 1 };
  }

  return { entries: [frontEntry] };
}

/**
 * Convert internal LoadoutState back to AlphaGear saved variables format.
 *
 * Produces an AlphaGearSavedVariables object suitable for Lua serialization.
 * Since we don't track original account names, we use "@ExportedAccount" as the
 * account key. Each character becomes a separate entry under that account.
 *
 * @param state The LoadoutState to convert
 * @param accountName Optional account name (defaults to "@ExportedAccount")
 */
export function convertLoadoutStateToAlphaGear(
  state: LoadoutState,
  accountName: string = '@ExportedAccount',
): AlphaGearSavedVariables {
  const characterEntries: Record<string, AlphaGearCharacterData> = {};

  for (const character of state.characters) {
    const charPages = state.pages[character.id];
    if (!charPages) continue;

    // Collect all pages across all trials
    const allPages: SetupPage[] = [];
    for (const trialPages of Object.values(charPages)) {
      allPages.push(...trialPages);
    }

    if (allPages.length === 0) continue;

    const charData: AlphaGearCharacterData = {
      setamount: 0, // Will be set after counting top-level sets
    };

    // First page → top-level numbered sets (like the "Gear Sets" page)
    let nextSetIndex = 1;
    const firstPage = allPages[0];
    if (firstPage) {
      for (const setup of firstPage.setups) {
        const result = reverseConvertSetup(setup, nextSetIndex);
        for (const entry of result.entries) {
          charData[nextSetIndex] = entry;
          nextSetIndex++;
        }
      }
    }

    charData.setamount = nextSetIndex - 1;

    // Remaining pages → profiles (preserves the name-based separation)
    if (allPages.length > 1) {
      const profiles: { [profileIndex: number]: AlphaGearProfile } = {};
      for (let pageIdx = 1; pageIdx < allPages.length; pageIdx++) {
        const page = allPages[pageIdx];
        const profile: AlphaGearProfile = {
          name: page.name,
          sortKey: '',
          currentBuild: 1,
        };

        if (page.setups.length > 0) {
          const setdata: AlphaGearProfileSetData = {
            lastset: false,
          };
          let buildIndex = 1;
          for (const setup of page.setups) {
            const result = reverseConvertSetup(setup, buildIndex);
            for (const entry of result.entries) {
              setdata[buildIndex] = entry;
              buildIndex++;
            }
          }
          profile.setdata = setdata;
        }

        profiles[pageIdx] = profile;
      }
      charData.profiles = profiles;
    }

    characterEntries[character.name] = charData;
  }

  return {
    Default: {
      [accountName]: characterEntries,
    },
  };
}

/**
 * Serialize AlphaGear saved variables to Lua source code string.
 *
 * Produces output compatible with ESO's saved variables format:
 *   AGX2_Character = { ... }
 *
 * @param data The AlphaGear saved variables object
 * @param tableName Top-level Lua table name (defaults to "AGX2_Character")
 */
export function serializeAlphaGearToLua(
  data: AlphaGearSavedVariables,
  tableName: string = 'AGX2_Character',
): string {
  const indent = '    ';
  const newline = '\n';
  const body = serializeAGValue(data as AGValue, 0, indent, newline);
  return `${tableName} =${newline}${body}${newline}`;
}

// ── Internal Lua value serializer (AlphaGear dialect) ────────────────

type AGPrimitive = string | number | boolean | null;
type AGValue = AGPrimitive | AGValue[] | { [key: string]: AGValue };

function serializeAGValue(value: AGValue, depth: number, indent: string, newline: string): string {
  if (value === null || value === undefined) {
    return 'nil';
  }
  if (Array.isArray(value)) {
    return serializeAGArray(value, depth, indent, newline);
  }
  switch (typeof value) {
    case 'string':
      return `"${escapeAGString(value)}"`;
    case 'number':
      return Number.isFinite(value) ? String(value) : 'nil';
    case 'boolean':
      return value ? 'true' : 'false';
    case 'object':
      return serializeAGObject(value as Record<string, AGValue>, depth, indent, newline);
    default:
      return 'nil';
  }
}

function serializeAGArray(
  value: AGValue[],
  depth: number,
  indent: string,
  newline: string,
): string {
  if (value.length === 0) return '{}';
  const next = depth + 1;
  const pre = indent.repeat(next);
  const lines = value.map(
    (entry, i) => `${pre}[${i + 1}] = ${serializeAGValue(entry, next, indent, newline)},`,
  );
  return `{${newline}${lines.join(newline)}${newline}${indent.repeat(depth)}}`;
}

function serializeAGObject(
  value: Record<string, AGValue>,
  depth: number,
  indent: string,
  newline: string,
): string {
  const entries = Object.entries(value);
  if (entries.length === 0) return '{}';

  const next = depth + 1;
  const pre = indent.repeat(next);
  const lines = entries.map(([key, entry]) => {
    const luaKey = serializeAGKey(key);
    const serialized = serializeAGValue(entry, next, indent, newline);
    return `${pre}${luaKey} = ${serialized},`;
  });
  return `{${newline}${lines.join(newline)}${newline}${indent.repeat(depth)}}`;
}

function serializeAGKey(key: string): string {
  // Numeric keys → [N]
  if (key.trim() !== '' && Number.isInteger(Number(key)) && String(Number(key)) === key) {
    return `[${key}]`;
  }
  // All string keys use ["key"] to match ESO SavedVariables format
  return `["${escapeAGString(key)}"]`;
}

function escapeAGString(value: string): string {
  return value
    .replace(/\\/g, '\\\\')
    .replace(/\n/g, '\\n')
    .replace(/\r/g, '\\r')
    .replace(/\t/g, '\\t')
    .replace(/"/g, '\\"');
}
