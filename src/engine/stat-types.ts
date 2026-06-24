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

// ─── Survivability (health + EHP) ───────────────────────────────────────────

/**
 * One resistance channel (physical or spell): its total resistance, the damage
 * mitigation fraction it yields, and the resulting Effective HP.
 */
export interface ResistanceProfile {
  /** Total resistance for this channel (base gear armor + modeled additions). */
  resistance: number;
  /** Damage mitigation fraction in [0, 0.5] from the 660-per-1% curve (50% cap). */
  mitigation: number;
  /** Effective HP for this channel = health / (1 − mitigation), rounded. */
  ehp: number;
}

/**
 * Survivability bundle. `health` and `resistance` are additive StatResults
 * (inspectable breakdowns); `physical` / `spell` are the two EHP channels.
 *
 * Under the current model physical and spell resistance are symmetric (gear armor
 * adds to both equally), so the two channels are usually equal — the split is kept
 * so a future phys/spell-specific source can diverge them without an API change.
 */
export interface Survivability {
  health: StatResult;
  resistance: StatResult;
  physical: ResistanceProfile;
  spell: ResistanceProfile;
}

// ─── Full build stats bundle ────────────────────────────────────────────────

export interface BuildStats {
  penetration: StatResult;
  critDamage: StatResult;
  critChance: StatResult;
  armor: StatResult;
  /** Max Health pool — additive breakdown (base + attributes + race + mundus + class). */
  health: StatResult;
  /**
   * Effective HP. `total` is the worst-case (lower of physical/spell) EHP; `items`
   * carry the per-channel Physical/Spell EHP (informational, not summed). For the
   * full split + mitigation use `calculateSurvivability`.
   */
  ehp: StatResult;
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
