export interface PlayerSpec {
  spec: string;
  count: number;
}

export interface PlayerTalent {
  name: string;
  guid: number;
  type: number;
  abilityIcon: string;
  flags: number;
}

export enum GearSlot {
  HEAD = 0,
  CHEST = 1,
  SHOULDERS = 2,
  WAIST = 3,
  HANDS = 4,
  LEGS = 5,
  FEET = 6,
  NECK = 7,
  RING1 = 8,
  RING2 = 9,
  MAIN_HAND = 10,
  OFF_HAND = 11,
  BACKUP_MAIN_HAND = 12,
  BACKUP_OFF_HAND = 13,
}

export enum ArmorType {
  LIGHT = 1,
  MEDIUM = 2,
  HEAVY = 3,
  JEWELRY = 4,
}

export enum WeaponType {
  AXE = 1,
  MACE = 2,
  SWORD = 3,
  TWO_HANDED_SWORD = 4,
  TWO_HANDED_AXE = 5,
  MAUL = 6,
  RESO_STAFF = 9,
  DAGGER = 11,
  INFERNO_STAFF = 12,
  FROST_STAFF = 13,
  SHIELD = 14,
  LIGHTNING_STAFF = 15,
}

export type GearType = WeaponType | ArmorType;

export enum GearTrait {
  SHARPENED = 32,
}

export interface PlayerGear {
  id: number;
  slot: number;
  quality: number;
  icon: string;
  name?: string;
  championPoints: number;
  trait: GearTrait;
  enchantType: number;
  enchantQuality: number;
  setID: number;
  type: GearType;
  setName?: string;
  flags?: number;
}

export interface CombatantInfo {
  stats: number[];
  talents: PlayerTalent[];
  gear: PlayerGear[];
}

export interface PlayerDetailsEntry {
  name: string;
  id: number;
  guid: number;
  type: string;
  server: string;
  displayName: string;
  anonymous: boolean;
  icon: string;
  specs: PlayerSpec[];
  minItemLevel?: number;
  maxItemLevel?: number;
  potionUse: number;
  healthstoneUse: number;
  combatantInfo: CombatantInfo;
}

export interface PlayerDetails {
  dps: PlayerDetailsEntry[];
  healers: PlayerDetailsEntry[];
  tanks: PlayerDetailsEntry[];
}
