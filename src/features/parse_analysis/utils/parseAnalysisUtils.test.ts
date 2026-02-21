/**
 * Tests for parse analysis utilities
 */

import {
  BeginCastEvent,
  BuffEvent,
  CastEvent,
  DamageEvent,
  UnifiedCastEvent,
} from '../../../types/combatlogEvents';
import {
  STAMINA_FOOD,
  MAGICKA_FOOD,
  INCREASE_MAX_HEALTH_AND_STAMINA,
  TRI_STAT_FOOD,
  MAX_STAMINA_AND_MAGICKA_RECOVERY,
} from '../../../types/abilities';
import {
  detectFood,
  calculateCPM,
  calculateActivePercentage,
  calculateDPS,
  analyzeWeaving,
  detectTrialDummyBuffs,
  LIGHT_ATTACK_ABILITY_IDS,
} from './parseAnalysisUtils';
import { TRIAL_DUMMY_BUFF_IDS } from '../constants/trialDummyConstants';

describe('parseAnalysisUtils', () => {
  const PLAYER_ID = 1;
  const FIGHT_START = 1000000;
  const FIGHT_END = 1060000; // 60 seconds

  describe('detectFood', () => {
    it('should detect stamina food', () => {
      const staminaFoodId = Array.from(STAMINA_FOOD)[0];
      const buffEvents: BuffEvent[] = [
        {
          timestamp: FIGHT_START + 1000,
          type: 'applybuff',
          sourceID: PLAYER_ID,
          sourceIsFriendly: true,
          targetID: PLAYER_ID,
          targetIsFriendly: true,
          abilityGameID: staminaFoodId,
          fight: 1,
          extraAbilityGameID: 0,
        },
      ];

      const result = detectFood(buffEvents, PLAYER_ID, FIGHT_START, FIGHT_END);

      expect(result.hasFood).toBe(true);
      expect(result.foodType).toBe('stamina');
      expect(result.foodAbilityIds).toContain(staminaFoodId);
    });

    it('should detect magicka food', () => {
      const magickaFoodId = Array.from(MAGICKA_FOOD)[0];
      const buffEvents: BuffEvent[] = [
        {
          timestamp: FIGHT_START + 1000,
          type: 'applybuff',
          sourceID: PLAYER_ID,
          sourceIsFriendly: true,
          targetID: PLAYER_ID,
          targetIsFriendly: true,
          abilityGameID: magickaFoodId,
          fight: 1,
          extraAbilityGameID: 0,
        },
      ];

      const result = detectFood(buffEvents, PLAYER_ID, FIGHT_START, FIGHT_END);

      expect(result.hasFood).toBe(true);
      expect(result.foodType).toBe('magicka');
    });

    it('should detect health-stamina food', () => {
      const healthStamFoodId = Array.from(INCREASE_MAX_HEALTH_AND_STAMINA)[0];
      const buffEvents: BuffEvent[] = [
        {
          timestamp: FIGHT_START + 1000,
          type: 'applybuff',
          sourceID: PLAYER_ID,
          sourceIsFriendly: true,
          targetID: PLAYER_ID,
          targetIsFriendly: true,
          abilityGameID: healthStamFoodId,
          fight: 1,
          extraAbilityGameID: 0,
        },
      ];

      const result = detectFood(buffEvents, PLAYER_ID, FIGHT_START, FIGHT_END);

      expect(result.hasFood).toBe(true);
      expect(result.foodType).toBe('health-stamina');
    });

    it('should return no food when none detected', () => {
      const buffEvents: BuffEvent[] = [];

      const result = detectFood(buffEvents, PLAYER_ID, FIGHT_START, FIGHT_END);

      expect(result.hasFood).toBe(false);
      expect(result.foodType).toBe('none');
    });

    it("should detect Candied Jester's Coins (stamina-magicka-recovery food)", () => {
      const candiedJesterCoinsId = 89955; // ID for Candied Jester's Coins
      const buffEvents: BuffEvent[] = [
        {
          timestamp: FIGHT_START + 1000,
          type: 'applybuff',
          sourceID: PLAYER_ID,
          sourceIsFriendly: true,
          targetID: PLAYER_ID,
          targetIsFriendly: true,
          abilityGameID: candiedJesterCoinsId,
          fight: 1,
          extraAbilityGameID: 0,
        },
      ];

      const result = detectFood(buffEvents, PLAYER_ID, FIGHT_START, FIGHT_END);

      expect(result.hasFood).toBe(true);
      expect(result.foodType).toBe('stamina-magicka-recovery');
      expect(result.foodAbilityIds).toContain(candiedJesterCoinsId);
      expect(MAX_STAMINA_AND_MAGICKA_RECOVERY.has(candiedJesterCoinsId)).toBe(true); // Verify it's in the set
    });
  });

  describe('calculateCPM', () => {
    it('should calculate CPM correctly', () => {
      const castEvents: CastEvent[] = [
        {
          timestamp: FIGHT_START + 1000,
          type: 'cast',
          sourceID: PLAYER_ID,
          sourceIsFriendly: true,
          targetID: 2,
          targetIsFriendly: false,
          abilityGameID: 12345,
          fight: 1,
        },
        {
          timestamp: FIGHT_START + 2000,
          type: 'cast',
          sourceID: PLAYER_ID,
          sourceIsFriendly: true,
          targetID: 2,
          targetIsFriendly: false,
          abilityGameID: 12346,
          fight: 1,
        },
      ];

      const cpm = calculateCPM(castEvents, PLAYER_ID, FIGHT_START, FIGHT_END);

      // 2 casts in 60 seconds = 2 CPM
      expect(cpm).toBe(2);
    });

    it('should return 0 CPM for zero duration', () => {
      const castEvents: CastEvent[] = [];
      const cpm = calculateCPM(castEvents, PLAYER_ID, FIGHT_START, FIGHT_START);
      expect(cpm).toBe(0);
    });

    it('should not double count when both begincast and cast exist', () => {
      const resourceSnapshot = {
        hitPoints: 30000,
        maxHitPoints: 30000,
        magicka: 10000,
        maxMagicka: 10000,
        stamina: 15000,
        maxStamina: 15000,
        ultimate: 100,
        maxUltimate: 500,
        werewolf: 0,
        maxWerewolf: 0,
        absorb: 0,
        championPoints: 3600,
        x: 0,
        y: 0,
        facing: 0,
      };

      const begin: BeginCastEvent = {
        timestamp: FIGHT_START + 500,
        type: 'begincast',
        sourceID: PLAYER_ID,
        sourceIsFriendly: true,
        targetID: 2,
        targetIsFriendly: false,
        abilityGameID: 12345,
        fight: 1,
        castTrackID: 10,
        sourceResources: resourceSnapshot,
        targetResources: resourceSnapshot,
      };

      const cast: CastEvent = {
        timestamp: FIGHT_START + 800,
        type: 'cast',
        sourceID: PLAYER_ID,
        sourceIsFriendly: true,
        targetID: 2,
        targetIsFriendly: false,
        abilityGameID: 12345,
        fight: 1,
        castTrackID: 10,
      };

      const result = calculateCPM([begin, cast], PLAYER_ID, FIGHT_START, FIGHT_END);

      expect(result).toBeCloseTo(1, 5);
    });

    it('should count light and heavy attacks', () => {
      const castEvents: CastEvent[] = [
        {
          timestamp: FIGHT_START + 1000,
          type: 'cast',
          sourceID: PLAYER_ID,
          sourceIsFriendly: true,
          targetID: 2,
          targetIsFriendly: false,
          abilityGameID: 16037, // light attack ID
          fight: 1,
        },
        {
          timestamp: FIGHT_START + 2000,
          type: 'cast',
          sourceID: PLAYER_ID,
          sourceIsFriendly: true,
          targetID: 2,
          targetIsFriendly: false,
          abilityGameID: 16041, // heavy attack ID
          fight: 1,
        },
      ];

      const cpm = calculateCPM(castEvents, PLAYER_ID, FIGHT_START, FIGHT_END);

      // 2 casts (light + heavy) in 60 seconds = 2 CPM
      expect(cpm).toBe(2);
    });
  });

  describe('calculateDPS', () => {
    const mockResources = {
      hitPoints: 30000,
      maxHitPoints: 30000,
      magicka: 10000,
      maxMagicka: 10000,
      stamina: 15000,
      maxStamina: 15000,
      ultimate: 100,
      maxUltimate: 500,
      werewolf: 0,
      maxWerewolf: 0,
      absorb: 0,
      championPoints: 3600,
      x: 0,
      y: 0,
      facing: 0,
    };

    it('should calculate DPS correctly', () => {
      const damageEvents: DamageEvent[] = [
        {
          timestamp: FIGHT_START + 1000,
          type: 'damage',
          sourceID: PLAYER_ID,
          sourceIsFriendly: true,
          targetID: 2,
          targetIsFriendly: false,
          abilityGameID: 12345,
          fight: 1,
          amount: 10000,
          hitType: 1,
          castTrackID: 1,
          sourceResources: mockResources,
          targetResources: mockResources,
        },
        {
          timestamp: FIGHT_START + 2000,
          type: 'damage',
          sourceID: PLAYER_ID,
          sourceIsFriendly: true,
          targetID: 2,
          targetIsFriendly: false,
          abilityGameID: 12346,
          fight: 1,
          amount: 20000,
          hitType: 1,
          castTrackID: 2,
          sourceResources: mockResources,
          targetResources: mockResources,
        },
        {
          timestamp: FIGHT_START + 3000,
          type: 'damage',
          sourceID: 999, // Different player
          sourceIsFriendly: true,
          targetID: 2,
          targetIsFriendly: false,
          abilityGameID: 12347,
          fight: 1,
          amount: 5000,
          hitType: 1,
          castTrackID: 3,
          sourceResources: mockResources,
          targetResources: mockResources,
        },
      ];

      const result = calculateDPS(damageEvents, PLAYER_ID, FIGHT_START, FIGHT_END);

      // 30000 damage in 60 seconds = 500 DPS
      expect(result.totalDamage).toBe(30000);
      expect(result.dps).toBe(500);
      expect(result.durationMs).toBe(60000);
    });

    describe('calculateActivePercentage', () => {
      const createCast = (
        timestamp: number,
        abilityId: number,
        castTrackID: number,
      ): CastEvent => ({
        timestamp,
        type: 'cast',
        sourceID: PLAYER_ID,
        sourceIsFriendly: true,
        targetID: 2,
        targetIsFriendly: false,
        abilityGameID: abilityId,
        fight: 1,
        castTrackID,
      });

      const createBeginCast = (
        timestamp: number,
        abilityId: number,
        castTrackID: number,
      ): BeginCastEvent => ({
        timestamp,
        type: 'begincast',
        sourceID: PLAYER_ID,
        sourceIsFriendly: true,
        targetID: 2,
        targetIsFriendly: false,
        abilityGameID: abilityId,
        fight: 1,
        castTrackID,
        sourceResources: mockResources,
        targetResources: mockResources,
      });

      const createDamage = (
        timestamp: number,
        abilityId: number,
        castTrackID: number,
        amount = 1000,
      ): DamageEvent => ({
        timestamp,
        type: 'damage',
        sourceID: PLAYER_ID,
        sourceIsFriendly: true,
        targetID: 2,
        targetIsFriendly: false,
        abilityGameID: abilityId,
        fight: 1,
        hitType: 1,
        amount,
        castTrackID,
        sourceResources: mockResources,
        targetResources: mockResources,
      });

      it('returns 100% activity when casts fill the fight duration', () => {
        const casts: CastEvent[] = [
          createCast(FIGHT_START, 1001, 1),
          createCast(FIGHT_START + 1000, 1001, 2),
          createCast(FIGHT_START + 2000, 1001, 3),
          createCast(FIGHT_START + 3000, 1001, 4),
          createCast(FIGHT_START + 4000, 1001, 5),
        ];

        const result = calculateActivePercentage(
          casts,
          [],
          PLAYER_ID,
          FIGHT_START,
          FIGHT_START + 5000,
        );

        expect(result.totalCasts).toBe(5);
        expect(result.channelExtraSeconds).toBe(0);
        expect(result.activePercentage).toBeCloseTo(100, 5);
      });

      it('detects downtime when casts are missing', () => {
        const casts: CastEvent[] = [
          createCast(FIGHT_START, 2001, 10),
          createCast(FIGHT_START + 2000, 2001, 11),
          createCast(FIGHT_START + 4000, 2001, 12),
        ];

        const result = calculateActivePercentage(
          casts,
          [],
          PLAYER_ID,
          FIGHT_START,
          FIGHT_START + 5000,
        );

        expect(result.activePercentage).toBeCloseTo(60, 5);
        expect(result.downtimeSeconds).toBeCloseTo(2, 5);
      });

      it('adds channel duration beyond the global cooldown', () => {
        const casts: CastEvent[] = [
          createCast(FIGHT_START, 3001, 20),
          createCast(FIGHT_START + 3000, 3001, 21),
        ];

        const damageEvents: DamageEvent[] = [
          createDamage(FIGHT_START + 500, 3001, 20),
          createDamage(FIGHT_START + 1000, 3001, 20),
          createDamage(FIGHT_START + 1500, 3001, 20),
          createDamage(FIGHT_START + 2000, 3001, 20),
        ];

        const result = calculateActivePercentage(
          casts,
          damageEvents,
          PLAYER_ID,
          FIGHT_START,
          FIGHT_START + 5000,
        );

        expect(result.totalCasts).toBe(2);
        expect(result.channelExtraSeconds).toBeCloseTo(1, 5);
        expect(result.activePercentage).toBeCloseTo(60, 5);
      });

      it('ignores light attacks resolved through ability mapper', () => {
        const lightAttackId = 4001;
        const casts: CastEvent[] = [createCast(FIGHT_START, lightAttackId, 30)];

        const mockAbilityMapper = {
          getAbilityById: (id: number) => {
            if (id === lightAttackId) {
              return { name: 'Inferno Staff Light Attack' };
            }
            return null;
          },
        };

        const result = calculateActivePercentage(
          casts,
          [],
          PLAYER_ID,
          FIGHT_START,
          FIGHT_START + 2000,
          mockAbilityMapper,
        );

        expect(result.totalCasts).toBe(0);
        expect(result.baseActiveSeconds).toBe(0);
        expect(result.activePercentage).toBe(0);
      });

      it('ignores synergies resolved through ability mapper', () => {
        const synergyAbilityId = 5001;
        const casts: CastEvent[] = [createCast(FIGHT_START, synergyAbilityId, 40)];

        const mockAbilityMapper = {
          getAbilityById: (id: number) => {
            if (id === synergyAbilityId) {
              return { name: 'Pure Agony Synergy' };
            }
            return null;
          },
        };

        const result = calculateActivePercentage(
          casts,
          [],
          PLAYER_ID,
          FIGHT_START,
          FIGHT_START + 2000,
          mockAbilityMapper,
        );

        expect(result.totalCasts).toBe(0);
        expect(result.activePercentage).toBe(0);
      });

      it('ignores Restore Health casts resolved through ability mapper', () => {
        const restoreHealthAbilityId = 5002;
        const casts: CastEvent[] = [createCast(FIGHT_START, restoreHealthAbilityId, 41)];

        const mockAbilityMapper = {
          getAbilityById: (id: number) => {
            if (id === restoreHealthAbilityId) {
              return { name: 'Restore Health' };
            }
            return null;
          },
        };

        const result = calculateActivePercentage(
          casts,
          [],
          PLAYER_ID,
          FIGHT_START,
          FIGHT_START + 2000,
          mockAbilityMapper,
        );

        expect(result.totalCasts).toBe(0);
        expect(result.baseActiveSeconds).toBe(0);
        expect(result.activePercentage).toBe(0);
      });

      it('counts heavy attacks toward activity uptime', () => {
        const heavyAbilityId = 16041; // two-handed heavy attack
        const casts: CastEvent[] = [createCast(FIGHT_START, heavyAbilityId, 50)];

        const result = calculateActivePercentage(
          casts,
          [],
          PLAYER_ID,
          FIGHT_START,
          FIGHT_START + 2000,
        );

        expect(result.totalCasts).toBe(1);
        expect(result.baseActiveSeconds).toBeCloseTo(1, 5);
        expect(result.activePercentage).toBeCloseTo(50, 5);
      });

      it('counts begincast events when no matching cast event exists', () => {
        const abilityId = 7001;
        const casts: UnifiedCastEvent[] = [createBeginCast(FIGHT_START, abilityId, 60)];

        const result = calculateActivePercentage(
          casts,
          [],
          PLAYER_ID,
          FIGHT_START,
          FIGHT_START + 2000,
        );

        expect(result.totalCasts).toBe(1);
        expect(result.baseActiveSeconds).toBeCloseTo(1, 5);
      });
    });
    it('should return 0 DPS for zero duration', () => {
      const damageEvents: DamageEvent[] = [
        {
          timestamp: FIGHT_START,
          type: 'damage',
          sourceID: PLAYER_ID,
          sourceIsFriendly: true,
          targetID: 2,
          targetIsFriendly: false,
          abilityGameID: 12345,
          fight: 1,
          amount: 10000,
          hitType: 1,
          castTrackID: 1,
          sourceResources: mockResources,
          targetResources: mockResources,
        },
      ];
      const result = calculateDPS(damageEvents, PLAYER_ID, FIGHT_START, FIGHT_START);
      expect(result.totalDamage).toBe(10000);
      expect(result.dps).toBe(0);
      expect(result.durationMs).toBe(0);
    });

    it('should return 0 damage when no damage events for player', () => {
      const damageEvents: DamageEvent[] = [
        {
          timestamp: FIGHT_START + 1000,
          type: 'damage',
          sourceID: 999, // Different player
          sourceIsFriendly: true,
          targetID: 2,
          targetIsFriendly: false,
          abilityGameID: 12345,
          fight: 1,
          amount: 10000,
          hitType: 1,
          castTrackID: 1,
          sourceResources: mockResources,
          targetResources: mockResources,
        },
      ];

      const result = calculateDPS(damageEvents, PLAYER_ID, FIGHT_START, FIGHT_END);

      expect(result.totalDamage).toBe(0);
      expect(result.dps).toBe(0);
      expect(result.durationMs).toBe(60000);
    });
  });

  describe('analyzeWeaving', () => {
    const LIGHT_ATTACK_ID = Array.from(LIGHT_ATTACK_ABILITY_IDS)[0]; // Use first light attack ID from the set

    it('should calculate weave accuracy correctly using cast events', () => {
      const castEvents: CastEvent[] = [
        {
          timestamp: FIGHT_START + 1500, // Light attack cast
          type: 'cast',
          sourceID: PLAYER_ID,
          sourceIsFriendly: true,
          targetID: 2,
          targetIsFriendly: false,
          abilityGameID: LIGHT_ATTACK_ID,
          fight: 1,
        },
        {
          timestamp: FIGHT_START + 2000, // Skill cast
          type: 'cast',
          sourceID: PLAYER_ID,
          sourceIsFriendly: true,
          targetID: 2,
          targetIsFriendly: false,
          abilityGameID: 12345, // Regular skill
          fight: 1,
        },
        {
          timestamp: FIGHT_START + 3500, // Light attack cast
          type: 'cast',
          sourceID: PLAYER_ID,
          sourceIsFriendly: true,
          targetID: 2,
          targetIsFriendly: false,
          abilityGameID: LIGHT_ATTACK_ID,
          fight: 1,
        },
        {
          timestamp: FIGHT_START + 4000, // Skill cast
          type: 'cast',
          sourceID: PLAYER_ID,
          sourceIsFriendly: true,
          targetID: 2,
          targetIsFriendly: false,
          abilityGameID: 12346, // Regular skill
          fight: 1,
        },
      ];

      const damageEvents: DamageEvent[] = []; // Not used anymore

      const result = analyzeWeaving(castEvents, damageEvents, PLAYER_ID, FIGHT_START, FIGHT_END);

      expect(result.totalSkills).toBe(2);
      expect(result.lightAttacks).toBe(2);
      expect(result.properWeaves).toBe(2);
      expect(result.weaveAccuracy).toBe(100);
      expect(result.missedWeaves).toBe(0);
    });

    it('should handle missed weaves', () => {
      const castEvents: CastEvent[] = [
        {
          timestamp: FIGHT_START + 2000,
          type: 'cast',
          sourceID: PLAYER_ID,
          sourceIsFriendly: true,
          targetID: 2,
          targetIsFriendly: false,
          abilityGameID: 12345,
          fight: 1,
        },
      ];

      const damageEvents: DamageEvent[] = []; // Not used

      const result = analyzeWeaving(castEvents, damageEvents, PLAYER_ID, FIGHT_START, FIGHT_END);

      expect(result.totalSkills).toBe(1);
      expect(result.lightAttacks).toBe(0);
      expect(result.properWeaves).toBe(0);
      expect(result.weaveAccuracy).toBe(0);
      expect(result.missedWeaves).toBe(1);
    });

    it('should detect weaves when light attack cast appears before skill cast', () => {
      const castEvents: CastEvent[] = [
        {
          timestamp: FIGHT_START + 1900, // Light attack cast
          type: 'cast',
          sourceID: PLAYER_ID,
          sourceIsFriendly: true,
          targetID: 2,
          targetIsFriendly: false,
          abilityGameID: LIGHT_ATTACK_ID,
          fight: 1,
        },
        {
          timestamp: FIGHT_START + 2000, // Skill cast 100ms after light attack
          type: 'cast',
          sourceID: PLAYER_ID,
          sourceIsFriendly: true,
          targetID: 2,
          targetIsFriendly: false,
          abilityGameID: 12345, // Regular skill
          fight: 1,
        },
      ];

      const damageEvents: DamageEvent[] = []; // Not used

      const result = analyzeWeaving(castEvents, damageEvents, PLAYER_ID, FIGHT_START, FIGHT_END);

      expect(result.totalSkills).toBe(1);
      expect(result.lightAttacks).toBe(1);
      expect(result.properWeaves).toBe(1);
      expect(result.weaveAccuracy).toBe(100);
      expect(result.missedWeaves).toBe(0);
      expect(result.averageWeaveTiming).toBe(100); // 100ms timing
    });

    it('should handle missed light attacks (light attack cast but no skill)', () => {
      const castEvents: CastEvent[] = [
        {
          timestamp: FIGHT_START + 1900, // Light attack cast
          type: 'cast',
          sourceID: PLAYER_ID,
          sourceIsFriendly: true,
          targetID: 2,
          targetIsFriendly: false,
          abilityGameID: LIGHT_ATTACK_ID,
          fight: 1,
        },
        {
          timestamp: FIGHT_START + 2000, // Skill cast
          type: 'cast',
          sourceID: PLAYER_ID,
          sourceIsFriendly: true,
          targetID: 2,
          targetIsFriendly: false,
          abilityGameID: 12345, // Regular skill
          fight: 1,
        },
      ];

      const damageEvents: DamageEvent[] = []; // Not used

      const result = analyzeWeaving(castEvents, damageEvents, PLAYER_ID, FIGHT_START, FIGHT_END);

      expect(result.totalSkills).toBe(1);
      expect(result.lightAttacks).toBe(1);
      expect(result.properWeaves).toBe(1);
      expect(result.weaveAccuracy).toBe(100);
      expect(result.missedWeaves).toBe(0);
    });
  });

  describe('detectTrialDummyBuffs', () => {
    it('should detect active trial dummy buffs', () => {
      // Use specific buff IDs from the TRIAL_DUMMY_BUFF_IDS set
      const majorSlayerId = 93109; // Major Slayer
      const majorCourageId = 109966; // Major Courage

      const buffEvents: BuffEvent[] = [
        {
          timestamp: FIGHT_START + 1000,
          type: 'applybuff',
          sourceID: 2,
          sourceIsFriendly: true,
          targetID: PLAYER_ID,
          targetIsFriendly: true,
          abilityGameID: majorSlayerId,
          fight: 1,
          extraAbilityGameID: 0,
        },
        {
          timestamp: FIGHT_START + 1000,
          type: 'applybuff',
          sourceID: 2,
          sourceIsFriendly: true,
          targetID: PLAYER_ID,
          targetIsFriendly: true,
          abilityGameID: majorCourageId,
          fight: 1,
          extraAbilityGameID: 0,
        },
      ];

      const result = detectTrialDummyBuffs(buffEvents, PLAYER_ID, FIGHT_START, FIGHT_END);

      expect(result.activeBuffs.length).toBeGreaterThan(0);
      expect(result.activeBuffs).toContain('Major Slayer');
      expect(result.activeBuffs).toContain('Major Courage');
      expect(result.missingBuffs.length).toBeGreaterThan(0);
    });

    it('should detect all missing buffs when none are active', () => {
      const buffEvents: BuffEvent[] = [];

      const result = detectTrialDummyBuffs(buffEvents, PLAYER_ID, FIGHT_START, FIGHT_END);

      expect(result.activeBuffs.length).toBe(0);
      expect(result.missingBuffs.length).toBe(TRIAL_DUMMY_BUFF_IDS.size);
    });
  });
});
