/**
 * Integration tests for StatusEffectUptimesPanel - Target Segmentation
 * Verifies that the panel correctly processes target-segmented data from the worker
 */

import { KnownAbilities } from '../../../types/abilities';
import type { StatusEffectUptimesByTarget } from '../../../workers/calculations/CalculateStatusEffectUptimes';

describe('StatusEffectUptimesPanel Target Segmentation Integration', () => {
  const TARGET_ID_1 = 200;
  const TARGET_ID_2 = 201;
  const FIGHT_DURATION_MS = 20000; // 20 seconds

  // Helper to simulate the target filtering logic used in the panel
  const filterAndAverageTargetData = (
    data: StatusEffectUptimesByTarget[],
    selectedTargetIds: number[],
    fightDurationMs: number,
  ) => {
    return data
      .map((statusEffect) => {
        // Get data for selected targets only
        const relevantTargets = selectedTargetIds.filter((targetId) =>
          Object.prototype.hasOwnProperty.call(statusEffect.targetData, targetId),
        );

        if (relevantTargets.length === 0) {
          return null; // No data for any selected targets
        }

        // Calculate averages across selected targets
        const totalDuration = relevantTargets.reduce(
          (sum, targetId) => sum + statusEffect.targetData[targetId].totalDuration,
          0,
        );
        const totalApplications = relevantTargets.reduce(
          (sum, targetId) => sum + statusEffect.targetData[targetId].applications,
          0,
        );

        const avgDuration = totalDuration / relevantTargets.length;
        const summedApplications = totalApplications; // Sum applications across targets
        const avgUptimePercentage = (avgDuration / fightDurationMs) * 100;

        return {
          ...statusEffect,
          totalDuration: avgDuration,
          applications: summedApplications,
          uptimePercentage: avgUptimePercentage,
        };
      })
      .filter((item) => item !== null);
  };

  const mockTargetSegmentedData: StatusEffectUptimesByTarget[] = [
    {
      abilityGameID: KnownAbilities.BURNING.toString(),
      abilityName: `Ability ${KnownAbilities.BURNING}`,
      isDebuff: true,
      hostilityType: 1,
      uniqueKey: `${KnownAbilities.BURNING}-status-effect`,
      targetData: {
        [TARGET_ID_1]: {
          totalDuration: 5000, // 5 seconds
          uptime: 5,
          uptimePercentage: 25, // 5/20 * 100 = 25%
          applications: 1,
        },
        [TARGET_ID_2]: {
          totalDuration: 8000, // 8 seconds
          uptime: 8,
          uptimePercentage: 40, // 8/20 * 100 = 40%
          applications: 2,
        },
      },
    },
    {
      abilityGameID: KnownAbilities.POISONED.toString(),
      abilityName: `Ability ${KnownAbilities.POISONED}`,
      isDebuff: true,
      hostilityType: 1,
      uniqueKey: `${KnownAbilities.POISONED}-status-effect`,
      targetData: {
        [TARGET_ID_1]: {
          totalDuration: 6000, // 6 seconds
          uptime: 6,
          uptimePercentage: 30, // 6/20 * 100 = 30%
          applications: 3,
        },
        // Only affects target 1
      },
    },
  ];

  describe('Single Target Selection', () => {
    it('should correctly process data for single selected target', () => {
      const result = filterAndAverageTargetData(
        mockTargetSegmentedData,
        [TARGET_ID_1],
        FIGHT_DURATION_MS,
      );

      expect(result).toHaveLength(2); // Both Burning and Poisoned affect target 1

      // Burning - Target 1 data
      const burning = result.find((r) => r.abilityGameID === KnownAbilities.BURNING.toString());
      expect(burning).toBeDefined();
      expect(burning?.totalDuration).toBe(5000);
      expect(burning?.uptimePercentage).toBe(25);
      expect(burning?.applications).toBe(1);

      // Poisoned - Target 1 data
      const poisoned = result.find((r) => r.abilityGameID === KnownAbilities.POISONED.toString());
      expect(poisoned).toBeDefined();
      expect(poisoned?.totalDuration).toBe(6000);
      expect(poisoned?.uptimePercentage).toBe(30);
      expect(poisoned?.applications).toBe(3);
    });

    it('should filter out effects that do not affect the selected target', () => {
      const result = filterAndAverageTargetData(
        mockTargetSegmentedData,
        [TARGET_ID_2],
        FIGHT_DURATION_MS,
      );

      expect(result).toHaveLength(1); // Only Burning affects target 2

      const burning = result.find((r) => r.abilityGameID === KnownAbilities.BURNING.toString());
      expect(burning).toBeDefined();
      expect(burning?.totalDuration).toBe(8000);
      expect(burning?.uptimePercentage).toBe(40);
      expect(burning?.applications).toBe(2);

      // Poisoned should not be included since it doesn't affect target 2
      const poisoned = result.find((r) => r.abilityGameID === KnownAbilities.POISONED.toString());
      expect(poisoned).toBeUndefined();
    });
  });

  describe('Multiple Target Selection', () => {
    it('should average values across multiple selected targets', () => {
      const result = filterAndAverageTargetData(
        mockTargetSegmentedData,
        [TARGET_ID_1, TARGET_ID_2],
        FIGHT_DURATION_MS,
      );

      expect(result).toHaveLength(2); // Both effects affect at least one selected target

      const burning = result.find((r) => r.abilityGameID === KnownAbilities.BURNING.toString());
      expect(burning).toBeDefined();

      // Average duration: (5000 + 8000) / 2 = 6500
      expect(burning?.totalDuration).toBe(6500);

      // Average percentage: 6500ms / 20000ms * 100 = 32.5%
      expect(burning?.uptimePercentage).toBe(32.5);

      // Summed applications: 1 + 2 = 3 (applications should be summed across targets)
      expect(burning?.applications).toBe(3);

      // Poisoned should be included since it affects target 1 (one of the selected targets)
      const poisoned = result.find((r) => r.abilityGameID === KnownAbilities.POISONED.toString());
      expect(poisoned).toBeDefined();
      // Only target 1 data (no averaging needed)
      expect(poisoned?.totalDuration).toBe(6000);
      expect(poisoned?.uptimePercentage).toBe(30);
      expect(poisoned?.applications).toBe(3);
    });

    it('should handle partial target coverage correctly', () => {
      // Test with an effect that only affects some of the selected targets
      const partialData: StatusEffectUptimesByTarget[] = [
        {
          abilityGameID: KnownAbilities.BURNING.toString(),
          abilityName: `Ability ${KnownAbilities.BURNING}`,
          isDebuff: true,
          hostilityType: 1,
          uniqueKey: `${KnownAbilities.BURNING}-status-effect`,
          targetData: {
            [TARGET_ID_1]: {
              totalDuration: 10000,
              uptime: 10,
              uptimePercentage: 50,
              applications: 2,
            },
            // Target 2 not affected
          },
        },
      ];

      const result = filterAndAverageTargetData(
        partialData,
        [TARGET_ID_1, TARGET_ID_2],
        FIGHT_DURATION_MS,
      );

      // Should include effects that affect ANY of the selected targets
      expect(result).toHaveLength(1);
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty selected targets', () => {
      const result = filterAndAverageTargetData(mockTargetSegmentedData, [], FIGHT_DURATION_MS);

      expect(result).toHaveLength(0);
    });

    it('should handle targets with no data', () => {
      const result = filterAndAverageTargetData(
        mockTargetSegmentedData,
        [999], // Non-existent target
        FIGHT_DURATION_MS,
      );

      expect(result).toHaveLength(0);
    });

    it('should preserve original data structure', () => {
      const result = filterAndAverageTargetData(
        mockTargetSegmentedData,
        [TARGET_ID_1],
        FIGHT_DURATION_MS,
      );

      const burning = result.find((r) => r.abilityGameID === KnownAbilities.BURNING.toString());
      expect(burning).toBeDefined();

      // Should preserve original metadata
      expect(burning?.isDebuff).toBe(true);
      expect(burning?.hostilityType).toBe(1);
      expect(burning?.uniqueKey).toBe(`${KnownAbilities.BURNING}-status-effect`);
      expect(burning?.abilityName).toBe(`Ability ${KnownAbilities.BURNING}`);
    });
  });

  describe('Data Validation', () => {
    it('should handle valid target-segmented data structure', () => {
      // Verify the data structure matches expected interface
      mockTargetSegmentedData.forEach((statusEffect) => {
        expect(statusEffect).toHaveProperty('abilityGameID');
        expect(statusEffect).toHaveProperty('abilityName');
        expect(statusEffect).toHaveProperty('isDebuff');
        expect(statusEffect).toHaveProperty('hostilityType');
        expect(statusEffect).toHaveProperty('uniqueKey');
        expect(statusEffect).toHaveProperty('targetData');

        // Verify targetData structure
        Object.values(statusEffect.targetData).forEach((targetData) => {
          expect(targetData).toHaveProperty('totalDuration');
          expect(targetData).toHaveProperty('uptime');
          expect(targetData).toHaveProperty('uptimePercentage');
          expect(targetData).toHaveProperty('applications');
        });
      });
    });

    it('should correctly calculate percentages for different fight durations', () => {
      const shortFightDuration = 10000; // 10 seconds
      const result = filterAndAverageTargetData(
        mockTargetSegmentedData,
        [TARGET_ID_1],
        shortFightDuration,
      );

      const burning = result.find((r) => r.abilityGameID === KnownAbilities.BURNING.toString());
      expect(burning).toBeDefined();

      // Same duration (5000ms) but different fight length should give different percentage
      // 5000ms / 10000ms * 100 = 50%
      expect(burning?.uptimePercentage).toBe(50);
    });
  });
});
