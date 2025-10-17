import { wardenData } from '../data/skillsets/warden';
import { PlayerDetailsWithRole } from '../store/player_data/playerDataSlice';
import { CriticalDamageValues, KnownAbilities, KnownSetIDs } from '../types/abilities';
import { CombatantInfoEvent } from '../types/combatlogEvents';
import { ArmorType } from '../types/playerDetails';

import {
  BuffLookupData,
  isBuffActive as checkBuffActiveAtTimestamp,
  isBuffActiveOnTarget,
} from './BuffLookupUtils';
import { getSetCount, countAxesInWeaponSlots, hasTwoHandedAxeEquipped } from './gearUtilities';

const CRITICAL_DAMAGE_BUFF_VARIANTS: Partial<Record<KnownAbilities, KnownAbilities[]>> = {
  [KnownAbilities.LUCENT_ECHOES_RECIPIENT]: [
    KnownAbilities.LUCENT_ECHOES_RECIPIENT,
    KnownAbilities.LUCENT_ECHOES_WEARER,
  ],
  [KnownAbilities.LUCENT_ECHOES_WEARER]: [
    KnownAbilities.LUCENT_ECHOES_RECIPIENT,
    KnownAbilities.LUCENT_ECHOES_WEARER,
  ],
};

function getBuffAbilityVariants(abilityId: KnownAbilities): KnownAbilities[] {
  return CRITICAL_DAMAGE_BUFF_VARIANTS[abilityId] ?? [abilityId];
}

/**
 * Special detection logic for Lucent Echoes:
 * - Ability 220061 (LUCENT_ECHOES_WEARER) appears ONLY on the wearer in their auras
 * - Ability 220015 (LUCENT_ECHOES_RECIPIENT) appears on recipients in auras OR buff events
 * - This hybrid approach handles both detection patterns seen in different fights
 */
function isLucentEchoesActive(
  combatantInfo: CombatantInfoEvent | null,
  buffLookup: BuffLookupData,
  timestamp?: number,
): boolean {
  // Check if wearing Lucent Echoes (has the wearer-only aura 220061)
  if (combatantInfo?.auras?.some((aura) => aura.ability === KnownAbilities.LUCENT_ECHOES_WEARER)) {
    return true;
  }

  // Check if receiving Lucent Echoes benefit (has aura 220015 OR buff 220015)
  const hasRecipientAura = combatantInfo?.auras?.some(
    (aura) => aura.ability === KnownAbilities.LUCENT_ECHOES_RECIPIENT,
  );
  const targetId = combatantInfo?.sourceID;
  const hasRecipientBuff =
    targetId !== undefined &&
    isBuffActiveOnTarget(buffLookup, KnownAbilities.LUCENT_ECHOES_RECIPIENT, timestamp, targetId);

  return hasRecipientAura || hasRecipientBuff;
}

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

export interface CriticalDamageNotImplementedSource extends BaseCriticalDamageSource {
  source: 'not_implemented';
}

export enum AlwaysOnCriticalDamageSources {
  DEXTERITY,
  FIGHTING_FINESSE,
}

export interface CriticalDamageAlwaysOnSource extends BaseCriticalDamageSource {
  key: AlwaysOnCriticalDamageSources;
  source: 'always_on';
}

export enum ComputedCriticalDamageSources {
  FATED_FORTUNE,
  SUL_XAN_TORMENT,
  MORA_SCRIBE_THESIS,
  HARPOONER_WADING_KILT,
  ADVANCED_SPECIES,
  DUAL_WIELD_AXES,
  TWO_HANDED_BATTLE_AXE,
  BACKSTABBER,
  ELEMENTAL_CATALYST,
  LUCENT_ECHOES,
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
  | CriticalDamageComputedSource
  | CriticalDamageNotImplementedSource
  | CriticalDamageAlwaysOnSource;

export type CriticalDamageSourceWithActiveState = CriticalDamageSource & { wasActive: boolean };

export const CRITICAL_DAMAGE_SOURCES = Object.freeze<CriticalDamageSource[]>([
  {
    key: ComputedCriticalDamageSources.FATED_FORTUNE,
    name: 'Fated Fortune',
    description:
      'Critical damage from Fated Fortune passive (12% when generated or consuming crux)',
    source: 'computed',
  },
  {
    key: AlwaysOnCriticalDamageSources.DEXTERITY,
    name: 'Dexterity',
    description:
      'Critical damage from Medium Armor Dexterity passive (2% per piece of medium armor)',
    source: 'always_on',
  },
  {
    key: AlwaysOnCriticalDamageSources.FIGHTING_FINESSE,
    name: 'Fighting Finesse',
    description: 'Critical damage from Fighting Finesse champion point (8%)',
    source: 'always_on',
  },
  {
    key: ComputedCriticalDamageSources.SUL_XAN_TORMENT,
    name: "Sul-Xan's Torment",
    description: "Critical damage from Sul-Xan's Torment set (12% with 5 pieces)",
    source: 'computed',
  },
  {
    key: ComputedCriticalDamageSources.MORA_SCRIBE_THESIS,
    name: "Mora Scribe's Thesis",
    description: "Critical damage from Mora Scribe's Thesis set (12% with 5 pieces)",
    source: 'computed',
  },
  {
    key: ComputedCriticalDamageSources.HARPOONER_WADING_KILT,
    name: "Harpooner's Wading Kilt",
    description: "Critical damage from Harpooner's Wading Kilt when equipped (10%)",
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
    name: 'Backstabber',
    description: 'Critical damage from Backstabber champion point (10%)',
    source: 'not_implemented',
  },
  {
    key: ComputedCriticalDamageSources.ELEMENTAL_CATALYST,
    name: 'Elemental Catalyst',
    description:
      'Critical damage from Elemental Catalyst champion point (5% per elemental weakness debuff)',
    source: 'computed',
  },
  {
    key: ComputedCriticalDamageSources.LUCENT_ECHOES,
    name: 'Lucent Echoes',
    description: 'Critical damage from Lucent Echoes set bonus (11%)',
    source: 'computed',
  },
  {
    ability: KnownAbilities.HEMORRHAGE,
    value: CriticalDamageValues.HEMORRHAGE,
    name: 'Hemorrhage',
    description: 'Critical damage from Hemorrhage passive (10%)',
    source: 'aura',
  },
  {
    ability: KnownAbilities.PIERCING_SPEAR,
    value: CriticalDamageValues.PIERCING_SPEAR,
    name: 'Piercing Spear',
    description: 'Critical damage from Piercing Spear passive (12%)',
    source: 'aura',
  },
  {
    ability: KnownAbilities.FELINE_AMBUSH,
    value: CriticalDamageValues.FELINE_AMBUSH,
    name: 'Feline Ambush',
    description: 'Critical damage from Feline Ambush aura (12%)',
    source: 'aura',
  },
  {
    ability: KnownAbilities.MINOR_FORCE,
    value: CriticalDamageValues.MINOR_FORCE,
    name: 'Minor Force',
    description: 'Critical damage from Minor Force buff (10%)',
    source: 'buff',
  },
  {
    ability: KnownAbilities.MAJOR_FORCE,
    value: CriticalDamageValues.MAJOR_FORCE,
    name: 'Major Force',
    description: 'Critical damage from Major Force buff (20%)',
    source: 'buff',
  },
  {
    ability: KnownAbilities.MINOR_BRITTLE,
    value: CriticalDamageValues.MINOR_BRITTLE,
    name: 'Minor Brittle',
    description: 'Critical damage from Minor Brittle debuff (10%)',
    source: 'debuff',
  },
  {
    ability: KnownAbilities.MAJOR_BRITTLE,
    value: CriticalDamageValues.MAJOR_BRITTLE,
    name: 'Major Brittle',
    description: 'Critical damage from Major Brittle debuff (20%)',
    source: 'debuff',
  },
]);

export function isAuraActive(
  combatantInfo: CombatantInfoEvent | null,
  abilityId: KnownAbilities,
): boolean {
  if (!combatantInfo || !combatantInfo.auras) return false;
  return getBuffAbilityVariants(abilityId).some((id) =>
    combatantInfo.auras.some((aura) => aura.ability === id),
  );
}

export function isBuffActive(buffLookup: BuffLookupData, abilityId: KnownAbilities): boolean {
  return getBuffAbilityVariants(abilityId).some((id) => {
    const intervals = buffLookup.buffIntervals[id.toString()];
    return intervals !== undefined && intervals.length > 0;
  });
}

export function isDebuffActive(debuffLookup: BuffLookupData, abilityId: KnownAbilities): boolean {
  const intervals = debuffLookup.buffIntervals[abilityId.toString()];
  return intervals !== undefined && intervals.length > 0;
}

export function isBuffActiveAtTimestamp(
  buffLookup: BuffLookupData,
  abilityId: KnownAbilities,
  timestamp: number,
): boolean {
  return getBuffAbilityVariants(abilityId).some((id) =>
    checkBuffActiveAtTimestamp(buffLookup, id, timestamp),
  );
}

export function isDebuffActiveAtTimestamp(
  debuffLookup: BuffLookupData,
  abilityId: KnownAbilities,
  timestamp: number,
): boolean {
  return checkBuffActiveAtTimestamp(debuffLookup, abilityId, timestamp);
}

export function isGearSourceActive(
  combatantInfo: CombatantInfoEvent | null,
  setId: KnownSetIDs,
  numberOfPieces: number,
): boolean {
  if (!combatantInfo || !combatantInfo.gear) return false;
  const gearCount = getSetCount(combatantInfo.gear, setId);
  return gearCount >= numberOfPieces;
}

export function isComputedSourceActive(
  combatantInfo: CombatantInfoEvent | null,
  source: CriticalDamageComputedSource,
  debuffLookup: BuffLookupData,
  buffLookup?: BuffLookupData,
  timestamp?: number,
): boolean {
  switch (source.key) {
    case ComputedCriticalDamageSources.FATED_FORTUNE:
      return isAuraActive(combatantInfo, KnownAbilities.FATED_FORTUNE_STAGE_ONE);
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
    case ComputedCriticalDamageSources.LUCENT_ECHOES:
      return !!buffLookup && isLucentEchoesActive(combatantInfo, buffLookup, timestamp);
  }

  return false;
}

export function getEnabledCriticalDamageSources(
  buffLookup: BuffLookupData,
  debuffLookup: BuffLookupData,
  combatantInfo: CombatantInfoEvent | null,
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
        isActive = isComputedSourceActive(combatantInfo, source, debuffLookup, buffLookup);
        break;
      case 'always_on':
        isActive = true;
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
  combatantInfo: CombatantInfoEvent | null,
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
        wasActive = isComputedSourceActive(combatantInfo, source, debuffLookup, buffLookup);
        break;
      case 'always_on':
        wasActive = true;
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
  combatantInfo: CombatantInfoEvent,
  playerData: PlayerDetailsWithRole,
  timestamp: number,
): number {
  const baseCriticalDamage = 50; // Base critical damage percentage

  let gearCriticalDamage = 0;
  let auraCriticalDamage = 0;
  let computedCriticalDamage = 0;
  let buffCriticalDamage = 0;
  let debuffCriticalDamage = 0;
  let alwaysOnCriticalDamage = 0;

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
        isActive = isComputedSourceActive(
          combatantInfo,
          source,
          debuffLookup,
          buffLookup,
          timestamp,
        );
        if (isActive) {
          computedCriticalDamage += getCritDamageFromComputedSource(
            source,
            playerData,
            combatantInfo,
            buffLookup,
            debuffLookup,
            timestamp,
          );
        }
        break;
      case 'always_on':
        alwaysOnCriticalDamage += getCritDamageFromAlwaysOnSource(source, combatantInfo);
        break;
    }
  }

  return (
    baseCriticalDamage +
    gearCriticalDamage +
    auraCriticalDamage +
    computedCriticalDamage +
    buffCriticalDamage +
    debuffCriticalDamage +
    alwaysOnCriticalDamage
  );
}

export function calculateStaticCriticalDamage(combatantInfo: CombatantInfoEvent): number {
  const baseCriticalDamage = 50; // Base critical damage percentage

  let gearCriticalDamage = 0;
  let auraCriticalDamage = 0;
  let alwaysOnCriticalDamage = 0;

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
      case 'always_on':
        alwaysOnCriticalDamage += getCritDamageFromAlwaysOnSource(source, combatantInfo);
        break;
    }
  }

  return baseCriticalDamage + gearCriticalDamage + auraCriticalDamage + alwaysOnCriticalDamage;
}

export function calculateDynamicCriticalDamageAtTimestamp(
  buffLookup: BuffLookupData,
  debuffLookup: BuffLookupData,
  combatantInfo: CombatantInfoEvent,
  playerData: PlayerDetailsWithRole,
  timestamp: number,
): number {
  let buffCriticalDamage = 0;
  let debuffCriticalDamage = 0;
  let computedCriticalDamage = 0;
  let auraCriticalDamage = 0;

  for (const source of CRITICAL_DAMAGE_SOURCES) {
    let isActive = false;

    switch (source.source) {
      case 'aura':
        // All aura-based sources are static and handled in calculateStaticCriticalDamage
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

      case 'computed':
        isActive = isComputedSourceActive(
          combatantInfo,
          source,
          debuffLookup,
          buffLookup,
          timestamp,
        );
        if (isActive) {
          computedCriticalDamage += getCritDamageFromComputedSource(
            source,
            playerData,
            combatantInfo,
            buffLookup,
            debuffLookup,
            timestamp,
          );
        }
      // Skip other static sources - these are calculated once
    }
  }

  return auraCriticalDamage + buffCriticalDamage + debuffCriticalDamage + computedCriticalDamage;
}

export function getCritDamageFromComputedSource(
  source: CriticalDamageComputedSource,
  playerData: PlayerDetailsWithRole | undefined,
  combatantInfo: CombatantInfoEvent | null,
  buffLookup: BuffLookupData,
  debuffLookup?: BuffLookupData,
  timestamp?: number,
): number {
  if (playerData === undefined || combatantInfo === null) {
    return 0;
  }

  switch (source.key) {
    case ComputedCriticalDamageSources.FATED_FORTUNE:
      if (
        isBuffActiveOnTarget(
          buffLookup,
          KnownAbilities.FATED_FORTUNE_BUFF,
          timestamp,
          playerData.id,
        )
      ) {
        // Apply Fated Fortune bonus
        return CriticalDamageValues.FATED_FORTUNE;
      }
      return 0;
    case ComputedCriticalDamageSources.SUL_XAN_TORMENT: {
      // Check if player has 5 pieces of Sul-Xan's Torment equipped
      const hasFullSet = isGearSourceActive(combatantInfo, KnownSetIDs.SUL_XAN_TORMENT_SET, 5);
      return hasFullSet ? CriticalDamageValues.SUL_XAN_TORMENT : 0;
    }
    case ComputedCriticalDamageSources.MORA_SCRIBE_THESIS: {
      // Check if player has 5 pieces of Mora Scribe's Thesis equipped
      const hasFullMoraSet = isGearSourceActive(
        combatantInfo,
        KnownSetIDs.MORA_SCRIBE_THESIS_SET,
        5,
      );
      return hasFullMoraSet ? CriticalDamageValues.MORA_SCRIBE_THESIS : 0;
    }
    case ComputedCriticalDamageSources.HARPOONER_WADING_KILT: {
      // Check if player has Harpooner's Wading Kilt equipped
      const hasKilt = isGearSourceActive(combatantInfo, KnownSetIDs.HARPOONER_WADING_KILT_SET, 1);
      return hasKilt ? CriticalDamageValues.HARPOONER_WADING_KILT : 0;
    }
    case ComputedCriticalDamageSources.ADVANCED_SPECIES: {
      // Count Animal Companions abilities on front bar
      if (!playerData) return 0;
      const animalCompanionAbilities = playerData.combatantInfo.talents.slice(0, 6).filter((t) =>
        Object.values(wardenData.skillLines.animalCompanions.activeAbilities || {})
          .flatMap((ability) => {
            return [ability, ...Object.values(ability.morphs ?? {})];
          })
          .some((a) => a?.name === t.name),
      );
      return animalCompanionAbilities.length * CriticalDamageValues.ANIMAL_COMPANIONS_PER_ABILITY;
    }
    case ComputedCriticalDamageSources.DUAL_WIELD_AXES: {
      const axeCount = countAxesInWeaponSlots(combatantInfo);
      return axeCount * CriticalDamageValues.DUAL_WIELD_AXES;
    }
    case ComputedCriticalDamageSources.TWO_HANDED_BATTLE_AXE: {
      return hasTwoHandedAxeEquipped(combatantInfo)
        ? CriticalDamageValues.TWO_HANDED_BATTLE_AXE
        : 0;
    }
    case ComputedCriticalDamageSources.BACKSTABBER: {
      // Always active as requested
      return CriticalDamageValues.BACKSTABBER;
    }
    case ComputedCriticalDamageSources.ELEMENTAL_CATALYST: {
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
    case ComputedCriticalDamageSources.LUCENT_ECHOES: {
      return isLucentEchoesActive(combatantInfo, buffLookup, timestamp)
        ? CriticalDamageValues.LUCENT_ECHOES
        : 0;
    }
  }

  return 0;
}

export function getCritDamageFromAlwaysOnSource(
  source: CriticalDamageAlwaysOnSource,
  combatantInfo: CombatantInfoEvent | null,
): number {
  switch (source.key) {
    case AlwaysOnCriticalDamageSources.DEXTERITY: {
      const medPieces = combatantInfo?.gear?.filter((item) => item.type === ArmorType.MEDIUM);
      return (medPieces?.length || 0) * CriticalDamageValues.DEXTERITY_PER_PIECE;
    }
    case AlwaysOnCriticalDamageSources.FIGHTING_FINESSE: {
      return CriticalDamageValues.FIGHTING_FINESSE;
    }
  }
}
