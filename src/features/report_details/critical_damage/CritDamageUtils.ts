import { arcanistData } from '../../../data/skillsets/arcanist';
import { PlayerDetailsWithRole } from '../../../store/player_data/playerDataSlice';
import { CriticalDamageValues, KnownAbilities, KnownSetIDs } from '../../../types/abilities';
import { CombatantInfoEvent } from '../../../types/combatlogEvents';
import { GearType } from '../../../types/playerDetails';
import { getSetCount } from '../../../utils/gearUtilities';

import { BuffLookupData, isBuffActive as checkBuffActiveAtTimestamp } from './BuffLookupUtils';

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
    ability: KnownAbilities.ADVANCED_SPECIES,
    value: CriticalDamageValues.ADVANCED_SPECIES,
    name: 'Advanced Species',
    description: 'Critical damage from Advanced Species passive',
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
    ability: KnownAbilities.MINOR_BRITTLE,
    value: CriticalDamageValues.MINOR_BRITTLE,
    name: 'Minor Brittle',
    description: 'Critical damage from Minor Brittle debuff',
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
  source: CriticalDamageComputedSource
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
        isActive = isComputedSourceActive(combatantInfo, source);
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
        wasActive = isComputedSourceActive(combatantInfo, source);
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
        isActive = isComputedSourceActive(combatantInfo, source);
        if (isActive) {
          computedCriticalDamage += getCritDamageFromComputedSource(
            source,
            playerData,
            combatantInfo
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
  playerData: PlayerDetailsWithRole | undefined
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
        isActive = isComputedSourceActive(combatantInfo, source);
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
  combatantInfo: CombatantInfoEvent | null
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
      const mediumGear = combatantInfo.gear?.filter((item) => item.type === GearType.MEDIUM);
      return mediumGear.length * CriticalDamageValues.DEXTERITY_PER_PIECE;
    case ComputedCriticalDamageSources.FIGHTING_FINESSE:
      return CriticalDamageValues.FIGHTING_FINESSE;
  }
}
