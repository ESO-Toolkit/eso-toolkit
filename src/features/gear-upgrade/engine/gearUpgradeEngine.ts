/**
 * Gear Upgrade Optimizer — engine
 *
 * Pure, dependency-free marginal-DPS math. Reuses the sourced ESO constants
 * already defined for the build-editor stat engine so the two never drift.
 *
 * Model — relative damage of an average hit:
 *
 *   D = offensivePower × critMultiplier × mitigationMultiplier × damageDone
 *
 *   offensivePower    = maxStat + WD_TO_STAT × weaponOrSpellDamage
 *   critMultiplier    = 1 + critChance × (critDamageMultiplier − 1)
 *   mitigationMult    = 1 − effectiveResist / MITIGATION_DIVISOR
 *   damageDone        = Π (1 + bonus)
 *
 * For a single gear change every untouched factor and the skill's own
 * coefficient cancel in the after/before ratio, so the marginal DPS is exact
 * regardless of which skill you cast:
 *
 *   marginal% = D(after) / D(before) − 1
 */

import {
  ARMOR_CAP,
  CRIT_CHANCE_DIVISOR,
  CRIT_DMG_CAPS,
} from '@/features/build-editor/engine/stat-constants';

import type { BuildBaseline, StatPackage, UpgradeOption, UpgradeResult } from './types';

/**
 * Tooltip scaling: 1 point of Weapon/Spell Damage is worth WD_TO_STAT points of
 * Max Stat in ability damage. This 10.5 ratio is the long-standing, widely
 * reproduced ESO value (derived from the additive ability-damage coefficients).
 */
export const WD_TO_STAT = 10.5;

/**
 * Resistance → mitigation: ARMOR_CAP (33,100) resist = 50% mitigation, so the
 * mitigation fraction is effectiveResist / (2 × ARMOR_CAP). Derived from the
 * shared cap so it can never disagree with the rest of the calculator.
 */
export const MITIGATION_DIVISOR = ARMOR_CAP * 2;

const clamp = (n: number, lo: number, hi: number): number => Math.min(hi, Math.max(lo, n));

/** Relative damage factor for a baseline (units are arbitrary; only ratios matter). */
export function relativeDamage(b: BuildBaseline): number {
  const offensivePower = Math.max(0, b.maxStat) + WD_TO_STAT * Math.max(0, b.weaponOrSpellDamage);

  const critChance = clamp(b.critChancePct, 0, 100) / 100;
  // Crit damage is capped at 125% total in-game (base crits already do +50%), but
  // some passives raise the cap (e.g. NB Above and Beyond → 155). Honour the
  // build's cap so crit-damage upgrades aren't clamped to 0 prematurely.
  const critDamageCap = b.critDamageCapPct ?? CRIT_DMG_CAPS.cap;
  const critDamageMultiplier = 1 + clamp(b.critDamagePct, 0, critDamageCap) / 100;
  const critMultiplier = 1 + critChance * (critDamageMultiplier - 1);

  const effectiveResist = Math.max(0, b.targetResistance - b.penetration);
  const mitigationMultiplier = 1 - effectiveResist / MITIGATION_DIVISOR;

  return offensivePower * critMultiplier * mitigationMultiplier;
}

/** Apply a stat delta to a baseline, returning a new baseline (pure). */
export function applyPackage(b: BuildBaseline, pkg: StatPackage): BuildBaseline {
  const critChanceFromRating = (pkg.deltaCritRating ?? 0) / CRIT_CHANCE_DIVISOR;
  return {
    ...b,
    weaponOrSpellDamage: b.weaponOrSpellDamage + (pkg.deltaWeaponOrSpellDamage ?? 0),
    maxStat: b.maxStat + (pkg.deltaMaxStat ?? 0),
    critChancePct: clamp(b.critChancePct + critChanceFromRating, 0, 100),
    critDamagePct: b.critDamagePct + (pkg.deltaCritDamagePct ?? 0),
    penetration: b.penetration + (pkg.deltaPenetration ?? 0),
  };
}

/** Resolve an option's package (Mundus-dependent options are functions). */
function resolvePackage(option: UpgradeOption, baseline: BuildBaseline): StatPackage {
  return typeof option.pkg === 'function' ? option.pkg(baseline) : option.pkg;
}

/**
 * Marginal DPS of one upgrade, as a percentage (0.32 ⇒ +0.32%).
 * "Damage done" deltas multiply the whole result; stat deltas flow through the
 * damage factor.
 */
/**
 * Fraction of total damage that benefits from an upgrade. Weapon stats only
 * apply while their bar is active, so a weapon upgrade is worth the share of
 * your damage dealt on that bar. Always-equipped jewelry/armor (no `bar`) and
 * builds that haven't set a front-bar share are unweighted (1).
 */
function damageShare(option: UpgradeOption, baseline: BuildBaseline): number {
  if (!option.bar) return 1;
  const front = baseline.frontBarDamageShare;
  if (front == null) return 1;
  const f = clamp(front, 0, 1);
  return option.bar === 'front' ? f : 1 - f;
}

export function marginalDpsPct(option: UpgradeOption, baseline: BuildBaseline): number {
  const pkg = resolvePackage(option, baseline);
  const before = relativeDamage(baseline);
  if (before <= 0) return 0;

  const after = relativeDamage(applyPackage(baseline, pkg));
  const damageDoneFactor = 1 + (pkg.deltaDamageDonePct ?? 0) / 100;

  return ((after * damageDoneFactor) / before - 1) * 100 * damageShare(option, baseline);
}

/**
 * Compute every quantifiable upgrade for a build, sorted by marginal DPS
 * (highest first). Qualitative options (status-effect / front-bar traits) are
 * excluded — they belong in the qualitative guide.
 */
export function computeUpgrades(
  options: readonly UpgradeOption[],
  baseline: BuildBaseline,
): UpgradeResult[] {
  return options
    .filter((o) => !o.qualitative)
    .map((o) => ({ ...o, dmgIncreasePct: marginalDpsPct(o, baseline) }))
    .sort((a, b) => b.dmgIncreasePct - a.dmgIncreasePct);
}
