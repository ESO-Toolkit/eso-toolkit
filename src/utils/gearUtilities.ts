import { CombatantInfoEvent } from '../types/combatlogEvents';
import { GearSlot, GearTrait, PlayerGear, WeaponType } from '../types/playerDetails';

const DOUBLE_SET_TYPES = Object.freeze(
  new Set([
    WeaponType.FROST_STAFF,
    WeaponType.INFERNO_STAFF,
    WeaponType.LIGHTNING_STAFF,
    WeaponType.RESO_STAFF,
    WeaponType.TWO_HANDED_SWORD,
  ])
);

export enum ItemQuality {
  LEGENDARY = 5,
  EPIC = 4,
  RARE = 3,
  UNCOMMON = 2,
  COMMON = 1,
}

export interface PlayerGearItemData {
  total: number;
  perfected: number;
  setID?: number;
  hasPerfected: boolean;
  hasRegular: boolean;
  baseDisplay: string;
}

export interface PlayerGearSetRecord {
  key: string;
  data: PlayerGearItemData;
  labelName: string;
  count: number;
  category: number;
  secondary: number;
  sortName: string;
}

export function isPerfectedGear(gear: PlayerGear): boolean {
  return gear.setName !== undefined && /^perfected\s+/i.test(gear.setName);
}

export function isDoubleSetCount(gear: PlayerGear, slot: number, allGear: PlayerGear[]): boolean {
  return (
    DOUBLE_SET_TYPES.has(gear.type as WeaponType) &&
    ((slot === GearSlot.MAIN_HAND && allGear[GearSlot.OFF_HAND].id === 0) ||
      (slot === GearSlot.BACKUP_MAIN_HAND && allGear[GearSlot.BACKUP_OFF_HAND].id === 0))
  );
}

// Utility function to count gear pieces for a given set ID
export const getSetCount = (gear: PlayerGear[] | undefined, setID: number): number => {
  if (gear === undefined) {
    return 0;
  }

  let totalPieces = 0;
  for (let i = 0; i < gear.length; i++) {
    const g = gear[i];

    if (g.setID === setID) {
      totalPieces++;

      if (isDoubleSetCount(g, i, gear)) {
        totalPieces++;
      }
    }
  }

  return totalPieces;
};

// Helpers for gear classification and chip coloring
export const normalizeGearName = (name?: string): string =>
  (name || '')
    .toLowerCase()
    .replace(/^perfected\s+/, '')
    .replace(/’/g, "'")
    .trim();

export const ARENA_SET_NAMES = Object.freeze(
  new Set(
    [
      // Maelstrom Arena
      'Crushing Wall',
      'Precise Regeneration',
      'Thunderous Volley',
      'Merciless Charge',
      'Cruel Flurry',
      'Rampaging Slash',
      // Dragonstar Arena (Master)
      'Destructive Impact',
      'Grand Rejuvenation',
      'Caustic Bow',
      'Titanic Cleave',
      'Stinging Slashes',
      'Puncturing Remedy',
      // Blackrose Prison
      'Wild Impulse',
      "Mender's Ward",
      'Mender’s Ward',
      'Virulent Shot',
      'Radial Uppercut',
      'Spectral Cloak',
      'Gallant Charge',
      // Asylum Sanctorium
      'Concentrated Force',
      'Timeless Blessing',
      'Piercing Spray',
      'Disciplined Slash',
      'Chaotic Whirlwind',
      'Defensive Position',
      // Vateshran Hollows
      'Wrath of Elements',
      'Frenzied Momentum',
      'Void Bash',
      "Executioner's Blade",
      'Point-Blank Snipe',
      'Force Overflow',
    ].map((n) => normalizeGearName(n))
  )
);

export const MYTHIC_SET_NAMES = Object.freeze(
  new Set(
    [
      "Bloodlord's Embrace",
      'Thrassian Stranglers',
      'Snow Treaders',
      'Ring of the Wild Hunt',
      "Malacath's Band of Brutality",
      'Torc of Tonal Constancy',
      'Ring of the Pale Order',
      'Pearls of Ehlnofey',
      'Gaze of Sithis',
      "Harpooner's Wading Kilt",
      "Death Dealer's Fete",
      "Shapeshifter's Chain",
      'Markyn Ring of Majesty',
      "Belharza's Band",
      'Spaulder of Ruin',
      "Lefthander's Aegis Belt",
      "Mora's Whispers",
      'Oakensoul Ring',
      "Sea-Serpent's Coil",
      'Dov-Rha Sabatons',
      "Faun's Lark Cladding",
      "Stormweaver's Cavort",
      "Syrabane's Ward",
      "Velothi Ur-Mage's Amulet",
      'Esoteric Environment Greaves',
      'Cryptcanon Vestments',
      'Torc of the Last Ayleid King',
      'Rourken Steamguards',
      "The Shadow Queen's Cowl",
      'The Saint and the Seducer',
    ].map((n) => normalizeGearName(n))
  )
);

// One-piece monster sets (purple); normalized substrings
export const MONSTER_ONE_PIECE_HINTS = Object.freeze(
  new Set(
    [
      'Anthelmir’s Construct',
      'Archdruid Devyric',
      'Balorgh',
      'Baron Thirsk',
      'Bloodspawn',
      'Chokethorn',
      'Domihaus',
      'Earthgore',
      'Encratis’s Behemoth',
      'Engine Guardian',
      'Euphotic Gatekeeper',
      'Galenwe’s Lament',
      'Glorgoloch the Destroyer',
      'Grundwulf',
      'Iceheart',
      'Ilambris',
      'Kjalnar’s Nightmare',
      'Lady Thorn',
      'Lady Malydga',
      'Lord Warden',
      'Maarselok',
      'Magma Incarnate',
      'Maw of the Infernal',
      'Mighty Chudan',
      'Molag Kena',
      'Mother Ciannait',
      'Nazaray',
      'Nerien’eth',
      'Nightflame',
      'Nobilis Eternus',
      'Ozezan the Inferno',
      'Pirate Skeleton',
      'Prior Thierric',
      'Roksa the Warped',
      'Saint Delyn',
      'Scourge Harvester',
      'Selene',
      'Sellistrix',
      'Sentinel of Rkugamz',
      'Shadowrend',
      'Slimecraw',
      'Spawn of Mephala',
      'Stonekeeper',
      'Stormfist',
      'Swarm Mother',
      'Thurvokun',
      'Tremorscale',
      'Troll King',
      'Valkyn Skoria',
      'Velidreth',
      'Vykosa',
      'Zaan',
      'Symphony of Blades',
    ].map((n) => normalizeGearName(n))
  )
);

// ========================================
// WEAPON TYPE CLASSIFICATION UTILITIES
// ========================================

/**
 * Helper function to determine if a weapon type is 1-handed
 */
export function isOneHandedWeapon(weaponType: WeaponType): boolean {
  const oneHandedTypes = [WeaponType.AXE, WeaponType.SWORD, WeaponType.DAGGER, WeaponType.MACE];
  return oneHandedTypes.includes(weaponType);
}

/**
 * Helper function to determine if a weapon type is 2-handed (excluding staves)
 */
export function isTwoHandedWeapon(weaponType: WeaponType): boolean {
  const twoHandedTypes = [WeaponType.TWO_HANDED_SWORD, WeaponType.TWO_HANDED_AXE, WeaponType.MAUL];
  return twoHandedTypes.includes(weaponType);
}

/**
 * Helper function to determine if a weapon type is a staff (2-handed magical weapon)
 */
export function isStaff(weaponType: WeaponType): boolean {
  const staffTypes = [
    WeaponType.INFERNO_STAFF,
    WeaponType.FROST_STAFF,
    WeaponType.LIGHTNING_STAFF,
    WeaponType.RESO_STAFF,
  ];
  return staffTypes.includes(weaponType);
}

/**
 * Helper function to determine if a weapon type is any 2-handed weapon (including staves)
 */
export function isAnyTwoHandedWeapon(weaponType: WeaponType): boolean {
  return isTwoHandedWeapon(weaponType) || isStaff(weaponType);
}

// ========================================
// GEAR ANALYSIS UTILITIES
// ========================================

/**
 * Count 1H weapons with sharpened trait across all weapon slots
 */
export function countOneHandedSharpenedWeapons(combatantInfo: CombatantInfoEvent): number {
  if (!combatantInfo.gear) return 0;

  let count = 0;
  const weaponSlots = [
    GearSlot.MAIN_HAND,
    GearSlot.OFF_HAND,
    GearSlot.BACKUP_MAIN_HAND,
    GearSlot.BACKUP_OFF_HAND,
  ];

  for (const slotIndex of weaponSlots) {
    if (slotIndex < combatantInfo.gear.length) {
      const weapon = combatantInfo.gear[slotIndex];
      if (
        weapon &&
        weapon.id !== 0 &&
        isOneHandedWeapon(weapon.type as WeaponType) &&
        weapon.trait === GearTrait.SHARPENED
      ) {
        count++;
      }
    }
  }

  return count;
}

/**
 * Check if any 2H weapon (excluding staves) has sharpened trait
 */
export function hasTwoHandedSharpenedWeapon(combatantInfo: CombatantInfoEvent): boolean {
  if (!combatantInfo.gear) return false;

  const mainHandSlots = [GearSlot.MAIN_HAND, GearSlot.BACKUP_MAIN_HAND];

  for (const slotIndex of mainHandSlots) {
    if (slotIndex < combatantInfo.gear.length) {
      const weapon = combatantInfo.gear[slotIndex];
      if (
        weapon &&
        weapon.id !== 0 &&
        isTwoHandedWeapon(weapon.type as WeaponType) &&
        weapon.trait === GearTrait.SHARPENED
      ) {
        return true;
      }
    }
  }

  return false;
}

/**
 * Count axes (1H) in all weapon slots for dual wield critical damage bonuses
 */
export function countAxesInWeaponSlots(combatantInfo: CombatantInfoEvent | null): number {
  if (!combatantInfo || !combatantInfo.gear) return 0;

  let axeCount = 0;

  // Check main hand, off hand, backup main hand, and backup off hand slots
  // The gear array is indexed by slot number
  const weaponSlotIndices = [
    GearSlot.MAIN_HAND,
    GearSlot.OFF_HAND,
    GearSlot.BACKUP_MAIN_HAND,
    GearSlot.BACKUP_OFF_HAND,
  ];

  for (const slotIndex of weaponSlotIndices) {
    if (slotIndex < combatantInfo.gear.length) {
      const weapon = combatantInfo.gear[slotIndex];
      if (
        weapon &&
        (weapon.type === WeaponType.AXE || weapon.type === WeaponType.TWO_HANDED_AXE) &&
        weapon.id !== 0
      ) {
        axeCount++;
      }
    }
  }

  return axeCount;
}

/**
 * Check if a two-handed axe is equipped in main hand or backup main hand
 */
export function hasTwoHandedAxeEquipped(combatantInfo: CombatantInfoEvent | null): boolean {
  if (!combatantInfo || !combatantInfo.gear) return false;

  // Check main hand and backup main hand slots for two-handed axes
  const mainHandSlots = [GearSlot.MAIN_HAND, GearSlot.BACKUP_MAIN_HAND];

  for (const slotIndex of mainHandSlots) {
    if (slotIndex < combatantInfo.gear.length) {
      const weapon = combatantInfo.gear[slotIndex];
      if (weapon && weapon.type === WeaponType.TWO_HANDED_AXE && weapon.id !== 0) {
        return true;
      }
    }
  }

  return false;
}

/**
 * Check if a two-handed maul is equipped in main hand or backup main hand
 */
export function hasTwoHandedMaulEquipped(combatantInfo: CombatantInfoEvent | null): boolean {
  if (!combatantInfo || !combatantInfo.gear) return false;

  // Check main hand and backup main hand slots for two-handed mauls
  const mainHandSlots = [GearSlot.MAIN_HAND, GearSlot.BACKUP_MAIN_HAND];

  for (const slotIndex of mainHandSlots) {
    if (slotIndex < combatantInfo.gear.length) {
      const weapon = combatantInfo.gear[slotIndex];
      if (weapon && weapon.type === WeaponType.MAUL && weapon.id !== 0) {
        return true;
      }
    }
  }

  return false;
}

/**
 * Count dual wield weapons (1H weapons in main hand and off hand simultaneously)
 * Twin Blade and Blunt passive provides penetration per dual wield weapon equipped
 */
export function countDualWieldWeapons(combatantInfo: CombatantInfoEvent | null): number {
  if (!combatantInfo || !combatantInfo.gear) return 0;

  let count = 0;

  // Check main hand + off hand combination
  const mainHandSlots = [
    { main: GearSlot.MAIN_HAND, off: GearSlot.OFF_HAND },
    { main: GearSlot.BACKUP_MAIN_HAND, off: GearSlot.BACKUP_OFF_HAND },
  ];

  for (const { main, off } of mainHandSlots) {
    if (main < combatantInfo.gear.length && off < combatantInfo.gear.length) {
      const mainHandWeapon = combatantInfo.gear[main];
      const offHandWeapon = combatantInfo.gear[off];

      // Check if we have 1H weapons in both slots
      if (
        mainHandWeapon &&
        mainHandWeapon.id !== 0 &&
        isOneHandedWeapon(mainHandWeapon.type as WeaponType) &&
        offHandWeapon &&
        offHandWeapon.id !== 0 &&
        isOneHandedWeapon(offHandWeapon.type as WeaponType)
      ) {
        // Count both weapons in the dual wield setup
        count += 2;
      }
    }
  }

  return count;
}

/**
 * Count potential maces in weapon slots for Twin Blade and Blunt passive
 * This is specifically for the "per mace equipped" description
 */
export function countMacesInWeaponSlots(combatantInfo: CombatantInfoEvent | null): number {
  if (!combatantInfo || !combatantInfo.gear) return 0;

  let maceCount = 0;

  // Check all weapon slots for potential maces
  const weaponSlots = [
    GearSlot.MAIN_HAND,
    GearSlot.OFF_HAND,
    GearSlot.BACKUP_MAIN_HAND,
    GearSlot.BACKUP_OFF_HAND,
  ];

  for (const slotIndex of weaponSlots) {
    if (slotIndex < combatantInfo.gear.length) {
      const weapon = combatantInfo.gear[slotIndex];
      if (weapon && weapon.id !== 0 && weapon.type === WeaponType.MACE) {
        maceCount++;
      }
    }
  }

  return maceCount;
}
