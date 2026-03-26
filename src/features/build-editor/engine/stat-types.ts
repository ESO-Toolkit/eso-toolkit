/**
 * Stat Engine Types
 * Pure type definitions for the build stats calculator.
 * No runtime dependencies — used by both engine and UI layers.
 */

// ─── Source categories ──────────────────────────────────────────────────────

export type StatSource = 'base' | 'race' | 'class' | 'mundus' | 'gear' | 'passive' | 'cp' | 'buff';

// ─── Individual stat contribution ───────────────────────────────────────────

export interface StatItem {
  /** Display name (e.g. "Major Breach", "Light Armor (3pc)") */
  name: string;
  /** Computed value (flat number for pen/armor, percentage for crit dmg/chance) */
  value: number;
  /** Where this contribution comes from */
  source: StatSource;
  /** Whether this item is currently active */
  enabled: boolean;
  /** True for percentage-based values (crit damage %, crit chance %) */
  isPercent?: boolean;
  /** True if derived from build state, false if manually toggled */
  autoDetected?: boolean;
}

// ─── Aggregated stat result ─────────────────────────────────────────────────

export type StatStatus = 'under' | 'optimal' | 'over';

export interface StatResult {
  /** Sum of all enabled items */
  total: number;
  /** Target cap (e.g. 18200 pen PvE, 125% crit dmg) */
  cap: number;
  /** Upper bound of "optimal" range before truly over-capping */
  maxCap: number;
  /** under / optimal / over relative to cap and maxCap */
  status: StatStatus;
  /** Breakdown of every contributing source */
  items: StatItem[];
}

// ─── Full build stats bundle ────────────────────────────────────────────────

export interface BuildStats {
  penetration: StatResult;
  critDamage: StatResult;
  critChance: StatResult;
  armor: StatResult;
}

// ─── User-controlled overrides ──────────────────────────────────────────────

export interface StatOverrides {
  /** Toggle map: buff/item name → enabled. Names match stat-constants keys. */
  buffs: Record<string, boolean>;
  /** Light armor piece count (0–7) for Concentration passive */
  lightArmorCount: number;
  /** Medium armor piece count (0–7) for Dexterity passive */
  mediumArmorCount: number;
  /** Weapon damage for Anthelmir calculation (pen = WD / 2.5) */
  weaponDamage: number;
  /** Ultimate cost for Balorgh calculation (pen = ult × 23) */
  balorghUltimate: number;
}
