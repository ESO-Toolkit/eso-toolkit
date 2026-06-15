/**
 * Monte Carlo runner: estimate expected ultimate generation by averaging many
 * deterministic single-fight simulations.
 *
 * This replaces the original spreadsheet's "rolling average of 100 sims that
 * recalculates on edit". Two improvements over the sheet:
 *   1. Far more runs (default 10k) shrink the standard error so the displayed
 *      mean no longer visibly wobbles (the sheet's 100-run mean had SE ≈ ±1).
 *   2. A base seed makes the whole estimate reproducible — same config + base
 *      seed => identical aggregate.
 */

import type { SimulationConfig, MonteCarloResult, SourceContribution } from '../shared/types';

import { simulateFight } from './simulate';

const Z_95 = 1.959963984540054; // two-sided 95% normal quantile

export interface MonteCarloOptions {
  /** Number of fight simulations to average. */
  readonly runs: number;
  /** Base seed; run i uses seed = baseSeed + i. */
  readonly baseSeed: number;
}

export function runMonteCarlo(
  config: Omit<SimulationConfig, 'seed'>,
  options: MonteCarloOptions,
): MonteCarloResult {
  const runs = Math.max(1, Math.floor(options.runs));

  let sum = 0;
  let sumSq = 0;
  let minTotal = Infinity;
  let maxTotal = -Infinity;

  // Accumulate per-source contributions to report a mean breakdown.
  const baseBySource = new Map<
    string,
    { label: string; base: number; decisive: number; instances: number }
  >();

  for (let i = 0; i < runs; i += 1) {
    const result = simulateFight({ ...config, seed: options.baseSeed + i });
    const total = result.totalUltimate;
    sum += total;
    sumSq += total * total;
    if (total < minTotal) minTotal = total;
    if (total > maxTotal) maxTotal = total;

    for (const c of result.contributions) {
      const acc = baseBySource.get(c.sourceId) ?? {
        label: c.label,
        base: 0,
        decisive: 0,
        instances: 0,
      };
      acc.base += c.baseUltimate;
      acc.decisive += c.decisiveUltimate;
      acc.instances += c.instances;
      baseBySource.set(c.sourceId, acc);
    }
  }

  const meanTotal = sum / runs;
  // Population variance: E[X^2] - E[X]^2, floored at 0 against float error.
  const variance = Math.max(0, sumSq / runs - meanTotal * meanTotal);
  const stdDevTotal = Math.sqrt(variance);
  const standardError = stdDevTotal / Math.sqrt(runs);

  const contributions: SourceContribution[] = Array.from(baseBySource.entries()).map(
    ([sourceId, acc]) => ({
      sourceId,
      label: acc.label,
      baseUltimate: acc.base / runs,
      decisiveUltimate: acc.decisive / runs,
      instances: acc.instances / runs,
    }),
  );

  const fightDuration = config.fightDurationSeconds;

  return {
    runs,
    meanTotal,
    meanPerSecond: fightDuration > 0 ? meanTotal / fightDuration : 0,
    stdDevTotal,
    standardError,
    ci95HalfWidth: Z_95 * standardError,
    minTotal: Number.isFinite(minTotal) ? minTotal : 0,
    maxTotal: Number.isFinite(maxTotal) ? maxTotal : 0,
    contributions,
  };
}
