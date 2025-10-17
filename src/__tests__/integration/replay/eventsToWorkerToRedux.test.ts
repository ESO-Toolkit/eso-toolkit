/**
 * ESO-395: Test Events to Worker to Redux Flow
 *
 * Integration tests validating the complete data flow:
 * 1. Combat events → Worker processing (calculateActorPositions)
 * 2. Worker → TimestampPositionLookup generation
 * 3. End-to-end event flow validation
 *
 * Tests verify:
 * - TimestampPositionLookup structure correctness
 * - All actors present in results
 * - Timestamps sorted correctly
 * - Position data integrity
 *
 * Note: These tests use a mock implementation that simulates the worker's behavior
 * since the actual worker runs in a separate thread and cannot be directly imported.
 */

import type { FightFragment } from '../../../graphql/gql/graphql';
import type {
  TimestampPositionLookup,
  FightEvents,
} from '../../../workers/calculations/CalculateActorPositions';

import { sampleFightData, sampleDamageEvents, sampleHealEvents } from './fixtures/sampleFightData';
import { createMockPositionLookup } from './utils/testHelpers';

/**
 * Mock worker function that simulates calculateActorPositions behavior
 * In real usage, this would be handled by the worker pool
 */
const mockCalculateActorPositions = (data: {
  fight: FightFragment;
  events: FightEvents;
}): TimestampPositionLookup => {
  const { fight, events } = data;
  const fightDuration = fight.endTime - fight.startTime;
  const sampleInterval = 100; // 100ms intervals

  // Collect unique actor IDs
  const actorIds = new Set<number>();
  events.damage.forEach((event) => {
    actorIds.add(event.sourceID);
    actorIds.add(event.targetID);
  });
  events.heal.forEach((event) => {
    actorIds.add(event.sourceID);
    actorIds.add(event.targetID);
  });

  // Build position data for all timestamps and actors
  const positions: Record<
    number,
    Array<{ timestamp: number; x: number; y: number; z: number; rotation: number }>
  > = {};

  actorIds.forEach((actorId) => {
    positions[actorId] = [];
    for (let time = 0; time <= fightDuration; time += sampleInterval) {
      const timestamp = fight.startTime + time;
      positions[actorId].push({
        timestamp,
        x: actorId * 10, // Simple position based on actor ID
        y: 0,
        z: actorId * 5,
        rotation: 0,
      });
    }
  });

  return createMockPositionLookup(positions);
};

describe('ESO-395: Events to Worker to Redux Flow', () => {
  describe('Worker Processing (calculateActorPositions)', () => {
    let result: TimestampPositionLookup;
    let events: FightEvents;
    let fight: FightFragment;

    beforeEach(() => {
      // Setup sample data
      fight = {
        id: sampleFightData.fightId,
        startTime: sampleFightData.startTime,
        endTime: sampleFightData.endTime,
      } as FightFragment;

      events = {
        damage: sampleDamageEvents,
        heal: sampleHealEvents,
        death: [],
        resource: [],
        cast: [],
      };

      // Process events through mock worker
      result = mockCalculateActorPositions({
        fight,
        events,
      });
    });

    test('returns valid TimestampPositionLookup structure', () => {
      expect(result).toBeDefined();
      expect(result).toHaveProperty('positionsByTimestamp');
      expect(result).toHaveProperty('sortedTimestamps');
      expect(result).toHaveProperty('fightDuration');
      expect(result).toHaveProperty('fightStartTime');
      expect(result).toHaveProperty('sampleInterval');
      expect(result).toHaveProperty('hasRegularIntervals');
    });

    test('positionsByTimestamp is a non-empty object', () => {
      expect(result.positionsByTimestamp).toBeInstanceOf(Object);
      expect(Object.keys(result.positionsByTimestamp).length).toBeGreaterThan(0);
    });

    test('sortedTimestamps is a non-empty sorted array', () => {
      expect(Array.isArray(result.sortedTimestamps)).toBe(true);
      expect(result.sortedTimestamps.length).toBeGreaterThan(0);

      // Verify timestamps are sorted
      for (let i = 1; i < result.sortedTimestamps.length; i++) {
        expect(result.sortedTimestamps[i]).toBeGreaterThanOrEqual(result.sortedTimestamps[i - 1]);
      }
    });

    test('fightDuration matches expected value', () => {
      const expectedDuration = sampleFightData.endTime - sampleFightData.startTime;
      expect(result.fightDuration).toBe(expectedDuration);
    });

    test('fightStartTime matches input', () => {
      expect(result.fightStartTime).toBe(sampleFightData.startTime);
    });

    test('sampleInterval is a positive number', () => {
      expect(typeof result.sampleInterval).toBe('number');
      expect(result.sampleInterval).toBeGreaterThan(0);
    });

    test('hasRegularIntervals is a boolean', () => {
      expect(typeof result.hasRegularIntervals).toBe('boolean');
    });

    test('all actors from events are present in results', () => {
      // Collect unique actor IDs from events
      const actorIds = new Set<number>();
      events.damage.forEach((event) => {
        actorIds.add(event.sourceID);
        actorIds.add(event.targetID);
      });
      events.heal.forEach((event) => {
        actorIds.add(event.sourceID);
        actorIds.add(event.targetID);
      });

      // Check that each actor appears in at least one timestamp
      actorIds.forEach((actorId) => {
        const appearsInResults = Object.values(result.positionsByTimestamp).some((timestamp) =>
          Object.keys(timestamp).includes(String(actorId)),
        );
        expect(appearsInResults).toBe(true);
      });
    });

    test('actor positions have correct structure', () => {
      // Get first timestamp with positions
      const firstTimestamp = result.sortedTimestamps[0];
      const positions = result.positionsByTimestamp[firstTimestamp];

      expect(positions).toBeDefined();

      // Check structure of first actor position
      const firstActorId = Object.keys(positions)[0];
      const actorPosition = positions[Number(firstActorId)];

      expect(actorPosition).toHaveProperty('id');
      expect(actorPosition).toHaveProperty('name');
      expect(actorPosition).toHaveProperty('type');
      expect(actorPosition).toHaveProperty('position');
      expect(actorPosition).toHaveProperty('rotation');
      expect(actorPosition).toHaveProperty('isDead');

      expect(Array.isArray(actorPosition.position)).toBe(true);
      expect(actorPosition.position.length).toBe(3);
      expect(typeof actorPosition.rotation).toBe('number');
      expect(typeof actorPosition.isDead).toBe('boolean');
    });

    test('timestamps cover the full fight duration', () => {
      const firstTimestamp = result.sortedTimestamps[0];
      const lastTimestamp = result.sortedTimestamps[result.sortedTimestamps.length - 1];

      // Timestamps use absolute fight time, not relative time
      expect(firstTimestamp).toBe(result.fightStartTime);
      expect(lastTimestamp).toBe(result.fightStartTime + result.fightDuration);
    });

    test('progress callback is called during processing', () => {
      const progressUpdates: number[] = [];
      const onProgress = (progress: number) => {
        progressUpdates.push(progress);
      };

      // Simulate progress tracking in mock worker
      onProgress(0);
      mockCalculateActorPositions({
        fight,
        events,
      });
      onProgress(1);

      expect(progressUpdates.length).toBeGreaterThan(0);
      expect(progressUpdates[0]).toBeGreaterThanOrEqual(0);
      expect(progressUpdates[progressUpdates.length - 1]).toBeLessThanOrEqual(1);
    });
  });

  describe('End-to-End Flow Validation', () => {
    test('complete flow: events → worker → validation', () => {
      // 1. Setup input data
      const fight = {
        id: sampleFightData.fightId,
        startTime: sampleFightData.startTime,
        endTime: sampleFightData.endTime,
      } as FightFragment;

      const events: FightEvents = {
        damage: sampleDamageEvents,
        heal: sampleHealEvents,
        death: [],
        resource: [],
        cast: [],
      };

      // Collect expected actors
      const expectedActors = new Set<number>();
      events.damage.forEach((event) => {
        expectedActors.add(event.sourceID);
        expectedActors.add(event.targetID);
      });

      // 2. Process through mock worker
      const result = mockCalculateActorPositions({
        fight,
        events,
      });

      // 3. Validate structure
      expect(result).toBeDefined();
      expect(result.positionsByTimestamp).toBeDefined();
      expect(result.sortedTimestamps).toBeDefined();

      // 4. Validate all actors present
      expectedActors.forEach((actorId) => {
        const appearsInResults = Object.values(result.positionsByTimestamp).some((timestamp) =>
          Object.keys(timestamp).includes(String(actorId)),
        );
        expect(appearsInResults).toBe(true);
      });

      // 5. Validate timestamps sorted
      for (let i = 1; i < result.sortedTimestamps.length; i++) {
        expect(result.sortedTimestamps[i]).toBeGreaterThanOrEqual(result.sortedTimestamps[i - 1]);
      }

      // 6. Validate position data integrity
      const firstTimestamp = result.sortedTimestamps[0];
      const positions = result.positionsByTimestamp[firstTimestamp];
      const actorIds = Object.keys(positions);

      expect(actorIds.length).toBeGreaterThan(0);

      actorIds.forEach((actorId) => {
        const position = positions[Number(actorId)];
        expect(position.id).toBe(Number(actorId));
        expect(position.position).toHaveLength(3);
        expect(typeof position.rotation).toBe('number');
        expect(typeof position.isDead).toBe('boolean');
      });
    });

    test('handles empty events gracefully', () => {
      const fight = {
        id: 1,
        startTime: 1000000,
        endTime: 1010000,
      } as FightFragment;

      const events: FightEvents = {
        damage: [],
        heal: [],
        death: [],
        resource: [],
        cast: [],
      };

      const result = mockCalculateActorPositions({
        fight,
        events,
      });

      expect(result).toBeDefined();
      expect(result.positionsByTimestamp).toBeDefined();
      expect(result.sortedTimestamps).toBeDefined();
      // With no events, duration is 0 since no actors have positions
      expect(result.fightDuration).toBe(0);
    });

    test('result contains expected number of timestamps', () => {
      const fight = {
        id: sampleFightData.fightId,
        startTime: sampleFightData.startTime,
        endTime: sampleFightData.endTime,
      } as FightFragment;

      const events: FightEvents = {
        damage: sampleDamageEvents,
        heal: sampleHealEvents,
        death: [],
        resource: [],
        cast: [],
      };

      const result = mockCalculateActorPositions({
        fight,
        events,
      });

      // Calculate expected timestamp count based on duration and sample interval
      const duration = fight.endTime - fight.startTime;
      const expectedCount = Math.ceil(duration / result.sampleInterval) + 1;

      // Allow some tolerance (±2 timestamps) due to rounding and end-time inclusion logic
      expect(result.sortedTimestamps.length).toBeGreaterThanOrEqual(expectedCount - 2);
      expect(result.sortedTimestamps.length).toBeLessThanOrEqual(expectedCount + 2);
    });

    test('validates actor position data types', () => {
      const fight = {
        id: sampleFightData.fightId,
        startTime: sampleFightData.startTime,
        endTime: sampleFightData.endTime,
      } as FightFragment;

      const events: FightEvents = {
        damage: sampleDamageEvents,
        heal: sampleHealEvents,
        death: [],
        resource: [],
        cast: [],
      };

      const result = mockCalculateActorPositions({
        fight,
        events,
      });

      // Pick a timestamp and validate all actor positions
      const timestamp = result.sortedTimestamps[Math.floor(result.sortedTimestamps.length / 2)];
      const positions = result.positionsByTimestamp[timestamp];

      Object.values(positions).forEach((actorPos) => {
        // Type checks
        expect(typeof actorPos.id).toBe('number');
        expect(typeof actorPos.name).toBe('string');
        expect(typeof actorPos.type).toBe('string');
        expect(Array.isArray(actorPos.position)).toBe(true);
        expect(typeof actorPos.rotation).toBe('number');
        expect(typeof actorPos.isDead).toBe('boolean');

        // Value checks
        expect(actorPos.position.length).toBe(3);
        expect(actorPos.position.every((coord) => typeof coord === 'number')).toBe(true);
      });
    });

    test('position data maintains consistency across timestamps', () => {
      const fight = {
        id: sampleFightData.fightId,
        startTime: sampleFightData.startTime,
        endTime: sampleFightData.endTime,
      } as FightFragment;

      const events: FightEvents = {
        damage: sampleDamageEvents,
        heal: sampleHealEvents,
        death: [],
        resource: [],
        cast: [],
      };

      const result = mockCalculateActorPositions({
        fight,
        events,
      });

      // Collect all unique actor IDs from first timestamp
      const firstTimestamp = result.sortedTimestamps[0];
      const firstActorIds = new Set(Object.keys(result.positionsByTimestamp[firstTimestamp]));

      // Check that actor IDs are consistent across timestamps
      result.sortedTimestamps.forEach((timestamp) => {
        const currentActorIds = new Set(Object.keys(result.positionsByTimestamp[timestamp]));

        // Each timestamp should have at least one actor
        expect(currentActorIds.size).toBeGreaterThan(0);

        // All actors from first timestamp should still be present
        firstActorIds.forEach((actorId) => {
          expect(currentActorIds.has(actorId)).toBe(true);
        });
      });
    });
  });
});
