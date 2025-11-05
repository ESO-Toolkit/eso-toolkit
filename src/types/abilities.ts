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
  PHYSICAL = '1',
  BLEED = '2',
  FIRE = '4',
  POISON = '8',
  FROST = '16',
  MAGIC = '64',
  GENERIC = '128',
  DISEASE = '256',
  SHOCK = '512',
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
  [DamageTypeFlags.BLEED]: 'Bleed',
};

/**
 * Helper function to parse damage type flags into readable format
 */
export function parseDamageTypeFlags(type: string | number | null | undefined): string[] {
  if (!type) return ['Generic'];

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
  flagValue: number,
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
 * Lookup type for abilities by string key
 */
export type AbilitiesLookup = Record<string, Ability>;

/**
 * Known ESO ability IDs for penetration calculations
 */
export enum KnownAbilities {
  // Whether hard mode was activated on the boss
  HARD_MODE = 137215,

  // General Game Mechanics
  SWAP_WEAPONS = 28541,

  // Synergies (should not count as skill casts)
  BLESSED_SHARDS = 26832,
  RESTORE_MAGICKA = 7916,

  // Champion Points
  BULWARK = 64079,
  ENLIVENING_OVERFLOW = 156008,
  EXPERT_EVASION = 142092,
  EXPLOITER = 63880,
  FROM_THE_BRINK = 156017,
  GILDED_FINGERS = 142210,
  JUGGERNAUT = 45546,
  REAVING_BLOWS = 142007,
  SLIPPERY = 142094,
  SPRINTER = 142079,

  // Shared Passives
  CLAIRVOYANCE = 103811,
  CONCENTRATED_BARRIER = 103964,
  CONCENTRATION = 45562,
  CONSTITUTION = 45526,
  DELIBERATION = 103972,
  EVASION = 150054,
  EVOCATION = 45557,
  GRACE = 45549,
  MAGICKA_AID = 39255,
  RAPID_MENDING = 45529,
  SKILLED_TRACKER = 45596,
  SPELL_ORB = 103878,
  UNDAUNTED_COMMAND = 55676,
  UNDAUNTED_METTLE = 55386,
  WIND_WALKER = 45565,

  // Class Passives
  ADVANCED_SPECIES = 86068, // Warden: Animal Companions passive (was incorrectly 184809 which is "Ritual")
  AEGIS_OF_THE_UNSEEN = 184923,
  BATTLE_ROAR = 44984,
  CATALYST = 45135,
  CIRCUMVENTED_FATE = 184932,
  COMBUSTION = 45011,
  ETERNAL_MOUNTAIN = 44996,
  EXECUTIONER = 36630,
  FATED_FORTUNE_BUFF = 194875,
  FATED_FORTUNE_STAGE_ONE = 184847,
  FOLLOW_UP = 45446,
  FROZEN_ARMOR = 86190,
  HARNESSED_QUINTESSENCE = 184858,
  HEMORRHAGE = 45060,
  ICY_AURA = 86194,
  IMPLACABLE_OUTCOME = 185058,
  MASTER_ASSASSIN = 45038,
  PIERCING_COLD = 86196,
  PRESSURE_POINTS = 45053,
  PSYCHIC_LESION = 184873,
  SPLINTERED_SECRETS = 184887,
  WARMTH = 45012,
  WELLSPRING_OF_THE_ABYSS = 185036,

  // Racial Passives
  ADRENALINE_RUSH = 45315,
  CONDITIONING = 117754,
  DIPLOMAT = 36312,
  ELEMENTAL_TALENT = 45276,
  HIGHBORN = 35965,
  HUNTERS_EYE_PASSIVE = 45576, // Wood Elf passive providing 950 penetration
  IMPERIAL_METTLE = 45280,
  RED_DIAMOND = 45293,
  TOUGH = 50907,

  // Class Passives and Abilities
  DISMEMBER = 116192, // Necromancer: Grave Lord passive providing 3271 penetration

  // Computed penetration passives
  PIERCING_PASSIVE = 45233, // Provides 700 penetration
  FORCE_OF_NATURE_PASSIVE = 174250, // Force of Nature - provides 660 per status effect
  HEAVY_WEAPONS_PASSIVE = 45265, // Two-handed passive providing 2974 with maul
  TWIN_BLADE_AND_BLUNT_PASSIVE = 45477, // Dual wield passive providing 1487 per mace
  CRYSTAL_WEAPON_BUFF = 126045, // Crystal Weapon buff providing 1000 penetration

  // Scribed Skills - Grimoires
  BANNER_BEARER = 217699, // Banner Bearer
  ELEMENTAL_EXPLOSION = 217228, // Elemental Explosion
  MENDERS_BOND = 217275, // Mender's Bond
  SHIELD_THROW = 217061, // Shield Throw
  SMASH = 217186, // Smash
  SOUL_BURST = 217472, // Soul Burst
  TORCHBEARER = 217646, // Torchbearer
  TRAMPLE = 217667, // Trample
  TRAVELING_KNIFE = 217342, // Traveling Knife
  ULFSILD_CONTINGENCY = 217528, // Ulfsild's Contingency
  VAULT = 216672, // Vault
  WIELD_SOUL = 216803, // Wield Soul

  // Legacy Scribed Skills (kept for compatibility)
  SHOCKING_BANNER = 217706,
  SHATTERING_KNIFE = 217340, // Traveling Knife morph (different from BANNER_BEARER)

  // Status Effects
  BURNING = 18084,
  CHILL = 95136,
  CONCUSSION = 95134,
  DISEASED = 178127,
  HEMMORRHAGING = 148801,
  OVERCHARGED = 178118,
  POISONED = 21929,
  SUNDERED = 178123,

  // Elemental Weakness Debuffs
  FLAME_WEAKNESS = 142610,
  FROST_WEAKNESS = 142652,
  SHOCK_WEAKNESS = 142653,

  // Crusher - weapon enchant that reduces target resistance
  CRUSHER = 17906,

  // Runic Sunder - Two-Handed weapon skill that reduces target resistance
  RUNIC_SUNDER_DEBUFF = 187742,
  RUNIC_SUNDER_BUFF = 187741,

  // Tremorscale - Monster set that reduces target resistance
  TREMORSCALE = 80866,

  // Crimson Oath - Monster set that reduces target resistance
  CRIMSON_OATH = 155150,

  // Roar of Alkosh - Monster set that reduces target resistance
  ROAR_OF_ALKOSH = 102094,

  // Velothi Ur-Mage's Amulet - Mythic set buff
  VELOTHI_UR_MAGE_BUFF = 193447,

  // Lucent Echoes - Heavy armor set that provides 11% critical damage
  // 220015 = Group benefit buff (appears on recipients of the buff)
  // 220061 = Wearer-only aura (appears only on the player wearing the set)
  LUCENT_ECHOES_RECIPIENT = 220015,
  LUCENT_ECHOES_WEARER = 220061,

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

  // Feline Ambush - Aura that grants 12% critical damage
  FELINE_AMBUSH = 192901,

  // Taunted Debuffs
  TAUNT = 38254,

  RESURRECT = 26770,
  RAPID_STRIKES = 38857,

  // AOE Abilities
  ANTI_CAVALRY_CALTROPS = 98438,
  ARROW_BARRAGE = 32948,
  BARBED_TRAP = 117809,
  BLAZING_SPEAR = 38745,
  BLOCKADE_OF_FIRE = 80172,
  BLOCKADE_OF_FROST = 108936,
  BLOCKADE_OF_STORMS = 61502,
  BOUNDLESS_STORM = 23231, // Sorcerer: Storm Calling ability (Hurricane morph)
  CALTROPS = 20252,
  CRUSHING_SHOCK = 23214,
  CUTTING_DIVE = 117854,
  DARK_FLARE = 126720,
  DEEP_FISSURE = 143946,
  DESTRUCTIVE_CLENCH = 186370,
  DESTRUCTIVE_CLENCH_2 = 24329,
  DESTRUCTIVE_REACH = 183123,
  DESTRUCTIVE_REACH_2 = 77186,
  DESTRUCTIVE_TOUCH = 23208,
  DIVE = 118011,
  DEADLY_CLOAK = 62547, // Dual Wield: Blade Cloak morph
  ELEMENTAL_BLOCKADE = 39011, // Destruction Staff: Wall of Elements morph
  ELEMENTAL_DRAIN = 39095, // Destruction Staff: Weakness to Elements morph
  ELEMENTAL_DRAIN_2 = 29806,
  ELEMENTAL_RAGE = 181331,
  ELEMENTAL_RING = 126633,
  ELEMENTAL_RING_2 = 23667,
  ELEMENTAL_STORM = 133494,
  ELEMENTAL_STORM_2 = 94424,
  ELEMENTAL_STORM_3 = 100218,
  ELEMENTAL_STORM_TICK = 227072,
  ELEMENTAL_SUSCEPTIBILITY = 172672,
  ENDLESS_HAIL = 32714,
  ENERGY_ORB = 63474,
  ERUPTION = 118720,
  EYE_OF_THE_STORM = 88802,
  FETCHER_INFECTION = 118766,
  FLAME_REACH = 185407,
  FORCE_PULSE = 46356, // Destruction Staff: Force Shock morph
  FORCE_SHOCK = 23196,
  FROST_REACH = 189869,
  FROZEN_GATE = 85127,
  GLACIAL_PRESENCE = 62951,
  GROWING_SWARM = 123082,
  HEALING_COMBUSTION = 63471,
  HURRICANE = 23232, // Sorcerer: Storm Calling ability (Hurricane morph)
  ICY_ESCAPE = 62990,
  IMPULSE = 28800, // Destruction Staff: Impulse
  INFECTIOUS_CLAWS = 122392,
  LIGHTNING_FLOOD = 38792,
  LIGHTNING_SPLASH = 126474,
  LIGHTWEIGHT_BEAST_TRAP = 115572,
  LIQUID_LIGHTNING = 23202, // Sorcerer: Storm Calling ability (Lightning Splash morph)
  LUMINOUS_SHARDS = 85432,
  MYSTIC_ORB = 38690,
  NECROTIC_ORB = 40161,
  NOVA = 41839,
  PULSAR = 29809,
  QUICK_CLOAK = 62529, // Dual Wield: Blade Cloak morph
  RAZOR_CALTROPS = 20930,
  REARMING_TRAP = 32794,
  ROAR_OF_ALKOSH_AOE = 75752, // AOE ability version (different from debuff ID 102094)
  SCALDING_RUNE = 40469,
  SCORCH = 118314,
  SCREAMING_CLIFF_RACER = 117715,
  SHOCK_REACH = 191078,
  SOLAR_BARRAGE = 41990,
  SOLAR_DISTURBANCE = 80107,
  SOLAR_DISTURBANCE_2 = 217459,
  SOLAR_PRISON = 217348,
  SPEAR_SHARDS = 42029,
  SUBTERRANEAN_ASSAULT = 143944,
  SUPERNOVA = 222678,
  TRAP_BEAST = 32792,
  UNSTABLE_WALL_OF_FIRE = 26794,
  UNSTABLE_WALL_OF_FROST = 26871,
  UNSTABLE_WALL_OF_STORMS = 40252,
  VOLCANIC_RUNE = 215779,
  VOLLEY = 32711,
  WALL_OF_ELEMENTS = 102136,
  WALL_OF_FIRE = 26869,
  WALL_OF_FROST = 26879,
  WALL_OF_STORMS = 40267,
  WHIRLING_BLADES = 38891, // Dual Wield: Steel Tornado morph
  ENGULFING_FLAMES_SKILL = 44432,
  WINTERS_REVENGE = 62912,

  // Specific Named Buffs and Debuffs
  // Note: CRUSHER_ENCHANT = 17906 is defined above
  EMPOWER = 61737,
  ENGULFING_FLAMES_BUFF = 31104,
  ENLIVENING_OVERFLOW_BUFF = 156011,
  GRAND_REJUVENATION = 99781,
  OFF_BALANCE = 62988,
  PEARLESCENT_WARD = 172621,
  POWERFUL_ASSAULT = 61771,
  STAGGER = 134336,
  STONE_GIANT = 133027,
  TOUCH_OF_ZEN = 126597, // Touch of Z'en set buff

  // Major Buffs and Debuffs
  MAJOR_BERSERK = 61745,
  MAJOR_BREACH = 61743,
  MAJOR_BRITTLE = 145977,
  MAJOR_BRUTALITY = 61665,
  MAJOR_BRUTALITY_AND_SORCERY = 219246, // Combined Major Brutality & Sorcery buff
  MAJOR_COURAGE = 109966,
  MAJOR_COWARDICE = 147643,
  MAJOR_FORCE = 61747,
  MAJOR_PROPHECY = 61689,
  MAJOR_PROPHECY_AND_SAVAGERY = 217672, // Combined Major Prophecy and Savagery buff
  MAJOR_RESOLVE = 61694,
  MAJOR_SAVAGERY = 61667, // Fixed: was incorrectly 61898 (which is Minor Savagery)
  MAJOR_SLAYER = 93109,
  MAJOR_SORCERY = 61687, // Major Sorcery buff (was incorrectly 61685 which is "Minor Sorcery")
  MAJOR_VULNERABILITY = 106754,

  // Minor Buffs and Debuffs
  MINOR_BERSERK = 61744,
  MINOR_BREACH = 61742,
  MINOR_BRITTLE = 146697,
  MINOR_BRUTALITY = 61662,
  MINOR_COURAGE = 121878,
  MINOR_FORCE = 61746,
  MINOR_HEROISM = 61708,
  MINOR_LIFESTEAL = 86304,
  MINOR_RESOLVE = 61693,
  MINOR_SAVAGERY = 61666, // Multiple IDs exist for Minor Savagery (61666, 61898, etc.)
  MINOR_SLAYER = 147226,
  MINOR_SORCERY = 61685, // Was previously incorrectly labeled as MAJOR_SORCERY
  MINOR_VULNERABILITY = 79717,

  GLACIAL_COLOSSUS = 122388,
  SUMMON_CHARGED_ATRONACH = 23495,
  AGGRESSIVE_HORN = 40223,
  REPLENISHING_BARRIER = 40239,
  REVIVING_BARRIER = 40237,
}

/**
 * Keys for computed penetration sources
 */
export enum PenetrationComputedSourceKey {
  // ========================================
  // GROUPED ARMOR SET COMPUTED SOURCES
  // ========================================
  ARMOR_SETS_7918 = 'armor_sets_7918',
  ARMOR_SETS_3460 = 'armor_sets_3460',
  ARMOR_SETS_1496 = 'armor_sets_1496',
  ARMOR_SETS_1487 = 'armor_sets_1487',
  ARMOR_SETS_1190 = 'armor_sets_1190',

  // ========================================
  // INDIVIDUAL COMPUTED SOURCES
  // ========================================
  CONCENTRATION = 'concentration',
  SPLINTERED_SECRETS = 'splintered_secrets',
  FORCE_OF_NATURE = 'force_of_nature',
  PIERCING = 'piercing',
  HEAVY_WEAPONS = 'heavy_weapons',
  TWIN_BLADE_AND_BLUNT = 'twin_blade_and_blunt',
  CRYSTAL_WEAPON = 'crystal_weapon',
  BALORGH = 'balorgh',
  SHARPENED_1H = 'sharpened_1h',
  SHARPENED_2H = 'sharpened_2h',
  HEW_AND_SUNDER = 'hew_and_sunder',
}

/**
 * Penetration values for different effects
 * Note: Duplicate values are intentional - multiple sources can provide the same penetration amount
 */
/* eslint-disable @typescript-eslint/no-duplicate-enum-values */
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

  // Twin Blade and Blunt passive provides 1487 penetration per mace (legacy - see PER_TYPE for current)
  TWIN_BLADE_AND_BLUNT_PER_MACE = 1487,

  // Crystal Weapon buff provides 1000 penetration
  CRYSTAL_WEAPON = 1000,

  // ========================================
  // COMPUTED PENETRATION VALUES FOR GROUPED SETS
  // ========================================

  // Computed sources for grouped armor sets by penetration value
  ARMOR_SETS_7918_PENETRATION = 7918, // Very High penetration sets
  ARMOR_SETS_3460_PENETRATION = 3460, // High penetration sets
  ARMOR_SETS_2974_PENETRATION = 2974, // Medium-High penetration sets
  ARMOR_SETS_1496_PENETRATION = 1496, // Perfect sets penetration
  ARMOR_SETS_1487_PENETRATION = 1487, // Standard sets penetration (most common)
  ARMOR_SETS_1236_PENETRATION = 1236, // Variable/Per Enemy penetration sets
  ARMOR_SETS_1190_PENETRATION = 1190, // Arena weapon penetration sets

  // ========================================
  // ARMOR SETS GROUPED BY PENETRATION VALUE
  // ========================================

  // 11500 Penetration - Ultra High
  BALORGH_2_PIECE = 11500, // Balorgh (2-piece)

  // 7918 Penetration - Very High
  SHATTERED_FATE_5_PIECE = 7918, // Shattered Fate (5-piece)

  // 3460 Penetration - High
  SPRIGGANS_THORNS_5_PIECE = 3460, // Spriggan's Thorns (5-piece)

  // 2974 Penetration - Medium-High
  CORPSEBURSTER_MINOR_BREACH = 2974, // Corpseburster applies Minor Breach

  // 950 Penetration - Low-Medium
  HUNTERS_EYE = 950, // Hunter's Eye passive

  // 700 Penetration - Low
  PIERCING_PENETRATION = 700, // Piercing passive

  // 660 Penetration - Variable (Per Status Effect)
  FORCE_OF_NATURE_PER_STATUS = 660, // Force of Nature - per status effect

  // 620 Penetration - Low
  // (No current sets - reserved)

  // ========================================
  // SPECIAL/NON-ARMOR PENETRATION VALUES
  // ========================================

  // Dismember passive provides 3271 penetration
  DISMEMBER = 3271,

  // Heavy Weapons passive provides 2974 penetration with two-handed maul
  HEAVY_WEAPONS_PENETRATION = 2974,

  // Twin Blade and Blunt passive provides 2108 penetration per weapon type (changed from per mace)
  TWIN_BLADE_AND_BLUNT_PER_TYPE = 2108,

  // Balorgh provides 11500 penetration when you ult (2-piece)
  BALORGH_PENETRATION = 11500,

  // Sharpened trait on 1H weapons provides 1638 per weapon
  SHARPENED_1H_PER_WEAPON = 1638,

  // Sharpened trait on 2H weapons provides 3276
  SHARPENED_2H_PENETRATION = 3276,

  // Hew and Sunder provides 1236 penetration per enemy within 8 meters (5-piece)
  HEW_AND_SUNDER_PER_ENEMY = 1236,

  // TODO: Add more penetration values
  // etc.
}

/**
 * Critical damage values for different effects (in percentage)
 * Note: Duplicate values are intentional - multiple sources can provide the same percentage bonus
 */
/* eslint-disable @typescript-eslint/no-duplicate-enum-values */
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
  MAJOR_BRITTLE = 20,

  MINOR_FORCE = 10,
  MAJOR_FORCE = 20,

  // Sul-Xan's Torment provides 12% critical damage with 5 pieces
  SUL_XAN_TORMENT = 12,

  // Mora Scribe's Thesis provides 12% critical damage with 5 pieces
  MORA_SCRIBE_THESIS = 12,

  // Harpooner's Wading Kilt provides 10% critical damage when equipped
  HARPOONER_WADING_KILT = 10,

  // Animal Companions provides 5% critical damage per ability slotted
  ANIMAL_COMPANIONS_PER_ABILITY = 5,

  // Dual Wield (Twin Blade and Blunt) provides 6% critical damage per axe equipped
  DUAL_WIELD_AXES = 6,

  // Two Handed (Heavy Weapons) provides 12% critical damage with battle axe
  TWO_HANDED_BATTLE_AXE = 12,

  // Feline Ambush provides 12% critical damage
  FELINE_AMBUSH = 12,

  // Backstabber provides 10% critical damage
  BACKSTABBER = 10,

  // Elemental Catalyst provides 5% critical damage per elemental weakness debuff
  ELEMENTAL_CATALYST_PER_WEAKNESS = 5,

  // TODO: Add more critical damage values
  // Examples:
  // MOTHER_SORROW_5_PIECE = X,
  // RELEQUEN_5_PIECE = X,
  // etc.
}

/**
 * Set IDs for gear sets
 *
 * IMPORTANT: These are ACTUAL set IDs from the ESO Logs API.
 * Extracted from combat log data: report bTL2vHXGk3JaPcmx, fight 9
 *
 * To add more set IDs:
 * 1. Download report data: npm run download-report-data <report-code> <fight-id>
 * 2. Extract setID from player-details.json gear data
 * 3. Add to this enum with the actual ID from the API
 */
export enum KnownSetIDs {
  // ============================================================
  // SUPPORT SETS - HEALER 5-PIECE
  // ============================================================
  WAY_OF_MARTIAL_KNOWLEDGE = 147, // Way of Martial Knowledge (aka Martial Knowledge)
  POWERFUL_ASSAULT = 180, // Powerful Assault
  SPELL_POWER_CURE = 185, // Spell Power Cure
  COMBAT_PHYSICIAN = 194, // Combat Physician
  MASTER_ARCHITECT = 332, // Master Architect
  JORVULDS_GUIDANCE = 346, // Jorvuld's Guidance
  VESTMENT_OF_OLORIME = 391, // Vestment of Olorime (Olorime)
  PERFECTED_VESTMENT_OF_OLORIME = 395, // Perfected Vestment of Olorime
  ZENS_REDRESS = 455, // Z'en's Redress
  ROARING_OPPORTUNIST = 496, // Roaring Opportunist
  PERFECTED_ROARING_OPPORTUNIST = 497, // Perfected Roaring Opportunist

  // ============================================================
  // SUPPORT SETS - TANK 5-PIECE
  // ============================================================
  ROAR_OF_ALKOSH = 232, // Roar of Alkosh
  WAR_MACHINE = 331, // War Machine
  CLAW_OF_YOLNAHKRIIN = 446, // Claw of Yolnahkriin
  PERFECTED_CLAW_OF_YOLNAHKRIIN = 451, // Perfected Claw of Yolnahkriin
  DRAKES_RUSH = 571, // Drake's Rush
  PERFECTED_SAXHLEEL_CHAMPION = 589, // Perfected Saxhleel Champion
  PEARLESCENT_WARD = 648, // Pearlescent Ward
  PILLAGERS_PROFIT = 649, // Pillager's Profit
  PERFECTED_PILLAGERS_PROFIT = 650, // Perfected Pillager's Profit
  PERFECTED_PEARLESCENT_WARD = 651, // Perfected Pearlescent Ward
  LUCENT_ECHOES = 768, // Lucent Echoes
  PERFECTED_LUCENT_ECHOES = 771, // Perfected Lucent Echoes

  // ============================================================
  // SUPPORT SETS - MONSTER SETS (2-PIECE)
  // ============================================================
  ENGINE_GUARDIAN = 166, // Engine Guardian
  VALKYN_SKORIA = 169, // Valkyn Skoria
  SLIMECRAW = 270, // Slimecraw
  EARTHGORE = 341, // Earthgore
  SYMPHONY_OF_BLADES = 436, // Symphony of Blades
  STONE_HUSK = 534, // Stone Husk
  ENCRATIS_BEHEMOTH = 577, // Encratis's Behemoth (Encratis)
  BARON_ZAUDRUS = 578, // Baron Zaudrus
  SPAULDER_OF_RUIN = 627, // Spaulder of Ruin
  NAZARAY = 633, // Nazaray
  NUNATAK = 634, // Nunatak
  ARCHDRUID_DEVYRIC = 666, // Archdruid Devyric
  OZEZAN = 687, // Ozezan the Great
  THE_BLIND = 738, // The Blind

  // ============================================================
  // MYTHIC SETS
  // ============================================================
  PEARLS_OF_EHLNOFEY = 576, // Pearls of Ehlnofey
  VELOTHI_UR_MAGE = 694, // Velothi Ur-Mage's Amulet

  // ============================================================
  // DPS SETS - 5-PIECE
  // ============================================================
  DEADLY_STRIKE = 127, // Deadly Strike
  PERFECTED_MERCILESS_CHARGE = 522, // Perfected Merciless Charge
  MERCILESS_CHARGE = 369, // Merciless Charge
  CRUSHING_WALL = 373, // Crushing Wall
  PERFECTED_CRUSHING_WALL = 526, // Perfected Crushing Wall
  PERFECTED_GRAND_REJUVENATION = 533, // Perfected Grand Rejuvenation
  CRYPTCANON_VESTMENTS = 691, // Cryptcanon Vestments
  PERFECTED_ANSUULS_TORMENT = 707, // Perfected Ansuul's Torment
  SLIVERS_OF_THE_NULL_ARCA = 767, // Slivers of the Null Arca
  PERFECTED_SLIVERS_OF_THE_NULL_ARCA = 772, // Perfected Slivers of the Null Arca
  PERFECTED_XORYNS_MASTERPIECE = 770, // Perfected Xoryn's Masterpiece
  TIDEBORN_WILDSTALKER = 809, // Tide-Born Wildstalker

  // ============================================================
  // OTHER SETS (Training/Leveling)
  // ============================================================
  ARMOR_OF_THE_TRAINEE = 281, // Armor of the Trainee
  AEGIS_CALLER = 475, // Aegis Caller
  PLAGUE_SLINGER = 347, // Plague Slinger

  // ============================================================
  // DPS/PENETRATION SETS (Previously defined, keeping for compatibility)
  // ============================================================
  ANSUULS_TORMENT_SET = 707, // Same as PERFECTED_ANSUULS_TORMENT
  TIDEBORN_WILDSTALKER_SET = 809, // Same as TIDEBORN_WILDSTALKER
  SUL_XAN_TORMENT_SET = 708, // Sul-Xan's Torment set
  MORA_SCRIBE_THESIS_SET = 709, // Mora Scribe's Thesis set
  HARPOONER_WADING_KILT_SET = 710, // Harpooner's Wading Kilt set
  SHATTERED_FATE_SET = 711, // Shattered Fate set
  SPRIGGANS_THORNS_SET = 712, // Spriggan's Thorns set
  BALORGH_SET = 713, // Balorgh set
  AERIES_CRY_SET = 714, // Aerie's Cry set
  AURORANS_THUNDER_SET = 715, // Auroran's Thunder set
  ARMS_OF_RELEQUEN_SET = 716, // Arms of Relequen set
  ARMS_OF_THE_ANCESTORS_SET = 717, // Arms of the Ancestors set
  ARCHDRUID_DEVYRIC_SET = 718, // Archdruid Devyric set
  BLACK_GEM_MONSTROSITY_SET = 719, // Black Gem Monstrosity set
  COLOVIAN_HIGHLANDS_GENERAL_SET = 720, // Colovian Highlands General set
  CINDERS_OF_ANTHELMIR_SET = 721, // Cinders of Anthelmir set
  CORPSEBURSTER_SET = 722, // Corpseburster set
  PERFECT_ARMS_OF_RELEQUEN_SET = 723, // Perfect Arms of Relequen set
  PERFECT_AURORAN_THUNDER_SET = 724, // Perfect Auroran's Thunder set
  PERFECT_ANSUULS_TORMENT_SET = 725, // Perfect Ansuul's Torment set (duplicate of 707)
  DARK_CONVERGENCE_SET = 726, // Dark Convergence set
  DRAUGRKINS_GRIP_SET = 727, // Draugrkin's Grip set
  DRO_ZAKARS_CLAWS_SET = 728, // Dro'Zakar's Claws set
  FLAME_BLOSSOM_SET = 729, // Flame Blossom set
  GRISLY_GOURMET_SET = 730, // Grisly Gourmet set
  GRYPHONS_REPRISAL_SET = 731, // Gryphon's Reprisal set
  HEW_AND_SUNDER_SET = 732, // Hew and Sunder set
  HROTHGARS_CHILL_SET = 733, // Hrothgar's Chill set
  ICY_CONJURER_SET = 734, // Icy Conjurer set
  JERENSIS_BLADESTORM_SET = 735, // Jerensi's Bladestorm set
  KAZPIANS_CRUEL_SIGNET_SET = 736, // Kazpian's Cruel Signet set
  KRAGH_SET = 737, // Kra'gh set
  LADY_MALYGDA_SET = 738, // Lady Malygda set
  LANGUOR_OF_PERYITE_SET = 739, // Languor of Peryite set
  LEGACY_OF_KARTH_SET = 740, // Legacy of Karth set
  NEW_MOON_ACOLYTE_SET = 741, // New Moon Acolyte set
  NOCTURNALS_PLOY_SET = 742, // Nocturnal's Ploy set
  NOXIOUS_BOULDER_SET = 743, // Noxious Boulder set
  OBLIVIONS_FOE_SET = 744, // Oblivion's Foe set
  PELINALS_WRATH_SET = 745, // Pelinal's Wrath set
  PERFECTED_CRUSHING_WALL_SET = 746, // Perfected Crushing Wall set (duplicate of 526)
  PERFECTED_KAZPIANS_CRUEL_SIGNET_SET = 747, // Perfected Kazpian's Cruel Signet set
  PERFECTED_MERCILESS_CHARGE_SET = 748, // Perfected Merciless Charge set (duplicate of 522)
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

export const RED_CHAMPION_POINTS = Object.freeze(
  new Set<KnownAbilities>([
    KnownAbilities.EXPERT_EVASION,
    KnownAbilities.JUGGERNAUT,
    KnownAbilities.SLIPPERY,
    KnownAbilities.SPRINTER,
  ]),
);
export const BLUE_CHAMPION_POINTS = Object.freeze(
  new Set<KnownAbilities>([
    KnownAbilities.EXPLOITER,
    KnownAbilities.BULWARK,
    KnownAbilities.REAVING_BLOWS,
    KnownAbilities.ENLIVENING_OVERFLOW,
    KnownAbilities.FROM_THE_BRINK,
  ]),
);
export const GREEN_CHAMPION_POINTS = Object.freeze(
  new Set<KnownAbilities>([KnownAbilities.GILDED_FINGERS]),
);

// Food Buffs
export const TRI_STAT_FOOD = Object.freeze(new Set([68411, 68411, 61218, 127596]));
export const HEALTH_AND_REGEN_FOOD = Object.freeze(
  new Set([89971, 72824, 61322, 66132, 66137, 66586, 66590, 66594, 89953, 89954, 89939]),
); // Added: Jester foods with regen
export const HEALTH_FOOD = Object.freeze(
  new Set([84732, 84733, 89973, 17407, 61259, 66125, 66551, 72957, 72960, 72962]),
);
export const MAGICKA_FOOD = Object.freeze(
  new Set([89972, 84720, 61260, 66128, 66568, 84678, 85486, 89956, 61325, 61326, 89919]),
); // Added: Jesters Food Max M
export const STAMINA_FOOD = Object.freeze(
  new Set([61255, 86673, 61261, 66130, 66576, 68412, 85485, 61328]),
);
export const INCREASE_MAX_HEALTH_AND_STAMINA = Object.freeze(new Set([89957, 107789, 61255]));
export const INCREASE_MAX_HEALTH_AND_MAGICKA = Object.freeze(
  new Set([84731, 61257, 100498, 100499]),
);
export const INCREASE_MAX_MAGICKA_AND_STAMINA = Object.freeze(new Set([17577, 61294, 93376]));
export const MAX_STAMINA_AND_MAGICKA_RECOVERY = Object.freeze(new Set([89955])); // Candied Jester's Coins
export const WITCHES_BREW = Object.freeze(
  new Set([
    146563, 146725, 153013, 158543, 158548, 158549, 160169, 160170, 160171, 160172, 160174, 160175,
    160176, 160312, 160494, 161213, 161215,
  ]),
); // Witches' Brew event items
export const EXPERIENCE_BOOST_FOOD = Object.freeze(new Set([91368, 91369])); // Jester's Experience Boost Pie

// Synergies (abilities that should not count as player-initiated casts)
export const SYNERGY_ABILITY_IDS = Object.freeze(
  new Set([
    7916, // Restore Magicka (Necrotic Orb synergy)
    17323, // Restore Magicka (variant)
    26832, // Blessed Shards (Luminous Shards synergy)
    45223, // Restore Magicka (another variant)
  ]),
);
