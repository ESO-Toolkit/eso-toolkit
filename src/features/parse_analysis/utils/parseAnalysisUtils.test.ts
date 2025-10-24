/**
 * Tests for parse analysis utilities
 */

import { BuffEvent, CastEvent, DamageEvent } from '../../../types/combatlogEvents';
import {
  STAMINA_FOOD,
  MAGICKA_FOOD,
  INCREASE_MAX_HEALTH_AND_STAMINA,
} from '../../../types/abilities';
import {
  detectFood,
  calculateCPM,
  analyzeWeaving,
  detectTrialDummyBuffs,
  LIGHT_ATTACK_ABILITY_ID,
  TRIAL_DUMMY_BUFFS,
} from './parseAnalysisUtils';

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
  });

  describe('analyzeWeaving', () => {
    it('should calculate weave accuracy correctly using damage events', () => {
      const castEvents: CastEvent[] = [
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

      const damageEvents: DamageEvent[] = [
        {
          timestamp: FIGHT_START + 1500, // Light attack before first skill
          type: 'damage',
          sourceID: PLAYER_ID,
          sourceIsFriendly: true,
          targetID: 2,
          targetIsFriendly: false,
          abilityGameID: LIGHT_ATTACK_ABILITY_ID,
          fight: 1,
          hitType: 1,
          amount: 1000,
          castTrackID: 1,
          sourceResources: {} as any,
          targetResources: {} as any,
        },
        {
          timestamp: FIGHT_START + 3500, // Light attack before second skill
          type: 'damage',
          sourceID: PLAYER_ID,
          sourceIsFriendly: true,
          targetID: 2,
          targetIsFriendly: false,
          abilityGameID: LIGHT_ATTACK_ABILITY_ID,
          fight: 1,
          hitType: 1,
          amount: 1000,
          castTrackID: 2,
          sourceResources: {} as any,
          targetResources: {} as any,
        },
      ];

      const result = analyzeWeaving(
        castEvents,
        damageEvents,
        PLAYER_ID,
        FIGHT_START,
        FIGHT_END,
      );

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

      const result = analyzeWeaving(
        castEvents,
        damageEvents,
        PLAYER_ID,
        FIGHT_START,
        FIGHT_END,
      );

      expect(result.totalSkills).toBe(1);
      expect(result.lightAttacks).toBe(0);
      expect(result.properWeaves).toBe(0);
      expect(result.weaveAccuracy).toBe(0);
      expect(result.missedWeaves).toBe(1);
    });

    it('should detect weaves when light attack damage appears before skill cast', () => {
      const castEvents: CastEvent[] = [
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

      const damageEvents: DamageEvent[] = [
        {
          timestamp: FIGHT_START + 1900, // Light attack damage 100ms before skill
          type: 'damage',
          sourceID: PLAYER_ID,
          sourceIsFriendly: true,
          targetID: 2,
          targetIsFriendly: false,
          abilityGameID: LIGHT_ATTACK_ABILITY_ID,
          fight: 1,
          hitType: 1,
          amount: 1000,
          castTrackID: 1,
          sourceResources: {} as any,
          targetResources: {} as any,
        },
      ];

      const result = analyzeWeaving(
        castEvents,
        damageEvents,
        PLAYER_ID,
        FIGHT_START,
        FIGHT_END,
      );

      expect(result.totalSkills).toBe(1);
      expect(result.lightAttacks).toBe(1);
      expect(result.properWeaves).toBe(1);
      expect(result.weaveAccuracy).toBe(100);
      expect(result.missedWeaves).toBe(0);
      expect(result.averageWeaveTiming).toBe(100); // 100ms timing
    });

    it('should handle light attacks that miss (no damage events)', () => {
      const castEvents: CastEvent[] = [
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

      const damageEvents: DamageEvent[] = []; // No light attack damage (missed)

      const result = analyzeWeaving(
        castEvents,
        damageEvents,
        PLAYER_ID,
        FIGHT_START,
        FIGHT_END,
      );

      expect(result.totalSkills).toBe(1);
      expect(result.lightAttacks).toBe(0); // No damage events
      expect(result.properWeaves).toBe(0); // Can't detect weave without damage
      expect(result.weaveAccuracy).toBe(0);
      expect(result.missedWeaves).toBe(1);
    });
  });

  describe('detectTrialDummyBuffs', () => {
    it('should detect active trial dummy buffs', () => {
      const buffEvents: BuffEvent[] = [
        {
          timestamp: FIGHT_START + 1000,
          type: 'applybuff',
          sourceID: 2,
          sourceIsFriendly: true,
          targetID: PLAYER_ID,
          targetIsFriendly: true,
          abilityGameID: TRIAL_DUMMY_BUFFS.MAJOR_SLAYER,
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
          abilityGameID: TRIAL_DUMMY_BUFFS.MAJOR_COURAGE,
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
      expect(result.missingBuffs.length).toBe(Object.keys(TRIAL_DUMMY_BUFFS).length);
    });
  });
});
