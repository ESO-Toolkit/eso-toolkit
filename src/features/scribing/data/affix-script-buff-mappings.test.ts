import '@testing-library/jest-dom';
import {
  AFFIX_SCRIPT_BUFF_MAPPINGS,
  type AffixBuffMapping,
  getAffixScriptByEffectId,
  getEffectIdsForAffixScript,
  isAffixCompatibleWithGrimoire,
  getCompatibleAffixScripts,
} from './affix-script-buff-mappings';

describe('affix-script-buff-mappings', () => {
  describe('AFFIX_SCRIPT_BUFF_MAPPINGS', () => {
    it('should contain affix script mappings', () => {
      expect(AFFIX_SCRIPT_BUFF_MAPPINGS).toBeDefined();
      expect(typeof AFFIX_SCRIPT_BUFF_MAPPINGS).toBe('object');
      expect(Object.keys(AFFIX_SCRIPT_BUFF_MAPPINGS).length).toBeGreaterThan(0);
    });

    it('should have valid mapping structure for each affix script', () => {
      Object.entries(AFFIX_SCRIPT_BUFF_MAPPINGS).forEach(([key, mapping]) => {
        expect(mapping).toHaveProperty('affixScriptKey');
        expect(mapping).toHaveProperty('name');
        expect(mapping).toHaveProperty('description');
        expect(mapping).toHaveProperty('buffIds');
        expect(mapping).toHaveProperty('debuffIds');
        expect(mapping).toHaveProperty('compatibleGrimoires');
        expect(mapping).toHaveProperty('detectionType');

        // Validate types
        expect(typeof mapping.affixScriptKey).toBe('string');
        expect(typeof mapping.name).toBe('string');
        expect(typeof mapping.description).toBe('string');
        expect(Array.isArray(mapping.buffIds)).toBe(true);
        expect(Array.isArray(mapping.debuffIds)).toBe(true);
        expect(Array.isArray(mapping.compatibleGrimoires)).toBe(true);
        expect(['buff', 'debuff', 'both']).toContain(mapping.detectionType);

        // Validate key consistency
        expect(mapping.affixScriptKey).toBe(key);

        // Validate ID arrays contain only numbers
        mapping.buffIds.forEach((id) => expect(typeof id).toBe('number'));
        mapping.debuffIds.forEach((id) => expect(typeof id).toBe('number'));

        // Validate grimoire keys are non-empty strings
        mapping.compatibleGrimoires.forEach((grimoire) => {
          expect(typeof grimoire).toBe('string');
          expect(grimoire.length).toBeGreaterThan(0);
        });
      });
    });

    it('should have unique buff IDs across all mappings', () => {
      const allBuffIds: number[] = [];
      const duplicates: number[] = [];

      Object.values(AFFIX_SCRIPT_BUFF_MAPPINGS).forEach((mapping) => {
        mapping.buffIds.forEach((id) => {
          if (allBuffIds.includes(id)) {
            duplicates.push(id);
          } else {
            allBuffIds.push(id);
          }
        });
      });

      expect(duplicates).toEqual([]);
    });

    it('should have unique debuff IDs across all mappings', () => {
      const allDebuffIds: number[] = [];
      const duplicates: number[] = [];

      Object.values(AFFIX_SCRIPT_BUFF_MAPPINGS).forEach((mapping) => {
        mapping.debuffIds.forEach((id) => {
          if (allDebuffIds.includes(id)) {
            duplicates.push(id);
          } else {
            allDebuffIds.push(id);
          }
        });
      });

      expect(duplicates).toEqual([]);
    });

    it('should have consistent detection types', () => {
      Object.values(AFFIX_SCRIPT_BUFF_MAPPINGS).forEach((mapping) => {
        const hasBuff = mapping.buffIds.length > 0;
        const hasDebuff = mapping.debuffIds.length > 0;

        if (hasBuff && hasDebuff) {
          expect(mapping.detectionType).toBe('both');
        } else if (hasBuff) {
          expect(mapping.detectionType).toBe('buff');
        } else if (hasDebuff) {
          expect(mapping.detectionType).toBe('debuff');
        } else {
          // This would be invalid - should have at least one effect
          fail(`Mapping ${mapping.affixScriptKey} has no buff or debuff IDs`);
        }
      });
    });
  });

  describe('getAffixScriptByEffectId', () => {
    it('should return correct mapping for buff IDs', () => {
      // Test with known buff IDs from the mappings
      const savageryProphecy = AFFIX_SCRIPT_BUFF_MAPPINGS['savagery-and-prophecy'];
      const buffId = savageryProphecy.buffIds[0];

      const result = getAffixScriptByEffectId(buffId);

      expect(result).toEqual(savageryProphecy);
    });

    it('should return correct mapping for debuff IDs', () => {
      // Find a mapping with debuff IDs
      const vulnerabilityMapping = Object.values(AFFIX_SCRIPT_BUFF_MAPPINGS).find(
        (mapping) => mapping.debuffIds.length > 0,
      );

      if (vulnerabilityMapping) {
        const debuffId = vulnerabilityMapping.debuffIds[0];
        const result = getAffixScriptByEffectId(debuffId);
        expect(result).toEqual(vulnerabilityMapping);
      }
    });

    it('should return null for non-existent effect IDs', () => {
      const result = getAffixScriptByEffectId(999999);
      expect(result).toBeNull();
    });

    it('should handle edge case effect IDs', () => {
      expect(getAffixScriptByEffectId(0)).toBeNull();
      expect(getAffixScriptByEffectId(-1)).toBeNull();
    });
  });

  describe('getEffectIdsForAffixScript', () => {
    it('should return all effect IDs for an affix script', () => {
      const savageryProphecy = AFFIX_SCRIPT_BUFF_MAPPINGS['savagery-and-prophecy'];
      const result = getEffectIdsForAffixScript('savagery-and-prophecy');

      const expectedIds = [...savageryProphecy.buffIds, ...savageryProphecy.debuffIds];
      expect(result).toEqual(expectedIds);
    });

    it('should return empty array for non-existent affix script', () => {
      const result = getEffectIdsForAffixScript('non-existent-affix');
      expect(result).toEqual([]);
    });

    it('should handle affix scripts with only buffs', () => {
      const buffOnlyScript = Object.entries(AFFIX_SCRIPT_BUFF_MAPPINGS).find(
        ([, mapping]) => mapping.buffIds.length > 0 && mapping.debuffIds.length === 0,
      );

      if (buffOnlyScript) {
        const [key, mapping] = buffOnlyScript;
        const result = getEffectIdsForAffixScript(key);
        expect(result).toEqual([...mapping.buffIds]);
      }
    });

    it('should handle affix scripts with only debuffs', () => {
      const debuffOnlyScript = Object.entries(AFFIX_SCRIPT_BUFF_MAPPINGS).find(
        ([, mapping]) => mapping.buffIds.length === 0 && mapping.debuffIds.length > 0,
      );

      if (debuffOnlyScript) {
        const [key, mapping] = debuffOnlyScript;
        const result = getEffectIdsForAffixScript(key);
        expect(result).toEqual([...mapping.debuffIds]);
      }
    });
  });

  describe('isAffixCompatibleWithGrimoire', () => {
    it('should return true for compatible combinations', () => {
      // Test with known compatible combination
      const savageryProphecy = AFFIX_SCRIPT_BUFF_MAPPINGS['savagery-and-prophecy'];
      const compatibleGrimoire = savageryProphecy.compatibleGrimoires[0];

      const result = isAffixCompatibleWithGrimoire('savagery-and-prophecy', compatibleGrimoire);
      expect(result).toBe(true);
    });

    it('should return false for incompatible combinations', () => {
      // Test with a grimoire that's not in the compatible list
      const result = isAffixCompatibleWithGrimoire(
        'savagery-and-prophecy',
        'non-existent-grimoire',
      );
      expect(result).toBe(false);
    });

    it('should return false for non-existent affix scripts', () => {
      const result = isAffixCompatibleWithGrimoire('non-existent-affix', 'traveling-knife');
      expect(result).toBe(false);
    });

    it('should be case-sensitive', () => {
      const savageryProphecy = AFFIX_SCRIPT_BUFF_MAPPINGS['savagery-and-prophecy'];
      const compatibleGrimoire = savageryProphecy.compatibleGrimoires[0];

      // Test with different casing
      const result = isAffixCompatibleWithGrimoire('SAVAGERY-AND-PROPHECY', compatibleGrimoire);
      expect(result).toBe(false);
    });

    it('should handle all grimoire combinations correctly', () => {
      // Test that each grimoire in each mapping's compatible list returns true
      Object.entries(AFFIX_SCRIPT_BUFF_MAPPINGS).forEach(([affixKey, mapping]) => {
        mapping.compatibleGrimoires.forEach((grimoireKey) => {
          const result = isAffixCompatibleWithGrimoire(affixKey, grimoireKey);
          expect(result).toBe(true);
        });
      });
    });
  });

  describe('getCompatibleAffixScripts', () => {
    it('should return all affix scripts compatible with a grimoire', () => {
      // Test with a commonly compatible grimoire
      const result = getCompatibleAffixScripts('traveling-knife');

      expect(Array.isArray(result)).toBe(true);
      expect(result.length).toBeGreaterThan(0);

      // Verify each returned mapping actually contains the grimoire
      result.forEach((mapping) => {
        expect(mapping.compatibleGrimoires).toContain('traveling-knife');
      });
    });

    it('should return empty array for non-existent grimoire', () => {
      const result = getCompatibleAffixScripts('non-existent-grimoire');
      expect(result).toEqual([]);
    });

    it('should return mappings with correct structure', () => {
      const result = getCompatibleAffixScripts('shield-throw');

      result.forEach((mapping) => {
        expect(mapping).toHaveProperty('affixScriptKey');
        expect(mapping).toHaveProperty('name');
        expect(mapping).toHaveProperty('description');
        expect(mapping).toHaveProperty('buffIds');
        expect(mapping).toHaveProperty('debuffIds');
        expect(mapping).toHaveProperty('compatibleGrimoires');
        expect(mapping).toHaveProperty('detectionType');
      });
    });

    it('should handle grimoires with different compatibility levels', () => {
      // Count how many affix scripts each grimoire is compatible with
      const grimoireCompatibilityCounts: Record<string, number> = {};

      Object.values(AFFIX_SCRIPT_BUFF_MAPPINGS).forEach((mapping) => {
        mapping.compatibleGrimoires.forEach((grimoire) => {
          grimoireCompatibilityCounts[grimoire] = (grimoireCompatibilityCounts[grimoire] || 0) + 1;
        });
      });

      // Test a few different grimoires
      Object.entries(grimoireCompatibilityCounts).forEach(([grimoireKey, expectedCount]) => {
        const result = getCompatibleAffixScripts(grimoireKey);
        expect(result.length).toBe(expectedCount);
      });
    });
  });

  describe('data consistency and relationships', () => {
    it('should have consistent grimoire naming across all mappings', () => {
      const allGrimoires = new Set<string>();

      Object.values(AFFIX_SCRIPT_BUFF_MAPPINGS).forEach((mapping) => {
        mapping.compatibleGrimoires.forEach((grimoire) => {
          allGrimoires.add(grimoire);
        });
      });

      // Check that grimoire names follow consistent kebab-case pattern
      Array.from(allGrimoires).forEach((grimoire) => {
        expect(grimoire).toMatch(/^[a-z][a-z0-9-]*[a-z0-9]$/);
        expect(grimoire).not.toContain('_');
        expect(grimoire).not.toContain(' ');
      });
    });

    it('should have meaningful descriptions', () => {
      Object.values(AFFIX_SCRIPT_BUFF_MAPPINGS).forEach((mapping) => {
        expect(mapping.description.length).toBeGreaterThan(10);
        expect(mapping.name.length).toBeGreaterThan(0);
      });
    });

    it('should have at least one effect ID per mapping', () => {
      Object.values(AFFIX_SCRIPT_BUFF_MAPPINGS).forEach((mapping) => {
        const totalEffects = mapping.buffIds.length + mapping.debuffIds.length;
        expect(totalEffects).toBeGreaterThan(0);
      });
    });

    it('should have at least one compatible grimoire per mapping', () => {
      Object.values(AFFIX_SCRIPT_BUFF_MAPPINGS).forEach((mapping) => {
        expect(mapping.compatibleGrimoires.length).toBeGreaterThan(0);
      });
    });
  });

  describe('integration with known ESO data', () => {
    it('should include major buff/debuff affix scripts', () => {
      // Check for common major buffs/debuffs that should be present
      const expectedAffixTypes = [
        'savagery-and-prophecy',
        'brutality-and-sorcery',
        'expedition',
        'resolve',
        'evasion',
        'vitality',
      ];

      expectedAffixTypes.forEach((affixType) => {
        expect(AFFIX_SCRIPT_BUFF_MAPPINGS).toHaveProperty(affixType);
      });
    });

    it('should have realistic buff/debuff ID ranges', () => {
      Object.values(AFFIX_SCRIPT_BUFF_MAPPINGS).forEach((mapping) => {
        [...mapping.buffIds, ...mapping.debuffIds].forEach((id) => {
          // ESO effect IDs are typically in reasonable ranges
          expect(id).toBeGreaterThan(0);
          expect(id).toBeLessThan(1000000); // Reasonable upper bound
        });
      });
    });

    it('should include commonly used grimoires', () => {
      const allGrimoires = new Set<string>();

      Object.values(AFFIX_SCRIPT_BUFF_MAPPINGS).forEach((mapping) => {
        mapping.compatibleGrimoires.forEach((grimoire) => {
          allGrimoires.add(grimoire);
        });
      });

      // Check for some expected common grimoires
      const expectedGrimoires = [
        'traveling-knife',
        'vault',
        'smash',
        'shield-throw',
        'elemental-explosion',
      ];

      expectedGrimoires.forEach((grimoire) => {
        expect(allGrimoires.has(grimoire)).toBe(true);
      });
    });
  });
});
