import { PlayerDetailsWithRole } from '../store/player_data/playerDataSlice';
import { KnownAbilities, KnownSetIDs, PenetrationValues } from '../types/abilities';
import { CombatantInfoEvent, CombatantGear, CombatantAura } from '../types/combatlogEvents';

import { BuffLookupData, isBuffActive as isBuffActiveAtTimestamp } from './BuffLookupUtils';
import { getSetCount } from './gearUtilities';

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
  key: string;
  source: 'computed';
}

export type PenetrationSource =
  | PenetrationAuraSource
  | PenetrationGearSource
  | PenetrationBuffSource
  | PenetrationDebuffSource
  | PenetrationComputedSource;

export interface PenetrationSourceWithActiveState {
  name: string;
  description: string;
  value: number;
  wasActive: boolean;
}

export const PENETRATION_SOURCES = Object.freeze<PenetrationSource[]>([
  // Gear-based sources
  {
    value: PenetrationValues.ANSUULS_TORMENT_4_PIECE,
    set: KnownSetIDs.ANSUULS_TORMENT_SET,
    numberOfPieces: 4,
    name: "Ansuul's Torment (4-piece)",
    description: '4-piece set bonus providing 1487 penetration',
    source: 'gear',
  },
  {
    value: PenetrationValues.TIDEBORN_WILDSTALKER_4_PIECE,
    set: KnownSetIDs.TIDEBORN_WILDSTALKER_SET,
    numberOfPieces: 4,
    name: 'Tide-born Wildstalker (4-piece)',
    description: '4-piece set bonus providing 1487 penetration',
    source: 'gear',
  },
  // Aura-based sources (passive abilities, mythic items, etc.)
  {
    value: PenetrationValues.VELOTHI_UR_MAGE_AMULET,
    ability: KnownAbilities.VELOTHI_UR_MAGE_BUFF,
    name: "Velothi Ur-Mage's Amulet",
    description: 'Mythic amulet buff providing flat penetration',
    source: 'aura',
  },
  // Computed sources (dynamic values based on gear or abilities)
  {
    key: 'concentration',
    name: 'Concentration (Light Armor)',
    description: '939 penetration per light armor piece worn',
    source: 'computed',
  },
  {
    key: 'splintered_secrets',
    name: 'Splintered Secrets (Herald of the Tome)',
    description: '620 penetration per stack per Herald ability slotted',
    source: 'computed',
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
    ability: KnownAbilities.RUNIC_SUNDER,
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
    case 'concentration':
      if (!combatantInfo || !combatantInfo.auras || !combatantInfo.gear) return false;
      return combatantInfo.auras.some(
        (aura: CombatantAura) =>
          aura.ability === KnownAbilities.CONCENTRATION || aura.name?.includes('Concentration')
      );
    case 'splintered_secrets':
      if (!combatantInfo || !combatantInfo.auras || !playerData) return false;
      const splinteredSecretsAuras = combatantInfo.auras.filter(
        (aura: CombatantAura) =>
          aura.ability === KnownAbilities.SPLINTERED_SECRETS ||
          aura.ability === 184885 || // Alternative Splintered Secrets ID
          aura.name?.includes('Splintered Secrets')
      );
      return splinteredSecretsAuras.length > 0;
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
    case 'concentration':
      if (!combatantInfo || !combatantInfo.auras || !combatantInfo.gear) return 0;
      const hasConcentration = combatantInfo.auras.some(
        (aura: CombatantAura) =>
          aura.ability === KnownAbilities.CONCENTRATION || aura.name?.includes('Concentration')
      );
      if (!hasConcentration) return 0;
      const lightArmorCount =
        combatantInfo.gear?.filter((gear: CombatantGear) => gear.type === 1).length || 0;
      return lightArmorCount * PenetrationValues.CONCENTRATION_PER_PIECE;

    case 'splintered_secrets':
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
  targetId: number | null
): number {
  let buffPenetration = 0;
  let debuffPenetration = 0;

  for (const source of PENETRATION_SOURCES) {
    let isActive = false;

    switch (source.source) {
      case 'buff':
        isActive = buffLookup
          ? isBuffActiveAtTimestamp(buffLookup, source.ability, timestamp)
          : false;
        if (isActive) {
          buffPenetration += source.value;
        }
        break;
      case 'debuff':
        isActive = debuffLookup
          ? isBuffActiveAtTimestamp(debuffLookup, source.ability, timestamp)
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
  targetId: number | null
): number {
  const staticPenetration = calculateStaticPenetration(combatantInfo, playerData);
  const dynamicPenetration = calculateDynamicPenetrationAtTimestamp(
    buffLookup,
    debuffLookup,
    timestamp,
    targetId
  );

  return staticPenetration + dynamicPenetration;
}
