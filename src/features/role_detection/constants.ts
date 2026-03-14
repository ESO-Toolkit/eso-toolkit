/**
 * Role Detection Constants
 *
 * Ability IDs, set IDs, and thresholds used by the role detection algorithm.
 * References KnownAbilities and KnownSetIDs from the existing codebase.
 */

import { KnownAbilities, KnownSetIDs } from '@/types/abilities';

// ============================================================
// TAUNT ABILITY IDS
// These are abilities that apply the Taunt debuff (38254) to enemies.
// ============================================================

export const TAUNT_ABILITY_IDS = new Set<number>([
  // One Hand and Shield
  28306, // Puncture
  38250, // Pierce Armor (morph)
  38310, // Pierce Armor (alt ID)
  38317, // Ransack (morph)

  // Undaunted
  39475, // Inner Fire
  42056, // Inner Beast (morph)
  42060, // Inner Rage (morph)

  // Destruction Staff (Frost Clench taunt)
  // The cast IDs for Frost Clench vary; the taunt debuff (38254) is the reliable signal

  // Arcanist - Soldier of Apocrypha / Runic Jolt
  // These also apply taunt debuff 38254

  // Templar - Focused Charge morphs (Explosive Charge, Toppling Charge)
  // These taunt on hit if morphed for it

  // Necromancer - Beckoning Armor pulls + taunts ranged enemies
  // Detected via the taunt debuff rather than cast ID

  // Werewolf - Roar morph (Deafening Roar)
  // Heavy Attacks in werewolf form taunt
]);

/** The taunt debuff ability ID that appears on taunted enemies */
export const TAUNT_DEBUFF_ID = KnownAbilities.TAUNT; // 38254

// ============================================================
// ULTIMATE ABILITY IDS
// ============================================================

/** War Horn and its morphs — used by tanks and support healers */
export const HORN_ABILITY_IDS = new Set<number>([
  40222, // War Horn (base)
  40223, // Aggressive Horn (morph — Major Force)
  40221, // Sturdy Horn (morph — resistance)
]);

/** Barrier and its morphs — used by shield healers and tanks */
export const BARRIER_ABILITY_IDS = new Set<number>([
  38573, // Barrier (base)
  40237, // Reviving Barrier (morph)
  40239, // Replenishing Barrier (morph)
]);

// ============================================================
// MAJOR COURAGE BUFF IDS
// Applied by healers via Olorime, SPC, etc.
// ============================================================

export const MAJOR_COURAGE_BUFF_IDS = new Set<number>([
  109966, // Major Courage
  120015, // Major Courage (alternate)
  147417, // Minor Courage (included for broader support detection)
  177885, // Minor Courage (alternate)
]);

// ============================================================
// GEAR SET CLASSIFICATION
// References the existing KnownSetIDs enum categories.
// ============================================================

/** Tank support sets (5-piece) — used to identify tank role */
export const TANK_SET_IDS = new Set<number>([
  KnownSetIDs.ROAR_OF_ALKOSH,
  KnownSetIDs.CLAW_OF_YOLNAHKRIIN,
  KnownSetIDs.PERFECTED_CLAW_OF_YOLNAHKRIIN,
  KnownSetIDs.DRAKES_RUSH,
  KnownSetIDs.SAXHLEEL_CHAMPION,
  KnownSetIDs.PERFECTED_SAXHLEEL_CHAMPION,
  KnownSetIDs.PEARLESCENT_WARD,
  KnownSetIDs.PERFECTED_PEARLESCENT_WARD,
  KnownSetIDs.LUCENT_ECHOES,
  KnownSetIDs.PERFECTED_LUCENT_ECHOES,
  KnownSetIDs.WAR_MACHINE,
  KnownSetIDs.ETERNAL_YOKEDA,
]);

/** Healer support sets (5-piece) — used to identify healer role */
export const HEALER_SET_IDS = new Set<number>([
  KnownSetIDs.SPELL_POWER_CURE,
  KnownSetIDs.VESTMENT_OF_OLORIME,
  KnownSetIDs.PERFECTED_VESTMENT_OF_OLORIME,
  KnownSetIDs.ROARING_OPPORTUNIST,
  KnownSetIDs.PERFECTED_ROARING_OPPORTUNIST,
  KnownSetIDs.JORVULDS_GUIDANCE,
  KnownSetIDs.MASTER_ARCHITECT,
  KnownSetIDs.POWERFUL_ASSAULT,
  KnownSetIDs.COMBAT_PHYSICIAN,
  KnownSetIDs.PILLAGERS_PROFIT,
  KnownSetIDs.PERFECTED_PILLAGERS_PROFIT,
]);

/** Monster sets commonly used by tanks */
export const TANK_MONSTER_SET_IDS = new Set<number>([
  KnownSetIDs.TREMORSCALE,
  KnownSetIDs.STONE_HUSK,
  KnownSetIDs.ENCRATIS_BEHEMOTH,
  KnownSetIDs.NAZARAY,
  KnownSetIDs.SPAULDER_OF_RUIN,
  KnownSetIDs.ARCHDRUID_DEVYRIC,
]);

/** Monster sets commonly used by healers */
export const HEALER_MONSTER_SET_IDS = new Set<number>([
  KnownSetIDs.SYMPHONY_OF_BLADES,
  KnownSetIDs.EARTHGORE,
  KnownSetIDs.BARON_ZAUDRUS,
  KnownSetIDs.GRYPHONS_REPRISAL,
  KnownSetIDs.OZEZAN,
  KnownSetIDs.THE_BLIND,
]);

/**
 * Support-DPS sets: worn by DPS players who sacrifice personal DPS
 * to provide group buffs. Indicates Support DPS role.
 */
export const SUPPORT_DPS_SET_IDS = new Set<number>([
  KnownSetIDs.ZENS_REDRESS,
  KnownSetIDs.WAY_OF_MARTIAL_KNOWLEDGE,
  KnownSetIDs.AZUREBLIGHT,
]);

/** Shield-healer-associated sets */
export const SHIELD_HEALER_SET_IDS = new Set<number>([
  KnownSetIDs.COMBAT_PHYSICIAN,
  KnownSetIDs.PEARLS_OF_EHLNOFEY,
]);

// ============================================================
// DPS SET IDS — known DPS gear
// ============================================================

export const DPS_SET_IDS = new Set<number>([
  KnownSetIDs.DEADLY_STRIKE,
  KnownSetIDs.MERCILESS_CHARGE,
  KnownSetIDs.PERFECTED_MERCILESS_CHARGE,
  KnownSetIDs.CRUSHING_WALL,
  KnownSetIDs.PERFECTED_CRUSHING_WALL,
  KnownSetIDs.RELEQUEN,
  KnownSetIDs.RELEQUEN_PERFECTED,
  KnownSetIDs.SIRORIA_PERFECTED,
  KnownSetIDs.LOKKESTIIZ_PERFECTED,
  KnownSetIDs.SUL_XAN_TORMENT,
  KnownSetIDs.PERFECTED_SUL_XAN_TORMENT,
  KnownSetIDs.BAHSEI_MANIA_PERFECTED,
  KnownSetIDs.CORAL_RIPTIDE,
  KnownSetIDs.CORAL_RIPTIDE_PERFECTED,
  KnownSetIDs.ANSUULS_TORMENT,
  KnownSetIDs.PERFECTED_ANSUULS_TORMENT,
  KnownSetIDs.KINRAS_WRATH,
  KnownSetIDs.ORDERS_WRATH,
  KnownSetIDs.MOTHERS_SORROW,
  KnownSetIDs.HUNDINGS_RAGE,
  KnownSetIDs.NEW_MOON_ACOLYTE,
  KnownSetIDs.FALSE_GODS_DEVOTION,
  KnownSetIDs.FALSE_GODS_PERFECTED,
  KnownSetIDs.PILLAR_OF_NIRN,
  KnownSetIDs.TZOGVINS_WARBAND,
  KnownSetIDs.BURNING_SPELLWEAVE,
  KnownSetIDs.BRIARHEART,
  KnownSetIDs.MEDUSA,
  KnownSetIDs.LAW_OF_JULIANOS,
  KnownSetIDs.WAR_MAIDEN,
  KnownSetIDs.MECHANICAL_ACUITY,
  KnownSetIDs.ADVANCING_YOKEDA,
  KnownSetIDs.DEATH_DEALERS_FETE,
  KnownSetIDs.SERPENTS_DISDAIN,
  KnownSetIDs.RUNECARVERS_BLAZE,
  KnownSetIDs.MORA_SCRIBE,
  KnownSetIDs.MORA_SCRIBE_PERFECTED,
  KnownSetIDs.SLIVERS_OF_THE_NULL_ARCA,
  KnownSetIDs.PERFECTED_SLIVERS_OF_THE_NULL_ARCA,
  KnownSetIDs.PERFECTED_XORYNS_MASTERPIECE,
  KnownSetIDs.XORYNS_MASTERPIECE,
  KnownSetIDs.PYREBRAND,
  KnownSetIDs.CORPSEBURSTER,
  KnownSetIDs.BEACON_OF_OBLIVION,
  KnownSetIDs.MACABRE_VINTAGE,
  KnownSetIDs.HARPOONERS_KILT,
  KnownSetIDs.VELOTHI_UR_MAGE,
  KnownSetIDs.ELF_BANE,
  KnownSetIDs.NECROPOTENCE,
  KnownSetIDs.AEGIS_CALLER,
  KnownSetIDs.TIDEBORN_WILDSTALKER,
  KnownSetIDs.KAZPIAN,
  KnownSetIDs.KAZPIAN_PERFECTED,
  KnownSetIDs.RAKKHAT_VOIDMANTLE,
]);

/** DPS monster sets */
export const DPS_MONSTER_SET_IDS = new Set<number>([
  KnownSetIDs.BLOODSPAWN,
  KnownSetIDs.NERIENETH,
  KnownSetIDs.MAW_OF_THE_INFERNAL,
  KnownSetIDs.MOLAG_KENA,
  KnownSetIDs.VELIDRETH,
  KnownSetIDs.KRAGH,
  KnownSetIDs.ICEHEART,
  KnownSetIDs.GROTHDARR,
  KnownSetIDs.ZAAN,
  KnownSetIDs.SLIMECRAW,
]);

// ============================================================
// CLASSIFICATION THRESHOLDS
// ============================================================

/** Minimum taunt uptime ratio (0-1) on boss to be considered Main Tank */
export const MAIN_TANK_TAUNT_UPTIME_THRESHOLD = 0.3;

/** Minimum heavy armor pieces to be a strong tank gear signal */
export const HEAVY_ARMOR_THRESHOLD = 5;

/** Players below this DPS share are unlikely to be DPS */
export const LOW_DPS_SHARE_THRESHOLD = 0.05;

/** Players above this healing share are likely healers */
export const HIGH_HEALING_SHARE_THRESHOLD = 0.15;

/** Players above this damage-taken share are likely tanks */
export const HIGH_DAMAGE_TAKEN_THRESHOLD = 0.15;
