import { CombatantGear } from '../types/combatlogEvents';
import { GearSlot, GearType, PlayerGear } from '../types/playerDetails';

const DOUBLE_SET_TYPES = Object.freeze(
  new Set([
    GearType.FROST_STAFF,
    GearType.INFERNO_STAFF,
    GearType.LIGHTNING_STAFF,
    GearType.RESO_STAFF,
    GearType.JEWELRY_OR_TWO_HANDED_SWORD,
  ])
);

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

export function isDoubleSetCount(
  gear: CombatantGear | PlayerGear,
  slot: number,
  allGear: (CombatantGear | PlayerGear)[]
): boolean {
  return (
    DOUBLE_SET_TYPES.has(gear.type) &&
    ((slot === GearSlot.MAIN_HAND && allGear[GearSlot.OFF_HAND].id === 0) ||
      (slot === GearSlot.BACKUP_MAIN_HAND && allGear[GearSlot.BACKUP_OFF_HAND].id === 0))
  );
}

// Utility function to count gear pieces for a given set ID
export const getSetCount = (
  gear: (CombatantGear | PlayerGear)[] | undefined,
  setID: number
): number => {
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
