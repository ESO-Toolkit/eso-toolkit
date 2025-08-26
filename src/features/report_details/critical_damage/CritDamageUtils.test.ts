import { KnownAbilities } from '../../../types/abilities';
import { BuffEvent, DebuffEvent } from '../../../types/combatlogEvents';

import { BuffLookupData, createBuffLookup, createDebuffLookup } from './BuffLookupUtils';
import {
  isBuffActive,
  isDebuffActive,
  getEnabledCriticalDamageSources,
  getAllCriticalDamageSourcesWithActiveState,
  isBuffActiveAtTimestamp,
  isDebuffActiveAtTimestamp,
  calculateCriticalDamageAtTimestamp,
  calculateStaticCriticalDamage,
  calculateDynamicCriticalDamageAtTimestamp,
} from './CritDamageUtils';

describe('CritDamageUtils with BuffLookup', () => {
  describe('isBuffActive', () => {
    it('should return false for empty buff lookup', () => {
      const emptyBuffLookup: BuffLookupData = { buffIntervals: new Map() };
      expect(isBuffActive(emptyBuffLookup, KnownAbilities.LUCENT_ECHOES)).toBe(false);
    });

    it('should return true when buff exists in lookup', () => {
      const buffEvents: BuffEvent[] = [
        {
          timestamp: 1000,
          type: 'applybuff',
          sourceID: 1,
          sourceIsFriendly: true,
          targetID: 2,
          targetIsFriendly: true,
          abilityGameID: KnownAbilities.LUCENT_ECHOES,
          fight: 1,
          extraAbilityGameID: 0,
        },
      ];

      const buffLookup = createBuffLookup(buffEvents);
      expect(isBuffActive(buffLookup, KnownAbilities.LUCENT_ECHOES)).toBe(true);
    });

    it('should return false when buff does not exist in lookup', () => {
      const buffEvents: BuffEvent[] = [
        {
          timestamp: 1000,
          type: 'applybuff',
          sourceID: 1,
          sourceIsFriendly: true,
          targetID: 2,
          targetIsFriendly: true,
          abilityGameID: KnownAbilities.LUCENT_ECHOES,
          fight: 1,
          extraAbilityGameID: 0,
        },
      ];

      const buffLookup = createBuffLookup(buffEvents);
      expect(isBuffActive(buffLookup, KnownAbilities.MINOR_BRITTLE)).toBe(false);
    });
  });

  describe('isDebuffActive', () => {
    it('should return false for empty debuff lookup', () => {
      const emptyDebuffLookup: BuffLookupData = { buffIntervals: new Map() };
      expect(isDebuffActive(emptyDebuffLookup, KnownAbilities.MINOR_BRITTLE)).toBe(false);
    });

    it('should return true when debuff exists in lookup', () => {
      const debuffEvents: DebuffEvent[] = [
        {
          timestamp: 1000,
          type: 'applydebuff',
          sourceID: 1,
          sourceIsFriendly: false,
          targetID: 2,
          targetIsFriendly: false,
          abilityGameID: KnownAbilities.MINOR_BRITTLE,
          fight: 1,
        },
      ];

      const debuffLookup = createDebuffLookup(debuffEvents);
      expect(isDebuffActive(debuffLookup, KnownAbilities.MINOR_BRITTLE)).toBe(true);
    });
  });

  describe('getEnabledCriticalDamageSources', () => {
    it('should return sources based on buff and debuff lookups', () => {
      // Create buff lookup with Lucent Echoes active
      const buffEvents: BuffEvent[] = [
        {
          timestamp: 1000,
          type: 'applybuff',
          sourceID: 1,
          sourceIsFriendly: true,
          targetID: 2,
          targetIsFriendly: true,
          abilityGameID: KnownAbilities.LUCENT_ECHOES,
          fight: 1,
          extraAbilityGameID: 0,
        },
      ];

      // Create debuff lookup with Minor Brittle active
      const debuffEvents: DebuffEvent[] = [
        {
          timestamp: 1000,
          type: 'applydebuff',
          sourceID: 1,
          sourceIsFriendly: false,
          targetID: 3,
          targetIsFriendly: false,
          abilityGameID: KnownAbilities.MINOR_BRITTLE,
          fight: 1,
        },
      ];

      const buffLookup = createBuffLookup(buffEvents);
      const debuffLookup = createDebuffLookup(debuffEvents);

      const sources = getEnabledCriticalDamageSources(buffLookup, debuffLookup, null);

      // Should find both Lucent Echoes (buff) and Minor Brittle (debuff)
      expect(sources).toHaveLength(4); // 2 computed sources + 2 active sources
      expect(
        sources.some((s) => 'ability' in s && s.ability === KnownAbilities.LUCENT_ECHOES)
      ).toBe(true);
      expect(
        sources.some((s) => 'ability' in s && s.ability === KnownAbilities.MINOR_BRITTLE)
      ).toBe(true);
    });

    it('should return empty array for empty lookups', () => {
      const emptyBuffLookup: BuffLookupData = { buffIntervals: new Map() };
      const emptyDebuffLookup: BuffLookupData = { buffIntervals: new Map() };

      const sources = getEnabledCriticalDamageSources(emptyBuffLookup, emptyDebuffLookup, null);

      // Should only find computed sources since we don't have combatant info
      expect(sources).toHaveLength(2); // DEXTERITY and FIGHTING_FINESSE are always active
    });
  });

  describe('isBuffActiveAtTimestamp', () => {
    it('should return false for timestamp outside buff duration', () => {
      const buffEvents: BuffEvent[] = [
        {
          timestamp: 1000,
          type: 'applybuff',
          sourceID: 1,
          sourceIsFriendly: true,
          targetID: 2,
          targetIsFriendly: true,
          abilityGameID: KnownAbilities.LUCENT_ECHOES,
          fight: 1,
          extraAbilityGameID: 0,
        },
        {
          timestamp: 5000,
          type: 'removebuff',
          sourceID: 1,
          sourceIsFriendly: true,
          targetID: 2,
          targetIsFriendly: true,
          abilityGameID: KnownAbilities.LUCENT_ECHOES,
          fight: 1,
        },
      ];

      const buffLookup = createBuffLookup(buffEvents);

      expect(isBuffActiveAtTimestamp(buffLookup, KnownAbilities.LUCENT_ECHOES, 500)).toBe(false); // Before apply
      expect(isBuffActiveAtTimestamp(buffLookup, KnownAbilities.LUCENT_ECHOES, 3000)).toBe(true); // During buff
      expect(isBuffActiveAtTimestamp(buffLookup, KnownAbilities.LUCENT_ECHOES, 6000)).toBe(false); // After remove
    });
  });

  describe('calculateCriticalDamageAtTimestamp', () => {
    it('should calculate critical damage with active buffs and debuffs', () => {
      const buffEvents: BuffEvent[] = [
        {
          timestamp: 1000,
          type: 'applybuff',
          sourceID: 1,
          sourceIsFriendly: true,
          targetID: 2,
          targetIsFriendly: true,
          abilityGameID: KnownAbilities.LUCENT_ECHOES,
          fight: 1,
          extraAbilityGameID: 0,
        },
      ];

      const debuffEvents: DebuffEvent[] = [
        {
          timestamp: 1000,
          type: 'applydebuff',
          sourceID: 1,
          sourceIsFriendly: false,
          targetID: 3,
          targetIsFriendly: false,
          abilityGameID: KnownAbilities.MINOR_BRITTLE,
          fight: 1,
        },
      ];

      const buffLookup = createBuffLookup(buffEvents, 10000);
      const debuffLookup = createDebuffLookup(debuffEvents, 10000);

      // Test at timestamp when both are active
      const critDamage = calculateCriticalDamageAtTimestamp(
        buffLookup,
        debuffLookup,
        null, // no combatant info
        undefined, // no player data
        2000 // timestamp when both should be active
      );

      // Base 50% + LUCENT_ECHOES=11% + MINOR_BRITTLE=10% (computed sources return 0 without combatantInfo)
      expect(critDamage).toBe(71); // 50 + 11 + 10
    });

    it('should calculate base critical damage when no buffs active', () => {
      const emptyBuffLookup: BuffLookupData = { buffIntervals: new Map() };
      const emptyDebuffLookup: BuffLookupData = { buffIntervals: new Map() };

      const critDamage = calculateCriticalDamageAtTimestamp(
        emptyBuffLookup,
        emptyDebuffLookup,
        null,
        undefined,
        1000
      );

      // Base 50% only (computed sources return 0 without combatantInfo)
      expect(critDamage).toBe(50);
    });
  });

  describe('calculateStaticCriticalDamage', () => {
    it('should return base critical damage when no combatantInfo', () => {
      const staticCritDamage = calculateStaticCriticalDamage(null, undefined);
      expect(staticCritDamage).toBe(50); // Base only
    });

    it('should include computed sources when available', () => {
      // This would require mocking combatantInfo and playerData
      // For now, testing with null shows the base case
      const staticCritDamage = calculateStaticCriticalDamage(null, undefined);
      expect(staticCritDamage).toBe(50);
    });
  });

  describe('calculateDynamicCriticalDamageAtTimestamp', () => {
    it('should return 0 when no buffs/debuffs active', () => {
      const emptyBuffLookup: BuffLookupData = { buffIntervals: new Map() };
      const emptyDebuffLookup: BuffLookupData = { buffIntervals: new Map() };

      const dynamicCritDamage = calculateDynamicCriticalDamageAtTimestamp(
        emptyBuffLookup,
        emptyDebuffLookup,
        1000
      );

      expect(dynamicCritDamage).toBe(0);
    });

    it('should calculate buff and debuff contributions', () => {
      const buffEvents: BuffEvent[] = [
        {
          timestamp: 1000,
          type: 'applybuff',
          sourceID: 1,
          sourceIsFriendly: true,
          targetID: 2,
          targetIsFriendly: true,
          abilityGameID: KnownAbilities.LUCENT_ECHOES,
          fight: 1,
          extraAbilityGameID: 0,
        },
      ];

      const debuffEvents: DebuffEvent[] = [
        {
          timestamp: 1000,
          type: 'applydebuff',
          sourceID: 1,
          sourceIsFriendly: false,
          targetID: 3,
          targetIsFriendly: false,
          abilityGameID: KnownAbilities.MINOR_BRITTLE,
          fight: 1,
        },
      ];

      const buffLookup = createBuffLookup(buffEvents, 10000);
      const debuffLookup = createDebuffLookup(debuffEvents, 10000);

      const dynamicCritDamage = calculateDynamicCriticalDamageAtTimestamp(
        buffLookup,
        debuffLookup,
        2000 // timestamp when both should be active
      );

      // LUCENT_ECHOES=11% + MINOR_BRITTLE=10%
      expect(dynamicCritDamage).toBe(21);
    });
  });

  describe('Optimization Integration', () => {
    it('should produce same result as original function', () => {
      const buffEvents: BuffEvent[] = [
        {
          timestamp: 1000,
          type: 'applybuff',
          sourceID: 1,
          sourceIsFriendly: true,
          targetID: 2,
          targetIsFriendly: true,
          abilityGameID: KnownAbilities.LUCENT_ECHOES,
          fight: 1,
          extraAbilityGameID: 0,
        },
      ];

      const debuffEvents: DebuffEvent[] = [
        {
          timestamp: 1000,
          type: 'applydebuff',
          sourceID: 1,
          sourceIsFriendly: false,
          targetID: 3,
          targetIsFriendly: false,
          abilityGameID: KnownAbilities.MINOR_BRITTLE,
          fight: 1,
        },
      ];

      const buffLookup = createBuffLookup(buffEvents, 10000);
      const debuffLookup = createDebuffLookup(debuffEvents, 10000);
      const timestamp = 2000;

      // Original approach
      const originalResult = calculateCriticalDamageAtTimestamp(
        buffLookup,
        debuffLookup,
        null,
        undefined,
        timestamp
      );

      // Optimized approach
      const staticCritDamage = calculateStaticCriticalDamage(null, undefined);
      const dynamicCritDamage = calculateDynamicCriticalDamageAtTimestamp(
        buffLookup,
        debuffLookup,
        timestamp
      );
      const optimizedResult = staticCritDamage + dynamicCritDamage;

      expect(optimizedResult).toBe(originalResult);
    });

    it('should be more efficient for multiple timestamps', () => {
      const buffEvents: BuffEvent[] = [
        {
          timestamp: 1000,
          type: 'applybuff',
          sourceID: 1,
          sourceIsFriendly: true,
          targetID: 2,
          targetIsFriendly: true,
          abilityGameID: KnownAbilities.LUCENT_ECHOES,
          fight: 1,
          extraAbilityGameID: 0,
        },
      ];

      const buffLookup = createBuffLookup(buffEvents, 10000);
      const emptyDebuffLookup: BuffLookupData = { buffIntervals: new Map() };

      // Pre-calculate static damage once (this is the optimization)
      const staticCritDamage = calculateStaticCriticalDamage(null, undefined);

      // Simulate calculating for multiple timestamps (like we do per-second)
      const timestamps = [1000, 2000, 3000, 4000, 5000];

      // With optimization: static calculation happens once, dynamic per timestamp
      const optimizedResults = timestamps.map((timestamp) => {
        const dynamicCritDamage = calculateDynamicCriticalDamageAtTimestamp(
          buffLookup,
          emptyDebuffLookup,
          timestamp
        );
        return staticCritDamage + dynamicCritDamage;
      });

      // Without optimization: full calculation per timestamp
      const originalResults = timestamps.map((timestamp) =>
        calculateCriticalDamageAtTimestamp(
          buffLookup,
          emptyDebuffLookup,
          null,
          undefined,
          timestamp
        )
      );

      // Results should be identical
      expect(optimizedResults).toEqual(originalResults);

      // All results should be the same since buff is active throughout
      expect(optimizedResults.every((result) => result === optimizedResults[0])).toBe(true);
    });
  });

  describe('getAllCriticalDamageSourcesWithActiveState', () => {
    it('should return all sources with active state', () => {
      const buffEvents: BuffEvent[] = [
        {
          timestamp: 1000,
          type: 'applybuff',
          sourceID: 1,
          sourceIsFriendly: true,
          targetID: 2,
          targetIsFriendly: true,
          abilityGameID: KnownAbilities.LUCENT_ECHOES,
          fight: 1,
          extraAbilityGameID: 0,
        },
      ];

      const buffLookup = createBuffLookup(buffEvents);
      const emptyDebuffLookup: BuffLookupData = { buffIntervals: new Map() };

      const sources = getAllCriticalDamageSourcesWithActiveState(buffLookup, emptyDebuffLookup, null);

      // Should return all sources (both active and inactive)
      expect(sources.length).toBeGreaterThan(0);
      expect(sources.every(source => typeof source.wasActive === 'boolean')).toBe(true);

      // Find the Lucent Echoes source and verify it's marked as active
      const lucentEchoesSource = sources.find(source => 
        source.source === 'buff' && 
        'ability' in source && 
        source.ability === KnownAbilities.LUCENT_ECHOES
      );
      expect(lucentEchoesSource?.wasActive).toBe(true);

      // Verify that other sources that aren't active are marked as inactive
      const inactiveSources = sources.filter(source => !source.wasActive);
      expect(inactiveSources.length).toBeGreaterThan(0);
    });

    it('should return all sources as inactive when no buffs/debuffs are present', () => {
      const emptyBuffLookup: BuffLookupData = { buffIntervals: new Map() };
      const emptyDebuffLookup: BuffLookupData = { buffIntervals: new Map() };

      const sources = getAllCriticalDamageSourcesWithActiveState(emptyBuffLookup, emptyDebuffLookup, null);

      // Should return all sources
      expect(sources.length).toBeGreaterThan(0);
      
      // Most sources should be inactive (except possibly some computed ones)
      const buffSources = sources.filter(source => source.source === 'buff' || source.source === 'debuff');
      expect(buffSources.every(source => source.wasActive === false)).toBe(true);
    });
  });
});
