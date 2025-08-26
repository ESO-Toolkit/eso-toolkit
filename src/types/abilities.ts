export interface Ability {
  id: number;
  name?: string;
  icon?: string;
  // Add other fields as needed from the API
}

/**
 * ESO damage type flags - each bit represents a damage type
 */
export enum DamageTypeFlags {
  PHYSICAL = 1,
  NONE = 2,
  FIRE = 4,
  POISON = 8,
  FROST = 16,
  BLEED = 32,
  MAGIC = 64,
  GENERIC = 128,
  DROWN = 256,
  SHOCK = 512,
  DISEASE = 1024,
}

/**
 * Map damage type flags to display names
 */
export const DAMAGE_TYPE_DISPLAY_NAMES: Record<DamageTypeFlags, string> = {
  [DamageTypeFlags.PHYSICAL]: 'Physical',
  [DamageTypeFlags.MAGIC]: 'Magic',
  [DamageTypeFlags.FIRE]: 'Fire',
  [DamageTypeFlags.FROST]: 'Frost',
  [DamageTypeFlags.SHOCK]: 'Shock',
  [DamageTypeFlags.POISON]: 'Poison',
  [DamageTypeFlags.DISEASE]: 'Disease',
  [DamageTypeFlags.GENERIC]: 'Generic',
  [DamageTypeFlags.DROWN]: 'Drown',
  [DamageTypeFlags.BLEED]: 'Bleed',
  [DamageTypeFlags.NONE]: 'None',
};

/**
 * Helper function to parse damage type flags into readable format
 */
export function parseDamageTypeFlags(type: string | number | null | undefined): string[] {
  if (!type) return ['None'];

  const typeNum = typeof type === 'number' ? type : parseInt(String(type), 10);
  if (isNaN(typeNum) || typeNum === 0) return ['Generic'];

  const damageTypes: string[] = [];

  Object.values(DamageTypeFlags).forEach((flag) => {
    if (typeof flag === 'number' && (typeNum & flag) === flag) {
      damageTypes.push(DAMAGE_TYPE_DISPLAY_NAMES[flag]);
    }
  });

  return damageTypes.length > 0 ? damageTypes : ['Unknown'];
}

/**
 * Helper function to get damage types from flags for breakdown analysis
 */
export function getDamageTypesFromFlags(
  flagValue: number
): { flag: DamageTypeFlags; name: string }[] {
  const result: { flag: DamageTypeFlags; name: string }[] = [];

  Object.values(DamageTypeFlags).forEach((flag) => {
    if (typeof flag === 'number' && (flagValue & flag) === flag) {
      result.push({ flag, name: DAMAGE_TYPE_DISPLAY_NAMES[flag] });
    }
  });

  return result;
}

/**
 * Ability interface for general ability data
 */
export interface Ability {
  id: number;
  name?: string;
  icon?: string;
  // Add other fields as needed from the API
}

/**
 * Lookup type for abilities by string key
 */
export type AbilitiesLookup = Record<string, Ability>;

/**
 * Known ESO ability IDs for penetration calculations
 */
export enum KnownAbilities {
  // Champion Points
  REAVING_BLOWS = 142007,
  SLIPPERY = 142094,
  SPRINTER = 142079,
  GILDED_FINGERS = 142210,

  // Shared Passives
  UNDAUNTED_METTLE = 55386,
  UNDAUNTED_COMMAND = 55676,
  SKILLED_TRACKER = 45596,
  MAGICKA_AID = 39255,
  WIND_WALKER = 45565,
  CONCENTRATION = 45562,
  GRACE = 45549,
  EVOCATION = 45557,
  EVASION = 150054,

  // Class Passives
  HEMORRHAGE = 45060,
  FATED_FORTUNE_STAGE_ONE = 184847,
  PRESSURE_POINTS = 45053,
  HARNESSED_QUINTESSENCE = 184858,
  MASTER_ASSASSIN = 45038,
  EXECUTIONER = 36630,
  PSYCHIC_LESION = 184873,
  WARMTH = 45012,
  SPLINTERED_SECRETS = 184887,
  COMBUSTION = 45011,
  FOLLOW_UP = 45446,

  // Racial Passives
  HIGHBORN = 35965,
  ELEMENTAL_TALENT = 45276,

  // Scribed Skills
  SHOCKING_BANNER = 217706,

  // Status Effects
  BURNING = 18084,
  POISONED = 21929,
  OVERCHARGED = 178118,
  SUNDERED = 178123,
  CONCUSSION = 95134,
  CHILL = 95136,
  HEMMORRHAGING = 148801,
  DISEASED = 178127,

  // Major Brittle - increases critical damage by 20% (debuff)
  MAJOR_BRITTLE = 145977,
  // Minor Brittle - increases critical damage by 10% (debuff)
  MINOR_BRITTLE = 146697,

  // Major Breach - reduces target's physical and spell resistance
  MAJOR_BREACH = 61743,

  // Minor Breach - reduces target's physical and spell resistance (lesser amount)
  MINOR_BREACH = 61742,

  // Crusher enchant - weapon enchant that reduces target resistance
  CRUSHER_ENCHANT = 17906,

  // Runic Sunder - Two-Handed weapon skill that reduces target resistance
  RUNIC_SUNDER = 187742,

  // Tremorscale - Monster set that reduces target resistance
  TREMORSCALE = 142023,

  // Crimson Oath - Monster set that reduces target resistance
  CRIMSON_OATH = 155150,

  // Roar of Alkosh - Monster set that reduces target resistance
  ROAR_OF_ALKOSH = 102094,

  // Velothi Ur-Mage's Amulet - Mythic set buff
  VELOTHI_UR_MAGE_BUFF = 193447,

  // Lucent Echoes - Buff that provides 11% critical damage
  LUCENT_ECHOES = 220015,

  // Piercing Spear - Passive that provides 12% critical damage
  PIERCING_SPEAR = 44046,

  // Dexterity - Passive that provides 2% crit damage per piece of medium armor
  DEXTERITY = 45241,

  // Herald of the Tome abilities (for Splintered Secrets passive)
  CEPHALIARCHS_FLAIL = 183006,
  PRAGMATIC_FATECARVER = 193398,
  INSPIRED_SCHOLARSHIP = 185842,
  THE_LANGUID_EYE = 189867,
  WRITHING_RUNEBLADES = 185803,
  TENTACULAR_DREAD = 185823,
  FULMINATING_RUNE = 182988,
  RECUPERATIVE_TREATISE = 183047,

  // Advanced Species - Passive that provides 15% critical damage
  ADVANCED_SPECIES = 184809,

  // Taunted Debuffs
  TAUNT = 38254,

  RESURRECT = 26770,

  // Specific Named Buffs and Debuffs
  EMPOWER = 61737,
  ENLIVENING_OVERFLOW = 156011,
  GRAND_REJUVENATION = 99781,
  ENGULFING_FLAMES = 31104,
  PEARLESCENT_WARD = 172621,
  POWERFUL_ASSAULT = 61771,
  TOUCH_OF_ZEN = 126597,
  CRUSHER = 17906,
  OFF_BALANCE = 62988,

  // Major Buffs and Debuffs
  MAJOR_BERSERK = 61745,
  MAJOR_COURAGE = 109966,
  MAJOR_FORCE = 61747,
  MAJOR_RESOLVE = 61694,
  MAJOR_SAVAGERY = 61898,
  MAJOR_SLAYER = 93109,
  MAJOR_VULNERABILITY = 106754,
  MAJOR_COWARDICE = 147643,

  // Minor Buffs and Debuffs
  MINOR_BERSERK = 61744,
  MINOR_BRUTALITY = 61662,
  MINOR_COURAGE = 121878,
  MINOR_FORCE = 61746,
  MINOR_HEROISM = 61708,
  MINOR_SAVAGERY = 61666,
  MINOR_SLAYER = 147226,
  MINOR_SORCERY = 62800,
  MINOR_VULNERABILITY = 79717,
  MINOR_LIFESTEAL = 86304,

  // TODO: Add more penetration-related abilities
  // Examples:
  // NIGHT_MOTHERS_GAZE = <id>,
  // etc.
}

/**
 * Penetration values for different effects
 */
export enum PenetrationValues {
  // Major Breach provides 5948 penetration
  MAJOR_BREACH = 5948,

  // Minor Breach provides 2974 penetration
  MINOR_BREACH = 2974,

  // Crusher enchant provides 2108 penetration
  CRUSHER_ENCHANT = 2108,

  // Runic Sunder provides 2200 penetration
  RUNIC_SUNDER = 2200,

  // Tremorscale provides 2640 penetration
  TREMORSCALE = 2640,

  // Crimson Oath provides 3541 penetration
  CRIMSON_OATH = 3541,

  // Roar of Alkosh provides 6000 penetration
  ROAR_OF_ALKOSH = 6000,

  // Velothi Ur-Mage's Amulet provides 1650 penetration
  VELOTHI_UR_MAGE_AMULET = 1650,

  // Concentration provides 939 penetration per piece of light armor
  CONCENTRATION_PER_PIECE = 939,

  // Splintered Secrets provides 620 penetration per stack per slotted Herald of the Tome ability
  SPLINTERED_SECRETS_PER_ABILITY = 620,

  // Ansuul's Torment 4-piece provides 1487 penetration
  ANSUULS_TORMENT_4_PIECE = 1487,

  // Tide-born Wildstalker 4-piece provides 1487 penetration
  TIDEBORN_WILDSTALKER_4_PIECE = 1487,

  // TODO: Add more penetration values
  // etc.
}

/**
 * Critical damage values for different effects (in percentage)
 */
export enum CriticalDamageValues {
  // Lucent Echoes provides 11% critical damage
  LUCENT_ECHOES = 11,

  // Fated Fortune provides 12% critical damage
  FATED_FORTUNE = 12,

  // Hemorrhage provides 10% critical damage
  HEMORRHAGE = 10,

  // Piercing Spear provides 12% critical damage
  PIERCING_SPEAR = 12,

  // Dexterity provides 2% critical damage per piece of medium armor
  DEXTERITY_PER_PIECE = 2,

  // Advanced Species provides 15% critical damage
  ADVANCED_SPECIES = 15,

  // The Shadow mundus stone provides ~12% critical damage
  THE_SHADOW = 12,

  FIGHTING_FINESSE = 8,

  MINOR_BRITTLE = 10,

  // TODO: Add more critical damage values
  // Examples:
  // MOTHER_SORROW_5_PIECE = X,
  // RELEQUEN_5_PIECE = X,
  // etc.
}

/**
 * Set IDs for gear sets that provide penetration
 */
export enum KnownSetIDs {
  VELOTHI_UR_MAGE = 694,
  ANSUULS_TORMENT_SET = 707,
  TIDEBORN_WILDSTALKER_SET = 809,

  // TODO: Add other set IDs as needed
}

/**
 * Item types for gear pieces
 */
export enum ItemType {
  LIGHT_ARMOR = 1,
  MEDIUM_ARMOR = 2,
}

/**
 * Mundus Stone ability IDs
 */
export enum MundusStones {
  // The Warrior - Increases Weapon Damage
  THE_WARRIOR = 13940,

  // The Mage - Increases Spell Damage
  THE_MAGE = 13943,

  // The Serpent - Increases Stamina Recovery
  THE_SERPENT = 13974,

  // The Thief - Increases Critical Strike Chance
  THE_THIEF = 13975,

  // The Lady - Increases Physical and Spell Resistance
  THE_LADY = 13976,

  // The Steed - Increases Movement Speed and Health Recovery
  THE_STEED = 13977,

  // The Lord - Increases Max Health
  THE_LORD = 13978,

  // The Apprentice - Increases Max Magicka
  THE_APPRENTICE = 13979,

  // The Ritual - Increases Healing Done
  THE_RITUAL = 13980,

  // The Lover - Increases Physical and Spell Penetration
  THE_LOVER = 13981,

  // The Atronach - Increases Max Magicka and Magicka Recovery
  THE_ATRONACH = 13982,

  // The Shadow - Increases Critical Strike Damage
  THE_SHADOW = 13984,

  // The Tower - Increases Max Stamina
  THE_TOWER = 13985,
}
