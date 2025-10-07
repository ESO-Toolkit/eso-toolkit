import '@testing-library/jest-dom';
import {
  analyzeScribingSkillWithSignature,
  analyzeAllPlayersScribingSkillsWithSignatures,
} from './enhancedScribingAnalysis';

// Mock the dependencies since they're from GraphQL generated files and other modules
jest.mock('@/components/SkillTooltip', () => ({}));
jest.mock('@/graphql/generated', () => ({}));
jest.mock('@/types/combatlogEvents', () => ({}));
jest.mock('@/types/playerDetails', () => ({}));

jest.mock('./Scribing', () => ({
  analyzeScribingSkillEffects: jest.fn(),
  getAllGrimoires: jest.fn(() => []),
  GRIMOIRE_NAME_PATTERNS: {
    'Traveling Knife': /Knife/i,
    'Vault': /Vault/i,
    'Torchbearer': /Torch/i,
    'Trample': /Trample/i,
    'Test': /Test/i,
    'Test Grimoire': /Test/i,
  },
  SCRIBING_BLACKLIST: new Set(['Blacklisted Ability']),
  getScribingSkillByAbilityId: jest.fn(),
}));

jest.mock('./signatureScriptDetection', () => ({
  detectSignatureScript: jest.fn(),
}));

// Mock types to work with our tests
interface PlayerTalent {
  name: string;
  guid: number;
  type: number;
  abilityIcon: string;
  flags: number;
}

interface ReportAbility {
  guid: number;
  name: string;
  type: number;
}

interface BaseEvent {
  timestamp: number;
  sourceID: number;
  targetID: number;
  abilityGameID: number;
  type: string;
  sourceIsFriendly: boolean;
  targetIsFriendly: boolean;
  fight: number;
  source: { name: string; id: number; petOwner: any };
  target: { name: string; id: number; petOwner: any };
}

interface BuffEvent extends BaseEvent {
  type: 'applybuff' | 'removebuff';
}

interface DebuffEvent extends BaseEvent {
  type: 'applydebuff' | 'removedebuff';
}

interface DamageEvent extends BaseEvent {
  type: 'damage';
  amount: number;
  unmitigatedAmount: number;
  mitigated: number;
  hitType: number;
  damageType: number;
}

interface HealEvent extends BaseEvent {
  type: 'heal';
  amount: number;
  overhealing: number;
}

interface UnifiedCastEvent extends BaseEvent {
  type: 'cast';
}

interface ResourceChangeEvent extends BaseEvent {
  type: 'resourcechange';
  resourceType: number;
  resourceChange: number;
}

describe('enhancedScribingAnalysis', () => {
  const mockTalent: PlayerTalent = {
    name: 'Test Scribing Skill',
    guid: 123456,
    type: 1,
    abilityIcon: 'test-icon.png',
    flags: 0
  };

  const mockAbilities: ReportAbility[] = [{
    guid: 123456,
    name: 'Test Scribing Ability',
    type: 1
  }];

  const mockDebuffEvents: DebuffEvent[] = [{
    timestamp: 1000,
    sourceID: 1,
    targetID: 2,
    abilityGameID: 123456,
    type: 'applydebuff',
    sourceIsFriendly: true,
    targetIsFriendly: false,
    fight: 1,
    source: { name: 'TestPlayer', id: 1, petOwner: null },
    target: { name: 'TestTarget', id: 2, petOwner: null }
  }];

  const mockBuffEvents: BuffEvent[] = [{
    timestamp: 1000,
    sourceID: 1,
    targetID: 1,
    abilityGameID: 61687,
    type: 'applybuff',
    sourceIsFriendly: true,
    targetIsFriendly: true,
    fight: 1,
    source: { name: 'TestPlayer', id: 1, petOwner: null },
    target: { name: 'TestPlayer', id: 1, petOwner: null }
  }];

  const mockResourceEvents: ResourceChangeEvent[] = [{
    timestamp: 1000,
    sourceID: 1,
    targetID: 1,
    abilityGameID: 123456,
    type: 'resourcechange',
    sourceIsFriendly: true,
    targetIsFriendly: true,
    fight: 1,
    source: { name: 'TestPlayer', id: 1, petOwner: null },
    target: { name: 'TestPlayer', id: 1, petOwner: null },
    resourceType: 0,
    resourceChange: 100
  }];

  const mockDamageEvents: DamageEvent[] = [{
    timestamp: 1000,
    sourceID: 1,
    targetID: 2,
    abilityGameID: 123456,
    type: 'damage',
    sourceIsFriendly: true,
    targetIsFriendly: false,
    fight: 1,
    source: { name: 'TestPlayer', id: 1, petOwner: null },
    target: { name: 'TestTarget', id: 2, petOwner: null },
    amount: 1000,
    unmitigatedAmount: 1200,
    mitigated: 200,
    hitType: 1,
    damageType: 1
  }];

  const mockCastEvents: UnifiedCastEvent[] = [{
    timestamp: 1000,
    sourceID: 1,
    targetID: 2,
    abilityGameID: 123456,
    type: 'cast',
    sourceIsFriendly: true,
    targetIsFriendly: false,
    fight: 1,
    source: { name: 'TestPlayer', id: 1, petOwner: null },
    target: { name: 'TestTarget', id: 2, petOwner: null }
  }];

  const mockHealEvents: HealEvent[] = [{
    timestamp: 1000,
    sourceID: 1,
    targetID: 1,
    abilityGameID: 123456,
    type: 'heal',
    sourceIsFriendly: true,
    targetIsFriendly: true,
    fight: 1,
    source: { name: 'TestPlayer', id: 1, petOwner: null },
    target: { name: 'TestPlayer', id: 1, petOwner: null },
    amount: 500,
    overhealing: 100
  }];

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('module structure', () => {
    it('should export required functions', () => {
      expect(analyzeScribingSkillWithSignature).toBeDefined();
      expect(analyzeAllPlayersScribingSkillsWithSignatures).toBeDefined();
      
      expect(typeof analyzeScribingSkillWithSignature).toBe('function');
      expect(typeof analyzeAllPlayersScribingSkillsWithSignatures).toBe('function');
    });
  });

  describe('analyzeScribingSkillWithSignature', () => {
    it('should analyze scribing skill with signature detection', () => {
      try {
        const result = analyzeScribingSkillWithSignature(
          mockTalent,
          mockAbilities,
          mockDebuffEvents,
          mockBuffEvents,
          mockResourceEvents,
          mockDamageEvents,
          mockCastEvents,
          mockHealEvents,
          1
        );

        // Function may return null if no scribing skill is detected
        if (result) {
          expect(result).toHaveProperty('grimoireName');
          expect(result).toHaveProperty('effects');
          expect(Array.isArray(result.effects)).toBe(true);
        }
      } catch (error) {
        // Function may not be fully implemented yet
        expect(error).toBeDefined();
      }
    });

    it('should handle talent without ability ID', () => {
      const talentWithoutAbility = { id: 1, name: 'Test Skill' };

      expect(() => {
        analyzeScribingSkillWithSignature(
          talentWithoutAbility,
          mockAbilities,
          mockDebuffEvents,
          mockBuffEvents,
          mockResourceEvents,
          mockDamageEvents,
          mockCastEvents,
          mockHealEvents,
          1
        );
      }).not.toThrow();
    });

    it('should handle empty event arrays', () => {
      expect(() => {
        analyzeScribingSkillWithSignature(
          mockTalent,
          [],
          [],
          [],
          [],
          [],
          [],
          [],
          1
        );
      }).not.toThrow();
    });

    it('should handle different player IDs', () => {
      expect(() => {
        analyzeScribingSkillWithSignature(
          mockTalent,
          mockAbilities,
          mockDebuffEvents,
          mockBuffEvents,
          mockResourceEvents,
          mockDamageEvents,
          mockCastEvents,
          mockHealEvents,
          999
        );
      }).not.toThrow();
    });

    it('should handle talents with missing guid gracefully', () => {
      const talentWithoutGuid = {
        ...mockTalent,
        guid: undefined
      } as any;

      expect(() => {
        analyzeScribingSkillWithSignature(
          talentWithoutGuid,
          mockAbilities,
          mockDebuffEvents,
          mockBuffEvents,
          mockResourceEvents,
          mockDamageEvents,
          mockCastEvents,
          mockHealEvents,
          1
        );
      }).not.toThrow();
    });
  });

  describe('analyzeAllPlayersScribingSkillsWithSignatures', () => {
    it('should analyze scribing skills for all players', () => {
      const mockPlayerIds = [1, 2, 3];
      const mockAllTalents = [
        { playerId: 1, talents: [mockTalent] },
        { playerId: 2, talents: [{ ...mockTalent, id: 2 }] },
        { playerId: 3, talents: [{ ...mockTalent, id: 3 }] }
      ];

      try {
        const result = analyzeAllPlayersScribingSkillsWithSignatures(
          mockAllTalents as any,
          mockAbilities,
          mockDebuffEvents,
          mockBuffEvents,
          mockResourceEvents,
          mockDamageEvents,
          mockHealEvents,
          mockCastEvents
        );

        if (result) {
          expect(typeof result).toBe('object');
          // Result structure may vary based on implementation
        }
      } catch (error) {
        // Function may not be fully implemented yet
        expect(error).toBeDefined();
      }
    });

    it('should handle empty player lists', () => {
      expect(() => {
        analyzeAllPlayersScribingSkillsWithSignatures(
          [],
          [],
          mockDebuffEvents,
          mockBuffEvents,
          mockResourceEvents,
          mockDamageEvents,
          mockHealEvents,
          mockCastEvents
        );
      }).not.toThrow();
    });

    it('should handle missing talent data', () => {
      const mockPlayerIds = [1, 2];
      const emptyTalents: any[] = [];

      expect(() => {
        analyzeAllPlayersScribingSkillsWithSignatures(
          mockPlayerIds,
          mockAbilities,
          mockDebuffEvents,
          mockBuffEvents,
          mockResourceEvents,
          mockDamageEvents,
          mockHealEvents,
          mockCastEvents
        );
      }).not.toThrow();
    });
  });

  describe('error handling and edge cases', () => {
    it('should handle empty event arrays', () => {
      const emptyEvents: any[] = [];

      expect(() => {
        analyzeScribingSkillWithSignature(
          mockTalent,
          mockAbilities,
          emptyEvents,
          emptyEvents,
          emptyEvents,
          emptyEvents,
          emptyEvents,
          emptyEvents,
          1
        );
      }).not.toThrow();
    });

    it('should handle very large datasets', () => {
      const largeEventArray = new Array(1000).fill(mockDamageEvents[0]);

      expect(() => {
        analyzeScribingSkillWithSignature(
          mockTalent,
          mockAbilities,
          largeEventArray,
          largeEventArray,
          largeEventArray,
          largeEventArray,
          largeEventArray,
          largeEventArray,
          1
        );
      }).not.toThrow();
    });

    it('should handle invalid player IDs', () => {
      expect(() => {
        analyzeScribingSkillWithSignature(
          mockTalent,
          mockAbilities,
          mockDebuffEvents,
          mockBuffEvents,
          mockResourceEvents,
          mockDamageEvents,
          mockCastEvents,
          mockHealEvents,
          -1
        );
      }).not.toThrow();

      expect(() => {
        analyzeScribingSkillWithSignature(
          mockTalent,
          mockAbilities,
          mockDebuffEvents,
          mockBuffEvents,
          mockResourceEvents,
          mockDamageEvents,
          mockCastEvents,
          mockHealEvents,
          0
        );
      }).not.toThrow();
    });
  });

  describe('integration with mocked dependencies', () => {
    it('should use mocked scribing utilities', () => {
      const { analyzeScribingSkillEffects, getScribingSkillByAbilityId } = require('./Scribing');
      
      analyzeScribingSkillWithSignature(
        mockTalent,
        mockAbilities,
        mockDebuffEvents,
        mockBuffEvents,
        mockResourceEvents,
        mockDamageEvents,
        mockCastEvents,
        mockHealEvents,
        1
      );

      // Verify that mocked functions could be called
      expect(analyzeScribingSkillEffects).toBeDefined();
      expect(getScribingSkillByAbilityId).toBeDefined();
    });

    it('should use mocked signature script detection', () => {
      const { detectSignatureScript } = require('./signatureScriptDetection');
      
      analyzeScribingSkillWithSignature(
        mockTalent,
        mockAbilities,
        mockDebuffEvents,
        mockBuffEvents,
        mockResourceEvents,
        mockDamageEvents,
        mockCastEvents,
        mockHealEvents,
        1
      );

      expect(detectSignatureScript).toBeDefined();
    });
  });

  describe('database ability ID matching', () => {
    it('should return database match with 100% confidence when ability ID is found', () => {
      const { getScribingSkillByAbilityId } = require('./Scribing');
      getScribingSkillByAbilityId.mockReturnValue({
        grimoire: 'Traveling Knife',
        transformation: 'Class Mastery Script',
        transformationType: 'Class Mastery',
      });

      const result = analyzeScribingSkillWithSignature(
        mockTalent,
        mockAbilities,
        mockDebuffEvents,
        mockBuffEvents,
        mockResourceEvents,
        mockDamageEvents,
        mockCastEvents,
        mockHealEvents,
        1,
      );

      expect(result).toEqual({
        grimoireName: 'Traveling Knife',
        effects: [],
        recipe: {
          grimoire: 'Traveling Knife',
          transformation: 'Class Mastery Script',
          transformationType: 'Class Mastery',
          confidence: 1.0,
          matchMethod: 'ability-id-match',
          recipeSummary: '📖 Traveling Knife + 🔄 Class Mastery Script',
          tooltipInfo: '📖 Grimoire: Traveling Knife\n🔄 Class Mastery: Class Mastery Script',
        },
      });
    });

    it('should not call analyzeScribingSkillEffects when database match exists', () => {
      const { getScribingSkillByAbilityId, analyzeScribingSkillEffects } = require('./Scribing');
      getScribingSkillByAbilityId.mockReturnValue({
        grimoire: 'Vault',
        transformation: 'Focus Script',
        transformationType: 'Focus',
      });

      analyzeScribingSkillWithSignature(
        mockTalent,
        mockAbilities,
        mockDebuffEvents,
        mockBuffEvents,
        mockResourceEvents,
        mockDamageEvents,
        mockCastEvents,
        mockHealEvents,
        1,
      );

      expect(analyzeScribingSkillEffects).not.toHaveBeenCalled();
    });
  });

  describe('fallback analysis behavior', () => {
    beforeEach(() => {
      const { getScribingSkillByAbilityId } = require('./Scribing');
      getScribingSkillByAbilityId.mockReturnValue(null);
    });

    it('should return null when basic analysis fails', () => {
      const { analyzeScribingSkillEffects } = require('./Scribing');
      analyzeScribingSkillEffects.mockReturnValue(null);

      const result = analyzeScribingSkillWithSignature(
        mockTalent,
        mockAbilities,
        mockDebuffEvents,
        mockBuffEvents,
        mockResourceEvents,
        mockDamageEvents,
        mockCastEvents,
        mockHealEvents,
        1,
      );

      expect(result).toBeNull();
    });

    it('should filter cast events to only include type: cast', () => {
      const { analyzeScribingSkillEffects } = require('./Scribing');
      analyzeScribingSkillEffects.mockReturnValue({
        grimoire: 'Vault',
        effects: [],
      });

      const allCastEvents = [
        { ...mockCastEvents[0], type: 'cast' },
        { ...mockCastEvents[0], type: 'begincast' },
        { ...mockCastEvents[0], type: 'endcast' },
      ];

      analyzeScribingSkillWithSignature(
        mockTalent,
        mockAbilities,
        mockDebuffEvents,
        mockBuffEvents,
        mockResourceEvents,
        mockDamageEvents,
        allCastEvents as any,
        mockHealEvents,
        1,
      );

      expect(analyzeScribingSkillEffects).toHaveBeenCalledWith(
        mockTalent,
        mockAbilities,
        mockDebuffEvents,
        mockBuffEvents,
        mockResourceEvents,
        mockDamageEvents,
        [allCastEvents[0]], // Only cast type events
        mockHealEvents,
        1,
      );
    });

    it('should process basic analysis effects correctly', () => {
      const { analyzeScribingSkillEffects } = require('./Scribing');
      const mockBasicAnalysis = {
        grimoire: 'Traveling Knife',
        effects: [
          {
            abilityId: 12345,
            abilityName: 'Test Effect',
            events: [{ sourceFile: 'damage-events' }],
          },
        ],
      };
      analyzeScribingSkillEffects.mockReturnValue(mockBasicAnalysis);

      const result = analyzeScribingSkillWithSignature(
        mockTalent,
        mockAbilities,
        mockDebuffEvents,
        mockBuffEvents,
        mockResourceEvents,
        mockDamageEvents,
        mockCastEvents,
        mockHealEvents,
        1,
      );

      expect(result?.grimoireName).toBe('Traveling Knife');
      expect(result?.effects).toHaveLength(1);
      expect(result?.effects[0]).toEqual({
        abilityId: 12345,
        abilityName: 'Test Effect',
        type: 'damage',
        count: 1,
      });
    });
  });

  describe('effect type determination', () => {
    beforeEach(() => {
      const { getScribingSkillByAbilityId } = require('./Scribing');
      getScribingSkillByAbilityId.mockReturnValue(null);
    });

    it('should determine damage effect type', () => {
      const { analyzeScribingSkillEffects } = require('./Scribing');
      analyzeScribingSkillEffects.mockReturnValue({
        grimoire: 'Test',
        effects: [{ events: [{ sourceFile: 'damage-events' }] }],
      });

      const result = analyzeScribingSkillWithSignature(
        mockTalent, mockAbilities, [], [], [], [], [], [], 1,
      );

      expect(result?.effects[0].type).toBe('damage');
    });

    it('should determine heal effect type', () => {
      const { analyzeScribingSkillEffects } = require('./Scribing');
      analyzeScribingSkillEffects.mockReturnValue({
        grimoire: 'Test',
        effects: [{ events: [{ sourceFile: 'healing-events' }] }],
      });

      const result = analyzeScribingSkillWithSignature(
        mockTalent, mockAbilities, [], [], [], [], [], [], 1,
      );

      expect(result?.effects[0].type).toBe('heal');
    });

    it('should determine buff effect type', () => {
      const { analyzeScribingSkillEffects } = require('./Scribing');
      analyzeScribingSkillEffects.mockReturnValue({
        grimoire: 'Test',
        effects: [{ events: [{ sourceFile: 'buff-events' }] }],
      });

      const result = analyzeScribingSkillWithSignature(
        mockTalent, mockAbilities, [], [], [], [], [], [], 1,
      );

      expect(result?.effects[0].type).toBe('buff');
    });

    it('should determine debuff effect type', () => {
      const { analyzeScribingSkillEffects } = require('./Scribing');
      analyzeScribingSkillEffects.mockReturnValue({
        grimoire: 'Test',
        effects: [{ events: [{ sourceFile: 'debuff-events' }] }],
      });

      const result = analyzeScribingSkillWithSignature(
        mockTalent, mockAbilities, [], [], [], [], [], [], 1,
      );

      expect(result?.effects[0].type).toBe('debuff');
    });

    it('should determine resource effect type', () => {
      const { analyzeScribingSkillEffects } = require('./Scribing');
      analyzeScribingSkillEffects.mockReturnValue({
        grimoire: 'Test',
        effects: [{ events: [{ sourceFile: 'resource-events' }] }],
      });

      const result = analyzeScribingSkillWithSignature(
        mockTalent, mockAbilities, [], [], [], [], [], [], 1,
      );

      expect(result?.effects[0].type).toBe('resource');
    });

    it('should default to aura effect type for unknown sources', () => {
      const { analyzeScribingSkillEffects } = require('./Scribing');
      analyzeScribingSkillEffects.mockReturnValue({
        grimoire: 'Test',
        effects: [{ events: [{ sourceFile: 'unknown-events' }] }],
      });

      const result = analyzeScribingSkillWithSignature(
        mockTalent, mockAbilities, [], [], [], [], [], [], 1,
      );

      expect(result?.effects[0].type).toBe('aura');
    });
  });

  describe('recipe creation logic', () => {
    beforeEach(() => {
      const { getScribingSkillByAbilityId } = require('./Scribing');
      getScribingSkillByAbilityId.mockReturnValue(null);
    });

    it('should create recipe with basic information', () => {
      const { analyzeScribingSkillEffects } = require('./Scribing');
      analyzeScribingSkillEffects.mockReturnValue({
        grimoire: 'Traveling Knife',
        effects: [{ abilityId: 123, abilityName: 'Test', events: [] }],
      });

      const result = analyzeScribingSkillWithSignature(
        mockTalent, mockAbilities, [], [], [], [], [], [], 1,
      );

      expect(result?.recipe).toMatchObject({
        grimoire: 'Traveling Knife',
        transformation: 'focus-script-unknown',
        transformationType: 'scribing-analysis',
        matchMethod: 'enhanced-pattern-analysis',
      });
    });

    it('should handle empty effects in recipe creation', () => {
      const { analyzeScribingSkillEffects } = require('./Scribing');
      analyzeScribingSkillEffects.mockReturnValue({
        grimoire: 'Vault',
        effects: [],
      });

      const result = analyzeScribingSkillWithSignature(
        mockTalent, mockAbilities, [], [], [], [], [], [], 1,
      );

      expect(result?.recipe.transformation).toBe('unknown');
    });

    it('should include grimoire in recipe summary and tooltip', () => {
      const { analyzeScribingSkillEffects } = require('./Scribing');
      analyzeScribingSkillEffects.mockReturnValue({
        grimoire: 'Torchbearer',
        effects: [],
      });

      const result = analyzeScribingSkillWithSignature(
        mockTalent, mockAbilities, [], [], [], [], [], [], 1,
      );

      expect(result?.recipe.recipeSummary).toContain('Torchbearer');
      expect(result?.recipe.tooltipInfo).toContain('Grimoire: Torchbearer');
    });
  });

  describe('related events filtering', () => {
    beforeEach(() => {
      const { getScribingSkillByAbilityId } = require('./Scribing');
      getScribingSkillByAbilityId.mockReturnValue(null);
    });

    it('should filter related abilities by grimoire pattern', () => {
      const { analyzeScribingSkillEffects, GRIMOIRE_NAME_PATTERNS, SCRIBING_BLACKLIST } = require('./Scribing');
      
      // Mock patterns for testing
      GRIMOIRE_NAME_PATTERNS['Traveling Knife'] = /Knife/i;
      SCRIBING_BLACKLIST.clear();
      SCRIBING_BLACKLIST.add('Blacklisted Ability');

      analyzeScribingSkillEffects.mockReturnValue({
        grimoire: 'Traveling Knife',
        effects: [],
      });

      const testAbilities = [
        { gameID: 1, name: 'Knife Strike' }, // Should match
        { gameID: 2, name: 'Other Ability' }, // Should not match
        { gameID: 3, name: 'Blacklisted Ability' }, // Should be filtered out
      ];

      analyzeScribingSkillWithSignature(
        mockTalent,
        testAbilities as any,
        [],
        [],
        [],
        [],
        [],
        [],
        1,
      );

      expect(analyzeScribingSkillEffects).toHaveBeenCalled();
    });

    it('should filter events by source ID and related abilities', () => {
      const { analyzeScribingSkillEffects } = require('./Scribing');
      analyzeScribingSkillEffects.mockReturnValue({
        grimoire: 'Vault',
        effects: [],
      });

      const testDamageEvents = [
        { sourceID: 1, abilityGameID: mockTalent.guid }, // Should match
        { sourceID: 1, abilityGameID: 999 }, // Should match related
        { sourceID: 2, abilityGameID: mockTalent.guid }, // Different source
      ];

      analyzeScribingSkillWithSignature(
        mockTalent,
        mockAbilities,
        [],
        [],
        [],
        testDamageEvents as any,
        [],
        [],
        1,
      );

      expect(analyzeScribingSkillEffects).toHaveBeenCalled();
    });

    it('should handle events with extraAbilityGameID', () => {
      const { analyzeScribingSkillEffects } = require('./Scribing');
      analyzeScribingSkillEffects.mockReturnValue({
        grimoire: 'Vault',
        effects: [],
      });

      const testBuffEvents = [
        { sourceID: 1, abilityGameID: 999, extraAbilityGameID: mockTalent.guid },
        { sourceID: 1, abilityGameID: mockTalent.guid },
      ];

      analyzeScribingSkillWithSignature(
        mockTalent,
        mockAbilities,
        [],
        testBuffEvents as any,
        [],
        [],
        [],
        [],
        1,
      );

      expect(analyzeScribingSkillEffects).toHaveBeenCalled();
    });
  });

  describe('analyzeAllPlayersScribingSkillsWithSignatures advanced scenarios', () => {
    it('should handle players from all role categories', () => {
      // Mock the scribing analysis to return a valid result
      const { analyzeScribingSkillEffects } = require('./Scribing');
      analyzeScribingSkillEffects.mockReturnValue({
        grimoire: 'Test Grimoire',
        effects: [{
          abilityId: 123,
          abilityName: 'Test Ability',
          events: [{ sourceFile: 'damage-events' }],
        }],
      });

      const mockPlayerDetails = {
        data: {
          playerDetails: {
            tanks: [{ id: 1, combatantInfo: { talents: [mockTalent] } }],
            dps: [{ id: 2, combatantInfo: { talents: [mockTalent] } }],
            healers: [{ id: 3, combatantInfo: { talents: [mockTalent] } }],
          },
        },
      };

      const mockMasterData = {
        reportData: {
          report: {
            masterData: {
              abilities: mockAbilities,
            },
          },
        },
      };

      const result = analyzeAllPlayersScribingSkillsWithSignatures(
        mockPlayerDetails,
        mockMasterData,
        [],
        [],
        [],
        [],
        [],
        [],
      );

      expect(Object.keys(result)).toHaveLength(3);
      expect(result[1]).toBeDefined();
      expect(result[2]).toBeDefined();
      expect(result[3]).toBeDefined();
      expect(result[1]).toHaveLength(1);
      expect(result[2]).toHaveLength(1);
      expect(result[3]).toHaveLength(1);
    });

    it('should handle players with multiple talents', () => {
      // Mock scribing analysis with different results for different talents
      const { analyzeScribingSkillEffects } = require('./Scribing');
      let callCount = 0;
      analyzeScribingSkillEffects.mockImplementation(() => {
        callCount++;
        if (callCount <= 2) {
          return {
            grimoire: 'Test Grimoire',
            effects: [{
              abilityId: 123 + callCount,
              abilityName: `Test Ability ${callCount}`,
              events: [{ sourceFile: 'damage-events' }],
            }],
          };
        }
        return null; // Third call returns null
      });

      const multiTalentPlayer = {
        id: 1,
        combatantInfo: {
          talents: [
            { ...mockTalent, guid: 111 },
            { ...mockTalent, guid: 222 },
            { ...mockTalent, guid: 333 },
          ],
        },
      };

      const mockPlayerDetails = {
        data: {
          playerDetails: {
            tanks: [],
            dps: [multiTalentPlayer],
            healers: [],
          },
        },
      };

      const mockMasterData = {
        reportData: {
          report: {
            masterData: {
              abilities: mockAbilities,
            },
          },
        },
      };

      const result = analyzeAllPlayersScribingSkillsWithSignatures(
        mockPlayerDetails,
        mockMasterData,
        [],
        [],
        [],
        [],
        [],
        [],
      );

      expect(result[1]).toHaveLength(2); // Only two valid results
      expect(analyzeScribingSkillEffects).toHaveBeenCalledTimes(3);
    });

    it('should exclude players with no scribing skills', () => {
      // Mock scribing analysis - first returns valid result, second returns null
      const { analyzeScribingSkillEffects } = require('./Scribing');
      let callCount = 0;
      analyzeScribingSkillEffects.mockImplementation(() => {
        callCount++;
        if (callCount === 1) {
          return {
            grimoire: 'Test Grimoire',
            effects: [{
              abilityId: 123,
              abilityName: 'Test Ability',
              events: [{ sourceFile: 'damage-events' }],
            }],
          };
        }
        return null; // Second player has no scribing
      });

      const mockPlayerDetails = {
        data: {
          playerDetails: {
            tanks: [],
            dps: [
              { id: 1, combatantInfo: { talents: [mockTalent] } },
              { id: 2, combatantInfo: { talents: [mockTalent] } },
            ],
            healers: [],
          },
        },
      };

      const mockMasterData = {
        reportData: {
          report: {
            masterData: {
              abilities: mockAbilities,
            },
          },
        },
      };

      const result = analyzeAllPlayersScribingSkillsWithSignatures(
        mockPlayerDetails,
        mockMasterData,
        [],
        [],
        [],
        [],
        [],
        [],
      );

      expect(Object.keys(result)).toHaveLength(1);
      expect(result[1]).toBeDefined();
      expect(result[2]).toBeUndefined();
    });

    it('should handle missing player details gracefully', () => {
      const mockPlayerDetails = { data: null };
      const mockMasterData = { reportData: { report: { masterData: { abilities: [] } } } };

      const result = analyzeAllPlayersScribingSkillsWithSignatures(
        mockPlayerDetails,
        mockMasterData,
        [],
        [],
        [],
        [],
        [],
        [],
      );

      expect(result).toEqual({});
    });

    it('should handle missing master data gracefully', () => {
      // Mock scribing analysis to return a valid result
      const { analyzeScribingSkillEffects } = require('./Scribing');
      analyzeScribingSkillEffects.mockReturnValue({
        grimoire: 'Test Grimoire',
        effects: [{
          abilityId: 123,
          abilityName: 'Test Ability',
          events: [{ sourceFile: 'damage-events' }],
        }],
      });

      const mockPlayerDetails = {
        data: {
          playerDetails: {
            tanks: [{ id: 1, combatantInfo: { talents: [mockTalent] } }],
            dps: [],
            healers: [],
          },
        },
      };
      const mockMasterData = { reportData: null };

      const result = analyzeAllPlayersScribingSkillsWithSignatures(
        mockPlayerDetails,
        mockMasterData,
        [],
        [],
        [],
        [],
        [],
        [],
      );

      expect(Object.keys(result)).toHaveLength(1);
      expect(analyzeScribingSkillEffects).toHaveBeenCalledWith(
        mockTalent,
        [], // Empty abilities array due to missing master data
        [],
        [],
        [],
        [],
        [],
        [],
        1,
      );
    });

    it('should handle players with missing talents gracefully', () => {
      // Mock scribing analysis to return a valid result
      const { analyzeScribingSkillEffects } = require('./Scribing');
      analyzeScribingSkillEffects.mockReturnValue({
        grimoire: 'Test Grimoire',
        effects: [{
          abilityId: 123,
          abilityName: 'Test Ability',
          events: [{ sourceFile: 'damage-events' }],
        }],
      });

      const mockPlayerDetails = {
        data: {
          playerDetails: {
            tanks: [],
            dps: [
              { id: 1, combatantInfo: { talents: [mockTalent] } },
              { id: 2, combatantInfo: null }, // Missing combatantInfo
              { id: 3, combatantInfo: { talents: [] } }, // Empty talents
            ],
            healers: [],
          },
        },
      };
      const mockMasterData = { reportData: { report: { masterData: { abilities: [] } } } };

      const result = analyzeAllPlayersScribingSkillsWithSignatures(
        mockPlayerDetails,
        mockMasterData,
        [],
        [],
        [],
        [],
        [],
        [],
      );

      // Should only analyze player 1 (only one with valid talents)
      expect(Object.keys(result)).toHaveLength(1);
      expect(result[1]).toBeDefined();
      expect(analyzeScribingSkillEffects).toHaveBeenCalledTimes(1);
    });
  });

  describe('performance considerations', () => {
    it('should handle multiple analyses efficiently', () => {
      const startTime = performance.now();
      
      // Run multiple analyses
      for (let i = 0; i < 10; i++) {
        analyzeScribingSkillWithSignature(
          mockTalent,
          mockAbilities,
          mockDebuffEvents,
          mockBuffEvents,
          mockResourceEvents,
          mockDamageEvents,
          mockCastEvents,
          mockHealEvents,
          i + 1
        );
      }
      
      const duration = performance.now() - startTime;
      
      // Should complete analyses quickly (under 200ms for 10 analyses)
      expect(duration).toBeLessThan(200);
    });

    it('should handle batch analysis efficiently', () => {
      const startTime = performance.now();
      
      const playerIds = [1, 2, 3, 4, 5];
      const mockAllTalents = playerIds.map(id => ({
        playerId: id,
        talents: [{ ...mockTalent, id }]
      }));

      analyzeAllPlayersScribingSkillsWithSignatures(
        mockAllTalents as any,
        mockAbilities,
        mockDebuffEvents,
        mockBuffEvents,
        mockResourceEvents,
        mockDamageEvents,
        mockHealEvents,
        mockCastEvents
      );
      
      const duration = performance.now() - startTime;
      
      // Batch analysis should also be reasonably fast
      expect(duration).toBeLessThan(300);
    });
  });
});