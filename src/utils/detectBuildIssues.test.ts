import { PlayerGear, ArmorType, WeaponType, GearTrait } from '../types/playerDetails';
import { ItemQuality } from './gearUtilities';

import { BuffLookupData } from './BuffLookupUtils';
import {
  detectBuildIssues,
  EnchantQualityIssue,
  GearLevelIssue,
  GearQualityIssue,
} from './detectBuildIssues';

describe('detectBuildIssues', () => {
  // Mock empty BuffLookupData for tests that don't need buff checking
  const mockBuffLookup: BuffLookupData = {
    buffIntervals: {},
  };

  it('should return empty array for null/undefined gear', () => {
    const result = detectBuildIssues(undefined, undefined, undefined, undefined, [], 'dps');
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

    const result = detectBuildIssues(gear, undefined, undefined, undefined, [], 'dps');
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

    const result = detectBuildIssues(gear, undefined, undefined, undefined, [], 'dps');
    const enchantIssue = result.find((issue) =>
      issue.message.includes('Enchantment quality'),
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

    const result = detectBuildIssues(gear, undefined, undefined, undefined, [], 'dps');
    const enchantIssues = result.filter((issue) => issue.message.includes('Enchantment quality'));

    expect(enchantIssues).toHaveLength(0);
  });

  it('should detect gear quality issues for non-legendary gear', () => {
    const gear: PlayerGear[] = [
      {
        id: 1,
        slot: 10,
        quality: ItemQuality.EPIC,
        icon: 'test-icon',
        name: 'Epic Weapon',
        championPoints: 160,
        trait: GearTrait.SHARPENED,
        enchantType: 1,
        enchantQuality: 4,
        setID: 1,
        type: WeaponType.SWORD,
      },
    ];

    const result = detectBuildIssues(gear, undefined, undefined, undefined, [], 'dps');
    const qualityIssue = result.find((issue) =>
      issue.message.includes('Gear quality'),
    ) as GearQualityIssue;

    expect(qualityIssue).toBeDefined();
    expect(qualityIssue.gearName).toBe('Epic Weapon');
    expect(qualityIssue.gearQuality).toBe(4);
    expect(qualityIssue.message).toBe('Epic Weapon: Gear quality is 4 (should be 5)');
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

    const result = detectBuildIssues(gear, undefined, undefined, undefined, [], 'dps');
    const levelIssue = result.find((issue) => issue.message.includes('CP level')) as GearLevelIssue;

    expect(levelIssue).toBeDefined();
    expect(levelIssue.gearName).toBe('Low Level Boots');
    expect(levelIssue.gearLevel).toBe(150);
    expect(levelIssue.message).toBe('Low Level Boots: CP level is 150 (should be 160)');
  });

  it('should detect multiple issues for the same gear piece', () => {
    const gear: PlayerGear[] = [
      {
        id: 1,
        quality: 3,
        enchantQuality: 2,
        championPoints: 140,
      } as PlayerGear,
    ];

    const result = detectBuildIssues(gear, undefined, undefined, undefined, [], 'dps');
    const gearIssues = result.filter(
      (issue) =>
        issue.message.includes('Enchantment quality') ||
        issue.message.includes('Gear quality') ||
        issue.message.includes('CP level'),
    );

    expect(gearIssues).toHaveLength(3);
    expect(result.some((issue) => issue.message.includes('Enchantment quality'))).toBe(true);
    expect(result.some((issue) => issue.message.includes('Gear quality'))).toBe(true);
    expect(result.some((issue) => issue.message.includes('CP level'))).toBe(true);

    expect(
      gearIssues.every((issue) => {
        return 'gearName' in issue && issue.gearName === 'Unnamed Gear';
      }),
    ).toBe(true);
  });

  it('should not detect issues for perfect gear', () => {
    const gear: PlayerGear[] = [
      {
        id: 1,
        name: 'Perfect Gear',
        quality: 5,
        enchantQuality: 5,
        championPoints: 160,
      } as PlayerGear,
    ];

    const result = detectBuildIssues(gear, undefined, undefined, undefined, [], 'dps');
    const gearIssues = result.filter(
      (issue) =>
        issue.message.includes('Enchantment quality') ||
        issue.message.includes('Gear quality') ||
        issue.message.includes('CP level'),
    );
    expect(gearIssues).toHaveLength(0);
  });

  it('should accept quality 4 for armor pieces', () => {
    const gear: PlayerGear[] = [
      {
        id: 1,
        slot: 1, // CHEST slot
        quality: ItemQuality.EPIC,
        icon: 'test-icon',
        name: 'Epic Chest',
        championPoints: 160,
        trait: GearTrait.SHARPENED,
        enchantType: 1,
        enchantQuality: 4,
        setID: 1,
        type: ArmorType.HEAVY,
      },
    ];

    const result = detectBuildIssues(gear, undefined, undefined, undefined, [], 'dps');
    const qualityIssues = result.filter((issue) => issue.message.includes('Gear quality'));
    expect(qualityIssues).toHaveLength(0);
  });

  it('should reject quality 3 for armor pieces', () => {
    const gear: PlayerGear[] = [
      {
        id: 1,
        slot: 1, // CHEST slot
        quality: ItemQuality.RARE,
        icon: 'test-icon',
        name: 'Rare Chest',
        championPoints: 160,
        trait: GearTrait.SHARPENED,
        enchantType: 1,
        enchantQuality: 3,
        setID: 1,
        type: ArmorType.HEAVY,
      },
    ];

    const result = detectBuildIssues(gear, undefined, undefined, undefined, [], 'dps');
    const qualityIssue = result.find((issue) =>
      issue.message.includes('Gear quality'),
    ) as GearQualityIssue;

    expect(qualityIssue).toBeDefined();
    expect(qualityIssue.gearName).toBe('Rare Chest');
    expect(qualityIssue.gearQuality).toBe(3);
    expect(qualityIssue.message).toBe('Rare Chest: Gear quality is 3 (should be at least 4)');
  });

  it('should require quality 5 for jewelry', () => {
    const gear: PlayerGear[] = [
      {
        id: 1,
        slot: 8, // RING1 slot
        quality: ItemQuality.EPIC,
        icon: 'test-icon',
        name: 'Epic Ring',
        championPoints: 160,
        trait: GearTrait.SHARPENED,
        enchantType: 1,
        enchantQuality: 4,
        setID: 1,
        type: ArmorType.JEWELRY,
      },
    ];

    const result = detectBuildIssues(gear, undefined, undefined, undefined, [], 'dps');
    const qualityIssue = result.find((issue) =>
      issue.message.includes('Gear quality'),
    ) as GearQualityIssue;

    expect(qualityIssue).toBeDefined();
    expect(qualityIssue.gearName).toBe('Epic Ring');
    expect(qualityIssue.gearQuality).toBe(4);
    expect(qualityIssue.message).toBe('Epic Ring: Gear quality is 4 (should be 5)');
  });

  describe('role-based buff checking', () => {
    it('should check for Minor Aegis only for tanks', () => {
      // Test tank role - should check for Minor Aegis
      const tankIssues = detectBuildIssues([], mockBuffLookup, 1000, 2000, [], 'tank');
      const hasMinorAegisIssue = tankIssues.some((issue) => issue.message.includes('Minor Aegis'));
      expect(hasMinorAegisIssue).toBe(true);

      // Test DPS role - should NOT check for Minor Aegis
      const dpsIssues = detectBuildIssues([], mockBuffLookup, 1000, 2000, [], 'dps');
      const hasMinorAegisIssueDPS = dpsIssues.some((issue) =>
        issue.message.includes('Minor Aegis'),
      );
      expect(hasMinorAegisIssueDPS).toBe(false);
    });

    it('should check for Minor Slayer only for DPS', () => {
      // Test DPS role - should check for Minor Slayer
      const dpsIssues = detectBuildIssues([], mockBuffLookup, 1000, 2000, [], 'dps');
      const hasMinorSlayerIssue = dpsIssues.some((issue) => issue.message.includes('Minor Slayer'));
      expect(hasMinorSlayerIssue).toBe(true);

      // Test tank role - should NOT check for Minor Slayer
      const tankIssues = detectBuildIssues([], mockBuffLookup, 1000, 2000, [], 'tank');
      const hasMinorSlayerIssueTank = tankIssues.some((issue) =>
        issue.message.includes('Minor Slayer'),
      );
      expect(hasMinorSlayerIssueTank).toBe(false);
    });

    it('requires magicka-focused players to maintain Major Sorcery and Major Prophecy', () => {
      const magickaFocusedIssues = detectBuildIssues(
        [],
        mockBuffLookup,
        1000,
        2000,
        [],
        'dps',
        undefined,
        undefined,
        { magicka: 36000, stamina: 18000 },
      );

      const magickaMajorIssues = magickaFocusedIssues.filter(
        (issue) =>
          issue.message.includes('Major Sorcery') || issue.message.includes('Major Prophecy'),
      );
      // In modern ESO, Major Brutality/Sorcery are combined, so the message mentions both
      // Similarly, Major Savagery/Prophecy are combined
      expect(magickaMajorIssues).toHaveLength(2);
      expect(
        magickaMajorIssues.some(
          (issue) => 'buffName' in issue && issue.buffName === 'Major Sorcery',
        ),
      ).toBe(true);
      expect(
        magickaMajorIssues.some(
          (issue) => 'buffName' in issue && issue.buffName === 'Major Prophecy',
        ),
      ).toBe(true);
    });

    it('requires stamina-focused players to maintain Major Brutality and Major Savagery', () => {
      const staminaFocusedIssues = detectBuildIssues(
        [],
        mockBuffLookup,
        1000,
        2000,
        [],
        'dps',
        undefined,
        undefined,
        { stamina: 36000, magicka: 18000 },
      );

      const staminaMajorIssues = staminaFocusedIssues.filter(
        (issue) =>
          issue.message.includes('Major Brutality') || issue.message.includes('Major Savagery'),
      );
      // In modern ESO, Major Brutality/Sorcery are combined, so the message mentions both
      // Similarly, Major Savagery/Prophecy are combined
      expect(staminaMajorIssues).toHaveLength(2);
      expect(
        staminaMajorIssues.some(
          (issue) => 'buffName' in issue && issue.buffName === 'Major Brutality',
        ),
      ).toBe(true);
      expect(
        staminaMajorIssues.some(
          (issue) => 'buffName' in issue && issue.buffName === 'Major Savagery',
        ),
      ).toBe(true);
    });

    it('does not enforce major buff requirements for non-DPS roles', () => {
      const tankIssues = detectBuildIssues(
        [],
        mockBuffLookup,
        1000,
        2000,
        [],
        'tank',
        undefined,
        undefined,
        { magicka: 36000, stamina: 18000 },
      );

      const healerIssues = detectBuildIssues(
        [],
        mockBuffLookup,
        1000,
        2000,
        [],
        'healer',
        undefined,
        undefined,
        { stamina: 36000, magicka: 18000 },
      );

      const tankMajorIssues = tankIssues.filter((issue) => issue.message.includes('Major '));
      const healerMajorIssues = healerIssues.filter((issue) => issue.message.includes('Major '));

      expect(tankMajorIssues).toHaveLength(0);
      expect(healerMajorIssues).toHaveLength(0);
    });

    it('should detect Minor Slayer from damage event buff strings', () => {
      const mockDamageEvents = [
        {
          sourceID: 9,
          buffs: '172621.163401.147226.61665.61687.61799.61662.62800.92503.76518.61685.', // Contains Minor Slayer (147226)
        } as any, // Simplified for testing
      ];

      const dpsIssues = detectBuildIssues(
        [],
        mockBuffLookup,
        1000,
        2000,
        [],
        'dps',
        mockDamageEvents,
        9,
      );
      const hasMinorSlayerIssue = dpsIssues.some((issue) => issue.message.includes('Minor Slayer'));
      expect(hasMinorSlayerIssue).toBe(false); // Should NOT report as missing since it's found in damage events

      // Test without Minor Slayer in damage events
      const mockDamageEventsWithoutMinorSlayer = [
        {
          sourceID: 9,
          buffs: '172621.163401.61665.61687.61799.61662.62800.92503.76518.61685.', // No Minor Slayer (147226)
        } as any, // Simplified for testing
      ];

      const dpsIssuesWithoutMinorSlayer = detectBuildIssues(
        [],
        mockBuffLookup,
        1000,
        2000,
        [],
        'dps',
        mockDamageEventsWithoutMinorSlayer,
        9,
      );
      const hasMinorSlayerIssueWithoutBuff = dpsIssuesWithoutMinorSlayer.some((issue) =>
        issue.message.includes('Minor Slayer'),
      );
      expect(hasMinorSlayerIssueWithoutBuff).toBe(true); // Should report as missing
    });

    it('should detect Major Brutality from auras (passive from slotted abilities)', () => {
      // Mock auras with Major Brutality from slotted abilities (like what appears in real combat logs)
      const mockAurasWithMajorBrutality = [
        { name: 'Major Brutality', id: 183049, stacks: 1 },
        { name: 'Major Prophecy', id: 203342, stacks: 1 },
        { name: 'Minor Slayer', id: 147226, stacks: 1 },
      ];

      const dpsIssues = detectBuildIssues(
        [],
        mockBuffLookup,
        1000,
        2000,
        mockAurasWithMajorBrutality,
        'dps',
        [],
        9,
        { stamina: 32000, magicka: 15000 },
      );
      const hasMajorBrutalityIssue = dpsIssues.some((issue) =>
        issue.message.includes('Major Brutality'),
      );
      expect(hasMajorBrutalityIssue).toBe(false); // Should NOT report as missing since it's found in auras

      // Test without Major Brutality in auras
      const mockAurasWithoutMajorBrutality = [
        { name: 'Major Prophecy', id: 203342, stacks: 1 },
        { name: 'Minor Slayer', id: 147226, stacks: 1 },
      ];

      const dpsIssuesWithoutMajorBrutality = detectBuildIssues(
        [],
        mockBuffLookup,
        1000,
        2000,
        mockAurasWithoutMajorBrutality,
        'dps',
        [],
        9,
        { stamina: 32000, magicka: 15000 },
      );
      const hasMajorBrutalityIssueWithoutAura = dpsIssuesWithoutMajorBrutality.some((issue) =>
        issue.message.includes('Major Brutality'),
      );
      expect(hasMajorBrutalityIssueWithoutAura).toBe(true); // Should report as missing
    });

    it('treats combined major buff abilities as satisfying individual requirements', () => {
      const combinedBuffLookup: BuffLookupData = {
        buffIntervals: {
          '219246': [{ start: 1000, end: 2000, targetID: 9, sourceID: 9 }],
          '217672': [{ start: 1000, end: 2000, targetID: 9, sourceID: 9 }],
        },
      };

      const staminaIssues = detectBuildIssues(
        [],
        combinedBuffLookup,
        1000,
        2000,
        [],
        'dps',
        [],
        9,
        { stamina: 34000, magicka: 18000 },
      );
      expect(staminaIssues.some((issue) => issue.message.includes('Major Brutality'))).toBe(false);
      expect(staminaIssues.some((issue) => issue.message.includes('Major Savagery'))).toBe(false);

      const magickaIssues = detectBuildIssues(
        [],
        combinedBuffLookup,
        1000,
        2000,
        [],
        'dps',
        [],
        9,
        { magicka: 34000, stamina: 18000 },
      );
      expect(magickaIssues.some((issue) => issue.message.includes('Major Sorcery'))).toBe(false);
      expect(magickaIssues.some((issue) => issue.message.includes('Major Prophecy'))).toBe(false);
    });

    it('should detect Minor Aegis from auras for tank players (passive from slotted abilities)', () => {
      // Mock auras with Minor Aegis from slotted abilities (like what appears in real combat logs)
      const mockAurasWithMinorAegis = [
        { name: 'Minor Aegis', id: 147225, stacks: 1 },
        { name: 'Major Resolve', id: 61694, stacks: 1 },
      ];

      const tankIssues = detectBuildIssues(
        [],
        mockBuffLookup,
        1000,
        2000,
        mockAurasWithMinorAegis,
        'tank',
        [],
        8,
      );
      const hasMinorAegisIssue = tankIssues.some((issue) => issue.message.includes('Minor Aegis'));
      expect(hasMinorAegisIssue).toBe(false); // Should NOT report as missing since it's found in auras

      // Test without Minor Aegis in auras
      const mockAurasWithoutMinorAegis = [{ name: 'Major Resolve', id: 61694, stacks: 1 }];

      const tankIssuesWithoutMinorAegis = detectBuildIssues(
        [],
        mockBuffLookup,
        1000,
        2000,
        mockAurasWithoutMinorAegis,
        'tank',
        [],
        8,
      );
      const hasMinorAegisIssueWithoutAura = tankIssuesWithoutMinorAegis.some((issue) =>
        issue.message.includes('Minor Aegis'),
      );
      expect(hasMinorAegisIssueWithoutAura).toBe(true); // Should report as missing
    });

    it('should detect missing Exploiter CP for DPS', () => {
      // Test DPS role - should check for Exploiter CP
      const dpsIssues = detectBuildIssues([], mockBuffLookup, 1000, 2000, [], 'dps', [], 9, {
        stamina: 32000,
        magicka: 15000,
      });
      const hasExploiterIssue = dpsIssues.some((issue) => issue.message.includes('Exploiter'));
      expect(hasExploiterIssue).toBe(true);

      // Test with Exploiter in auras
      const mockAurasWithExploiter = [
        { name: 'Exploiter', id: 63880, stacks: 1 },
        { name: 'Minor Slayer', id: 147226, stacks: 1 },
      ];

      const dpsIssuesWithExploiter = detectBuildIssues(
        [],
        mockBuffLookup,
        1000,
        2000,
        mockAurasWithExploiter,
        'dps',
        [],
        9,
        { stamina: 32000, magicka: 15000 },
      );
      const hasExploiterIssueWithAura = dpsIssuesWithExploiter.some((issue) =>
        issue.message.includes('Exploiter'),
      );
      expect(hasExploiterIssueWithAura).toBe(false); // Should NOT report as missing
    });

    it('should detect missing Skilled Tracker passive for DPS', () => {
      // Test DPS role - should check for Skilled Tracker
      const dpsIssues = detectBuildIssues([], mockBuffLookup, 1000, 2000, [], 'dps', [], 9, {
        stamina: 32000,
        magicka: 15000,
      });
      const hasSkilledTrackerIssue = dpsIssues.some((issue) =>
        issue.message.includes('Skilled Tracker'),
      );
      expect(hasSkilledTrackerIssue).toBe(true);

      // Test with Skilled Tracker in auras
      const mockAurasWithSkilledTracker = [
        { name: 'Skilled Tracker', id: 40393, stacks: 1 },
        { name: 'Minor Slayer', id: 147226, stacks: 1 },
      ];

      const dpsIssuesWithSkilledTracker = detectBuildIssues(
        [],
        mockBuffLookup,
        1000,
        2000,
        mockAurasWithSkilledTracker,
        'dps',
        [],
        9,
        { stamina: 32000, magicka: 15000 },
      );
      const hasSkilledTrackerIssueWithAura = dpsIssuesWithSkilledTracker.some((issue) =>
        issue.message.includes('Skilled Tracker'),
      );
      expect(hasSkilledTrackerIssueWithAura).toBe(false); // Should NOT report as missing
    });

    it('should NOT check for Exploiter or Skilled Tracker for non-DPS roles', () => {
      // Test tank role - should NOT check for Exploiter or Skilled Tracker
      const tankIssues = detectBuildIssues([], mockBuffLookup, 1000, 2000, [], 'tank');
      const hasExploiterIssue = tankIssues.some((issue) => issue.message.includes('Exploiter'));
      const hasSkilledTrackerIssue = tankIssues.some((issue) =>
        issue.message.includes('Skilled Tracker'),
      );
      expect(hasExploiterIssue).toBe(false);
      expect(hasSkilledTrackerIssue).toBe(false);

      // Test healer role - should NOT check for Exploiter or Skilled Tracker
      const healerIssues = detectBuildIssues([], mockBuffLookup, 1000, 2000, [], 'healer');
      const hasExploiterIssueHealer = healerIssues.some((issue) =>
        issue.message.includes('Exploiter'),
      );
      const hasSkilledTrackerIssueHealer = healerIssues.some((issue) =>
        issue.message.includes('Skilled Tracker'),
      );
      expect(hasExploiterIssueHealer).toBe(false);
      expect(hasSkilledTrackerIssueHealer).toBe(false);
    });
  });
});
