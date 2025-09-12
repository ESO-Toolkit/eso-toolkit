import {
  calculateTouchOfZenStackEnhancement,
  formatTouchOfZenStackInfo,
  type TouchOfZenStackInfo,
} from './touchOfZenStacksUtils';
import { KnownAbilities } from '../types/abilities';
import { DamageEvent } from '../types/combatlogEvents';
import { BuffLookupData } from './BuffLookupUtils';

// Mock KnownAbilities
jest.mock('../types/abilities', () => ({
  KnownAbilities: {
    TOUCH_OF_ZEN: 123456,
  },
}));

describe('touchOfZenStacksUtils', () => {
  // Create minimal mock objects with type assertions to avoid complex type issues
  const createMockDamageEvent = (overrides: Partial<DamageEvent> = {}): DamageEvent =>
    ({
      targetID: 1,
      sourceID: 100,
      abilityGameID: 1001,
      timestamp: 10000,
      tick: true,
      ...overrides,
    }) as DamageEvent;

  const createMockBuffInterval = (overrides = {}) => ({
    start: 10000,
    end: 20000,
    targetID: 1,
    sourceID: 100,
    duration: 10000,
    ...overrides,
  });

  const createMockBuffLookupData = (intervals: any[] = []): BuffLookupData => ({
    buffIntervals: {
      [KnownAbilities.TOUCH_OF_ZEN.toString()]: intervals,
    },
  });

  describe('calculateTouchOfZenStackEnhancement', () => {
    it("should return empty result when no Touch of Z'en intervals exist", () => {
      const debuffsLookup = createMockBuffLookupData([]);
      const damageEvents: DamageEvent[] = [];
      const result = calculateTouchOfZenStackEnhancement(debuffsLookup, damageEvents, 0, 30000);

      expect(result).toEqual({
        stackInfoByTarget: new Map(),
        averageStacks: 0,
        maxStacks: 0,
        totalStackTime: 0,
      });
    });

    it('should calculate stacks for single target with one DOT source', () => {
      const debuffsLookup = createMockBuffLookupData([
        createMockBuffInterval({
          start: 10000,
          end: 14000,
          targetID: 1,
        }),
      ]);

      const damageEvents: DamageEvent[] = [
        createMockDamageEvent({
          timestamp: 10500,
          abilityGameID: 1001,
          sourceID: 100,
          targetID: 1,
        }),
        createMockDamageEvent({
          timestamp: 11500,
          abilityGameID: 1001,
          sourceID: 100,
          targetID: 1,
        }),
        createMockDamageEvent({
          timestamp: 12500,
          abilityGameID: 1001,
          sourceID: 100,
          targetID: 1,
        }),
        createMockDamageEvent({
          timestamp: 13500,
          abilityGameID: 1001,
          sourceID: 100,
          targetID: 1,
        }),
      ];

      const result = calculateTouchOfZenStackEnhancement(debuffsLookup, damageEvents, 9000, 15000);

      expect(result.stackInfoByTarget.size).toBe(1);
      expect(result.maxStacks).toBe(1);
      expect(result.averageStacks).toBe(1);
      expect(result.totalStackTime).toBeGreaterThan(0);

      const targetStacks = result.stackInfoByTarget.get(1);
      expect(targetStacks).toBeDefined();
      expect(targetStacks?.length).toBeGreaterThan(0);
      expect(targetStacks?.[0].targetId).toBe(1);
      expect(targetStacks?.[0].stacks).toBeGreaterThan(0);
    });

    it('should calculate stacks for multiple DOT sources', () => {
      const debuffsLookup = createMockBuffLookupData([
        createMockBuffInterval({
          start: 10000,
          end: 16000,
          targetID: 1,
        }),
      ]);

      const damageEvents: DamageEvent[] = [
        createMockDamageEvent({
          timestamp: 10500,
          abilityGameID: 1001,
          sourceID: 100,
          targetID: 1,
        }),
        createMockDamageEvent({
          timestamp: 10500,
          abilityGameID: 1002,
          sourceID: 100,
          targetID: 1,
        }),
        createMockDamageEvent({
          timestamp: 10500,
          abilityGameID: 1003,
          sourceID: 100,
          targetID: 1,
        }),
        createMockDamageEvent({
          timestamp: 12500,
          abilityGameID: 1001,
          sourceID: 100,
          targetID: 1,
        }),
        createMockDamageEvent({
          timestamp: 12500,
          abilityGameID: 1002,
          sourceID: 100,
          targetID: 1,
        }),
        createMockDamageEvent({
          timestamp: 12500,
          abilityGameID: 1003,
          sourceID: 100,
          targetID: 1,
        }),
      ];

      const result = calculateTouchOfZenStackEnhancement(debuffsLookup, damageEvents, 9000, 17000);

      expect(result.maxStacks).toBe(3);
      expect(result.averageStacks).toBeGreaterThan(2);
    });

    it('should cap stacks at 5 maximum', () => {
      const debuffsLookup = createMockBuffLookupData([
        createMockBuffInterval({
          start: 10000,
          end: 16000,
          targetID: 1,
        }),
      ]);

      const damageEvents: DamageEvent[] = [
        // 7 different DOT abilities (should be capped at 5)
        createMockDamageEvent({
          timestamp: 10500,
          abilityGameID: 1001,
          sourceID: 100,
          targetID: 1,
        }),
        createMockDamageEvent({
          timestamp: 10500,
          abilityGameID: 1002,
          sourceID: 100,
          targetID: 1,
        }),
        createMockDamageEvent({
          timestamp: 10500,
          abilityGameID: 1003,
          sourceID: 100,
          targetID: 1,
        }),
        createMockDamageEvent({
          timestamp: 10500,
          abilityGameID: 1004,
          sourceID: 100,
          targetID: 1,
        }),
        createMockDamageEvent({
          timestamp: 10500,
          abilityGameID: 1005,
          sourceID: 100,
          targetID: 1,
        }),
        createMockDamageEvent({
          timestamp: 10500,
          abilityGameID: 1006,
          sourceID: 100,
          targetID: 1,
        }),
        createMockDamageEvent({
          timestamp: 10500,
          abilityGameID: 1007,
          sourceID: 100,
          targetID: 1,
        }),
        createMockDamageEvent({
          timestamp: 12500,
          abilityGameID: 1001,
          sourceID: 100,
          targetID: 1,
        }),
        createMockDamageEvent({
          timestamp: 12500,
          abilityGameID: 1002,
          sourceID: 100,
          targetID: 1,
        }),
        createMockDamageEvent({
          timestamp: 12500,
          abilityGameID: 1003,
          sourceID: 100,
          targetID: 1,
        }),
        createMockDamageEvent({
          timestamp: 12500,
          abilityGameID: 1004,
          sourceID: 100,
          targetID: 1,
        }),
        createMockDamageEvent({
          timestamp: 12500,
          abilityGameID: 1005,
          sourceID: 100,
          targetID: 1,
        }),
        createMockDamageEvent({
          timestamp: 12500,
          abilityGameID: 1006,
          sourceID: 100,
          targetID: 1,
        }),
        createMockDamageEvent({
          timestamp: 12500,
          abilityGameID: 1007,
          sourceID: 100,
          targetID: 1,
        }),
      ];

      const result = calculateTouchOfZenStackEnhancement(debuffsLookup, damageEvents, 9000, 17000);

      expect(result.maxStacks).toBe(5); // Should be capped at 5
    });

    it('should handle multiple targets', () => {
      const debuffsLookup = createMockBuffLookupData([
        createMockBuffInterval({
          start: 10000,
          end: 16000,
          targetID: 1,
        }),
        createMockBuffInterval({
          start: 11000,
          end: 17000,
          targetID: 2,
        }),
      ]);

      const damageEvents: DamageEvent[] = [
        createMockDamageEvent({
          timestamp: 10500,
          abilityGameID: 1001,
          sourceID: 100,
          targetID: 1,
        }),
        createMockDamageEvent({
          timestamp: 10500,
          abilityGameID: 1002,
          sourceID: 100,
          targetID: 1,
        }),
        createMockDamageEvent({
          timestamp: 11500,
          abilityGameID: 1003,
          sourceID: 100,
          targetID: 2,
        }),
        createMockDamageEvent({
          timestamp: 11500,
          abilityGameID: 1004,
          sourceID: 100,
          targetID: 2,
        }),
        createMockDamageEvent({
          timestamp: 11500,
          abilityGameID: 1005,
          sourceID: 100,
          targetID: 2,
        }),
      ];

      const result = calculateTouchOfZenStackEnhancement(debuffsLookup, damageEvents, 9000, 18000);

      expect(result.stackInfoByTarget.size).toBe(2);
      expect(result.stackInfoByTarget.has(1)).toBe(true);
      expect(result.stackInfoByTarget.has(2)).toBe(true);
      expect(result.maxStacks).toBe(3); // Target 2 has 3 stacks
    });

    it('should filter out non-DOT damage events', () => {
      const debuffsLookup = createMockBuffLookupData([
        createMockBuffInterval({
          start: 10000,
          end: 16000,
          targetID: 1,
        }),
      ]);

      const damageEvents: DamageEvent[] = [
        // Non-DOT events (tick = false) should be ignored
        createMockDamageEvent({
          timestamp: 10500,
          abilityGameID: 1001,
          sourceID: 100,
          targetID: 1,
          tick: false,
        }),
        createMockDamageEvent({
          timestamp: 10500,
          abilityGameID: 1002,
          sourceID: 100,
          targetID: 1,
          tick: false,
        }),
        // Only one DOT event
        createMockDamageEvent({
          timestamp: 10500,
          abilityGameID: 1003,
          sourceID: 100,
          targetID: 1,
          tick: true,
        }),
      ];

      const result = calculateTouchOfZenStackEnhancement(debuffsLookup, damageEvents, 9000, 17000);

      expect(result.maxStacks).toBe(1); // Only 1 DOT should be counted
    });

    it('should handle events outside fight time window', () => {
      const debuffsLookup = createMockBuffLookupData([
        createMockBuffInterval({
          start: 10000,
          end: 16000,
          targetID: 1,
        }),
      ]);

      const damageEvents: DamageEvent[] = [
        // Event before fight start (should be ignored)
        createMockDamageEvent({ timestamp: 8000, abilityGameID: 1001, sourceID: 100, targetID: 1 }),
        // Event after fight end (should be ignored)
        createMockDamageEvent({
          timestamp: 20000,
          abilityGameID: 1002,
          sourceID: 100,
          targetID: 1,
        }),
        // Event within fight window
        createMockDamageEvent({
          timestamp: 12000,
          abilityGameID: 1003,
          sourceID: 100,
          targetID: 1,
        }),
      ];

      const result = calculateTouchOfZenStackEnhancement(debuffsLookup, damageEvents, 10000, 15000);

      expect(result.maxStacks).toBe(1); // Only the event within window should count
    });

    it('should handle multiple sources for same target', () => {
      const debuffsLookup = createMockBuffLookupData([
        createMockBuffInterval({
          start: 10000,
          end: 16000,
          targetID: 1,
        }),
      ]);

      const damageEvents: DamageEvent[] = [
        // DOTs from different sources
        createMockDamageEvent({
          timestamp: 10500,
          abilityGameID: 1001,
          sourceID: 100,
          targetID: 1,
        }),
        createMockDamageEvent({
          timestamp: 10500,
          abilityGameID: 1002,
          sourceID: 100,
          targetID: 1,
        }),
        createMockDamageEvent({
          timestamp: 10500,
          abilityGameID: 1003,
          sourceID: 200,
          targetID: 1,
        }),
        createMockDamageEvent({
          timestamp: 10500,
          abilityGameID: 1004,
          sourceID: 200,
          targetID: 1,
        }),
        createMockDamageEvent({
          timestamp: 10500,
          abilityGameID: 1005,
          sourceID: 200,
          targetID: 1,
        }),
      ];

      const result = calculateTouchOfZenStackEnhancement(debuffsLookup, damageEvents, 9000, 17000);

      // Should take the maximum stacks from any source (sourceID 200 has 3 stacks)
      expect(result.maxStacks).toBe(3);
    });

    it('should handle null/undefined sourceID gracefully', () => {
      const debuffsLookup = createMockBuffLookupData([
        createMockBuffInterval({
          start: 10000,
          end: 16000,
          targetID: 1,
        }),
      ]);

      const damageEvents: DamageEvent[] = [
        // Events with null/undefined sourceID should be ignored
        createMockDamageEvent({
          timestamp: 10500,
          abilityGameID: 1001,
          sourceID: null as any,
          targetID: 1,
        }),
        createMockDamageEvent({
          timestamp: 10500,
          abilityGameID: 1002,
          sourceID: undefined as any,
          targetID: 1,
        }),
        // Valid event
        createMockDamageEvent({
          timestamp: 10500,
          abilityGameID: 1003,
          sourceID: 100,
          targetID: 1,
        }),
      ];

      const result = calculateTouchOfZenStackEnhancement(debuffsLookup, damageEvents, 9000, 17000);

      expect(result.maxStacks).toBe(1); // Only valid event should count
    });

    it('should handle empty damage events array', () => {
      const debuffsLookup = createMockBuffLookupData([createMockBuffInterval()]);

      const result = calculateTouchOfZenStackEnhancement(debuffsLookup, [], 0, 30000);

      expect(result.maxStacks).toBe(0);
      expect(result.averageStacks).toBe(0);
    });

    it('should handle intervals with no matching damage events', () => {
      const debuffsLookup = createMockBuffLookupData([
        createMockBuffInterval({
          targetID: 999, // No damage events for this target
        }),
      ]);

      const damageEvents: DamageEvent[] = [
        createMockDamageEvent({ targetID: 1 }), // Different target
      ];

      const result = calculateTouchOfZenStackEnhancement(debuffsLookup, damageEvents, 0, 30000);

      expect(result.maxStacks).toBe(0);
      expect(result.averageStacks).toBe(0);
    });

    it('should handle very short intervals', () => {
      const debuffsLookup = createMockBuffLookupData([
        createMockBuffInterval({
          start: 10000,
          end: 10500, // Very short 0.5 second interval
          targetID: 1,
        }),
      ]);

      const damageEvents: DamageEvent[] = [
        createMockDamageEvent({
          timestamp: 10250,
          abilityGameID: 1001,
          sourceID: 100,
          targetID: 1,
        }),
      ];

      const result = calculateTouchOfZenStackEnhancement(debuffsLookup, damageEvents, 9000, 11000);

      // Should still have one sample at the start time
      expect(result.stackInfoByTarget.get(1)?.length).toBe(1);
    });

    it('should handle malformed buff intervals', () => {
      const debuffsLookup = createMockBuffLookupData([
        // Missing required properties
        {} as any,
      ]);

      const damageEvents: DamageEvent[] = [createMockDamageEvent()];

      expect(() => {
        calculateTouchOfZenStackEnhancement(debuffsLookup, damageEvents, 0, 30000);
      }).not.toThrow();
    });
  });

  describe('formatTouchOfZenStackInfo', () => {
    it('should return empty string when maxStacks is 0', () => {
      const stackInfo = {
        stackInfoByTarget: new Map(),
        averageStacks: 0,
        maxStacks: 0,
        totalStackTime: 0,
      };

      const result = formatTouchOfZenStackInfo(stackInfo);

      expect(result).toBe('');
    });

    it('should format stack information correctly', () => {
      const stackInfo = {
        stackInfoByTarget: new Map(),
        averageStacks: 2.7,
        maxStacks: 4,
        totalStackTime: 1000,
      };

      const result = formatTouchOfZenStackInfo(stackInfo);

      expect(result).toBe(' (Avg: 2.7 stacks, Max: 4 stacks)');
    });

    it('should format with proper decimal places', () => {
      const stackInfo = {
        stackInfoByTarget: new Map(),
        averageStacks: 3.14159,
        maxStacks: 5,
        totalStackTime: 2000,
      };

      const result = formatTouchOfZenStackInfo(stackInfo);

      expect(result).toBe(' (Avg: 3.1 stacks, Max: 5 stacks)');
    });

    it('should handle whole number averages', () => {
      const stackInfo = {
        stackInfoByTarget: new Map(),
        averageStacks: 3.0,
        maxStacks: 3,
        totalStackTime: 1500,
      };

      const result = formatTouchOfZenStackInfo(stackInfo);

      expect(result).toBe(' (Avg: 3.0 stacks, Max: 3 stacks)');
    });

    it('should handle single stack scenarios', () => {
      const stackInfo = {
        stackInfoByTarget: new Map(),
        averageStacks: 1.0,
        maxStacks: 1,
        totalStackTime: 500,
      };

      const result = formatTouchOfZenStackInfo(stackInfo);

      expect(result).toBe(' (Avg: 1.0 stacks, Max: 1 stacks)');
    });
  });
});
