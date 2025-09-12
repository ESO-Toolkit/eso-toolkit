import React from 'react';
import {
  mapSkillToTooltipProps,
  buildTooltipPropsFromAbilityId,
  buildTooltipPropsFromClassAndName,
  buildTooltipProps,
  type MapSkillOptions,
} from './skillTooltipMapper';
import { SkillTooltipProps } from '../components/SkillTooltip';
import { type SkillNode } from './skillLinesRegistry';

// Mock the dependencies
jest.mock('./abilityIdMapper', () => ({
  abilityIdMapper: {
    getAbilityById: jest.fn(),
    getAbilityByName: jest.fn(),
    getIconUrl: jest.fn(),
  },
}));

jest.mock('./skillLinesRegistry', () => ({
  findSkillByName: jest.fn(),
  getClassKey: jest.fn(),
}));

// Import the mocked modules for type assertions
import { abilityIdMapper } from './abilityIdMapper';
import { findSkillByName, getClassKey } from './skillLinesRegistry';

const mockAbilityIdMapper = abilityIdMapper as jest.Mocked<typeof abilityIdMapper>;
const mockFindSkillByName = findSkillByName as jest.MockedFunction<typeof findSkillByName>;
const mockGetClassKey = getClassKey as jest.MockedFunction<typeof getClassKey>;

// Helper function to create mock ability data with required properties
const createMockAbilityData = (overrides = {}) => ({
  gameID: 123,
  name: 'Test Ability',
  icon: 'test_icon.png',
  ...overrides,
});

// Helper function to create mock skill search result with required properties
const createMockSkillSearchResult = (overrides = {}) => ({
  node: {
    name: 'Test Ability',
    description: 'Test description',
    cost: '100 Magicka',
  },
  skillLineName: 'Test Line',
  skillLineData: {
    class: 'Test Class',
    skillLines: {},
  },
  category: 'classes' as const,
  abilityType: 'actives' as const,
  parent: undefined,
  ...overrides,
});

describe('skillTooltipMapper', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('mapSkillToTooltipProps', () => {
    const createBasicNode = (): SkillNode => ({
      name: 'Test Ability',
      description: 'Test description',
      cost: '100 Magicka',
      target: 'Enemy',
      duration: '10 seconds',
      range: '28 meters',
    });

    const createBasicOptions = (overrides?: Partial<MapSkillOptions>): MapSkillOptions => ({
      className: 'Dragonknight',
      skillLineName: 'Ardent Flame',
      node: createBasicNode(),
      ...overrides,
    });

    it('should map basic skill node to tooltip props', () => {
      const options = createBasicOptions();
      const result = mapSkillToTooltipProps(options);

      expect(result).toEqual({
        headerBadge: 'Active',
        lineText: 'Dragonknight — Ardent Flame',
        iconUrl: undefined,
        iconSlug: undefined,
        abilityId: undefined,
        name: 'Test Ability',
        morphOf: undefined,
        stats: [
          { label: 'Cost', value: '100 Magicka' },
          { label: 'Target', value: 'Enemy' },
          { label: 'Duration', value: '10 seconds' },
          { label: 'Range', value: '28 meters' },
        ],
        description: 'Test description',
      });
    });

    it('should handle node with all stat properties', () => {
      const node: SkillNode = {
        name: 'Full Stats Ability',
        description: 'Full description',
        cost: '150 Magicka',
        target: 'Area',
        duration: '15 seconds',
        castTime: 'Instant',
        channelTime: '2 seconds',
        radius: '8 meters',
        maxRange: '35 meters',
        range: '28 meters',
        cooldown: '30 seconds',
      };

      const options = createBasicOptions({ node });
      const result = mapSkillToTooltipProps(options);

      expect(result.stats).toEqual([
        { label: 'Cost', value: '150 Magicka' },
        { label: 'Target', value: 'Area' },
        { label: 'Duration', value: '15 seconds' },
        { label: 'Cast Time', value: 'Instant' },
        { label: 'Channel Time', value: '2 seconds' },
        { label: 'Radius', value: '8 meters' },
        { label: 'Max Range', value: '35 meters' },
        { label: 'Range', value: '28 meters' },
        { label: 'Cooldown', value: '30 seconds' },
      ]);
    });

    it('should filter out empty or whitespace-only stat values', () => {
      const node: SkillNode = {
        name: 'Test Ability',
        description: 'Test description',
        cost: '100 Magicka',
        target: '',
        duration: '   ',
        range: '28 meters',
      };

      const options = createBasicOptions({ node });
      const result = mapSkillToTooltipProps(options);

      expect(result.stats).toEqual([
        { label: 'Cost', value: '100 Magicka' },
        { label: 'Range', value: '28 meters' },
      ]);
    });

    it('should inherit stats from parent node when inheritFrom is provided', () => {
      const parentNode: SkillNode = {
        name: 'Parent Ability',
        description: 'Parent description',
        cost: '100 Magicka',
        target: 'Enemy',
        duration: '10 seconds',
      };

      const childNode: SkillNode = {
        name: 'Morph Ability',
        description: 'Morph description',
        cost: '120 Magicka', // Override parent cost
        range: '28 meters', // Add new stat
      };

      const options = createBasicOptions({
        node: childNode,
        inheritFrom: parentNode,
      });
      const result = mapSkillToTooltipProps(options);

      expect(result.stats).toEqual([
        { label: 'Cost', value: '120 Magicka' }, // Child overrides parent
        { label: 'Target', value: 'Enemy' }, // Inherited from parent
        { label: 'Duration', value: '10 seconds' }, // Inherited from parent
        { label: 'Range', value: '28 meters' }, // New in child
      ]);
    });

    it('should use custom headerBadge when provided', () => {
      const options = createBasicOptions({ headerBadge: 'Ultimate' });
      const result = mapSkillToTooltipProps(options);

      expect(result.headerBadge).toBe('Ultimate');
    });

    it('should derive headerBadge from node type when available', () => {
      const node = { ...createBasicNode(), type: 'passive' };
      const options = createBasicOptions({ node });
      const result = mapSkillToTooltipProps(options);

      expect(result.headerBadge).toBe('Passive');
    });

    it('should default to "Active" headerBadge when no type or custom badge', () => {
      const options = createBasicOptions();
      const result = mapSkillToTooltipProps(options);

      expect(result.headerBadge).toBe('Active');
    });

    it('should handle icon properties', () => {
      const options = createBasicOptions({
        abilityId: 12345,
        iconSlug: 'test-icon',
        iconUrl: 'https://example.com/icon.png',
      });
      const result = mapSkillToTooltipProps(options);

      expect(result.abilityId).toBe(12345);
      expect(result.iconSlug).toBe('test-icon');
      expect(result.iconUrl).toBe('https://example.com/icon.png');
    });

    it('should handle morphOfName property', () => {
      const options = createBasicOptions({ morphOfName: 'Base Ability' });
      const result = mapSkillToTooltipProps(options);

      expect(result.morphOf).toBe('Base Ability');
    });

    it('should prefer morph description over base description', () => {
      const parentNode: SkillNode = {
        name: 'Parent Ability',
        description: 'This is the base ability description.',
        cost: '100 Magicka',
      };

      const childNode: SkillNode = {
        name: 'Morph Ability',
        description: 'This is the morph description.',
        cost: '120 Magicka',
      };

      const options = createBasicOptions({
        node: childNode,
        inheritFrom: parentNode,
      });
      const result = mapSkillToTooltipProps(options);

      expect(result.description).toBe('This is the morph description.');
    });

    it('should fall back to base description when morph has no description', () => {
      const parentNode: SkillNode = {
        name: 'Parent Ability',
        description: 'This is the base ability description.',
        cost: '100 Magicka',
      };

      const childNode: SkillNode = {
        name: 'Morph Ability',
        cost: '120 Magicka',
        // No description
      };

      const options = createBasicOptions({
        node: childNode,
        inheritFrom: parentNode,
      });
      const result = mapSkillToTooltipProps(options);

      expect(result.description).toBe('This is the base ability description.');
    });

    it('should synthesize pulse information into description', () => {
      const node: SkillNode = {
        name: 'Pulse Ability',
        description: 'Base description.',
        pulseInterval: 'every 2 seconds',
        pulseDamage: '500 damage',
        cost: '100 Magicka',
      };

      const options = createBasicOptions({ node });
      const result = mapSkillToTooltipProps(options);

      // Should create React Fragment with description and pulse info
      expect(React.isValidElement(result.description)).toBe(true);
    });

    it('should add passive buff information', () => {
      const parentNode: SkillNode = {
        name: 'Passive Ability',
        description: 'Base description.',
        passiveBuff: '10% increased damage',
        cost: '100 Magicka',
      };

      const options = createBasicOptions({ inheritFrom: parentNode });
      const result = mapSkillToTooltipProps(options);

      // Should create React Fragment with buff info
      expect(React.isValidElement(result.description)).toBe(true);
    });

    it('should handle unknown ability name gracefully', () => {
      const node: SkillNode = {
        // No name provided
        description: 'Test description',
        cost: '100 Magicka',
      };

      const options = createBasicOptions({ node });
      const result = mapSkillToTooltipProps(options);

      expect(result.name).toBe('Unknown');
    });

    it('should handle empty description gracefully', () => {
      const node: SkillNode = {
        name: 'Test Ability',
        // No description
        cost: '100 Magicka',
      };

      const options = createBasicOptions({ node });
      const result = mapSkillToTooltipProps(options);

      expect(result.description).toBe('');
    });
  });

  describe('buildTooltipPropsFromAbilityId', () => {
    beforeEach(() => {
      mockGetClassKey.mockReturnValue('dragonknight');
    });

    it('should return null when ability ID is not found', () => {
      mockAbilityIdMapper.getAbilityById.mockReturnValue(null);

      const result = buildTooltipPropsFromAbilityId(999);

      expect(result).toBeNull();
      expect(mockAbilityIdMapper.getAbilityById).toHaveBeenCalledWith(999);
    });

    it('should return detailed tooltip when skill is found', () => {
      const abilityData = {
        gameID: 123,
        name: 'Lava Whip',
        description: 'Test description',
        icon: 'lava_whip.png',
      };

      const skillData = {
        node: {
          name: 'Lava Whip',
          description: 'Detailed description',
          cost: '100 Magicka',
        },
        skillLineName: 'Ardent Flame',
        skillLineData: { class: 'Dragonknight' },
        parent: undefined,
        category: 'classes' as const,
        abilityType: 'actives' as const,
      };

      mockAbilityIdMapper.getAbilityById.mockReturnValue(abilityData);
      mockAbilityIdMapper.getIconUrl.mockReturnValue('https://example.com/icon.png');
      mockFindSkillByName.mockReturnValue(skillData);

      const result = buildTooltipPropsFromAbilityId(123);

      expect(result?.name).toBe('Lava Whip');
      expect(result?.lineText).toBe('Dragonknight — Ardent Flame');
      expect(result?.abilityId).toBe(123);
      expect(result?.iconUrl).toBe('https://example.com/icon.png');
      expect(result?.headerBadge).toBe('Active');
      expect(result?.stats).toEqual([{ label: 'Cost', value: '100 Magicka' }]);
    });

    it('should handle morph abilities with parent reference', () => {
      const abilityData = {
        gameID: 124,
        name: 'Flame Lash',
        description: 'Morph description',
      };

      const parentNode = {
        name: 'Lava Whip',
        description: 'Base description',
        cost: '100 Magicka',
      };

      const skillData = {
        node: {
          name: 'Flame Lash',
          description: 'Morph description',
          cost: '110 Magicka',
        },
        skillLineName: 'Ardent Flame',
        skillLineData: { class: 'Dragonknight' },
        parent: parentNode,
      };

      mockAbilityIdMapper.getAbilityById.mockReturnValue(abilityData);
      mockFindSkillByName.mockReturnValue(skillData);

      const result = buildTooltipPropsFromAbilityId(124);

      expect(result?.morphOf).toBe('Lava Whip');
      expect(result?.name).toBe('Flame Lash');
    });

    it('should fall back to basic tooltip when skill not found in registry', () => {
      const abilityData = {
        gameID: 125,
        name: 'Unknown Ability',
        description: 'Unknown description',
      };

      mockAbilityIdMapper.getAbilityById.mockReturnValue(abilityData);
      mockAbilityIdMapper.getIconUrl.mockReturnValue('https://example.com/icon.png');
      mockFindSkillByName.mockReturnValue(null);

      const result = buildTooltipPropsFromAbilityId(125);

      expect(result).toEqual({
        name: 'Unknown Ability',
        description: 'Unknown Ability (ID: 125)',
        abilityId: 125,
        iconUrl: 'https://example.com/icon.png',
        lineText: 'Unknown Skill Line',
        stats: [],
      });
    });

    it('should handle weapon skill lines', () => {
      const abilityData = {
        gameID: 126,
        name: 'Snipe',
        description: 'Bow ability',
      };

      const skillData = {
        node: {
          name: 'Snipe',
          description: 'Bow ability description',
          cost: '75 Stamina',
        },
        skillLineName: 'Bow',
        skillLineData: { weapon: 'Bow' },
        parent: undefined,
      };

      mockAbilityIdMapper.getAbilityById.mockReturnValue(abilityData);
      mockFindSkillByName.mockReturnValue(skillData);
      mockGetClassKey.mockReturnValue('bow');

      const result = buildTooltipPropsFromAbilityId(126);

      expect(result?.lineText).toBe('Bow — Bow');
    });
  });

  describe('buildTooltipPropsFromClassAndName', () => {
    it('should return detailed tooltip when skill is found', () => {
      const skillData = {
        node: {
          name: 'Lava Whip',
          description: 'Detailed description',
          cost: '100 Magicka',
        },
        skillLineName: 'Ardent Flame',
        skillLineData: { class: 'Dragonknight' },
        parent: undefined,
      };

      const abilityData = {
        gameID: 123,
        name: 'Lava Whip',
      };

      mockFindSkillByName.mockReturnValue(skillData);
      mockAbilityIdMapper.getAbilityByName.mockReturnValue(abilityData);
      mockAbilityIdMapper.getIconUrl.mockReturnValue('https://example.com/icon.png');
      mockGetClassKey.mockReturnValue('dragonknight');

      const result = buildTooltipPropsFromClassAndName('dragonknight', 'Lava Whip');

      expect(result?.name).toBe('Lava Whip');
      expect(result?.abilityId).toBe(123);
      expect(result?.iconUrl).toBe('https://example.com/icon.png');
    });

    it('should handle abilities without ability ID mapping', () => {
      const skillData = {
        node: {
          name: 'Custom Ability',
          description: 'Custom description',
          cost: '100 Magicka',
        },
        skillLineName: 'Custom Line',
        skillLineData: { class: 'Custom Class' },
        parent: undefined,
      };

      mockFindSkillByName.mockReturnValue(skillData);
      mockAbilityIdMapper.getAbilityByName.mockReturnValue(null);
      mockGetClassKey.mockReturnValue('custom');

      const result = buildTooltipPropsFromClassAndName('custom', 'Custom Ability');

      expect(result?.name).toBe('Custom Ability');
      expect(result?.abilityId).toBeUndefined();
      expect(result?.iconUrl).toBeUndefined();
    });

    it('should return weapon ability fallback for Elemental Blockade variants', () => {
      mockFindSkillByName.mockReturnValue(null);

      const result = buildTooltipPropsFromClassAndName('', 'Blockade of Fire');

      expect(result).toEqual({
        name: 'Blockade of Fire',
        lineText: 'Destruction Staff',
        description: expect.stringContaining('Slam your staff down to create an elemental barrier'),
        stats: [
          { label: 'Cost', value: '2970 Magicka' },
          { label: 'Target', value: 'Area' },
          { label: 'Duration', value: '15 seconds' },
          { label: 'Radius', value: '18 meters' },
        ],
      });
    });

    it('should return weapon ability fallback for Wall variants', () => {
      mockFindSkillByName.mockReturnValue(null);

      const result = buildTooltipPropsFromClassAndName('', 'Wall of Fire');

      expect(result).toEqual({
        name: 'Wall of Fire',
        lineText: 'Destruction Staff',
        description: expect.stringContaining('Slam your staff down to create an elemental barrier'),
        stats: [
          { label: 'Cost', value: '2970 Magicka' },
          { label: 'Target', value: 'Area' },
          { label: 'Duration', value: '10 seconds' },
          { label: 'Radius', value: '18 meters' },
        ],
      });
    });

    it('should return null for unknown abilities', () => {
      mockFindSkillByName.mockReturnValue(null);

      const result = buildTooltipPropsFromClassAndName('', 'Unknown Ability');

      expect(result).toBeNull();
    });
  });

  describe('buildTooltipProps', () => {
    it('should prefer ability ID when both ID and name are provided', () => {
      const abilityData = {
        gameID: 123,
        name: 'Lava Whip',
      };

      mockAbilityIdMapper.getAbilityById.mockReturnValue(abilityData);
      // Note: buildTooltipPropsFromAbilityId calls findSkillByName internally when abilityData.name exists
      mockFindSkillByName.mockReturnValue(null); // Simulate fallback case

      const result = buildTooltipProps({
        abilityId: 123,
        abilityName: 'Some Other Ability',
        classKey: 'dragonknight',
      });

      expect(mockAbilityIdMapper.getAbilityById).toHaveBeenCalledWith(123);
      // findSkillByName is called because abilityData.name exists
    });

    it('should use name-based lookup when only name is provided', () => {
      const skillData = {
        node: { name: 'Test Ability', description: 'Test' },
        skillLineName: 'Test Line',
        skillLineData: { class: 'Test Class' },
        parent: undefined,
      };

      mockFindSkillByName.mockReturnValue(skillData);
      mockGetClassKey.mockReturnValue('test');

      const result = buildTooltipProps({
        abilityName: 'Test Ability',
        classKey: 'test',
      });

      expect(mockFindSkillByName).toHaveBeenCalledWith('Test Ability');
      expect(result?.name).toBe('Test Ability');
    });

    it('should return null when no valid options provided', () => {
      const result = buildTooltipProps({});

      expect(result).toBeNull();
    });

    it('should work without classKey in name-based lookup', () => {
      const skillData = {
        node: { name: 'Test Ability', description: 'Test' },
        skillLineName: 'Test Line',
        skillLineData: { class: 'Test Class' },
        parent: undefined,
      };

      mockFindSkillByName.mockReturnValue(skillData);
      mockGetClassKey.mockReturnValue('test');

      const result = buildTooltipProps({
        abilityName: 'Test Ability',
      });

      expect(result?.name).toBe('Test Ability');
    });
  });

  describe('edge cases and error handling', () => {
    it('should handle null/undefined ability data gracefully', () => {
      mockAbilityIdMapper.getAbilityById.mockReturnValue(null);

      expect(() => buildTooltipPropsFromAbilityId(999)).not.toThrow();
      expect(buildTooltipPropsFromAbilityId(999)).toBeNull();
    });

    it('should handle malformed skill node data', () => {
      const malformedNode = {
        // Missing required properties
        cost: 'invalid',
        target: null,
      } as any;

      const options: MapSkillOptions = {
        className: 'Test',
        skillLineName: 'Test',
        node: malformedNode,
      };

      expect(() => mapSkillToTooltipProps(options)).not.toThrow();

      const result = mapSkillToTooltipProps(options);
      expect(result.name).toBe('Unknown');
      expect(result.stats).toEqual([{ label: 'Cost', value: 'invalid' }]); // Stats are extracted as strings
    });

    it('should handle empty ability names in search', () => {
      const result1 = buildTooltipPropsFromClassAndName('', '');
      const result2 = buildTooltipPropsFromClassAndName('', '   ');

      expect(result1).toBeNull();
      expect(result2).toBeNull();
    });
  });

  describe('weapon ability fallbacks', () => {
    beforeEach(() => {
      mockFindSkillByName.mockReturnValue(null);
    });

    it('should normalize Blockade variants', () => {
      const variants = ['Blockade of Fire', 'Blockade of Frost', 'Blockade of Storms'];

      variants.forEach((variant) => {
        const result = buildTooltipPropsFromClassAndName('', variant);
        expect(result?.name).toBe(variant);
        expect(result?.lineText).toBe('Destruction Staff');
        expect(result?.stats).toEqual([
          { label: 'Cost', value: '2970 Magicka' },
          { label: 'Target', value: 'Area' },
          { label: 'Duration', value: '15 seconds' },
          { label: 'Radius', value: '18 meters' },
        ]);
      });
    });

    it('should normalize Wall variants', () => {
      const variants = ['Wall of Fire', 'Wall of Frost', 'Wall of Storms'];

      variants.forEach((variant) => {
        const result = buildTooltipPropsFromClassAndName('', variant);
        expect(result?.name).toBe(variant);
        expect(result?.lineText).toBe('Destruction Staff');
        expect(result?.stats?.[2]).toEqual({ label: 'Duration', value: '10 seconds' });
      });
    });

    it('should not normalize Wall of Elements (already normalized)', () => {
      const result = buildTooltipPropsFromClassAndName('', 'Wall of Elements');
      expect(result?.name).toBe('Wall of Elements');
    });
  });
});
