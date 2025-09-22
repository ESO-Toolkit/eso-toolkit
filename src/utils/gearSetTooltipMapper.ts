import type {
  GearSetTooltipProps,
  GearSetBonus,
  GearPieceInfo,
} from '../components/GearSetTooltip';
import * as arenaSets from '../data/Gear Sets/arena';
import * as arenaSpecialSets from '../data/Gear Sets/arena-specials';
import * as heavySets from '../data/Gear Sets/heavy';
import * as lightSets from '../data/Gear Sets/light';
import * as mediumSets from '../data/Gear Sets/medium';
import * as monsterSets from '../data/Gear Sets/monster';
import * as mythicSets from '../data/Gear Sets/mythics';
import * as sharedSets from '../data/Gear Sets/shared';
import type { PlayerGear } from '../types/playerDetails';

import type { PlayerGearSetRecord } from './gearUtilities';

// Create a normalized name lookup map
const GEAR_SET_REGISTRY = new Map<string, unknown>();

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

// Helper function to extract set name from gear set data (handles both old and new formats)
interface UnknownGearSet {
  name?: string;
  setType?: string;
  bonuses?: string[];
  skillLines?: Record<string, { name?: string }>;
  weapon?: string;
}

const getSetNameFromGearSet = (gearSet: unknown): string => {
  const setData = gearSet as UnknownGearSet;

  // Check if it's the new format
  if (setData?.name && setData?.setType && setData?.bonuses) {
    return setData.name;
  }

  // Check if it's the old SkillsetData format
  if (setData?.skillLines) {
    const skillLines = setData.skillLines;
    const firstSkillLine = Object.values(skillLines)[0];
    return firstSkillLine?.name || '';
  }

  return '';
};

// Populate the registry with all gear sets
const populateGearSetRegistry = (): void => {
  const allSets = [
    ...Object.values(lightSets),
    ...Object.values(heavySets),
    ...Object.values(mediumSets),
    ...Object.values(monsterSets),
    ...Object.values(mythicSets),
    ...Object.values(arenaSpecialSets),
    ...Object.values(arenaSets),
    ...Object.values(sharedSets),
  ];

  allSets.forEach((setData) => {
    const setName = getSetNameFromGearSet(setData);
    if (setName) {
      const normalizedName = normalizeGearSetName(setName);
      GEAR_SET_REGISTRY.set(normalizedName, setData);
    }
  });
};

// Initialize the registry
populateGearSetRegistry();

// Helper function to determine set type from gear set data (handles both old and new formats)
const getSetTypeFromGearSet = (gearSet: unknown): string => {
  const setData = gearSet as UnknownGearSet;

  // Check if it's the new format
  if (setData?.name && setData?.setType && setData?.bonuses) {
    return setData.setType;
  }

  // Check if it's the old SkillsetData format with weapon property
  if (setData?.weapon) {
    return setData.weapon;
  }

  return 'Unknown';
};

// Helper function to get category badge
const getCategoryBadge = (setName: string, setType: string): string => {
  // For new format, use the setType directly
  if (setType === 'Mythic') return 'Mythic';
  if (setType === 'Monster Set') return 'Monster Set';
  if (setType === 'Arena') return 'Arena';
  if (setType === 'Dungeon') return 'Dungeon';
  if (setType === 'Overland') return 'Overland';
  if (setType === 'Trial') return 'Trial';
  if (setType === 'Craftable') return 'Craftable';
  if (setType === 'PvP') return 'PvP';
  if (setType === 'Class Sets') return 'Class Set';

  // Fallback to checking old format sets
  const normalizedName = normalizeGearSetName(setName);

  // Check for mythic sets
  if (
    Object.values(mythicSets).some(
      (set) => normalizeGearSetName(getSetNameFromGearSet(set)) === normalizedName,
    )
  ) {
    return 'Mythic';
  }

  // Check for monster sets
  if (
    Object.values(monsterSets).some(
      (set) => normalizeGearSetName(getSetNameFromGearSet(set)) === normalizedName,
    )
  ) {
    return 'Monster Set';
  }

  // Check for arena sets
  if (
    Object.values(arenaSpecialSets).some(
      (set) => normalizeGearSetName(getSetNameFromGearSet(set)) === normalizedName,
    ) ||
    Object.values(arenaSets).some(
      (set) => normalizeGearSetName(getSetNameFromGearSet(set)) === normalizedName,
    )
  ) {
    return 'Arena';
  }

  return setType;
};

// Convert skillset passives to gear set bonuses (old format)
const convertPassivesToBonuses = (passives: unknown[], equippedCount: number): GearSetBonus[] => {
  if (!passives) return [];

  return passives.map((passive) => {
    const passiveObj = passive as { name?: string; description?: string; requirement?: string };
    const pieces = passiveObj.name || '';
    const effect = passiveObj.description || '';
    const requirement = passiveObj.requirement || undefined;

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

// Convert gear set bonuses to tooltip format (new format)
const convertBonusesToTooltipFormat = (
  bonuses: string[],
  equippedCount: number,
): GearSetBonus[] => {
  if (!bonuses) return [];

  return bonuses.map((bonus) => {
    // Extract the piece count from the bonus string
    const pieceMatch = bonus.match(/\((\d+)\s*items?\)/i);
    const pieces = pieceMatch ? pieceMatch[0] : bonus.split(' ')[0] || '(1 item)';

    // Extract the effect description
    const effect = bonus.replace(/\(\d+\s*items?\)\s*/i, '').trim();

    // Determine if this bonus is active based on equipped count
    const requiredPieces = pieceMatch ? parseInt(pieceMatch[1], 10) : 1;
    const active = equippedCount >= requiredPieces;

    return {
      pieces,
      effect,
      active,
    };
  });
};

/**
 * Create gear set tooltip props from a PlayerGearSetRecord and player gear data
 */
export function createGearSetTooltipProps(
  gearRecord: PlayerGearSetRecord,
  playerGear?: PlayerGear[],
): GearSetTooltipProps | null {
  const setName = gearRecord.labelName;
  const normalizedName = normalizeGearSetName(setName);
  const registryData = GEAR_SET_REGISTRY.get(normalizedName);

  if (!registryData) {
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

  const setData = registryData as UnknownGearSet;
  const setType = getSetTypeFromGearSet(setData);

  // Handle both old and new formats for bonuses
  let setBonuses: GearSetBonus[];
  let iconUrl: string | undefined;
  let gearPieces: GearPieceInfo[] = [];

  if (setData.bonuses && Array.isArray(setData.bonuses)) {
    // New format
    setBonuses = convertBonusesToTooltipFormat(setData.bonuses as string[], gearRecord.count);

    // Find individual gear pieces for this set
    const setGearPieces =
      playerGear?.filter((gear) => gear.setID === gearRecord.data.setID && gear.id !== 0) || [];

    // Create detailed gear piece information
    gearPieces = setGearPieces.map((gear) => ({
      id: gear.id,
      name: gear.name || 'Unknown Item',
      icon: gear.icon,
      slot: gear.slot,
      quality: gear.quality,
      championPoints: gear.championPoints,
      trait: gear.trait,
      enchantType: gear.enchantType,
      enchantQuality: gear.enchantQuality,
      encodedIconUrl: `https://assets.rpglogs.com/img/eso/abilities/${encodeURIComponent(gear.icon)}.png`,
    }));

    // Use the first gear icon as the main icon, or undefined if no gear pieces
    iconUrl = gearPieces.length > 0 ? gearPieces[0].encodedIconUrl : undefined;
  } else if (setData.skillLines) {
    // Old format (SkillsetData)
    const skillLines = setData.skillLines;
    const firstSkillLine = Object.values(skillLines)[0] as { passives?: unknown[] };
    const passives = firstSkillLine?.passives || [];
    setBonuses = convertPassivesToBonuses(passives, gearRecord.count);
    iconUrl = undefined; // Old format doesn't have icons

    // For old format, try to find gear pieces by set name matching
    const setGearPieces =
      playerGear?.filter(
        (gear) => gear.id !== 0 && gear.name?.toLowerCase().includes(setName.toLowerCase()),
      ) || [];

    gearPieces = setGearPieces.map((gear) => ({
      id: gear.id,
      name: gear.name || 'Unknown Item',
      icon: gear.icon,
      slot: gear.slot,
      quality: gear.quality,
      championPoints: gear.championPoints,
      trait: gear.trait,
      enchantType: gear.enchantType,
      enchantQuality: gear.enchantQuality,
      encodedIconUrl: `https://assets.rpglogs.com/img/eso/abilities/${encodeURIComponent(gear.icon)}.png`,
    }));
  } else {
    // Fallback
    setBonuses = [];
    iconUrl = undefined;
    gearPieces = [];
  }

  return {
    headerBadge: getCategoryBadge(setName, setType),
    setName: setName,
    setBonuses,
    itemCount: `${gearRecord.count}`,
    iconUrl,
    gearPieces,
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
  const registryData = GEAR_SET_REGISTRY.get(normalizedName);

  if (!registryData) {
    return null;
  }

  const setData = registryData as UnknownGearSet;
  const setType = getSetTypeFromGearSet(setData);

  // Handle both old and new formats for bonuses
  let setBonuses: GearSetBonus[];
  let iconUrl: string | undefined;
  let gearPieces: GearPieceInfo[] = [];

  if (setData.bonuses && Array.isArray(setData.bonuses)) {
    // New format
    setBonuses = convertBonusesToTooltipFormat(setData.bonuses as string[], equippedCount);
    // Gear sets don't have individual icons like gear items do
    iconUrl = undefined;
  } else if (setData.skillLines) {
    // Old format (SkillsetData)
    const skillLines = setData.skillLines;
    const firstSkillLine = Object.values(skillLines)[0] as { passives?: unknown[] };
    const passives = firstSkillLine?.passives || [];
    setBonuses = convertPassivesToBonuses(passives, equippedCount);
    iconUrl = undefined; // Old format doesn't have icons
  } else {
    // Fallback
    setBonuses = [];
    iconUrl = undefined;
    gearPieces = [];
  }

  return {
    headerBadge: getCategoryBadge(setName, setType),
    setName: setName,
    setBonuses,
    itemCount: equippedCount > 0 ? `${equippedCount}` : undefined,
    iconUrl,
    gearPieces,
  };
}
