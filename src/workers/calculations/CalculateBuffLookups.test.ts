import { calculateBuffLookup } from './CalculateBuffLookups';
import { KnownAbilities } from '../../types/abilities';
import {
  createMockBuffEvent,
  createMockDebuffEvent,
  createMockRemoveBuffEvent,
  createMockRemoveDebuffEvent,
} from '../../test/utils/combatLogMockFactories';

describe('CalculateBuffLookups', () => {
  const FIGHT_START = 10000;
  const FIGHT_END = 30000;
  const PLAYER_ID = 100;
  const TARGET_ID = 200;

  describe('calculateBuffLookup', () => {
    it('should return empty result when no buff events provided', () => {
      const result = calculateBuffLookup({
        buffEvents: [],
        fightEndTime: FIGHT_END,
      });

      expect(result.buffIntervals).toEqual({});
    });

    it('should handle single buff application and removal', () => {
      const buffEvents = [
        createMockBuffEvent({
          abilityGameID: KnownAbilities.MINOR_FORCE,
          timestamp: FIGHT_START + 1000,
          targetID: TARGET_ID,
        }),
        createMockRemoveBuffEvent({
          abilityGameID: KnownAbilities.MINOR_FORCE,
          timestamp: FIGHT_START + 5000,
          targetID: TARGET_ID,
        }),
      ];

      const result = calculateBuffLookup({
        buffEvents,
        fightEndTime: FIGHT_END,
      });

      expect(result.buffIntervals[KnownAbilities.MINOR_FORCE.toString()]).toEqual([
        {
          start: FIGHT_START + 1000,
          end: FIGHT_START + 5000,
          targetID: TARGET_ID,
          sourceID: 123,
        },
      ]);
    });

    it('should handle multiple buff applications on same target', () => {
      const buffEvents = [
        // First application
        createMockBuffEvent({
          abilityGameID: KnownAbilities.MINOR_FORCE,
          timestamp: FIGHT_START + 1000,
          targetID: TARGET_ID,
        }),
        createMockRemoveBuffEvent({
          abilityGameID: KnownAbilities.MINOR_FORCE,
          timestamp: FIGHT_START + 3000,
          targetID: TARGET_ID,
        }),
        // Second application
        createMockBuffEvent({
          abilityGameID: KnownAbilities.MINOR_FORCE,
          timestamp: FIGHT_START + 5000,
          targetID: TARGET_ID,
        }),
        createMockRemoveBuffEvent({
          abilityGameID: KnownAbilities.MINOR_FORCE,
          timestamp: FIGHT_START + 8000,
          targetID: TARGET_ID,
        }),
      ];

      const result = calculateBuffLookup({
        buffEvents,
        fightEndTime: FIGHT_END,
      });

      expect(result.buffIntervals[KnownAbilities.MINOR_FORCE.toString()]).toEqual([
        {
          start: FIGHT_START + 1000,
          end: FIGHT_START + 3000,
          targetID: TARGET_ID,
          sourceID: 123,
        },
        {
          start: FIGHT_START + 5000,
          end: FIGHT_START + 8000,
          targetID: TARGET_ID,
          sourceID: 123,
        },
      ]);
    });

    it('should handle buff applications on different targets', () => {
      const TARGET_ID_2 = 300;
      const buffEvents = [
        createMockBuffEvent({
          abilityGameID: KnownAbilities.MINOR_FORCE,
          timestamp: FIGHT_START + 1000,
          targetID: TARGET_ID,
        }),
        createMockBuffEvent({
          abilityGameID: KnownAbilities.MINOR_FORCE,
          timestamp: FIGHT_START + 2000,
          targetID: TARGET_ID_2,
        }),
        createMockRemoveBuffEvent({
          abilityGameID: KnownAbilities.MINOR_FORCE,
          timestamp: FIGHT_START + 5000,
          targetID: TARGET_ID,
        }),
        createMockRemoveBuffEvent({
          abilityGameID: KnownAbilities.MINOR_FORCE,
          timestamp: FIGHT_START + 6000,
          targetID: TARGET_ID_2,
        }),
      ];

      const result = calculateBuffLookup({
        buffEvents,
        fightEndTime: FIGHT_END,
      });

      const intervals = result.buffIntervals[KnownAbilities.MINOR_FORCE.toString()];
      expect(intervals).toHaveLength(2);
      expect(intervals.find((i: any) => i.targetID === TARGET_ID)).toEqual({
        start: FIGHT_START + 1000,
        end: FIGHT_START + 5000,
        targetID: TARGET_ID,
        sourceID: 123,
      });
      expect(intervals.find((i: any) => i.targetID === TARGET_ID_2)).toEqual({
        start: FIGHT_START + 2000,
        end: FIGHT_START + 6000,
        targetID: TARGET_ID_2,
        sourceID: 123,
      });
    });

    it('should handle debuff events', () => {
      const buffEvents = [
        createMockDebuffEvent({
          abilityGameID: KnownAbilities.BURNING,
          timestamp: FIGHT_START + 1000,
          targetID: TARGET_ID,
        }),
        createMockRemoveDebuffEvent({
          abilityGameID: KnownAbilities.BURNING,
          timestamp: FIGHT_START + 5000,
          targetID: TARGET_ID,
        }),
      ];

      const result = calculateBuffLookup({
        buffEvents,
        fightEndTime: FIGHT_END,
      });

      expect(result.buffIntervals[KnownAbilities.BURNING.toString()]).toEqual([
        {
          start: FIGHT_START + 1000,
          end: FIGHT_START + 5000,
          targetID: TARGET_ID,
          sourceID: 123,
        },
      ]);
    });

    it('should handle buff stacks (applybuffstack)', () => {
      const buffEvent = createMockBuffEvent({
        abilityGameID: KnownAbilities.MINOR_FORCE,
        timestamp: FIGHT_START + 1000,
        targetID: TARGET_ID,
      });
      // Modify to be a stack event
      (buffEvent as any).type = 'applybuffstack';

      const buffEvents = [
        buffEvent,
        createMockRemoveBuffEvent({
          abilityGameID: KnownAbilities.MINOR_FORCE,
          timestamp: FIGHT_START + 5000,
          targetID: TARGET_ID,
        }),
      ];

      const result = calculateBuffLookup({
        buffEvents,
        fightEndTime: FIGHT_END,
      });

      expect(result.buffIntervals[KnownAbilities.MINOR_FORCE.toString()]).toEqual([
        {
          start: FIGHT_START + 1000,
          end: FIGHT_START + 5000,
          targetID: TARGET_ID,
          sourceID: 123,
        },
      ]);
    });

    it('should handle active buffs at fight end', () => {
      const buffEvents = [
        createMockBuffEvent({
          abilityGameID: KnownAbilities.MINOR_FORCE,
          timestamp: FIGHT_START + 1000,
          targetID: TARGET_ID,
        }),
        // No removal event - buff stays active until fight end
      ];

      const result = calculateBuffLookup({
        buffEvents,
        fightEndTime: FIGHT_END,
      });

      expect(result.buffIntervals[KnownAbilities.MINOR_FORCE.toString()]).toEqual([
        {
          start: FIGHT_START + 1000,
          end: FIGHT_END,
          targetID: TARGET_ID,
          sourceID: 123,
        },
      ]);
    });

    it('should handle multiple different abilities', () => {
      const buffEvents = [
        createMockBuffEvent({
          abilityGameID: KnownAbilities.MINOR_FORCE,
          timestamp: FIGHT_START + 1000,
          targetID: TARGET_ID,
        }),
        createMockBuffEvent({
          abilityGameID: KnownAbilities.MAJOR_FORCE,
          timestamp: FIGHT_START + 2000,
          targetID: TARGET_ID,
        }),
        createMockRemoveBuffEvent({
          abilityGameID: KnownAbilities.MINOR_FORCE,
          timestamp: FIGHT_START + 5000,
          targetID: TARGET_ID,
        }),
        createMockRemoveBuffEvent({
          abilityGameID: KnownAbilities.MAJOR_FORCE,
          timestamp: FIGHT_START + 6000,
          targetID: TARGET_ID,
        }),
      ];

      const result = calculateBuffLookup({
        buffEvents,
        fightEndTime: FIGHT_END,
      });

      expect(result.buffIntervals[KnownAbilities.MINOR_FORCE.toString()]).toEqual([
        {
          start: FIGHT_START + 1000,
          end: FIGHT_START + 5000,
          targetID: TARGET_ID,
          sourceID: 123,
        },
      ]);

      expect(result.buffIntervals[KnownAbilities.MAJOR_FORCE.toString()]).toEqual([
        {
          start: FIGHT_START + 2000,
          end: FIGHT_START + 6000,
          targetID: TARGET_ID,
          sourceID: 123,
        },
      ]);
    });

    it('should ignore removal without application', () => {
      const buffEvents = [
        createMockRemoveBuffEvent({
          abilityGameID: KnownAbilities.MINOR_FORCE,
          timestamp: FIGHT_START + 5000,
          targetID: TARGET_ID,
        }),
      ];

      const result = calculateBuffLookup({
        buffEvents,
        fightEndTime: FIGHT_END,
      });

      expect(result.buffIntervals).toEqual({});
    });

    it('should handle repeated applications without removal (refresh)', () => {
      const buffEvents = [
        createMockBuffEvent({
          abilityGameID: KnownAbilities.MINOR_FORCE,
          timestamp: FIGHT_START + 1000,
          targetID: TARGET_ID,
        }),
        createMockBuffEvent({
          abilityGameID: KnownAbilities.MINOR_FORCE,
          timestamp: FIGHT_START + 3000,
          targetID: TARGET_ID,
        }),
        createMockRemoveBuffEvent({
          abilityGameID: KnownAbilities.MINOR_FORCE,
          timestamp: FIGHT_START + 8000,
          targetID: TARGET_ID,
        }),
      ];

      const result = calculateBuffLookup({
        buffEvents,
        fightEndTime: FIGHT_END,
      });

      // Should only track from first application to removal
      expect(result.buffIntervals[KnownAbilities.MINOR_FORCE.toString()]).toEqual([
        {
          start: FIGHT_START + 1000,
          end: FIGHT_START + 8000,
          targetID: TARGET_ID,
          sourceID: 123,
        },
      ]);
    });

    it('should sort intervals by start time', () => {
      const buffEvents = [
        // Apply first buff
        createMockBuffEvent({
          abilityGameID: KnownAbilities.MINOR_FORCE,
          timestamp: FIGHT_START + 5000,
          targetID: TARGET_ID,
        }),
        // Apply second buff earlier
        createMockBuffEvent({
          abilityGameID: KnownAbilities.MINOR_FORCE,
          timestamp: FIGHT_START + 1000,
          targetID: TARGET_ID + 1,
        }),
        // Remove first buff
        createMockRemoveBuffEvent({
          abilityGameID: KnownAbilities.MINOR_FORCE,
          timestamp: FIGHT_START + 8000,
          targetID: TARGET_ID,
        }),
        // Remove second buff
        createMockRemoveBuffEvent({
          abilityGameID: KnownAbilities.MINOR_FORCE,
          timestamp: FIGHT_START + 3000,
          targetID: TARGET_ID + 1,
        }),
      ];

      const result = calculateBuffLookup({
        buffEvents,
        fightEndTime: FIGHT_END,
      });

      const intervals = result.buffIntervals[KnownAbilities.MINOR_FORCE.toString()];
      expect(intervals).toHaveLength(2);

      // Should be sorted by start time
      expect(intervals[0].start).toBeLessThan(intervals[1].start);
      expect(intervals[0]).toEqual({
        start: FIGHT_START + 1000,
        end: FIGHT_START + 3000,
        targetID: TARGET_ID + 1,
        sourceID: 123,
      });
      expect(intervals[1]).toEqual({
        start: FIGHT_START + 5000,
        end: FIGHT_START + 8000,
        targetID: TARGET_ID,
        sourceID: 123,
      });
    });

    it('should handle unsorted event order', () => {
      const buffEvents = [
        // Events out of chronological order
        createMockRemoveBuffEvent({
          abilityGameID: KnownAbilities.MINOR_FORCE,
          timestamp: FIGHT_START + 5000,
          targetID: TARGET_ID,
        }),
        createMockBuffEvent({
          abilityGameID: KnownAbilities.MINOR_FORCE,
          timestamp: FIGHT_START + 1000,
          targetID: TARGET_ID,
        }),
      ];

      const result = calculateBuffLookup({
        buffEvents,
        fightEndTime: FIGHT_END,
      });

      expect(result.buffIntervals[KnownAbilities.MINOR_FORCE.toString()]).toEqual([
        {
          start: FIGHT_START + 1000,
          end: FIGHT_START + 5000,
          targetID: TARGET_ID,
          sourceID: 123,
        },
      ]);
    });

    it('should call progress callback if provided', () => {
      const onProgress = jest.fn();
      const buffEvents = [
        createMockBuffEvent({
          abilityGameID: KnownAbilities.MINOR_FORCE,
          timestamp: FIGHT_START + 1000,
          targetID: TARGET_ID,
        }),
      ];

      calculateBuffLookup(
        {
          buffEvents,
          fightEndTime: FIGHT_END,
        },
        onProgress,
      );

      expect(onProgress).toHaveBeenCalledWith(0);
      expect(onProgress).toHaveBeenCalledWith(1);
    });

    it('should handle large number of events for progress reporting', () => {
      const onProgress = jest.fn();
      const buffEvents = [];

      // Create 2500 events to trigger progress reporting
      for (let i = 0; i < 2500; i++) {
        buffEvents.push(
          createMockBuffEvent({
            abilityGameID: KnownAbilities.MINOR_FORCE,
            timestamp: FIGHT_START + i,
            targetID: TARGET_ID + (i % 10), // Vary target IDs
          }),
        );
      }

      calculateBuffLookup(
        {
          buffEvents,
          fightEndTime: FIGHT_END,
        },
        onProgress,
      );

      // Should have been called for start and completion
      expect(onProgress).toHaveBeenCalledWith(0); // Initial progress
      expect(onProgress).toHaveBeenCalledWith(1); // Final progress
    });
  });
});
