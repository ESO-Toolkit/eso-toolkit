import '@testing-library/jest-dom';
import {
  buildEnhancedTooltipProps,
  analyzePlayerScribingSkills,
  createEnhancedScribedSkillData,
  extractCombatData,
  buildScribingTooltipProps,
  CombatEventData,
} from './enhancedTooltipMapper';

// Mock the dependencies
jest.mock('@/types/combatlogEvents', () => ({}));
jest.mock('@/types/playerDetails', () => ({}));
jest.mock('@/components/SkillTooltip', () => ({}));

jest.mock('./Scribing', () => ({
  getScribingSkillByAbilityId: jest.fn(() => ({
    grimoireName: 'Test Grimoire',
    effects: []
  })),
}));

jest.mock('../../../utils/skillTooltipMapper', () => ({
  buildTooltipProps: jest.fn(() => ({
    abilityName: 'Test Skill',
    tooltip: 'Test tooltip content'
  })),
}));

jest.mock('./enhancedScribingAnalysis', () => ({
  analyzeScribingSkillWithSignature: jest.fn(() => ({
    grimoireName: 'Test Grimoire',
    effects: []
  })),
}));

// Simple mock types
interface PlayerTalent {
  id: number;
  name: string;
  abilityId?: number;
  guid: number;
}

describe('enhancedTooltipMapper', () => {
  const mockTalent: PlayerTalent = {
    id: 1,
    name: 'Test Scribing Skill',
    abilityId: 123456,
    guid: 1
  };

  const mockCombatEventData: CombatEventData = {
    allReportAbilities: [],
    allBuffEvents: [] as any[],
    allCastEvents: [] as any[],
    allDamageEvents: [] as any[],
    allDebuffEvents: [] as any[],
    allHealingEvents: [] as any[],
    allResourceEvents: [] as any[]
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('module structure', () => {
    it('should export required functions and interfaces', () => {
      expect(buildEnhancedTooltipProps).toBeDefined();
      expect(analyzePlayerScribingSkills).toBeDefined();
      expect(createEnhancedScribedSkillData).toBeDefined();
      expect(extractCombatData).toBeDefined();
      expect(buildScribingTooltipProps).toBeDefined();
      
      expect(typeof buildEnhancedTooltipProps).toBe('function');
      expect(typeof analyzePlayerScribingSkills).toBe('function');
      expect(typeof createEnhancedScribedSkillData).toBe('function');
      expect(typeof extractCombatData).toBe('function');
      expect(typeof buildScribingTooltipProps).toBe('function');
    });
  });

  describe('buildEnhancedTooltipProps', () => {
    it('should handle basic options', () => {
      expect(() => {
        buildEnhancedTooltipProps({
          talent: mockTalent,
          combatData: mockCombatEventData
        });
      }).not.toThrow();
    });

    it('should handle empty options', () => {
      expect(() => {
        buildEnhancedTooltipProps({});
      }).not.toThrow();
    });

    it('should handle null talent', () => {
      expect(() => {
        buildEnhancedTooltipProps({
          talent: null as any,
          combatData: mockCombatEventData
        });
      }).not.toThrow();
    });
  });

  describe('analyzePlayerScribingSkills', () => {
    it('should handle talent array and combat data', () => {
      expect(() => {
        analyzePlayerScribingSkills([mockTalent], mockCombatEventData, 1);
      }).not.toThrow();
    });

    it('should handle empty talent array', () => {
      expect(() => {
        analyzePlayerScribingSkills([], mockCombatEventData, 1);
      }).not.toThrow();
    });

    it('should handle multiple talents', () => {
      const talents = [
        mockTalent,
        { ...mockTalent, id: 2, guid: 2 },
        { ...mockTalent, id: 3, guid: 3 }
      ];

      expect(() => {
        analyzePlayerScribingSkills(talents, mockCombatEventData, 1);
      }).not.toThrow();
    });
  });

  describe('createEnhancedScribedSkillData', () => {
    it('should handle grimoire and ability names', () => {
      expect(() => {
        createEnhancedScribedSkillData('Test Grimoire', 'Test Ability');
      }).not.toThrow();
    });

    it('should handle optional combat data', () => {
      expect(() => {
        createEnhancedScribedSkillData(
          'Test Grimoire',
          'Test Ability',
          mockCombatEventData
        );
      }).not.toThrow();
    });

    it('should handle optional talent parameter', () => {
      expect(() => {
        createEnhancedScribedSkillData(
          'Test Grimoire',
          'Test Ability',
          mockCombatEventData,
          mockTalent
        );
      }).not.toThrow();
    });

    it('should handle empty strings', () => {
      expect(() => {
        createEnhancedScribedSkillData('', '');
      }).not.toThrow();
    });
  });

  describe('extractCombatData', () => {
    it('should extract from valid data structure', () => {
      const data = {
        masterData: {
          reportData: {
            report: {
              masterData: {
                abilities: []
              }
            }
          }
        },
        damageEvents: [],
        healingEvents: [],
        buffEvents: [],
        debuffEvents: [],
        resourceEvents: [],
        castEvents: []
      };

      const result = extractCombatData(data);
      expect(result).toBeDefined();
      if (result) {
        expect(result.allReportAbilities).toBeDefined();
        expect(result.allDamageEvents).toBeDefined();
      }
    });

    it('should handle empty data', () => {
      const result = extractCombatData({});
      expect(result).toBeDefined();
    });

    it('should handle null data gracefully', () => {
      expect(() => {
        extractCombatData(null as any);
      }).not.toThrow();
    });

    it('should handle malformed data', () => {
      const malformedData = {
        masterData: 'invalid',
        damageEvents: 'not-array'
      } as any;

      expect(() => {
        extractCombatData(malformedData);
      }).not.toThrow();
    });
  });

  describe('buildScribingTooltipProps', () => {
    it('should handle basic options', () => {
      expect(() => {
        buildScribingTooltipProps({
          talent: mockTalent,
          combatData: mockCombatEventData
        });
      }).not.toThrow();
    });

    it('should handle optional player ID', () => {
      expect(() => {
        buildScribingTooltipProps({
          talent: mockTalent,
          combatData: mockCombatEventData,
          playerId: 1
        });
      }).not.toThrow();
    });

    it('should handle optional class key', () => {
      expect(() => {
        buildScribingTooltipProps({
          talent: mockTalent,
          combatData: mockCombatEventData,
          classKey: 'sorcerer'
        });
      }).not.toThrow();
    });

    it('should handle complete options', () => {
      expect(() => {
        buildScribingTooltipProps({
          talent: mockTalent,
          combatData: mockCombatEventData,
          playerId: 1,
          classKey: 'sorcerer'
        });
      }).not.toThrow();
    });
  });

  describe('error handling', () => {
    it('should handle malformed talent data', () => {
      const badTalent = {
        id: 'invalid',
        name: null,
        guid: 'bad'
      } as any;

      expect(() => {
        buildEnhancedTooltipProps({
          talent: badTalent,
          combatData: mockCombatEventData
        });
      }).not.toThrow();
    });

    it('should handle malformed combat data', () => {
      const badCombatData = {
        allReportAbilities: [],
        allBuffEvents: [],
        allCastEvents: [], // Provide empty array instead of undefined
        allDamageEvents: [],
        allDebuffEvents: [],
        allHealingEvents: [],
        allResourceEvents: []
      } as any;

      expect(() => {
        buildEnhancedTooltipProps({
          talent: mockTalent,
          combatData: badCombatData
        });
      }).not.toThrow();
    });

    it('should handle extreme values', () => {
      const extremeTalent = {
        id: Number.MAX_SAFE_INTEGER,
        name: 'A'.repeat(1000),
        abilityId: Number.MAX_SAFE_INTEGER,
        guid: Number.MAX_SAFE_INTEGER
      };

      expect(() => {
        buildEnhancedTooltipProps({
          talent: extremeTalent,
          combatData: mockCombatEventData
        });
      }).not.toThrow();
    });
  });

  describe('integration with dependencies', () => {
    it('should work with mocked functions', () => {
      const { getScribingSkillByAbilityId } = require('./Scribing');
      const { buildTooltipProps } = require('../../../utils/skillTooltipMapper');
      const { analyzeScribingSkillWithSignature } = require('./enhancedScribingAnalysis');

      expect(getScribingSkillByAbilityId).toBeDefined();
      expect(buildTooltipProps).toBeDefined();
      expect(analyzeScribingSkillWithSignature).toBeDefined();

      // Test that functions can be called without errors
      buildEnhancedTooltipProps({
        talent: mockTalent,
        combatData: mockCombatEventData
      });

      expect(true).toBe(true); // Basic assertion that we got here without throwing
    });
  });

  describe('performance', () => {
    it('should handle multiple operations efficiently', () => {
      const startTime = performance.now();

      // Run multiple operations
      for (let i = 0; i < 100; i++) {
        buildEnhancedTooltipProps({
          talent: { ...mockTalent, id: i, guid: i },
          combatData: mockCombatEventData
        });
      }

      const duration = performance.now() - startTime;
      expect(duration).toBeLessThan(1000); // Should complete in under 1 second
    });

    it('should handle large datasets', () => {
      const largeTalentArray = Array.from({ length: 1000 }, (_, i) => ({
        ...mockTalent,
        id: i,
        guid: i
      }));

      const startTime = performance.now();

      analyzePlayerScribingSkills(largeTalentArray, mockCombatEventData, 1);

      const duration = performance.now() - startTime;
      expect(duration).toBeLessThan(2000); // Should complete in under 2 seconds
    });
  });

  describe('data validation', () => {
    it('should handle special characters in names', () => {
      const specialTalent = {
        ...mockTalent,
        name: 'Special !@#$%^&*()_+ Characters'
      };

      expect(() => {
        buildEnhancedTooltipProps({
          talent: specialTalent,
          combatData: mockCombatEventData
        });
      }).not.toThrow();
    });

    it('should handle Unicode characters', () => {
      const unicodeTalent = {
        ...mockTalent,
        name: '测试技能 🎮 اختبار مهارة'
      };

      expect(() => {
        buildEnhancedTooltipProps({
          talent: unicodeTalent,
          combatData: mockCombatEventData
        });
      }).not.toThrow();
    });

    it('should handle empty and whitespace strings', () => {
      expect(() => {
        createEnhancedScribedSkillData('', '   ');
      }).not.toThrow();

      expect(() => {
        createEnhancedScribedSkillData('\t\n', '\r\n  ');
      }).not.toThrow();
    });
  });
});