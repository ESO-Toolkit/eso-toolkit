/**
 * Single-fight ultimate simulation.
 *
 * Each source emits a whole number of "ultimate gain instances" over the fight.
 * On every instance, the Decisive weapon trait rolls one Bernoulli trial per
 * `rollsPerInstance` for a bonus +1 ultimate — this is the real ESO mechanic
 * (Decisive procs per instance of ultimate gain, not per attack). Because proc
 * counts are integer and binomial, a single fight is noisy; the Monte Carlo
 * runner (see monteCarlo.ts) averages many fights to estimate the expectation.
 */

import type {
  SimulationConfig,
  SimulationResult,
  SourceContribution,
  UltimateSource,
  DecisiveConfig,
} from '../shared/types';

import { createRng, Rng } from './rng';

/**
 * Resolve how many ult-gain instances a source emits over the fight.
 *
 * The expected count is `instancesPerSecond * duration * uptime`. The integer
 * part is deterministic; the fractional remainder is realized as one extra
 * instance with probability equal to the fraction (so the long-run mean matches
 * the expectation exactly while keeping per-fight counts integer).
 */
function resolveInstances(source: UltimateSource, durationSeconds: number, rng: Rng): number {
  const expected = source.instancesPerSecond * durationSeconds * source.uptime;
  if (expected <= 0) return 0;
  const whole = Math.floor(expected);
  const frac = expected - whole;
  return whole + (rng.chance(frac) ? 1 : 0);
}

/** Count Decisive bonus ult granted across `instances` ult-gain instances. */
function rollDecisive(
  instances: number,
  decisive: DecisiveConfig | null,
  rollsDecisive: boolean,
  rng: Rng,
): number {
  if (!decisive || !rollsDecisive || instances <= 0) return 0;
  let bonus = 0;
  for (let i = 0; i < instances; i += 1) {
    for (let r = 0; r < decisive.rollsPerInstance; r += 1) {
      if (rng.chance(decisive.procChance)) bonus += 1;
    }
  }
  return bonus;
}

/**
 * Run one deterministic simulation of the fight.
 *
 * Same `config` (including `seed`) always returns an identical result.
 */
export function simulateFight(config: SimulationConfig): SimulationResult {
  const rng = createRng(config.seed);
  const { fightDurationSeconds, sources, decisive } = config;

  const contributions: SourceContribution[] = [];
  let baseUltimate = 0;
  let decisiveUltimate = 0;

  for (const source of sources) {
    const instances = resolveInstances(source, fightDurationSeconds, rng);
    const base = instances * source.amountPerInstance;
    const bonus = rollDecisive(instances, decisive, source.rollsDecisive, rng);

    baseUltimate += base;
    decisiveUltimate += bonus;
    contributions.push({
      sourceId: source.id,
      label: source.label,
      baseUltimate: base,
      decisiveUltimate: bonus,
      instances,
    });
  }

  const totalUltimate = baseUltimate + decisiveUltimate;
  return {
    totalUltimate,
    baseUltimate,
    decisiveUltimate,
    ultimatePerSecond: fightDurationSeconds > 0 ? totalUltimate / fightDurationSeconds : 0,
    contributions,
  };
}
