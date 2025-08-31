import { PlayerDetailsWithRole } from '../store/player_data/playerDataSlice';
import {
  KnownAbilities,
  KnownSetIDs,
  PenetrationValues,
  PenetrationComputedSourceKey,
} from '../types/abilities';
import { CombatantInfoEvent, CombatantAura } from '../types/combatlogEvents';
import { PlayerGear } from '../types/playerDetails';

import {
  BuffLookupData,
  isBuffActive as isBuffActiveAtTimestamp,
  isBuffActiveOnTarget,
} from './BuffLookupUtils';
import {
  getSetCount,
  countOneHandedSharpenedWeapons,
  hasTwoHandedSharpenedWeapon,
  hasTwoHandedMaulEquipped,
  countMacesInWeaponSlots,
} from './gearUtilities';

// Armor set configurations for penetration groups
const ARMOR_SET_PENETRATION_CONFIG = Object.freeze({
  [PenetrationComputedSourceKey.ARMOR_SETS_7918]: [
    { setId: KnownSetIDs.SHATTERED_FATE_SET, requiredPieces: 5 },
    // Add other 7918 penetration sets here when identified
  ],
  [PenetrationComputedSourceKey.ARMOR_SETS_3460]: [
    { setId: KnownSetIDs.SPRIGGANS_THORNS_SET, requiredPieces: 5 },
    // Add other 3460 penetration sets here when identified
  ],
  [PenetrationComputedSourceKey.ARMOR_SETS_1496]: [
    { setId: KnownSetIDs.PERFECT_ARMS_OF_RELEQUEN_SET, requiredPieces: 4 },
    { setId: KnownSetIDs.PERFECT_AURORAN_THUNDER_SET, requiredPieces: 4 },
    { setId: KnownSetIDs.PERFECT_ANSUULS_TORMENT_SET, requiredPieces: 4 },
  ],
  [PenetrationComputedSourceKey.ARMOR_SETS_1487]: [
    { setId: KnownSetIDs.ANSUULS_TORMENT_SET, requiredPieces: 4 },
    { setId: KnownSetIDs.TIDEBORN_WILDSTALKER_SET, requiredPieces: 4 },
    { setId: KnownSetIDs.ARMS_OF_RELEQUEN_SET, requiredPieces: 4 },
    { setId: KnownSetIDs.AERIES_CRY_SET, requiredPieces: 2 },
    { setId: KnownSetIDs.AURORANS_THUNDER_SET, requiredPieces: 4 },
    { setId: KnownSetIDs.ARMS_OF_THE_ANCESTORS_SET, requiredPieces: 3 },
    { setId: KnownSetIDs.ARCHDRUID_DEVYRIC_SET, requiredPieces: 1 },
    { setId: KnownSetIDs.BLACK_GEM_MONSTROSITY_SET, requiredPieces: 1 },
    { setId: KnownSetIDs.COLOVIAN_HIGHLANDS_GENERAL_SET, requiredPieces: 1 },
    { setId: KnownSetIDs.CINDERS_OF_ANTHELMIR_SET, requiredPieces: 2 },
    { setId: KnownSetIDs.DARK_CONVERGENCE_SET, requiredPieces: 3 },
    { setId: KnownSetIDs.DRAUGRKINS_GRIP_SET, requiredPieces: 3 },
    { setId: KnownSetIDs.DRO_ZAKARS_CLAWS_SET, requiredPieces: 2 },
    { setId: KnownSetIDs.FLAME_BLOSSOM_SET, requiredPieces: 4 },
    { setId: KnownSetIDs.GRISLY_GOURMET_SET, requiredPieces: 4 },
    { setId: KnownSetIDs.GRYPHONS_REPRISAL_SET, requiredPieces: 3 },
    { setId: KnownSetIDs.HROTHGARS_CHILL_SET, requiredPieces: 4 },
    { setId: KnownSetIDs.ICY_CONJURER_SET, requiredPieces: 4 },
    { setId: KnownSetIDs.JERENSIS_BLADESTORM_SET, requiredPieces: 3 },
    { setId: KnownSetIDs.KAZPIANS_CRUEL_SIGNET_SET, requiredPieces: 4 },
    { setId: KnownSetIDs.KRAGH_SET, requiredPieces: 1 },
    { setId: KnownSetIDs.LADY_MALYGDA_SET, requiredPieces: 1 },
    { setId: KnownSetIDs.LANGUOR_OF_PERYITE_SET, requiredPieces: 4 },
    { setId: KnownSetIDs.LEGACY_OF_KARTH_SET, requiredPieces: 4 },
    { setId: KnownSetIDs.NEW_MOON_ACOLYTE_SET, requiredPieces: 4 },
    { setId: KnownSetIDs.NOCTURNALS_PLOY_SET, requiredPieces: 2 },
    { setId: KnownSetIDs.NOXIOUS_BOULDER_SET, requiredPieces: 4 },
    { setId: KnownSetIDs.OBLIVIONS_FOE_SET, requiredPieces: 3 },
    { setId: KnownSetIDs.PELINALS_WRATH_SET, requiredPieces: 3 },
    { setId: KnownSetIDs.PERFECTED_KAZPIANS_CRUEL_SIGNET_SET, requiredPieces: 4 },
  ],
  [PenetrationComputedSourceKey.ARMOR_SETS_1190]: [
    { setId: KnownSetIDs.PERFECTED_CRUSHING_WALL_SET, requiredPieces: 2 },
    { setId: KnownSetIDs.PERFECTED_MERCILESS_CHARGE_SET, requiredPieces: 2 },
  ],
} as const);

// Mapping from computed source keys to their penetration values
const ARMOR_SET_PENETRATION_VALUES = Object.freeze({
  [PenetrationComputedSourceKey.ARMOR_SETS_7918]: PenetrationValues.ARMOR_SETS_7918_PENETRATION,
  [PenetrationComputedSourceKey.ARMOR_SETS_3460]: PenetrationValues.ARMOR_SETS_3460_PENETRATION,
  [PenetrationComputedSourceKey.ARMOR_SETS_1496]: PenetrationValues.ARMOR_SETS_1496_PENETRATION,
  [PenetrationComputedSourceKey.ARMOR_SETS_1487]: PenetrationValues.ARMOR_SETS_1487_PENETRATION,
  [PenetrationComputedSourceKey.ARMOR_SETS_1190]: PenetrationValues.ARMOR_SETS_1190_PENETRATION,
} as const);

// Herald of the Tome abilities for Splintered Secrets passive
const HERALD_ABILITIES = [
  KnownAbilities.CEPHALIARCHS_FLAIL,
  KnownAbilities.PRAGMATIC_FATECARVER,
  KnownAbilities.INSPIRED_SCHOLARSHIP,
  KnownAbilities.THE_LANGUID_EYE,
  KnownAbilities.WRITHING_RUNEBLADES,
  KnownAbilities.TENTACULAR_DREAD,
  KnownAbilities.FULMINATING_RUNE,
  KnownAbilities.RECUPERATIVE_TREATISE,
];

interface BasePenetrationSource {
  name: string;
  description: string;
}

export interface PenetrationAuraSource extends BasePenetrationSource {
  value: PenetrationValues;
  ability: KnownAbilities;
  source: 'aura';
}

export interface PenetrationGearSource extends BasePenetrationSource {
  value: PenetrationValues;
  set: KnownSetIDs;
  numberOfPieces: number;
  source: 'gear';
}

export interface PenetrationBuffSource extends BasePenetrationSource {
  value: PenetrationValues;
  ability: KnownAbilities;
  source: 'buff';
}

export interface PenetrationDebuffSource extends BasePenetrationSource {
  value: PenetrationValues;
  ability: KnownAbilities;
  source: 'debuff';
}

export interface PenetrationComputedSource extends BasePenetrationSource {
  key: PenetrationComputedSourceKey;
  source: 'computed';
}

export interface PenetrationNotImplementedSource extends BasePenetrationSource {
  source: 'not_implemented';
}

export type PenetrationSource =
  | PenetrationAuraSource
  | PenetrationGearSource
  | PenetrationBuffSource
  | PenetrationDebuffSource
  | PenetrationComputedSource
  | PenetrationNotImplementedSource;

export interface PenetrationSourceWithActiveState {
  name: string;
  description: string;
  value: number;
  wasActive: boolean;
}

export const PENETRATION_SOURCES = Object.freeze<PenetrationSource[]>([
  // ========================================
  // COMPUTED SOURCES FOR GROUPED ARMOR SETS
  // ========================================

  // Very High Penetration Sets (7918)
  {
    key: PenetrationComputedSourceKey.ARMOR_SETS_7918,
    name: 'Very High Penetration Sets',
    description:
      'Shattered Fate (5-piece) and other very high penetration sets providing 7918 penetration each (multiple instances stack)',
    source: 'computed',
  },

  // High Penetration Sets (3460)
  {
    key: PenetrationComputedSourceKey.ARMOR_SETS_3460,
    name: 'High Penetration Sets',
    description:
      "Spriggan's Thorns (5-piece) and other high penetration sets providing 3460 penetration each (multiple instances stack)",
    source: 'computed',
  },

  // Perfect Sets Penetration (1496)
  {
    key: PenetrationComputedSourceKey.ARMOR_SETS_1496,
    name: 'Perfect Sets Penetration',
    description:
      'Perfect Arms of Relequen, Perfect Auroran Thunder, Perfect Ansuul Torment (4-piece) and other perfect sets providing 1496 penetration each (multiple instances stack)',
    source: 'computed',
  },

  // Standard Sets Penetration (1487) - Most Common
  {
    key: PenetrationComputedSourceKey.ARMOR_SETS_1487,
    name: 'Standard Sets Penetration',
    description:
      'Ansuul Torment, Tide-born Wildstalker, Arms of Relequen, and 20+ other standard sets providing 1487 penetration each (multiple instances stack)',
    source: 'computed',
  },

  // Arena Weapon Penetration Sets (1190)
  {
    key: PenetrationComputedSourceKey.ARMOR_SETS_1190,
    name: 'Arena Weapon Penetration Sets',
    description:
      'Perfected Crushing Wall, Perfected Merciless Charge (2-piece) and other arena weapons providing 1190 penetration each (multiple instances stack)',
    source: 'computed',
  },
  // Aura-based sources (passive abilities, mythic items, etc.)
  {
    value: PenetrationValues.VELOTHI_UR_MAGE_AMULET,
    ability: KnownAbilities.VELOTHI_UR_MAGE_BUFF,
    name: "Velothi Ur-Mage's Amulet",
    description: 'Mythic amulet buff providing 1650 penetration',
    source: 'aura',
  },
  {
    value: PenetrationValues.HUNTERS_EYE,
    ability: KnownAbilities.HUNTERS_EYE_PASSIVE,
    name: "Hunter's Eye (Wood Elf Passive)",
    description: 'Wood Elf racial passive providing 950 penetration',
    source: 'aura',
  },
  {
    value: PenetrationValues.DISMEMBER,
    ability: KnownAbilities.DISMEMBER_PASSIVE,
    name: 'Dismember (Grave Lord Passive)',
    description:
      'Grave Lord passive providing 3271 penetration when a grave lord ability is active',
    source: 'aura',
  },
  // Computed sources (dynamic values based on gear or abilities)
  {
    key: PenetrationComputedSourceKey.CONCENTRATION,
    name: 'Concentration (Light Armor)',
    description: '939 penetration per light armor piece worn',
    source: 'computed',
  },
  {
    key: PenetrationComputedSourceKey.SPLINTERED_SECRETS,
    name: 'Splintered Secrets (Herald of the Tome)',
    description: '620 penetration per stack per Herald of the Tome ability slotted',
    source: 'computed',
  },
  {
    name: 'Force of Nature',
    description: '660 penetration per status effect',
    source: 'not_implemented',
  },
  {
    name: 'Piercing',
    description: '700 penetration',
    source: 'not_implemented',
  },
  {
    key: PenetrationComputedSourceKey.HEAVY_WEAPONS,
    name: 'Heavy Weapons',
    description: '2974 penetration if two-handed maul is equipped',
    source: 'computed',
  },
  {
    key: PenetrationComputedSourceKey.TWIN_BLADE_AND_BLUNT,
    name: 'Twin Blade and Blunt',
    description: '1487 penetration per mace equipped',
    source: 'computed',
  },
  {
    key: PenetrationComputedSourceKey.CRYSTAL_WEAPON,
    name: 'Crystal Weapon',
    description: '1000 penetration when Crystal Weapon buff is active',
    source: 'computed',
  },
  {
    key: PenetrationComputedSourceKey.BALORGH,
    name: 'Balorgh',
    description: '11500 penetration when you ult (provided with 2 pieces equipped)',
    source: 'computed',
  },
  {
    key: PenetrationComputedSourceKey.SHARPENED_1H,
    name: 'Sharpened (1H)',
    description: '1638 penetration per 1H weapon with sharpened trait',
    source: 'computed',
  },
  {
    key: PenetrationComputedSourceKey.SHARPENED_2H,
    name: 'Sharpened (2H)',
    description: '3276 penetration if 2H weapon has sharpened trait',
    source: 'computed',
  },
  {
    name: 'Hew and Sunder',
    description:
      '1236 penetration per enemy within 8 meters when you deal damage with a Heavy Attack (5-piece set)',
    source: 'not_implemented',
  },
  // Debuff-based sources
  {
    value: PenetrationValues.MAJOR_BREACH,
    ability: KnownAbilities.MAJOR_BREACH,
    name: 'Major Breach',
    description: 'Debuff reducing target resistance by 5948 penetration',
    source: 'debuff',
  },
  {
    value: PenetrationValues.MINOR_BREACH,
    ability: KnownAbilities.MINOR_BREACH,
    name: 'Minor Breach',
    description: 'Debuff reducing target resistance by 2974 penetration',
    source: 'debuff',
  },
  {
    value: PenetrationValues.CRUSHER_ENCHANT,
    ability: KnownAbilities.CRUSHER_ENCHANT,
    name: 'Crusher',
    description: 'Enchant reducing target resistance by 2108 penetration',
    source: 'debuff',
  },
  {
    value: PenetrationValues.RUNIC_SUNDER,
    ability: KnownAbilities.RUNIC_SUNDER_DEBUFF,
    name: 'Runic Sunder',
    description: 'Debuff reducing target resistance by 2200 penetration',
    source: 'debuff',
  },
  {
    value: PenetrationValues.TREMORSCALE,
    ability: KnownAbilities.TREMORSCALE,
    name: 'Tremorscale',
    description: 'Set bonus reducing target resistance by 2640 penetration',
    source: 'debuff',
  },
  {
    value: PenetrationValues.CRIMSON_OATH,
    ability: KnownAbilities.CRIMSON_OATH,
    name: 'Crimson Oath',
    description: 'Set bonus reducing target resistance by 3541 penetration',
    source: 'debuff',
  },
  {
    value: PenetrationValues.ROAR_OF_ALKOSH,
    ability: KnownAbilities.ROAR_OF_ALKOSH,
    name: 'Roar of Alkosh',
    description: 'Set bonus reducing target resistance by 6000 penetration',
    source: 'debuff',
  },
]);

function isAuraActive(combatantInfo: CombatantInfoEvent | null, ability: KnownAbilities): boolean {
  if (!combatantInfo || !combatantInfo.auras) return false;
  return combatantInfo.auras.some((aura) => aura.ability === ability);
}

function isGearSourceActive(
  combatantInfo: CombatantInfoEvent | null,
  setId: KnownSetIDs,
  numberOfPieces: number
): boolean {
  if (!combatantInfo || !combatantInfo.gear) return false;
  const setCount = getSetCount(combatantInfo.gear, setId);
  return setCount >= numberOfPieces;
}

function isComputedSourceActive(
  combatantInfo: CombatantInfoEvent | null,
  source: PenetrationComputedSource,
  playerData?: PlayerDetailsWithRole
): boolean {
  switch (source.key) {
    // ========================================
    // GROUPED ARMOR SET COMPUTED SOURCES
    // ========================================
    case PenetrationComputedSourceKey.ARMOR_SETS_7918:
    case PenetrationComputedSourceKey.ARMOR_SETS_3460:
    case PenetrationComputedSourceKey.ARMOR_SETS_1496:
    case PenetrationComputedSourceKey.ARMOR_SETS_1487:
    case PenetrationComputedSourceKey.ARMOR_SETS_1190:
      if (!combatantInfo || !combatantInfo.gear) return false;
      const setsConfig = ARMOR_SET_PENETRATION_CONFIG[source.key];
      return setsConfig.some(
        ({ setId, requiredPieces }) => getSetCount(combatantInfo.gear, setId) >= requiredPieces
      );
    // ========================================
    // INDIVIDUAL COMPUTED SOURCES
    // ========================================
    case PenetrationComputedSourceKey.CONCENTRATION:
      if (!combatantInfo || !combatantInfo.auras || !combatantInfo.gear) return false;
      return combatantInfo.auras.some(
        (aura: CombatantAura) =>
          aura.ability === KnownAbilities.CONCENTRATION || aura.name?.includes('Concentration')
      );
    case PenetrationComputedSourceKey.SPLINTERED_SECRETS:
      if (!combatantInfo || !combatantInfo.auras || !playerData) return false;
      const splinteredSecretsAuras = combatantInfo.auras.filter(
        (aura: CombatantAura) =>
          aura.ability === KnownAbilities.SPLINTERED_SECRETS ||
          aura.ability === 184885 || // Alternative Splintered Secrets ID
          aura.name?.includes('Splintered Secrets')
      );
      return splinteredSecretsAuras.length > 0;
    case PenetrationComputedSourceKey.FORCE_OF_NATURE:
      // TODO: Implement proper status effect tracking - assume inactive until implemented
      return false;
    case PenetrationComputedSourceKey.PIERCING:
      // TODO: Implement proper conditions - assume inactive until implemented
      return false;
    case PenetrationComputedSourceKey.HEAVY_WEAPONS:
      if (!combatantInfo || !combatantInfo.gear) return false;
      return hasTwoHandedMaulEquipped(combatantInfo);
    case PenetrationComputedSourceKey.TWIN_BLADE_AND_BLUNT:
      if (!combatantInfo || !combatantInfo.gear) return false;
      return countMacesInWeaponSlots(combatantInfo) > 0;
    case PenetrationComputedSourceKey.CRYSTAL_WEAPON:
      if (!combatantInfo || !combatantInfo.auras) return false;
      // Check if Crystal Weapon buff is active
      return combatantInfo.auras.some(
        (aura: CombatantAura) =>
          aura.ability === KnownAbilities.CRYSTAL_WEAPON_BUFF ||
          aura.name?.includes('Crystal Weapon')
      );
    case PenetrationComputedSourceKey.BALORGH:
      if (!combatantInfo || !combatantInfo.gear) return false;
      // Check if player has 2 pieces of Balorgh equipped
      return getSetCount(combatantInfo.gear, KnownSetIDs.BALORGH_SET) >= 2;
    case PenetrationComputedSourceKey.SHARPENED_1H:
      if (!combatantInfo || !combatantInfo.gear) return false;
      return countOneHandedSharpenedWeapons(combatantInfo) > 0;
    case PenetrationComputedSourceKey.SHARPENED_2H:
      if (!combatantInfo || !combatantInfo.gear) return false;
      return hasTwoHandedSharpenedWeapon(combatantInfo);
    case PenetrationComputedSourceKey.HEW_AND_SUNDER:
      if (!combatantInfo || !combatantInfo.gear) return false;
      // Check if player has 5 pieces of Hew and Sunder equipped
      return getSetCount(combatantInfo.gear, KnownSetIDs.HEW_AND_SUNDER_SET) >= 5;
    default:
      return false;
  }
}

function getPenetrationFromComputedSource(
  source: PenetrationComputedSource,
  combatantInfo: CombatantInfoEvent | null,
  playerData?: PlayerDetailsWithRole
): number {
  switch (source.key) {
    // ========================================
    // GROUPED ARMOR SET COMPUTED SOURCES
    // ========================================
    case PenetrationComputedSourceKey.ARMOR_SETS_7918:
    case PenetrationComputedSourceKey.ARMOR_SETS_3460:
    case PenetrationComputedSourceKey.ARMOR_SETS_1496:
    case PenetrationComputedSourceKey.ARMOR_SETS_1487:
    case PenetrationComputedSourceKey.ARMOR_SETS_1190:
      if (!combatantInfo || !combatantInfo.gear) return 0;
      const setsConfig = ARMOR_SET_PENETRATION_CONFIG[source.key];
      const penetrationValue = ARMOR_SET_PENETRATION_VALUES[source.key];

      let activeSetCount = 0;
      for (const { setId, requiredPieces } of setsConfig) {
        if (getSetCount(combatantInfo.gear, setId) >= requiredPieces) {
          activeSetCount++;
        }
      }

      return activeSetCount * penetrationValue;

    // ========================================
    // INDIVIDUAL COMPUTED SOURCES
    // ========================================
    case PenetrationComputedSourceKey.CONCENTRATION:
      if (!combatantInfo || !combatantInfo.auras || !combatantInfo.gear) return 0;
      const hasConcentration = combatantInfo.auras.some(
        (aura: CombatantAura) =>
          aura.ability === KnownAbilities.CONCENTRATION || aura.name?.includes('Concentration')
      );
      if (!hasConcentration) return 0;
      const lightArmorCount =
        combatantInfo.gear?.filter((gear: PlayerGear) => gear.type === 1).length || 0;
      return lightArmorCount * PenetrationValues.CONCENTRATION_PER_PIECE;

    case PenetrationComputedSourceKey.SPLINTERED_SECRETS:
      if (!combatantInfo || !combatantInfo.auras || !playerData) return 0;
      const splinteredSecretsAuras = combatantInfo.auras.filter(
        (aura: CombatantAura) =>
          aura.ability === KnownAbilities.SPLINTERED_SECRETS ||
          aura.ability === 184885 || // Alternative Splintered Secrets ID
          aura.name?.includes('Splintered Secrets')
      );
      if (splinteredSecretsAuras.length === 0) return 0;

      // Assume 2 stacks because we don't know how to track this properly
      const totalSplinteredSecretsStacks = 2;
      const talents = playerData?.combatantInfo?.talents ?? [];
      const slottedHeraldAbilities = talents.filter((talent: { guid: number }) =>
        HERALD_ABILITIES.includes(talent.guid)
      ).length;

      return (
        totalSplinteredSecretsStacks *
        slottedHeraldAbilities *
        PenetrationValues.SPLINTERED_SECRETS_PER_ABILITY
      );

    case PenetrationComputedSourceKey.FORCE_OF_NATURE:
      // TODO: Implement proper status effect counting
      // For now, assume 1 status effect (660 penetration)
      return PenetrationValues.FORCE_OF_NATURE_PER_STATUS * 1;

    case PenetrationComputedSourceKey.PIERCING:
      // TODO: Implement proper conditions
      // For now, assume always provides 700 penetration
      return PenetrationValues.PIERCING_PENETRATION;

    case PenetrationComputedSourceKey.HEAVY_WEAPONS:
      if (!combatantInfo || !combatantInfo.gear) return 0;
      const hasMaul = hasTwoHandedMaulEquipped(combatantInfo);
      return hasMaul ? PenetrationValues.HEAVY_WEAPONS_PENETRATION : 0;

    case PenetrationComputedSourceKey.TWIN_BLADE_AND_BLUNT:
      if (!combatantInfo || !combatantInfo.gear) return 0;
      const maceCount = countMacesInWeaponSlots(combatantInfo);
      return maceCount * PenetrationValues.TWIN_BLADE_AND_BLUNT_PER_MACE;

    case PenetrationComputedSourceKey.CRYSTAL_WEAPON:
      if (!combatantInfo || !combatantInfo.auras) return 0;
      // Check if Crystal Weapon buff is active
      const hasCrystalWeapon = combatantInfo.auras.some(
        (aura: CombatantAura) =>
          aura.ability === KnownAbilities.CRYSTAL_WEAPON_BUFF ||
          aura.name?.includes('Crystal Weapon')
      );
      return hasCrystalWeapon ? PenetrationValues.CRYSTAL_WEAPON : 0;

    case PenetrationComputedSourceKey.BALORGH:
      if (!combatantInfo || !combatantInfo.gear) return 0;
      const hasBalorgh = getSetCount(combatantInfo.gear, KnownSetIDs.BALORGH_SET) >= 2;
      return hasBalorgh ? PenetrationValues.BALORGH_PENETRATION : 0;

    case PenetrationComputedSourceKey.SHARPENED_1H:
      if (!combatantInfo || !combatantInfo.gear) return 0;
      const oneHandedSharpenedCount = countOneHandedSharpenedWeapons(combatantInfo);
      return oneHandedSharpenedCount * PenetrationValues.SHARPENED_1H_PER_WEAPON;

    case PenetrationComputedSourceKey.SHARPENED_2H:
      if (!combatantInfo || !combatantInfo.gear) return 0;
      const hasSharpenedTwoHanded = hasTwoHandedSharpenedWeapon(combatantInfo);
      return hasSharpenedTwoHanded ? PenetrationValues.SHARPENED_2H_PENETRATION : 0;

    case PenetrationComputedSourceKey.HEW_AND_SUNDER:
      if (!combatantInfo || !combatantInfo.gear) return 0;
      const hasHewAndSunder = getSetCount(combatantInfo.gear, KnownSetIDs.HEW_AND_SUNDER_SET) >= 5;
      // TODO: Count enemies within 8 meters of target
      // For now, assume 1 enemy when the set is equipped
      return hasHewAndSunder ? PenetrationValues.HEW_AND_SUNDER_PER_ENEMY * 1 : 0;

    default:
      return 0;
  }
}

export function getAllPenetrationSourcesWithActiveState(
  buffLookup: BuffLookupData | null,
  debuffLookup: BuffLookupData | null,
  combatantInfo: CombatantInfoEvent | null,
  playerData?: PlayerDetailsWithRole
): PenetrationSourceWithActiveState[] {
  const result: PenetrationSourceWithActiveState[] = [];

  for (const source of PENETRATION_SOURCES) {
    let wasActive = false;
    let value = 0;

    switch (source.source) {
      case 'aura':
        wasActive = isAuraActive(combatantInfo, source.ability);
        value = source.value;
        break;
      case 'buff':
        wasActive = buffLookup ? isBuffActiveAtTimestamp(buffLookup, source.ability) : false;
        value = source.value;
        break;
      case 'debuff':
        wasActive = debuffLookup ? isBuffActiveAtTimestamp(debuffLookup, source.ability) : false;
        value = source.value;
        break;
      case 'gear':
        wasActive = isGearSourceActive(combatantInfo, source.set, source.numberOfPieces);
        value = source.value;
        break;
      case 'computed':
        wasActive = isComputedSourceActive(combatantInfo, source, playerData);
        value = wasActive ? getPenetrationFromComputedSource(source, combatantInfo, playerData) : 0;
        break;
    }

    result.push({
      name: source.name,
      description: source.description,
      value,
      wasActive,
    });
  }

  return result;
}

export function calculateStaticPenetration(
  combatantInfo: CombatantInfoEvent | null,
  playerData: PlayerDetailsWithRole | undefined
): number {
  const basePenetration = 0; // Base penetration

  let gearPenetration = 0;
  let auraPenetration = 0;
  let computedPenetration = 0;

  for (const source of PENETRATION_SOURCES) {
    let isActive = false;

    switch (source.source) {
      case 'aura':
        isActive = isAuraActive(combatantInfo, source.ability);
        if (isActive) {
          auraPenetration += source.value;
        }
        break;
      case 'gear':
        isActive = isGearSourceActive(combatantInfo, source.set, source.numberOfPieces);
        if (isActive) {
          gearPenetration += source.value;
        }
        break;
      case 'computed':
        isActive = isComputedSourceActive(combatantInfo, source, playerData);
        if (isActive) {
          computedPenetration += getPenetrationFromComputedSource(
            source,
            combatantInfo,
            playerData
          );
        }
        break;
      // Skip dynamic sources (buff/debuff) - these are calculated per timestamp
    }
  }

  return basePenetration + gearPenetration + auraPenetration + computedPenetration;
}

export function calculateDynamicPenetrationAtTimestamp(
  buffLookup: BuffLookupData | null,
  debuffLookup: BuffLookupData | null,
  timestamp: number,
  playerId: number | null, // For checking buffs applied to the player
  targetId: number | null // For checking debuffs applied to the target
): number {
  let buffPenetration = 0;
  let debuffPenetration = 0;

  for (const source of PENETRATION_SOURCES) {
    let isActive = false;

    switch (source.source) {
      case 'buff':
        // Buffs: Check if active on the selected player (who benefits from penetration)
        isActive = buffLookup
          ? playerId !== null
            ? isBuffActiveOnTarget(buffLookup, source.ability, timestamp, playerId)
            : isBuffActiveAtTimestamp(buffLookup, source.ability, timestamp)
          : false;
        if (isActive) {
          buffPenetration += source.value;
        }
        break;
      case 'debuff':
        // Debuffs: Check if active on the selected target (enemy who has reduced resistances)
        isActive = debuffLookup
          ? targetId !== null
            ? isBuffActiveOnTarget(debuffLookup, source.ability, timestamp, targetId)
            : isBuffActiveAtTimestamp(debuffLookup, source.ability, timestamp)
          : false;
        if (isActive) {
          debuffPenetration += source.value;
        }
        break;
      // Skip static sources - these are calculated once
    }
  }

  return buffPenetration + debuffPenetration;
}

export function calculatePenetrationAtTimestamp(
  buffLookup: BuffLookupData | null,
  debuffLookup: BuffLookupData | null,
  combatantInfo: CombatantInfoEvent | null,
  playerData: PlayerDetailsWithRole | undefined,
  timestamp: number,
  playerId: number | null, // For checking buffs applied to the player
  targetId: number | null // For checking debuffs applied to the target
): number {
  const staticPenetration = calculateStaticPenetration(combatantInfo, playerData);
  const dynamicPenetration = calculateDynamicPenetrationAtTimestamp(
    buffLookup,
    debuffLookup,
    timestamp,
    playerId,
    targetId
  );

  return staticPenetration + dynamicPenetration;
}
