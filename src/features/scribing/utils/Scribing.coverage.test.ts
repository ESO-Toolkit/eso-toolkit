/**
 * Comprehensive test suite for Scribing.ts utility functions
 * Focuses on improving coverage for the getScribingSkillByAbilityId function
 */

import { getScribingSkillByAbilityId, ScribingSkillInfo } from './Scribing';

// Mock the scribing database
jest.mock('../../../../data/scribing-complete.json', () => ({
  grimoires: {
    'banner-bearer': {
      id: 123456,
      name: 'Banner Bearer',
      nameTransformations: {
        'flame-damage': {
          name: 'Fire Banner',
          abilityIds: [123457, 123458],
        },
        'frost-damage': {
          name: 'Frost Banner',
          abilityIds: [123459, 123460],
        },
        healing: {
          name: 'Healing Banner',
          abilityIds: [123461, 123462],
        },
        'unknown-transformation-type': {
          name: 'Unknown Transformation',
          abilityIds: [222223],
        },
      },
    },
    'elemental-explosion': {
      id: 234567,
      name: 'Elemental Explosion',
      nameTransformations: {
        'shock-damage': {
          name: 'Shock Explosion',
          abilityIds: [234568, 234569],
        },
        'physical-damage': {
          name: 'Physical Explosion',
          abilityIds: [234570, 234571],
        },
      },
    },
    'test-grimoire': {
      id: 111111,
      name: 'Test Grimoire',
      nameTransformations: {
        'test-transformation': {
          name: 'Test Transformation',
          // Missing abilityIds - testing malformed data
        },
      },
    },
  },
  signatureScripts: {
    'astral-immunity': {
      name: 'Astral Immunity',
      abilityIds: [345678, 345679],
    },
    'class-mastery': {
      name: 'Class Mastery',
      abilityIds: [345680, 345681],
    },
  },
  affixScripts: {
    breaching: {
      name: 'Breaching',
      abilityIds: [456789, 456790],
    },
    lingering: {
      name: 'Lingering',
      abilityIds: [456791, 456792],
    },
  },
}));

describe('Scribing.ts - Coverage Improvement Tests', () => {
  describe('getScribingSkillByAbilityId', () => {
    it('should return base grimoire information for base ability IDs', () => {
      const result = getScribingSkillByAbilityId(123456);

      expect(result).toEqual({
        grimoire: 'Banner Bearer',
        transformation: 'Base Ability',
        transformationType: 'Base Grimoire',
        transformedName: 'Banner Bearer',
        grimoireId: 123456,
      });
    });

    it('should return focus script information for name transformation IDs', () => {
      const result = getScribingSkillByAbilityId(123457);

      expect(result).toEqual({
        grimoire: 'Banner Bearer',
        transformation: 'Fire Banner',
        transformationType: 'Focus Script',
        transformedName: 'Fire Banner',
        grimoireId: 123456,
      });
    });

    it('should handle multiple focus script types correctly', () => {
      // Test frost damage
      const frostResult = getScribingSkillByAbilityId(123459);
      expect(frostResult?.transformation).toBe('Frost Banner');
      expect(frostResult?.transformationType).toBe('Focus Script');

      // Test healing
      const healingResult = getScribingSkillByAbilityId(123461);
      expect(healingResult?.transformation).toBe('Healing Banner');
      expect(healingResult?.transformationType).toBe('Focus Script');

      // Test shock damage from different grimoire
      const shockResult = getScribingSkillByAbilityId(234568);
      expect(shockResult?.transformation).toBe('Shock Explosion');
      expect(shockResult?.grimoire).toBe('Elemental Explosion');
    });

    it('should return signature script information', () => {
      const result = getScribingSkillByAbilityId(345678);

      expect(result).toEqual({
        grimoire: 'Unknown Grimoire',
        transformation: 'Astral Immunity',
        transformationType: 'Signature Script',
        transformedName: 'Astral Immunity',
        grimoireId: 0,
      });
    });

    it('should return affix script information', () => {
      const result = getScribingSkillByAbilityId(456789);

      expect(result).toEqual({
        grimoire: 'Unknown Grimoire',
        transformation: 'Breaching',
        transformationType: 'Affix Script',
        transformedName: 'Breaching',
        grimoireId: 0,
      });
    });

    it('should return null for unknown ability IDs', () => {
      const result = getScribingSkillByAbilityId(999999);
      expect(result).toBeNull();
    });

    it('should handle unknown transformation types and log warnings', () => {
      const consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});

      const result = getScribingSkillByAbilityId(222223);

      expect(result?.transformationType).toBe('Focus Script'); // Should default
      expect(consoleWarnSpy).toHaveBeenCalledWith(
        'Unknown scribing transformation type: unknown-transformation-type',
      );

      consoleWarnSpy.mockRestore();
    });

    it('should handle malformed database entries with missing abilityIds', () => {
      // This tests the path where abilityIds is missing from transformation data
      const result = getScribingSkillByAbilityId(111112);
      expect(result).toBeNull();
    });

    it('should handle database access errors gracefully', () => {
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

      // Test error handling by accessing a property that might not exist
      const result = getScribingSkillByAbilityId(-1); // Invalid ID that shouldn't exist

      // Should still return null without crashing
      expect(result).toBeNull();

      consoleSpy.mockRestore();
    });

    it('should test all script types across different grimoires', () => {
      // Test multiple abilities from different grimoires
      const tests = [
        { id: 234570, grimoire: 'Elemental Explosion', transformation: 'Physical Explosion' },
        { id: 345680, type: 'Signature Script', transformation: 'Class Mastery' },
        { id: 456791, type: 'Affix Script', transformation: 'Lingering' },
      ];

      tests.forEach((test) => {
        const result = getScribingSkillByAbilityId(test.id);
        expect(result).not.toBeNull();
        expect(result?.transformation).toBe(test.transformation);
        if (test.grimoire) {
          expect(result?.grimoire).toBe(test.grimoire);
        }
        if (test.type) {
          expect(result?.transformationType).toBe(test.type);
        }
      });
    });

    it('should correctly differentiate between different ability ID ranges', () => {
      // Test that we can differentiate between base grimoire IDs and transformation IDs
      const baseResult = getScribingSkillByAbilityId(123456); // Base grimoire
      const transformResult = getScribingSkillByAbilityId(123457); // Transformation

      expect(baseResult?.transformationType).toBe('Base Grimoire');
      expect(transformResult?.transformationType).toBe('Focus Script');
      expect(baseResult?.grimoireId).toBe(transformResult?.grimoireId); // Same grimoire
    });

    it('should handle multiple ability IDs in the same transformation', () => {
      // Test that both IDs in the same transformation work
      const result1 = getScribingSkillByAbilityId(123457);
      const result2 = getScribingSkillByAbilityId(123458);

      expect(result1?.transformation).toBe('Fire Banner');
      expect(result2?.transformation).toBe('Fire Banner');
      expect(result1?.grimoireId).toBe(result2?.grimoireId);
    });
  });
});
