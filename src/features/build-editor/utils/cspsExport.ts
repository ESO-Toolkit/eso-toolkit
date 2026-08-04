/**
 * Build → CSPS Export
 *
 * Converts a Build Editor build into a CSPS SavedVariables Lua string
 * that can be pasted into the user's CSPS SavedVariables file.
 *
 * The generated output uses a placeholder account/character ID since
 * CSPS identifies characters by in-game IDs we don't have. Users will
 * need to replace the character entry in their existing file or use
 * the addon's in-game import if available.
 */

import { resolveEnchantId, resolveTraitId } from '@/utils/combatLogGearMapping';
import { ENCHANTMENT_NAMES, TRAIT_NAMES } from '@/utils/gearMappings';

import type { GearPiece } from '../../loadout-manager/types/loadout.types';
import {
  compressComp1,
  compressComp2,
  compressSkillEntries,
  convertSkillsToHotbar,
  serializeAttributes,
  serializeCSPSToLua,
  serializeGearComp,
  serializeHotbar,
  type CSPSCharacterData,
  type CSPSComp1,
  type CSPSComp2,
  type CSPSGearEntry,
  type CSPSSkillData,
  type CSPSSkillEntry,
  type CSPSSavedVariables,
} from '../../loadout-manager/utils/cspsConverter';
import { EQUIP_SLOTS } from '../data/esoStaticData';
import { getGearCategory, type GearCategory } from '../data/gear-traits-enchants';
import { ARMOR_WEIGHT_TO_ESO_TYPE, resolveApparelWeight } from '../data/setArmorWeights';
import type {
  Build,
  BuildChampionPoints,
  BuildSetup,
  CombatRole,
  QuickslotEntry,
} from '../types/build.types';

import { isClassMasteryEligible } from './classMasteryEligibility';
import {
  migrateLeakedClassMasteryPicks,
  sanitizeClassMasteryPicks,
  stripClassMasteryIds,
} from './classMasteryTransfer';
import { serializeSubclassLines } from './cspsExportCodeParser';

// ── Reverse mappings (Build Editor → CSPS) ───────────────────────────

/** Build editor mundus string IDs → CSPS mundus ability IDs */
const MUNDUS_TO_CSPS: Record<string, number> = {
  warrior: 13940,
  mage: 13943,
  serpent: 13974,
  thief: 13975,
  lady: 13976,
  steed: 13977,
  lord: 13978,
  apprentice: 13979,
  ritual: 13980,
  lover: 13981,
  atronach: 13982,
  shadow: 13984,
  tower: 13985,
};

/** Build editor CombatRole → CSPS LFG role value */
function combatRoleToCSPS(role: CombatRole): string {
  switch (role) {
    case 'tank':
      return '2';
    case 'healer':
      return '4';
    case 'magicka-dps':
    case 'stamina-dps':
    case 'hybrid-dps':
    default:
      return '1';
  }
}

// ── Setup → CSPS character data ──────────────────────────────────────

/**
 * Serialize BuildChampionPoints slotted perks into CSPS cpHotbar format.
 * Format: "craft1,craft2,craft3,craft4;warfare1,...;fitness1,..."
 */
function serializeCPHotbar(cp: BuildChampionPoints): string {
  const serializeTree = (slots: Array<number | null>): string =>
    slots.map((s) => (s != null && s > 0 ? String(s) : '0')).join(',');

  return [
    serializeTree(cp.craft.slots),
    serializeTree(cp.warfare.slots),
    serializeTree(cp.fitness.slots),
  ].join(';');
}

/**
 * Serialize BuildChampionPoints passive allocations into CSPS cpPoints format.
 * Format: "skillId-value;skillId-value;..."
 */
function serializeCPPassives(cp: BuildChampionPoints): string {
  const entries: string[] = [];

  for (const tree of ['warfare', 'fitness', 'craft'] as const) {
    for (const [idStr, points] of Object.entries(cp[tree].passives)) {
      const id = parseInt(idStr, 10);
      if (!isNaN(id) && id > 0 && points > 0) {
        entries.push(`${id}-${points}`);
      }
    }
  }

  return entries.join(';');
}

// Apparel slot indices (armor pieces carry a light/medium/heavy weight that
// CSPS stores in the gear `type` field). Weapons/jewelry have no armor weight.
const APPAREL_SLOT_SET = new Set<number>(
  EQUIP_SLOTS.filter((s) => s.category === 'apparel').map((s) => s.slot),
);

// Build editor equip slot → gear category (armor / weapon / jewelry), used to
// scope the trait/enchant code lookups (the same code can mean different
// things per category, so the reverse maps are category-keyed).
const SLOT_GEAR_CATEGORY = new Map<number, GearCategory>(
  EQUIP_SLOTS.map((s) => [s.slot, getGearCategory(s.category)]),
);

// ── Build editor kebab id → numeric ESO code ─────────────────────────────────
// Gear pieces edited natively in the Build Editor (and pieces from Extract
// Build) carry kebab trait/enchant string ids (`'sharpened'`, `'infused'`).
// CSPS stores the numeric ESO codes, so the export must translate them — the
// INVERSE of the code→kebab decode `combatLogGearMapping` performs via
// TRAIT_NAMES / ENCHANTMENT_NAMES. We derive the reverse maps by running the
// same importer over every known code (ascending, so the lowest/canonical code
// wins per kebab), keeping export and import in lockstep. CSPS-imported pieces
// instead hold the raw numeric code as a string and are parsed directly.

const GEAR_CATEGORIES: GearCategory[] = ['armor', 'weapon', 'jewelry'];

/**
 * Code bands per gear category, as the decode tables in `@/utils/gearMappings`
 * are themselves laid out ("// Armor Traits", "// Jewelry Enchantments", …).
 *
 * The bands matter because the same DISPLAY NAME appears once per category —
 * Infused is trait 26 (weapon), 38 (armor) and 49 (jewelry) — while
 * resolveTraitId/resolveEnchantId only gate on whether the decoded NAME exists
 * in the requested category, not on whether the CODE belongs to it. A plain
 * ascending scan therefore resolved jewelry `infused` from weapon code 4, and
 * the exported profile restored the wrong trait. Preferring an in-band code
 * keeps export and import on the same entry.
 */
const TRAIT_CODE_BANDS: Record<GearCategory, [number, number]> = {
  weapon: [1, 32],
  armor: [33, 44],
  jewelry: [45, 56],
};

const ENCHANT_CODE_BANDS: Record<GearCategory, [number, number]> = {
  weapon: [1, 28],
  armor: [29, 40],
  jewelry: [41, 56],
};

function buildReverseCodeMap(
  codeNames: Record<number, string>,
  resolve: (code: number, category: GearCategory) => string | undefined,
  bands: Record<GearCategory, [number, number]>,
): Record<GearCategory, Map<string, number>> {
  const maps: Record<GearCategory, Map<string, number>> = {
    armor: new Map(),
    weapon: new Map(),
    jewelry: new Map(),
  };
  for (const category of GEAR_CATEGORIES) {
    const [low, high] = bands[category];
    const codes = Object.keys(codeNames).map(Number);
    // Two passes: an in-band code always wins. The out-of-band pass is a
    // fallback for names the band does not carry (legacy/duplicate low codes),
    // so nothing that used to export a code now exports 0.
    const inBand = codes.filter((code) => code >= low && code <= high);
    const outOfBand = codes.filter((code) => code < low || code > high);
    for (const code of [...inBand, ...outOfBand]) {
      const kebab = resolve(code, category);
      if (kebab && !maps[category].has(kebab)) maps[category].set(kebab, code);
    }
  }
  return maps;
}

const TRAIT_CODE_BY_CATEGORY = buildReverseCodeMap(TRAIT_NAMES, resolveTraitId, TRAIT_CODE_BANDS);
const ENCHANT_CODE_BY_CATEGORY = buildReverseCodeMap(
  ENCHANTMENT_NAMES,
  resolveEnchantId,
  ENCHANT_CODE_BANDS,
);

/**
 * Resolve a gear trait/enchant value to the numeric ESO code CSPS stores.
 * Kebab ids map back through the inverse decode table; an already-numeric
 * string is parsed as-is; anything unknown → 0 (no trait/enchant).
 */
function resolveGearCode(value: string | undefined, reverse: Map<string, number>): number {
  if (!value) return 0;
  if (/^\d+$/.test(value)) {
    const code = parseInt(value, 10);
    return code > 0 ? code : 0;
  }
  return reverse.get(value) ?? 0;
}

/**
 * Convert build editor gear config to CSPS gear entries.
 */
function convertGearConfigToCSPS(gear: Record<number, GearPiece>): Record<number, CSPSGearEntry> {
  const result: Record<number, CSPSGearEntry> = {};

  for (const [slotStr, piece] of Object.entries(gear)) {
    const slot = Number(slotStr);
    const setId = typeof piece.id === 'string' ? parseInt(piece.id, 10) : (piece.id ?? 0);
    if (!setId || setId <= 0) continue;

    // Serialize the resolved armor weight into CSPS `type` so the export isn't
    // lossy now that weight is authoritative (locked weight wins over stored).
    // Non-apparel slots have no armor weight → keep 0.
    const type = APPAREL_SLOT_SET.has(slot)
      ? ARMOR_WEIGHT_TO_ESO_TYPE[resolveApparelWeight(piece.id, piece.weight)]
      : 0;

    const category = SLOT_GEAR_CATEGORY.get(slot) ?? 'armor';

    result[slot] = {
      setId,
      type,
      trait: resolveGearCode(piece.trait, TRAIT_CODE_BY_CATEGORY[category]),
      quality: 0,
      enchant: resolveGearCode(piece.enchant, ENCHANT_CODE_BY_CATEGORY[category]),
    };
  }

  return result;
}

/**
 * Build werte object from passives + skilled abilities.
 * Combines werte.pass (passive skills) and werte.prog (active skills with morphs).
 *
 * Class Mastery picks (build-level) are merged into werte.pass as plain
 * `abilityId:1` pairs, matching how the real CSPS addon stores them — there is
 * no dedicated Class Mastery field, so the addon re-applies them via the Class
 * Mastery Points pool on restore. Deduped against the regular passives.
 */
function buildWerte(
  passives: number[],
  skilledAbilities?: BuildSetup['skilledAbilities'],
  classMasteryPassives: number[] = [],
  scribeStyleSubclass = '',
): CSPSSkillData | undefined {
  const werte: CSPSSkillData = {};
  let hasData = false;

  // Passives (+ Class Mastery picks) → werte.pass. Strip any Class Mastery ids
  // that leaked into setup.passives (legacy/corrupt builds) so the ONLY CM ids
  // written are the sanitized, eligibility-gated `classMasteryPassives` — never
  // a stale id that would exceed the 2-pick cap or win on round-trip import.
  const passIds = [
    ...new Set([...stripClassMasteryIds(passives.filter((id) => id > 0)), ...classMasteryPassives]),
  ];
  const passEntries: CSPSSkillEntry[] = passIds.map((abilityId) => ({ abilityId, value: 1 }));
  if (passEntries.length > 0) {
    werte.pass = compressSkillEntries(passEntries);
    hasData = true;
  }

  // Skilled abilities → werte.prog
  if (skilledAbilities?.length) {
    const progEntries: CSPSSkillEntry[] = skilledAbilities
      .filter((s) => s.abilityId > 0)
      .map((s) => ({ abilityId: s.abilityId, value: s.morph }));
    if (progEntries.length > 0) {
      werte.prog = compressSkillEntries(progEntries);
      hasData = true;
    }
  }

  // Subclass lines → werte.scribeStyleSubclass (crafted*styles*subclasses) so a
  // subclassed build round-trips its lines and Class Mastery stays gated.
  if (scribeStyleSubclass) {
    werte.scribeStyleSubclass = scribeStyleSubclass;
    hasData = true;
  }

  return hasData ? werte : undefined;
}

/**
 * Serialize quickslot entries back to CSPS format.
 * Uses the simpler old-style format: comma-separated "type:id" entries.
 */
function serializeQuickslots(quickslots?: QuickslotEntry[]): string {
  if (!quickslots?.length) return '';
  return quickslots.map((qs) => `${qs.type}:${qs.id}`).join(',');
}

/**
 * Convert a single BuildSetup into CSPS character-level data.
 */
function setupToCSPSCharacterData(
  setup: BuildSetup,
  name: string,
  role: CombatRole,
  classMasteryPassives: number[] = [],
  scribeStyleSubclass = '',
): CSPSCharacterData {
  // Skills → hotbar (with scribed ability tracking)
  const hotbar = convertSkillsToHotbar(setup.skills);
  if (setup.scribedAbilityIds?.length) {
    hotbar.scribedIds = new Set(setup.scribedAbilityIds);
  }
  const hotbarStr = serializeHotbar(hotbar);

  // Attributes
  const attrStr = serializeAttributes({
    health: setup.attributes.health,
    magicka: setup.attributes.magicka,
    stamina: setup.attributes.stamina,
  });

  // Champion Points
  const cpPointsStr = serializeCPPassives(setup.cp);
  const cpHotbarStr = serializeCPHotbar(setup.cp);

  // Mundus
  const mundusStr = setup.mundusStone ? String(MUNDUS_TO_CSPS[setup.mundusStone] ?? '') : '';

  // Quickslots
  const quickslotsStr = serializeQuickslots(setup.quickslots);

  // Build comp1
  const comp1: CSPSComp1 = {
    attributes: attrStr,
    hotbar: hotbarStr,
    cpPoints: cpPointsStr,
    cpHotbar: cpHotbarStr,
    quickslots: quickslotsStr,
    role: combatRoleToCSPS(role),
    mundus: mundusStr,
  };

  // Gear → comp2
  const gearEntries = convertGearConfigToCSPS(setup.gear);
  const gearCompStr = serializeGearComp(gearEntries);
  const comp2: CSPSComp2 = {
    gearComp: gearCompStr,
    gearCompUnique: '',
    outfitComp: '',
  };

  // Passives + skilled abilities + Class Mastery picks + subclass lines → werte
  const werte = buildWerte(
    setup.passives,
    setup.skilledAbilities,
    classMasteryPassives,
    scribeStyleSubclass,
  );

  const charData: CSPSCharacterData = {
    comp1: compressComp1(comp1),
    comp2: compressComp2(comp2),
    $lastCharacterName: name,
  };

  if (werte) {
    charData.werte = werte;
  }

  return charData;
}

// ── Build → CSPS SavedVariables ──────────────────────────────────────

/**
 * Convert a Build into a full CSPS SavedVariables structure.
 *
 * The first setup becomes the active character build.
 * Additional setups become CSPS profiles.
 */
export function convertBuildToCSPS(inputBuild: Build): CSPSSavedVariables {
  // Normalize on a local copy so the export is correct for EVERY caller, not
  // only builds that already went through the editor's load-time migration
  // (e.g. BuildViewPage exports a build decoded straight from a URL share). This
  // reclaims leaked Class Mastery ids into the build-level field and strips them
  // from setup.passives using the SAME idempotent helper the editor runs on
  // load, so both surfaces always agree. The caller's object is never mutated.
  const build: Build = {
    ...inputBuild,
    classMasteryPassives: inputBuild.classMasteryPassives
      ? [...inputBuild.classMasteryPassives]
      : [],
    setups: inputBuild.setups.map((setup) => ({ ...setup, passives: [...(setup.passives ?? [])] })),
  };
  migrateLeakedClassMasteryPicks(build);

  const characterName = build.name || 'Exported Build';
  const accountName = '@ESOToolkit';
  const characterId = '1';

  // Class Mastery is a character-wide selection (not per-setup) and is invalid
  // while subclassed, so resolve the eligible picks once and write the same set
  // into every setup/profile's werte.pass.
  const classMasteryPassives = isClassMasteryEligible(build.esoClass, build.classSkillLines)
    ? sanitizeClassMasteryPicks(build.classMasteryPassives, build.esoClass)
    : [];

  // Subclass lines → werte.scribeStyleSubclass for every setup (character-wide).
  const subclassIds = serializeSubclassLines(build.classSkillLines);
  const scribeStyleSubclass = subclassIds ? `-*-*${subclassIds}` : '';

  // First setup → main character data
  const mainSetup = build.setups[0];
  const charData: CSPSCharacterData = mainSetup
    ? setupToCSPSCharacterData(
        mainSetup,
        characterName,
        build.role,
        classMasteryPassives,
        scribeStyleSubclass,
      )
    : { comp1: '', comp2: '', $lastCharacterName: characterName };

  // Additional setups → profiles
  if (build.setups.length > 1) {
    charData.profiles = {};
    for (let i = 1; i < build.setups.length; i++) {
      const setup = build.setups[i];
      const profileData = setupToCSPSCharacterData(
        setup,
        setup.name,
        build.role,
        classMasteryPassives,
        scribeStyleSubclass,
      );
      charData.profiles[i] = {
        ...profileData,
        name: setup.name,
      };
    }
  }

  return {
    Default: {
      [accountName]: {
        $AccountWide: {
          settings: {},
          charData: {
            [characterId]: charData,
          },
        },
      },
    },
  };
}

/**
 * Export a Build as a CSPS SavedVariables Lua string.
 */
export function exportBuildToCSPSLua(build: Build): string {
  const cspsData = convertBuildToCSPS(build);
  return serializeCSPSToLua(cspsData);
}
