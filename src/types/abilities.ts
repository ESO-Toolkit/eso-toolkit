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

  // Concentration - Light Armor passive that provides penetration per piece
  CONCENTRATION = 45562,

  // Splintered Secrets - Herald of the Tome passive that provides penetration per slotted tome ability
  SPLINTERED_SECRETS = 184887,

  // Velothi Ur-Mage's Amulet - Mythic set buff
  VELOTHI_UR_MAGE_BUFF = 193447,

  // Herald of the Tome abilities (for Splintered Secrets passive)
  CEPHALIARCHS_FLAIL = 183006,
  PRAGMATIC_FATECARVER = 193398,
  INSPIRED_SCHOLARSHIP = 185842,
  THE_LANGUID_EYE = 189867,
  WRITHING_RUNEBLADES = 185803,
  TENTACULAR_DREAD = 185823,
  FULMINATING_RUNE = 182988,
  RECUPERATIVE_TREATISE = 183047,

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
