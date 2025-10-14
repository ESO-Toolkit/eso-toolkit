/**
 * Test suite to verify the Scribing database utility is working correctly
 * Tests that we can look up abilities by ID from the complete database
 */

import {
  getScribingSkillByAbilityId,
  isScribingAbility,
  getGrimoireAbilityIds,
  getAllScribingAbilityIds,
} from '../utils/Scribing';

describe('Scribing Database Utility', () => {
  describe('getScribingSkillByAbilityId', () => {
    test('should find Shattering Knife', () => {
      const result = getScribingSkillByAbilityId(217340);

      expect(result).not.toBeNull();
      expect(result?.grimoire).toBe('Traveling Knife');
      expect(result?.transformation).toBe('Shattering Knife');
      expect(result?.abilityId).toBe(217340);
      // The transformation type varies based on which transformation it is in the database
      expect(result?.transformationType).toBeTruthy();
    });

    test('should find Soul Burst variation', () => {
      const result = getScribingSkillByAbilityId(217784);

      expect(result).not.toBeNull();
      expect(result?.grimoire).toBe('Wield Soul');
      expect(result?.transformation).toContain('Soul');
    });

    test("should find Ulfsild's Contingency variation", () => {
      const result = getScribingSkillByAbilityId(240150);

      expect(result).not.toBeNull();
      expect(result?.grimoire).toBe("Ulfsild's Contingency");
      expect(result?.transformation).toContain('Contingency');
    });

    test('should find Trample (Magic Damage)', () => {
      const result = getScribingSkillByAbilityId(220542);

      expect(result).not.toBeNull();
      expect(result?.grimoire).toBe('Trample');
      expect(result?.transformation).toContain('Magic');
    });

    test('should return null for non-scribing abilities', () => {
      // Bash is not a scribing ability
      const result = getScribingSkillByAbilityId(21970);
      expect(result).toBeNull();
    });

    test('should return null for invalid ability IDs', () => {
      const result = getScribingSkillByAbilityId(999999999);
      expect(result).toBeNull();
    });
  });

  describe('isScribingAbility', () => {
    test('should return true for known scribing abilities', () => {
      expect(isScribingAbility(217340)).toBe(true); // Shattering Knife
      expect(isScribingAbility(217784)).toBe(true); // Soul Burst
      expect(isScribingAbility(240150)).toBe(true); // Elemental Explosion
      expect(isScribingAbility(220542)).toBe(true); // Trample
    });

    test('should return false for non-scribing abilities', () => {
      expect(isScribingAbility(21970)).toBe(false); // Bash
      expect(isScribingAbility(999999999)).toBe(false); // Invalid ID
    });
  });

  describe('getGrimoireAbilityIds', () => {
    test('should find all ability IDs for Traveling Knife grimoire', () => {
      const abilityIds = getGrimoireAbilityIds('Traveling Knife');

      expect(abilityIds.length).toBeGreaterThan(0);
      expect(abilityIds).toContain(217340); // Shattering Knife should be in there
    });

    test('should return empty array for non-existent grimoire', () => {
      const abilityIds = getGrimoireAbilityIds('Nonexistent Grimoire');
      expect(abilityIds).toEqual([]);
    });

    test('should handle case-insensitive grimoire names', () => {
      const lowerCase = getGrimoireAbilityIds('traveling knife');
      const upperCase = getGrimoireAbilityIds('TRAVELING KNIFE');
      const mixedCase = getGrimoireAbilityIds('Traveling Knife');

      expect(lowerCase).toEqual(mixedCase);
      expect(upperCase).toEqual(mixedCase);
    });
  });

  describe('getAllScribingAbilityIds', () => {
    test('should return a large collection of ability IDs', () => {
      const allIds = getAllScribingAbilityIds();

      // Should have many abilities from the complete database
      expect(allIds.length).toBeGreaterThan(100);

      // Should include our known test abilities
      expect(allIds).toContain(217340); // Shattering Knife
      expect(allIds).toContain(217784); // Soul Burst
      expect(allIds).toContain(240150); // Elemental Explosion
      expect(allIds).toContain(220542); // Trample
    });

    test('should return unique ability IDs', () => {
      const allIds = getAllScribingAbilityIds();
      const uniqueIds = Array.from(new Set(allIds));

      expect(allIds.length).toBe(uniqueIds.length);
    });
  });

  describe('Database Coverage', () => {
    test('should have comprehensive coverage from the database', () => {
      console.log('\n📊 Scribing Database Statistics:');

      const allIds = getAllScribingAbilityIds();
      console.log(`   Total Abilities: ${allIds.length}`);

      // Test a variety of abilities to show the database is comprehensive
      const sampleAbilities = [
        217340, // Traveling Knife - Physical
        217784, // Soul Burst - Magic
        240150, // Elemental Explosion - Fire
        220542, // Trample - Magic
      ];

      let foundCount = 0;
      sampleAbilities.forEach((id) => {
        const info = getScribingSkillByAbilityId(id);
        if (info) {
          foundCount++;
          console.log(`   ✅ ${info.grimoire} (${info.transformation}) - ID: ${id}`);
        }
      });

      console.log(`   Coverage: ${foundCount}/${sampleAbilities.length} sample abilities found`);

      expect(foundCount).toBe(sampleAbilities.length);
    });
  });
});
