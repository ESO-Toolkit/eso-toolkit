import { PlayerGear } from '../types/playerDetails';

import {
  detectBuildIssues,
  EnchantQualityIssue,
  GearLevelIssue,
  GearQualityIssue,
} from './detectBuildIssues';
import { PlayerGearSetRecord } from './gearUtilities';

describe('detectBuildIssues', () => {
  const mockPlayerGearAnalysis: PlayerGearSetRecord[] = [];

  it('should return empty array for null/undefined gear', () => {
    const result = detectBuildIssues(undefined as never, mockPlayerGearAnalysis);
    expect(result).toEqual([]);
  });

  it('should skip gear with id 0', () => {
    const gear: PlayerGear[] = [
      {
        id: 0,
        name: 'Empty Slot',
        quality: 3,
        enchantQuality: 2,
        championPoints: 100,
      } as PlayerGear,
    ];

    const result = detectBuildIssues(gear, mockPlayerGearAnalysis);
    expect(result).toEqual([]);
  });

  it('should detect enchantment quality issues', () => {
    const gear: PlayerGear[] = [
      {
        id: 1,
        name: 'Test Sword',
        quality: 5,
        enchantQuality: 3,
        championPoints: 160,
      } as PlayerGear,
    ];

    const result = detectBuildIssues(gear, mockPlayerGearAnalysis);
    const enchantIssue = result.find((issue) =>
      issue.message.includes('Enchantment quality')
    ) as EnchantQualityIssue;

    expect(enchantIssue).toBeDefined();
    expect(enchantIssue.gearName).toBe('Test Sword');
    expect(enchantIssue.enchantQuality).toBe(3);
    expect(enchantIssue.message).toBe('Test Sword: Enchantment quality is 3 (should be 5)');
  });

  it('should not flag enchant quality when it matches gear quality', () => {
    const gear: PlayerGear[] = [
      {
        id: 1,
        name: 'Test Armor',
        quality: 4,
        enchantQuality: 4,
        championPoints: 160,
      } as PlayerGear,
    ];

    const result = detectBuildIssues(gear, mockPlayerGearAnalysis);
    const enchantIssues = result.filter((issue) => issue.message.includes('Enchantment quality'));

    expect(enchantIssues).toHaveLength(0);
  });

  it('should detect gear quality issues for non-legendary gear', () => {
    const gear: PlayerGear[] = [
      {
        id: 1,
        name: 'Epic Helm',
        quality: 4,
        enchantQuality: 4,
        championPoints: 160,
      } as PlayerGear,
    ];

    const result = detectBuildIssues(gear, mockPlayerGearAnalysis);
    const qualityIssue = result.find((issue) =>
      issue.message.includes('Gear quality')
    ) as GearQualityIssue;

    expect(qualityIssue).toBeDefined();
    expect(qualityIssue.gearName).toBe('Epic Helm');
    expect(qualityIssue.gearQuality).toBe(4);
    expect(qualityIssue.message).toBe('Epic Helm: Gear quality is 4 (should be 5)');
  });

  it('should detect champion points issues for gear below CP 160', () => {
    const gear: PlayerGear[] = [
      {
        id: 1,
        name: 'Low Level Boots',
        quality: 5,
        enchantQuality: 5,
        championPoints: 150,
      } as PlayerGear,
    ];

    const result = detectBuildIssues(gear, mockPlayerGearAnalysis);
    const levelIssue = result.find((issue) => issue.message.includes('CP level')) as GearLevelIssue;

    expect(levelIssue).toBeDefined();
    expect(levelIssue.gearName).toBe('Low Level Boots');
    expect(levelIssue.gearLevel).toBe(150);
    expect(levelIssue.message).toBe('Low Level Boots: CP level is 150 (should be 160)');
  });

  it('should handle unnamed gear gracefully', () => {
    const gear: PlayerGear[] = [
      {
        id: 1,
        name: '',
        quality: 3,
        enchantQuality: 2,
        championPoints: 100,
      } as PlayerGear,
    ];

    const result = detectBuildIssues(gear, mockPlayerGearAnalysis);

    expect(result.every((issue) => issue.gearName === 'Unnamed Gear')).toBe(true);
    expect(result.every((issue) => issue.message.includes('Unnamed Gear'))).toBe(true);
  });

  it('should detect multiple issues for the same gear piece', () => {
    const gear: PlayerGear[] = [
      {
        id: 1,
        name: 'Problematic Gear',
        quality: 3,
        enchantQuality: 1,
        championPoints: 100,
      } as PlayerGear,
    ];

    const result = detectBuildIssues(gear, mockPlayerGearAnalysis);

    expect(result).toHaveLength(3);
    expect(result.some((issue) => issue.message.includes('Enchantment quality'))).toBe(true);
    expect(result.some((issue) => issue.message.includes('Gear quality'))).toBe(true);
    expect(result.some((issue) => issue.message.includes('CP level'))).toBe(true);
  });

  it('should detect perfected set issues', () => {
    const gearAnalysis: PlayerGearSetRecord[] = [
      {
        key: 'test-set',
        labelName: 'Test Set',
        sortName: 'Test Set',
        category: 1,
        secondary: 0,
        count: 5,
        data: {
          hasPerfected: true,
          hasRegular: true,
          perfected: 3,
          total: 5,
          baseDisplay: 'Test Set',
        },
      },
    ];

    const result = detectBuildIssues([], gearAnalysis);
    const perfectedIssue = result.find((issue) => issue.message.includes('Perfected'));

    expect(perfectedIssue).toBeDefined();
    expect(perfectedIssue?.gearName).toBe('Test Set');
    expect(perfectedIssue?.message).toBe(
      'Missing 2 Perfected piece(s) in Test Set for the 5-piece bonus'
    );
  });

  it('should handle perfect gear with no issues', () => {
    const gear: PlayerGear[] = [
      {
        id: 1,
        name: 'Perfect Gear',
        quality: 5,
        enchantQuality: 5,
        championPoints: 160,
      } as PlayerGear,
    ];

    const result = detectBuildIssues(gear, mockPlayerGearAnalysis);
    expect(result).toHaveLength(0);
  });
});
