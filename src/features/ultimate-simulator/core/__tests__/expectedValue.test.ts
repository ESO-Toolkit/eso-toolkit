import { applyCostReduction, totalReductionFraction, CostReduction } from '../cost';
import {
  expectedDecisivePerInstance,
  expectedInstances,
  expectedValue,
  timeToUltimate,
} from '../expectedValue';
import { runMonteCarlo } from '../monteCarlo';
import type { DecisiveConfig, UltimateSource } from '../../shared/types';

const SOURCES: UltimateSource[] = [
  {
    id: 'base',
    label: 'Base',
    kind: 'periodic',
    amountPerInstance: 3,
    instancesPerSecond: 1,
    uptime: 0.99,
    rollsDecisive: true,
  },
  {
    id: 'minor-heroism',
    label: 'Minor Heroism',
    kind: 'periodic',
    amountPerInstance: 1,
    instancesPerSecond: 1 / 1.5,
    uptime: 0.95,
    rollsDecisive: true,
  },
  {
    id: 'external',
    label: 'External battery',
    kind: 'perCast',
    amountPerInstance: 50,
    instancesPerSecond: 1 / 45,
    uptime: 1,
    rollsDecisive: false, // externally granted — does not roll the wearer's Decisive
  },
];

const DECISIVE_1H: DecisiveConfig = { procChance: 0.275, rollsPerInstance: 1 };
const DECISIVE_2H: DecisiveConfig = { procChance: 0.275, rollsPerInstance: 2 };
const DURATION = 180;

describe('expectedInstances', () => {
  it('is instancesPerSecond × duration × uptime', () => {
    expect(expectedInstances(SOURCES[0], DURATION)).toBeCloseTo(1 * 180 * 0.99, 6);
    expect(expectedInstances(SOURCES[1], DURATION)).toBeCloseTo((1 / 1.5) * 180 * 0.95, 6);
  });

  it('never returns negative', () => {
    const dead: UltimateSource = { ...SOURCES[0], instancesPerSecond: 0 };
    expect(expectedInstances(dead, DURATION)).toBe(0);
  });
});

describe('expectedDecisivePerInstance', () => {
  it('is rollsPerInstance × procChance (mean of Binomial)', () => {
    expect(expectedDecisivePerInstance(DECISIVE_1H)).toBeCloseTo(0.275, 6);
    expect(expectedDecisivePerInstance(DECISIVE_2H)).toBeCloseTo(0.55, 6);
  });

  it('is 0 when no Decisive', () => {
    expect(expectedDecisivePerInstance(null)).toBe(0);
  });
});

describe('expectedValue', () => {
  it('only applies Decisive to sources that roll it', () => {
    const result = expectedValue({
      fightDurationSeconds: DURATION,
      sources: SOURCES,
      decisive: DECISIVE_1H,
    });
    const external = result.contributions.find((c) => c.sourceId === 'external');
    expect(external?.decisiveUltimate).toBe(0); // rollsDecisive: false
    const base = result.contributions.find((c) => c.sourceId === 'base');
    expect(base?.decisiveUltimate).toBeGreaterThan(0);
  });

  it('sorts contributions by total descending', () => {
    const result = expectedValue({
      fightDurationSeconds: DURATION,
      sources: SOURCES,
      decisive: DECISIVE_1H,
    });
    const totals = result.contributions.map((c) => c.baseUltimate + c.decisiveUltimate);
    const sorted = [...totals].sort((a, b) => b - a);
    expect(totals).toEqual(sorted);
  });

  // The headline guarantee: closed-form EV equals the Monte Carlo MEAN. This is
  // the regression the advisor flagged — a 2× Decisive bug would break it.
  it('matches the Monte Carlo mean to within standard error (1H)', () => {
    const config = { fightDurationSeconds: DURATION, sources: SOURCES, decisive: DECISIVE_1H };
    const ev = expectedValue(config);
    const mc = runMonteCarlo(config, { runs: 40000, baseSeed: 1 });
    // Within ~4 standard errors — generous but still catches systematic bias.
    expect(Math.abs(ev.totalUltimate - mc.meanTotal)).toBeLessThan(4 * mc.standardError + 1e-6);
  });

  it('matches the Monte Carlo mean for 2H Decisive (catches a 2× error)', () => {
    const config = { fightDurationSeconds: DURATION, sources: SOURCES, decisive: DECISIVE_2H };
    const ev = expectedValue(config);
    const mc = runMonteCarlo(config, { runs: 40000, baseSeed: 7 });
    expect(Math.abs(ev.totalUltimate - mc.meanTotal)).toBeLessThan(4 * mc.standardError + 1e-6);
    // And 2H Decisive contribution is ~2× the 1H contribution.
    const ev1h = expectedValue({ ...config, decisive: DECISIVE_1H });
    expect(ev.decisiveUltimate).toBeCloseTo(ev1h.decisiveUltimate * 2, 4);
  });

  it('is fully deterministic (same input → identical output)', () => {
    const config = { fightDurationSeconds: DURATION, sources: SOURCES, decisive: DECISIVE_1H };
    expect(expectedValue(config)).toEqual(expectedValue(config));
  });
});

describe('timeToUltimate', () => {
  it('computes seconds-to-first-cast and casts-per-fight', () => {
    const r = timeToUltimate({
      effectiveCost: 250,
      ultimatePerSecond: 10,
      fightDurationSeconds: 180,
    });
    expect(r.secondsToFirstCast).toBeCloseTo(25, 6); // 250 / 10
    expect(r.secondsPerCast).toBeCloseTo(25, 6);
    // 180s × 10 = 1800 generated; floor(1800/250) = 7 casts.
    expect(r.castsPerFight).toBe(7);
    expect(r.totalGenerated).toBeCloseTo(1800, 6);
  });

  it('banks starting ultimate toward the first cast only', () => {
    const r = timeToUltimate({
      effectiveCost: 250,
      ultimatePerSecond: 10,
      fightDurationSeconds: 180,
      startingUltimate: 100,
    });
    expect(r.secondsToFirstCast).toBeCloseTo(15, 6); // (250-100)/10
    // generated 1800; first cast needs 150 from gen, then floor((1800-150)/250)+1 = 7
    expect(r.castsPerFight).toBe(7);
  });

  it('returns Infinity time when generation rate is 0', () => {
    const r = timeToUltimate({
      effectiveCost: 250,
      ultimatePerSecond: 0,
      fightDurationSeconds: 180,
    });
    expect(r.secondsToFirstCast).toBe(Infinity);
    expect(r.castsPerFight).toBe(0);
  });

  it('is castable immediately (0s) when the bank already covers the cost, even at rate 0', () => {
    const r = timeToUltimate({
      effectiveCost: 125,
      ultimatePerSecond: 0,
      fightDurationSeconds: 180,
      startingUltimate: 500,
    });
    expect(r.secondsToFirstCast).toBe(0); // bank ≥ cost ⇒ ready now, not Infinity
    // 500 banked / 125 cost = 4 casts available from the bank alone.
    expect(r.castsPerFight).toBe(4);
  });

  it('counts excess banked ultimate toward the cast total', () => {
    const r = timeToUltimate({
      effectiveCost: 100,
      ultimatePerSecond: 5,
      fightDurationSeconds: 100, // generates 500
      startingUltimate: 250,
    });
    expect(r.secondsToFirstCast).toBe(0); // 250 banked ≥ 100 cost
    // (250 banked + 500 generated) / 100 = floor(7.5) = 7 casts.
    expect(r.castsPerFight).toBe(7);
  });

  it('caps banked ultimate at the 500 pool (excess input is ignored)', () => {
    const r = timeToUltimate({
      effectiveCost: 100,
      ultimatePerSecond: 0,
      fightDurationSeconds: 180,
      startingUltimate: 9999, // clamped to 500
    });
    expect(r.castsPerFight).toBe(5); // floor(500 / 100), not floor(9999/100)
  });

  it('reduces to floor(totalGenerated/cost) when nothing is banked', () => {
    const r = timeToUltimate({
      effectiveCost: 250,
      ultimatePerSecond: 10,
      fightDurationSeconds: 180,
      startingUltimate: 0,
    });
    expect(r.castsPerFight).toBe(7); // floor(1800/250)
  });
});

describe('applyCostReduction', () => {
  const r = (id: string, fraction: number, enabled = true): CostReduction => ({
    id,
    label: id,
    fraction,
    enabled,
  });

  it('stacks reductions multiplicatively', () => {
    // 0.90 × 0.85 = 0.765 of 100 = 76.5 → rounds to 77 (NOT 75).
    expect(applyCostReduction(100, [r('a', 0.1), r('b', 0.15)])).toBe(77);
  });

  it('ignores disabled reductions', () => {
    expect(applyCostReduction(100, [r('a', 0.5, false)])).toBe(100);
  });

  it('clamps fractions and floors at 0', () => {
    expect(applyCostReduction(100, [r('a', 2)])).toBe(0); // fraction clamped to 1
    expect(applyCostReduction(-50, [])).toBe(0);
  });

  it('totalReductionFraction reports the combined effective reduction', () => {
    expect(totalReductionFraction([r('a', 0.1), r('b', 0.15)])).toBeCloseTo(1 - 0.765, 6);
  });
});
