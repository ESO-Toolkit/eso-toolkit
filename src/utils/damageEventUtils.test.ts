/**
 * Tests for damageEventUtils
 * Tests damage event processing, charged atronach attribution, and event grouping
 */

import {
  getChargedReportActors,
  getDamageEventsByPlayer,
  CHARGED_ATRONACH_GAME_ID,
} from './damageEventUtils';
import { ReportActor } from '../graphql/generated';
import { DamageEvent } from '../types/combatlogEvents';

// Mock data helpers
const createMockActor = (
  id: number,
  gameID?: number,
  type?: string,
  petOwner?: number,
): ReportActor => ({
  id,
  gameID,
  type,
  petOwner,
  name: `Actor${id}`,
  displayName: `Actor${id}`,
  server: 'NA',
  icon: 'default.png',
});

const createMockDamageEvent = (
  sourceID: number,
  targetID: number = 999,
  amount: number = 1000,
  castTrackID: number = 12345,
): DamageEvent => ({
  timestamp: Date.now(),
  type: 'damage',
  sourceID,
  sourceIsFriendly: true,
  targetID,
  targetIsFriendly: false,
  abilityGameID: 12345,
  fight: 1,
  hitType: 1 as any, // HitType enum value
  amount,
  castTrackID,
  sourceResources: { hitPoints: 100, maxHitPoints: 100 } as any,
  targetResources: { hitPoints: 100, maxHitPoints: 100 } as any,
});

describe('damageEventUtils', () => {
  describe('CHARGED_ATRONACH_GAME_ID', () => {
    it('should be set to the correct game ID', () => {
      expect(CHARGED_ATRONACH_GAME_ID).toBe(32829);
    });
  });

  describe('getChargedReportActors', () => {
    describe('finding charged atronachs', () => {
      it('should identify charged atronach actors correctly', () => {
        const actorsById = {
          123: createMockActor(123, CHARGED_ATRONACH_GAME_ID, 'Pet', 456),
          124: createMockActor(124, CHARGED_ATRONACH_GAME_ID, 'Pet', 789),
          456: createMockActor(456, 12345, 'Player'),
        };

        const result = getChargedReportActors(actorsById);

        expect(result).toEqual({
          123: 456,
          124: 789,
        });
      });

      it('should return empty object when no charged atronachs present', () => {
        const actorsById = {
          123: createMockActor(123, 12345, 'Player'),
          124: createMockActor(124, 67890, 'Pet', 123),
        };

        const result = getChargedReportActors(actorsById);

        expect(result).toEqual({});
      });

      it('should handle empty actors record', () => {
        const result = getChargedReportActors({});
        expect(result).toEqual({});
      });
    });

    describe('filtering criteria', () => {
      it('should require correct gameID', () => {
        const actorsById = {
          123: createMockActor(123, 99999, 'Pet', 456), // Wrong gameID
        };

        const result = getChargedReportActors(actorsById);
        expect(result).toEqual({});
      });

      it('should require Pet type', () => {
        const actorsById = {
          123: createMockActor(123, CHARGED_ATRONACH_GAME_ID, 'Player', 456), // Wrong type
        };

        const result = getChargedReportActors(actorsById);
        expect(result).toEqual({});
      });

      it('should require valid petOwner', () => {
        const actorsById = {
          123: createMockActor(123, CHARGED_ATRONACH_GAME_ID, 'Pet'), // No petOwner
          124: createMockActor(124, CHARGED_ATRONACH_GAME_ID, 'Pet', 0), // Zero petOwner (valid)
        };

        const result = getChargedReportActors(actorsById);
        expect(result).toEqual({
          124: 0,
        });
      });

      it('should handle null/undefined values in actor properties', () => {
        const actorsById = {
          123: { ...createMockActor(123, CHARGED_ATRONACH_GAME_ID, 'Pet', 456), id: null },
          124: { ...createMockActor(124, CHARGED_ATRONACH_GAME_ID, 'Pet', 456), id: undefined },
          125: { ...createMockActor(125, CHARGED_ATRONACH_GAME_ID, 'Pet'), petOwner: null },
          126: { ...createMockActor(126, CHARGED_ATRONACH_GAME_ID, 'Pet'), petOwner: undefined },
        } as any;

        const result = getChargedReportActors(actorsById);
        expect(result).toEqual({});
      });
    });

    describe('edge cases', () => {
      it('should handle mixed actor types', () => {
        const actorsById = {
          123: createMockActor(123, CHARGED_ATRONACH_GAME_ID, 'Pet', 456),
          124: createMockActor(124, 12345, 'Player'),
          125: createMockActor(125, 67890, 'Pet', 124),
          126: createMockActor(126, CHARGED_ATRONACH_GAME_ID, 'Pet', 789),
        };

        const result = getChargedReportActors(actorsById);
        expect(result).toEqual({
          123: 456,
          126: 789,
        });
      });

      it('should handle actors with same owner', () => {
        const actorsById = {
          123: createMockActor(123, CHARGED_ATRONACH_GAME_ID, 'Pet', 456),
          124: createMockActor(124, CHARGED_ATRONACH_GAME_ID, 'Pet', 456),
        };

        const result = getChargedReportActors(actorsById);
        expect(result).toEqual({
          123: 456,
          124: 456,
        });
      });
    });
  });

  describe('getDamageEventsByPlayer', () => {
    describe('basic grouping', () => {
      it('should group damage events by player ID', () => {
        const damageEvents = [
          createMockDamageEvent(123, 999, 1000),
          createMockDamageEvent(456, 999, 500),
          createMockDamageEvent(123, 999, 750),
        ];

        const result = getDamageEventsByPlayer(damageEvents, {});

        expect(result).toHaveProperty('123');
        expect(result).toHaveProperty('456');
        expect(result['123']).toHaveLength(2);
        expect(result['456']).toHaveLength(1);
        expect(result['123'][0].amount).toBe(1000);
        expect(result['123'][1].amount).toBe(750);
        expect(result['456'][0].amount).toBe(500);
      });

      it('should handle empty damage events array', () => {
        const result = getDamageEventsByPlayer([], {});
        expect(result).toEqual({});
      });

      it('should convert player IDs to strings for keys', () => {
        const damageEvents = [createMockDamageEvent(123)];
        const result = getDamageEventsByPlayer(damageEvents, {});

        expect(result).toHaveProperty('123');
        expect(typeof Object.keys(result)[0]).toBe('string');
      });
    });

    describe('charged atronach attribution', () => {
      it('should attribute charged atronach damage to owner', () => {
        const actorsById = {
          789: createMockActor(789, CHARGED_ATRONACH_GAME_ID, 'Pet', 123), // Atronach owned by player 123
          123: createMockActor(123, 12345, 'Player'),
        };

        const damageEvents = [
          createMockDamageEvent(123, 999, 1000), // Direct player damage
          createMockDamageEvent(789, 999, 500), // Atronach damage
        ];

        const result = getDamageEventsByPlayer(damageEvents, actorsById);

        expect(result).toHaveProperty('123');
        expect(result['123']).toHaveLength(2); // Both events attributed to player 123
        expect(result['123'].find((e) => e.amount === 1000)).toBeDefined();
        expect(result['123'].find((e) => e.amount === 500)).toBeDefined();
      });

      it('should handle multiple atronachs with different owners', () => {
        const actorsById = {
          789: createMockActor(789, CHARGED_ATRONACH_GAME_ID, 'Pet', 123),
          890: createMockActor(890, CHARGED_ATRONACH_GAME_ID, 'Pet', 456),
        };

        const damageEvents = [
          createMockDamageEvent(789, 999, 500), // Atronach 1
          createMockDamageEvent(890, 999, 750), // Atronach 2
        ];

        const result = getDamageEventsByPlayer(damageEvents, actorsById);

        expect(result).toHaveProperty('123');
        expect(result).toHaveProperty('456');
        expect(result['123']).toHaveLength(1);
        expect(result['456']).toHaveLength(1);
        expect(result['123'][0].amount).toBe(500);
        expect(result['456'][0].amount).toBe(750);
      });

      it('should not affect non-atronach damage', () => {
        const actorsById = {
          789: createMockActor(789, CHARGED_ATRONACH_GAME_ID, 'Pet', 123),
        };

        const damageEvents = [
          createMockDamageEvent(456, 999, 1000), // Regular player damage
          createMockDamageEvent(789, 999, 500), // Atronach damage
        ];

        const result = getDamageEventsByPlayer(damageEvents, actorsById);

        expect(result).toHaveProperty('123'); // Atronach damage attributed to owner
        expect(result).toHaveProperty('456'); // Regular damage stays with original player
        expect(result['123']).toHaveLength(1);
        expect(result['456']).toHaveLength(1);
      });
    });

    describe('invalid events handling', () => {
      it('should skip events with null sourceID', () => {
        const damageEvents = [
          createMockDamageEvent(123, 999, 1000),
          { ...createMockDamageEvent(456, 999, 500), sourceID: null } as any,
        ];

        const result = getDamageEventsByPlayer(damageEvents, {});

        expect(result).toHaveProperty('123');
        expect(result).not.toHaveProperty('456');
        expect(result['123']).toHaveLength(1);
      });

      it('should skip events with undefined sourceID', () => {
        const damageEvents = [
          createMockDamageEvent(123, 999, 1000),
          { ...createMockDamageEvent(456, 999, 500), sourceID: undefined } as any,
        ];

        const result = getDamageEventsByPlayer(damageEvents, {});

        expect(result).toHaveProperty('123');
        expect(result).not.toHaveProperty('456');
        expect(result['123']).toHaveLength(1);
      });

      it('should handle zero as valid sourceID', () => {
        const damageEvents = [createMockDamageEvent(0, 999, 1000)];
        const result = getDamageEventsByPlayer(damageEvents, {});

        expect(result).toHaveProperty('0');
        expect(result['0']).toHaveLength(1);
      });
    });

    describe('complex scenarios', () => {
      it('should handle mixed player and atronach damage correctly', () => {
        const actorsById = {
          789: createMockActor(789, CHARGED_ATRONACH_GAME_ID, 'Pet', 123),
          890: createMockActor(890, CHARGED_ATRONACH_GAME_ID, 'Pet', 456),
          123: createMockActor(123, 12345, 'Player'),
          456: createMockActor(456, 12345, 'Player'),
        };

        const damageEvents = [
          createMockDamageEvent(123, 999, 1000), // Player 123 direct
          createMockDamageEvent(789, 999, 250), // Player 123's atronach
          createMockDamageEvent(456, 999, 800), // Player 456 direct
          createMockDamageEvent(890, 999, 400), // Player 456's atronach
          createMockDamageEvent(999, 999, 300), // Unknown player
        ];

        const result = getDamageEventsByPlayer(damageEvents, actorsById);

        expect(result['123']).toHaveLength(2); // Direct + atronach
        expect(result['456']).toHaveLength(2); // Direct + atronach
        expect(result['999']).toHaveLength(1); // Unknown player

        const player123Damage = result['123'].reduce((sum, e) => sum + e.amount, 0);
        const player456Damage = result['456'].reduce((sum, e) => sum + e.amount, 0);

        expect(player123Damage).toBe(1250); // 1000 + 250
        expect(player456Damage).toBe(1200); // 800 + 400
      });

      it('should maintain original event properties', () => {
        const damageEvents = [createMockDamageEvent(123, 888, 1500, 9999)];
        const result = getDamageEventsByPlayer(damageEvents, {});

        const event = result['123'][0];
        expect(event.sourceID).toBe(123);
        expect(event.targetID).toBe(888);
        expect(event.amount).toBe(1500);
        expect(event.castTrackID).toBe(9999);
        expect(event.type).toBe('damage');
        expect(event.sourceIsFriendly).toBe(true);
        expect(event.targetIsFriendly).toBe(false);
      });
    });
  });
});
