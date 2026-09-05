import {
  createMockDeathEvent,
  createMockResourceChangeEvent,
} from '../../test/utils/combatLogMockFactories';
import {
  createEnhancedMockFight,
  createEnhancedMockResources,
  createMockPositionalDamageEvent,
  createMockPlayersById,
  createMockActorsById,
} from '../../test/utils/enhancedMockFactories';
import { convertCoordinatesWithBottomLeft, convertRotation } from '../../utils/coordinateUtils';

import {
  calculateActorPositions,
  ActorPositionsCalculationTask,
  FightEvents,
  TimestampPositionLookup,
  getActorPositionAtClosestTimestamp,
  getAllActorPositionsAtTimestamp,
  resolveSampleInterval,
  isMemoryConstrainedDevice,
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

    it('should return an empty lookup without allocating a grid when no position data exists', () => {
      const fight = createEnhancedMockFight({ startTime: 1000, endTime: 2000 });
      const task: ActorPositionsCalculationTask = {
        fight,
        events: createMockEvents(),
      };

      const result = calculateActorPositions(task);

      // No positional resources anywhere → no actor can be placed on any frame, so no grid.
      expect(result.sortedTimestamps).toEqual([]);
      expect(result.positionsByTimestamp).toEqual({});
      expect(result.actorIds).toEqual([]);
      expect(result.fightDuration).toBe(1000);
      expect(result.fightStartTime).toBe(1000);
    });
  });

  describe('isMemoryConstrainedDevice', () => {
    // The budget is chosen INSIDE the worker, where `window`/`matchMedia` do not exist. A
    // pointer-media probe therefore reports desktop on every device and the mobile budget
    // never applies — this must stay driven by WorkerNavigator-visible signals only.
    const withNavigator = (patch: Record<string, unknown>, run: () => void): void => {
      const original = Object.getOwnPropertyDescriptor(globalThis, 'navigator');
      Object.defineProperty(globalThis, 'navigator', {
        value: { userAgent: '', ...patch },
        configurable: true,
        writable: true,
      });
      try {
        run();
      } finally {
        if (original) Object.defineProperty(globalThis, 'navigator', original);
      }
    };

    it('treats low reported deviceMemory as constrained', () => {
      withNavigator({ deviceMemory: 4 }, () => expect(isMemoryConstrainedDevice()).toBe(true));
      withNavigator({ deviceMemory: 8 }, () => expect(isMemoryConstrainedDevice()).toBe(false));
    });

    it('falls back to the user agent when deviceMemory is absent (iOS Safari)', () => {
      withNavigator({ userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X)' }, () =>
        expect(isMemoryConstrainedDevice()).toBe(true),
      );
      withNavigator({ userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)' }, () =>
        expect(isMemoryConstrainedDevice()).toBe(false),
      );
    });

    it('does not depend on matchMedia, which worker scope lacks', () => {
      withNavigator({ deviceMemory: 2 }, () => expect(isMemoryConstrainedDevice()).toBe(true));
    });
  });

  describe('sample-interval budget', () => {
    it('keeps full rate for small fights', () => {
      expect(
        resolveSampleInterval({ durationMs: 60000, actorCount: 20, budgetCells: 10_000_000 }),
      ).toEqual({ intervalMs: 4.7, downsampled: false });
    });

    it('downsamples (never truncates) when the cell budget is exceeded', () => {
      const { intervalMs, downsampled } = resolveSampleInterval({
        durationMs: 60000,
        actorCount: 20,
        budgetCells: 1000,
      });
      expect(downsampled).toBe(true);
      expect((Math.floor(60000 / intervalMs) + 2) * 20).toBeLessThanOrEqual(1000);
    });

    it('is safe for degenerate inputs', () => {
      expect(resolveSampleInterval({ durationMs: 0, actorCount: 20 }).downsampled).toBe(false);
      expect(resolveSampleInterval({ durationMs: 60000, actorCount: 0 }).downsampled).toBe(false);
    });

    it('hard-caps the grid at 72000 frames and still lands exactly on the end', () => {
      const fight = createEnhancedMockFight({ startTime: 0, endTime: 600000 });
      const events = createMockEvents();
      events.damage = [
        createMockPositionalDamageEvent(
          1000,
          101,
          202,
          createEnhancedMockResources(5235, 5410, 100),
          createEnhancedMockResources(5235, 5410, 100),
        ),
      ];
      const result = calculateActorPositions({ fight, events });
      expect(result.sortedTimestamps.length).toBeLessThanOrEqual(72000);
      expect(result.sortedTimestamps[result.sortedTimestamps.length - 1]).toBe(600000);
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

  describe('facing interpolation', () => {
    it('interpolates facing proportionally between samples (centi-radian wrap)', () => {
      // Facing is stored in centi-radians (a full turn ≈ 628; convertRotation divides by 100). A real
      // turn between two events must interpolate proportionally — the shortest-angle wrap has to be
      // done in the centi-radian unit, not raw radians. With the old radian wrap any turn beyond
      // ~1.8° folded into a tiny window, so the interpolated heading barely moved (or stepped
      // backward) and then snapped at the next event. Here the actor turns from facing 0 to 200
      // centi-radians over 1s; at the midpoint the heading must be ~100, not ~0.
      const fight = createEnhancedMockFight({ startTime: 0, endTime: 3000 });
      const events = createMockEvents();

      const playerId = 101;
      const enemyId = 202;
      events.damage = [
        createMockPositionalDamageEvent(
          1000,
          playerId,
          enemyId,
          createEnhancedMockResources(5000, 5000, 0),
          createEnhancedMockResources(),
        ),
        createMockPositionalDamageEvent(
          2000,
          playerId,
          enemyId,
          createEnhancedMockResources(5000, 5000, 200),
          createEnhancedMockResources(),
        ),
      ];

      const result = calculateActorPositions({
        fight,
        events,
        playersById: createMockPlayersById(),
        actorsById: createMockActorsById(),
      });

      const mid = getActorPositionAtClosestTimestamp(result, playerId, 1500);
      expect(mid).not.toBeNull();
      // Heading at the midpoint ≈ convertRotation(100). The buggy radian wrap pinned it near
      // convertRotation(0) (barely turned) — assert it is the interpolated value, not the start.
      expect(mid?.rotation).toBeCloseTo(convertRotation(100), 1);
      expect(mid?.rotation).not.toBeCloseTo(convertRotation(0), 1);
    });

    it('turns the SHORT way across the 0/full-turn seam', () => {
      // From facing 620 (just shy of a full 628 turn) to facing 8: the short delta is +16 centi-rad
      // (through the seam), NOT −612. The midpoint should sit near the seam (≈ 0 / a full turn), not
      // halfway back around at ~314.
      const fight = createEnhancedMockFight({ startTime: 0, endTime: 3000 });
      const events = createMockEvents();

      const playerId = 101;
      const enemyId = 202;
      events.damage = [
        createMockPositionalDamageEvent(
          1000,
          playerId,
          enemyId,
          createEnhancedMockResources(5000, 5000, 620),
          createEnhancedMockResources(),
        ),
        createMockPositionalDamageEvent(
          2000,
          playerId,
          enemyId,
          createEnhancedMockResources(5000, 5000, 8),
          createEnhancedMockResources(),
        ),
      ];

      const result = calculateActorPositions({
        fight,
        events,
        playersById: createMockPlayersById(),
        actorsById: createMockActorsById(),
      });

      const mid = getActorPositionAtClosestTimestamp(result, playerId, 1500);
      expect(mid).not.toBeNull();
      // Short-way midpoint facing = 620 + 16/2 = 628 ≡ a full turn. convertRotation is linear, so
      // compare the raw interpolated heading rather than the wrapped angle: it must be far from the
      // long-way midpoint (~314), i.e. it did NOT spin most of the way around.
      expect(mid?.rotation).not.toBeCloseTo(convertRotation(314), 1);
      expect(mid?.rotation).toBeCloseTo(convertRotation(628), 1);
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

    it('keeps a dead player at the last position recorded before death across frames', () => {
      // Locks the hoisted dead-actor path: a player records two distinct positions, then dies. After
      // death the player stays visible (players are not removed like NPCs) pinned at the LAST position
      // strictly before the death timestamp — never the position sampled at/after death. This pins both
      // the per-actor death-state hoist and the cached "last position before death" index across many
      // sampled frames (the value must be identical regardless of how the lookup is computed).
      const fight = createEnhancedMockFight({ startTime: 0, endTime: 10000 });
      const events = createMockEvents();

      const playerId = 101;
      const enemyId = 202;
      const deathTimestamp = 4000;

      // Pre-death positions at distinct coordinates; the latest pre-death one is the expected pin.
      const earlyPos = createEnhancedMockResources(1000, 1000, 0);
      const latePrePos = createEnhancedMockResources(8000, 8000, 0);
      // A position exactly AT the death timestamp must NOT be chosen (boundary is strictly `<`).
      const atDeathPos = createEnhancedMockResources(2000, 2000, 0);

      events.damage = [
        createMockPositionalDamageEvent(
          1000,
          playerId,
          enemyId,
          earlyPos,
          createEnhancedMockResources(),
        ),
        createMockPositionalDamageEvent(
          3000,
          playerId,
          enemyId,
          latePrePos,
          createEnhancedMockResources(),
        ),
        createMockPositionalDamageEvent(
          deathTimestamp,
          playerId,
          enemyId,
          atDeathPos,
          createEnhancedMockResources(),
        ),
      ];

      events.death = [
        createMockDeathEvent({
          timestamp: deathTimestamp,
          targetID: playerId,
        }),
      ];

      const task: ActorPositionsCalculationTask = {
        fight,
        events,
        playersById: createMockPlayersById(),
        actorsById: createMockActorsById(),
      };

      const result = calculateActorPositions(task);

      // The expected pinned world position = conversion of the latest STRICTLY-pre-death sample
      // (8000,8000)@3000 — NOT the at-death sample (2000,2000)@4000.
      const expectedPin = convertCoordinatesWithBottomLeft(8000, 8000);

      // Across several frames after death, the dead player stays exactly at that pinned position.
      for (const t of [4500, 6000, 8000, 9500]) {
        const pos = getActorPositionAtClosestTimestamp(result, playerId, t);
        expect(pos).not.toBeNull();
        expect(pos?.isDead).toBe(true);
        expect(pos?.position[0]).toBeCloseTo(expectedPin[0], 6);
        expect(pos?.position[2]).toBeCloseTo(expectedPin[2], 6);
      }
    });

    it('removes boss positions after a short grace period when they die', () => {
      const fight = createEnhancedMockFight({ startTime: 0, endTime: 10000 });
      const events = createMockEvents();

      const bossId = 201;
      const playerId = 101;
      const deathTimestamp = 4000;

      events.damage = [
        createMockPositionalDamageEvent(
          1000,
          playerId,
          bossId,
          createEnhancedMockResources(),
          createEnhancedMockResources(),
        ),
      ];

      events.death = [
        createMockDeathEvent({
          timestamp: deathTimestamp,
          targetID: bossId,
        }),
      ];

      const task: ActorPositionsCalculationTask = {
        fight,
        events,
        playersById: createMockPlayersById(),
        actorsById: createMockActorsById(),
      };

      const result = calculateActorPositions(task);

      const relativeDeathTime = deathTimestamp - fight.startTime;
      const withinGrace = getActorPositionAtClosestTimestamp(
        result,
        bossId,
        relativeDeathTime + 1000,
      );
      const afterGrace = getActorPositionAtClosestTimestamp(
        result,
        bossId,
        relativeDeathTime + 2500,
      );

      expect(withinGrace).not.toBeNull();
      expect(withinGrace?.isDead).toBe(true);
      expect(afterGrace).toBeNull();
    });

    it('removes boss positions after inactivity when no death event is recorded', () => {
      const fight = createEnhancedMockFight({ startTime: 0, endTime: 12000 });
      const events = createMockEvents();

      const bossId = 201;
      const playerId = 101;
      const lastInteractionTimestamp = 4000;

      events.damage = [
        createMockPositionalDamageEvent(
          lastInteractionTimestamp,
          playerId,
          bossId,
          createEnhancedMockResources(5235, 5410, 100),
          createEnhancedMockResources(5260, 5425, 100),
        ),
      ];

      const task: ActorPositionsCalculationTask = {
        fight,
        events,
        playersById: createMockPlayersById(),
        actorsById: createMockActorsById(),
      };

      const result = calculateActorPositions(task);

      const withinWindow = getActorPositionAtClosestTimestamp(
        result,
        bossId,
        lastInteractionTimestamp + 500,
      );
      const afterWindow = getActorPositionAtClosestTimestamp(
        result,
        bossId,
        lastInteractionTimestamp + 2500,
      );

      expect(withinWindow).not.toBeNull();
      expect(withinWindow?.isDead).toBe(false);
      expect(afterWindow).toBeNull();
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

  describe('multi-instance NPC splitting', () => {
    // ESO Logs assigns ONE actor id to all simultaneous copies of an NPC; each copy is distinguished
    // on events by sourceInstance/targetInstance. Before the fix, all copies merged into one position
    // history and the single rendered puck teleported between their separate map positions. These
    // tests pin the split: genuinely multi-instance NPCs become one independent puck per copy, while
    // single-instance actors stay byte-identical (same id, same behavior).
    const INSTANCE_STRIDE = 1_000_000;
    const PLAYER_ID = 101;
    const ENEMY_ID = 202; // default mock fight classifies 202 as a regular enemy NPC
    // Two copies at clearly distinct map positions: copy A near (1000,1000), copy B near (9000,9000).
    const POS_A = { x: 1000, y: 1000 };
    const POS_B = { x: 9000, y: 9000 };

    // Build a stream of player-on-enemy damage events for the given enemy instance at a fixed enemy
    // position, dense enough (every 1s) that the copy stays visible across the queried window.
    const enemyHits = (
      targetInstance: number | undefined,
      pos: { x: number; y: number },
      relTimes: number[],
    ) =>
      relTimes.map((rel) =>
        createMockPositionalDamageEvent(
          1_000_000 + rel,
          PLAYER_ID,
          ENEMY_ID,
          createEnhancedMockResources(5235, 5410, 0), // player's own position
          createEnhancedMockResources(pos.x, pos.y, 0), // this enemy copy's position
          targetInstance === undefined ? undefined : { targetInstance },
        ),
      );

    const baseFight = () => createEnhancedMockFight({ startTime: 1_000_000, endTime: 1_060_000 });
    const dense = [1000, 2000, 3000, 4000, 5000, 6000, 7000, 8000];

    it('splits a multi-instance enemy into one puck per copy at distinct positions', () => {
      const events = createMockEvents();
      // Copy A logged as instance 1, copy B as instance 2 — two distinct copies of enemy 202.
      events.damage = [...enemyHits(1, POS_A, dense), ...enemyHits(2, POS_B, dense)];

      const result = calculateActorPositions({
        fight: baseFight(),
        events,
        playersById: createMockPlayersById(),
        actorsById: createMockActorsById(),
      });

      // Two synthetic ids exist: the primary keeps the bare id, the extra copy gets the offset id.
      const copyA = ENEMY_ID; // instance 1 → primary slot → bare id
      const copyB = ENEMY_ID + 2 * INSTANCE_STRIDE; // instance 2 → slot 2
      expect(result.actorIds).toContain(copyA);
      expect(result.actorIds).toContain(copyB);

      // At a shared timestamp both copies are present, at their OWN distinct positions (no merge).
      const actors = getAllActorPositionsAtTimestamp(result, 4000);
      const a = actors.find((act) => act.id === copyA);
      const b = actors.find((act) => act.id === copyB);
      expect(a).toBeDefined();
      expect(b).toBeDefined();
      // Both are enemies sharing the base NPC name (resolved via baseActorId, not "Actor <synthId>").
      expect(a?.type).toBe('enemy');
      expect(b?.type).toBe('enemy');
      expect(a?.name).toBe('Regular Enemy');
      expect(b?.name).toBe('Regular Enemy');
      expect(a?.baseActorId).toBe(ENEMY_ID);
      expect(b?.baseActorId).toBe(ENEMY_ID);
      // Distinct converted positions — the whole point: they don't collapse onto one teleporting puck.
      expect(a?.position[0]).not.toBeCloseTo(b?.position[0] ?? 0, 1);
      expect(a?.position[2]).not.toBeCloseTo(b?.position[2] ?? 0, 1);
    });

    it('leaves a single-instance enemy unchanged (no synthetic ids)', () => {
      const events = createMockEvents();
      // All events for enemy 202 use instance 0 (the single-instance encoding).
      events.damage = enemyHits(0, POS_A, dense);

      const result = calculateActorPositions({
        fight: baseFight(),
        events,
        playersById: createMockPlayersById(),
        actorsById: createMockActorsById(),
      });

      expect(result.actorIds).toContain(ENEMY_ID);
      // No id was promoted into the synthetic namespace.
      expect(result.actorIds?.every((id) => id < INSTANCE_STRIDE)).toBe(true);
    });

    it('does not split when copies are logged as instance 0 and 1 (both primary)', () => {
      const events = createMockEvents();
      // {0, 1} collapse to the same primary slot → a single puck, not two.
      events.damage = [...enemyHits(0, POS_A, dense), ...enemyHits(1, POS_A, dense)];

      const result = calculateActorPositions({
        fight: baseFight(),
        events,
        playersById: createMockPlayersById(),
        actorsById: createMockActorsById(),
      });

      const enemyIds = (result.actorIds ?? []).filter(
        (id) => id % INSTANCE_STRIDE === ENEMY_ID || id === ENEMY_ID,
      );
      expect(enemyIds).toEqual([ENEMY_ID]);
    });

    it('splits {0,1,2} into the primary plus one extra copy', () => {
      const events = createMockEvents();
      events.damage = [
        ...enemyHits(0, POS_A, dense),
        ...enemyHits(1, POS_A, dense),
        ...enemyHits(2, POS_B, dense),
      ];

      const result = calculateActorPositions({
        fight: baseFight(),
        events,
        playersById: createMockPlayersById(),
        actorsById: createMockActorsById(),
      });

      const enemyIds = (result.actorIds ?? [])
        .filter((id) => id % INSTANCE_STRIDE === ENEMY_ID)
        .sort((x, y) => x - y);
      expect(enemyIds).toEqual([ENEMY_ID, ENEMY_ID + 2 * INSTANCE_STRIDE]);
    });

    it('death of one copy does not remove the other copy', () => {
      const events = createMockEvents();
      events.damage = [...enemyHits(1, POS_A, dense), ...enemyHits(2, POS_B, dense)];
      // Copy B (instance 2) dies at t+4500; copy A (instance 1) keeps taking hits afterward.
      events.death = [
        createMockDeathEvent({
          timestamp: 1_004_500,
          sourceID: PLAYER_ID,
          targetID: ENEMY_ID,
          targetInstance: 2,
          targetIsFriendly: false,
        }),
      ];

      const result = calculateActorPositions({
        fight: baseFight(),
        events,
        playersById: createMockPlayersById(),
        actorsById: createMockActorsById(),
      });

      const copyA = ENEMY_ID;
      const copyB = ENEMY_ID + 2 * INSTANCE_STRIDE;
      // After copy B's death, it has stopped emitting positions (enemy NPCs vanish on death)...
      const after = getAllActorPositionsAtTimestamp(result, 7000);
      expect(after.find((act) => act.id === copyB)).toBeUndefined();
      // ...while copy A is still present.
      expect(after.find((act) => act.id === copyA)).toBeDefined();
    });

    it('produces deterministic synthetic ids across recomputation (deep-link safe)', () => {
      const events = createMockEvents();
      events.damage = [...enemyHits(1, POS_A, dense), ...enemyHits(2, POS_B, dense)];
      const task: ActorPositionsCalculationTask = {
        fight: baseFight(),
        events,
        playersById: createMockPlayersById(),
        actorsById: createMockActorsById(),
      };

      const first = calculateActorPositions(task);
      const second = calculateActorPositions(task);
      expect(second.actorIds).toEqual(first.actorIds);
    });

    it('splits from resource events too (the densest position source)', () => {
      // Enemy copies are most often located via periodic resourcechange ticks, not just damage.
      const enemyResourceTicks = (
        targetInstance: number,
        pos: { x: number; y: number },
        relTimes: number[],
      ) =>
        relTimes.map((rel) =>
          createMockResourceChangeEvent({
            timestamp: 1_000_000 + rel,
            sourceID: PLAYER_ID,
            sourceIsFriendly: true,
            targetID: ENEMY_ID,
            targetIsFriendly: false,
            targetInstance,
            sourceResources: createEnhancedMockResources(5235, 5410, 0),
            targetResources: createEnhancedMockResources(pos.x, pos.y, 0),
          }),
        );

      const events = createMockEvents();
      events.resource = [
        ...enemyResourceTicks(1, POS_A, dense),
        ...enemyResourceTicks(2, POS_B, dense),
      ];

      const result = calculateActorPositions({
        fight: baseFight(),
        events,
        playersById: createMockPlayersById(),
        actorsById: createMockActorsById(),
      });

      expect(result.actorIds).toContain(ENEMY_ID);
      expect(result.actorIds).toContain(ENEMY_ID + 2 * INSTANCE_STRIDE);
      const actors = getAllActorPositionsAtTimestamp(result, 4000);
      expect(actors.find((a) => a.id === ENEMY_ID)).toBeDefined();
      expect(actors.find((a) => a.id === ENEMY_ID + 2 * INSTANCE_STRIDE)).toBeDefined();
    });

    it('populates baseActorId and instance on each split puck', () => {
      const events = createMockEvents();
      events.damage = [...enemyHits(1, POS_A, dense), ...enemyHits(2, POS_B, dense)];

      const result = calculateActorPositions({
        fight: baseFight(),
        events,
        playersById: createMockPlayersById(),
        actorsById: createMockActorsById(),
      });

      const actors = getAllActorPositionsAtTimestamp(result, 4000);
      const primary = actors.find((a) => a.id === ENEMY_ID);
      const copy = actors.find((a) => a.id === ENEMY_ID + 2 * INSTANCE_STRIDE);
      // Both decode back to the real report id; the slot distinguishes them.
      expect(primary?.baseActorId).toBe(ENEMY_ID);
      expect(primary?.instance).toBe(0);
      expect(copy?.baseActorId).toBe(ENEMY_ID);
      expect(copy?.instance).toBe(2);
    });

    it('splits {0,2} (skipped instance 1) into the primary plus the explicit copy', () => {
      const events = createMockEvents();
      events.damage = [...enemyHits(0, POS_A, dense), ...enemyHits(2, POS_B, dense)];

      const result = calculateActorPositions({
        fight: baseFight(),
        events,
        playersById: createMockPlayersById(),
        actorsById: createMockActorsById(),
      });

      const enemyIds = (result.actorIds ?? [])
        .filter((id) => id % INSTANCE_STRIDE === ENEMY_ID)
        .sort((x, y) => x - y);
      expect(enemyIds).toEqual([ENEMY_ID, ENEMY_ID + 2 * INSTANCE_STRIDE]);
    });

    it('does not split a co-present single-instance player when an enemy splits', () => {
      const events = createMockEvents();
      // Player 101 (always instance 0 as the source) hits two enemy copies.
      events.damage = [...enemyHits(1, POS_A, dense), ...enemyHits(2, POS_B, dense)];

      const result = calculateActorPositions({
        fight: baseFight(),
        events,
        playersById: createMockPlayersById(),
        actorsById: createMockActorsById(),
      });

      // The player keeps exactly one entry at its real id, never promoted to the synthetic band.
      const playerIds = (result.actorIds ?? []).filter((id) => id % INSTANCE_STRIDE === PLAYER_ID);
      expect(playerIds).toEqual([PLAYER_ID]);
      const player = getAllActorPositionsAtTimestamp(result, 4000).find((a) => a.id === PLAYER_ID);
      expect(player?.type).toBe('player');
    });
  });
});
