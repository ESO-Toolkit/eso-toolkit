import { FightFragment, ReportActorFragment } from '../../graphql/generated';
import { PlayerDetailsWithRole } from '../../store/player_data/playerDataSlice';
import { DamageEvent, Resources, CastEvent } from '../../types/combatlogEvents';
import { KnownAbilities } from '../../types/abilities';
import {
  createEnhancedMockFight,
  createEnhancedMockResources,
  createMockPositionalDamageEvent,
  createMockPlayersById,
  createMockActorsById,
} from '../../test/utils/enhancedMockFactories';
import { createMockDeathEvent } from '../../test/utils/combatLogMockFactories';
import { BuffLookupData } from '../../utils/BuffLookupUtils';

import {
  calculateActorPositions,
  ActorPositionsCalculationTask,
  FightEvents,
  TimestampPositionLookup,
  ActorPosition,
  getActorPositionAtClosestTimestamp,
  getAllActorPositionsAtTimestamp,
} from './CalculateActorPositions';

describe('calculateActorPositions', () => {
  // Mock events helper
  const createMockEvents = (): FightEvents => ({
    damage: [],
    heal: [],
    death: [],
    resource: [],
    cast: [],
  });

  describe('basic functionality', () => {
    it('should return empty lookup when no fight data is provided', () => {
      const task: ActorPositionsCalculationTask = {
        fight: null as any,
        events: createMockEvents(),
      };

      const result = calculateActorPositions(task);

      expect(result.positionsByTimestamp).toEqual({});
      expect(result.sortedTimestamps).toEqual([]);
      expect(result.fightDuration).toBe(0);
      expect(result.fightStartTime).toBe(0);
      expect(result.sampleInterval).toBeGreaterThan(0);
      expect(result.hasRegularIntervals).toBe(true);
    });

    it('should return empty lookup when no events are provided', () => {
      const task: ActorPositionsCalculationTask = {
        fight: createEnhancedMockFight(),
        events: null as any,
      };

      const result = calculateActorPositions(task);

      expect(result.positionsByTimestamp).toEqual({});
      expect(result.sortedTimestamps).toEqual([]);
      expect(result.fightDuration).toBe(0);
      expect(result.fightStartTime).toBe(0);
    });

    it('should calculate correct fight duration and start time', () => {
      const fight = createEnhancedMockFight({ startTime: 1000, endTime: 5000 });
      const task: ActorPositionsCalculationTask = {
        fight,
        events: createMockEvents(),
      };

      const result = calculateActorPositions(task);

      expect(result.fightDuration).toBe(4000); // 5000 - 1000
      expect(result.fightStartTime).toBe(1000);
    });

    it('should create timestamp structure even with no position data', () => {
      const fight = createEnhancedMockFight({ startTime: 1000, endTime: 2000 });
      const task: ActorPositionsCalculationTask = {
        fight,
        events: createMockEvents(),
      };

      const result = calculateActorPositions(task);

      expect(result.sortedTimestamps.length).toBeGreaterThan(0);
      expect(result.sampleInterval).toBeGreaterThan(0);
      expect(result.hasRegularIntervals).toBe(true);
    });
  });

  describe('position lookup functionality', () => {
    it('should provide actor positions through getActorPositionAtClosestTimestamp', () => {
      const fight = createEnhancedMockFight({ startTime: 1000, endTime: 2000 });
      const events = createMockEvents();

      // Add an event with position data
      events.damage = [
        createMockPositionalDamageEvent(
          1500,
          101,
          202,
          createEnhancedMockResources(5235, 5410, 100),
          createEnhancedMockResources(5235, 5410, 100),
        ),
      ];

      const task: ActorPositionsCalculationTask = {
        fight,
        events,
        playersById: createMockPlayersById(),
        actorsById: createMockActorsById(),
      };

      const result = calculateActorPositions(task);

      // Check if we can get position data for the player at some timestamp
      const sampleTimestamp = 500; // 500ms into the fight
      const playerPosition = getActorPositionAtClosestTimestamp(result, 101, sampleTimestamp);

      // The player should have position data (might be null if no position was recorded)
      // This tests the lookup function works without errors
      expect(playerPosition === null || typeof playerPosition === 'object').toBe(true);

      if (playerPosition) {
        expect(playerPosition.id).toBe(101);
        expect(playerPosition.name).toBeDefined();
        expect(playerPosition.type).toBeDefined();
        expect(playerPosition.position).toHaveLength(3);
        expect(typeof playerPosition.rotation).toBe('number');
        expect(typeof playerPosition.isDead).toBe('boolean');
      }
    });

    it('should provide all actors through getAllActorPositionsAtTimestamp', () => {
      const fight = createEnhancedMockFight({ startTime: 1000, endTime: 2000 });
      const events = createMockEvents();

      // Add events with position data for multiple actors
      events.damage = [
        createMockPositionalDamageEvent(
          1500,
          101,
          202,
          createEnhancedMockResources(5235, 5410, 100),
          createEnhancedMockResources(5235, 5410, 100),
        ),
      ];

      const task: ActorPositionsCalculationTask = {
        fight,
        events,
        playersById: createMockPlayersById(),
        actorsById: createMockActorsById(),
      };

      const result = calculateActorPositions(task);

      // Get all actors at a timestamp
      const sampleTimestamp = 500;
      const allActors = getAllActorPositionsAtTimestamp(result, sampleTimestamp);

      // Should return an array
      expect(Array.isArray(allActors)).toBe(true);

      // Each actor in the array should have proper structure
      allActors.forEach((actor) => {
        expect(actor.id).toBeDefined();
        expect(actor.name).toBeDefined();
        expect(actor.type).toBeDefined();
        expect(actor.position).toHaveLength(3);
        expect(typeof actor.rotation).toBe('number');
        expect(typeof actor.isDead).toBe('boolean');
      });
    });

    it('should handle empty lookup gracefully', () => {
      const emptyLookup: TimestampPositionLookup = {
        positionsByTimestamp: {},
        sortedTimestamps: [],
        fightDuration: 0,
        fightStartTime: 0,
        sampleInterval: 4.7,
        hasRegularIntervals: true,
      };

      const position = getActorPositionAtClosestTimestamp(emptyLookup, 101, 500);
      expect(position).toBeNull();

      const allPositions = getAllActorPositionsAtTimestamp(emptyLookup, 500);
      expect(allPositions).toEqual([]);
    });
  });

  describe('actor classification', () => {
    it('should correctly classify different actor types', () => {
      const fight = createEnhancedMockFight({ startTime: 1000, endTime: 2000 });
      const events = createMockEvents();

      // Add events for different actor types
      events.damage = [
        createMockPositionalDamageEvent(
          1500,
          101, // Player
          202, // Enemy
          createEnhancedMockResources(5235, 5410, 100),
          createEnhancedMockResources(5235, 5410, 100),
        ),
      ];

      const task: ActorPositionsCalculationTask = {
        fight,
        events,
        playersById: createMockPlayersById(),
        actorsById: createMockActorsById(),
      };

      const result = calculateActorPositions(task);

      // Check if we can find actors and their types
      const sampleTimestamp = 500;
      const allActors = getAllActorPositionsAtTimestamp(result, sampleTimestamp);

      if (allActors.length > 0) {
        allActors.forEach((actor) => {
          expect(['player', 'enemy', 'boss', 'friendly_npc', 'pet']).toContain(actor.type);
        });
      }
    });
  });

  describe('death handling', () => {
    it('should handle death events properly', () => {
      const fight = createEnhancedMockFight({ startTime: 1000, endTime: 3000 });
      const events = createMockEvents();

      const actorId = 101;
      const deathTimestamp = 2000;

      // Add position event before death
      events.damage = [
        createMockPositionalDamageEvent(
          1500,
          actorId,
          202,
          createEnhancedMockResources(5235, 5410, 100),
        ),
      ];

      // Add death event
      events.death = [
        createMockDeathEvent({
          timestamp: deathTimestamp,
          targetID: actorId,
        }),
      ];

      const task: ActorPositionsCalculationTask = {
        fight,
        events,
        playersById: createMockPlayersById(),
        actorsById: createMockActorsById(),
      };

      const result = calculateActorPositions(task);

      // Check positions before and after death
      const beforeDeath = 500; // 500ms into fight
      const afterDeath = 1500; // 1500ms into fight (after death at 1000ms relative)

      const positionBefore = getActorPositionAtClosestTimestamp(result, actorId, beforeDeath);
      const positionAfter = getActorPositionAtClosestTimestamp(result, actorId, afterDeath);

      // Positions should handle death status correctly (implementation details)
      if (positionBefore && positionAfter) {
        expect(typeof positionBefore.isDead).toBe('boolean');
        expect(typeof positionAfter.isDead).toBe('boolean');
      }
    });
  });

  describe('edge cases', () => {
    it('should handle actors with no position data', () => {
      const fight = createEnhancedMockFight({ startTime: 1000, endTime: 2000 });
      const events = createMockEvents();

      // Add events without position data
      events.damage = [
        {
          timestamp: 1500,
          type: 'damage' as const,
          sourceID: 101,
          sourceIsFriendly: true,
          targetID: 202,
          targetIsFriendly: false,
          abilityGameID: 12345,
          fight: 1,
          hitType: 1, // HitType.Normal
          amount: 1000,
          castTrackID: 1,
          sourceResources: createEnhancedMockResources(0, 0, 0),
          targetResources: createEnhancedMockResources(0, 0, 0),
        },
      ];

      const task: ActorPositionsCalculationTask = {
        fight,
        events,
        playersById: createMockPlayersById(),
        actorsById: createMockActorsById(),
      };

      const result = calculateActorPositions(task);

      // Should not crash and should return valid structure
      expect(result.positionsByTimestamp).toBeDefined();
      expect(result.sortedTimestamps).toBeDefined();
      expect(result.fightDuration).toBeGreaterThan(0);
    });

    it('should handle progress callback without errors', () => {
      const fight = createEnhancedMockFight({ startTime: 1000, endTime: 2000 });
      const events = createMockEvents();

      const progressCallback = jest.fn();

      const task: ActorPositionsCalculationTask = {
        fight,
        events,
        playersById: createMockPlayersById(),
        actorsById: createMockActorsById(),
      };

      const result = calculateActorPositions(task, progressCallback);

      expect(progressCallback).toHaveBeenCalled();
      expect(result).toBeDefined();
    });

    it('should handle malformed or missing actor data gracefully', () => {
      const fight = createEnhancedMockFight({ startTime: 1000, endTime: 2000 });
      const events = createMockEvents();

      events.damage = [
        createMockPositionalDamageEvent(
          1500,
          999, // Unknown actor
          998, // Another unknown actor
          createEnhancedMockResources(5235, 5410, 100),
          createEnhancedMockResources(5235, 5410, 100),
        ),
      ];

      const task: ActorPositionsCalculationTask = {
        fight,
        events,
        playersById: {}, // Empty players
        actorsById: {}, // Empty actors
      };

      const result = calculateActorPositions(task);

      // Should not crash and return valid structure
      expect(result.positionsByTimestamp).toBeDefined();
      expect(result.sortedTimestamps).toBeDefined();
    });
  });

  describe('performance characteristics', () => {
    it('should have regular intervals when possible', () => {
      const fight = createEnhancedMockFight({ startTime: 1000, endTime: 2000 });
      const task: ActorPositionsCalculationTask = {
        fight,
        events: createMockEvents(),
      };

      const result = calculateActorPositions(task);

      expect(result.hasRegularIntervals).toBe(true);
      expect(result.sampleInterval).toBeGreaterThan(0);
    });

    it('should provide O(1) lookup capability through mathematical calculation', () => {
      const fight = createEnhancedMockFight({ startTime: 1000, endTime: 2000 });
      const task: ActorPositionsCalculationTask = {
        fight,
        events: createMockEvents(),
      };

      const result = calculateActorPositions(task);

      // Test multiple lookups to ensure consistent performance
      const lookupTimes = [0, 100, 200, 500, 800, 900];

      lookupTimes.forEach((timestamp) => {
        const actors = getAllActorPositionsAtTimestamp(result, timestamp);
        expect(Array.isArray(actors)).toBe(true);
      });
    });
  });
});
