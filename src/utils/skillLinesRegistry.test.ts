import {
  SKILL_LINES_REGISTRY,
  ALL_SKILL_LINES,
  findSkillByName,
  getClassKey,
  type SkillNode,
  type SkillSearchResult,
} from './skillLinesRegistry';
import { type SkillsetData, type SkillLine } from '../data/skillsets/Skillset';

// Mock the imported skill line data modules
jest.mock('../data/skill-lines/Alliance/assault', () => ({
  assaultData: {
    class: 'Alliance War',
    skillLines: {
      assault: {
        name: 'Assault',
        ultimates: [
          {
            name: 'War Horn',
            description: 'Sound a war horn',
            cost: '250',
            morphs: [
              { name: 'Aggressive Horn', description: 'Morph 1' },
              { name: 'Sturdy Horn', description: 'Morph 2' },
            ],
          },
        ],
        actives: [
          {
            name: 'Rapid Maneuver',
            description: 'Increase movement speed',
            cost: '100',
          },
        ],
        passives: [
          {
            name: 'Continuous Attack',
            description: 'Passive ability',
          },
        ],
      },
    },
  },
}));

jest.mock('../data/skill-lines/Alliance/support', () => ({
  supportData: {
    class: 'Alliance War',
    skillLines: {
      support: {
        name: 'Support',
        ultimates: [],
        actives: [],
        passives: [],
      },
    },
  },
}));

jest.mock('../data/skill-lines/class/arcanist', () => ({
  arcanistData: {
    class: 'Arcanist',
    skillLines: {
      heraldOfTheTome: {
        name: 'Herald of the Tome',
        ultimates: [
          {
            name: 'The Imperfect Ring',
            description: 'Arcanist ultimate',
            cost: '200',
          },
        ],
        activeAbilities: [
          {
            name: 'Runic Jolt',
            description: 'Arcanist ability',
            cost: '75',
            morphs: {
              morph1: { name: 'Runic Sunder', description: 'Morph 1' },
              morph2: { name: 'Runic Embrace', description: 'Morph 2' },
            },
          },
        ],
        passives: [],
      },
    },
  },
}));

jest.mock('../data/skill-lines/class/dragonknight', () => ({
  dragonknightData: {
    class: 'Dragonknight',
    skillLines: {
      ardentFlame: {
        name: 'Ardent Flame',
        ultimates: [
          {
            name: 'Dragonknight Standard',
            description: 'Ultimate ability',
            cost: '250',
          },
        ],
        actives: [
          {
            name: 'Lava Whip',
            description: 'Active ability',
            cost: '100',
          },
        ],
        passives: [],
      },
    },
  },
}));

jest.mock('../data/skill-lines/weapons/bow', () => ({
  bowData: {
    weapon: 'Bow',
    skillLines: {
      bow: {
        name: 'Bow',
        ultimates: [
          {
            name: 'Ballista',
            description: 'Bow ultimate',
            cost: '200',
          },
        ],
        actives: [
          {
            name: 'Snipe',
            description: 'Bow ability',
            cost: '75',
          },
        ],
        passives: [],
      },
    },
  },
}));

// Mock all other skill line imports with minimal data
jest.mock('../data/skill-lines/class/necromancer', () => ({
  necromancerData: { class: 'Necromancer', skillLines: {} },
}));
jest.mock('../data/skill-lines/class/nightblade', () => ({
  nightbladeData: { class: 'Nightblade', skillLines: {} },
}));
jest.mock('../data/skill-lines/class/sorcerer', () => ({
  sorcererData: { class: 'Sorcerer', skillLines: {} },
}));
jest.mock('../data/skill-lines/class/templar', () => ({
  templarData: { class: 'Templar', skillLines: {} },
}));
jest.mock('../data/skill-lines/class/warden', () => ({
  wardenData: { class: 'Warden', skillLines: {} },
}));
jest.mock('../data/skill-lines/guild/darkBrotherhood', () => ({
  darkBrotherhoodData: { skillLines: {} },
}));
jest.mock('../data/skill-lines/guild/fightersGuild', () => ({
  fightersGuildData: { skillLines: {} },
}));
jest.mock('../data/skill-lines/guild/magesGuild', () => ({ magesGuildData: { skillLines: {} } }));
jest.mock('../data/skill-lines/guild/psijicOrder', () => ({ psijicOrderData: { skillLines: {} } }));
jest.mock('../data/skill-lines/guild/thievesGuild', () => ({
  thievesGuildData: { skillLines: {} },
}));
jest.mock('../data/skill-lines/guild/undaunted', () => ({ undauntedData: { skillLines: {} } }));
jest.mock('../data/skill-lines/weapons/destructionStaff', () => ({
  destructionStaffData: { weapon: 'Destruction Staff', skillLines: {} },
}));
jest.mock('../data/skill-lines/weapons/dualWield', () => ({
  dualWieldData: { weapon: 'Dual Wield', skillLines: {} },
}));
jest.mock('../data/skill-lines/weapons/oneHand', () => ({
  oneHandAndShieldData: { weapon: 'One Hand and Shield', skillLines: {} },
}));
jest.mock('../data/skill-lines/weapons/restoration', () => ({
  restorationStaffData: { weapon: 'Restoration Staff', skillLines: {} },
}));
jest.mock('../data/skill-lines/weapons/twoHanded', () => ({
  twoHandedData: { weapon: 'Two Handed', skillLines: {} },
}));

describe('skillLinesRegistry', () => {
  describe('SKILL_LINES_REGISTRY', () => {
    it('should contain all expected categories', () => {
      expect(SKILL_LINES_REGISTRY).toHaveProperty('classes');
      expect(SKILL_LINES_REGISTRY).toHaveProperty('weapons');
      expect(SKILL_LINES_REGISTRY).toHaveProperty('alliance');
      expect(SKILL_LINES_REGISTRY).toHaveProperty('guild');
    });

    it('should contain expected class skill lines', () => {
      expect(SKILL_LINES_REGISTRY.classes).toHaveProperty('arcanist');
      expect(SKILL_LINES_REGISTRY.classes).toHaveProperty('dragonknight');
      expect(SKILL_LINES_REGISTRY.classes).toHaveProperty('necromancer');
      expect(SKILL_LINES_REGISTRY.classes).toHaveProperty('nightblade');
      expect(SKILL_LINES_REGISTRY.classes).toHaveProperty('sorcerer');
      expect(SKILL_LINES_REGISTRY.classes).toHaveProperty('templar');
      expect(SKILL_LINES_REGISTRY.classes).toHaveProperty('warden');
    });

    it('should contain expected weapon skill lines', () => {
      expect(SKILL_LINES_REGISTRY.weapons).toHaveProperty('bow');
      expect(SKILL_LINES_REGISTRY.weapons).toHaveProperty('destructionStaff');
      expect(SKILL_LINES_REGISTRY.weapons).toHaveProperty('dualWield');
      expect(SKILL_LINES_REGISTRY.weapons).toHaveProperty('oneHandAndShield');
      expect(SKILL_LINES_REGISTRY.weapons).toHaveProperty('restorationStaff');
      expect(SKILL_LINES_REGISTRY.weapons).toHaveProperty('twoHanded');
    });

    it('should contain expected alliance skill lines', () => {
      expect(SKILL_LINES_REGISTRY.alliance).toHaveProperty('assault');
      expect(SKILL_LINES_REGISTRY.alliance).toHaveProperty('support');
    });

    it('should contain expected guild skill lines', () => {
      expect(SKILL_LINES_REGISTRY.guild).toHaveProperty('undaunted');
      expect(SKILL_LINES_REGISTRY.guild).toHaveProperty('fightersGuild');
      expect(SKILL_LINES_REGISTRY.guild).toHaveProperty('magesGuild');
      expect(SKILL_LINES_REGISTRY.guild).toHaveProperty('thievesGuild');
      expect(SKILL_LINES_REGISTRY.guild).toHaveProperty('darkBrotherhood');
      expect(SKILL_LINES_REGISTRY.guild).toHaveProperty('psijicOrder');
    });
  });

  describe('ALL_SKILL_LINES', () => {
    it('should be a flattened array of all skill lines', () => {
      expect(Array.isArray(ALL_SKILL_LINES)).toBe(true);
      expect(ALL_SKILL_LINES.length).toBeGreaterThan(0);
    });

    it('should contain skill line data from all categories', () => {
      const hasClasses = ALL_SKILL_LINES.some((sl) => sl.class === 'Arcanist');
      const hasWeapons = ALL_SKILL_LINES.some((sl) => sl.weapon === 'Bow');
      const hasAlliance = ALL_SKILL_LINES.some((sl) => sl.class === 'Alliance War');

      expect(hasClasses).toBe(true);
      expect(hasWeapons).toBe(true);
      expect(hasAlliance).toBe(true);
    });
  });

  describe('findSkillByName', () => {
    it('should find basic abilities by exact name match', () => {
      const result = findSkillByName('War Horn');

      expect(result).toBeDefined();
      expect(result?.node.name).toBe('War Horn');
      expect(result?.skillLineName).toBe('Assault');
      expect(result?.category).toBe('alliance');
      expect(result?.abilityType).toBe('ultimates');
      expect(result?.parent).toBeUndefined();
    });

    it('should find abilities in different categories', () => {
      const ultimateResult = findSkillByName('War Horn');
      const activeResult = findSkillByName('Rapid Maneuver');
      const passiveResult = findSkillByName('Continuous Attack');

      expect(ultimateResult?.abilityType).toBe('ultimates');
      expect(activeResult?.abilityType).toBe('actives');
      expect(passiveResult?.abilityType).toBe('passives');
    });

    it('should find abilities from different skill line categories', () => {
      const classAbility = findSkillByName('The Imperfect Ring');
      const weaponAbility = findSkillByName('Ballista');
      const allianceAbility = findSkillByName('War Horn');

      expect(classAbility?.category).toBe('classes');
      expect(weaponAbility?.category).toBe('weapons');
      expect(allianceAbility?.category).toBe('alliance');
    });

    it('should find abilities using activeAbilities collection', () => {
      const result = findSkillByName('Runic Jolt');

      expect(result).toBeDefined();
      expect(result?.node.name).toBe('Runic Jolt');
      expect(result?.abilityType).toBe('activeAbilities');
      expect(result?.category).toBe('classes');
    });

    it('should find morphs and include parent reference', () => {
      const morphResult = findSkillByName('Aggressive Horn');

      expect(morphResult).toBeDefined();
      expect(morphResult?.node.name).toBe('Aggressive Horn');
      expect(morphResult?.parent?.name).toBe('War Horn');
      expect(morphResult?.skillLineName).toBe('Assault');
    });

    it('should find morphs with object structure', () => {
      const morphResult = findSkillByName('Runic Sunder');

      expect(morphResult).toBeDefined();
      expect(morphResult?.node.name).toBe('Runic Sunder');
      expect(morphResult?.parent?.name).toBe('Runic Jolt');
      expect(morphResult?.category).toBe('classes');
    });

    it('should handle case-insensitive search', () => {
      const result1 = findSkillByName('war horn');
      const result2 = findSkillByName('WAR HORN');
      const result3 = findSkillByName('War Horn');

      expect(result1?.node.name).toBe('War Horn');
      expect(result2?.node.name).toBe('War Horn');
      expect(result3?.node.name).toBe('War Horn');
    });

    it('should handle names with extra whitespace', () => {
      const result = findSkillByName('  War Horn  ');

      expect(result?.node.name).toBe('War Horn');
    });

    it('should return null for non-existent abilities', () => {
      const result = findSkillByName('Non Existent Ability');

      expect(result).toBeNull();
    });

    it('should return null for empty or invalid input', () => {
      expect(findSkillByName('')).toBeNull();
      expect(findSkillByName('   ')).toBeNull();
      expect(findSkillByName(null as any)).toBeNull();
      expect(findSkillByName(undefined as any)).toBeNull();
    });

    it('should handle skill lines without abilities gracefully', () => {
      // Test against skill lines that have empty collections
      const result = findSkillByName('Some Random Ability');

      expect(result).toBeNull();
    });

    it('should handle malformed data gracefully', () => {
      // The function should not throw even if data structure is unexpected
      expect(() => findSkillByName('Any Ability')).not.toThrow();
    });
  });

  describe('getClassKey', () => {
    it('should return class key for class data', () => {
      const classData: SkillsetData = {
        class: 'Dragonknight',
        skillLines: {},
      };

      const result = getClassKey(classData);

      expect(result).toBe('dragonknight');
    });

    it('should return weapon key for weapon data', () => {
      const weaponData: SkillsetData = {
        weapon: 'Destruction Staff',
        skillLines: {},
      };

      const result = getClassKey(weaponData);

      expect(result).toBe('destruction staff');
    });

    it('should return "unknown" for data without class or weapon', () => {
      const unknownData: SkillsetData = {
        skillLines: {},
      };

      const result = getClassKey(unknownData);

      expect(result).toBe('unknown');
    });

    it('should handle null/undefined input gracefully', () => {
      expect(getClassKey(null as any)).toBe('unknown');
      expect(getClassKey(undefined as any)).toBe('unknown');
      expect(getClassKey({} as any)).toBe('unknown');
    });

    it('should convert keys to lowercase', () => {
      const mixedCaseData: SkillsetData = {
        class: 'TEMPLAR',
        skillLines: {},
      };

      const result = getClassKey(mixedCaseData);

      expect(result).toBe('templar');
    });
  });

  describe('integration tests', () => {
    it('should find abilities across all mocked skill lines', () => {
      const abilityNames = [
        'War Horn',
        'Rapid Maneuver',
        'Continuous Attack',
        'The Imperfect Ring',
        'Runic Jolt',
        'Dragonknight Standard',
        'Lava Whip',
        'Ballista',
        'Snipe',
      ];

      abilityNames.forEach((name) => {
        const result = findSkillByName(name);
        expect(result).toBeDefined();
        expect(result?.node.name).toBe(name);
      });
    });

    it('should find all morph variations', () => {
      const morphNames = ['Aggressive Horn', 'Sturdy Horn', 'Runic Sunder', 'Runic Embrace'];

      morphNames.forEach((name) => {
        const result = findSkillByName(name);
        expect(result).toBeDefined();
        expect(result?.node.name).toBe(name);
        expect(result?.parent).toBeDefined();
      });
    });

    it('should maintain correct hierarchy for morph abilities', () => {
      const baseAbility = findSkillByName('War Horn');
      const morph1 = findSkillByName('Aggressive Horn');
      const morph2 = findSkillByName('Sturdy Horn');

      expect(baseAbility?.parent).toBeUndefined();
      expect(morph1?.parent?.name).toBe('War Horn');
      expect(morph2?.parent?.name).toBe('War Horn');
    });

    it('should handle different ability collection types', () => {
      // Test arrays (assault data)
      const arrayResult = findSkillByName('War Horn');
      expect(arrayResult).toBeDefined();

      // Test objects (arcanist data)
      const objectResult = findSkillByName('Runic Jolt');
      expect(objectResult).toBeDefined();
    });
  });

  describe('data integrity tests', () => {
    it('should have valid skill line names in search results', () => {
      const result = findSkillByName('War Horn');

      expect(result?.skillLineName).toBeTruthy();
      expect(typeof result?.skillLineName).toBe('string');
    });

    it('should have valid category classifications', () => {
      const validCategories = ['classes', 'weapons', 'alliance', 'guild'];
      const result = findSkillByName('War Horn');

      expect(validCategories).toContain(result?.category);
    });

    it('should have valid ability type classifications', () => {
      const validTypes = ['ultimates', 'actives', 'activeAbilities', 'passives'];
      const result = findSkillByName('War Horn');

      expect(validTypes).toContain(result?.abilityType);
    });

    it('should preserve all node properties in search results', () => {
      const result = findSkillByName('War Horn');

      expect(result?.node).toEqual(
        expect.objectContaining({
          name: 'War Horn',
          description: 'Sound a war horn',
          cost: '250',
          morphs: expect.any(Array),
        }),
      );
    });
  });
});
