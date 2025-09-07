import { FightFragment, ReportActorFragment } from '../../graphql/generated';
import { PlayerDetailsWithRole } from '../../store/player_data/playerDataSlice';
import { DamageEvent, Resources } from '../../types/combatlogEvents';

import {
  calculateActorPositions,
  ActorPositionsCalculationTask,
  FightEvents,
} from './CalculateActorPositions';

describe('calculateActorPositions', () => {
  // Mock fight data
  const createMockFight = (overrides: Partial<FightFragment> = {}): FightFragment =>
    ({
      id: 1,
      startTime: 1000,
      endTime: 5000,
      fightPercentage: 100,
      kill: null,
      friendlyPlayers: [101, 102],
      enemyNPCs: [
        { id: 201, gameID: 1 }, // Boss
        { id: 202, gameID: 0 }, // Regular enemy
      ],
      friendlyNPCs: [{ id: 301 }],
      ...overrides,
    }) as FightFragment;

  // Helper to create resources
  const createResources = (x: number, y: number, facing: number): Resources => ({
    hitPoints: 100,
    maxHitPoints: 100,
    magicka: 100,
    maxMagicka: 100,
    stamina: 100,
    maxStamina: 100,
    ultimate: 100,
    maxUltimate: 100,
    werewolf: 0,
    maxWerewolf: 0,
    absorb: 0,
    championPoints: 810,
    x,
    y,
    facing,
  });

  // Mock events
  const createDamageEvent = (
    timestamp: number,
    sourceID: number,
    targetID: number,
    sourceResources?: Resources,
    targetResources?: Resources,
  ): DamageEvent => ({
    timestamp,
    type: 'damage',
    sourceID,
    sourceIsFriendly: true,
    targetID,
    targetIsFriendly: false,
    abilityGameID: 12345,
    amount: 1000,
    hitType: 1,
    castTrackID: 1,
    sourceResources: sourceResources || createResources(5235, 5410, 100),
    targetResources: targetResources || createResources(5240, 5415, 200),
    fight: 1,
  });

  const createMockEvents = (): FightEvents => ({
    damage: [],
    heal: [],
    death: [],
    resource: [],
  });

  const createMockPlayersById = (): Record<number, PlayerDetailsWithRole> => ({
    101: {
      id: 101,
      name: 'Player1',
      guid: 123456,
      type: 'Tank',
      role: 'tank',
      server: 'TestServer',
      displayName: 'Player1Display',
      anonymous: false,
      icon: 'icon1.png',
      specs: [],
      potionUse: 0,
      healthstoneUse: 0,
      combatantInfo: {
        stats: [],
        talents: [],
        gear: [],
      },
    },
    102: {
      id: 102,
      name: 'Player2',
      guid: 123457,
      type: 'DPS',
      role: 'dps',
      server: 'TestServer',
      displayName: 'Player2Display',
      anonymous: false,
      icon: 'icon2.png',
      specs: [],
      potionUse: 0,
      healthstoneUse: 0,
      combatantInfo: {
        stats: [],
        talents: [],
        gear: [],
      },
    },
  });

  const createMockActorsById = (): Record<number, ReportActorFragment> => ({
    101: { id: 101, name: 'Player1', type: 'Player' },
    102: { id: 102, name: 'Player2', type: 'Player' },
    201: { id: 201, name: 'Boss Enemy', type: 'NPC', subType: 'Boss' },
    202: { id: 202, name: 'Regular Enemy', type: 'NPC', subType: 'NPC' },
    301: { id: 301, name: 'Friendly NPC', type: 'NPC', subType: 'NPC' },
    401: { id: 401, name: 'Player Pet', type: 'Pet', subType: 'Pet' },
  });

  describe('basic functionality', () => {
    it('should return empty timeline when no fight data is provided', () => {
      const task: ActorPositionsCalculationTask = {
        fight: null as any,
        events: createMockEvents(),
      };

      const result = calculateActorPositions(task);

      expect(result.timeline.actorTimelines).toEqual({});
      expect(result.timeline.timestamps).toEqual([]);
      expect(result.timeline.fightDuration).toBe(0);
      expect(result.timeline.fightStartTime).toBe(0);
    });

    it('should return empty timeline when no events are provided', () => {
      const task: ActorPositionsCalculationTask = {
        fight: createMockFight(),
        events: null as any,
      };

      const result = calculateActorPositions(task);

      expect(result.timeline.actorTimelines).toEqual({});
      expect(result.timeline.timestamps).toEqual([]);
      expect(result.timeline.fightDuration).toBe(0);
      expect(result.timeline.fightStartTime).toBe(0);
    });

    it('should calculate correct fight duration and start time', () => {
      const fight = createMockFight({ startTime: 1000, endTime: 5000 });
      const task: ActorPositionsCalculationTask = {
        fight,
        events: createMockEvents(),
      };

      const result = calculateActorPositions(task);

      expect(result.timeline.fightDuration).toBe(4000); // 5000 - 1000
      expect(result.timeline.fightStartTime).toBe(1000);
    });
  });

  describe('NPC first event filtering', () => {
    it('should include positions for NPCs only after their first event', () => {
      const fight = createMockFight({ startTime: 1000, endTime: 2000 });
      const events = createMockEvents();

      // NPC first appears at timestamp 1500
      events.damage = [
        createDamageEvent(1500, 101, 202, undefined, createResources(5235, 5410, 100)),
      ];

      const task: ActorPositionsCalculationTask = {
        fight,
        events,
        playersById: createMockPlayersById(),
        actorsById: createMockActorsById(),
      };

      const result = calculateActorPositions(task);

      const enemyTimeline = result.timeline.actorTimelines[202];
      expect(enemyTimeline).toBeDefined();

      // All positions should be at or after the first event time (1500)
      enemyTimeline.positions.forEach((position) => {
        const absoluteTimestamp = fight.startTime + position.timestamp;
        expect(absoluteTimestamp).toBeGreaterThanOrEqual(1500);
      });
    });

    it('should include all positions for players regardless of first event time', () => {
      const fight = createMockFight({ startTime: 1000, endTime: 2000 });
      const events = createMockEvents();

      // Player first appears at timestamp 1500
      events.damage = [createDamageEvent(1500, 101, 202, createResources(5235, 5410, 100))];

      const task: ActorPositionsCalculationTask = {
        fight,
        events,
        playersById: createMockPlayersById(),
        actorsById: createMockActorsById(),
      };

      const result = calculateActorPositions(task);

      const playerTimeline = result.timeline.actorTimelines[101];
      expect(playerTimeline).toBeDefined();

      // Player should have positions starting from fight start, not first event
      const firstPosition = playerTimeline.positions[0];
      expect(firstPosition.timestamp).toBe(0); // Relative to fight start
    });

    it('should include all positions for bosses regardless of first event time', () => {
      const fight = createMockFight({ startTime: 1000, endTime: 2000 });
      const events = createMockEvents();

      // Boss first appears at timestamp 1500
      events.damage = [
        createDamageEvent(1500, 101, 201, undefined, createResources(5235, 5410, 100)),
      ];

      const task: ActorPositionsCalculationTask = {
        fight,
        events,
        playersById: createMockPlayersById(),
        actorsById: createMockActorsById(),
      };

      const result = calculateActorPositions(task);

      const bossTimeline = result.timeline.actorTimelines[201];
      expect(bossTimeline).toBeDefined();

      // Boss should have positions starting from fight start, not first event
      const firstPosition = bossTimeline.positions[0];
      expect(firstPosition.timestamp).toBe(0); // Relative to fight start
    });
  });

  describe('actor type classification', () => {
    it('should correctly classify players', () => {
      const fight = createMockFight();
      const events = createMockEvents();
      events.damage = [createDamageEvent(1500, 101, 201, createResources(5235, 5410, 100))];

      const task: ActorPositionsCalculationTask = {
        fight,
        events,
        playersById: createMockPlayersById(),
        actorsById: createMockActorsById(),
      };

      const result = calculateActorPositions(task);

      const playerTimeline = result.timeline.actorTimelines[101];
      expect(playerTimeline.type).toBe('player');
      expect(playerTimeline.role).toBe('tank');
    });

    it('should correctly classify bosses', () => {
      const fight = createMockFight();
      const events = createMockEvents();
      events.damage = [
        createDamageEvent(1500, 101, 201, undefined, createResources(5235, 5410, 100)),
      ];

      const task: ActorPositionsCalculationTask = {
        fight,
        events,
        playersById: createMockPlayersById(),
        actorsById: createMockActorsById(),
      };

      const result = calculateActorPositions(task);

      const bossTimeline = result.timeline.actorTimelines[201];
      expect(bossTimeline.type).toBe('boss');
      expect(bossTimeline.role).toBeUndefined();
    });

    it('should mark actors as bosses when they have subType "Boss" and type "NPC"', () => {
      const fight = createMockFight();
      const events = createMockEvents();
      events.damage = [
        createDamageEvent(1500, 101, 201, undefined, createResources(5235, 5410, 100)),
      ];

      // Create custom actors data with explicit boss formatting
      const actorsById = {
        101: { id: 101, name: 'Player1', type: 'Player' },
        201: { id: 201, name: 'Test Boss', type: 'NPC', subType: 'Boss' },
      };

      const task: ActorPositionsCalculationTask = {
        fight,
        events,
        playersById: createMockPlayersById(),
        actorsById,
      };

      const result = calculateActorPositions(task);

      const bossTimeline = result.timeline.actorTimelines[201];
      expect(bossTimeline).toBeDefined();
      expect(bossTimeline.type).toBe('boss');
      expect(bossTimeline.name).toBe('Test Boss');
      expect(bossTimeline.role).toBeUndefined();
    });

    it('should not mark actors as bosses when they have subType "Boss" but type is not "NPC"', () => {
      const fight = createMockFight();
      const events = createMockEvents();
      events.damage = [
        createDamageEvent(1500, 101, 203, undefined, createResources(5235, 5410, 100)),
      ];

      // Create custom fight and actors data with incorrect boss formatting
      const customFight = createMockFight({
        enemyNPCs: [{ id: 203, gameID: 0 }], // Add actor 203 as enemy
      });

      const actorsById = {
        101: { id: 101, name: 'Player1', type: 'Player' },
        203: { id: 203, name: 'Not Boss', type: 'Player', subType: 'Boss' }, // Wrong type
      };

      const task: ActorPositionsCalculationTask = {
        fight: customFight,
        events,
        playersById: createMockPlayersById(),
        actorsById,
      };

      const result = calculateActorPositions(task);

      const actorTimeline = result.timeline.actorTimelines[203];
      expect(actorTimeline).toBeDefined();
      expect(actorTimeline.type).not.toBe('boss');
    });

    it('should correctly classify enemy NPCs', () => {
      const fight = createMockFight();
      const events = createMockEvents();
      events.damage = [
        createDamageEvent(1500, 101, 202, undefined, createResources(5235, 5410, 100)),
      ];

      const task: ActorPositionsCalculationTask = {
        fight,
        events,
        playersById: createMockPlayersById(),
        actorsById: createMockActorsById(),
      };

      const result = calculateActorPositions(task);

      const enemyTimeline = result.timeline.actorTimelines[202];
      expect(enemyTimeline.type).toBe('enemy');
    });

    it('should correctly classify pets', () => {
      const fight = createMockFight();
      const events = createMockEvents();
      events.damage = [
        createDamageEvent(1500, 401, 202, createResources(5235, 5410, 100), undefined),
      ];

      const task: ActorPositionsCalculationTask = {
        fight,
        events,
        playersById: createMockPlayersById(),
        actorsById: createMockActorsById(),
      };

      const result = calculateActorPositions(task);

      const petTimeline = result.timeline.actorTimelines[401];
      expect(petTimeline).toBeDefined();
      expect(petTimeline.type).toBe('pet');
      expect(petTimeline.name).toBe('Player Pet');
      expect(petTimeline.role).toBeUndefined();
    });

    it('should mark actors as pets when they have subType "Pet" and type "Pet"', () => {
      const fight = createMockFight();
      const events = createMockEvents();
      events.damage = [
        createDamageEvent(1500, 401, 202, createResources(5235, 5410, 100), undefined),
      ];

      // Create custom actors data with explicit pet formatting
      const actorsById = {
        401: { id: 401, name: 'Test Pet', type: 'Pet', subType: 'Pet' },
        202: { id: 202, name: 'Regular Enemy', type: 'NPC', subType: 'NPC' },
      };

      const task: ActorPositionsCalculationTask = {
        fight,
        events,
        playersById: createMockPlayersById(),
        actorsById,
      };

      const result = calculateActorPositions(task);

      const petTimeline = result.timeline.actorTimelines[401];
      expect(petTimeline).toBeDefined();
      expect(petTimeline.type).toBe('pet');
      expect(petTimeline.name).toBe('Test Pet');
      expect(petTimeline.role).toBeUndefined();
    });

    it('should not mark actors as pets when they have subType "Pet" but type is not "Pet"', () => {
      const fight = createMockFight();
      const events = createMockEvents();
      events.damage = [
        createDamageEvent(1500, 101, 403, undefined, createResources(5235, 5410, 100)),
      ];

      // Create custom fight and actors data with incorrect pet formatting
      const customFight = createMockFight({
        enemyNPCs: [{ id: 403, gameID: 0 }], // Add actor 403 as enemy
      });

      const actorsById = {
        101: { id: 101, name: 'Player1', type: 'Player' },
        403: { id: 403, name: 'Not Pet', type: 'NPC', subType: 'Pet' }, // Wrong type
      };

      const task: ActorPositionsCalculationTask = {
        fight: customFight,
        events,
        playersById: createMockPlayersById(),
        actorsById,
      };

      const result = calculateActorPositions(task);

      const actorTimeline = result.timeline.actorTimelines[403];
      expect(actorTimeline).toBeDefined();
      expect(actorTimeline.type).not.toBe('pet');
      expect(actorTimeline.type).toBe('enemy'); // Should be classified as enemy instead
    });
  });

  describe('actor positioning requirements', () => {
    it('should register no positions for non-player actor with no events', () => {
      const fight = createMockFight();
      const events = createMockEvents(); // Empty events

      const task: ActorPositionsCalculationTask = {
        fight,
        events,
        playersById: createMockPlayersById(),
        actorsById: createMockActorsById(),
      };

      const result = calculateActorPositions(task);

      // Non-player actors (202 = enemy NPC, 301 = friendly NPC) should not have timelines
      // since they have no events
      expect(result.timeline.actorTimelines[202]).toBeUndefined();
      expect(result.timeline.actorTimelines[301]).toBeUndefined();
    });

    it('should always have positions for player actor regardless of events', () => {
      const fight = createMockFight();
      const events = createMockEvents(); // Empty events - no position data for anyone

      const task: ActorPositionsCalculationTask = {
        fight,
        events,
        playersById: createMockPlayersById(),
        actorsById: createMockActorsById(),
      };

      const result = calculateActorPositions(task);

      // Players should have empty timelines even with no events
      // (they exist but have no position entries due to no position data)
      expect(result.timeline.actorTimelines[101]).toBeUndefined();
      expect(result.timeline.actorTimelines[102]).toBeUndefined();

      // But if we add an event with position data for a player, they should get positions
      events.damage = [createDamageEvent(1500, 101, 202, createResources(5235, 5410, 100))];

      const resultWithEvent = calculateActorPositions(task);

      // Player should now have a timeline with positions from fight start
      const playerTimeline = resultWithEvent.timeline.actorTimelines[101];
      expect(playerTimeline).toBeDefined();
      expect(playerTimeline.type).toBe('player');
      expect(playerTimeline.positions.length).toBeGreaterThan(0);

      // First position should be at fight start (timestamp 0)
      const firstPosition = playerTimeline.positions[0];
      expect(firstPosition.timestamp).toBe(0);
    });

    it('should have no positions for non-player actor with no events in the next 5 seconds', () => {
      const fight = createMockFight({ startTime: 1000, endTime: 6000 }); // 5 second fight
      const events = createMockEvents();

      // Add an event for the NPC at the very end (5.5 seconds after fight start)
      events.damage = [
        createDamageEvent(6500, 101, 202, undefined, createResources(5235, 5410, 100)),
      ];

      const task: ActorPositionsCalculationTask = {
        fight,
        events,
        playersById: createMockPlayersById(),
        actorsById: createMockActorsById(),
      };

      const result = calculateActorPositions(task);

      // Enemy NPC 202 should have a timeline but with no positions because the event is outside the fight timeframe
      const enemyTimeline = result.timeline.actorTimelines[202];
      expect(enemyTimeline).toBeDefined();
      expect(enemyTimeline.type).toBe('enemy');
      expect(enemyTimeline.positions).toEqual([]); // Empty positions array since event is outside fight window
    });

    it('should have no positions prior to first event for non-player actor', () => {
      const fight = createMockFight({ startTime: 1000, endTime: 3000 }); // 2 second fight
      const events = createMockEvents();

      // NPC first appears at 1500ms (500ms into the fight)
      events.damage = [
        createDamageEvent(1500, 101, 202, undefined, createResources(5235, 5410, 100)),
      ];

      const task: ActorPositionsCalculationTask = {
        fight,
        events,
        playersById: createMockPlayersById(),
        actorsById: createMockActorsById(),
      };

      const result = calculateActorPositions(task);

      const enemyTimeline = result.timeline.actorTimelines[202];
      expect(enemyTimeline).toBeDefined();
      expect(enemyTimeline.type).toBe('enemy');

      // All positions should be at or after the first event time (1500ms absolute, 500ms relative)
      enemyTimeline.positions.forEach((position) => {
        expect(position.timestamp).toBeGreaterThanOrEqual(500); // 500ms relative to fight start
      });

      // Should have no position at fight start (timestamp 0)
      const positionAtStart = enemyTimeline.positions.find((p) => p.timestamp === 0);
      expect(positionAtStart).toBeUndefined();
    });

    it('should start position breakdown at fight beginning for player actors, not at first event', () => {
      const fight = createMockFight({ startTime: 1000, endTime: 3000 }); // 2 second fight
      const events = createMockEvents();

      // Player first appears in an event at 2000ms (1 second into the fight)
      // But their position timeline should start from fight beginning (1000ms)
      events.damage = [createDamageEvent(2000, 101, 202, createResources(5235, 5410, 100))];

      const task: ActorPositionsCalculationTask = {
        fight,
        events,
        playersById: createMockPlayersById(),
        actorsById: createMockActorsById(),
      };

      const result = calculateActorPositions(task);

      const playerTimeline = result.timeline.actorTimelines[101];
      expect(playerTimeline).toBeDefined();
      expect(playerTimeline.type).toBe('player');
      expect(playerTimeline.positions.length).toBeGreaterThan(0);

      // Player positions should start from fight beginning (timestamp 0 relative to fight start)
      const firstPosition = playerTimeline.positions[0];
      expect(firstPosition.timestamp).toBe(0);

      // Player should have positions throughout the entire fight duration, not just after first event
      const positionsBeforeEvent = playerTimeline.positions.filter((p) => p.timestamp < 1000); // Before 2000ms absolute (1000ms relative)
      expect(positionsBeforeEvent.length).toBeGreaterThan(0);

      // Verify we have positions spanning the full fight duration
      const lastPosition = playerTimeline.positions[playerTimeline.positions.length - 1];
      expect(lastPosition.timestamp).toBe(2000); // Should go to end of fight (2000ms relative)

      // Contrast with NPC behavior - enemy should only have positions after first event
      const enemyTimeline = result.timeline.actorTimelines[202];
      expect(enemyTimeline).toBeDefined();
      expect(enemyTimeline.type).toBe('enemy');

      // Enemy should NOT have position at fight start
      if (enemyTimeline.positions.length > 0) {
        const enemyFirstPosition = enemyTimeline.positions[0];
        expect(enemyFirstPosition.timestamp).toBeGreaterThanOrEqual(1000); // At or after first event (1000ms relative)
      }
    });

    it('should have no positions for pet actor with no events in the next 5 seconds', () => {
      const fight = createMockFight({ startTime: 1000, endTime: 21000 }); // 20 second fight
      const events = createMockEvents();

      // Add pet events at 3 seconds (4000ms absolute) and 17 seconds (18000ms absolute)
      // This creates a 14-second gap between events (3s to 17s = 14s gap, which is > 5s)
      events.damage = [
        createDamageEvent(4000, 401, 202, createResources(5235, 5410, 100), undefined), // Pet event at 3 seconds
        createDamageEvent(18000, 401, 202, createResources(5240, 5415, 200), undefined), // Pet event at 17 seconds
      ];

      const task: ActorPositionsCalculationTask = {
        fight,
        events,
        playersById: createMockPlayersById(),
        actorsById: createMockActorsById(),
      };

      const result = calculateActorPositions(task);

      // Pet 401 should have a timeline with positions
      const petTimeline = result.timeline.actorTimelines[401];
      expect(petTimeline).toBeDefined();
      expect(petTimeline.type).toBe('pet');
      expect(petTimeline.positions.length).toBeGreaterThan(0);

      // Pet should have positions only at the exact event times and for 1 second after each event
      // Since there's a 14-second gap (> 5 seconds), positions should:
      // 1. Show at first event (3s) and for 1 second after (until 4s)
      // 2. NOT show during the large gap (4s to 17s)
      // 3. Show at second event (17s) and for 1 second after (until 18s)
      const gapTolerance = 50; // 50ms tolerance for floating point precision and sample intervals
      const minVisibilityMs = 1000; // 1 second minimum visibility

      // Should have positions for 1 second after first event (3s to 4s)
      const positionsAfterFirstEvent = petTimeline.positions.filter(
        (position) => position.timestamp >= 3000 && position.timestamp <= 3000 + minVisibilityMs,
      );
      expect(positionsAfterFirstEvent.length).toBeGreaterThan(0); // Should have positions for 1 second after first event

      // Should have NO positions during the large gap (after 1s minimum visibility ends until second event)
      const positionsDuringLargeGap = petTimeline.positions.filter(
        (position) =>
          position.timestamp > 3000 + minVisibilityMs + gapTolerance &&
          position.timestamp < 17000 - gapTolerance,
      );
      expect(positionsDuringLargeGap).toEqual([]); // No positions during the large gap (after minimum visibility)

      // Should have positions for 1 second after second event (17s to 18s)
      const positionsAfterSecondEvent = petTimeline.positions.filter(
        (position) => position.timestamp >= 17000 && position.timestamp <= 17000 + minVisibilityMs,
      );
      expect(positionsAfterSecondEvent.length).toBeGreaterThan(0); // Should have positions for 1 second after second event

      // Verify pet has positions only at the exact event times (within tolerance for floating point)
      const eventTolerance = 10; // 10ms tolerance for floating point precision
      const positionsAtFirstEvent = petTimeline.positions.filter(
        (position) => Math.abs(position.timestamp - 3000) <= eventTolerance,
      );
      expect(positionsAtFirstEvent.length).toBeGreaterThan(0); // Has position at first event

      const positionsAtSecondEvent = petTimeline.positions.filter(
        (position) => Math.abs(position.timestamp - 17000) <= eventTolerance,
      );
      expect(positionsAtSecondEvent.length).toBeGreaterThan(0); // Has position at second event
    });

    it('should have continuous positions for pet actor with frequent events after initial gap', () => {
      const fight = createMockFight({ startTime: 1000, endTime: 21000 }); // 20 second fight
      const events = createMockEvents();

      // Pet has events at 4s, 8s, then every second from 9s to 20s
      // Gap between 4s and 8s is 4 seconds (< 5 seconds), so should have continuous positions
      // From 8s onwards, frequent events should maintain continuous positions
      const petEvents = [
        createDamageEvent(5000, 401, 202, createResources(5235, 5410, 100), undefined), // 4 seconds relative
        createDamageEvent(9000, 401, 202, createResources(5240, 5415, 200), undefined), // 8 seconds relative
      ];

      // Add events every second from 9s to 20s
      for (let i = 9; i <= 20; i++) {
        petEvents.push(
          createDamageEvent(1000 + i * 1000, 401, 202, createResources(5240, 5415, 200), undefined),
        );
      }

      events.damage = petEvents;

      const task: ActorPositionsCalculationTask = {
        fight,
        events,
        playersById: createMockPlayersById(),
        actorsById: createMockActorsById(),
      };

      const result = calculateActorPositions(task);

      // Pet 401 should have a timeline with positions
      const petTimeline = result.timeline.actorTimelines[401];
      expect(petTimeline).toBeDefined();
      expect(petTimeline.type).toBe('pet');
      expect(petTimeline.positions.length).toBeGreaterThan(0);

      // Should have NO positions before first event (0 to 4 seconds)
      const positionsBeforeFirstEvent = petTimeline.positions.filter(
        (position) => position.timestamp < 4000,
      );
      expect(positionsBeforeFirstEvent).toEqual([]);

      // Should have positions between 4s and 8s (gap is 4 seconds < 5 seconds)
      const positionsBetweenEvents = petTimeline.positions.filter(
        (position) => position.timestamp >= 4000 && position.timestamp <= 8000,
      );
      expect(positionsBetweenEvents.length).toBeGreaterThan(0); // Should have positions during the 4-second gap

      // Should have continuous positions from 8s onwards due to frequent events
      const positionsAfter8s = petTimeline.positions.filter(
        (position) => position.timestamp >= 8000,
      );
      expect(positionsAfter8s.length).toBeGreaterThan(0); // Should have many positions due to frequent events

      // Verify the pet has a reasonable number of positions overall
      // With events every second from 8s onwards, should have many sample points
      expect(petTimeline.positions.length).toBeGreaterThan(10); // Should have many positions due to frequent events
    });

    it('should ensure actors remain visible for at least 1 second after an event', () => {
      const fight = createMockFight({ startTime: 1000, endTime: 11000 }); // 10 second fight
      const events = createMockEvents();

      // Pet has a single event at 5 seconds, should remain visible until at least 6 seconds
      const petEvents = [
        createDamageEvent(6000, 401, 202, createResources(5235, 5410, 100), undefined), // 5 seconds relative
      ];

      events.damage = petEvents;

      const task: ActorPositionsCalculationTask = {
        fight,
        events,
        playersById: createMockPlayersById(),
        actorsById: createMockActorsById(),
      };

      const result = calculateActorPositions(task);

      // Pet 401 should have a timeline with positions
      const petTimeline = result.timeline.actorTimelines[401];
      expect(petTimeline).toBeDefined();
      expect(petTimeline.type).toBe('pet');
      expect(petTimeline.positions.length).toBeGreaterThan(0);

      // Should have NO positions before first event (0 to 5 seconds)
      const positionsBeforeEvent = petTimeline.positions.filter(
        (position) => position.timestamp < 5000,
      );
      expect(positionsBeforeEvent).toEqual([]);

      // Should have positions during the minimum visibility period (5 to 6 seconds)
      const positionsDuringMinVisibility = petTimeline.positions.filter(
        (position) => position.timestamp >= 5000 && position.timestamp <= 6000,
      );
      expect(positionsDuringMinVisibility.length).toBeGreaterThan(0); // Should have positions for minimum 1 second

      // Should have NO positions after minimum visibility period ends (after 6 seconds)
      const positionsAfterMinVisibility = petTimeline.positions.filter(
        (position) => position.timestamp > 6000,
      );
      expect(positionsAfterMinVisibility).toEqual([]);

      // Verify the exact event time has a position
      const eventTolerance = 10; // 10ms tolerance for floating point precision
      const positionsAtEvent = petTimeline.positions.filter(
        (position) => Math.abs(position.timestamp - 5000) <= eventTolerance,
      );
      expect(positionsAtEvent.length).toBeGreaterThan(0); // Has position at the event time
    });

    it('should not interpolate positions during minimum visibility window when next event is in a large gap', () => {
      const fight = createMockFight({ startTime: 1000, endTime: 21000 }); // 20 second fight
      const events = createMockEvents();

      // Pet has events at 5s and 15s (10-second gap > 5 seconds)
      // During the 1-second visibility window after the first event (5s to 6s),
      // positions should NOT interpolate toward the distant event at 15s
      const petEvents = [
        createDamageEvent(6000, 401, 202, createResources(5235, 5410, 100), undefined), // 5 seconds relative, position (0, 0, 0)
        createDamageEvent(16000, 401, 202, createResources(5335, 5510, 200), undefined), // 15 seconds relative, position (0.1, 0, 0.1)
      ];

      events.damage = petEvents;

      const task: ActorPositionsCalculationTask = {
        fight,
        events,
        playersById: createMockPlayersById(),
        actorsById: createMockActorsById(),
      };

      const result = calculateActorPositions(task);

      // Pet 401 should have a timeline with positions
      const petTimeline = result.timeline.actorTimelines[401];
      expect(petTimeline).toBeDefined();
      expect(petTimeline.type).toBe('pet');
      expect(petTimeline.positions.length).toBeGreaterThan(0);

      // Get positions during the minimum visibility window (5s to 6s)
      const positionsDuringMinVisibility = petTimeline.positions.filter(
        (position) => position.timestamp >= 5000 && position.timestamp <= 6000,
      );
      expect(positionsDuringMinVisibility.length).toBeGreaterThan(0);

      // All positions during the minimum visibility window should be at the same location
      // (the position from the 5s event), NOT interpolating toward the 15s event
      const expectedPosition = [0, 0, 0]; // Position from first event (5235 - 5235 = 0, 5410 - 5410 = 0)

      for (const position of positionsDuringMinVisibility) {
        // All positions should be at the same location (no interpolation toward distant event)
        expect(position.position[0]).toBeCloseTo(expectedPosition[0], 5); // X coordinate
        expect(position.position[1]).toBeCloseTo(expectedPosition[1], 5); // Y coordinate
        expect(position.position[2]).toBeCloseTo(expectedPosition[2], 5); // Z coordinate
      }

      // Verify there are NO positions during the large gap (after 6s until before 15s)
      const positionsDuringLargeGap = petTimeline.positions.filter(
        (position) => position.timestamp > 6000 + 50 && position.timestamp < 15000 - 50,
      );
      expect(positionsDuringLargeGap).toEqual([]);

      // Verify positions exist at the second event (15s) with the correct different position
      const positionsAtSecondEvent = petTimeline.positions.filter(
        (position) => Math.abs(position.timestamp - 15000) <= 10,
      );
      expect(positionsAtSecondEvent.length).toBeGreaterThan(0);

      // Second event should be at a different position
      const secondEventPosition = [0.1, 0, 0.1]; // Position from second event (5335 - 5235 = 100, 5510 - 5410 = 100)
      const actualSecondPosition = positionsAtSecondEvent[0];
      expect(actualSecondPosition.position[0]).toBeCloseTo(secondEventPosition[0], 5);
      expect(actualSecondPosition.position[1]).toBeCloseTo(secondEventPosition[1], 5);
      expect(actualSecondPosition.position[2]).toBeCloseTo(secondEventPosition[2], 5);
    });
  });
});
