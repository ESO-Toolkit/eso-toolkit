import { FightFragment } from '../graphql/gql/graphql';
import { createMockDamageEvent } from '../test/utils/combatLogMockFactories';
import { DamageEvent } from '../types/combatlogEvents';

import {
  calculateActivePercentages,
  calculateDamageStatisticsWithActivity,
} from './activePercentageUtils';

describe('activePercentageUtils', () => {
  describe('calculateActivePercentages', () => {
    const mockFight: FightFragment = {
      __typename: 'ReportFight',
      id: 1,
      startTime: 0,
      endTime: 10000, // 10 seconds
      difficulty: 1,
      encounterID: 1,
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

    it.each([
      ['NaN start time', Number.NaN, 10000],
      ['NaN end time', 0, Number.NaN],
      ['infinite start time', Number.POSITIVE_INFINITY, 10000],
      ['infinite end time', 0, Number.POSITIVE_INFINITY],
    ])('returns no activity values for %s', (_description, startTime, endTime) => {
      const result = calculateActivePercentages(
        { ...mockFight, startTime, endTime },
        {
          '123': [
            createMockDamageEvent({
              timestamp: 2000,
              sourceID: 123,
              targetIsFriendly: false,
              amount: 100,
            }),
          ],
        },
      );

      expect(result).toEqual({});
      expect(Object.values(result).flatMap(Object.values).some(Number.isNaN)).toBe(false);
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

    it('sorts compact timestamps when incoming events are out of order', () => {
      const result = calculateActivePercentages(mockFight, {
        '123': [
          createMockDamageEvent({
            timestamp: 5000,
            sourceID: 123,
            targetIsFriendly: false,
            amount: 100,
          }),
          createMockDamageEvent({
            timestamp: 2000,
            sourceID: 123,
            targetIsFriendly: false,
            amount: 100,
          }),
        ],
      });

      expect(result[123].activeTimeMs).toBe(3000);
      expect(result[123].activePercentage).toBe(30);
    });
  });

  describe('calculateDamageStatisticsWithActivity', () => {
    const mockFight: FightFragment = {
      __typename: 'ReportFight',
      id: 1,
      startTime: 0,
      endTime: 10000,
      difficulty: 1,
      encounterID: 1,
      name: 'Test Fight',
      friendlyPlayers: [],
      enemyPlayers: [],
      bossPercentage: null,
    };

    it('applies selected targets once while preserving attributed-player totals and source activity', () => {
      const statistics = calculateDamageStatisticsWithActivity(
        mockFight,
        {
          // Charged-atronach damage is already attributed under player 123, but
          // its source remains the atronach and must not count toward activity.
          '123': [
            createMockDamageEvent({
              timestamp: 1000,
              sourceID: 999,
              targetID: 456,
              targetIsFriendly: false,
              amount: 200,
              hitType: 2,
            }),
            createMockDamageEvent({
              timestamp: 9000,
              sourceID: 999,
              targetID: 456,
              targetIsFriendly: false,
              amount: 300,
            }),
            createMockDamageEvent({
              timestamp: 2000,
              sourceID: 123,
              targetID: 457,
              targetIsFriendly: false,
              amount: 400,
            }),
            createMockDamageEvent({
              timestamp: 3000,
              sourceID: 123,
              targetID: 456,
              targetIsFriendly: true,
              amount: 500,
            }),
          ],
        },
        new Set([456]),
      );

      expect(statistics.damageByPlayer).toEqual({ 123: 500 });
      expect(statistics.criticalDamageByPlayer).toEqual({ 123: 200 });
      expect(statistics.damageEventsBySource).toEqual({ 123: 2 });
      expect(statistics.activePercentages[123]).toMatchObject({
        activeTimeMs: 0,
        activePercentage: 0,
        totalTimeMs: 10000,
      });
    });

    it('uses only selected direct-damage timestamps for activity intervals', () => {
      const statistics = calculateDamageStatisticsWithActivity(
        mockFight,
        {
          '123': [
            createMockDamageEvent({
              timestamp: 5000,
              sourceID: 123,
              targetID: 456,
              targetIsFriendly: false,
              amount: 100,
            }),
            createMockDamageEvent({
              timestamp: 2000,
              sourceID: 123,
              targetID: 456,
              targetIsFriendly: false,
              amount: 100,
            }),
            createMockDamageEvent({
              timestamp: 9000,
              sourceID: 123,
              targetID: 457,
              targetIsFriendly: false,
              amount: 100,
            }),
          ],
        },
        new Set([456]),
      );

      expect(statistics.damageByPlayer).toEqual({ 123: 200 });
      expect(statistics.activePercentages[123]).toMatchObject({
        activeTimeMs: 3000,
        activePercentage: 30,
      });
    });

    it.each([
      ['NaN start time', Number.NaN, 10000],
      ['NaN end time', 0, Number.NaN],
      ['infinite start time', Number.NEGATIVE_INFINITY, 10000],
      ['infinite end time', 0, Number.POSITIVE_INFINITY],
    ])('returns an empty typed result for %s', (_description, startTime, endTime) => {
      const statistics = calculateDamageStatisticsWithActivity(
        { ...mockFight, startTime, endTime },
        {
          '123': [
            createMockDamageEvent({
              timestamp: 2000,
              sourceID: 123,
              targetIsFriendly: false,
              amount: 100,
            }),
          ],
        },
        new Set(),
      );

      expect(statistics).toEqual({
        damageByPlayer: {},
        criticalDamageByPlayer: {},
        damageEventsBySource: {},
        activePercentages: {},
      });
      expect(Object.values(statistics).flatMap(Object.values).some(Number.isNaN)).toBe(false);
    });
  });
});
