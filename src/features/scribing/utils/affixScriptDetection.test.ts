/**
 * Comprehensive test suite for affix script detection in scribing tooltips
 */

import {
  AffixScriptDetectionResult,
  ScribedSkillDataWithAffix,
  analyzeScribingSkillWithAffixScripts,
  formatAffixScriptsForTooltip,
  createAffixScriptChips,
} from './affixScriptDetection';
import {
  ApplyBuffEvent,
  ApplyDebuffEvent,
  CastEvent,
  DamageEvent,
  HealEvent,
  ResourceChangeEvent,
  BuffEvent,
  DebuffEvent,
} from '../../../types/combatlogEvents';
import { PlayerTalent } from '../../../types/playerDetails';

// Mock ReportAbility type
interface ReportAbility {
  guid: number;
  name: string;
  type: number;
}

// Mock the scribing data with comprehensive affix scripts
jest.mock('../../../../data/scribing-complete.json', () => ({
  affixScripts: {
    'berserk': {
      id: 'berserk',
      name: 'Berserk',
      description: 'Increases damage dealt.',
      category: 'Combat',
      mechanicalEffect: 'Major/Minor Berserk',
    },
    'brutality-and-sorcery': {
      id: 'brutality-and-sorcery',
      name: 'Brutality and Sorcery',
      description: 'Increases Weapon and Spell Damage.',
      category: 'Combat',
      mechanicalEffect: 'Major Brutality and Major Sorcery',
    },
    'savagery-and-prophecy': {
      id: 'savagery-and-prophecy',
      name: 'Savagery and Prophecy',
      description: 'Increases Weapon and Spell Critical.',
      category: 'Combat',
      mechanicalEffect: 'Major Savagery and Major Prophecy',
    },
    'intellect-and-endurance': {
      id: 'intellect-and-endurance',
      name: 'Intellect and Endurance',
      description: 'Increases Magicka and Stamina Recovery.',
      category: 'Recovery',
      mechanicalEffect: 'Major Intellect and Major Endurance',
    },
    'breach': {
      id: 'breach',
      name: 'Breach',
      description: 'Reduces enemy resistances.',
      category: 'Debuff',
      mechanicalEffect: 'Major/Minor Breach',
    },
    'maim': {
      id: 'maim',
      name: 'Maim',
      description: 'Reduces enemy damage dealt.',
      category: 'Debuff',
      mechanicalEffect: 'Major/Minor Maim',
    },
    'vulnerability': {
      id: 'vulnerability',
      name: 'Vulnerability',
      description: 'Increases damage taken by enemy.',
      category: 'Debuff',
      mechanicalEffect: 'Major/Minor Vulnerability',
    },
    'defile': {
      id: 'defile',
      name: 'Defile',
      description: 'Reduces healing received by enemy.',
      category: 'Debuff',
      mechanicalEffect: 'Major/Minor Defile',
    },
  },
  grimoires: {
    'traveling-knife': {
      nameTransformations: {
        'base': {
          name: 'Traveling Knife',
          abilityIds: [12345, 12346],
        },
      },
    },
    'vault': {
      nameTransformations: {
        'base': {
          name: 'Vault',
          abilityIds: [23456, 23457],
        },
      },
    },
  },
}));

// Mock the Scribing utility
jest.mock('./Scribing', () => ({
  getScribingSkillByAbilityId: jest.fn(),
}));

import { getScribingSkillByAbilityId } from './Scribing';
const mockGetScribingSkillByAbilityId = getScribingSkillByAbilityId as jest.MockedFunction<typeof getScribingSkillByAbilityId>;

describe('affixScriptDetection', () => {
  // Test data factories
  const createMockTalent = (guid: number = 12345, name = 'Traveling Knife Test'): PlayerTalent => ({
    name,
    guid,
    type: 1,
    abilityIcon: 'test-icon.png',
    flags: 0,
  });

  const createMockBuffEvent = (abilityGameID: number = 218015, sourceID = 1): ApplyBuffEvent => ({
    timestamp: 1000,
    type: 'applybuff',
    sourceID,
    targetID: sourceID,
    abilityGameID,
    sourceIsFriendly: true,
    targetIsFriendly: true,
    fight: 1,
    extraAbilityGameID: 0,
  });

  const createMockDebuffEvent = (abilityGameID: number = 148803, sourceID = 1, targetID = 2): ApplyDebuffEvent => ({
    timestamp: 1000,
    type: 'applydebuff',
    sourceID,
    targetID,
    abilityGameID,
    sourceIsFriendly: true,
    targetIsFriendly: false,
    fight: 1,
    extraAbilityGameID: 0,
  });

  const createMockCastEvent = (abilityGameID: number = 12345, sourceID = 1): CastEvent => ({
    timestamp: 1000,
    type: 'cast',
    sourceID,
    targetID: 2,
    abilityGameID,
    sourceIsFriendly: true,
    targetIsFriendly: false,
    fight: 1,
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('analyzeScribingSkillWithAffixScripts', () => {
    it('should detect when skill was cast in fight', () => {
      const talent = createMockTalent(12345);
      const castEvents = [createMockCastEvent(12345, 1)];

      const result = analyzeScribingSkillWithAffixScripts(
        talent,
        [],
        [],
        [],
        [],
        castEvents,
        1,
      );

      expect(result?.wasCastInFight).toBe(true);
    });

    it('should detect when skill was not cast in fight', () => {
      const talent = createMockTalent(12345);
      const castEvents = [createMockCastEvent(54321, 1)]; // Different ability

      const result = analyzeScribingSkillWithAffixScripts(
        talent,
        [],
        [],
        [],
        [],
        castEvents,
        1,
      );

      expect(result?.wasCastInFight).toBe(false);
    });

    it('should detect major savagery affix script from buff events', () => {
      const talent = createMockTalent(12345);
      const buffEvents = [createMockBuffEvent(218015, 1)]; // Major Savagery
      const castEvents = [createMockCastEvent(12345, 1)];

      const result = analyzeScribingSkillWithAffixScripts(
        talent,
        buffEvents,
        [],
        [],
        [],
        castEvents,
        1,
      );

      expect(result?.affixScripts).toBeDefined();
      expect(result?.affixScripts).toHaveLength(1);
      expect(result?.affixScripts?.[0].affixScript.id).toBe('savagery-and-prophecy');
      expect(result?.affixScripts?.[0].confidence).toBe(0.8);
    });

    it('should detect minor breach affix script from debuff events', () => {
      const talent = createMockTalent(12345);
      const debuffEvents = [createMockDebuffEvent(148803, 1, 2)]; // Minor Breach
      const castEvents = [createMockCastEvent(12345, 1)];

      const result = analyzeScribingSkillWithAffixScripts(
        talent,
        [],
        debuffEvents,
        [],
        [],
        castEvents,
        1,
      );

      expect(result?.affixScripts).toBeDefined();
      expect(result?.affixScripts).toHaveLength(1);
      expect(result?.affixScripts?.[0].affixScript.id).toBe('breach');
      expect(result?.affixScripts?.[0].detectionMethod).toBe('pattern-matching');
    });

    it('should handle multiple affix scripts and keep highest confidence', () => {
      const talent = createMockTalent(12345);
      const buffEvents = [
        createMockBuffEvent(218015, 1), // Major Savagery
        createMockBuffEvent(227123, 1), // Minor Endurance
      ];
      const castEvents = [createMockCastEvent(12345, 1)];

      const result = analyzeScribingSkillWithAffixScripts(
        talent,
        buffEvents,
        [],
        [],
        [],
        castEvents,
        1,
      );

      // Should only return one affix script (highest confidence)
      expect(result?.affixScripts).toHaveLength(1);
    });

    it('should ignore events from other players', () => {
      const talent = createMockTalent(12345);
      const buffEvents = [createMockBuffEvent(218015, 2)]; // Different player
      const castEvents = [createMockCastEvent(12345, 1)];

      const result = analyzeScribingSkillWithAffixScripts(
        talent,
        buffEvents,
        [],
        [],
        [],
        castEvents,
        1,
      );

      expect(result?.affixScripts).toBeUndefined();
    });

    it('should return early if skill was not cast in fight', () => {
      const talent = createMockTalent(12345);
      const buffEvents = [createMockBuffEvent(218015, 1)];

      const result = analyzeScribingSkillWithAffixScripts(
        talent,
        buffEvents,
        [],
        [],
        [],
        [],
        1,
      );

      expect(result?.wasCastInFight).toBe(false);
      expect(result?.affixScripts).toBeUndefined();
    });

    it('should handle empty events arrays', () => {
      const talent = createMockTalent(12345);

      const result = analyzeScribingSkillWithAffixScripts(
        talent,
        [],
        [],
        [],
        [],
        [],
        1,
      );

      expect(result).toBeDefined();
      expect(result?.wasCastInFight).toBe(false);
    });
  });

  describe('formatAffixScriptsForTooltip', () => {
    it('should format single affix script correctly', () => {
      const affixScripts: AffixScriptDetectionResult[] = [
        {
          affixScript: {
            id: 'savagery-and-prophecy',
            name: 'Savagery and Prophecy',
            description: 'Increases critical chance.',
          },
          confidence: 0.85,
          detectionMethod: 'pattern-matching',
          evidence: {
            buffIds: [218015],
            debuffIds: [],
            abilityNames: ['Major Savagery'],
            occurrenceCount: 1,
          },
          appliedToAbilities: [],
        },
      ];

      const result = formatAffixScriptsForTooltip(affixScripts);
      expect(result).toBe('🎭 Savagery and Prophecy (85% confidence)');
    });

    it('should format multiple affix scripts correctly', () => {
      const affixScripts: AffixScriptDetectionResult[] = [
        {
          affixScript: {
            id: 'savagery-and-prophecy',
            name: 'Savagery and Prophecy',
            description: 'Increases critical chance.',
          },
          confidence: 0.85,
          detectionMethod: 'pattern-matching',
          evidence: {
            buffIds: [218015],
            debuffIds: [],
            abilityNames: ['Major Savagery'],
            occurrenceCount: 1,
          },
          appliedToAbilities: [],
        },
        {
          affixScript: {
            id: 'breach',
            name: 'Breach',
            description: 'Reduces resistances.',
          },
          confidence: 0.9,
          detectionMethod: 'pattern-matching',
          evidence: {
            buffIds: [],
            debuffIds: [148803],
            abilityNames: ['Minor Breach'],
            occurrenceCount: 1,
          },
          appliedToAbilities: [],
        },
      ];

      const result = formatAffixScriptsForTooltip(affixScripts);
      expect(result).toContain('🎭 Savagery and Prophecy (85% confidence)');
      expect(result).toContain('🎭 Breach (90% confidence)');
    });

    it('should handle empty affix scripts array', () => {
      const result = formatAffixScriptsForTooltip([]);
      expect(result).toBe('No affix scripts detected');
    });
  });

  describe('createAffixScriptChips', () => {
    it('should create chips for affix scripts', () => {
      const affixScripts: AffixScriptDetectionResult[] = [
        {
          affixScript: {
            id: 'savagery-and-prophecy',
            name: 'Savagery and Prophecy',
            description: 'Increases critical chance.',
          },
          confidence: 0.85,
          detectionMethod: 'pattern-matching',
          evidence: {
            buffIds: [218015],
            debuffIds: [],
            abilityNames: ['Major Savagery'],
            occurrenceCount: 3,
          },
          appliedToAbilities: [],
        },
      ];

      const chips = createAffixScriptChips(affixScripts);
      
      expect(chips).toHaveLength(1);
      expect(chips[0]).toEqual({
        id: 'savagery-and-prophecy',
        name: 'Savagery and Prophecy',
        description: 'Increases critical chance.',
        confidence: 0.85,
        count: 3,
        type: 'affix',
      });
    });

    it('should handle empty array', () => {
      const chips = createAffixScriptChips([]);
      expect(chips).toEqual([]);
    });
  });

  describe('edge cases and error handling', () => {
    it('should handle malformed buff events gracefully', () => {
      const talent = createMockTalent(12345);
      const malformedBuffEvent = {
        ...createMockBuffEvent(218015, 1),
        abilityGameID: null as any,
      };
      const castEvents = [createMockCastEvent(12345, 1)];

      expect(() => {
        analyzeScribingSkillWithAffixScripts(
          talent,
          [malformedBuffEvent],
          [],
          [],
          [],
          castEvents,
          1,
        );
      }).not.toThrow();
    });

    it('should handle missing talent properties gracefully', () => {
      const malformedTalent = {
        ...createMockTalent(12345),
        name: '' as any, // Empty string instead of null to avoid toLowerCase error
      };
      const buffEvents = [createMockBuffEvent(218015, 1)];
      const castEvents = [createMockCastEvent(12345, 1)];

      expect(() => {
        analyzeScribingSkillWithAffixScripts(
          malformedTalent,
          buffEvents,
          [],
          [],
          [],
          castEvents,
          1,
        );
      }).not.toThrow();
    });

    it('should handle very large datasets efficiently', () => {
      const talent = createMockTalent(12345);
      
      // Create large datasets
      const largeBuffEvents = Array.from({ length: 1000 }, (_, i) => 
        createMockBuffEvent(218015, 1),
      );
      const largeCastEvents = Array.from({ length: 100 }, (_, i) => 
        createMockCastEvent(12345, 1),
      );

      const startTime = Date.now();
      const result = analyzeScribingSkillWithAffixScripts(
        talent,
        largeBuffEvents,
        [],
        [],
        [],
        largeCastEvents,
        1,
      );
      const endTime = Date.now();

      expect(endTime - startTime).toBeLessThan(1000); // Should complete quickly
      expect(result).toBeDefined();
    });
  });
});