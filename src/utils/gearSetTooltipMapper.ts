import type {
  GearSetTooltipProps,
  GearSetBonus,
  GearPieceInfo,
} from '../components/GearSetTooltip';
import * as arenaSets from '../data/Gear Sets/arena';
import { arenaSpecialGearSets, monsterGearSets } from '../data/Gear Sets/legacyAdapters';
import * as heavySets from '../data/Gear Sets/heavy';
import * as lightSets from '../data/Gear Sets/light';
import * as mediumSets from '../data/Gear Sets/medium';
import * as mythicSets from '../data/Gear Sets/mythics';
import * as sharedSets from '../data/Gear Sets/shared';
import type { PlayerGear } from '../types/playerDetails';
import type { GearSetData } from '../types/gearSet';

import type { PlayerGearSetRecord } from './gearUtilities';

// Create a normalized name lookup map
const GEAR_SET_REGISTRY = new Map<string, GearSetData>();

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

// Populate the registry with all gear sets
const populateGearSetRegistry = (): void => {
  const allSets = [
    ...Object.values(lightSets),
    ...Object.values(heavySets),
    ...Object.values(mediumSets),
    ...Object.values(monsterGearSets),
    ...Object.values(mythicSets),
    ...Object.values(arenaSpecialGearSets),
    ...Object.values(arenaSets),
    ...Object.values(sharedSets),
  ];

  allSets.forEach((setData) => {
    if (!setData || typeof setData !== 'object') {
      return;
    }

    const setName = (setData as GearSetData).name;
    if (typeof setName !== 'string') {
      return;
    }

    const normalizedName = normalizeGearSetName(setName);
    GEAR_SET_REGISTRY.set(normalizedName, setData as GearSetData);
  });
};

// Initialize the registry
populateGearSetRegistry();

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

  return setType;
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

  const setData = registryData;
  const setType = setData.setType || 'Unknown';

  // Handle both old and new formats for bonuses
  const setBonuses = convertBonusesToTooltipFormat(setData.bonuses, gearRecord.count);

  const setGearPieces =
    playerGear?.filter((gear) => gear.setID === gearRecord.data.setID && gear.id !== 0) || [];

  const gearPieces: GearPieceInfo[] = setGearPieces.map((gear) => ({
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

  const iconUrl = gearPieces.length > 0 ? gearPieces[0].encodedIconUrl : undefined;

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

  const setData = registryData;
  const setType = setData.setType || 'Unknown';
  const setBonuses = convertBonusesToTooltipFormat(setData.bonuses, equippedCount);

  return {
    headerBadge: getCategoryBadge(setName, setType),
    setName: setName,
    setBonuses,
    itemCount: equippedCount > 0 ? `${equippedCount}` : undefined,
    iconUrl: undefined,
    gearPieces: [],
  };
}
