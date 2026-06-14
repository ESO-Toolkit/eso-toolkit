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
import { ARMOR_WEIGHT_TO_ESO_TYPE, resolveApparelWeight } from '../data/setArmorWeights';
import type {
  Build,
  BuildChampionPoints,
  BuildSetup,
  CombatRole,
  QuickslotEntry,
} from '../types/build.types';

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

    result[slot] = {
      setId,
      type,
      trait: piece.trait ? parseInt(piece.trait, 10) || 0 : 0,
      quality: 0,
      enchant: piece.enchant ? parseInt(piece.enchant, 10) || 0 : 0,
    };
  }

  return result;
}

/**
 * Build werte object from passives + skilled abilities.
 * Combines werte.pass (passive skills) and werte.prog (active skills with morphs).
 */
function buildWerte(
  passives: number[],
  skilledAbilities?: BuildSetup['skilledAbilities'],
): CSPSSkillData | undefined {
  const werte: CSPSSkillData = {};
  let hasData = false;

  // Passives → werte.pass
  const passEntries: CSPSSkillEntry[] = passives
    .filter((id) => id > 0)
    .map((abilityId) => ({ abilityId, value: 1 }));
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

  // Passives + skilled abilities → werte
  const werte = buildWerte(setup.passives, setup.skilledAbilities);

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
export function convertBuildToCSPS(build: Build): CSPSSavedVariables {
  const characterName = build.name || 'Exported Build';
  const accountName = '@ESOToolkit';
  const characterId = '1';

  // First setup → main character data
  const mainSetup = build.setups[0];
  const charData: CSPSCharacterData = mainSetup
    ? setupToCSPSCharacterData(mainSetup, characterName, build.role)
    : { comp1: '', comp2: '', $lastCharacterName: characterName };

  // Additional setups → profiles
  if (build.setups.length > 1) {
    charData.profiles = {};
    for (let i = 1; i < build.setups.length; i++) {
      const setup = build.setups[i];
      const profileData = setupToCSPSCharacterData(setup, setup.name, build.role);
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
