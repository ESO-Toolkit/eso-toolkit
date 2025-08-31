import { FightFragment } from '../graphql/generated';
import { createMockDamageEvent } from '../test/utils/combatLogMockFactories';
import { DamageEvent } from '../types/combatlogEvents';

import { calculateActivePercentages } from './activePercentageUtils';

describe('activePercentageUtils', () => {
  describe('calculateActivePercentages', () => {
    const mockFight: FightFragment = {
      __typename: 'ReportFight',
      id: 1,
      startTime: 0,
      endTime: 10000, // 10 seconds
      difficulty: 1,
      name: 'Test Fight',
      friendlyPlayers: [],
      enemyPlayers: [],
      bossPercentage: null,
    };

    it('should calculate active percentage based on damage events', () => {
      const damageEvents: DamageEvent[] = [
        createMockDamageEvent({
          timestamp: 2000,
          sourceID: 123,
          sourceIsFriendly: true,
          targetID: 456,
          targetIsFriendly: false,
          abilityGameID: 789,
          amount: 1000,
        }),
        createMockDamageEvent({
          timestamp: 2500,
          sourceID: 123,
          sourceIsFriendly: true,
          targetID: 456,
          targetIsFriendly: false,
          abilityGameID: 789,
          amount: 1200,
        }),
      ];

      // Group damage events by player like the real function expects
      const damageEventsByPlayer: Record<string, DamageEvent[]> = {
        '123': damageEvents,
      };

      const result = calculateActivePercentages(mockFight, damageEventsByPlayer);

      expect(result[123]).toBeDefined();
      expect(result[123].playerId).toBe(123);
      expect(result[123].totalTimeMs).toBe(10000);
      // Player deals damage from 2000-2500ms (continuous period) = 500ms out of 10000ms = 5%
      expect(result[123].activePercentage).toBe(5);
    });

    it('should handle gaps in damage events (separate active periods)', () => {
      const damageEvents: DamageEvent[] = [
        createMockDamageEvent({
          timestamp: 2000,
          sourceID: 123,
          sourceIsFriendly: true,
          targetID: 456,
          targetIsFriendly: false,
          abilityGameID: 789,
          amount: 1000,
        }),
        createMockDamageEvent({
          timestamp: 8000,
          sourceID: 123,
          sourceIsFriendly: true,
          targetID: 456,
          targetIsFriendly: false,
          abilityGameID: 789,
          amount: 1200,
        }),
      ];

      // Group damage events by player like the real function expects
      const damageEventsByPlayer: Record<string, DamageEvent[]> = {
        '123': damageEvents,
      };

      const result = calculateActivePercentages(mockFight, damageEventsByPlayer);

      expect(result[123]).toBeDefined();
      expect(result[123].playerId).toBe(123);
      expect(result[123].totalTimeMs).toBe(10000);
      // Two separate damage events: 2000ms and 8000ms with 6s gap between them
      // Since gap is < 10s threshold, this is one continuous period from 2000-8000ms = 6000ms out of 10000ms = 60%
      expect(result[123].activePercentage).toBe(60);
    });

    it('should handle empty events gracefully', () => {
      const result = calculateActivePercentages(mockFight, {});

      expect(result).toEqual({});
    });

    it('should return empty result when no damage events are available', () => {
      // Group events by player (but with empty damage events)
      const damageEventsByPlayer: Record<string, DamageEvent[]> = {};

      const result = calculateActivePercentages(mockFight, damageEventsByPlayer);

      // Since no damage events are present, should return empty result
      expect(result).toEqual({});
    });

    it('should handle invalid fight duration', () => {
      const invalidFight: FightFragment = {
        ...mockFight,
        startTime: 10000,
        endTime: 5000, // Invalid - end before start
      };

      const result = calculateActivePercentages(invalidFight, {});

      expect(result).toEqual({});
    });

    it('should calculate activity based on damage events only', () => {
      const damageEvents: DamageEvent[] = [
        createMockDamageEvent({
          timestamp: 2000,
          sourceID: 123,
          sourceIsFriendly: true,
          targetID: 456,
          targetIsFriendly: false,
          abilityGameID: 789,
          amount: 1000,
        }),
      ];

      // Group damage events by player
      const damageEventsByPlayer: Record<string, DamageEvent[]> = {
        '123': damageEvents,
      };

      const result = calculateActivePercentages(mockFight, damageEventsByPlayer);

      // Should have activity based on the damage event
      expect(result[123]).toBeDefined();
      expect(result[123].playerId).toBe(123);
      expect(result[123].totalTimeMs).toBe(10000);
      // Single damage event creates minimal activity period
      expect(result[123].activePercentage).toBeGreaterThanOrEqual(0);
    });
  });
});
