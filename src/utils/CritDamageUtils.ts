import { arcanistData } from '../data/skillsets/arcanist';
import { wardenData } from '../data/skillsets/warden';
import { PlayerDetailsWithRole } from '../store/player_data/playerDataSlice';
import { CriticalDamageValues, KnownAbilities, KnownSetIDs } from '../types/abilities';
import { CombatantInfoEvent } from '../types/combatlogEvents';
import { ArmorType } from '../types/playerDetails';

import { BuffLookupData, isBuffActive as checkBuffActiveAtTimestamp } from './BuffLookupUtils';
import { getSetCount, countAxesInWeaponSlots, hasTwoHandedAxeEquipped } from './gearUtilities';

interface BaseCriticalDamageSource {
  name: string;
  description: string;
}

export interface CriticalDamageAuraSource extends BaseCriticalDamageSource {
  value: CriticalDamageValues;
  ability: KnownAbilities;
  source: 'aura';
}

export interface CriticalDamageGearSource extends BaseCriticalDamageSource {
  value: CriticalDamageValues;
  set: KnownSetIDs;
  numberOfPieces: number;
  source: 'gear';
}

export interface CriticalDamageBuffSource extends BaseCriticalDamageSource {
  value: CriticalDamageValues;
  ability: KnownAbilities;
  source: 'buff';
}

export interface CriticalDamageDebuffSource extends BaseCriticalDamageSource {
  value: CriticalDamageValues;
  ability: KnownAbilities;
  source: 'debuff';
}

export enum ComputedCriticalDamageSources {
  FATED_FORTUNE,
  DEXTERITY,
  FIGHTING_FINESSE,
  SUL_XAN_TORMENT,
  MORA_SCRIBE_THESIS,
  HARPOONER_WADING_KILT,
  ADVANCED_SPECIES,
  DUAL_WIELD_AXES,
  TWO_HANDED_BATTLE_AXE,
  BACKSTABBER,
  ELEMENTAL_CATALYST,
}

export interface CriticalDamageComputedSource extends BaseCriticalDamageSource {
  key: ComputedCriticalDamageSources;
  source: 'computed';
}

export type CriticalDamageSource =
  | CriticalDamageAuraSource
  | CriticalDamageGearSource
  | CriticalDamageBuffSource
  | CriticalDamageDebuffSource
  | CriticalDamageComputedSource;

export type CriticalDamageSourceWithActiveState = CriticalDamageSource & { wasActive: boolean };

export const CRITICAL_DAMAGE_SOURCES = Object.freeze<CriticalDamageSource[]>([
  {
    key: ComputedCriticalDamageSources.FATED_FORTUNE,
    name: 'Fated Fortune',
    description: 'Critical damage from Fated Fortune passive',
    source: 'computed',
  },
  {
    key: ComputedCriticalDamageSources.DEXTERITY,
    name: 'Dexterity',
    description: 'Critical damage from Medium Armor Dexterity passive',
    source: 'computed',
  },
  {
    key: ComputedCriticalDamageSources.FIGHTING_FINESSE,
    name: 'Fighting Finesse',
    description: 'Critical damage from Fighting Finesse champion point',
    source: 'computed',
  },
  {
    key: ComputedCriticalDamageSources.SUL_XAN_TORMENT,
    name: "Sul-Xan's Torment",
    description: "Critical damage from Sul-Xan's Torment set (5 pieces)",
    source: 'computed',
  },
  {
    key: ComputedCriticalDamageSources.MORA_SCRIBE_THESIS,
    name: "Mora Scribe's Thesis",
    description: "Critical damage from Mora Scribe's Thesis set (5 pieces)",
    source: 'computed',
  },
  {
    key: ComputedCriticalDamageSources.HARPOONER_WADING_KILT,
    name: "Harpooner's Wading Kilt",
    description: "Critical damage from Harpooner's Wading Kilt when equipped",
    source: 'computed',
  },
  {
    key: ComputedCriticalDamageSources.ADVANCED_SPECIES,
    name: 'Animal Companions',
    description: 'Critical damage from Animal Companions passive (5% per ability slotted)',
    source: 'computed',
  },
  {
    key: ComputedCriticalDamageSources.DUAL_WIELD_AXES,
    name: 'Twin Blade and Blunt',
    description: 'Critical damage from Dual Wield axes (6% per axe equipped)',
    source: 'computed',
  },
  {
    key: ComputedCriticalDamageSources.TWO_HANDED_BATTLE_AXE,
    name: 'Heavy Weapons',
    description: 'Critical damage from Two Handed battle axe (12% with battle axe equipped)',
    source: 'computed',
  },
  {
    key: ComputedCriticalDamageSources.BACKSTABBER,
    name: 'Backstabber',
    description: 'Critical damage from Backstabber (10% damage buff)',
    source: 'computed',
  },
  {
    key: ComputedCriticalDamageSources.ELEMENTAL_CATALYST,
    name: 'Elemental Catalyst',
    description: 'Critical damage from Elemental Catalyst (5% per elemental weakness debuff)',
    source: 'computed',
  },
  {
    ability: KnownAbilities.HEMORRHAGE,
    value: CriticalDamageValues.HEMORRHAGE,
    name: 'Hemorrhage',
    description: 'Critical damage from Hemorrhage passive',
    source: 'aura',
  },
  {
    ability: KnownAbilities.PIERCING_SPEAR,
    value: CriticalDamageValues.PIERCING_SPEAR,
    name: 'Piercing Spear',
    description: 'Critical damage from Piercing Spear passive',
    source: 'aura',
  },
  {
    ability: KnownAbilities.FELINE_AMBUSH,
    value: CriticalDamageValues.FELINE_AMBUSH,
    name: 'Feline Ambush',
    description: 'Critical damage from Feline Ambush aura',
    source: 'aura',
  },
  {
    ability: KnownAbilities.LUCENT_ECHOES,
    value: CriticalDamageValues.LUCENT_ECHOES,
    name: 'Lucent Echoes',
    description: 'Critical damage from Lucent Echoes set bonus',
    source: 'buff',
  },
  {
    ability: KnownAbilities.MINOR_FORCE,
    value: CriticalDamageValues.MINOR_FORCE,
    name: 'Minor Force',
    description: 'Critical damage from Minor Force buff',
    source: 'buff',
  },
  {
    ability: KnownAbilities.MAJOR_FORCE,
    value: CriticalDamageValues.MAJOR_FORCE,
    name: 'Major Force',
    description: 'Critical damage from Major Force buff',
    source: 'buff',
  },
  {
    ability: KnownAbilities.MINOR_BRITTLE,
    value: CriticalDamageValues.MINOR_BRITTLE,
    name: 'Minor Brittle',
    description: 'Critical damage from Minor Brittle debuff',
    source: 'debuff',
  },
  {
    ability: KnownAbilities.MAJOR_BRITTLE,
    value: CriticalDamageValues.MAJOR_BRITTLE,
    name: 'Major Brittle',
    description: 'Critical damage from Major Brittle debuff',
    source: 'debuff',
  },
]);

export function isAuraActive(
  combatantInfo: CombatantInfoEvent | null,
  abilityId: KnownAbilities
): boolean {
  if (!combatantInfo || !combatantInfo.auras) return false;
  return combatantInfo.auras.some((aura) => aura.ability === abilityId);
}

export function isBuffActive(buffLookup: BuffLookupData, abilityId: KnownAbilities): boolean {
  const intervals = buffLookup.buffIntervals.get(abilityId);
  return intervals !== undefined && intervals.length > 0;
}

export function isDebuffActive(debuffLookup: BuffLookupData, abilityId: KnownAbilities): boolean {
  const intervals = debuffLookup.buffIntervals.get(abilityId);
  return intervals !== undefined && intervals.length > 0;
}

export function isBuffActiveAtTimestamp(
  buffLookup: BuffLookupData,
  abilityId: KnownAbilities,
  timestamp: number
): boolean {
  return checkBuffActiveAtTimestamp(buffLookup, abilityId, timestamp);
}

export function isDebuffActiveAtTimestamp(
  debuffLookup: BuffLookupData,
  abilityId: KnownAbilities,
  timestamp: number
): boolean {
  return checkBuffActiveAtTimestamp(debuffLookup, abilityId, timestamp);
}

export function isGearSourceActive(
  combatantInfo: CombatantInfoEvent | null,
  setId: KnownSetIDs,
  numberOfPieces: number
): boolean {
  if (!combatantInfo || !combatantInfo.gear) return false;
  const gearCount = getSetCount(combatantInfo.gear, setId);
  return gearCount >= numberOfPieces;
}

export function isComputedSourceActive(
  combatantInfo: CombatantInfoEvent | null,
  source: CriticalDamageComputedSource,
  debuffLookup: BuffLookupData,
  timestamp?: number
): boolean {
  switch (source.key) {
    case ComputedCriticalDamageSources.FATED_FORTUNE:
      return isAuraActive(combatantInfo, KnownAbilities.FATED_FORTUNE_STAGE_ONE);
    case ComputedCriticalDamageSources.DEXTERITY:
      // TODO: determine how to see if this passive is active.
      return true;
    case ComputedCriticalDamageSources.FIGHTING_FINESSE:
      // TODO: determine how to tell if this CP is active
      return true;
    case ComputedCriticalDamageSources.SUL_XAN_TORMENT:
      return isGearSourceActive(combatantInfo, KnownSetIDs.SUL_XAN_TORMENT_SET, 5);
    case ComputedCriticalDamageSources.MORA_SCRIBE_THESIS:
      return isGearSourceActive(combatantInfo, KnownSetIDs.MORA_SCRIBE_THESIS_SET, 5);
    case ComputedCriticalDamageSources.HARPOONER_WADING_KILT:
      return isGearSourceActive(combatantInfo, KnownSetIDs.HARPOONER_WADING_KILT_SET, 1);
    case ComputedCriticalDamageSources.ADVANCED_SPECIES:
      return isAuraActive(combatantInfo, KnownAbilities.ADVANCED_SPECIES);
    case ComputedCriticalDamageSources.DUAL_WIELD_AXES:
      return countAxesInWeaponSlots(combatantInfo) > 0;
    case ComputedCriticalDamageSources.TWO_HANDED_BATTLE_AXE:
      return hasTwoHandedAxeEquipped(combatantInfo);
    case ComputedCriticalDamageSources.BACKSTABBER:
      // TODO Detect if the backstabber CP is equipped
      return false;
    case ComputedCriticalDamageSources.ELEMENTAL_CATALYST:
      return timestamp
        ? isDebuffActiveAtTimestamp(debuffLookup, KnownAbilities.FLAME_WEAKNESS, timestamp) ||
            isDebuffActiveAtTimestamp(debuffLookup, KnownAbilities.FROST_WEAKNESS, timestamp) ||
            isDebuffActiveAtTimestamp(debuffLookup, KnownAbilities.SHOCK_WEAKNESS, timestamp)
        : isDebuffActive(debuffLookup, KnownAbilities.FLAME_WEAKNESS) ||
            isDebuffActive(debuffLookup, KnownAbilities.FROST_WEAKNESS) ||
            isDebuffActive(debuffLookup, KnownAbilities.SHOCK_WEAKNESS);
  }
}

export function getEnabledCriticalDamageSources(
  buffLookup: BuffLookupData,
  debuffLookup: BuffLookupData,
  combatantInfo: CombatantInfoEvent | null
): CriticalDamageSource[] {
  const result = [];

  for (const source of CRITICAL_DAMAGE_SOURCES) {
    let isActive = false;

    switch (source.source) {
      case 'aura':
        isActive = isAuraActive(combatantInfo, source.ability);
        break;
      case 'buff':
        isActive = isBuffActive(buffLookup, source.ability);
        break;
      case 'debuff':
        isActive = isDebuffActive(debuffLookup, source.ability);
        break;
      case 'gear':
        isActive = isGearSourceActive(combatantInfo, source.set, source.numberOfPieces);
        break;
      case 'computed':
        isActive = isComputedSourceActive(combatantInfo, source, debuffLookup);
        break;
    }

    if (isActive) {
      result.push(source);
    }
  }

  return result;
}

export function getAllCriticalDamageSourcesWithActiveState(
  buffLookup: BuffLookupData,
  debuffLookup: BuffLookupData,
  combatantInfo: CombatantInfoEvent | null
): CriticalDamageSourceWithActiveState[] {
  const result: CriticalDamageSourceWithActiveState[] = [];

  for (const source of CRITICAL_DAMAGE_SOURCES) {
    let wasActive = false;

    switch (source.source) {
      case 'aura':
        wasActive = isAuraActive(combatantInfo, source.ability);
        break;
      case 'buff':
        wasActive = isBuffActive(buffLookup, source.ability);
        break;
      case 'debuff':
        wasActive = isDebuffActive(debuffLookup, source.ability);
        break;
      case 'gear':
        wasActive = isGearSourceActive(combatantInfo, source.set, source.numberOfPieces);
        break;
      case 'computed':
        wasActive = isComputedSourceActive(combatantInfo, source, debuffLookup);
        break;
    }

    result.push({
      ...source,
      wasActive,
    });
  }

  return result;
}

export function calculateCriticalDamageAtTimestamp(
  buffLookup: BuffLookupData,
  debuffLookup: BuffLookupData,
  combatantInfo: CombatantInfoEvent | null,
  playerData: PlayerDetailsWithRole | undefined,
  timestamp: number
): number {
  const baseCriticalDamage = 50; // Base critical damage percentage

  let gearCriticalDamage = 0;
  let auraCriticalDamage = 0;
  let computedCriticalDamage = 0;
  let buffCriticalDamage = 0;
  let debuffCriticalDamage = 0;

  for (const source of CRITICAL_DAMAGE_SOURCES) {
    let isActive = false;

    switch (source.source) {
      case 'aura':
        isActive = isAuraActive(combatantInfo, source.ability);
        if (isActive) {
          auraCriticalDamage += source.value;
        }
        break;
      case 'buff':
        isActive = isBuffActiveAtTimestamp(buffLookup, source.ability, timestamp);
        if (isActive) {
          buffCriticalDamage += source.value;
        }
        break;
      case 'debuff':
        isActive = isDebuffActiveAtTimestamp(debuffLookup, source.ability, timestamp);
        if (isActive) {
          debuffCriticalDamage += source.value;
        }
        break;
      case 'gear':
        isActive = isGearSourceActive(combatantInfo, source.set, source.numberOfPieces);
        if (isActive) {
          gearCriticalDamage += source.value;
        }
        break;
      case 'computed':
        isActive = isComputedSourceActive(combatantInfo, source, debuffLookup, timestamp);
        if (isActive) {
          computedCriticalDamage += getCritDamageFromComputedSource(
            source,
            playerData,
            combatantInfo,
            debuffLookup,
            timestamp
          );
        }
        break;
    }
  }

  return (
    baseCriticalDamage +
    gearCriticalDamage +
    auraCriticalDamage +
    computedCriticalDamage +
    buffCriticalDamage +
    debuffCriticalDamage
  );
}

export function calculateStaticCriticalDamage(
  combatantInfo: CombatantInfoEvent | null,
  playerData: PlayerDetailsWithRole | undefined,
  debuffLookup: BuffLookupData
): number {
  const baseCriticalDamage = 50; // Base critical damage percentage

  let gearCriticalDamage = 0;
  let auraCriticalDamage = 0;
  let computedCriticalDamage = 0;

  for (const source of CRITICAL_DAMAGE_SOURCES) {
    let isActive = false;

    switch (source.source) {
      case 'aura':
        isActive = isAuraActive(combatantInfo, source.ability);
        if (isActive) {
          auraCriticalDamage += source.value;
        }
        break;
      case 'gear':
        isActive = isGearSourceActive(combatantInfo, source.set, source.numberOfPieces);
        if (isActive) {
          gearCriticalDamage += source.value;
        }
        break;
      case 'computed':
        isActive = isComputedSourceActive(combatantInfo, source, debuffLookup);
        if (isActive) {
          computedCriticalDamage += getCritDamageFromComputedSource(
            source,
            playerData,
            combatantInfo
          );
        }
        break;
      // Skip buff and debuff sources - these are dynamic
    }
  }

  return baseCriticalDamage + gearCriticalDamage + auraCriticalDamage + computedCriticalDamage;
}

export function calculateDynamicCriticalDamageAtTimestamp(
  buffLookup: BuffLookupData,
  debuffLookup: BuffLookupData,
  timestamp: number
): number {
  let buffCriticalDamage = 0;
  let debuffCriticalDamage = 0;

  for (const source of CRITICAL_DAMAGE_SOURCES) {
    let isActive = false;

    switch (source.source) {
      case 'buff':
        isActive = isBuffActiveAtTimestamp(buffLookup, source.ability, timestamp);
        if (isActive) {
          buffCriticalDamage += source.value;
        }
        break;
      case 'debuff':
        isActive = isDebuffActiveAtTimestamp(debuffLookup, source.ability, timestamp);
        if (isActive) {
          debuffCriticalDamage += source.value;
        }
        break;
      // Skip static sources - these are calculated once
    }
  }

  return buffCriticalDamage + debuffCriticalDamage;
}

export function getCritDamageFromComputedSource(
  source: CriticalDamageComputedSource,
  playerData: PlayerDetailsWithRole | undefined,
  combatantInfo: CombatantInfoEvent | null,
  debuffLookup?: BuffLookupData,
  timestamp?: number
): number {
  if (playerData === undefined || combatantInfo === null) {
    return 0;
  }

  switch (source.key) {
    case ComputedCriticalDamageSources.FATED_FORTUNE:
      // Only look at the front bar
      const arcAbilities = playerData.combatantInfo.talents.slice(0, 6).filter((t) =>
        Object.values(arcanistData.skillLines.heraldOfTheTome.activeAbilities)
          .flatMap((ability) => {
            return [ability, ...Object.values(ability.morphs)];
          })
          .some((a) => a.name === t.name)
      );
      return arcAbilities.length * CriticalDamageValues.FATED_FORTUNE;
    case ComputedCriticalDamageSources.DEXTERITY:
      const mediumGear = combatantInfo.gear?.filter((item) => item.type === ArmorType.MEDIUM);
      return mediumGear.length * CriticalDamageValues.DEXTERITY_PER_PIECE;
    case ComputedCriticalDamageSources.FIGHTING_FINESSE:
      return CriticalDamageValues.FIGHTING_FINESSE;
    case ComputedCriticalDamageSources.SUL_XAN_TORMENT:
      // Check if player has 5 pieces of Sul-Xan's Torment equipped
      const hasFullSet = isGearSourceActive(combatantInfo, KnownSetIDs.SUL_XAN_TORMENT_SET, 5);
      return hasFullSet ? CriticalDamageValues.SUL_XAN_TORMENT : 0;
    case ComputedCriticalDamageSources.MORA_SCRIBE_THESIS:
      // Check if player has 5 pieces of Mora Scribe's Thesis equipped
      const hasFullMoraSet = isGearSourceActive(
        combatantInfo,
        KnownSetIDs.MORA_SCRIBE_THESIS_SET,
        5
      );
      return hasFullMoraSet ? CriticalDamageValues.MORA_SCRIBE_THESIS : 0;
    case ComputedCriticalDamageSources.HARPOONER_WADING_KILT:
      // Check if player has Harpooner's Wading Kilt equipped
      const hasKilt = isGearSourceActive(combatantInfo, KnownSetIDs.HARPOONER_WADING_KILT_SET, 1);
      return hasKilt ? CriticalDamageValues.HARPOONER_WADING_KILT : 0;
    case ComputedCriticalDamageSources.ADVANCED_SPECIES:
      // Count Animal Companions abilities on front bar
      if (!playerData) return 0;
      const animalCompanionAbilities = playerData.combatantInfo.talents.slice(0, 6).filter((t) =>
        Object.values(wardenData.skillLines.animalCompanions.activeAbilities)
          .flatMap((ability) => {
            return [ability, ...Object.values(ability.morphs)];
          })
          .some((a) => a.name === t.name)
      );
      return animalCompanionAbilities.length * CriticalDamageValues.ANIMAL_COMPANIONS_PER_ABILITY;
    case ComputedCriticalDamageSources.DUAL_WIELD_AXES:
      const axeCount = countAxesInWeaponSlots(combatantInfo);
      return axeCount * CriticalDamageValues.DUAL_WIELD_AXES;
    case ComputedCriticalDamageSources.TWO_HANDED_BATTLE_AXE:
      return hasTwoHandedAxeEquipped(combatantInfo)
        ? CriticalDamageValues.TWO_HANDED_BATTLE_AXE
        : 0;
    case ComputedCriticalDamageSources.BACKSTABBER:
      // Always active as requested
      return CriticalDamageValues.BACKSTABBER;
    case ComputedCriticalDamageSources.ELEMENTAL_CATALYST:
      // Calculate damage based on active elemental weakness debuffs
      if (!debuffLookup || timestamp === undefined) return 0;

      let activeWeaknessCount = 0;

      // Check each elemental weakness debuff at the given timestamp
      if (isDebuffActiveAtTimestamp(debuffLookup, KnownAbilities.FLAME_WEAKNESS, timestamp)) {
        activeWeaknessCount++;
      }
      if (isDebuffActiveAtTimestamp(debuffLookup, KnownAbilities.FROST_WEAKNESS, timestamp)) {
        activeWeaknessCount++;
      }
      if (isDebuffActiveAtTimestamp(debuffLookup, KnownAbilities.SHOCK_WEAKNESS, timestamp)) {
        activeWeaknessCount++;
      }

      return activeWeaknessCount * CriticalDamageValues.ELEMENTAL_CATALYST_PER_WEAKNESS;
  }
}
