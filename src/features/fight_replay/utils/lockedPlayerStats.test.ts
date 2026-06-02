import { DamageEvent, DeathEvent, HealEvent, HitType } from '../../../types/combatlogEvents';
import type { BuffLookupData } from '../../../utils/BuffLookupUtils';

import {
  MIN_RATE_WINDOW_SECONDS,
  buildAbilityBreakdownIndex,
  buildDebuffAppliedIndex,
  buildLockedStatsIndex,
  queryAbilityBreakdown,
  queryDebuffApplied,
  queryLiveLockedStats,
} from './lockedPlayerStats';

// Fight window used across the suite: absolute timestamps run 1_000_000 → 1_060_000 (60s fight).
const FIGHT_START = 1_000_000;

// Helpers build only the fields the engine reads; the rest is irrelevant to these pure functions.
const dmg = (
  timestamp: number,
  sourceID: number,
  targetID: number,
  amount: number,
  crit = false,
  opts?: { sourceIsFriendly?: boolean; targetIsFriendly?: boolean },
): DamageEvent =>
  ({
    type: 'damage',
    timestamp,
    sourceID,
    targetID,
    amount,
    hitType: crit ? HitType.Critical : HitType.Normal,
    sourceIsFriendly: opts?.sourceIsFriendly ?? true,
    targetIsFriendly: opts?.targetIsFriendly ?? false,
    abilityGameID: 1,
  }) as unknown as DamageEvent;

const heal = (timestamp: number, sourceID: number, amount: number, overheal: number): HealEvent =>
  ({
    type: 'heal',
    timestamp,
    sourceID,
    targetID: 99,
    amount,
    overheal,
    sourceIsFriendly: true,
    targetIsFriendly: true,
    abilityGameID: 2,
  }) as unknown as HealEvent;

const death = (timestamp: number, targetID: number): DeathEvent =>
  ({ type: 'death', timestamp, targetID, sourceID: 0 }) as unknown as DeathEvent;

const PLAYER = 5;

describe('buildLockedStatsIndex + queryLiveLockedStats', () => {
  // Player 5 deals damage at +10s, +20s, +30s; one crit. Takes damage at +15s. Heals at +25s.
  const damageEvents: DamageEvent[] = [
    dmg(FIGHT_START + 10_000, PLAYER, 7, 1000), // done
    dmg(FIGHT_START + 20_000, PLAYER, 7, 2000, true), // done, crit
    dmg(FIGHT_START + 30_000, PLAYER, 7, 3000), // done
    dmg(FIGHT_START + 15_000, 8, PLAYER, 500), // taken (someone hits player 5)
    dmg(FIGHT_START + 12_000, 6, 7, 9999), // unrelated (different source)
  ];
  const healingEvents: HealEvent[] = [heal(FIGHT_START + 25_000, PLAYER, 800, 200)];
  const deathEvents: DeathEvent[] = [death(FIGHT_START + 40_000, PLAYER)];

  const index = buildLockedStatsIndex(PLAYER, damageEvents, healingEvents, deathEvents);

  it('returns zeros before the first event', () => {
    const stats = queryLiveLockedStats(index, FIGHT_START + 5_000, 5);
    expect(stats.totalDamage).toBe(0);
    expect(stats.damageTaken).toBe(0);
    expect(stats.deaths).toBe(0);
    expect(stats.effectiveHealing).toBe(0);
    expect(stats.critChance).toBe(0);
  });

  it('accumulates only up to the cutoff (partial mid-fight)', () => {
    // Cutoff at +22s: damage events at +10s (1000) and +20s (2000 crit) count; +30s does not.
    const stats = queryLiveLockedStats(index, FIGHT_START + 22_000, 22);
    expect(stats.totalDamage).toBe(3000);
    expect(stats.critChance).toBeCloseTo(50); // 1 crit of 2 hits
    expect(stats.dps).toBeCloseTo(3000 / 22);
    // Damage taken at +15s counts; death at +40s does not yet.
    expect(stats.damageTaken).toBe(500);
    expect(stats.deaths).toBe(0);
  });

  it('matches whole-fight totals at/after the last event', () => {
    const durationSecs = 60;
    const stats = queryLiveLockedStats(index, FIGHT_START + 60_000, durationSecs);
    expect(stats.totalDamage).toBe(6000);
    // Whole-fight DPS must equal total / full duration (the usePlayerCardData semantics).
    expect(stats.dps).toBeCloseTo(6000 / durationSecs);
    expect(stats.critChance).toBeCloseTo((1 / 3) * 100);
    expect(stats.damageTaken).toBe(500);
    expect(stats.deaths).toBe(1);
    // Effective healing 800; overheal 200 → 20% overheal.
    expect(stats.effectiveHealing).toBe(800);
    expect(stats.overhealPct).toBeCloseTo(20);
    expect(stats.hps).toBeCloseTo(800 / durationSecs);
  });

  it('floors the rate denominator so early-fight rates do not explode', () => {
    // Cutoff just after the first event with a sub-1s elapsed window.
    const stats = queryLiveLockedStats(index, FIGHT_START + 10_000, 0.1);
    // Denominator floored to MIN_RATE_WINDOW_SECONDS, not 0.1.
    expect(stats.dps).toBeCloseTo(1000 / MIN_RATE_WINDOW_SECONDS);
  });

  it('is order-independent of a backward query (no forward-only accumulator)', () => {
    const forward = queryLiveLockedStats(index, FIGHT_START + 30_000, 30);
    queryLiveLockedStats(index, FIGHT_START + 60_000, 60); // advance...
    const backward = queryLiveLockedStats(index, FIGHT_START + 30_000, 30); // ...then rewind
    expect(backward.totalDamage).toBe(forward.totalDamage);
    expect(backward.dps).toBeCloseTo(forward.dps);
  });

  it('ignores damage from other sources / friendly targets', () => {
    const stats = queryLiveLockedStats(index, FIGHT_START + 60_000, 60);
    // Only player 5's hostile-target damage counts (6000), not the unrelated 9999 from source 6.
    expect(stats.totalDamage).toBe(6000);
  });
});

describe('buildAbilityBreakdownIndex + queryAbilityBreakdown', () => {
  const abilitiesById = {
    100: { name: 'Force Pulse', icon: 'fp.dds' },
    200: { name: 'Crystal Frags', icon: 'cf.dds' },
  };
  const damageEvents: DamageEvent[] = [
    { ...dmg(FIGHT_START + 5_000, PLAYER, 7, 500), abilityGameID: 100 } as DamageEvent,
    { ...dmg(FIGHT_START + 10_000, PLAYER, 7, 700, true), abilityGameID: 100 } as DamageEvent,
    { ...dmg(FIGHT_START + 20_000, PLAYER, 7, 3000), abilityGameID: 200 } as DamageEvent,
  ];
  const index = buildAbilityBreakdownIndex(PLAYER, damageEvents, abilitiesById);

  it('orders abilities by damage descending at the cutoff', () => {
    const rows = queryAbilityBreakdown(index, FIGHT_START + 60_000, 5);
    expect(rows.map((r) => r.name)).toEqual(['Crystal Frags', 'Force Pulse']);
    expect(rows[0].totalDamage).toBe(3000);
    expect(rows[1].totalDamage).toBe(1200);
    expect(rows[1].critRate).toBeCloseTo(50); // 1 crit of 2 Force Pulse hits
  });

  it('drops abilities that have not fired yet at the cutoff', () => {
    // Cutoff at +12s: only Force Pulse has fired (Crystal Frags is at +20s).
    const rows = queryAbilityBreakdown(index, FIGHT_START + 12_000, 5);
    expect(rows.map((r) => r.name)).toEqual(['Force Pulse']);
    expect(rows[0].totalDamage).toBe(1200);
  });

  it('respects the top-N limit', () => {
    const rows = queryAbilityBreakdown(index, FIGHT_START + 60_000, 1);
    expect(rows).toHaveLength(1);
    expect(rows[0].name).toBe('Crystal Frags');
  });
});

describe('buildDebuffAppliedIndex + queryDebuffApplied', () => {
  const FRIENDLY = new Set<number>([PLAYER, 6]); // players 5 and 6 are friendly
  const ENEMY = 99;
  const IMPORTANT = new Set<number>([100, 200, 300]);
  const abilitiesById = {
    100: { name: 'Major Breach' },
    200: { name: 'Crusher' },
    300: { name: 'Off Balance' },
  };

  // Ability 100 (Major Breach) is INVERTED: sourceID = friendly applier, targetID = enemy.
  //   - player 5 applied it on the enemy from +5s..+25s (20s)
  //   - player 6 applied it from +30s..+40s (not player 5)
  // Ability 200 (Crusher) is NORMAL: sourceID = enemy, targetID = friendly applier.
  //   - player 5 applied it from +10s..+50s (40s)
  // Ability 300 (Off Balance): only player 6 applied it → must not appear for player 5.
  const debuffLookup: BuffLookupData = {
    buffIntervals: {
      '100': [
        {
          start: FIGHT_START + 5_000,
          end: FIGHT_START + 25_000,
          sourceID: PLAYER,
          targetID: ENEMY,
        },
        { start: FIGHT_START + 30_000, end: FIGHT_START + 40_000, sourceID: 6, targetID: ENEMY },
      ],
      '200': [
        {
          start: FIGHT_START + 10_000,
          end: FIGHT_START + 50_000,
          sourceID: ENEMY,
          targetID: PLAYER,
        },
      ],
      '300': [
        { start: FIGHT_START + 5_000, end: FIGHT_START + 55_000, sourceID: 6, targetID: ENEMY },
      ],
    },
  };

  const index = buildDebuffAppliedIndex(PLAYER, debuffLookup, IMPORTANT, FRIENDLY, abilitiesById);

  it('attributes inverted (sourceID=applier) and normal (targetID=applier) debuffs to the player', () => {
    const names = index.abilities.map((a) => a.name).sort();
    expect(names).toEqual(['Crusher', 'Major Breach']); // Off Balance excluded (player 6's)
  });

  it('computes whole-window uptime% on the target at the end', () => {
    const rows = queryDebuffApplied(index, FIGHT_START, FIGHT_START + 60_000, 5);
    const byName = Object.fromEntries(rows.map((r) => [r.name, r.uptimePct]));
    // Crusher: 40s of 60s = 66.7%; Major Breach (player 5's interval only): 20s of 60s = 33.3%.
    expect(byName['Crusher']).toBeCloseTo((40 / 60) * 100, 1);
    expect(byName['Major Breach']).toBeCloseTo((20 / 60) * 100, 1);
  });

  it('is up-to-playhead: a mid-fight cutoff clips the window', () => {
    // Cutoff +20s: Crusher active +10..+20 = 10s of 20s = 50%; Major Breach +5..+20 = 15s of 20s = 75%.
    const rows = queryDebuffApplied(index, FIGHT_START, FIGHT_START + 20_000, 5);
    const byName = Object.fromEntries(rows.map((r) => [r.name, r.uptimePct]));
    expect(byName['Crusher']).toBeCloseTo(50, 1);
    expect(byName['Major Breach']).toBeCloseTo(75, 1);
  });

  it('returns nothing before the window opens', () => {
    expect(queryDebuffApplied(index, FIGHT_START, FIGHT_START, 5)).toEqual([]);
  });

  it('takes the PRIMARY-BOSS (max per-enemy) uptime, not a multi-enemy average or union', () => {
    // Multi-boss case: player 5 keeps Crusher (inverted) on BOSS_A nearly the whole fight, but only
    // briefly on BOSS_B. The primary-boss number should be BOSS_A's high uptime — NOT the average of
    // the two (which would halve it) NOR the union across both (which could exceed either).
    const BOSS_A = 201;
    const BOSS_B = 202;
    const lookup: BuffLookupData = {
      buffIntervals: {
        // Crusher INVERTED: sourceID = friendly applier (player 5), targetID = enemy.
        '200': [
          {
            start: FIGHT_START + 2_000,
            end: FIGHT_START + 56_000,
            sourceID: PLAYER,
            targetID: BOSS_A,
          }, // 54s on A
          {
            start: FIGHT_START + 10_000,
            end: FIGHT_START + 16_000,
            sourceID: PLAYER,
            targetID: BOSS_B,
          }, // 6s on B
        ],
      },
    };
    const multiIndex = buildDebuffAppliedIndex(PLAYER, lookup, IMPORTANT, FRIENDLY, abilitiesById);
    const rows = queryDebuffApplied(multiIndex, FIGHT_START, FIGHT_START + 60_000, 5);
    const crusher = rows.find((r) => r.name === 'Crusher');
    // Max per-enemy: 54s on BOSS_A of 60s = 90%. (Average would be ~50%; union would be ~93%.)
    expect(crusher?.uptimePct).toBeCloseTo((54 / 60) * 100, 1);
  });
});
