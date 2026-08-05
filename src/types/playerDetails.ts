import { ItemQuality } from '@/utils/gearUtilities';

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

/**
 * Armor weight codes as reported by ESO Logs. Named constants for comparison
 * only — see the note on {@link GearType}; not an exhaustive domain.
 */
export enum ArmorType {
  LIGHT = 1,
  MEDIUM = 2,
  HEAVY = 3,
  JEWELRY = 4,
}

/**
 * Weapon type codes as reported by ESO Logs. Named constants for comparison
 * only — see the note on {@link GearType}; not an exhaustive domain.
 *
 * NOTE: these values overlap ArmorType numerically (AXE=1=LIGHT,
 * TWO_HANDED_SWORD=4=JEWELRY), so callers must gate on the gear slot before
 * interpreting a type code — see `isBodyArmorSlot` / `isWeaponSlot`.
 */
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

/**
 * The gear type codes this app has names for. Deliberately NOT the type of
 * `PlayerGear.type`: real log payloads (and the ESO Logs characterRankings API,
 * which omits item type entirely and yields 0) carry codes outside this union.
 * Use it when you genuinely hold a known constant; read raw values as `number`.
 */
export type GearType = WeaponType | ArmorType;

/**
 * The gear trait codes this app reasons about. ESO has ~30 traits and logs
 * report all of them (plus 0 for "no trait / not reported"), so this enum is a
 * named-constant lookup for specific comparisons — NOT the domain of
 * `PlayerGear.trait`. Full code→name decoding lives in `TRAIT_NAMES`
 * (`src/utils/gearMappings.ts`); add a member here only when code needs to
 * compare against that trait by name.
 */
export enum GearTrait {
  SHARPENED = 32,
  REINFORCED = 8,
}

export interface PlayerGear {
  id: number;
  slot: number;
  quality: ItemQuality;
  icon: string;
  name?: string;
  championPoints: number;
  /** Raw ESO trait code; 0 = no trait / not reported. Compare via {@link GearTrait}. */
  trait: number;
  enchantType: number;
  enchantQuality: number;
  setID: number;
  /**
   * Raw ESO gear type code; 0 = not reported (the characterRankings API never
   * reports it). Compare via {@link WeaponType} / {@link ArmorType}, gating on
   * the slot first because the two enums share numeric values.
   */
  type: number;
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
