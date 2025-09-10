import type { GearSetTooltipProps, GearSetBonus } from '../components/GearSetTooltip';
import * as arenaSpecialSets from '../data/Gear Sets/arena-specials';
import * as heavySets from '../data/Gear Sets/heavy';
import * as lightSets from '../data/Gear Sets/light';
import * as monsterSets from '../data/Gear Sets/monster';
import * as mythicSets from '../data/Gear Sets/mythics';
import * as sharedSets from '../data/Gear Sets/shared';

import type { PlayerGearSetRecord } from './gearUtilities';

// Create a normalized name lookup map
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const GEAR_SET_REGISTRY = new Map<string, any>();

// Helper function to normalize gear set names for lookup
const normalizeGearSetName = (name: string): string => {
  return name
    .toLowerCase()
    .replace(/^perfected\s+/, '')
    .replace(/['']/g, "'")
    .replace(/[^\w\s']/g, '')
    .replace(/\s+/g, ' ')
    .trim();
};

// Helper function to extract set name from skillset data
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const getSetNameFromSkillset = (skillsetData: any): string => {
  const skillLines = skillsetData.skillLines;
  if (!skillLines) return '';

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const firstSkillLine = Object.values(skillLines)[0] as any;
  return firstSkillLine?.name || '';
};

// Populate the registry with all gear sets
const populateGearSetRegistry = (): void => {
  const allSets = [
    ...Object.values(lightSets),
    ...Object.values(heavySets),
    ...Object.values(monsterSets),
    ...Object.values(mythicSets),
    ...Object.values(arenaSpecialSets),
    ...Object.values(sharedSets),
  ];

  allSets.forEach((setData) => {
    const setName = getSetNameFromSkillset(setData);
    if (setName) {
      const normalizedName = normalizeGearSetName(setName);
      GEAR_SET_REGISTRY.set(normalizedName, setData);
    }
  });
};

// Initialize the registry
populateGearSetRegistry();

// Helper function to determine armor type from gear set data
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const getArmorTypeFromSetData = (setData: any): string => {
  return setData.weapon || 'Unknown';
};

// Helper function to get category badge
const getCategoryBadge = (setName: string, armorType: string): string => {
  const normalizedName = normalizeGearSetName(setName);

  // Check for mythic sets
  if (
    Object.values(mythicSets).some(
      (set) => normalizeGearSetName(getSetNameFromSkillset(set)) === normalizedName,
    )
  ) {
    return 'Mythic';
  }

  // Check for monster sets
  if (
    Object.values(monsterSets).some(
      (set) => normalizeGearSetName(getSetNameFromSkillset(set)) === normalizedName,
    )
  ) {
    return 'Monster Set';
  }

  // Check for arena sets
  if (
    Object.values(arenaSpecialSets).some(
      (set) => normalizeGearSetName(getSetNameFromSkillset(set)) === normalizedName,
    )
  ) {
    return 'Arena';
  }

  return armorType;
};

// Convert skillset passives to gear set bonuses
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const convertPassivesToBonuses = (passives: any[], equippedCount: number): GearSetBonus[] => {
  if (!passives) return [];

  return passives.map((passive) => {
    const pieces = passive.name || '';
    const effect = passive.description || '';
    const requirement = passive.requirement || undefined;

    // Determine if this bonus is active based on equipped count
    const pieceMatch = pieces.match(/\((\d+)\s*items?\)/i);
    const requiredPieces = pieceMatch ? parseInt(pieceMatch[1], 10) : 0;
    const active = equippedCount >= requiredPieces;

    return {
      pieces,
      effect,
      requirement: requirement || undefined,
      active,
    };
  });
};

/**
 * Create gear set tooltip props from a PlayerGearSetRecord
 */
export function createGearSetTooltipProps(
  gearRecord: PlayerGearSetRecord,
): GearSetTooltipProps | null {
  const setName = gearRecord.labelName;
  const normalizedName = normalizeGearSetName(setName);
  const setData = GEAR_SET_REGISTRY.get(normalizedName);

  if (!setData) {
    // Return a basic tooltip if we don't have detailed data
    return {
      headerBadge: 'Unknown Set',
      setName: setName,
      setBonuses: [
        {
          pieces: `(${gearRecord.count} items)`,
          effect: 'Set bonuses unknown',
          active: true,
        },
      ],
      itemCount: `${gearRecord.count}`,
    };
  }

  const armorType = getArmorTypeFromSetData(setData);
  const skillLines = setData.skillLines;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const firstSkillLine = Object.values(skillLines)[0] as any;
  const passives = firstSkillLine?.passives || [];

  const setBonuses = convertPassivesToBonuses(passives, gearRecord.count);

  return {
    headerBadge: getCategoryBadge(setName, armorType),
    setName: setName,
    setBonuses,
    itemCount: `${gearRecord.count}`,
    // Could add lore/description here if available
  };
}

/**
 * Get gear set tooltip props by name (for cases where we only have the set name)
 */
export function getGearSetTooltipPropsByName(
  setName: string,
  equippedCount = 0,
): GearSetTooltipProps | null {
  const normalizedName = normalizeGearSetName(setName);
  const setData = GEAR_SET_REGISTRY.get(normalizedName);

  if (!setData) {
    return null;
  }

  const armorType = getArmorTypeFromSetData(setData);
  const skillLines = setData.skillLines;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const firstSkillLine = Object.values(skillLines)[0] as any;
  const passives = firstSkillLine?.passives || [];

  const setBonuses = convertPassivesToBonuses(passives, equippedCount);

  return {
    headerBadge: getCategoryBadge(setName, armorType),
    setName: setName,
    setBonuses,
    itemCount: equippedCount > 0 ? `${equippedCount}` : undefined,
  };
}
