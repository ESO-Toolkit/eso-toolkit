/**
 * Tests for armorUtils
 * Comprehensive test coverage for armor analysis utilities
 */

import { ArmorType, WeaponType, GearSlot, GearTrait } from '../types/playerDetails';
import { getArmorWeightCounts, MythicArmorId, resolveArmorType } from './armorUtils';
import { ItemQuality } from './gearUtilities';
import type { PlayerGear } from '../types/playerDetails';

describe('armorUtils', () => {
  const createMockGear = (type: ArmorType | WeaponType, id = 1): PlayerGear => ({
    id,
    slot: GearSlot.CHEST,
    quality: ItemQuality.LEGENDARY,
    icon: 'test-icon',
    championPoints: 160,
    trait: GearTrait.REINFORCED,
    enchantType: 1,
    enchantQuality: 1,
    setID: 123,
    type,
  });

  describe('getArmorWeightCounts', () => {
    it('should count heavy armor pieces correctly', () => {
      const gear: PlayerGear[] = [
        createMockGear(ArmorType.HEAVY, 1),
        createMockGear(ArmorType.HEAVY, 2),
        createMockGear(ArmorType.HEAVY, 3),
      ];

      const result = getArmorWeightCounts(gear);

      expect(result.heavy).toBe(3);
      expect(result.medium).toBe(0);
      expect(result.light).toBe(0);
    });

    it('should count medium armor pieces correctly', () => {
      const gear: PlayerGear[] = [
        createMockGear(ArmorType.MEDIUM, 1),
        createMockGear(ArmorType.MEDIUM, 2),
        createMockGear(ArmorType.MEDIUM, 3),
        createMockGear(ArmorType.MEDIUM, 4),
      ];

      const result = getArmorWeightCounts(gear);

      expect(result.heavy).toBe(0);
      expect(result.medium).toBe(4);
      expect(result.light).toBe(0);
    });

    it('should count light armor pieces correctly', () => {
      const gear: PlayerGear[] = [
        createMockGear(ArmorType.LIGHT, 1),
        createMockGear(ArmorType.LIGHT, 2),
      ];

      const result = getArmorWeightCounts(gear);

      expect(result.heavy).toBe(0);
      expect(result.medium).toBe(0);
      expect(result.light).toBe(2);
    });

    it('should count mixed armor types correctly', () => {
      const gear: PlayerGear[] = [
        createMockGear(ArmorType.HEAVY, 1),
        createMockGear(ArmorType.HEAVY, 2),
        createMockGear(ArmorType.MEDIUM, 3),
        createMockGear(ArmorType.MEDIUM, 4),
        createMockGear(ArmorType.MEDIUM, 5),
        createMockGear(ArmorType.LIGHT, 6),
        createMockGear(ArmorType.LIGHT, 7),
        createMockGear(ArmorType.LIGHT, 8),
        createMockGear(ArmorType.LIGHT, 9),
      ];

      const result = getArmorWeightCounts(gear);

      expect(result.heavy).toBe(2);
      expect(result.medium).toBe(3);
      expect(result.light).toBe(4);
    });

    it('should ignore weapon types', () => {
      const gear: PlayerGear[] = [
        createMockGear(ArmorType.MEDIUM, 1),
        createMockGear(WeaponType.DAGGER, 2), // DAGGER = 11, doesn't conflict with armor types
        createMockGear(WeaponType.INFERNO_STAFF, 3), // INFERNO_STAFF = 12, doesn't conflict
        createMockGear(ArmorType.LIGHT, 4),
      ];

      const result = getArmorWeightCounts(gear);

      expect(result.heavy).toBe(0);
      expect(result.medium).toBe(1);
      expect(result.light).toBe(1);
    });

    it('should ignore gear with id = 0', () => {
      const gear: PlayerGear[] = [
        createMockGear(ArmorType.HEAVY, 0), // Should be ignored
        createMockGear(ArmorType.MEDIUM, 1),
        createMockGear(ArmorType.LIGHT, 0), // Should be ignored
        createMockGear(ArmorType.LIGHT, 2),
      ];

      const result = getArmorWeightCounts(gear);

      expect(result.heavy).toBe(0);
      expect(result.medium).toBe(1);
      expect(result.light).toBe(1);
    });

    it('should handle empty gear array', () => {
      const gear: PlayerGear[] = [];

      const result = getArmorWeightCounts(gear);

      expect(result.heavy).toBe(0);
      expect(result.medium).toBe(0);
      expect(result.light).toBe(0);
    });

    it('should handle array with null/undefined gear pieces', () => {
      const gear: PlayerGear[] = [
        createMockGear(ArmorType.HEAVY, 1),
        null as any, // Should be ignored
        createMockGear(ArmorType.MEDIUM, 2),
        undefined as any, // Should be ignored
        createMockGear(ArmorType.LIGHT, 3),
      ];

      const result = getArmorWeightCounts(gear);

      expect(result.heavy).toBe(1);
      expect(result.medium).toBe(1);
      expect(result.light).toBe(1);
    });

    it('should handle realistic gear configurations', () => {
      // 5-1-1 setup (5 light, 1 medium, 1 heavy)
      const fiveOneOneSetup: PlayerGear[] = [
        createMockGear(ArmorType.LIGHT, 1), // Head
        createMockGear(ArmorType.LIGHT, 2), // Chest
        createMockGear(ArmorType.LIGHT, 3), // Shoulders
        createMockGear(ArmorType.LIGHT, 4), // Waist
        createMockGear(ArmorType.LIGHT, 5), // Hands
        createMockGear(ArmorType.MEDIUM, 6), // Legs
        createMockGear(ArmorType.HEAVY, 7), // Feet
      ];

      const result = getArmorWeightCounts(fiveOneOneSetup);

      expect(result.heavy).toBe(1);
      expect(result.medium).toBe(1);
      expect(result.light).toBe(5);
    });

    it('should handle all heavy armor setup', () => {
      // Full heavy armor setup
      const allHeavySetup: PlayerGear[] = [
        createMockGear(ArmorType.HEAVY, 1), // Head
        createMockGear(ArmorType.HEAVY, 2), // Chest
        createMockGear(ArmorType.HEAVY, 3), // Shoulders
        createMockGear(ArmorType.HEAVY, 4), // Waist
        createMockGear(ArmorType.HEAVY, 5), // Hands
        createMockGear(ArmorType.HEAVY, 6), // Legs
        createMockGear(ArmorType.HEAVY, 7), // Feet
      ];

      const result = getArmorWeightCounts(allHeavySetup);

      expect(result.heavy).toBe(7);
      expect(result.medium).toBe(0);
      expect(result.light).toBe(0);
    });

    it('should handle mixed setup with weapons and jewelry', () => {
      // Realistic full gear setup including weapons and jewelry
      const fullGearSetup: PlayerGear[] = [
        createMockGear(ArmorType.LIGHT, 1), // Head
        createMockGear(ArmorType.LIGHT, 2), // Chest
        createMockGear(ArmorType.LIGHT, 3), // Shoulders
        createMockGear(ArmorType.LIGHT, 4), // Waist
        createMockGear(ArmorType.LIGHT, 5), // Hands
        createMockGear(ArmorType.MEDIUM, 6), // Legs
        createMockGear(ArmorType.HEAVY, 7), // Feet
        { ...createMockGear(ArmorType.JEWELRY, 8), type: ArmorType.JEWELRY }, // Neck
        { ...createMockGear(ArmorType.JEWELRY, 9), type: ArmorType.JEWELRY }, // Ring1
        { ...createMockGear(ArmorType.JEWELRY, 10), type: ArmorType.JEWELRY }, // Ring2
        createMockGear(WeaponType.INFERNO_STAFF, 11), // Main hand
        createMockGear(WeaponType.LIGHTNING_STAFF, 12), // Back bar
      ];

      const result = getArmorWeightCounts(fullGearSetup);

      expect(result.heavy).toBe(1);
      expect(result.medium).toBe(1);
      expect(result.light).toBe(5);
    });

    it('should return zero counts for gear array with only weapons and jewelry', () => {
      const weaponsAndJewelryOnly: PlayerGear[] = [
        { ...createMockGear(ArmorType.JEWELRY, 1), type: ArmorType.JEWELRY },
        { ...createMockGear(ArmorType.JEWELRY, 2), type: ArmorType.JEWELRY },
        { ...createMockGear(ArmorType.JEWELRY, 3), type: ArmorType.JEWELRY },
        createMockGear(WeaponType.DAGGER, 4), // DAGGER = 11, safe
        createMockGear(WeaponType.SHIELD, 5), // SHIELD = 14, safe
        createMockGear(WeaponType.INFERNO_STAFF, 6), // INFERNO_STAFF = 12, safe
      ];

      const result = getArmorWeightCounts(weaponsAndJewelryOnly);

      expect(result.heavy).toBe(0);
      expect(result.medium).toBe(0);
      expect(result.light).toBe(0);
    });

    it('should maintain correct structure of return object', () => {
      const gear: PlayerGear[] = [createMockGear(ArmorType.HEAVY, 1)];
      const result = getArmorWeightCounts(gear);

      expect(result).toHaveProperty('heavy');
      expect(result).toHaveProperty('medium');
      expect(result).toHaveProperty('light');
      expect(Object.keys(result)).toHaveLength(3);

      expect(typeof result.heavy).toBe('number');
      expect(typeof result.medium).toBe('number');
      expect(typeof result.light).toBe('number');
    });
  });

  describe('resolveArmorType', () => {
    // ESOLogs reports all mythic armor as type=1 (Light) regardless of actual weight.
    // These tests verify each correction in ARMOR_TYPE_CORRECTIONS is applied.
    const mythicCases: Array<{ itemId: MythicArmorId; name: string; expected: ArmorType }> = [
      { itemId: MythicArmorId.SnowTreaders, name: "Snow Treaders", expected: ArmorType.MEDIUM },
      { itemId: MythicArmorId.BloodlordsEmbrace, name: "Bloodlord's Embrace", expected: ArmorType.HEAVY },
      { itemId: MythicArmorId.Harpooners_WadingKilt, name: "Harpooner's Wading Kilt", expected: ArmorType.MEDIUM },
      { itemId: MythicArmorId.GazeOfSithis, name: 'Gaze of Sithis', expected: ArmorType.HEAVY },
      { itemId: MythicArmorId.DovRhaSabatons, name: 'Dov-Rha Sabatons', expected: ArmorType.HEAVY },
      { itemId: MythicArmorId.LefthandersAegisBelt, name: "Lefthander's Aegis Belt", expected: ArmorType.MEDIUM },
      { itemId: MythicArmorId.FaunsLarkCladding, name: "Faun's Lark Cladding", expected: ArmorType.MEDIUM },
      { itemId: MythicArmorId.SyrabanesWard, name: "Syrabane's Ward", expected: ArmorType.HEAVY },
      { itemId: MythicArmorId.EsotericEnvironmentGreaves, name: 'Esoteric Environment Greaves', expected: ArmorType.HEAVY },
      { itemId: MythicArmorId.RourkenSteamguards, name: 'Rourken Steamguards', expected: ArmorType.HEAVY },
      { itemId: MythicArmorId.RakkhatsVoidmantle, name: "Rakkhat's Voidmantle", expected: ArmorType.MEDIUM },
      { itemId: MythicArmorId.HuntsmansWarmask, name: "Huntsman's Warmask", expected: ArmorType.MEDIUM },
    ];

    it.each(mythicCases)(
      'corrects $name (id $itemId) from Light to $expected',
      ({ itemId, expected }) => {
        // ESOLogs reports it as Light (1); resolveArmorType should return the correct weight
        const gear = createMockGear(ArmorType.LIGHT, itemId);
        expect(resolveArmorType(gear)).toBe(expected);
      },
    );

    it('returns item.type unchanged for normal (non-mythic) gear', () => {
      const heavy = createMockGear(ArmorType.HEAVY, 99999);
      const medium = createMockGear(ArmorType.MEDIUM, 99998);
      const light = createMockGear(ArmorType.LIGHT, 99997);

      expect(resolveArmorType(heavy)).toBe(ArmorType.HEAVY);
      expect(resolveArmorType(medium)).toBe(ArmorType.MEDIUM);
      expect(resolveArmorType(light)).toBe(ArmorType.LIGHT);
    });
  });
});
