/**
 * Ultimate cost reduction.
 *
 * ESO ultimate-cost reductions are percentage reductions that stack
 * multiplicatively (each applies to the already-reduced cost), so a 10% and a
 * 15% reduction together leave 0.90 × 0.85 = 76.5% of the base cost, not 75%.
 * This module encodes only that arithmetic — the actual reduction sources and
 * their values live in the data catalog (research-sourced), not here.
 */

/** A single named ultimate-cost reduction (fraction in [0,1]; 0.10 = −10%). */
export interface CostReduction {
  readonly id: string;
  readonly label: string;
  /** Fraction of cost removed, 0..1. */
  readonly fraction: number;
  /** Whether the reduction is currently active. */
  readonly enabled: boolean;
}

/**
 * Apply a set of multiplicative cost reductions to a base ultimate cost.
 *
 * Only `enabled` reductions count. The result is rounded to the nearest whole
 * ultimate (ESO costs are integers) and floored at 0.
 */
export function applyCostReduction(
  baseCost: number,
  reductions: readonly CostReduction[],
): number {
  const base = Math.max(0, baseCost);
  let multiplier = 1;
  for (const r of reductions) {
    if (!r.enabled) continue;
    const f = Math.min(1, Math.max(0, r.fraction));
    multiplier *= 1 - f;
  }
  return Math.max(0, Math.round(base * multiplier));
}

/** Total effective reduction fraction from a set of reductions (for display). */
export function totalReductionFraction(reductions: readonly CostReduction[]): number {
  let multiplier = 1;
  for (const r of reductions) {
    if (!r.enabled) continue;
    multiplier *= 1 - Math.min(1, Math.max(0, r.fraction));
  }
  return 1 - multiplier;
}
