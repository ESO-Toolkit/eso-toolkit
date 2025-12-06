// Mock data imports - define mocks before imports
jest.mock('../data/skillsets/arcanist', () => ({
  arcanistData: { class: 'Arcanist', skillLines: {} },
}));
jest.mock('../data/skillsets/dragonknight', () => ({
  dragonknightData: {
    class: 'Dragonknight',
    skillLines: {
      earthenHeart: {
        name: 'Earthen Heart',
        passives: {
          combustion: {
            name: 'Combustion',
          },
        },
      },
    },
  },
}));
jest.mock('../data/skillsets/necromancer', () => ({
  necromancerData: { class: 'Necromancer', skillLines: {} },
}));
jest.mock('../data/skillsets/nightblade', () => ({
  nightbladeData: { class: 'Nightblade', skillLines: {} },
}));
jest.mock('../data/skillsets/sorcerer', () => ({
  sorcererData: {
    class: 'Sorcerer',
    skillLines: {
      darkMagic: {
        name: 'Dark Magic',
        activeAbilities: {
          crystalShard: {
            name: 'Crystal Shard',
            morphs: {
              crystalBlast: { name: 'Crystal Blast' },
              crystalFragments: { name: 'Crystal Fragments' },
            },
          },
        },
        passives: {
          darkMagicMastery: {
            name: 'Dark Magic Mastery',
          },
        },
      },
    },
  },
}));
jest.mock('../data/skillsets/templar', () => ({
  templarData: { class: 'Templar', skillLines: {} },
}));
jest.mock('../data/skillsets/warden', () => ({
  wardenData: { class: 'Warden', skillLines: {} },
}));

import {
  extractPlayerAbilityIds,
  createSkillLineAbilityMapping,
  analyzePlayerClassUsage,
  analyzePlayerClassFromEvents,
  GameAbility,
  AbilitiesData,
  ReportAbilitiesData,
  ClassAnalysisResult,
} from './classDetectionUtils';
import { KnownAbilities } from '../types/abilities';

describe('classDetectionUtils', () => {
  const playerId = '123'; // Fixed: use string version of the sourceID used in mock events
  const COMBUSTION_ID = 45011; // Known ability ID for Combustion

  const mockAbilitiesData: ReportAbilitiesData = {
    1001: {
      gameID: 1001,
      name: 'Crystal Shard',
      icon: 'crystal_shard',
      type: 'Active',
      __typename: 'ReportAbility',
    },
    1002: {
      gameID: 1002,
      name: 'Dark Magic Mastery',
      icon: 'dark_magic',
      type: 'Passive',
      __typename: 'ReportAbility',
    },
    1003: {
      gameID: 1003,
      name: 'Light Attack',
      icon: 'light_attack',
      type: 'Basic',
      __typename: 'ReportAbility',
    },
    [COMBUSTION_ID]: {
      gameID: COMBUSTION_ID,
      name: 'Combustion',
      icon: 'combustion',
      type: 'Passive',
      __typename: 'ReportAbility',
    },
  };

  const mockGameAbilitiesData: AbilitiesData = {
    '1001': {
      __typename: 'GameAbility',
      id: 1001,
      name: 'Crystal Shard',
      icon: 'crystal_shard',
    },
    '1002': {
      __typename: 'GameAbility',
      id: 1002,
      name: 'Dark Magic Mastery',
      icon: 'dark_magic',
    },
  };

  // Simplified mock events - using as any to avoid complex type requirements
  const mockCombatantInfoEvents: any[] = [
    {
      type: 'combatantinfo',
      sourceID: 123,
      auras: [
        { ability: 1001, source: 123, stacks: 1, icon: 'test', name: 'Test' },
        { ability: 1002, source: 123, stacks: 1, icon: 'test', name: 'Test' },
      ],
    },
  ];

  const mockCastEvents: any[] = [
    {
      type: 'cast',
      sourceID: 123,
      abilityGameID: 1001,
    },
    {
      type: 'begincast',
      sourceID: 123,
      abilityGameID: 1002,
    },
  ];

  const mockDamageEvents: any[] = [
    {
      type: 'damage',
      sourceID: 123,
      abilityGameID: 1001,
    },
  ];

  const mockBuffEvents: any[] = [
    {
      type: 'applybuff',
      sourceID: 123,
      abilityGameID: 1002,
    },
    {
      type: 'applybuffstack',
      sourceID: 123,
      abilityGameID: 1001,
    },
  ];

  const mockDebuffEvents: any[] = [
    {
      type: 'applydebuff',
      sourceID: 123,
      abilityGameID: 1001,
    },
    {
      type: 'applydebuffstack',
      sourceID: 123,
      abilityGameID: 1002,
    },
  ];

  const mockTalents: any[] = [
    {
      guid: 1001,
      name: 'Crystal Shard',
      total: 1,
    },
    {
      guid: 1002,
      name: 'Dark Magic Mastery',
      total: 3,
    },
  ];

  describe('extractPlayerAbilityIds', () => {
    it('should extract ability IDs from combatant info events', () => {
      const result = extractPlayerAbilityIds(playerId, mockCombatantInfoEvents, [], [], [], []);

      expect(result).toEqual(new Set([1001, 1002]));
    });

    it('should skip excluded aura abilities', () => {
      const auraEvents = [
        {
          type: 'combatantinfo',
          sourceID: 123,
          auras: [
            {
              ability: KnownAbilities.UNNERVING_BONEYARD,
              source: 123,
              stacks: 1,
              icon: '',
              name: '',
            },
          ],
        },
      ];

      const result = extractPlayerAbilityIds(playerId, auraEvents, [], [], [], []);

      expect(result).toEqual(new Set());
    });

    it('should extract ability IDs from cast events', () => {
      const result = extractPlayerAbilityIds(playerId, [], mockCastEvents, [], [], []);

      expect(result).toEqual(new Set([1001, 1002]));
    });

    it('should ignore ability IDs from damage events', () => {
      const result = extractPlayerAbilityIds(playerId, [], [], mockDamageEvents, [], []);

      expect(result).toEqual(new Set());
    });

    it('should extract ability IDs from buff events', () => {
      const result = extractPlayerAbilityIds(playerId, [], [], [], mockBuffEvents, []);

      expect(result).toEqual(new Set([1002, 1001]));
    });

    it('should extract ability IDs from debuff events', () => {
      const result = extractPlayerAbilityIds(playerId, [], [], [], [], mockDebuffEvents);

      expect(result).toEqual(new Set([1001, 1002]));
    });

    it('should extract ability IDs from talents', () => {
      const result = extractPlayerAbilityIds(playerId, [], [], [], [], [], mockTalents);

      expect(result).toEqual(new Set([1001, 1002]));
    });

    it('should combine ability IDs from all sources', () => {
      const result = extractPlayerAbilityIds(
        playerId,
        mockCombatantInfoEvents,
        mockCastEvents,
        mockDamageEvents,
        mockBuffEvents,
        mockDebuffEvents,
        mockTalents,
      );

      expect(result).toEqual(new Set([1001, 1002]));
    });
  });

  describe('createSkillLineAbilityMapping', () => {
    it('should create mapping for ReportAbilitiesData', () => {
      const result = createSkillLineAbilityMapping(mockAbilitiesData);

      expect(result[1001]).toEqual({
        className: 'Sorcerer',
        skillLineName: 'Dark Magic',
      });
      expect(result[1002]).toEqual({
        className: 'Sorcerer',
        skillLineName: 'Dark Magic',
      });
    });

    it('should create mapping for GameAbilitiesData', () => {
      const result = createSkillLineAbilityMapping(mockGameAbilitiesData);

      expect(result[1001]).toEqual({
        className: 'Sorcerer',
        skillLineName: 'Dark Magic',
      });
      expect(result[1002]).toEqual({
        className: 'Sorcerer',
        skillLineName: 'Dark Magic',
      });
    });

    it('should skip abilities with specific name/ID requirements when ID is wrong', () => {
      const combustionAbilityData = {
        999: {
          gameID: 999,
          name: 'Combustion',
          icon: 'combustion',
          type: 'Passive',
          __typename: 'ReportAbility' as const,
        },
      };

      const result = createSkillLineAbilityMapping(combustionAbilityData);
      expect(result[999]).toBeUndefined();
    });

    it('should include abilities with correct name/ID requirements', () => {
      const combustionAbilityData = {
        [COMBUSTION_ID]: {
          gameID: COMBUSTION_ID,
          name: 'Combustion',
          icon: 'combustion',
          type: 'Passive',
          __typename: 'ReportAbility' as const,
        },
      };

      const result = createSkillLineAbilityMapping(combustionAbilityData);
      expect(result[COMBUSTION_ID]).toEqual({
        className: 'Dragonknight',
        skillLineName: 'Earthen Heart',
      });
    });

    it('should skip abilities that match skip patterns', () => {
      const skipPatternAbilities = {
        1005: {
          gameID: 1005,
          name: 'Light Attack',
          icon: 'light_attack',
          type: 'Basic',
          __typename: 'ReportAbility' as const,
        },
        1006: {
          gameID: 1006,
          name: 'Heavy Attack',
          icon: 'heavy_attack',
          type: 'Basic',
          __typename: 'ReportAbility' as const,
        },
        1007: {
          gameID: 1007,
          name: 'Vampire Ability',
          icon: 'vampire',
          type: 'Active',
          __typename: 'ReportAbility' as const,
        },
      };

      const result = createSkillLineAbilityMapping(skipPatternAbilities);
      expect(result[1005]).toBeUndefined();
      expect(result[1006]).toBeUndefined();
      expect(result[1007]).toBeUndefined();
    });

    it('should handle abilities with null or undefined names', () => {
      const invalidNameAbilities = {
        1008: {
          gameID: 1008,
          name: null,
          icon: 'test',
          type: 'Active',
          __typename: 'ReportAbility' as const,
        },
        1009: {
          gameID: 1009,
          name: undefined,
          icon: 'test',
          type: 'Active',
          __typename: 'ReportAbility' as const,
        },
      };

      const result = createSkillLineAbilityMapping(invalidNameAbilities);
      expect(result[1008]).toBeUndefined();
      expect(result[1009]).toBeUndefined();
    });

    it('should match morphs of active abilities', () => {
      const morphAbility = {
        1010: {
          gameID: 1010,
          name: 'Crystal Fragments',
          icon: 'crystal_fragments',
          type: 'Active',
          __typename: 'ReportAbility' as const,
        },
      };

      const result = createSkillLineAbilityMapping(morphAbility);
      expect(result[1010]).toEqual({
        className: 'Sorcerer',
        skillLineName: 'Dark Magic',
      });
    });
  });

  describe('analyzePlayerClassUsage', () => {
    const mockSkillLineMapping = {
      1001: { className: 'Sorcerer', skillLineName: 'Dark Magic' },
      1002: { className: 'Sorcerer', skillLineName: 'Dark Magic' },
      1003: { className: 'Sorcerer', skillLineName: 'Daedric Summoning' },
    };

    it('should analyze class usage from ability IDs array', () => {
      const abilityIds = [1001, 1002, 1003];
      const result = analyzePlayerClassUsage(abilityIds, mockAbilitiesData, mockSkillLineMapping);

      expect(result.primary).toBe('Dark Magic');
      expect(result.skillLines).toHaveLength(2);
      expect(result.skillLines[0]).toEqual({
        skillLine: 'Dark Magic',
        className: 'Sorcerer',
        count: 2,
        skillIds: new Set([1001, 1002]),
      });
      expect(result.skillLines[1]).toEqual({
        skillLine: 'Daedric Summoning',
        className: 'Sorcerer',
        count: 1,
        skillIds: new Set([1003]),
      });
    });

    it('should analyze class usage from ability IDs set', () => {
      const abilityIds = new Set([1001, 1002]);
      const result = analyzePlayerClassUsage(abilityIds, mockAbilitiesData, mockSkillLineMapping);

      expect(result.primary).toBe('Dark Magic');
      expect(result.skillLines).toHaveLength(1);
      expect(result.skillLines[0].count).toBe(2);
    });

    it('should create skill line mapping if not provided', () => {
      const abilityIds = [1001, 1002];
      const result = analyzePlayerClassUsage(abilityIds, mockAbilitiesData);

      expect(result.primary).toBe('Dark Magic');
      expect(result.skillLines).toHaveLength(1);
    });

    it('should return null primary when no abilities match', () => {
      const abilityIds = [9999];
      const result = analyzePlayerClassUsage(abilityIds, mockAbilitiesData, mockSkillLineMapping);

      expect(result.primary).toBeNull();
      expect(result.skillLines).toHaveLength(0);
    });

    it('should sort skill lines by count descending', () => {
      const extendedMapping = {
        ...mockSkillLineMapping,
        1004: { className: 'Sorcerer', skillLineName: 'Storm Calling' },
        1005: { className: 'Sorcerer', skillLineName: 'Storm Calling' },
        1006: { className: 'Sorcerer', skillLineName: 'Storm Calling' },
      };

      const abilityIds = [1001, 1002, 1004, 1005, 1006]; // 2 Dark Magic, 3 Storm Calling
      const result = analyzePlayerClassUsage(abilityIds, mockAbilitiesData, extendedMapping);

      expect(result.primary).toBe('Storm Calling');
      expect(result.skillLines[0].skillLine).toBe('Storm Calling');
      expect(result.skillLines[0].count).toBe(3);
      expect(result.skillLines[1].skillLine).toBe('Dark Magic');
      expect(result.skillLines[1].count).toBe(2);
    });

    it('should handle duplicate ability IDs', () => {
      const abilityIds = [1001, 1001, 1002];
      const result = analyzePlayerClassUsage(abilityIds, mockAbilitiesData, mockSkillLineMapping);

      expect(result.skillLines[0].count).toBe(3); // Should count duplicates
    });
  });

  describe('analyzePlayerClassFromEvents', () => {
    it('should extract and analyze player class from events', () => {
      const result = analyzePlayerClassFromEvents(
        playerId,
        mockAbilitiesData,
        mockCombatantInfoEvents,
        mockCastEvents,
        mockDamageEvents,
        mockBuffEvents,
        mockDebuffEvents,
        mockTalents,
      );

      expect(result.primary).toBe('Dark Magic');
      expect(result.skillLines).toHaveLength(1);
      expect(result.skillLines[0].className).toBe('Sorcerer');
    });

    it('should work without talents', () => {
      const result = analyzePlayerClassFromEvents(
        playerId,
        mockAbilitiesData,
        mockCombatantInfoEvents,
        mockCastEvents,
        mockDamageEvents,
        mockBuffEvents,
        mockDebuffEvents,
      );

      expect(result.primary).toBe('Dark Magic');
      expect(result.skillLines).toHaveLength(1);
    });

    it('should work with pre-computed skill line mapping', () => {
      const mockSkillLineMapping = {
        1001: { className: 'Sorcerer', skillLineName: 'Dark Magic' },
        1002: { className: 'Sorcerer', skillLineName: 'Dark Magic' },
      };

      const result = analyzePlayerClassFromEvents(
        playerId,
        mockAbilitiesData,
        mockCombatantInfoEvents,
        mockCastEvents,
        mockDamageEvents,
        mockBuffEvents,
        mockDebuffEvents,
        mockTalents,
        mockSkillLineMapping,
      );

      expect(result.primary).toBe('Dark Magic');
      expect(result.skillLines).toHaveLength(1);
    });

    it('should return empty result for non-existent player', () => {
      const result = analyzePlayerClassFromEvents(
        'non-existent-player',
        mockAbilitiesData,
        mockCombatantInfoEvents,
        mockCastEvents,
        mockDamageEvents,
        mockBuffEvents,
        mockDebuffEvents,
      );

      expect(result.primary).toBeNull();
      expect(result.skillLines).toHaveLength(0);
    });

    it('should return empty result when only damage evidence exists', () => {
      const damageOnlyPlayer = 'damage-only';
      const damageOnlyEvents = [
        {
          type: 'damage',
          sourceID: damageOnlyPlayer,
          abilityGameID: COMBUSTION_ID,
        },
      ];

      const result = analyzePlayerClassFromEvents(
        damageOnlyPlayer,
        mockAbilitiesData,
        [],
        [],
        damageOnlyEvents,
        [],
        [],
        [],
      );

      expect(result.primary).toBeNull();
      expect(result.skillLines).toHaveLength(0);
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty input data gracefully', () => {
      const result = extractPlayerAbilityIds(playerId, [], [], [], [], []);
      expect(result).toEqual(new Set());
    });

    it('should handle missing skillset data', () => {
      // Use abilities that don't match any skillset data
      const unknownAbilitiesData: ReportAbilitiesData = {
        9999: {
          gameID: 9999,
          name: 'Unknown Ability',
          icon: 'unknown',
          type: 'Active',
          __typename: 'ReportAbility',
        },
      };

      const result = createSkillLineAbilityMapping(unknownAbilitiesData);
      expect(Object.keys(result)).toHaveLength(0);
    });

    it('should handle invalid event structures', () => {
      const invalidEvents = [
        { type: 'cast', timestamp: 1000 },
        { type: 'damage', sourceID: 123 },
      ] as any[];

      const result = extractPlayerAbilityIds(playerId, [], invalidEvents, invalidEvents, [], []);

      expect(result).toEqual(new Set());
    });

    it('should handle skillsets with array-format passives', () => {
      require('../data/skillsets/sorcerer').sorcererData = {
        class: 'Sorcerer',
        skillLines: {
          darkMagic: {
            name: 'Dark Magic',
            passives: [{ name: 'Dark Magic Mastery' }, { name: 'Another Passive' }],
          },
        },
      };

      const result = createSkillLineAbilityMapping(mockAbilitiesData);
      expect(result[1002]).toEqual({
        className: 'Sorcerer',
        skillLineName: 'Dark Magic',
      });
    });

    it('should handle events with string sourceIDs', () => {
      const stringSourceEvents = [
        {
          type: 'cast',
          sourceID: '123',
          abilityGameID: 1001,
        },
      ] as any[];

      const result = extractPlayerAbilityIds(playerId, [], stringSourceEvents, [], [], []);

      expect(result).toEqual(new Set([1001]));
    });
  });
});
