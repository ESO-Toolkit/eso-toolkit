/**
 * Integration tests for StatusEffectUptimesPanel
 * These tests verify that the panel correctly uses the computeBuffUptimes utility function
 */

import { KnownAbilities } from '../../../types/abilities';
import { computeBuffUptimes } from '../../../utils/buffUptimeCalculator';

// Note: This is primarily testing the integration of the utility function
// Full component integration tests would require complex mock setup
describe('StatusEffectUptimesPanel Integration with computeBuffUptimes', () => {
  const FIGHT_START = 1000;
  const FIGHT_END = 11000;
  const FIGHT_DURATION = FIGHT_END - FIGHT_START; // 10 seconds

  const mockAbilitiesById = {
    [KnownAbilities.BURNING]: { name: 'Burning', icon: 'burning.png' },
    [KnownAbilities.POISONED]: { name: 'Poisoned', icon: 'poisoned.png' },
    [KnownAbilities.OVERCHARGED]: { name: 'Overcharged', icon: 'overcharged.png' },
  };

  it('should correctly calculate debuff uptimes using the utility function', () => {
    // Mock debuffs lookup similar to what the component would receive
    const debuffsLookup = {
      buffIntervals: new Map([
        [KnownAbilities.BURNING, [{ start: 1000, end: 6000, targetID: 111 }]], // 5 seconds = 50%
        [KnownAbilities.POISONED, [{ start: 2000, end: 5000, targetID: 111 }]], // 3 seconds = 30%
      ]),
    };

    const STATUS_EFFECT_DEBUFF_ABILITIES = new Set([
      KnownAbilities.BURNING,
      KnownAbilities.POISONED,
      KnownAbilities.HEMMORRHAGING,
    ]);

    const result = computeBuffUptimes(debuffsLookup, {
      abilityIds: STATUS_EFFECT_DEBUFF_ABILITIES,
      targetIds: new Set([111]),
      fightStartTime: FIGHT_START,
      fightEndTime: FIGHT_END,
      fightDuration: FIGHT_DURATION,
      abilitiesById: mockAbilitiesById,
      isDebuff: true,
      hostilityType: 0,
    });

    // Should return debuffs sorted by uptime percentage (highest first)
    expect(result).toHaveLength(2);

    // Burning: 50% uptime
    expect(result[0].abilityGameID).toBe(String(KnownAbilities.BURNING));
    expect(result[0].abilityName).toBe('Burning');
    expect(result[0].uptimePercentage).toBe(50);
    expect(result[0].isDebuff).toBe(true);
    expect(result[0].hostilityType).toBe(0);

    // Poisoned: 30% uptime
    expect(result[1].abilityGameID).toBe(String(KnownAbilities.POISONED));
    expect(result[1].abilityName).toBe('Poisoned');
    expect(result[1].uptimePercentage).toBe(30);
    expect(result[1].isDebuff).toBe(true);
    expect(result[1].hostilityType).toBe(0);
  });

  it('should correctly calculate buff uptimes using the utility function', () => {
    // Mock friendly buffs lookup similar to what the component would receive
    const friendlyBuffsLookup = {
      buffIntervals: new Map([
        [KnownAbilities.OVERCHARGED, [{ start: 1500, end: 8500, targetID: 111 }]], // 7 seconds = 70%
      ]),
    };

    const STATUS_EFFECT_BUFF_ABILITIES = new Set([
      KnownAbilities.OVERCHARGED,
      KnownAbilities.SUNDERED,
      KnownAbilities.CONCUSSION,
      KnownAbilities.CHILL,
      KnownAbilities.DISEASED,
    ]);

    const result = computeBuffUptimes(friendlyBuffsLookup, {
      abilityIds: STATUS_EFFECT_BUFF_ABILITIES,
      targetIds: new Set([111]),
      fightStartTime: FIGHT_START,
      fightEndTime: FIGHT_END,
      fightDuration: FIGHT_DURATION,
      abilitiesById: mockAbilitiesById,
      isDebuff: false,
      hostilityType: 1,
    });

    expect(result).toHaveLength(1);

    // Overcharged: 70% uptime
    expect(result[0].abilityGameID).toBe(String(KnownAbilities.OVERCHARGED));
    expect(result[0].abilityName).toBe('Overcharged');
    expect(result[0].uptimePercentage).toBe(70);
    expect(result[0].isDebuff).toBe(false);
    expect(result[0].hostilityType).toBe(1);
  });

  it('should handle combined buff and debuff results sorting correctly', () => {
    const debuffsLookup = {
      buffIntervals: new Map([
        [KnownAbilities.BURNING, [{ start: 1000, end: 4000, targetID: 111 }]], // 3 seconds = 30%
      ]),
    };

    const friendlyBuffsLookup = {
      buffIntervals: new Map([
        [KnownAbilities.OVERCHARGED, [{ start: 1500, end: 6500, targetID: 111 }]], // 5 seconds = 50%
      ]),
    };

    const debuffResults = computeBuffUptimes(debuffsLookup, {
      abilityIds: new Set([KnownAbilities.BURNING]),
      targetIds: new Set([111]),
      fightStartTime: FIGHT_START,
      fightEndTime: FIGHT_END,
      fightDuration: FIGHT_DURATION,
      abilitiesById: mockAbilitiesById,
      isDebuff: true,
      hostilityType: 0,
    });

    const buffResults = computeBuffUptimes(friendlyBuffsLookup, {
      abilityIds: new Set([KnownAbilities.OVERCHARGED]),
      targetIds: new Set([111]),
      fightStartTime: FIGHT_START,
      fightEndTime: FIGHT_END,
      fightDuration: FIGHT_DURATION,
      abilitiesById: mockAbilitiesById,
      isDebuff: false,
      hostilityType: 1,
    });

    // Simulate what the component does - combine and sort by uptime percentage
    const combined = [...debuffResults, ...buffResults].sort(
      (a, b) => b.uptimePercentage - a.uptimePercentage
    );

    expect(combined).toHaveLength(2);

    // Should be sorted highest to lowest: Overcharged (50%) then Burning (30%)
    expect(combined[0].abilityName).toBe('Overcharged');
    expect(combined[0].uptimePercentage).toBe(50);
    expect(combined[0].isDebuff).toBe(false);

    expect(combined[1].abilityName).toBe('Burning');
    expect(combined[1].uptimePercentage).toBe(30);
    expect(combined[1].isDebuff).toBe(true);
  });

  it('should handle edge cases that the component might encounter', () => {
    // Test with null/undefined lookup (component checks for loading states)
    expect(
      computeBuffUptimes(null, {
        abilityIds: new Set([KnownAbilities.BURNING]),
        targetIds: new Set([111]),
        fightStartTime: FIGHT_START,
        fightEndTime: FIGHT_END,
        fightDuration: FIGHT_DURATION,
        abilitiesById: mockAbilitiesById,
        isDebuff: true,
        hostilityType: 0,
      })
    ).toEqual([]);

    // Test with zero fight duration (component checks for this)
    const mockLookup = {
      buffIntervals: new Map([
        [KnownAbilities.BURNING, [{ start: 1000, end: 6000, targetID: 111 }]],
      ]),
    };

    expect(
      computeBuffUptimes(mockLookup, {
        abilityIds: new Set([KnownAbilities.BURNING]),
        targetIds: new Set([111]),
        fightStartTime: FIGHT_START,
        fightEndTime: FIGHT_START, // Zero duration
        fightDuration: 0,
        abilitiesById: mockAbilitiesById,
        isDebuff: true,
        hostilityType: 0,
      })
    ).toEqual([]);
  });
});
