/**
 * Gear Upgrade Optimizer — catalog
 *
 * The set of trait / quality / enchant changes the optimizer scores, plus the
 * qualitative front-bar weapon-trait guide. Magnitudes are CP160, Legendary
 * (gold), per piece.
 *
 * SOURCING: stat magnitudes below are a first-pass derived from in-game
 * tooltips and standard ESO values (UESP). They carry a `confidence` marker
 * and should be reconciled against the client dump in `tools/eso-tooltip-dump`
 * before being treated as authoritative — the *engine* math is exact, the
 * per-upgrade stat amounts are the refinable input. (No third-party wikis are
 * used as a source — only the game client and UESP.)
 *
 * Faithful to the reference table this feature is modelled on: only armor /
 * jewelry traits, quality, and enchants are quantified. Weapon traits
 * (Charged / Nirnhoned / Precise / Infused) depend on status-effect uptime and
 * rotation and are surfaced as a qualitative guide rather than a single number.
 */

import type { BuildBaseline, MundusStone, StatPackage, UpgradeOption } from './types';

// ─── Mundus base values (gold, CP160) — what the Divines trait amplifies ─────

/**
 * Per-stone gold value and the stat it feeds.
 * Thief (1333 crit rating), Warrior/Apprentice (238 weapon/spell damage) are
 * corroborated across sources (UESP / community guides). Shadow's crit-damage,
 * Lover's penetration, and Mage's max-stat are less consistently documented and
 * remain estimates — confidence: medium. (Banned third-party wiki excluded per
 * repo policy; values cross-checked against UESP / community guides.)
 */
const MUNDUS_VALUE: Record<MundusStone, StatPackage> = {
  thief: { deltaCritRating: 1333 }, // Critical Chance — corroborated
  shadow: { deltaCritDamagePct: 12 }, // Critical Damage — sources give 11–12%
  warrior: { deltaWeaponOrSpellDamage: 238 }, // Weapon Damage — corroborated
  apprentice: { deltaWeaponOrSpellDamage: 238 }, // Spell Damage — corroborated
  lover: { deltaPenetration: 2744 }, // Penetration — estimate
  mage: { deltaMaxStat: 1763 }, // Max Stat — estimate
  other: {}, // Atronach / Serpent / etc. — no offensive contribution
};

/**
 * One gold Divines piece amplifies the slotted Mundus. Community sources cite a
 * 7-piece gold Divines cap of ~+52.5%, i.e. ~7.5% per piece (some report up to
 * 9.1%); UESP's exact per-quality table couldn't be fetched here, so this stays
 * confidence: medium pending the in-game tooltip dump.
 */
const DIVINES_AMP_PER_PIECE = 0.075;

/** Scale a stat package by a scalar (used to turn a Mundus into a Divines step). */
const scalePackage = (pkg: StatPackage, k: number): StatPackage => ({
  deltaWeaponOrSpellDamage: (pkg.deltaWeaponOrSpellDamage ?? 0) * k,
  deltaMaxStat: (pkg.deltaMaxStat ?? 0) * k,
  deltaCritRating: (pkg.deltaCritRating ?? 0) * k,
  deltaCritDamagePct: (pkg.deltaCritDamagePct ?? 0) * k,
  deltaPenetration: (pkg.deltaPenetration ?? 0) * k,
});

/** Divines on one piece = the slotted Mundus value, scaled by the per-piece amp. */
const divinesPackage = (b: BuildBaseline): StatPackage =>
  scalePackage(MUNDUS_VALUE[b.mundus], DIVINES_AMP_PER_PIECE);

// ─── Reference stat magnitudes (gold, CP160) ─────────────────────────────────

/** Max Magicka/Stamina from a main-resource jewelry trait (Arcane/Robust). */
const JEWELRY_MAIN_RESOURCE_MAXSTAT = 1206;
/**
 * Bloodthirsty grants Weapon/Spell Damage against enemies below 90% health
 * (see src/data/esoTraits.ts) — NOT a flat damage-done bonus. Modelling it as a
 * WSD delta routes it through offensive power, so its value correctly depends on
 * the user's own WSD/max-stat baseline. ~225 WSD peak (gold), scaled by the
 * fraction of a fight spent under 90% health (bosses sit there almost always).
 */
const BLOODTHIRSTY_WSD_PEAK = 225;
const BLOODTHIRSTY_SUB90_UPTIME = 0.9;
const BLOODTHIRSTY_WSD_AVG = BLOODTHIRSTY_WSD_PEAK * BLOODTHIRSTY_SUB90_UPTIME;

/** Weapon/Spell Damage from a gold jewelry damage glyph. */
const JEWELRY_WSD_GLYPH = 173;
/** Max-resource glyph values by armor size. */
const BIG_ARMOR_MAXSTAT_GLYPH = 1675;
const SMALL_ARMOR_MAXSTAT_GLYPH = 874;

/** Epic→Legendary per-piece stat step by slot. */
const QUALITY_STEP = {
  bigArmorMaxStat: 83,
  smallArmorMaxStat: 44,
  jewelryWsd: 21,
  weapon1hWsd: 54,
  weapon2hWsd: 108,
} as const;

/**
 * Weapon-trait stat values per bar (gold). These are long-stable ESO values
 * (a fully-traited bar: 2× 1H or a single 2H). Weapon traits are mutually
 * exclusive — you pick ONE per weapon — and only apply on their active bar.
 *   • Sharpened → Physical/Spell Penetration (~3,276/bar).
 *   • Precise   → Critical rating (~1,314/bar ≈ +6% crit chance).
 */
const WEAPON_SHARPENED_PEN = 3276;
const WEAPON_PRECISE_CRIT = 1314;

// ─── Catalog ─────────────────────────────────────────────────────────────────

export const UPGRADE_CATALOG: readonly UpgradeOption[] = [
  // Traits ───────────────────────────────────────────────────────────────────
  {
    id: 'trait-divines-bigArmor',
    group: 'trait',
    change: 'Nothing → Divines',
    slot: 'bigArmor',
    slotLabel: 'Big Armor',
    pkg: divinesPackage,
    confidence: 'medium',
    note: 'Amplifies your slotted Mundus Stone (~6.24%/piece gold). Value depends on the stone.',
  },
  {
    id: 'trait-divines-smallArmor',
    group: 'trait',
    change: 'Nothing → Divines',
    slot: 'smallArmor',
    slotLabel: 'Small Armor',
    pkg: divinesPackage,
    confidence: 'medium',
    note: 'Amplifies your slotted Mundus Stone (~6.24%/piece gold). Value depends on the stone.',
  },
  {
    id: 'trait-bloodthirsty-main',
    group: 'trait',
    change: 'Main Resource → Bloodthirsty',
    slot: 'jewelry',
    slotLabel: 'Jewelry',
    // You give up a max-resource trait that *was* boosting your damage stat.
    pkg: {
      deltaWeaponOrSpellDamage: BLOODTHIRSTY_WSD_AVG,
      deltaMaxStat: -JEWELRY_MAIN_RESOURCE_MAXSTAT,
    },
    confidence: 'low',
    note: 'WSD below 90% health (uptime-averaged), net of losing the Arcane/Robust max-resource it replaces.',
  },
  {
    id: 'trait-bloodthirsty-off',
    group: 'trait',
    change: 'Off Resource → Bloodthirsty',
    slot: 'jewelry',
    slotLabel: 'Jewelry',
    // The off-resource trait contributed nothing to your damage, so no loss.
    pkg: { deltaWeaponOrSpellDamage: BLOODTHIRSTY_WSD_AVG },
    confidence: 'low',
    note: 'WSD below 90% health (uptime-averaged); the off-resource trait gave no damage stat, so the full value lands.',
  },

  // Quality (Epic → Legendary) ─────────────────────────────────────────────────
  {
    id: 'quality-bigArmor',
    group: 'quality',
    change: 'Epic → Legendary',
    slot: 'bigArmor',
    slotLabel: 'Armor (large)',
    pkg: { deltaMaxStat: QUALITY_STEP.bigArmorMaxStat },
    confidence: 'low',
  },
  {
    id: 'quality-smallArmor',
    group: 'quality',
    change: 'Epic → Legendary',
    slot: 'smallArmor',
    slotLabel: 'Armor (small)',
    pkg: { deltaMaxStat: QUALITY_STEP.smallArmorMaxStat },
    confidence: 'low',
  },
  {
    id: 'quality-jewelry',
    group: 'quality',
    change: 'Epic → Legendary',
    slot: 'jewelry',
    slotLabel: 'Jewelry',
    pkg: { deltaWeaponOrSpellDamage: QUALITY_STEP.jewelryWsd },
    confidence: 'low',
  },
  {
    id: 'quality-mainHand1H',
    group: 'quality',
    change: 'Epic → Legendary',
    slot: 'mainHand1H',
    slotLabel: 'Main Hand (front bar)',
    pkg: { deltaWeaponOrSpellDamage: QUALITY_STEP.weapon1hWsd },
    bar: 'front',
    confidence: 'low',
    note: 'A weapon only boosts damage while its bar is active, so this is weighted by your front-bar damage share.',
  },
  {
    id: 'quality-offHand1H',
    group: 'quality',
    change: 'Epic → Legendary',
    slot: 'offHand1H',
    slotLabel: 'Off Hand (front bar)',
    pkg: { deltaWeaponOrSpellDamage: QUALITY_STEP.weapon1hWsd },
    bar: 'front',
    confidence: 'low',
    note: 'Weighted by your front-bar damage share — it only applies while the front bar is active.',
  },
  {
    id: 'quality-frontBar2H',
    group: 'quality',
    change: 'Epic → Legendary',
    slot: 'frontBar2H',
    slotLabel: 'Front Bar (2H)',
    pkg: { deltaWeaponOrSpellDamage: QUALITY_STEP.weapon2hWsd },
    bar: 'front',
    confidence: 'low',
    note: 'Weighted by your front-bar damage share — it only applies while the front bar is active.',
  },
  {
    id: 'quality-backBar2H',
    group: 'quality',
    change: 'Epic → Legendary',
    slot: 'backBar2H',
    slotLabel: 'Back Bar (2H)',
    pkg: { deltaWeaponOrSpellDamage: QUALITY_STEP.weapon2hWsd },
    bar: 'back',
    confidence: 'low',
    note: 'Back-bar weapons mostly boost back-bar DoTs, so this is weighted by your back-bar damage share.',
  },

  // Weapon traits (pen / crit) ─────────────────────────────────────────────────
  // Mutually exclusive — pick one trait per weapon — and only apply on their bar.
  {
    id: 'trait-sharpened-front',
    group: 'trait',
    change: 'Nothing → Sharpened',
    slot: 'frontBar2H',
    slotLabel: 'Front Bar Weapon',
    pkg: { deltaPenetration: WEAPON_SHARPENED_PEN },
    bar: 'front',
    confidence: 'medium',
    note: 'Weapon trait (pick one per weapon): ~3,276 penetration on the front bar. Reads "at cap" once you hit the pen cap.',
  },
  {
    id: 'trait-sharpened-back',
    group: 'trait',
    change: 'Nothing → Sharpened',
    slot: 'backBar2H',
    slotLabel: 'Back Bar Weapon',
    pkg: { deltaPenetration: WEAPON_SHARPENED_PEN },
    bar: 'back',
    confidence: 'medium',
    note: 'Weapon trait (pick one per weapon): ~3,276 penetration, weighted by your back-bar damage share.',
  },
  {
    id: 'trait-precise-front',
    group: 'trait',
    change: 'Nothing → Precise',
    slot: 'frontBar2H',
    slotLabel: 'Front Bar Weapon',
    pkg: { deltaCritRating: WEAPON_PRECISE_CRIT },
    bar: 'front',
    confidence: 'medium',
    note: 'Weapon trait (pick one per weapon): ~1,314 crit rating (~6% crit chance) on the front bar.',
  },
  {
    id: 'trait-precise-back',
    group: 'trait',
    change: 'Nothing → Precise',
    slot: 'backBar2H',
    slotLabel: 'Back Bar Weapon',
    pkg: { deltaCritRating: WEAPON_PRECISE_CRIT },
    bar: 'back',
    confidence: 'medium',
    note: 'Weapon trait (pick one per weapon): ~1,314 crit rating, weighted by your back-bar damage share.',
  },

  // Enchants ───────────────────────────────────────────────────────────────────
  {
    id: 'enchant-wsd-jewelry',
    group: 'enchant',
    change: 'Any → Weapon/Spell Dmg',
    slot: 'jewelry',
    slotLabel: 'Jewelry',
    pkg: { deltaWeaponOrSpellDamage: JEWELRY_WSD_GLYPH },
    confidence: 'medium',
  },
  {
    id: 'enchant-mainResource-bigArmor',
    group: 'enchant',
    change: 'Off Resource → Main Resource',
    slot: 'bigArmor',
    slotLabel: 'Big Armor',
    pkg: { deltaMaxStat: BIG_ARMOR_MAXSTAT_GLYPH },
    confidence: 'medium',
  },
  {
    id: 'enchant-mainResource-smallArmor',
    group: 'enchant',
    change: 'Off Resource → Main Resource',
    slot: 'smallArmor',
    slotLabel: 'Small Armor',
    pkg: { deltaMaxStat: SMALL_ARMOR_MAXSTAT_GLYPH },
    confidence: 'medium',
  },
];

// ─── Qualitative front-bar weapon-trait guide ────────────────────────────────

export interface WeaponTraitGuideRow {
  scenario: string;
  weaponType: string;
  recommendation: string;
}

/**
 * Front-bar weapon traits depend on status-effect uptime and rotation, which a
 * stat snapshot can't capture — so this is guidance, not a computed number
 * (the reference table punts on these too).
 */
export const WEAPON_TRAIT_GUIDE: readonly WeaponTraitGuideRow[] = [
  {
    scenario: 'Single Target Boss (non-Beam)',
    weaponType: 'Dual Wield',
    recommendation: 'Charged / Charged',
  },
  {
    scenario: 'General (Beam single target)',
    weaponType: 'Dual Wield',
    recommendation: 'Nirnhoned / Charged',
  },
  {
    scenario: 'AoE / Trash (Beam general)',
    weaponType: 'Dual Wield',
    recommendation: 'Nirnhoned / Precise',
  },
  {
    scenario: 'Non-Daggers',
    weaponType: 'Staff / Bow / 2H',
    recommendation: 'Precise',
  },
];

export const GUIDE_INTRO =
  "It's hard to quantify exact damage differences between Nirnhoned, Charged, and Precise " +
  'front-bar weapons. Use this as a general guide for each fight scenario.';
