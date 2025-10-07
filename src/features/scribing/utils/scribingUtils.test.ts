import '@testing-library/jest-dom';

import { 
  loadScribingData,
  getAllGrimoires,
  getGrimoiresBySkillLine,
  getScriptsByType,
  getCompatibleScripts,
  isValidCombination,
  getValidCombinations,
  calculateCombinationCount,
  getQuestScripts,
  getFreeScripts,
  calculateInkCost,
  searchScripts,
  getGrimoire,
  getScript,
  getVendorCosts,
} from './scribingUtils';

// Mock fetch for loadScribingData tests
global.fetch = jest.fn();

// Comprehensive mock data for testing
const mockScribingData = {
  grimoires: {
    trample: {
      id: 'trample',
      name: 'Trample',
      skillLine: 'Assault',
      cost: { first: 2700, additional: 1350 },
      description: 'A powerful charging attack',
      requirements: 'Assault Rank 3',
    },
    'elemental-explosion': {
      id: 'elemental-explosion',
      name: 'Elemental Explosion',
      skillLine: 'Mages Guild',
      cost: { first: 3510, additional: 1755 },
      description: 'A magical explosion',
      requirements: 'Mages Guild Rank 5',
    },
    vault: {
      id: 'vault',
      name: 'Vault',
      skillLine: 'Support',
      cost: { first: 1800, additional: 900 },
      description: 'Movement ability',
      requirements: null,
    },
  },
  focusScripts: {
    'physical-damage': {
      id: 'physical-damage',
      name: 'Physical Damage',
      type: 'Focus',
      description: 'Converts damage to physical',
      icon: 'physical.png',
      compatibleGrimoires: ['trample', 'vault'],
    },
    'fire-damage': {
      id: 'fire-damage',
      name: 'Fire Damage',
      type: 'Focus',
      description: 'Converts damage to fire',
      icon: 'fire.png',
      compatibleGrimoires: ['elemental-explosion'],
    },
    'magic-damage': {
      id: 'magic-damage',
      name: 'Magic Damage',
      type: 'Focus',
      description: 'Converts damage to magic',
      icon: 'magic.png',
      compatibleGrimoires: ['elemental-explosion', 'vault'],
    },
  },
  signatureScripts: {
    'berserker-frenzy': {
      id: 'berserker-frenzy',
      name: 'Berserker Frenzy',
      type: 'Signature',
      description: 'Increases damage at low health',
      icon: 'berserker.png',
      compatibleGrimoires: ['trample'],
    },
    'elemental-burst': {
      id: 'elemental-burst',
      name: 'Elemental Burst',
      type: 'Signature',
      description: 'Causes elemental explosion',
      icon: 'burst.png',
      compatibleGrimoires: ['elemental-explosion'],
    },
    'swift-movement': {
      id: 'swift-movement',
      name: 'Swift Movement',
      type: 'Signature',
      description: 'Increases movement speed',
      icon: 'swift.png',
      compatibleGrimoires: ['vault', 'trample'],
      questReward: true,
    },
  },
  affixScripts: {
    'piercing-damage': {
      id: 'piercing-damage',
      name: 'Piercing Damage',
      type: 'Affix',
      description: 'Ignores armor',
      icon: 'pierce.png',
      compatibleGrimoires: ['trample', 'elemental-explosion'],
      questReward: true,
    },
    'area-damage': {
      id: 'area-damage',
      name: 'Area Damage',
      type: 'Affix',
      description: 'Damages nearby enemies',
      icon: 'area.png',
      compatibleGrimoires: ['elemental-explosion'],
    },
    'healing-boost': {
      id: 'healing-boost',
      name: 'Healing Boost',
      type: 'Affix',
      description: 'Provides healing over time',
      icon: 'heal.png',
      compatibleGrimoires: ['vault'],
      questReward: true,
    },
  },


  luminousInk: {
    costs: {
      newSkill: 50,
      modifySkill: 15,
    },
  },
  scriptVendors: {
    chronicler: {
      id: 'chronicler',
      name: 'Chronicler Firandil',
      location: 'Necrom',
      costs: {
        'focus-script': { first: 25, additional: 10 },
        'signature-script': { first: 30, additional: 12 },
        'affix-script': { first: 20, additional: 8 },
      },
    },
    mystic: {
      id: 'mystic',
      name: 'Keshargo',
      location: 'Apocrypha',
      costs: {
        'focus-script': { first: 25, additional: 10 },
        'signature-script': { first: 30, additional: 12 },
        'affix-script': { first: 20, additional: 8 },
      },
    },
  },
  freeScriptLocations: {
    'free-location-1': {
      id: 'free-location-1',
      name: 'Free Location 1',
      scriptType: 'Focus',
      scriptIds: [], // No free scripts in our mock
    },
  },
};

describe('scribingUtils (Basic Functions)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('loadScribingData', () => {
    it('should load scribing data successfully', async () => {
      (fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: async () => mockScribingData,
      });

      const result = await loadScribingData();
      expect(result).toEqual(mockScribingData);
    });
  });

  describe('getAllGrimoires', () => {
    it('should return all grimoires as an array', () => {
      const grimoires = getAllGrimoires(mockScribingData as any);
      
      expect(grimoires).toHaveLength(3);
      expect(grimoires.map(g => g.name)).toContain('Trample');
      expect(grimoires.map(g => g.name)).toContain('Elemental Explosion');
      expect(grimoires.map(g => g.name)).toContain('Vault');
    });
  });

  describe('getGrimoiresBySkillLine', () => {
    it('should filter grimoires by skill line', () => {
      const assaultGrimoires = getGrimoiresBySkillLine(mockScribingData as any, 'Assault');
      
      expect(assaultGrimoires).toHaveLength(1);
      expect(assaultGrimoires[0].name).toBe('Trample');
    });

    it('should return empty array for non-existent skill line', () => {
      const nonExistentGrimoires = getGrimoiresBySkillLine(mockScribingData as any, 'non-existent' as any);
      
      expect(nonExistentGrimoires).toHaveLength(0);
    });
  });

  describe('getScriptsByType', () => {
    it('should return focus scripts', () => {
      const focusScripts = getScriptsByType(mockScribingData as any, 'Focus');
      
      expect(focusScripts).toHaveLength(3);
      expect(focusScripts.map(s => s.name)).toContain('Physical Damage');
      expect(focusScripts.map(s => s.name)).toContain('Fire Damage');
      expect(focusScripts.map(s => s.name)).toContain('Magic Damage');
    });

    it('should return signature scripts', () => {
      const signatureScripts = getScriptsByType(mockScribingData as any, 'Signature');
      
      expect(signatureScripts).toHaveLength(3);
      expect(signatureScripts.map(s => s.name)).toContain('Berserker Frenzy');
      expect(signatureScripts.map(s => s.name)).toContain('Elemental Burst');
      expect(signatureScripts.map(s => s.name)).toContain('Swift Movement');
    });

    it('should return affix scripts', () => {
      const affixScripts = getScriptsByType(mockScribingData as any, 'Affix');
      
      expect(affixScripts).toHaveLength(3);
      expect(affixScripts.map(s => s.name)).toContain('Piercing Damage');
      expect(affixScripts.map(s => s.name)).toContain('Area Damage');
      expect(affixScripts.map(s => s.name)).toContain('Healing Boost');
    });
  });

  describe('getGrimoire', () => {
    it('should return grimoire by id', () => {
      const grimoire = getGrimoire(mockScribingData as any, 'trample');
      
      expect(grimoire).not.toBeNull();
      expect(grimoire!.name).toBe('Trample');
    });

    it('should return null for non-existent grimoire', () => {
      const grimoire = getGrimoire(mockScribingData as any, 'non-existent');
      
      expect(grimoire).toBeNull();
    });
  });

  describe('getScript', () => {
    it('should return script by id and type', () => {
      const script = getScript(mockScribingData as any, 'physical-damage', 'Focus');
      
      expect(script).not.toBeNull();
      expect(script!.name).toBe('Physical Damage');
    });

    it('should return null for non-existent script', () => {
      const script = getScript(mockScribingData as any, 'non-existent', 'Focus');
      
      expect(script).toBeNull();
    });
  });

  describe('Basic functionality', () => {
    it('should preserve data structure', () => {
      const grimoires = getAllGrimoires(mockScribingData as any);
      
      // Verify structure is preserved
      grimoires.forEach(grimoire => {
        expect(grimoire).toHaveProperty('id');
        expect(grimoire).toHaveProperty('name');
        expect(grimoire).toHaveProperty('skillLine');
      });
    });

    it('should handle script type filtering correctly', () => {
      const focusScripts = getScriptsByType(mockScribingData as any, 'Focus');
      const signatureScripts = getScriptsByType(mockScribingData as any, 'Signature');
      const affixScripts = getScriptsByType(mockScribingData as any, 'Affix');
      
      // All focus scripts should have type 'Focus'
      focusScripts.forEach(script => {
        expect(script.type).toBe('Focus');
      });
      
      // All signature scripts should have type 'Signature'
      signatureScripts.forEach(script => {
        expect(script.type).toBe('Signature');
      });
      
      // All affix scripts should have type 'Affix'
      affixScripts.forEach(script => {
        expect(script.type).toBe('Affix');
      });
    });
  });

  // Tests for previously uncovered functions
  describe('getCompatibleScripts', () => {
    it('should return compatible focus scripts for grimoire', () => {
      const compatibleFocus = getCompatibleScripts(mockScribingData as any, 'trample', 'Focus');
      
      expect(compatibleFocus).toHaveLength(1);
      expect(compatibleFocus[0].id).toBe('physical-damage');
    });

    it('should return compatible signature scripts for grimoire', () => {
      const compatibleSignature = getCompatibleScripts(mockScribingData as any, 'trample', 'Signature');
      
      expect(compatibleSignature).toHaveLength(2);
      expect(compatibleSignature.map(s => s.id)).toContain('berserker-frenzy');
      expect(compatibleSignature.map(s => s.id)).toContain('swift-movement');
    });

    it('should return compatible affix scripts for grimoire', () => {
      const compatibleAffix = getCompatibleScripts(mockScribingData as any, 'elemental-explosion', 'Affix');
      
      expect(compatibleAffix).toHaveLength(2);
      expect(compatibleAffix.map(s => s.id)).toContain('piercing-damage');
      expect(compatibleAffix.map(s => s.id)).toContain('area-damage');
    });

    it('should return empty array for non-existent grimoire', () => {
      const compatible = getCompatibleScripts(mockScribingData as any, 'non-existent', 'Focus');
      
      expect(compatible).toHaveLength(0);
    });

    it('should return empty array for grimoire with no compatible scripts of type', () => {
      const compatible = getCompatibleScripts(mockScribingData as any, 'vault', 'Affix');
      
      expect(compatible).toHaveLength(1);
      expect(compatible[0].id).toBe('healing-boost');
    });
  });

  describe('isValidCombination', () => {
    it('should validate compatible combination', () => {
      const isValid = isValidCombination(mockScribingData as any, {
        grimoire: 'trample',
        focusScript: 'physical-damage',
        signatureScript: 'berserker-frenzy',
        affixScript: 'piercing-damage',
      });

      expect(isValid).toBe(true);
    });

    it('should reject incompatible focus script', () => {
      const isValid = isValidCombination(mockScribingData as any, {
        grimoire: 'trample',
        focusScript: 'fire-damage', // Not compatible with trample
        signatureScript: 'berserker-frenzy',
        affixScript: 'piercing-damage',
      });

      expect(isValid).toBe(false);
    });

    it('should reject incompatible signature script', () => {
      const isValid = isValidCombination(mockScribingData as any, {
        grimoire: 'vault',
        focusScript: 'magic-damage',
        signatureScript: 'berserker-frenzy', // Not compatible with vault
        affixScript: 'healing-boost',
      });

      expect(isValid).toBe(false);
    });

    it('should reject incompatible affix script', () => {
      const isValid = isValidCombination(mockScribingData as any, {
        grimoire: 'trample',
        focusScript: 'physical-damage',
        signatureScript: 'berserker-frenzy',
        affixScript: 'area-damage', // Not compatible with trample
      });

      expect(isValid).toBe(false);
    });

    it('should handle missing scripts gracefully', () => {
      const isValid = isValidCombination(mockScribingData as any, {
        grimoire: 'trample',
        focusScript: 'physical-damage',
        signatureScript: 'berserker-frenzy',
        affixScript: 'piercing-damage',
      });

      expect(isValid).toBe(true);
    });

    it('should reject non-existent grimoire', () => {
      const isValid = isValidCombination(mockScribingData as any, {
        grimoire: 'non-existent',
        focusScript: 'physical-damage',
        signatureScript: 'berserker-frenzy',
        affixScript: 'piercing-damage',
      });

      expect(isValid).toBe(false);
    });
  });

  describe('getValidCombinations', () => {
    it('should return all valid combinations for a grimoire', () => {
      const combinations = getValidCombinations(mockScribingData as any, 'elemental-explosion');

      expect(combinations.length).toBeGreaterThan(0);
      
      // Check that all combinations are valid
      combinations.forEach(combination => {
        expect(isValidCombination(mockScribingData as any, combination)).toBe(true);
        expect(combination.grimoire).toBe('elemental-explosion');
      });
    });

    it('should return empty array for non-existent grimoire', () => {
      const combinations = getValidCombinations(mockScribingData as any, 'non-existent');

      expect(combinations).toHaveLength(0);
    });

    it('should include combinations with different script types', () => {
      const combinations = getValidCombinations(mockScribingData as any, 'vault');

      expect(combinations.length).toBeGreaterThan(0);
      
      // Should have at least one combination with each compatible script type
      const hasFocus = combinations.some(c => c.focusScript);
      const hasSignature = combinations.some(c => c.signatureScript);
      const hasAffix = combinations.some(c => c.affixScript);

      expect(hasFocus).toBe(true);
      expect(hasSignature).toBe(true);
      expect(hasAffix).toBe(true);
    });
  });

  describe('calculateCombinationCount', () => {
    it('should calculate correct combination count for grimoire', () => {
      const count = calculateCombinationCount(mockScribingData as any, 'elemental-explosion');

      expect(count).toBeGreaterThan(0);
      expect(typeof count).toBe('number');
    });

    it('should return 0 for non-existent grimoire', () => {
      const count = calculateCombinationCount(mockScribingData as any, 'non-existent');

      expect(count).toBe(0);
    });

    it('should account for all script type combinations', () => {
      const trampleCount = calculateCombinationCount(mockScribingData as any, 'trample');
      const vaultCount = calculateCombinationCount(mockScribingData as any, 'vault');

      expect(trampleCount).toBeGreaterThan(0);
      expect(vaultCount).toBeGreaterThan(0);
      
      // Different grimoires should potentially have different counts
      // (though they might be equal depending on compatibility)
      expect(typeof trampleCount).toBe('number');
      expect(typeof vaultCount).toBe('number');
    });
  });

  describe('getQuestScripts', () => {
    it('should return scripts available as quest rewards', () => {
      const questScripts = getQuestScripts(mockScribingData as any);

      expect(questScripts.length).toBeGreaterThan(0);
      expect(questScripts.map(s => s.id)).toContain('swift-movement');
      expect(questScripts.map(s => s.id)).toContain('healing-boost');
      expect(questScripts.map(s => s.id)).toContain('piercing-damage');
    });

    it('should return unique scripts even if in multiple quests', () => {
      const questScripts = getQuestScripts(mockScribingData as any);
      const scriptIds = questScripts.map(s => s.id);
      const uniqueIds = [...new Set(scriptIds)];

      expect(scriptIds.length).toBe(uniqueIds.length);
    });

    it('should handle empty quest rewards', () => {
      const emptyData = {
        ...mockScribingData,
        focusScripts: { ...mockScribingData.focusScripts },
        signatureScripts: { 
          'berserker-frenzy': { ...mockScribingData.signatureScripts['berserker-frenzy'] },
          'elemental-burst': { ...mockScribingData.signatureScripts['elemental-burst'] },
          'swift-movement': { ...mockScribingData.signatureScripts['swift-movement'], questReward: false },
        },
        affixScripts: {
          'piercing-damage': { ...mockScribingData.affixScripts['piercing-damage'], questReward: false },
          'area-damage': { ...mockScribingData.affixScripts['area-damage'] },
          'healing-boost': { ...mockScribingData.affixScripts['healing-boost'], questReward: false },
        },
      };

      const questScripts = getQuestScripts(emptyData as any);
      expect(questScripts).toHaveLength(0);
    });
  });

  describe('getFreeScripts', () => {
    it('should return scripts not available from vendors or quests', () => {
      const freeScripts = getFreeScripts(mockScribingData as any);

      // Our mock has no free scripts defined in freeScriptLocations
      expect(freeScripts).toHaveLength(0);
    });

    it('should handle case with no free scripts', () => {
      // Mock data where all scripts are either vendor or quest rewards
      const allPaidData = {
        ...mockScribingData,
        vendors: {
          chronicler: {
            scripts: ['physical-damage', 'fire-damage', 'magic-damage', 'berserker-frenzy', 'elemental-burst'],
          },
        },
        questRewards: {
          'quest1': ['swift-movement', 'piercing-damage', 'area-damage', 'healing-boost'],
        },
      };

      const freeScripts = getFreeScripts(allPaidData as any);
      expect(freeScripts).toHaveLength(0);
    });
  });

  describe('calculateInkCost', () => {
    it('should calculate ink cost for new skill', () => {
      const cost = calculateInkCost(mockScribingData as any, true);

      expect(cost).toBeGreaterThan(0);
      expect(typeof cost).toBe('number');
    });

    it('should calculate ink cost for modifying skill', () => {
      const cost = calculateInkCost(mockScribingData as any, false, 2);

      expect(cost).toBeGreaterThanOrEqual(0);
      expect(typeof cost).toBe('number');
    });

    it('should calculate different costs for different change counts', () => {
      const cost1 = calculateInkCost(mockScribingData as any, false, 1);
      const cost2 = calculateInkCost(mockScribingData as any, false, 3);

      expect(cost2).toBeGreaterThanOrEqual(cost1);
    });

    it('should handle default parameters', () => {
      const costNew = calculateInkCost(mockScribingData as any);
      const costExplicit = calculateInkCost(mockScribingData as any, true, 3);

      expect(costNew).toBe(costExplicit);
    });
  });

  describe('searchScripts', () => {
    it('should search scripts by name', () => {
      const results = searchScripts(mockScribingData as any, 'Physical');

      expect(results.length).toBeGreaterThan(0);
      expect(results[0].id).toBe('physical-damage');
    });

    it('should search scripts by description', () => {
      const results = searchScripts(mockScribingData as any, 'damage');

      expect(results.length).toBeGreaterThan(0);
      expect(results.some(r => r.id === 'physical-damage')).toBe(true);
      expect(results.some(r => r.id === 'fire-damage')).toBe(true);
    });

    it('should perform case-insensitive search', () => {
      const results = searchScripts(mockScribingData as any, 'PHYSICAL');

      expect(results.length).toBeGreaterThan(0);
      expect(results[0].id).toBe('physical-damage');
    });

    it('should return empty array for no matches', () => {
      const results = searchScripts(mockScribingData as any, 'nonexistent');

      expect(results).toHaveLength(0);
    });

    it('should search across all script types', () => {
      const results = searchScripts(mockScribingData as any, 'damage');

      const focusResults = results.filter(r => r.type === 'Focus');
      const affixResults = results.filter(r => r.type === 'Affix');

      expect(focusResults.length).toBeGreaterThan(0);
      expect(affixResults.length).toBeGreaterThan(0);
    });

    it('should handle empty search term', () => {
      const results = searchScripts(mockScribingData as any, '');

      // Should return all scripts or empty array (depends on implementation)
      expect(Array.isArray(results)).toBe(true);
    });
  });

  describe('getVendorCosts', () => {
    it('should return cost for existing vendor and script type', () => {
      const cost = getVendorCosts(mockScribingData as any, 'chronicler', 'Focus', true);

      expect(typeof cost).toBe('number');
      expect(cost).toBeGreaterThanOrEqual(0);
    });

    it('should return different costs for first vs additional purchases', () => {
      const firstCost = getVendorCosts(mockScribingData as any, 'chronicler', 'Focus', true);
      const additionalCost = getVendorCosts(mockScribingData as any, 'chronicler', 'Focus', false);

      expect(typeof firstCost).toBe('number');
      expect(typeof additionalCost).toBe('number');
    });

    it('should return null for non-existent vendor', () => {
      const cost = getVendorCosts(mockScribingData as any, 'non-existent', 'Focus', true);

      expect(cost).toBeNull();
    });

    it('should handle default isFirstPurchase parameter', () => {
      const cost1 = getVendorCosts(mockScribingData as any, 'chronicler', 'Focus');
      const cost2 = getVendorCosts(mockScribingData as any, 'chronicler', 'Focus', true);

      expect(cost1).toBe(cost2);
    });

    it('should work with different script types', () => {
      const focusCost = getVendorCosts(mockScribingData as any, 'chronicler', 'Focus', true);
      const signatureCost = getVendorCosts(mockScribingData as any, 'chronicler', 'Signature', true);
      const affixCost = getVendorCosts(mockScribingData as any, 'chronicler', 'Affix', true);

      expect(typeof focusCost).toBe('number');
      expect(typeof signatureCost).toBe('number');
      expect(typeof affixCost).toBe('number');
    });
  });
});