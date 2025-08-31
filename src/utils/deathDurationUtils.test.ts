import {
  createMockDeathEvent,
  createMockBeginCastEvent,
  createMockCastEvent,
} from '../test/utils/combatLogMockFactories';
import { KnownAbilities } from '../types/abilities';
import { DeathEvent, UnifiedCastEvent } from '../types/combatlogEvents';

import { calculateDeathDurations, formatDeathDuration } from './deathDurationUtils';

describe('deathDurationUtils', () => {
  const fightStart = 1000;
  const fightEnd = 5000;

  describe('calculateDeathDurations', () => {
    it('should calculate death duration when player is resurrected', () => {
      const deathEvents: DeathEvent[] = [
        createMockDeathEvent({
          timestamp: 2000,
          targetID: 123,
          targetInstance: 0,
          sourceID: 456,
          sourceIsFriendly: false,
          targetIsFriendly: true,
          abilityGameID: 1234,
          amount: 100,
          targetResources: {
            hitPoints: 0,
            maxHitPoints: 1000,
            magicka: 500,
            maxMagicka: 1000,
            stamina: 300,
            maxStamina: 800,
            ultimate: 100,
            maxUltimate: 100,
            werewolf: 0,
            maxWerewolf: 100,
            absorb: 0,
            championPoints: 0,
            x: 0,
            y: 0,
            facing: 0,
          },
        }),
      ];

      const castEvents: UnifiedCastEvent[] = [
        createMockCastEvent({
          timestamp: 3500,
          sourceID: 789,
          sourceIsFriendly: true,
          targetID: 123, // Same player who died
          targetIsFriendly: true,
          abilityGameID: KnownAbilities.RESURRECT,
        }),
      ];

      const result = calculateDeathDurations(deathEvents, castEvents, fightStart, fightEnd);

      expect(result).toHaveLength(1);
      expect(result[0]).toEqual({
        playerId: 123,
        deathTime: 2000,
        resurrectionTime: 3500,
        deathDurationMs: 1500, // 3500 - 2000
      });
    });

    it('should handle death without resurrection (dead until fight end)', () => {
      const deathEvents: DeathEvent[] = [
        createMockDeathEvent({
          timestamp: 3000,
          targetID: 456,
          targetInstance: 0,
          sourceID: 123,
          sourceIsFriendly: false,
          targetIsFriendly: true,
          abilityGameID: 1234,
          amount: 100,
          castTrackID: 2,
        }),
      ];

      const castEvents: UnifiedCastEvent[] = [];

      const result = calculateDeathDurations(deathEvents, castEvents, fightStart, fightEnd);

      expect(result).toHaveLength(1);
      expect(result[0]).toEqual({
        playerId: 456,
        deathTime: 3000,
        resurrectionTime: null,
        deathDurationMs: 2000, // 5000 - 3000
      });
    });

    it('should ignore resurrect events that are not for the correct player', () => {
      const deathEvents: DeathEvent[] = [
        createMockDeathEvent({
          timestamp: 2000,
          targetID: 123,
          targetInstance: 0,
          sourceID: 456,
          sourceIsFriendly: false,
          targetIsFriendly: true,
          abilityGameID: 1234,
          amount: 100,
          castTrackID: 3,
        }),
      ];

      const castEvents: UnifiedCastEvent[] = [
        createMockCastEvent({
          timestamp: 3000,
          sourceID: 789,
          sourceIsFriendly: true,
          targetID: 999, // Different player
          targetIsFriendly: true,
          abilityGameID: KnownAbilities.RESURRECT,
        }),
      ];

      const result = calculateDeathDurations(deathEvents, castEvents, fightStart, fightEnd);

      expect(result).toHaveLength(1);
      expect(result[0]).toEqual({
        playerId: 123,
        deathTime: 2000,
        resurrectionTime: null,
        deathDurationMs: 3000, // No resurrection found, dead until fight end
      });
    });

    it('should ignore begincast events and only use cast events', () => {
      const deathEvents: DeathEvent[] = [
        createMockDeathEvent({
          timestamp: 2000,
          targetID: 123,
          targetInstance: 0,
          sourceID: 456,
          sourceIsFriendly: false,
          targetIsFriendly: true,
          abilityGameID: 1234,
          amount: 100,
          castTrackID: 4,
        }),
      ];

      const castEvents: UnifiedCastEvent[] = [
        createMockBeginCastEvent({
          timestamp: 2500,
          sourceID: 789,
          sourceIsFriendly: true,
          targetID: 123,
          targetIsFriendly: true,
          abilityGameID: KnownAbilities.RESURRECT,
          castTrackID: 100,
        }),
        createMockCastEvent({
          timestamp: 3000,
          sourceID: 789,
          sourceIsFriendly: true,
          targetID: 123,
          targetIsFriendly: true,
          abilityGameID: KnownAbilities.RESURRECT,
        }),
      ];

      const result = calculateDeathDurations(deathEvents, castEvents, fightStart, fightEnd);

      expect(result).toHaveLength(1);
      expect(result[0]).toEqual({
        playerId: 123,
        deathTime: 2000,
        resurrectionTime: 3000, // Uses the cast event, not begincast
        deathDurationMs: 1000,
      });
    });
  });

  describe('formatDeathDuration', () => {
    it('should format seconds correctly', () => {
      expect(formatDeathDuration(5000)).toBe('5.0s');
      expect(formatDeathDuration(12500)).toBe('12.5s');
      expect(formatDeathDuration(45678)).toBe('45.7s');
    });

    it('should format minutes and seconds correctly', () => {
      expect(formatDeathDuration(60000)).toBe('1m 0.0s');
      expect(formatDeathDuration(75500)).toBe('1m 15.5s');
      expect(formatDeathDuration(125000)).toBe('2m 5.0s');
      expect(formatDeathDuration(185500)).toBe('3m 5.5s');
    });

    it('should handle very small durations', () => {
      expect(formatDeathDuration(100)).toBe('0.1s');
      expect(formatDeathDuration(500)).toBe('0.5s');
    });
  });
});
