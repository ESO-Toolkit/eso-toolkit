/**
 * Core type vocabulary for the Arcanist Ultimate Simulator.
 *
 * The model: an Arcanist in a realistic raid context accumulates ultimate from
 * several SOURCES over a fixed fight duration. Each source emits discrete
 * "ultimate gain instances" on its own cadence. The Decisive weapon trait then
 * rolls a separate Bernoulli trial on EVERY such instance for a bonus +1 ult.
 *
 * See .scratch/ult-sim-research.md for the mechanics this encodes.
 */

/** How a source places its ultimate-gain instances on the fight timeline. */
export type SourceKind =
  /**
   * A buff/effect that grants a flat ult amount on a fixed cadence while active,
   * gated by an uptime fraction (e.g. Minor Heroism: 1 ult / 1.5s at 95% uptime).
   * This is the dominant raid-support shape.
   */
  | 'periodic'
  /**
   * A flat ult amount granted on a trigger with an internal cooldown
   * (e.g. Implacable Outcome: +4 ult on Crux consume, max once / 8s).
   */
  | 'triggered'
  /**
   * Discrete casts placed on the timeline, each its own event
   * (the per-cast model — e.g. an ult-battery proc landing on the Arcanist).
   */
  | 'perCast';

/**
 * A single ultimate-generation source feeding the modeled Arcanist.
 *
 * `amountPerInstance` is the raw ult granted by ONE instance. `instancesPerSecond`
 * is the long-run cadence (before uptime). `uptime` scales how often the source is
 * actually active over the fight (1 = always). `rollsDecisive` controls whether the
 * Decisive trait gets to roll on each instance this source emits (base/Heroism ticks
 * do; some external proc sources may not — calibration decides).
 */
export interface UltimateSource {
  readonly id: string;
  readonly label: string;
  readonly kind: SourceKind;
  /** Raw ultimate granted by a single instance, before Decisive. */
  readonly amountPerInstance: number;
  /** Instances per second at full activity (e.g. 1/1.5 for a 1.5s ticker). */
  readonly instancesPerSecond: number;
  /** Fraction of the fight the source is active (0..1). */
  readonly uptime: number;
  /** Whether Decisive rolls a bonus on each instance from this source. */
  readonly rollsDecisive: boolean;
  /** Optional note surfaced in the UI (e.g. "from raid healer's Pillager's Profit"). */
  readonly note?: string;
}

/** Weapon configuration governing how Decisive rolls. */
export interface DecisiveConfig {
  /**
   * Per-instance proc chance for +1 ultimate (0..1). By weapon quality:
   * Fine .191 / Superior .212 / Epic .233 / Legendary .254 (some sources .275).
   */
  readonly procChance: number;
  /**
   * Number of independent rolls per ult-gain instance. 1H/staff/bow = 1;
   * 2H melee = 2 (ESO grants 2H "twice the bonus").
   */
  readonly rollsPerInstance: number;
}

/** Everything needed to run one simulation of a fight. */
export interface SimulationConfig {
  readonly fightDurationSeconds: number;
  readonly sources: readonly UltimateSource[];
  readonly decisive: DecisiveConfig | null;
  /** Deterministic seed; same seed + config => identical result. */
  readonly seed: number;
}

/** Per-source contribution breakdown from a run or aggregate. */
export interface SourceContribution {
  readonly sourceId: string;
  readonly label: string;
  /** Raw ult from the source itself (excludes Decisive bonus). */
  readonly baseUltimate: number;
  /** Bonus ult attributable to Decisive procs on this source's instances. */
  readonly decisiveUltimate: number;
  /** Number of ult-gain instances this source emitted. */
  readonly instances: number;
}

/** Result of a single deterministic fight simulation. */
export interface SimulationResult {
  readonly totalUltimate: number;
  readonly baseUltimate: number;
  readonly decisiveUltimate: number;
  readonly ultimatePerSecond: number;
  readonly contributions: readonly SourceContribution[];
}

/** Aggregate of many simulations (the Monte Carlo estimate). */
export interface MonteCarloResult {
  readonly runs: number;
  /** Mean total ultimate over the fight across all runs. */
  readonly meanTotal: number;
  /** Mean ultimate per second. */
  readonly meanPerSecond: number;
  /** Population standard deviation of total ultimate. */
  readonly stdDevTotal: number;
  /** Standard error of the mean (stdDev / sqrt(runs)). */
  readonly standardError: number;
  /** 95% confidence-interval half-width on the mean (≈1.96 * SE). */
  readonly ci95HalfWidth: number;
  readonly minTotal: number;
  readonly maxTotal: number;
  /** Mean per-source contribution across runs. */
  readonly contributions: readonly SourceContribution[];
}

/**
 * Exact closed-form expectation of ultimate generation over the fight.
 *
 * This is the calculator's headline result — same shape as a single
 * `SimulationResult`, but every value is the true mean (no sampling noise), so
 * it never wobbles between recomputes. `contributions` are sorted by total
 * contribution descending.
 */
export interface ExpectedValueResult {
  readonly totalUltimate: number;
  readonly baseUltimate: number;
  readonly decisiveUltimate: number;
  readonly ultimatePerSecond: number;
  readonly contributions: readonly SourceContribution[];
}

/** Inputs to the time-to-ultimate computation. */
export interface TimeToUltimateInput {
  /** Ultimate cost AFTER any cost reduction has been applied. */
  readonly effectiveCost: number;
  /** Steady-state ultimate generation rate (ult / second). */
  readonly ultimatePerSecond: number;
  /** Fight length, for casts-per-fight. */
  readonly fightDurationSeconds: number;
  /** Ultimate already banked at the start (0..effectiveCost). Default 0. */
  readonly startingUltimate?: number;
}

/** Result of the time-to-ultimate computation. */
export interface TimeToUltimateResult {
  readonly effectiveCost: number;
  readonly ultimatePerSecond: number;
  /** Seconds until the first cast is affordable (∞ if rate is 0). */
  readonly secondsToFirstCast: number;
  /** Steady-state seconds between casts (cost / rate; ∞ if rate is 0). */
  readonly secondsPerCast: number;
  /** Number of casts that complete within the fight (∞ if cost is 0). */
  readonly castsPerFight: number;
  /** Total ultimate generated over the whole fight (rate × duration). */
  readonly totalGenerated: number;
}
