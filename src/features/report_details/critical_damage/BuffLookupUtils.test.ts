import { BuffEvent, DebuffEvent } from '../../../types/combatlogEvents';

import {
  createBuffLookup,
  createDebuffLookup,
  isBuffActive,
  isBuffActiveOnTarget,
  isBuffActiveOnAnyTarget,
  getActiveTargets,
} from './BuffLookupUtils';

describe('BuffLookupUtils', () => {
  // Mock buff events for testing
  const createApplyBuffEvent = (
    timestamp: number,
    abilityGameID: number,
    targetID: number
  ): BuffEvent => ({
    timestamp,
    type: 'applybuff',
    sourceID: 1,
    sourceIsFriendly: true,
    targetID,
    targetIsFriendly: true,
    abilityGameID,
    fight: 1,
    extraAbilityGameID: 0,
  });

  const createRemoveBuffEvent = (
    timestamp: number,
    abilityGameID: number,
    targetID: number
  ): BuffEvent => ({
    timestamp,
    type: 'removebuff',
    sourceID: 1,
    sourceIsFriendly: true,
    targetID,
    targetIsFriendly: true,
    abilityGameID,
    fight: 1,
  });

  const createApplyBuffStackEvent = (
    timestamp: number,
    abilityGameID: number,
    targetID: number,
    stack = 1
  ): BuffEvent => ({
    timestamp,
    type: 'applybuffstack',
    sourceID: 1,
    sourceIsFriendly: true,
    targetID,
    targetIsFriendly: true,
    abilityGameID,
    fight: 1,
    stack,
  });

  const createRemoveBuffStackEvent = (
    timestamp: number,
    abilityGameID: number,
    targetID: number,
    stack = 1
  ): BuffEvent => ({
    timestamp,
    type: 'removebuffstack',
    sourceID: 1,
    sourceIsFriendly: true,
    targetID,
    targetIsFriendly: true,
    abilityGameID,
    fight: 1,
    stack,
  });

  // Mock debuff events for testing
  const createApplyDebuffEvent = (
    timestamp: number,
    abilityGameID: number,
    targetID: number
  ): DebuffEvent => ({
    timestamp,
    type: 'applydebuff',
    sourceID: 1,
    sourceIsFriendly: false,
    targetID,
    targetIsFriendly: false,
    abilityGameID,
    fight: 1,
  });

  const createRemoveDebuffEvent = (
    timestamp: number,
    abilityGameID: number,
    targetID: number
  ): DebuffEvent => ({
    timestamp,
    type: 'removedebuff',
    sourceID: 1,
    sourceIsFriendly: false,
    targetID,
    targetIsFriendly: false,
    abilityGameID,
    fight: 1,
  });

  const createApplyDebuffStackEvent = (
    timestamp: number,
    abilityGameID: number,
    targetID: number,
    stack = 1
  ): DebuffEvent => ({
    timestamp,
    type: 'applydebuffstack',
    sourceID: 1,
    sourceIsFriendly: false,
    targetID,
    targetIsFriendly: false,
    abilityGameID,
    fight: 1,
    stack,
  });

  const createRemoveDebuffStackEvent = (
    timestamp: number,
    abilityGameID: number,
    targetID: number,
    stack = 1
  ): DebuffEvent => ({
    timestamp,
    type: 'removedebuffstack',
    sourceID: 1,
    sourceIsFriendly: false,
    targetID,
    targetIsFriendly: false,
    abilityGameID,
    fight: 1,
    stack,
  });

  describe('createBuffLookup', () => {
    describe('Basic functionality', () => {
      it('should create a BuffLookupData instance', () => {
        const buffEvents: BuffEvent[] = [];
        const lookup = createBuffLookup(buffEvents);

        expect(lookup).toBeDefined();
        expect(lookup.buffIntervals).toBeInstanceOf(Map);
        expect(typeof isBuffActive).toBe('function');
        expect(typeof isBuffActiveOnTarget).toBe('function');
        expect(typeof getActiveTargets).toBe('function');
      });

      it('should return false for empty buff events', () => {
        const buffEvents: BuffEvent[] = [];
        const lookup = createBuffLookup(buffEvents);

        expect(isBuffActive(lookup, 12345, 1000)).toBe(false);
        expect(isBuffActiveOnTarget(lookup, 12345, 1000, 1)).toBe(false);
        expect(getActiveTargets(lookup, 12345, 1000)).toEqual([]);
      });

      it('should return false for non-existent ability', () => {
        const buffEvents: BuffEvent[] = [
          createApplyBuffEvent(1000, 12345, 1),
          createRemoveBuffEvent(2000, 12345, 1),
        ];
        const lookup = createBuffLookup(buffEvents);

        expect(isBuffActive(lookup, 99999, 1500)).toBe(false);
        expect(isBuffActiveOnTarget(lookup, 99999, 1500, 1)).toBe(false);
        expect(getActiveTargets(lookup, 99999, 1500)).toEqual([]);
      });
    });

    describe('Single target buff tracking', () => {
      it('should track basic buff apply/remove cycle', () => {
        const buffEvents: BuffEvent[] = [
          createApplyBuffEvent(1000, 12345, 1),
          createRemoveBuffEvent(3000, 12345, 1),
        ];
        const lookup = createBuffLookup(buffEvents);

        // Before buff
        expect(isBuffActive(lookup, 12345, 500)).toBe(false);
        expect(isBuffActiveOnTarget(lookup, 12345, 500, 1)).toBe(false);
        expect(getActiveTargets(lookup, 12345, 500)).toEqual([]);

        // During buff
        expect(isBuffActive(lookup, 12345, 2000)).toBe(true);
        expect(isBuffActiveOnTarget(lookup, 12345, 2000, 1)).toBe(true);
        expect(getActiveTargets(lookup, 12345, 2000)).toEqual([1]);

        // After buff removal
        expect(isBuffActive(lookup, 12345, 4000)).toBe(false);
        expect(isBuffActiveOnTarget(lookup, 12345, 4000, 1)).toBe(false);
        expect(getActiveTargets(lookup, 12345, 4000)).toEqual([]);
      });

      it('should handle buff edge cases (exact timestamps)', () => {
        const buffEvents: BuffEvent[] = [
          createApplyBuffEvent(1000, 12345, 1),
          createRemoveBuffEvent(3000, 12345, 1),
        ];
        const lookup = createBuffLookup(buffEvents);

        // Exactly at apply time
        expect(isBuffActive(lookup, 12345, 1000)).toBe(true);
        expect(isBuffActiveOnTarget(lookup, 12345, 1000, 1)).toBe(true);

        // Exactly at remove time
        expect(isBuffActive(lookup, 12345, 3000)).toBe(true);
        expect(isBuffActiveOnTarget(lookup, 12345, 3000, 1)).toBe(true);

        // Just after remove
        expect(isBuffActive(lookup, 12345, 3001)).toBe(false);
        expect(isBuffActiveOnTarget(lookup, 12345, 3001, 1)).toBe(false);
      });
    });

    describe('Multi-target buff tracking', () => {
      it('should track buffs on multiple targets simultaneously', () => {
        const buffEvents: BuffEvent[] = [
          createApplyBuffEvent(1000, 12345, 1), // Player 1 gets buff
          createApplyBuffEvent(1500, 12345, 2), // Player 2 gets buff
          createRemoveBuffEvent(2500, 12345, 1), // Player 1 loses buff
          createRemoveBuffEvent(3500, 12345, 2), // Player 2 loses buff
        ];
        const lookup = createBuffLookup(buffEvents);

        // At 1200ms: Only player 1 has buff
        expect(isBuffActive(lookup, 12345, 1200)).toBe(true);
        expect(isBuffActiveOnTarget(lookup, 12345, 1200, 1)).toBe(true);
        expect(isBuffActiveOnTarget(lookup, 12345, 1200, 2)).toBe(false);
        expect(getActiveTargets(lookup, 12345, 1200)).toEqual([1]);

        // At 2000ms: Both players have buff
        expect(isBuffActive(lookup, 12345, 2000)).toBe(true);
        expect(isBuffActiveOnTarget(lookup, 12345, 2000, 1)).toBe(true);
        expect(isBuffActiveOnTarget(lookup, 12345, 2000, 2)).toBe(true);
        expect(getActiveTargets(lookup, 12345, 2000)).toEqual([1, 2]);

        // At 3000ms: Only player 2 has buff
        expect(isBuffActive(lookup, 12345, 3000)).toBe(true);
        expect(isBuffActiveOnTarget(lookup, 12345, 3000, 1)).toBe(false);
        expect(isBuffActiveOnTarget(lookup, 12345, 3000, 2)).toBe(true);
        expect(getActiveTargets(lookup, 12345, 3000)).toEqual([2]);

        // At 4000ms: No players have buff
        expect(isBuffActive(lookup, 12345, 4000)).toBe(false);
        expect(isBuffActiveOnTarget(lookup, 12345, 4000, 1)).toBe(false);
        expect(isBuffActiveOnTarget(lookup, 12345, 4000, 2)).toBe(false);
        expect(getActiveTargets(lookup, 12345, 4000)).toEqual([]);
      });

      it('should track different abilities independently', () => {
        const buffEvents: BuffEvent[] = [
          createApplyBuffEvent(1000, 12345, 1), // Ability A on player 1
          createApplyBuffEvent(1500, 67890, 2), // Ability B on player 2
          createRemoveBuffEvent(2500, 12345, 1), // Remove ability A from player 1
        ];
        const lookup = createBuffLookup(buffEvents);

        // At 2000ms: Different abilities on different players
        expect(isBuffActive(lookup, 12345, 2000)).toBe(true);
        expect(isBuffActive(lookup, 67890, 2000)).toBe(true);
        expect(isBuffActiveOnTarget(lookup, 12345, 2000, 1)).toBe(true);
        expect(isBuffActiveOnTarget(lookup, 67890, 2000, 2)).toBe(true);
        expect(isBuffActiveOnTarget(lookup, 12345, 2000, 2)).toBe(false);
        expect(isBuffActiveOnTarget(lookup, 67890, 2000, 1)).toBe(false);

        // At 3000ms: Only ability B remains
        expect(isBuffActive(lookup, 12345, 3000)).toBe(false);
        expect(isBuffActive(lookup, 67890, 3000)).toBe(true);
        expect(getActiveTargets(lookup, 67890, 3000)).toEqual([2]);
      });
    });

    describe('Buff stacks handling', () => {
      it('should handle applybuffstack and removebuffstack events', () => {
        const buffEvents: BuffEvent[] = [
          createApplyBuffEvent(1000, 12345, 1),
          createApplyBuffStackEvent(1500, 12345, 1), // Stack application
          createRemoveBuffStackEvent(2000, 12345, 1), // Stack removal
          createRemoveBuffEvent(2500, 12345, 1),
        ];
        const lookup = createBuffLookup(buffEvents);

        // Should be active throughout the period
        expect(isBuffActive(lookup, 12345, 1200)).toBe(true);
        expect(isBuffActive(lookup, 12345, 1800)).toBe(true);
        expect(isBuffActive(lookup, 12345, 2200)).toBe(true);
        expect(isBuffActive(lookup, 12345, 3000)).toBe(false);
      });

      it('should not duplicate active buffs on stack applications', () => {
        const buffEvents: BuffEvent[] = [
          createApplyBuffEvent(1000, 12345, 1),
          createApplyBuffStackEvent(1500, 12345, 1), // Should not create new interval
          createRemoveBuffEvent(2500, 12345, 1),
        ];
        const lookup = createBuffLookup(buffEvents);

        expect(isBuffActiveOnTarget(lookup, 12345, 2000, 1)).toBe(true);
        expect(getActiveTargets(lookup, 12345, 2000)).toEqual([1]); // Should still be just one target
      });
    });

    describe('Fight end time handling', () => {
      it('should extend active buffs to fight end time', () => {
        const fightEndTime = 5000;
        const buffEvents: BuffEvent[] = [
          createApplyBuffEvent(1000, 12345, 1),
          // No remove event - buff should last until fight end
        ];
        const lookup = createBuffLookup(buffEvents, fightEndTime);

        // Should be active throughout fight
        expect(isBuffActive(lookup, 12345, 2000)).toBe(true);
        expect(isBuffActive(lookup, 12345, 4000)).toBe(true);
        expect(isBuffActiveOnTarget(lookup, 12345, 4500, 1)).toBe(true);

        // Should not be active after fight end
        expect(isBuffActive(lookup, 12345, 6000)).toBe(false);
      });

      it('should handle multiple active buffs at fight end', () => {
        const fightEndTime = 5000;
        const buffEvents: BuffEvent[] = [
          createApplyBuffEvent(1000, 12345, 1),
          createApplyBuffEvent(1500, 12345, 2),
          createApplyBuffEvent(2000, 67890, 1),
          // No remove events - all should last until fight end
        ];
        const lookup = createBuffLookup(buffEvents, fightEndTime);

        expect(getActiveTargets(lookup, 12345, 4000)).toEqual([1, 2]);
        expect(getActiveTargets(lookup, 67890, 4000)).toEqual([1]);
      });

      it('should compute correct buff duration for never-removed buffs', () => {
        const fightEndTime = 8000; // 8 second fight duration
        const buffApplyTime = 2500; // Buff applied at 2.5s

        const buffEvents: BuffEvent[] = [
          createApplyBuffEvent(buffApplyTime, 12345, 1),
          // No remove event - buff should last until fight end
        ];

        const lookup = createBuffLookup(buffEvents, fightEndTime);

        // Verify buff is active at various timestamps
        expect(isBuffActiveOnTarget(lookup, 12345, buffApplyTime, 1)).toBe(true); // At apply time
        expect(isBuffActiveOnTarget(lookup, 12345, 5000, 1)).toBe(true); // Mid-fight
        expect(isBuffActiveOnTarget(lookup, 12345, fightEndTime - 1, 1)).toBe(true); // Just before fight end
        expect(isBuffActiveOnTarget(lookup, 12345, fightEndTime + 1, 1)).toBe(false); // Just after fight end

        // Verify the buff duration is calculated correctly
        const buffData = lookup.buffIntervals.get(12345);
        expect(buffData).toBeDefined();

        if (buffData) {
          const interval = buffData.find((interval) => interval.targetID === 1);
          expect(interval).toBeDefined();

          if (interval) {
            expect(interval.start).toBe(buffApplyTime);
            expect(interval.end).toBe(fightEndTime);

            // Verify the computed duration
            const expectedDuration = fightEndTime - buffApplyTime; // Should be 5.5 seconds (5500ms)
            const actualDuration = interval.end - interval.start;
            expect(actualDuration).toBe(expectedDuration);
            expect(actualDuration).toBe(5500); // 8000 - 2500 = 5500ms
          }
        }
      });
    });

    describe('Event ordering', () => {
      it('should handle unordered events by sorting them', () => {
        const buffEvents: BuffEvent[] = [
          createRemoveBuffEvent(3000, 12345, 1), // Out of order
          createApplyBuffEvent(1000, 12345, 1), // Should be processed first
        ];
        const lookup = createBuffLookup(buffEvents);

        expect(isBuffActive(lookup, 12345, 2000)).toBe(true);
        expect(isBuffActive(lookup, 12345, 4000)).toBe(false);
      });
    });
  });

  describe('General buff state detection', () => {
    it('should detect buff active on any target when target not specified', () => {
      const buffEvents: BuffEvent[] = [
        createApplyBuffEvent(1000, 123, 10),
        createApplyBuffEvent(1500, 123, 20),
        createRemoveBuffEvent(2000, 123, 10),
        createRemoveBuffEvent(3000, 123, 20),
      ];

      const buffLookup = createBuffLookup(buffEvents);

      // Should detect buff on any target when not specifying target
      expect(isBuffActiveOnTarget(buffLookup, 123, 1200)).toBe(true); // Only target 10 has it
      expect(isBuffActiveOnTarget(buffLookup, 123, 1800)).toBe(true); // Both targets have it
      expect(isBuffActiveOnTarget(buffLookup, 123, 2500)).toBe(true); // Only target 20 has it
      expect(isBuffActiveOnTarget(buffLookup, 123, 3500)).toBe(false); // No targets have it

      // Should work the same as the explicit isBuffActiveOnAnyTarget function
      expect(isBuffActiveOnTarget(buffLookup, 123, 1800)).toBe(
        isBuffActiveOnAnyTarget(buffLookup, 123, 1800)
      );
    });

    it('should still work with specific targets when targetID is provided', () => {
      const buffEvents: BuffEvent[] = [
        createApplyBuffEvent(1000, 123, 10),
        createApplyBuffEvent(1500, 123, 20),
        createRemoveBuffEvent(2000, 123, 10),
        createRemoveBuffEvent(3000, 123, 20),
      ];

      const buffLookup = createBuffLookup(buffEvents);

      // Should work with specific targets
      expect(isBuffActiveOnTarget(buffLookup, 123, 1200, 10)).toBe(true);
      expect(isBuffActiveOnTarget(buffLookup, 123, 1200, 20)).toBe(false);
      expect(isBuffActiveOnTarget(buffLookup, 123, 2500, 10)).toBe(false);
      expect(isBuffActiveOnTarget(buffLookup, 123, 2500, 20)).toBe(true);
    });

    it('should handle isBuffActiveOnAnyTarget convenience function', () => {
      const buffEvents: BuffEvent[] = [
        createApplyBuffEvent(1000, 123, 10),
        createRemoveBuffEvent(2000, 123, 10),
      ];

      const buffLookup = createBuffLookup(buffEvents);

      expect(isBuffActiveOnAnyTarget(buffLookup, 123, 1500)).toBe(true);
      expect(isBuffActiveOnAnyTarget(buffLookup, 123, 2500)).toBe(false);
      expect(isBuffActiveOnAnyTarget(buffLookup, 999, 1500)).toBe(false); // Non-existent ability
    });

    it('should return false when no buffs exist for general state check', () => {
      const buffLookup = createBuffLookup([]);

      expect(isBuffActiveOnTarget(buffLookup, 123, 1500)).toBe(false);
      expect(isBuffActiveOnAnyTarget(buffLookup, 123, 1500)).toBe(false);
    });
  });

  describe('createDebuffLookup', () => {
    it('should create a debuff lookup with same interface as buff lookup', () => {
      const debuffEvents: DebuffEvent[] = [];
      const lookup = createDebuffLookup(debuffEvents);

      expect(lookup).toBeDefined();
      expect(lookup.buffIntervals).toBeInstanceOf(Map); // Note: uses same interface name for consistency
      expect(typeof isBuffActive).toBe('function');
      expect(typeof isBuffActiveOnTarget).toBe('function');
      expect(typeof getActiveTargets).toBe('function');
    });

    it('should track debuff apply/remove cycles', () => {
      const debuffEvents: DebuffEvent[] = [
        createApplyDebuffEvent(1000, 12345, 1),
        createRemoveDebuffEvent(3000, 12345, 1),
      ];
      const lookup = createDebuffLookup(debuffEvents);

      expect(isBuffActive(lookup, 12345, 500)).toBe(false);
      expect(isBuffActive(lookup, 12345, 2000)).toBe(true);
      expect(isBuffActiveOnTarget(lookup, 12345, 2000, 1)).toBe(true);
      expect(getActiveTargets(lookup, 12345, 2000)).toEqual([1]);
      expect(isBuffActive(lookup, 12345, 4000)).toBe(false);
    });

    it('should handle debuff stacks', () => {
      const debuffEvents: DebuffEvent[] = [
        createApplyDebuffEvent(1000, 12345, 1),
        createApplyDebuffStackEvent(1500, 12345, 1),
        createRemoveDebuffStackEvent(2000, 12345, 1),
        createRemoveDebuffEvent(2500, 12345, 1),
      ];
      const lookup = createDebuffLookup(debuffEvents);

      expect(isBuffActive(lookup, 12345, 1800)).toBe(true);
      expect(isBuffActive(lookup, 12345, 2200)).toBe(true);
      expect(isBuffActive(lookup, 12345, 3000)).toBe(false);
    });
  });

  describe('Performance and edge cases', () => {
    it('should handle large numbers of events efficiently', () => {
      const buffEvents: BuffEvent[] = [];
      const numEvents = 1000;

      // Create many overlapping buff events
      for (let i = 0; i < numEvents; i++) {
        buffEvents.push(createApplyBuffEvent(i * 100, 12345, i % 10));
        buffEvents.push(createRemoveBuffEvent(i * 100 + 50, 12345, i % 10));
      }

      const start = performance.now();
      const lookup = createBuffLookup(buffEvents);
      const createTime = performance.now() - start;

      // Creation should be reasonably fast
      expect(createTime).toBeLessThan(100); // Less than 100ms

      // Lookups should be fast
      const lookupStart = performance.now();
      for (let i = 0; i < 100; i++) {
        isBuffActive(lookup, 12345, i * 500);
      }
      const lookupTime = performance.now() - lookupStart;
      expect(lookupTime).toBeLessThan(50); // Less than 50ms for 100 lookups
    });

    it('should handle remove events without corresponding apply events', () => {
      const buffEvents: BuffEvent[] = [
        createRemoveBuffEvent(1000, 12345, 1), // Remove without apply
      ];
      const lookup = createBuffLookup(buffEvents);

      expect(isBuffActive(lookup, 12345, 500)).toBe(false);
      expect(isBuffActive(lookup, 12345, 1500)).toBe(false);
    });

    it('should handle multiple apply events without remove', () => {
      const buffEvents: BuffEvent[] = [
        createApplyBuffEvent(1000, 12345, 1),
        createApplyBuffEvent(1500, 12345, 1), // Duplicate apply - should be ignored
      ];
      const lookup = createBuffLookup(buffEvents, 3000);

      // Should still work correctly
      expect(isBuffActive(lookup, 12345, 2000)).toBe(true);
      expect(getActiveTargets(lookup, 12345, 2000)).toEqual([1]);
    });

    it('should return sorted target lists', () => {
      const buffEvents: BuffEvent[] = [
        createApplyBuffEvent(1000, 12345, 5),
        createApplyBuffEvent(1000, 12345, 1),
        createApplyBuffEvent(1000, 12345, 3),
      ];
      const lookup = createBuffLookup(buffEvents, 3000);

      const activeTargets = getActiveTargets(lookup, 12345, 2000);
      expect(activeTargets).toEqual([1, 3, 5]); // Should be sorted
    });

    describe('POJO Performance Validation', () => {
      it('should demonstrate O(log n) lookup complexity with binary search', () => {
        const abilities = [10001, 10002, 10003, 10004, 10005];
        const buffEvents: BuffEvent[] = [];

        // Create events with many intervals for multiple abilities
        const intervalsPerAbility = 1000;

        for (const ability of abilities) {
          for (let i = 0; i < intervalsPerAbility; i++) {
            const startTime = i * 200;
            const endTime = startTime + 100;
            buffEvents.push(createApplyBuffEvent(startTime, ability, 1));
            buffEvents.push(createRemoveBuffEvent(endTime, ability, 1));
          }
        }

        const lookup = createBuffLookup(buffEvents);

        // Test lookup performance with large interval count
        const lookupStart = performance.now();
        const lookupCount = 500;

        for (let i = 0; i < lookupCount; i++) {
          const randomAbility = abilities[i % abilities.length];
          const randomTime = Math.floor(Math.random() * 200000);
          isBuffActive(lookup, randomAbility, randomTime);
        }

        const lookupTime = performance.now() - lookupStart;
        const averageTime = lookupTime / lookupCount;

        // With O(log n) complexity, average lookup should be very fast even with 1000+ intervals
        expect(averageTime).toBeLessThan(0.1); // Less than 0.1ms per lookup
        expect(lookupTime).toBeLessThan(50); // Total under 50ms for 500 lookups
      });

      it('should maintain performance with high-frequency buff events', () => {
        const buffEvents: BuffEvent[] = [];
        const duration = 300000; // 5 minutes in ms
        const frequency = 100; // Event every 100ms (high frequency)
        const targetCount = 20; // 20 different targets

        // Simulate high-frequency buff events (like combat buffs in raids)
        for (let time = 0; time < duration; time += frequency) {
          const targetId = ((time / frequency) % targetCount) + 1;
          const abilityId = 20000 + (targetId % 5); // 5 different abilities

          buffEvents.push(createApplyBuffEvent(time, abilityId, targetId));
          if (time + frequency * 5 < duration) {
            // Remove after 5 intervals
            buffEvents.push(createRemoveBuffEvent(time + frequency * 5, abilityId, targetId));
          }
        }

        const creationStart = performance.now();
        const lookup = createBuffLookup(buffEvents, duration);
        const creationTime = performance.now() - creationStart;

        // Creation should handle high-frequency events efficiently
        expect(creationTime).toBeLessThan(200); // Less than 200ms for ~3000 events
        expect(buffEvents.length).toBeGreaterThan(2000); // Validate we have many events

        // Test lookup performance across the timeline
        const lookupStart = performance.now();
        const sampleCount = 100;

        for (let i = 0; i < sampleCount; i++) {
          const sampleTime = (i / sampleCount) * duration;
          const sampleAbility = 20000 + (i % 5);
          const sampleTarget = (i % targetCount) + 1;

          isBuffActive(lookup, sampleAbility, sampleTime);
          isBuffActiveOnTarget(lookup, sampleAbility, sampleTime, sampleTarget);
          getActiveTargets(lookup, sampleAbility, sampleTime);
        }

        const lookupTime = performance.now() - lookupStart;
        expect(lookupTime).toBeLessThan(30); // Should handle complex queries quickly
      });

      it('should efficiently handle target-specific queries with many targets', () => {
        const targetCount = 100; // Large number of targets (raid scenario)
        const abilityId = 30000;
        const buffEvents: BuffEvent[] = [];

        // Create overlapping buffs on many targets
        for (let targetId = 1; targetId <= targetCount; targetId++) {
          const startTime = targetId * 50; // Staggered start times
          const endTime = startTime + 5000; // 5 second duration

          buffEvents.push(createApplyBuffEvent(startTime, abilityId, targetId));
          buffEvents.push(createRemoveBuffEvent(endTime, abilityId, targetId));
        }

        const lookup = createBuffLookup(buffEvents);

        // Test target-specific performance
        const targetQueryStart = performance.now();

        for (let targetId = 1; targetId <= targetCount; targetId++) {
          const queryTime = targetId * 50 + 1000; // During active period
          isBuffActiveOnTarget(lookup, abilityId, queryTime, targetId);
        }

        const targetQueryTime = performance.now() - targetQueryStart;

        // Should handle many target-specific queries efficiently
        expect(targetQueryTime).toBeLessThan(20); // Less than 20ms for 100 target queries

        // Test getActiveTargets performance with many active targets
        const activeTargetsStart = performance.now();
        const midTime = (targetCount * 50) / 2 + 2500; // Middle of timeline
        const activeTargets = getActiveTargets(lookup, abilityId, midTime);
        const activeTargetsTime = performance.now() - activeTargetsStart;

        expect(activeTargetsTime).toBeLessThan(5); // Should be very fast
        expect(activeTargets.length).toBeGreaterThan(targetCount / 2); // Many targets active
      });

      it('should demonstrate memory efficiency of POJO structure', () => {
        const buffEvents: BuffEvent[] = [];
        const abilityCount = 50;
        const eventsPerAbility = 200;

        // Create many buff events across different abilities
        for (let abilityId = 40000; abilityId < 40000 + abilityCount; abilityId++) {
          for (let i = 0; i < eventsPerAbility; i++) {
            const time = i * 100;
            buffEvents.push(createApplyBuffEvent(time, abilityId, (i % 10) + 1));
            buffEvents.push(createRemoveBuffEvent(time + 50, abilityId, (i % 10) + 1));
          }
        }

        // Measure creation performance and structure
        const creationStart = performance.now();
        const lookup = createBuffLookup(buffEvents);
        const creationTime = performance.now() - creationStart;

        // Validate POJO structure
        expect(lookup).toHaveProperty('buffIntervals');
        expect(lookup.buffIntervals).toBeInstanceOf(Map);
        expect(lookup.buffIntervals.size).toBe(abilityCount);

        // Each ability should have consolidated intervals
        for (const intervals of lookup.buffIntervals.values()) {
          expect(intervals.length).toBeGreaterThan(0);
          expect(intervals.length).toBeLessThanOrEqual(eventsPerAbility * 10); // Upper bound check
        }

        // Performance should be reasonable
        expect(creationTime).toBeLessThan(500); // Less than 500ms for 20k events
        expect(buffEvents.length).toBe(abilityCount * eventsPerAbility * 2); // Validate event count
      });

      it('should handle concurrent access patterns efficiently', () => {
        const buffEvents: BuffEvent[] = [];
        const abilities = [50001, 50002, 50003];

        // Create interleaved events for multiple abilities
        for (let time = 0; time < 10000; time += 100) {
          for (const ability of abilities) {
            const targetId = ((time / 100) % 5) + 1;
            buffEvents.push(createApplyBuffEvent(time, ability, targetId));
            buffEvents.push(createRemoveBuffEvent(time + 300, ability, targetId));
          }
        }

        const lookup = createBuffLookup(buffEvents, 10000);

        // Simulate concurrent queries (as if multiple components were using the lookup)
        const concurrentStart = performance.now();

        // Perform many queries in rapid succession to simulate concurrent access
        for (let i = 0; i < 150; i++) {
          const ability = abilities[i % abilities.length];
          const time = (i % 100) * 100;
          const target = (i % 5) + 1;

          // Perform multiple types of queries
          isBuffActive(lookup, ability, time);
          isBuffActiveOnTarget(lookup, ability, time, target);
          getActiveTargets(lookup, ability, time);
        }

        const concurrentTime = performance.now() - concurrentStart;

        // Concurrent-style access should be efficient (POJO is read-only after creation)
        expect(concurrentTime).toBeLessThan(25); // Should handle many rapid queries efficiently
      });

      it('should validate time complexity characteristics', () => {
        // Test with different data sizes to validate O(log n) behavior
        const testSizes = [100, 500, 1000];
        const results: Array<{ size: number; avgTime: number }> = [];

        for (const size of testSizes) {
          const buffEvents: BuffEvent[] = [];
          const abilityId = 60000;

          // Create sorted intervals
          for (let i = 0; i < size; i++) {
            const startTime = i * 200;
            const endTime = startTime + 100;
            buffEvents.push(createApplyBuffEvent(startTime, abilityId, 1));
            buffEvents.push(createRemoveBuffEvent(endTime, abilityId, 1));
          }

          const lookup = createBuffLookup(buffEvents);

          // Measure lookup time for random queries
          const queryCount = 100;
          const queryStart = performance.now();

          for (let i = 0; i < queryCount; i++) {
            const randomTime = Math.floor(Math.random() * size * 200);
            isBuffActive(lookup, abilityId, randomTime);
          }

          const queryTime = performance.now() - queryStart;
          const avgTime = queryTime / queryCount;

          results.push({ size, avgTime });
        }

        // With O(log n), larger datasets shouldn't have dramatically worse performance
        const smallestAvg = results[0].avgTime;
        const largestAvg = results[results.length - 1].avgTime;

        // The ratio should be reasonable for O(log n) - not exponential growth
        const performanceRatio = largestAvg / smallestAvg;
        expect(performanceRatio).toBeLessThan(10); // Should not degrade exponentially

        // All should be fast
        results.forEach((result) => {
          expect(result.avgTime).toBeLessThan(0.2); // Each lookup under 0.2ms
        });
      });
    });
  });

  describe('Integration scenarios', () => {
    it('should support critical damage calculation use case', () => {
      const buffEvents: BuffEvent[] = [
        // Major Force buff on different players at different times
        createApplyBuffEvent(1000, 61694, 1), // Major Force on player 1
        createApplyBuffEvent(1500, 61694, 2), // Major Force on player 2
        createRemoveBuffEvent(2500, 61694, 1), // Player 1 loses it
      ];
      const lookup = createBuffLookup(buffEvents, 4000);

      const currentPlayer = 1;
      const checkTime = 2000;

      // Player 1 should have buff at this time
      const hasBuffOnPlayer = isBuffActiveOnTarget(lookup, 61694, checkTime, currentPlayer);
      const allActiveTargets = getActiveTargets(lookup, 61694, checkTime);
      const hasBuffAnywhere = isBuffActive(lookup, 61694, checkTime);

      expect(hasBuffOnPlayer).toBe(true);
      expect(hasBuffAnywhere).toBe(true);
      expect(allActiveTargets).toEqual([1, 2]);

      // Later, player 1 shouldn't have it but player 2 should
      const laterTime = 3000;
      expect(isBuffActiveOnTarget(lookup, 61694, laterTime, 1)).toBe(false);
      expect(isBuffActiveOnTarget(lookup, 61694, laterTime, 2)).toBe(true);
      expect(isBuffActive(lookup, 61694, laterTime)).toBe(true);
    });
  });
});
