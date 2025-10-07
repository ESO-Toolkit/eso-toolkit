/**
 * Tests for AbilityScribingMapper functionality
 * 
 * Note: This test focuses on core functionality testing with mock data
 * to avoid complex file system and network dependencies.
 */

import { AbilityScribingMapper, AbilityScribingMapping, getAbilityScribingMapper, abilityScribingMapper } from './ability-scribing-mapping';

// Test setup for AbilityScribingMapper
// Instead of mocking complex dynamic imports, we'll use the test-specific createWithData method

// Sample scribing data for testing
const mockScribingData = {
  version: '1.0.0',
  lastUpdated: '2024-01-01',
  grimoires: {
    'scholars-quill': {
      id: 192001,
      name: "Scholar's Quill",
      nameTransformations: {
        'class-mastery': {
          name: 'Class Mastery Focus',
          abilityIds: [192101, 192102]
        },
        'traveling-knife': {
          name: 'Traveling Knife Focus',
          abilityIds: [192201, 192202]
        }
      }
    },
    'wield-soul': {
      id: 193001,
      name: 'Wield Soul',
      nameTransformations: {
        'vault': {
          name: 'Vault Focus',
          abilityIds: [193101]
        }
      }
    }
  },
  signatureScripts: {
    'runic-jolt': {
      name: 'Runic Jolt',
      description: 'Lightning damage signature',
      abilityIds: [194001, 194002],
      compatibleGrimoires: ['scholars-quill', 'wield-soul']
    },
    'frost-breath': {
      name: 'Frost Breath',
      description: 'Frost damage signature',
      abilityIds: [194101],
      compatibleGrimoires: ['wield-soul']
    }
  },
  affixScripts: {
    'minor-heroism': {
      name: 'Minor Heroism',
      description: 'Grants Minor Heroism buff',
      abilityIds: [195001],
      compatibleGrimoires: ['scholars-quill']
    },
    'lifesteal': {
      name: 'Lifesteal',
      description: 'Heals on damage',
      abilityIds: [195101, 195102],
      compatibleGrimoires: ['scholars-quill', 'wield-soul']
    }
  }
};

// Mock window object for environment detection
const originalWindow = global.window;

describe('AbilityScribingMapper', () => {
  describe('Constructor and Initialization', () => {
    it('should create and initialize mapper instance', () => {
      const mapper = AbilityScribingMapper.createWithData(mockScribingData);
      expect(mapper).toBeInstanceOf(AbilityScribingMapper);
      expect(mapper.isReady()).toBe(true);
    });
  });

  describe('Grimoire Mappings', () => {
    let mapper: AbilityScribingMapper;

    beforeEach(() => {
      mapper = AbilityScribingMapper.createWithData(mockScribingData);
    });

    it('should build grimoire mappings correctly', () => {
      const scholarsQuill = mapper.getGrimoireByAbilityId(192001);
      expect(scholarsQuill).toEqual({
        abilityId: 192001,
        type: 'grimoire',
        grimoireKey: 'scholars-quill',
        componentKey: 'scholars-quill',
        name: "Scholar's Quill",
        category: 'grimoire',
        description: "Base ability for Scholar's Quill grimoire"
      });

      const wieldSoul = mapper.getGrimoireByAbilityId(193001);
      expect(wieldSoul).toEqual({
        abilityId: 193001,
        type: 'grimoire',
        grimoireKey: 'wield-soul',
        componentKey: 'wield-soul',
        name: 'Wield Soul',
        category: 'grimoire',
        description: 'Base ability for Wield Soul grimoire'
      });
    });

    it('should return null for non-existent grimoire ability ID', () => {
      const result = mapper.getGrimoireByAbilityId(999999);
      expect(result).toBeNull();
    });

    it('should handle missing grimoires data gracefully', () => {
      const dataWithoutGrimoires = { ...mockScribingData };
      (dataWithoutGrimoires as any).grimoires = undefined;
      
      const mapper = AbilityScribingMapper.createWithData(dataWithoutGrimoires);
      
      const result = mapper.getGrimoireByAbilityId(192001);
      expect(result).toBeNull();
    });
  });

  describe('Transformation Mappings (Focus Scripts)', () => {
    let mapper: AbilityScribingMapper;

    beforeEach(() => {
      mapper = AbilityScribingMapper.createWithData(mockScribingData);
    });

    it('should build transformation mappings correctly', () => {
      const classMastery = mapper.getTransformationByAbilityId(192101);
      expect(classMastery).toEqual({
        abilityId: 192101,
        type: 'transformation',
        grimoireKey: 'scholars-quill',
        componentKey: 'class-mastery',
        name: 'Class Mastery Focus',
        category: 'focus-script',
        description: 'Class Mastery Focus (scholars-quill with class-mastery focus)'
      });

      const travelingKnife = mapper.getTransformationByAbilityId(192201);
      expect(travelingKnife).toEqual({
        abilityId: 192201,
        type: 'transformation',
        grimoireKey: 'scholars-quill',
        componentKey: 'traveling-knife',
        name: 'Traveling Knife Focus',
        category: 'focus-script',
        description: 'Traveling Knife Focus (scholars-quill with traveling-knife focus)'
      });
    });

    it('should handle multiple ability IDs for same transformation', () => {
      const classMastery1 = mapper.getTransformationByAbilityId(192101);
      const classMastery2 = mapper.getTransformationByAbilityId(192102);
      
      expect(classMastery1?.componentKey).toBe('class-mastery');
      expect(classMastery2?.componentKey).toBe('class-mastery');
      expect(classMastery1?.name).toBe(classMastery2?.name);
    });

    it('should return null for non-existent transformation ability ID', () => {
      const result = mapper.getTransformationByAbilityId(999999);
      expect(result).toBeNull();
    });

    it('should get focus script type correctly', () => {
      const focusType = mapper.getFocusScriptType('scholars-quill', 192101);
      expect(focusType).toBe('class-mastery');
      
      const nonExistent = mapper.getFocusScriptType('scholars-quill', 999999);
      expect(nonExistent).toBeNull();
      
      const wrongGrimoire = mapper.getFocusScriptType('wrong-grimoire', 192101);
      expect(wrongGrimoire).toBeNull();
    });
  });

  describe('Signature Script Mappings', () => {
    let mapper: AbilityScribingMapper;

    beforeEach(() => {
      mapper = AbilityScribingMapper.createWithData(mockScribingData);
    });

    it('should build signature mappings correctly', () => {
      const runicJolt = mapper.getSignatureByAbilityId(194001);
      expect(runicJolt?.type).toBe('signature');
      expect(runicJolt?.componentKey).toBe('runic-jolt');
      expect(runicJolt?.name).toBe('Runic Jolt');
      expect(runicJolt?.category).toBe('signature-script');
      expect(runicJolt?.description).toBe('Lightning damage signature');
    });

    it('should handle signature scripts with multiple compatible grimoires', () => {
      // Runic Jolt is compatible with both grimoires, so we should get mappings for both
      const allRunicJoltMappings = mapper.getScribingComponent(194001);
      expect(allRunicJoltMappings.length).toBeGreaterThan(0);
      
      const signatureMapping = allRunicJoltMappings.find((m: AbilityScribingMapping) => m.type === 'signature');
      expect(signatureMapping).toBeDefined();
      expect(['scholars-quill', 'wield-soul']).toContain(signatureMapping!.grimoireKey);
    });

    it('should return null for non-existent signature ability ID', () => {
      const result = mapper.getSignatureByAbilityId(999999);
      expect(result).toBeNull();
    });

    it('should handle missing signature scripts data gracefully', () => {
      const dataWithoutSignatures = { ...mockScribingData };
      (dataWithoutSignatures as any).signatureScripts = undefined;
      
      const mapper = AbilityScribingMapper.createWithData(dataWithoutSignatures);
      
      const result = mapper.getSignatureByAbilityId(194001);
      expect(result).toBeNull();
    });
  });

  describe('Affix Script Mappings', () => {
    let mapper: AbilityScribingMapper;

    beforeEach(() => {
      mapper = AbilityScribingMapper.createWithData(mockScribingData);
    });

    it('should build affix mappings correctly', () => {
      const minorHeroism = mapper.getAffixByAbilityId(195001);
      expect(minorHeroism?.type).toBe('affix');
      expect(minorHeroism?.componentKey).toBe('minor-heroism');
      expect(minorHeroism?.name).toBe('Minor Heroism');
      expect(minorHeroism?.category).toBe('affix-script');
      expect(minorHeroism?.description).toBe('Grants Minor Heroism buff');
    });

    it('should handle affix scripts with multiple ability IDs', () => {
      const lifesteal1 = mapper.getAffixByAbilityId(195101);
      const lifesteal2 = mapper.getAffixByAbilityId(195102);
      
      expect(lifesteal1?.componentKey).toBe('lifesteal');
      expect(lifesteal2?.componentKey).toBe('lifesteal');
      expect(lifesteal1?.name).toBe(lifesteal2?.name);
    });

    it('should return null for non-existent affix ability ID', () => {
      const result = mapper.getAffixByAbilityId(999999);
      expect(result).toBeNull();
    });

    it('should handle missing affix scripts data gracefully', () => {
      const dataWithoutAffixes = { ...mockScribingData };
      (dataWithoutAffixes as any).affixScripts = undefined;
      
      const mapper = AbilityScribingMapper.createWithData(dataWithoutAffixes);
      
      const result = mapper.getAffixByAbilityId(195001);
      expect(result).toBeNull();
    });
  });

  describe('Combined Lookups and Utilities', () => {
    let mapper: AbilityScribingMapper;

    beforeEach(() => {
      mapper = AbilityScribingMapper.createWithData(mockScribingData);
    });

    it('should return all scribing components for an ability ID', () => {
      const components = mapper.getScribingComponent(194001);
      expect(Array.isArray(components)).toBe(true);
      expect(components.length).toBeGreaterThan(0);
      
      const signatureMapping = components.find((c: AbilityScribingMapping) => c.type === 'signature');
      expect(signatureMapping).toBeDefined();
    });

    it('should return empty array for non-scribing ability ID', () => {
      const components = mapper.getScribingComponent(999999);
      expect(components).toEqual([]);
    });

    it('should correctly identify scribing abilities', () => {
      expect(mapper.isScribingAbility(192001)).toBe(true); // Grimoire
      expect(mapper.isScribingAbility(192101)).toBe(true); // Transformation
      expect(mapper.isScribingAbility(194001)).toBe(true); // Signature
      expect(mapper.isScribingAbility(195001)).toBe(true); // Affix
      expect(mapper.isScribingAbility(999999)).toBe(false); // Non-existent
    });

    it('should get all ability IDs for a grimoire', () => {
      const abilityIds = mapper.getAbilityIdsForGrimoire('scholars-quill');
      
      expect(abilityIds).toContain(192001); // Base grimoire
      expect(abilityIds).toContain(192101); // Class mastery transformation
      expect(abilityIds).toContain(192201); // Traveling knife transformation
      expect(abilityIds).toContain(194001); // Runic jolt signature (compatible)
      expect(abilityIds).toContain(195001); // Minor heroism affix
      
      // Should not contain duplicates
      const uniqueIds = [...new Set(abilityIds)];
      expect(abilityIds.length).toBe(uniqueIds.length);
    });

    it('should return empty array for non-existent grimoire', () => {
      const abilityIds = mapper.getAbilityIdsForGrimoire('non-existent');
      expect(abilityIds).toEqual([]);
    });

    it('should export mappings correctly', () => {
      const exported = mapper.exportMappings();
      
      expect(exported.stats).toBeDefined();
      expect(exported.stats.totalGrimoires).toBe(2);
      expect(exported.stats.totalTransformations).toBeGreaterThan(0);
      expect(exported.stats.totalSignatures).toBeGreaterThan(0);
      expect(exported.stats.totalAffixes).toBeGreaterThan(0);
      expect(exported.stats.totalMappings).toBeGreaterThan(0);
      
      expect(exported.grimoires).toBeDefined();
      expect(exported.transformations).toBeDefined();
      expect(exported.signatures).toBeDefined();
      expect(exported.affixes).toBeDefined();
    });

    it('should return correct statistics', () => {
      const stats = mapper.getStats();
      
      expect(stats.totalGrimoires).toBe(2);
      expect(stats.totalTransformations).toBeGreaterThan(0);
      expect(stats.totalSignatures).toBeGreaterThan(0);
      expect(stats.totalAffixes).toBeGreaterThan(0);
      expect(stats.totalMappings).toBeGreaterThan(0);
      expect(stats.databaseVersion).toBe('1.0.0');
      expect(stats.lastUpdated).toBe('2024-01-01');
    });

    it('should handle empty scribing data', () => {
      const mapper = AbilityScribingMapper.createWithData({});
      
      const stats = mapper.getStats();
      expect(stats.totalGrimoires).toBe(0);
      expect(stats.totalTransformations).toBe(0);
      expect(stats.totalSignatures).toBe(0);
      expect(stats.totalAffixes).toBe(0);
      expect(stats.totalMappings).toBe(0);
      expect(stats.databaseVersion).toBe('unknown');
      expect(stats.lastUpdated).toBe('unknown');
    });
  });

  describe('Singleton and Factory Functions', () => {
    beforeEach(() => {
      delete (global as any).window;
    });

    it.skip('should create singleton instance through getAbilityScribingMapper', async () => {
      const mapper1 = await getAbilityScribingMapper();
      const mapper2 = await getAbilityScribingMapper();
      
      expect(mapper1).toBe(mapper2); // Same instance
      expect(mapper1.isReady()).toBe(true);
    });

    it.skip('should handle lazy initialization through abilityScribingMapper', async () => {
      const component = await abilityScribingMapper.getScribingComponent(192001);
      expect(Array.isArray(component)).toBe(true);
      
      const ready = await abilityScribingMapper.isReady();
      expect(ready).toBe(true);
    });

    it.skip('should provide all lazy wrapper methods', async () => {
      const grimoire = await abilityScribingMapper.getGrimoireByAbilityId(192001);
      expect(grimoire).not.toBeNull();
      
      const transformation = await abilityScribingMapper.getTransformationByAbilityId(192101);
      expect(transformation).not.toBeNull();
      
      const signature = await abilityScribingMapper.getSignatureByAbilityId(194001);
      expect(signature).not.toBeNull();
      
      const affix = await abilityScribingMapper.getAffixByAbilityId(195001);
      expect(affix).not.toBeNull();
      
      const stats = await abilityScribingMapper.getStats();
      expect(stats).toBeDefined();
      
      const abilityIds = await abilityScribingMapper.getAbilityIdsForGrimoire('scholars-quill');
      expect(Array.isArray(abilityIds)).toBe(true);
      
      const focusType = await abilityScribingMapper.getFocusScriptType('scholars-quill', 192101);
      expect(focusType).toBe('class-mastery');
    });
  });

  describe('Edge Cases and Error Handling', () => {
    it('should handle missing nameTransformations gracefully', () => {
      const dataWithoutTransformations = {
        ...mockScribingData,
        grimoires: {
          'test-grimoire': {
            id: 999001,
            name: 'Test Grimoire'
            // No nameTransformations
          }
        }
      };
      
      const mapper = AbilityScribingMapper.createWithData(dataWithoutTransformations);
      const transformation = mapper.getTransformationByAbilityId(192101);
      expect(transformation).toBeNull();
    });

    it('should handle invalid abilityIds arrays gracefully', () => {
      const dataWithInvalidIds = {
        ...mockScribingData,
        signatureScripts: {
          'test-signature': {
            name: 'Test Signature',
            abilityIds: 'not-an-array', // Invalid format
            compatibleGrimoires: ['scholars-quill']
          }
        }
      };
      
      const mapper = AbilityScribingMapper.createWithData(dataWithInvalidIds);
      // Should not crash, just not add invalid mappings
      expect(mapper.isReady()).toBe(true);
    });

    it('should handle missing compatibleGrimoires gracefully', () => {
      const dataWithoutCompatible = {
        ...mockScribingData,
        signatureScripts: {
          'test-signature': {
            name: 'Test Signature',
            abilityIds: [999001]
            // No compatibleGrimoires
          }
        }
      };
      
      const mapper = AbilityScribingMapper.createWithData(dataWithoutCompatible);
      const signature = mapper.getSignatureByAbilityId(999001);
      expect(signature).toBeNull(); // Should not create mappings without compatible grimoires
    });
  });
});
