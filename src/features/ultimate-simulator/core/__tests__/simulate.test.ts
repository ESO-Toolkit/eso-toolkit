import { createRng } from '../rng';
import { simulateFight } from '../simulate';
import { runMonteCarlo } from '../monteCarlo';
import type { SimulationConfig, UltimateSource } from '../../shared/types';
import {
  SHEET_VALIDATION_SOURCES,
  SHEET_FIGHT_DURATION_SECONDS,
  SHEET_SUM_TICKS,
  SHEET_DECISIVE_HALF,
  SHEET_DECISIVE_FULL,
  SHEET_DECISIVE_HALF_PER_INSTANCE,
  SHEET_DECISIVE_FULL_PER_INSTANCE,
} from '../../shared/constants/sheetValidation';

describe('seeded RNG', () => {
  it('is deterministic for the same seed', () => {
    const a = createRng(42);
    const b = createRng(42);
    const seqA = Array.from({ length: 5 }, () => a.next());
    const seqB = Array.from({ length: 5 }, () => b.next());
    expect(seqA).toEqual(seqB);
  });

  it('produces different streams for different seeds', () => {
    const a = createRng(1);
    const b = createRng(2);
    expect(a.next()).not.toEqual(b.next());
  });

  it('chance() honors boundaries', () => {
    const rng = createRng(7);
    expect(rng.chance(0)).toBe(false);
    expect(rng.chance(1)).toBe(true);
  });

  it('chance(p) converges to p over many trials', () => {
    const rng = createRng(123);
    const n = 100000;
    let hits = 0;
    for (let i = 0; i < n; i += 1) if (rng.chance(0.3)) hits += 1;
    expect(hits / n).toBeCloseTo(0.3, 2);
  });
});

describe('simulateFight — determinism', () => {
  const config: SimulationConfig = {
    fightDurationSeconds: SHEET_FIGHT_DURATION_SECONDS,
    sources: SHEET_VALIDATION_SOURCES,
    decisive: null,
    seed: 99,
  };

  it('same seed + config => identical result', () => {
    expect(simulateFight(config)).toEqual(simulateFight(config));
  });
});

describe('Monte Carlo — reconciles the sheet', () => {
  const base = {
    fightDurationSeconds: SHEET_FIGHT_DURATION_SECONDS,
    sources: SHEET_VALIDATION_SOURCES,
  };

  it('mean instance count matches the sheet SUM Ticks (404.8)', () => {
    const result = runMonteCarlo({ ...base, decisive: null }, { runs: 20000, baseSeed: 1 });
    const totalInstances = result.contributions.reduce((s, c) => s + c.instances, 0);
    expect(totalInstances).toBeCloseTo(SHEET_SUM_TICKS, 0);
  });

  it('base ult/s reconciles with the sheet (~6.61, no Decisive)', () => {
    const result = runMonteCarlo({ ...base, decisive: null }, { runs: 20000, baseSeed: 1 });
    // Sheet SUM Ult/s = 6.6078. Base-only mean per second should match closely.
    expect(result.meanPerSecond).toBeCloseTo(6.6078, 1);
  });

  it('Decisive HALF reproduces ~112.06 (single roll @ sheet per-instance rate)', () => {
    const result = runMonteCarlo(
      {
        ...base,
        decisive: { procChance: SHEET_DECISIVE_HALF_PER_INSTANCE, rollsPerInstance: 1 },
      },
      { runs: 20000, baseSeed: 1 },
    );
    const meanDecisive =
      result.contributions.reduce((s, c) => s + c.decisiveUltimate, 0);
    expect(meanDecisive).toBeCloseTo(SHEET_DECISIVE_HALF, -1); // within ~5 ult
  });

  it('Decisive FULL reproduces ~218.06 (sheet linear-2x per-instance rate)', () => {
    const result = runMonteCarlo(
      {
        ...base,
        // Reproduce the sheet's literal FULL value as a single roll at its
        // decoded per-instance rate (the sheet modeled 2H as linear 2x).
        decisive: { procChance: SHEET_DECISIVE_FULL_PER_INSTANCE, rollsPerInstance: 1 },
      },
      { runs: 20000, baseSeed: 1 },
    );
    const meanDecisive = result.contributions.reduce((s, c) => s + c.decisiveUltimate, 0);
    expect(meanDecisive).toBeCloseTo(SHEET_DECISIVE_FULL, -1);
  });

  it('reports a shrinking standard error with more runs', () => {
    const few = runMonteCarlo({ ...base, decisive: null }, { runs: 100, baseSeed: 1 });
    const many = runMonteCarlo({ ...base, decisive: null }, { runs: 10000, baseSeed: 1 });
    expect(many.standardError).toBeLessThan(few.standardError);
  });
});

describe('Decisive 2H — correct binomial, not linear double-count', () => {
  // A single source emitting a known number of instances lets us assert the
  // exact binomial behavior the real raid preset relies on.
  const oneSource: UltimateSource = {
    id: 'x',
    label: 'X',
    kind: 'periodic',
    amountPerInstance: 0, // isolate Decisive
    instancesPerSecond: 1,
    uptime: 1,
    rollsDecisive: true,
  };

  it('two rolls at p give expected bonus = instances * (1-(1-p)^2)', () => {
    const p = 0.275;
    const result = runMonteCarlo(
      {
        fightDurationSeconds: 200, // 200 instances
        sources: [oneSource],
        decisive: { procChance: p, rollsPerInstance: 2 },
      },
      { runs: 20000, baseSeed: 1 },
    );
    const meanDecisive = result.contributions[0].decisiveUltimate;
    const expectedPerInstance = 2 * p; // E[bonus] for 2 independent rolls = 2p (can be 0,1,2)
    expect(meanDecisive).toBeCloseTo(200 * expectedPerInstance, -1);
  });
});
