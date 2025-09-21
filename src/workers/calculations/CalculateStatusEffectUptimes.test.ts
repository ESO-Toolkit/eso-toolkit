import { calculateStatusEffectUptimes } from './CalculateStatusEffectUptimes';
import { KnownAbilities } from '../../types/abilities';

describe('CalculateStatusEffectUptimes', () => {
  const FIGHT_START = 10000;
  const FIGHT_END = 30000;
  const FIGHT_DURATION = FIGHT_END - FIGHT_START; // 20 seconds
  const TARGET_ID_1 = 200;
  const TARGET_ID_2 = 201;

  const createMockBuffLookupData = (
    intervals: Record<
      string,
      Array<{ start: number; end: number; targetID: number; sourceID?: number }>
    >,
  ) => ({
    buffIntervals: Object.fromEntries(
      Object.entries(intervals).map(([key, intervals]) => [
        key,
        intervals.map((interval) => ({
          ...interval,
          sourceID: interval.sourceID ?? 1, // Default sourceID if not provided
        })),
      ]),
    ),
  });

  describe('calculateStatusEffectUptimes', () => {
    it('should return empty results when no status effects are present', () => {
      const result = calculateStatusEffectUptimes({
        debuffsLookup: createMockBuffLookupData({}),
        hostileBuffsLookup: createMockBuffLookupData({}),
        fightStartTime: FIGHT_START,
        fightEndTime: FIGHT_END,
      });

      expect(result).toEqual([]);
    });

    it('should return empty results when fight times are not provided', () => {
      const result = calculateStatusEffectUptimes({
        debuffsLookup: createMockBuffLookupData({
          [KnownAbilities.BURNING.toString()]: [
            { start: FIGHT_START + 1000, end: FIGHT_START + 6000, targetID: TARGET_ID_1 },
          ],
        }),
        hostileBuffsLookup: createMockBuffLookupData({}),
      });

      expect(result).toEqual([]);
    });

    describe('Target Segmentation', () => {
      it('should segment data by target for single target debuff', () => {
        const debuffsLookup = createMockBuffLookupData({
          [KnownAbilities.BURNING.toString()]: [
            { start: FIGHT_START + 1000, end: FIGHT_START + 6000, targetID: TARGET_ID_1 },
          ],
        });

        const result = calculateStatusEffectUptimes({
          debuffsLookup,
          hostileBuffsLookup: createMockBuffLookupData({}),
          fightStartTime: FIGHT_START,
          fightEndTime: FIGHT_END,
        });

        expect(result).toHaveLength(1);
        const burningResult = result[0];

        expect(burningResult.abilityGameID).toBe(KnownAbilities.BURNING.toString());
        expect(burningResult.isDebuff).toBe(true);
        expect(burningResult.hostilityType).toBe(1);
        expect(burningResult.uniqueKey).toBe(`${KnownAbilities.BURNING}-status-effect`);

        // Check target segmentation
        expect(Object.keys(burningResult.targetData)).toHaveLength(1);
        expect(burningResult.targetData[TARGET_ID_1]).toBeDefined();

        const targetData = burningResult.targetData[TARGET_ID_1];
        expect(targetData.totalDuration).toBe(5000); // 5 seconds
        expect(targetData.uptime).toBe(5); // Converted to seconds
        expect(targetData.uptimePercentage).toBeCloseTo(25, 1); // 5/20 * 100 = 25%
        expect(targetData.applications).toBe(1);
      });

      it('should segment data by target for multiple targets with same debuff', () => {
        const debuffsLookup = createMockBuffLookupData({
          [KnownAbilities.BURNING.toString()]: [
            { start: FIGHT_START + 1000, end: FIGHT_START + 6000, targetID: TARGET_ID_1 },
            { start: FIGHT_START + 3000, end: FIGHT_START + 10000, targetID: TARGET_ID_2 },
          ],
        });

        const result = calculateStatusEffectUptimes({
          debuffsLookup,
          hostileBuffsLookup: createMockBuffLookupData({}),
          fightStartTime: FIGHT_START,
          fightEndTime: FIGHT_END,
        });

        expect(result).toHaveLength(1);
        const burningResult = result[0];

        // Check that both targets are segmented correctly
        expect(Object.keys(burningResult.targetData)).toHaveLength(2);
        expect(burningResult.targetData[TARGET_ID_1]).toBeDefined();
        expect(burningResult.targetData[TARGET_ID_2]).toBeDefined();

        // Target 1: 5 seconds (1000-6000ms)
        const target1Data = burningResult.targetData[TARGET_ID_1];
        expect(target1Data.totalDuration).toBe(5000);
        expect(target1Data.uptime).toBe(5);
        expect(target1Data.uptimePercentage).toBeCloseTo(25, 1);
        expect(target1Data.applications).toBe(1);

        // Target 2: 7 seconds (3000-10000ms)
        const target2Data = burningResult.targetData[TARGET_ID_2];
        expect(target2Data.totalDuration).toBe(7000);
        expect(target2Data.uptime).toBe(7);
        expect(target2Data.uptimePercentage).toBeCloseTo(35, 1);
        expect(target2Data.applications).toBe(1);
      });

      it('should handle multiple applications on same target', () => {
        const debuffsLookup = createMockBuffLookupData({
          [KnownAbilities.POISONED.toString()]: [
            { start: FIGHT_START + 2000, end: FIGHT_START + 5000, targetID: TARGET_ID_1 },
            { start: FIGHT_START + 8000, end: FIGHT_START + 12000, targetID: TARGET_ID_1 },
            { start: FIGHT_START + 15000, end: FIGHT_START + 18000, targetID: TARGET_ID_1 },
          ],
        });

        const result = calculateStatusEffectUptimes({
          debuffsLookup,
          hostileBuffsLookup: createMockBuffLookupData({}),
          fightStartTime: FIGHT_START,
          fightEndTime: FIGHT_END,
        });

        expect(result).toHaveLength(1);
        const poisonedResult = result[0];

        expect(Object.keys(poisonedResult.targetData)).toHaveLength(1);
        const targetData = poisonedResult.targetData[TARGET_ID_1];

        // Total: 3s + 4s + 3s = 10 seconds
        expect(targetData.totalDuration).toBe(10000);
        expect(targetData.uptime).toBe(10);
        expect(targetData.uptimePercentage).toBeCloseTo(50, 1); // 10/20 * 100 = 50%
        expect(targetData.applications).toBe(3);
      });

      it('should segment buff data by target correctly', () => {
        const hostileBuffsLookup = createMockBuffLookupData({
          [KnownAbilities.OVERCHARGED.toString()]: [
            { start: FIGHT_START + 2000, end: FIGHT_START + 8000, targetID: TARGET_ID_1 },
            { start: FIGHT_START + 5000, end: FIGHT_START + 12000, targetID: TARGET_ID_2 },
          ],
        });

        const result = calculateStatusEffectUptimes({
          debuffsLookup: createMockBuffLookupData({}),
          hostileBuffsLookup,
          fightStartTime: FIGHT_START,
          fightEndTime: FIGHT_END,
        });

        expect(result).toHaveLength(1);
        const overchargedResult = result[0];

        expect(overchargedResult.isDebuff).toBe(false);
        expect(Object.keys(overchargedResult.targetData)).toHaveLength(2);

        // Target 1: 6 seconds (2000-8000ms)
        const target1Data = overchargedResult.targetData[TARGET_ID_1];
        expect(target1Data.totalDuration).toBe(6000);
        expect(target1Data.uptime).toBe(6);
        expect(target1Data.uptimePercentage).toBeCloseTo(30, 1);

        // Target 2: 7 seconds (5000-12000ms)
        const target2Data = overchargedResult.targetData[TARGET_ID_2];
        expect(target2Data.totalDuration).toBe(7000);
        expect(target2Data.uptime).toBe(7);
        expect(target2Data.uptimePercentage).toBeCloseTo(35, 1);
      });

      it('should handle mixed targets across multiple status effects', () => {
        const debuffsLookup = createMockBuffLookupData({
          [KnownAbilities.BURNING.toString()]: [
            { start: FIGHT_START + 1000, end: FIGHT_START + 5000, targetID: TARGET_ID_1 },
            { start: FIGHT_START + 3000, end: FIGHT_START + 8000, targetID: TARGET_ID_2 },
          ],
          [KnownAbilities.POISONED.toString()]: [
            { start: FIGHT_START + 2000, end: FIGHT_START + 6000, targetID: TARGET_ID_1 },
            // Only target 1 gets poisoned
          ],
        });

        const hostileBuffsLookup = createMockBuffLookupData({
          [KnownAbilities.SUNDERED.toString()]: [
            { start: FIGHT_START + 4000, end: FIGHT_START + 9000, targetID: TARGET_ID_2 },
            // Only target 2 gets sundered
          ],
        });

        const result = calculateStatusEffectUptimes({
          debuffsLookup,
          hostileBuffsLookup,
          fightStartTime: FIGHT_START,
          fightEndTime: FIGHT_END,
        });

        expect(result).toHaveLength(3);

        const burningResult = result.find(
          (r) => r.abilityGameID === KnownAbilities.BURNING.toString(),
        );
        const poisonedResult = result.find(
          (r) => r.abilityGameID === KnownAbilities.POISONED.toString(),
        );
        const sunderedResult = result.find(
          (r) => r.abilityGameID === KnownAbilities.SUNDERED.toString(),
        );

        // Burning affects both targets
        expect(Object.keys(burningResult!.targetData)).toHaveLength(2);
        expect(burningResult!.targetData[TARGET_ID_1]).toBeDefined();
        expect(burningResult!.targetData[TARGET_ID_2]).toBeDefined();

        // Poisoned affects only target 1
        expect(Object.keys(poisonedResult!.targetData)).toHaveLength(1);
        expect(poisonedResult!.targetData[TARGET_ID_1]).toBeDefined();
        expect(poisonedResult!.targetData[TARGET_ID_2]).toBeUndefined();

        // Sundered affects only target 2
        expect(Object.keys(sunderedResult!.targetData)).toHaveLength(1);
        expect(sunderedResult!.targetData[TARGET_ID_1]).toBeUndefined();
        expect(sunderedResult!.targetData[TARGET_ID_2]).toBeDefined();
      });
    });

    describe('Edge Cases', () => {
      it('should handle intervals extending beyond fight bounds', () => {
        const debuffsLookup = createMockBuffLookupData({
          [KnownAbilities.BURNING.toString()]: [
            // Starts before fight, ends after fight
            { start: FIGHT_START - 2000, end: FIGHT_END + 3000, targetID: TARGET_ID_1 },
            // Entirely before fight (should be ignored)
            { start: FIGHT_START - 5000, end: FIGHT_START - 1000, targetID: TARGET_ID_1 },
            // Entirely after fight (should be ignored)
            { start: FIGHT_END + 1000, end: FIGHT_END + 5000, targetID: TARGET_ID_1 },
            // Normal interval within fight
            { start: FIGHT_START + 5000, end: FIGHT_START + 10000, targetID: TARGET_ID_2 },
          ],
        });

        const result = calculateStatusEffectUptimes({
          debuffsLookup,
          hostileBuffsLookup: createMockBuffLookupData({}),
          fightStartTime: FIGHT_START,
          fightEndTime: FIGHT_END,
        });

        expect(result).toHaveLength(1);
        const burningResult = result[0];

        expect(Object.keys(burningResult.targetData)).toHaveLength(2);

        // Target 1: Clipped to fight duration (20 seconds)
        const target1Data = burningResult.targetData[TARGET_ID_1];
        expect(target1Data.totalDuration).toBe(FIGHT_DURATION);
        expect(target1Data.uptime).toBe(20);
        expect(target1Data.uptimePercentage).toBeCloseTo(100, 1);
        expect(target1Data.applications).toBe(1); // Only the valid interval counts

        // Target 2: Normal 5-second interval
        const target2Data = burningResult.targetData[TARGET_ID_2];
        expect(target2Data.totalDuration).toBe(5000);
        expect(target2Data.uptime).toBe(5);
        expect(target2Data.uptimePercentage).toBeCloseTo(25, 1);
        expect(target2Data.applications).toBe(1);
      });

      it('should ignore abilities not in the status effect lists', () => {
        const debuffsLookup = createMockBuffLookupData({
          [KnownAbilities.BURNING.toString()]: [
            { start: FIGHT_START + 1000, end: FIGHT_START + 6000, targetID: TARGET_ID_1 },
          ],
          '999999': [
            // Random non-status effect ability
            { start: FIGHT_START + 2000, end: FIGHT_START + 8000, targetID: TARGET_ID_1 },
          ],
        });

        const hostileBuffsLookup = createMockBuffLookupData({
          [KnownAbilities.OVERCHARGED.toString()]: [
            { start: FIGHT_START + 3000, end: FIGHT_START + 9000, targetID: TARGET_ID_1 },
          ],
          '888888': [
            // Random non-status effect ability
            { start: FIGHT_START + 4000, end: FIGHT_START + 10000, targetID: TARGET_ID_1 },
          ],
        });

        const result = calculateStatusEffectUptimes({
          debuffsLookup,
          hostileBuffsLookup,
          fightStartTime: FIGHT_START,
          fightEndTime: FIGHT_END,
        });

        expect(result).toHaveLength(2); // Only burning and overcharged

        const abilityIds = result.map((r) => r.abilityGameID);
        expect(abilityIds).toContain(KnownAbilities.BURNING.toString());
        expect(abilityIds).toContain(KnownAbilities.OVERCHARGED.toString());
        expect(abilityIds).not.toContain('999999');
        expect(abilityIds).not.toContain('888888');
      });

      it('should handle empty intervals gracefully', () => {
        const debuffsLookup = createMockBuffLookupData({
          [KnownAbilities.BURNING.toString()]: [], // Empty intervals array
        });

        const result = calculateStatusEffectUptimes({
          debuffsLookup,
          hostileBuffsLookup: createMockBuffLookupData({}),
          fightStartTime: FIGHT_START,
          fightEndTime: FIGHT_END,
        });

        expect(result).toEqual([]);
      });

      it('should handle zero-duration intervals', () => {
        const debuffsLookup = createMockBuffLookupData({
          [KnownAbilities.BURNING.toString()]: [
            { start: FIGHT_START + 5000, end: FIGHT_START + 5000, targetID: TARGET_ID_1 }, // Zero duration
            { start: FIGHT_START + 1000, end: FIGHT_START + 6000, targetID: TARGET_ID_1 }, // Valid interval
          ],
        });

        const result = calculateStatusEffectUptimes({
          debuffsLookup,
          hostileBuffsLookup: createMockBuffLookupData({}),
          fightStartTime: FIGHT_START,
          fightEndTime: FIGHT_END,
        });

        expect(result).toHaveLength(1);
        const burningResult = result[0];

        const targetData = burningResult.targetData[TARGET_ID_1];
        expect(targetData.totalDuration).toBe(5000); // Only the valid interval
        expect(targetData.applications).toBe(1); // Zero-duration interval should be ignored
      });
    });

    describe('Result Sorting and Structure', () => {
      it('should sort results by number of affected targets (descending)', () => {
        const debuffsLookup = createMockBuffLookupData({
          [KnownAbilities.BURNING.toString()]: [
            { start: FIGHT_START + 1000, end: FIGHT_START + 6000, targetID: TARGET_ID_1 },
            // Only affects 1 target
          ],
          [KnownAbilities.POISONED.toString()]: [
            { start: FIGHT_START + 2000, end: FIGHT_START + 7000, targetID: TARGET_ID_1 },
            { start: FIGHT_START + 3000, end: FIGHT_START + 8000, targetID: TARGET_ID_2 },
            { start: FIGHT_START + 4000, end: FIGHT_START + 9000, targetID: 202 },
            // Affects 3 targets
          ],
          [KnownAbilities.HEMMORRHAGING.toString()]: [
            { start: FIGHT_START + 5000, end: FIGHT_START + 10000, targetID: TARGET_ID_1 },
            { start: FIGHT_START + 6000, end: FIGHT_START + 11000, targetID: TARGET_ID_2 },
            // Affects 2 targets
          ],
        });

        const result = calculateStatusEffectUptimes({
          debuffsLookup,
          hostileBuffsLookup: createMockBuffLookupData({}),
          fightStartTime: FIGHT_START,
          fightEndTime: FIGHT_END,
        });

        expect(result).toHaveLength(3);

        // Should be sorted by target count: Poisoned (3) > Hemorrhaging (2) > Burning (1)
        expect(result[0].abilityGameID).toBe(KnownAbilities.POISONED.toString());
        expect(Object.keys(result[0].targetData)).toHaveLength(3);

        expect(result[1].abilityGameID).toBe(KnownAbilities.HEMMORRHAGING.toString());
        expect(Object.keys(result[1].targetData)).toHaveLength(2);

        expect(result[2].abilityGameID).toBe(KnownAbilities.BURNING.toString());
        expect(Object.keys(result[2].targetData)).toHaveLength(1);
      });

      it('should set correct unique keys and metadata', () => {
        const debuffsLookup = createMockBuffLookupData({
          [KnownAbilities.BURNING.toString()]: [
            { start: FIGHT_START + 1000, end: FIGHT_START + 6000, targetID: TARGET_ID_1 },
          ],
        });

        const hostileBuffsLookup = createMockBuffLookupData({
          [KnownAbilities.OVERCHARGED.toString()]: [
            { start: FIGHT_START + 2000, end: FIGHT_START + 7000, targetID: TARGET_ID_1 },
          ],
        });

        const result = calculateStatusEffectUptimes({
          debuffsLookup,
          hostileBuffsLookup,
          fightStartTime: FIGHT_START,
          fightEndTime: FIGHT_END,
        });

        expect(result).toHaveLength(2);

        const burningResult = result.find(
          (r) => r.abilityGameID === KnownAbilities.BURNING.toString(),
        );
        const overchargedResult = result.find(
          (r) => r.abilityGameID === KnownAbilities.OVERCHARGED.toString(),
        );

        // Check debuff properties
        expect(burningResult!.isDebuff).toBe(true);
        expect(burningResult!.hostilityType).toBe(1);
        expect(burningResult!.uniqueKey).toBe(`${KnownAbilities.BURNING}-status-effect`);
        expect(burningResult!.abilityName).toContain('Ability'); // Generic name for now

        // Check buff properties
        expect(overchargedResult!.isDebuff).toBe(false);
        expect(overchargedResult!.hostilityType).toBe(1);
        expect(overchargedResult!.uniqueKey).toBe(`${KnownAbilities.OVERCHARGED}-status-effect`);
        expect(overchargedResult!.abilityName).toContain('Ability'); // Generic name for now
      });
    });

    describe('Progress Callbacks', () => {
      it('should call progress callback at appropriate intervals', () => {
        const onProgress = jest.fn();
        const debuffsLookup = createMockBuffLookupData({
          [KnownAbilities.BURNING.toString()]: [
            { start: FIGHT_START + 1000, end: FIGHT_START + 6000, targetID: TARGET_ID_1 },
          ],
        });

        const hostileBuffsLookup = createMockBuffLookupData({
          [KnownAbilities.OVERCHARGED.toString()]: [
            { start: FIGHT_START + 2000, end: FIGHT_START + 7000, targetID: TARGET_ID_1 },
          ],
        });

        calculateStatusEffectUptimes(
          {
            debuffsLookup,
            hostileBuffsLookup,
            fightStartTime: FIGHT_START,
            fightEndTime: FIGHT_END,
          },
          onProgress,
        );

        expect(onProgress).toHaveBeenCalledWith(0); // Start of debuff calculations
        expect(onProgress).toHaveBeenCalledWith(0.5); // Start of buff calculations
        expect(onProgress).toHaveBeenCalledWith(0.9); // Final sorting
        expect(onProgress).toHaveBeenCalledWith(1); // Complete
        expect(onProgress).toHaveBeenCalledTimes(4);
      });

      it('should work without progress callback', () => {
        const debuffsLookup = createMockBuffLookupData({
          [KnownAbilities.BURNING.toString()]: [
            { start: FIGHT_START + 1000, end: FIGHT_START + 6000, targetID: TARGET_ID_1 },
          ],
        });

        expect(() => {
          calculateStatusEffectUptimes({
            debuffsLookup,
            hostileBuffsLookup: createMockBuffLookupData({}),
            fightStartTime: FIGHT_START,
            fightEndTime: FIGHT_END,
          });
        }).not.toThrow();
      });
    });
  });
});
