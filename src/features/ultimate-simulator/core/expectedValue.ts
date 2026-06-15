/**
 * Closed-form expected-value engine — the calculator's primary path.
 *
 * For a *calculator* the user wants an exact, instant answer ("X ult/s → fills
 * in Y s"), not a wobbling estimate. By linearity of expectation the mean
 * ultimate generation is exact in closed form — no seeds, no iteration:
 *
 *   E[total] = Σ_sources E[instances] × (amountPerInstance
 *                                        + rollsDecisive · rollsPerInstance · procChance)
 *   E[instances] = instancesPerSecond × duration × uptime
 *
 * This matches `runMonteCarlo`'s mean to within its standard error (verified to
 * ~0.001% over 200k runs). Monte Carlo is retained only for the *distribution*
 * (variance / confidence interval / min-max), which closed form cannot give.
 *
 * Everything here is class-agnostic: it operates on the generic source model, so
 * the same engine drives Arcanist, every other class, or a fully custom build.
 */

import type {
  DecisiveConfig,
  ExpectedValueResult,
  SimulationConfig,
  SourceContribution,
  TimeToUltimateInput,
  TimeToUltimateResult,
  UltimateSource,
} from '../shared/types';

/** Expected number of ult-gain instances a source emits over the fight. */
export function expectedInstances(source: UltimateSource, durationSeconds: number): number {
  const expected = source.instancesPerSecond * durationSeconds * source.uptime;
  return expected > 0 ? expected : 0;
}

/**
 * Expected Decisive bonus ultimate per ult-gain instance for a given weapon.
 *
 * Each instance rolls `rollsPerInstance` independent Bernoulli(+1) trials at
 * `procChance`, so the per-instance expectation is `rollsPerInstance · procChance`
 * (the mean of a Binomial(rollsPerInstance, procChance) — identical whether you
 * model 2H as two +1 rolls or as a doubled rate; only the variance differs, which
 * is why the closed-form mean is exact).
 */
export function expectedDecisivePerInstance(decisive: DecisiveConfig | null): number {
  if (!decisive) return 0;
  return decisive.rollsPerInstance * decisive.procChance;
}

/**
 * Exact expected ultimate generation over the fight (and per second), with a
 * per-source breakdown split into base vs Decisive contribution.
 */
export function expectedValue(config: Omit<SimulationConfig, 'seed'>): ExpectedValueResult {
  const { fightDurationSeconds, sources, decisive } = config;
  const decisivePerInstance = expectedDecisivePerInstance(decisive);

  const contributions: SourceContribution[] = [];
  let baseUltimate = 0;
  let decisiveUltimate = 0;

  for (const source of sources) {
    const instances = expectedInstances(source, fightDurationSeconds);
    const base = instances * source.amountPerInstance;
    const bonus = source.rollsDecisive ? instances * decisivePerInstance : 0;

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
  // Sort the breakdown by total contribution descending so the dominant sources
  // surface first in the UI.
  contributions.sort(
    (a, b) => b.baseUltimate + b.decisiveUltimate - (a.baseUltimate + a.decisiveUltimate),
  );

  return {
    totalUltimate,
    baseUltimate,
    decisiveUltimate,
    ultimatePerSecond: fightDurationSeconds > 0 ? totalUltimate / fightDurationSeconds : 0,
    contributions,
  };
}

/**
 * Time-to-ultimate: the raid/dungeon-useful output. Given an ultimate's effective
 * cost and a generation rate, how long until it's ready and how many casts fit in
 * the fight.
 *
 * `ultimatePerSecond` is the steady-state generation rate (from `expectedValue`).
 * `effectiveCost` is the ultimate's cost AFTER any cost reduction (the caller
 * applies reductions; see `applyCostReduction`). The first cast is gated by the
 * full cost from zero; subsequent casts refill from zero at the same rate, so
 * casts-per-fight is `floor((duration · rate) / cost) ` once enough total ult is
 * generated — equivalently `floor(totalGenerated / cost)`.
 */
export function timeToUltimate(input: TimeToUltimateInput): TimeToUltimateResult {
  const { effectiveCost, ultimatePerSecond, fightDurationSeconds, startingUltimate = 0 } = input;

  const cost = Math.max(0, effectiveCost);
  const rate = Math.max(0, ultimatePerSecond);
  const duration = Math.max(0, fightDurationSeconds);
  const start = Math.min(Math.max(0, startingUltimate), cost);

  // Time to the FIRST cast, accounting for any ultimate already banked.
  const remainingForFirst = Math.max(0, cost - start);
  const secondsToFirstCast = rate > 0 ? remainingForFirst / rate : Infinity;

  // Total ultimate generated over the whole fight (excludes the starting pool —
  // that only accelerates the first cast).
  const totalGenerated = rate * duration;

  // Casts that complete within the fight: the first cast consumes
  // `remainingForFirst` from generation, each subsequent cast consumes a full
  // `cost`. So castable = floor((generated - remainingForFirst)/cost) + 1 once
  // the first cast is affordable, else 0.
  let castsPerFight = 0;
  if (cost <= 0) {
    castsPerFight = Infinity;
  } else if (totalGenerated >= remainingForFirst) {
    castsPerFight = Math.floor((totalGenerated - remainingForFirst) / cost) + 1;
  }

  // Seconds between subsequent casts at steady state (full cost from zero).
  const secondsPerCast = rate > 0 ? cost / rate : Infinity;

  return {
    effectiveCost: cost,
    ultimatePerSecond: rate,
    secondsToFirstCast,
    secondsPerCast,
    castsPerFight,
    totalGenerated,
  };
}
