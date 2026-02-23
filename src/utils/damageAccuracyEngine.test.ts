import { HitType, type DamageEvent, type CombatantInfoEvent } from '../types/combatlogEvents';
import type { PlayerDetailsWithRole } from '../store/player_data/playerDataSlice';
import type { BuffLookupData } from './BuffLookupUtils';
import {
  computeModifiersForEvent,
  analyzeDamageEvent,
  buildAbilityAccuracyStats,
  generatePlayerAccuracyReport,
  generateFightAccuracyReport,
  type DamageEventAnalysis,
  type DamageDoneBreakdown,
} from './damageAccuracyEngine';

// ─── Test Helpers ────────────────────────────────────────────────────────────

const FIGHT_START = 1000000;

function makeDamageEvent(overrides: Partial<DamageEvent> = {}): DamageEvent {
  return {
    timestamp: FIGHT_START + 5000,
    type: 'damage',
    sourceID: 1,
    sourceIsFriendly: true,
    targetID: 100,
    targetIsFriendly: false,
    abilityGameID: 12345,
    fight: 1,
    hitType: HitType.Normal,
    amount: 10000,
    castTrackID: 1,
    sourceResources: {
      hitPoints: 30000,
      maxHitPoints: 30000,
      magicka: 35000,
      maxMagicka: 35000,
      stamina: 10000,
      maxStamina: 10000,
      ultimate: 50,
      maxUltimate: 500,
      werewolf: 0,
      maxWerewolf: 0,
      absorb: 0,
      championPoints: 3600,
      x: 0,
      y: 0,
      facing: 0,
    },
    targetResources: {
      hitPoints: 500000,
      maxHitPoints: 1000000,
      magicka: 0,
      maxMagicka: 0,
      stamina: 0,
      maxStamina: 0,
      ultimate: 0,
      maxUltimate: 0,
      werewolf: 0,
      maxWerewolf: 0,
      absorb: 0,
      championPoints: 0,
      x: 0,
      y: 0,
      facing: 0,
    },
    ...overrides,
  };
}

const emptyBuffLookup: BuffLookupData = { buffIntervals: {} };
const emptyDebuffLookup: BuffLookupData = { buffIntervals: {} };

/** Default damageDone breakdown with no buffs active (1.0 multiplier) */
const defaultDamageDone: DamageDoneBreakdown = {
  damageDonePercent: 0,
  damageTakenPercent: 0,
  empowerPercent: 0,
  totalMultiplier: 1,
  activeSources: [],
};

// Minimal combatant info (no gear or auras)
const minimalCombatantInfo: CombatantInfoEvent = {
  timestamp: FIGHT_START,
  type: 'combatantinfo',
  fight: 1,
  sourceID: 1,
  gear: [],
  auras: [],
};

const minimalPlayerData: PlayerDetailsWithRole = {
  name: 'TestPlayer',
  id: 1,
  guid: 100,
  type: 'Player',
  server: 'NA',
  displayName: '@TestPlayer',
  anonymous: false,
  icon: '',
  specs: [],
  potionUse: 0,
  healthstoneUse: 0,
  combatantInfo: { stats: [], talents: [], gear: [] },
  role: 'dps',
};

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('damageAccuracyEngine', () => {
  describe('computeModifiersForEvent', () => {
    it('should compute basic modifiers for a normal hit with no buffs', () => {
      const event = makeDamageEvent();
      const targetResistance = 18200;

      const modifiers = computeModifiersForEvent(
        event,
        emptyBuffLookup,
        emptyDebuffLookup,
        minimalCombatantInfo,
        minimalPlayerData,
        targetResistance,
      );

      // No penetration => full resistance applies
      expect(modifiers.penetration).toBe(0);
      expect(modifiers.isCritical).toBe(false);
      expect(modifiers.critMultiplier).toBe(1.0);
      // Damage reduction: 18200 / 660 = 27.57%
      expect(modifiers.damageReductionPercent).toBeCloseTo(27.575, 1);
      expect(modifiers.totalMultiplier).toBeCloseTo(0.7242, 2);
    });

    it('should recognize critical hits', () => {
      const event = makeDamageEvent({ hitType: HitType.Critical });
      const targetResistance = 0; // No resistance for simpler testing

      const modifiers = computeModifiersForEvent(
        event,
        emptyBuffLookup,
        emptyDebuffLookup,
        minimalCombatantInfo,
        minimalPlayerData,
        targetResistance,
      );

      expect(modifiers.isCritical).toBe(true);
      // Base crit damage with no buffs/gear: 50% (0.5)
      // calculateCriticalDamageAtTimestamp returns the percentage
      expect(modifiers.critDamageBonus).toBeGreaterThanOrEqual(0);
      expect(modifiers.critMultiplier).toBeGreaterThanOrEqual(1.0);
    });

    it('should cap damage reduction at 50%', () => {
      const event = makeDamageEvent();
      // Very high resistance
      const targetResistance = 100000;

      const modifiers = computeModifiersForEvent(
        event,
        emptyBuffLookup,
        emptyDebuffLookup,
        null, // no combatant info
        undefined, // no player data
        targetResistance,
      );

      expect(modifiers.damageReductionPercent).toBe(50);
      expect(modifiers.totalMultiplier).toBeCloseTo(0.5, 2);
    });

    it('should handle zero resistance correctly', () => {
      const event = makeDamageEvent();
      const targetResistance = 0;

      const modifiers = computeModifiersForEvent(
        event,
        emptyBuffLookup,
        emptyDebuffLookup,
        null,
        undefined,
        targetResistance,
      );

      expect(modifiers.damageReductionPercent).toBe(0);
      expect(modifiers.totalMultiplier).toBe(1.0);
    });
  });

  describe('analyzeDamageEvent', () => {
    it('should infer tooltip damage by reversing the multiplier', () => {
      const event = makeDamageEvent({ amount: 7242 }); // Simulated post-reduction amount
      const targetResistance = 18200; // Gives ~27.57% reduction

      const analysis = analyzeDamageEvent(
        event,
        emptyBuffLookup,
        emptyDebuffLookup,
        null,
        undefined,
        targetResistance,
        FIGHT_START,
      );

      // With 27.57% damage reduction, totalMultiplier ≈ 0.7242
      // inferredTooltip = 7242 / 0.7242 ≈ 10000
      expect(analysis.inferredTooltipDamage).toBeCloseTo(10000, -1);
      expect(analysis.relativeTimestamp).toBe(5);
    });
  });

  describe('buildAbilityAccuracyStats', () => {
    it('should compute stats for consistent normal hits', () => {
      const events: DamageEventAnalysis[] = [
        {
          event: makeDamageEvent({ amount: 1000 }),
          modifiers: {
            penetration: 0,
            critDamageBonus: 0,
            isCritical: false,
            damageReductionPercent: 0,
            critMultiplier: 1.0,
            damageDone: defaultDamageDone,
            totalMultiplier: 1.0,
            buffValidation: null,
          },
          inferredTooltipDamage: 1000,
          relativeTimestamp: 1,
        },
        {
          event: makeDamageEvent({ amount: 1010 }),
          modifiers: {
            penetration: 0,
            critDamageBonus: 0,
            isCritical: false,
            damageReductionPercent: 0,
            critMultiplier: 1.0,
            damageDone: defaultDamageDone,
            totalMultiplier: 1.0,
            buffValidation: null,
          },
          inferredTooltipDamage: 1010,
          relativeTimestamp: 2,
        },
        {
          event: makeDamageEvent({ amount: 990 }),
          modifiers: {
            penetration: 0,
            critDamageBonus: 0,
            isCritical: false,
            damageReductionPercent: 0,
            critMultiplier: 1.0,
            damageDone: defaultDamageDone,
            totalMultiplier: 1.0,
            buffValidation: null,
          },
          inferredTooltipDamage: 990,
          relativeTimestamp: 3,
        },
      ];

      const stats = buildAbilityAccuracyStats(12345, events);

      expect(stats.abilityGameID).toBe(12345);
      expect(stats.totalEvents).toBe(3);
      expect(stats.normalHitCount).toBe(3);
      expect(stats.critHitCount).toBe(0);
      expect(stats.meanNormalTooltip).toBe(1000);
      expect(stats.coefficientOfVariation).toBeLessThan(0.02); // Very consistent
      expect(stats.accuracyScore).toBeGreaterThan(98); // Very high accuracy
    });

    it('should produce crit predictions using normal hit mean', () => {
      const events: DamageEventAnalysis[] = [
        // Two normal hits to establish baseline
        {
          event: makeDamageEvent({ amount: 1000, hitType: HitType.Normal }),
          modifiers: {
            penetration: 0,
            critDamageBonus: 0,
            isCritical: false,
            damageReductionPercent: 0,
            critMultiplier: 1.0,
            damageDone: defaultDamageDone,
            totalMultiplier: 1.0,
            buffValidation: null,
          },
          inferredTooltipDamage: 1000,
          relativeTimestamp: 1,
        },
        {
          event: makeDamageEvent({ amount: 1000, hitType: HitType.Normal }),
          modifiers: {
            penetration: 0,
            critDamageBonus: 0,
            isCritical: false,
            damageReductionPercent: 0,
            critMultiplier: 1.0,
            damageDone: defaultDamageDone,
            totalMultiplier: 1.0,
            buffValidation: null,
          },
          inferredTooltipDamage: 1000,
          relativeTimestamp: 2,
        },
        // One crit hit with 50% crit damage bonus
        {
          event: makeDamageEvent({ amount: 1500, hitType: HitType.Critical }),
          modifiers: {
            penetration: 0,
            critDamageBonus: 0.5,
            isCritical: true,
            damageReductionPercent: 0,
            critMultiplier: 1.5,
            damageDone: defaultDamageDone,
            totalMultiplier: 1.5,
            buffValidation: null,
          },
          inferredTooltipDamage: 1000, // 1500 / 1.5 = 1000
          relativeTimestamp: 3,
        },
      ];

      const stats = buildAbilityAccuracyStats(12345, events);

      expect(stats.critPredictions).toHaveLength(1);
      expect(stats.critPredictions[0].predictedDamage).toBe(1500);
      expect(stats.critPredictions[0].actualDamage).toBe(1500);
      expect(stats.critPredictions[0].accuracy).toBe(100);
    });
  });

  describe('generatePlayerAccuracyReport', () => {
    it('should generate a report for a player with damage events', () => {
      const damageEvents = [
        makeDamageEvent({ sourceID: 1, amount: 5000, abilityGameID: 100 }),
        makeDamageEvent({
          sourceID: 1,
          amount: 5100,
          abilityGameID: 100,
          timestamp: FIGHT_START + 6000,
        }),
        makeDamageEvent({
          sourceID: 1,
          amount: 3000,
          abilityGameID: 200,
          timestamp: FIGHT_START + 7000,
        }),
        makeDamageEvent({
          sourceID: 1,
          amount: 3050,
          abilityGameID: 200,
          timestamp: FIGHT_START + 8000,
        }),
        makeDamageEvent({ sourceID: 2, amount: 8000 }), // Different player
      ];

      const report = generatePlayerAccuracyReport(
        1,
        'TestPlayer',
        damageEvents,
        emptyBuffLookup,
        emptyDebuffLookup,
        null,
        undefined,
        0, // No resistance for simplicity
        FIGHT_START,
      );

      expect(report.playerId).toBe(1);
      expect(report.playerName).toBe('TestPlayer');
      expect(report.totalEventsAnalyzed).toBe(4); // Only player 1's events
      expect(report.abilityStats).toHaveLength(2); // Two abilities
      expect(report.overallAccuracy).toBeGreaterThan(0);
    });

    it('should handle player with no events', () => {
      const report = generatePlayerAccuracyReport(
        99,
        'NoEvents',
        [],
        emptyBuffLookup,
        emptyDebuffLookup,
        null,
        undefined,
        0,
        FIGHT_START,
      );

      expect(report.totalEventsAnalyzed).toBe(0);
      expect(report.abilityStats).toHaveLength(0);
    });
  });

  describe('generateFightAccuracyReport', () => {
    it('should aggregate reports across players', () => {
      const damageEvents = [
        makeDamageEvent({ sourceID: 1, amount: 5000, abilityGameID: 100 }),
        makeDamageEvent({
          sourceID: 1,
          amount: 5100,
          abilityGameID: 100,
          timestamp: FIGHT_START + 6000,
        }),
        makeDamageEvent({
          sourceID: 2,
          amount: 3000,
          abilityGameID: 200,
          timestamp: FIGHT_START + 7000,
        }),
        makeDamageEvent({
          sourceID: 2,
          amount: 3050,
          abilityGameID: 200,
          timestamp: FIGHT_START + 8000,
        }),
      ];

      const playersById: Record<number, PlayerDetailsWithRole> = {
        1: { ...minimalPlayerData, id: 1, name: 'Player1' },
        2: { ...minimalPlayerData, id: 2, name: 'Player2' },
      };

      const report = generateFightAccuracyReport({
        damageEvents,
        playersById,
        combatantInfoRecord: {},
        buffLookup: emptyBuffLookup,
        debuffLookup: emptyDebuffLookup,
        fightStartTime: FIGHT_START,
        fightEndTime: FIGHT_START + 30000,
        defaultTargetResistance: 0,
      });

      expect(report.playerReports).toHaveLength(2);
      expect(report.totalEvents).toBe(4);
      expect(report.overallAccuracy).toBeGreaterThan(0);
      expect(report.computationTimeMs).toBeGreaterThanOrEqual(0);
    });

    it('should filter to friendly → enemy damage only', () => {
      const damageEvents = [
        makeDamageEvent({ sourceID: 1, sourceIsFriendly: true, targetIsFriendly: false }),
        makeDamageEvent({
          sourceID: 1,
          sourceIsFriendly: true,
          targetIsFriendly: false,
          timestamp: FIGHT_START + 6000,
        }),
        // Enemy damage (should be excluded)
        makeDamageEvent({
          sourceID: 100,
          sourceIsFriendly: false,
          targetIsFriendly: false,
          timestamp: FIGHT_START + 7000,
        }),
      ];

      const playersById: Record<number, PlayerDetailsWithRole> = {
        1: { ...minimalPlayerData, id: 1, name: 'Player1' },
      };

      const report = generateFightAccuracyReport({
        damageEvents,
        playersById,
        combatantInfoRecord: {},
        buffLookup: emptyBuffLookup,
        debuffLookup: emptyDebuffLookup,
        fightStartTime: FIGHT_START,
        fightEndTime: FIGHT_START + 30000,
        defaultTargetResistance: 0,
      });

      expect(report.totalEvents).toBe(2); // Only friendly damage
    });

    it('should handle empty fight', () => {
      const report = generateFightAccuracyReport({
        damageEvents: [],
        playersById: {},
        combatantInfoRecord: {},
        buffLookup: emptyBuffLookup,
        debuffLookup: emptyDebuffLookup,
        fightStartTime: FIGHT_START,
        fightEndTime: FIGHT_START + 30000,
      });

      expect(report.playerReports).toHaveLength(0);
      expect(report.totalEvents).toBe(0);
      expect(report.overallAccuracy).toBe(0);
    });
  });

  describe('damage-done multipliers', () => {
    it('should include damageDone with 1.0 multiplier when no buffs active', () => {
      const event = makeDamageEvent();
      const modifiers = computeModifiersForEvent(
        event,
        emptyBuffLookup,
        emptyDebuffLookup,
        null,
        undefined,
        0,
      );

      expect(modifiers.damageDone.damageDonePercent).toBe(0);
      expect(modifiers.damageDone.damageTakenPercent).toBe(0);
      expect(modifiers.damageDone.empowerPercent).toBe(0);
      expect(modifiers.damageDone.totalMultiplier).toBe(1);
    });

    it('should detect Minor Berserk buff on attacker', () => {
      const event = makeDamageEvent({ sourceID: 1, timestamp: FIGHT_START + 5000 });
      const buffLookup: BuffLookupData = {
        buffIntervals: {
          '61744': [
            { start: FIGHT_START, end: FIGHT_START + 10000, targetID: 1, sourceID: 1 },
          ],
        },
      };

      const modifiers = computeModifiersForEvent(
        event,
        buffLookup,
        emptyDebuffLookup,
        null,
        undefined,
        0,
      );

      expect(modifiers.damageDone.damageDonePercent).toBe(5);
      expect(modifiers.damageDone.totalMultiplier).toBeCloseTo(1.05, 4);
      // totalMultiplier should include damageDone
      expect(modifiers.totalMultiplier).toBeCloseTo(1.05, 4);
    });

    it('should detect Major Vulnerability debuff on target', () => {
      const event = makeDamageEvent({ targetID: 100, timestamp: FIGHT_START + 5000 });
      const debuffLookup: BuffLookupData = {
        buffIntervals: {
          '106754': [
            { start: FIGHT_START, end: FIGHT_START + 10000, targetID: 100, sourceID: 1 },
          ],
        },
      };

      const modifiers = computeModifiersForEvent(
        event,
        emptyBuffLookup,
        debuffLookup,
        null,
        undefined,
        0,
      );

      expect(modifiers.damageDone.damageTakenPercent).toBe(10);
      expect(modifiers.damageDone.totalMultiplier).toBeCloseTo(1.10, 4);
    });

    it('should combine Berserk and Vulnerability multiplicatively', () => {
      const event = makeDamageEvent({
        sourceID: 1,
        targetID: 100,
        timestamp: FIGHT_START + 5000,
      });

      // Minor Berserk (+5%) on attacker
      const buffLookup: BuffLookupData = {
        buffIntervals: {
          '61744': [
            { start: FIGHT_START, end: FIGHT_START + 10000, targetID: 1, sourceID: 1 },
          ],
        },
      };

      // Minor Vulnerability (+5%) on target
      const debuffLookup: BuffLookupData = {
        buffIntervals: {
          '79717': [
            { start: FIGHT_START, end: FIGHT_START + 10000, targetID: 100, sourceID: 1 },
          ],
        },
      };

      const modifiers = computeModifiersForEvent(
        event,
        buffLookup,
        debuffLookup,
        null,
        undefined,
        0,
      );

      // (1 + 0.05) × (1 + 0.05) = 1.1025
      expect(modifiers.damageDone.totalMultiplier).toBeCloseTo(1.1025, 4);
      expect(modifiers.totalMultiplier).toBeCloseTo(1.1025, 4);
    });

    it('should not apply Empower to DoT ticks', () => {
      const dotEvent = makeDamageEvent({
        sourceID: 1,
        timestamp: FIGHT_START + 5000,
        tick: true,
      });

      // Empower active on attacker
      const buffLookup: BuffLookupData = {
        buffIntervals: {
          '61737': [
            { start: FIGHT_START, end: FIGHT_START + 10000, targetID: 1, sourceID: 1 },
          ],
        },
      };

      const modifiers = computeModifiersForEvent(
        dotEvent,
        buffLookup,
        emptyDebuffLookup,
        null,
        undefined,
        0,
      );

      expect(modifiers.damageDone.empowerPercent).toBe(0);
    });

    it('should include damageDoneMultiplierRange in ModifierSummary', () => {
      const damageEvents = [
        makeDamageEvent({ sourceID: 1, amount: 5000, abilityGameID: 100 }),
        makeDamageEvent({
          sourceID: 1,
          amount: 5100,
          abilityGameID: 100,
          timestamp: FIGHT_START + 6000,
        }),
      ];

      const report = generatePlayerAccuracyReport(
        1,
        'TestPlayer',
        damageEvents,
        emptyBuffLookup,
        emptyDebuffLookup,
        null,
        undefined,
        0,
        FIGHT_START,
      );

      expect(report.modifierSummary.damageDoneMultiplierRange).toBeDefined();
      expect(report.modifierSummary.damageDoneMultiplierRange.mean).toBe(1);
    });
  });

  describe('buff validation', () => {
    it('should return null buffValidation when event has no buffs field', () => {
      const event = makeDamageEvent(); // no buffs field
      const modifiers = computeModifiersForEvent(
        event,
        emptyBuffLookup,
        emptyDebuffLookup,
        null,
        undefined,
        0,
      );

      expect(modifiers.buffValidation).toBeNull();
    });

    it('should validate buff snapshot against BuffLookup', () => {
      // Event reports Minor Berserk (61744) in its buffs
      const event = makeDamageEvent({
        sourceID: 1,
        timestamp: FIGHT_START + 5000,
        buffs: '61744.12345',
      });

      // BuffLookup also has Minor Berserk active
      const buffLookup: BuffLookupData = {
        buffIntervals: {
          '61744': [
            { start: FIGHT_START, end: FIGHT_START + 10000, targetID: 1, sourceID: 1 },
          ],
        },
      };

      const modifiers = computeModifiersForEvent(
        event,
        buffLookup,
        emptyDebuffLookup,
        null,
        undefined,
        0,
      );

      expect(modifiers.buffValidation).not.toBeNull();
      expect(modifiers.buffValidation!.matchedCount).toBe(1);
      expect(modifiers.buffValidation!.missingFromLookup).toHaveLength(0);
      expect(modifiers.buffValidation!.extraInLookup).toHaveLength(0);
    });

    it('should detect buffs in event but missing from lookup', () => {
      const event = makeDamageEvent({
        sourceID: 1,
        timestamp: FIGHT_START + 5000,
        buffs: '61744', // Minor Berserk in event buffs
      });

      // But NOT in BuffLookup
      const modifiers = computeModifiersForEvent(
        event,
        emptyBuffLookup,
        emptyDebuffLookup,
        null,
        undefined,
        0,
      );

      expect(modifiers.buffValidation).not.toBeNull();
      expect(modifiers.buffValidation!.missingFromLookup).toContain(61744);
    });
  });
});
