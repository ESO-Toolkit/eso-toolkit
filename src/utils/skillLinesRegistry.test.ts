import {
  SKILL_LINES_REGISTRY,
  ALL_SKILL_LINES,
  findSkillByName,
  getClassKey,
} from './skillLinesRegistry';
import type { SkillLineData } from '../data/types/skill-line-types';

jest.mock('../data/skill-lines/class', () => ({
  ardentFlame: {
    id: 'class.ardent-flame',
    name: 'Ardent Flame',
    class: 'Dragonknight',
    category: 'class',
    icon: 'icon-ardent-flame',
    skills: [
      {
        id: 1,
        name: 'Dragonknight Standard',
        type: 'ultimate',
        description: 'Ultimate ability',
      },
      {
        id: 2,
        name: 'Lava Whip',
        type: 'active',
        description: 'Active ability',
      },
      {
        id: 3,
        name: 'Combustion',
        type: 'passive',
        description: 'Passive ability',
      },
    ],
  },
  heraldOfTheTome: {
    id: 'class.herald-of-the-tome',
    name: 'Herald of the Tome',
    class: 'Arcanist',
    category: 'class',
    icon: 'icon-herald',
    skills: [
      {
        id: 10,
        name: 'The Imperfect Ring',
        type: 'ultimate',
        description: 'Arcanist ultimate',
      },
      {
        id: 11,
        name: 'Runic Jolt',
        type: 'active',
        description: 'Arcanist active ability',
      },
    ],
  },
}));

// Mock the imported skill line data modules
jest.mock('../data/skill-lines/alliance-war/assault', () => ({
  assault: {
    id: 'alliance.assault',
    name: 'Assault',
    class: 'Alliance War',
    category: 'alliance',
    icon: 'assault-icon',
    skills: [
      {
        id: 1000,
        name: 'War Horn',
        type: 'ultimate',
        description: 'Sound a war horn',
        baseAbilityId: 1000,
      },
      {
        id: 1001,
        name: 'Aggressive Horn',
        type: 'ultimate',
        description: 'Morph 1',
        baseAbilityId: 1000,
      },
      {
        id: 1002,
        name: 'Sturdy Horn',
        type: 'ultimate',
        description: 'Morph 2',
        baseAbilityId: 1000,
      },
      {
        id: 1010,
        name: 'Rapid Maneuver',
        type: 'active',
        description: 'Increase movement speed',
      },
      {
        id: 1020,
        name: 'Continuous Attack',
        type: 'passive',
        description: 'Passive ability',
        isPassive: true,
      },
    ],
  },
}));

jest.mock('../data/skill-lines/alliance-war/support', () => ({
  support: {
    id: 'alliance.support',
    name: 'Support',
    class: 'Alliance War',
    category: 'alliance',
    icon: 'support-icon',
    skills: [
      {
        id: 1100,
        name: 'Support Aura',
        type: 'active',
        description: 'Provide group buffs',
        baseAbilityId: 1100,
      },
      {
        id: 1101,
        name: 'Empowered Support Aura',
        type: 'active',
        description: 'Morph ability',
        baseAbilityId: 1100,
      },
    ],
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

jest.mock('../data/skill-lines/weapon/bow', () => ({
  bowSkillLine: {
    id: 'weapon.bow',
    name: 'Bow',
    class: 'Weapon',
    category: 'weapon',
    icon: 'bow-icon',
    skills: [
      {
        id: 2000,
        name: 'Ballista',
        type: 'ultimate',
        description: 'Bow ultimate',
        baseAbilityId: 2000,
      },
      {
        id: 2001,
        name: 'Snipe',
        type: 'active',
        description: 'Bow ability',
      },
    ],
  },
}));

// Mock all other skill line imports with minimal data
jest.mock('../data/skill-lines/guild/darkBrotherhood', () => ({
  darkBrotherhood: {
    id: 'guild.darkBrotherhood',
    name: 'Dark Brotherhood',
    class: 'Guild',
    category: 'guild',
    icon: 'dark-brotherhood-icon',
    skills: [],
  },
}));
jest.mock('../data/skill-lines/guild/fightersGuild', () => ({
  fightersGuild: {
    id: 'guild.fighters',
    name: 'Fighters Guild',
    class: 'Guild',
    category: 'guild',
    icon: 'fighters-icon',
    skills: [],
  },
}));
jest.mock('../data/skill-lines/guild/magesGuild', () => ({
  magesGuild: {
    id: 'guild.mages',
    name: 'Mages Guild',
    class: 'Guild',
    category: 'guild',
    icon: 'mages-icon',
    skills: [],
  },
}));
jest.mock('../data/skill-lines/guild/psijicOrder', () => ({
  psijicOrder: {
    id: 'guild.psijic',
    name: 'Psijic Order',
    class: 'Guild',
    category: 'guild',
    icon: 'psijic-icon',
    skills: [],
  },
}));
jest.mock('../data/skill-lines/guild/thievesGuild', () => ({
  thievesGuild: {
    id: 'guild.thieves',
    name: 'Thieves Guild',
    class: 'Guild',
    category: 'guild',
    icon: 'thieves-icon',
    skills: [],
  },
}));
jest.mock('../data/skill-lines/guild/undaunted', () => ({
  undaunted: {
    id: 'guild.undaunted',
    name: 'Undaunted',
    class: 'Guild',
    category: 'guild',
    icon: 'undaunted-icon',
    skills: [],
  },
}));
jest.mock('../data/skill-lines/weapon/destructionStaff', () => ({
  destructionStaffSkillLine: {
    id: 'weapon.destructionStaff',
    name: 'Destruction Staff',
    class: 'Weapon',
    category: 'weapon',
    icon: 'destruction-icon',
    skills: [],
  },
}));
jest.mock('../data/skill-lines/weapon/dualWield', () => ({
  dualWieldSkillLine: {
    id: 'weapon.dualWield',
    name: 'Dual Wield',
    class: 'Weapon',
    category: 'weapon',
    icon: 'dual-wield-icon',
    skills: [],
  },
}));
jest.mock('../data/skill-lines/weapon/oneHandAndShield', () => ({
  oneHandAndShieldSkillLine: {
    id: 'weapon.oneHandAndShield',
    name: 'One Hand and Shield',
    class: 'Weapon',
    category: 'weapon',
    icon: 'one-hand-icon',
    skills: [],
  },
}));
jest.mock('../data/skill-lines/weapon/restorationStaff', () => ({
  restorationStaff: {
    id: 'weapon.restorationStaff',
    name: 'Restoration Staff',
    class: 'Weapon',
    category: 'weapon',
    icon: 'restoration-icon',
    skills: [],
  },
}));
jest.mock('../data/skill-lines/weapon/twoHanded', () => ({
  twoHandedSkillLine: {
    id: 'weapon.twoHanded',
    name: 'Two Handed',
    class: 'Weapon',
    category: 'weapon',
    icon: 'two-handed-icon',
    skills: [],
  },
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
      const hasClasses = ALL_SKILL_LINES.some((sl) => sl.class?.toLowerCase() === 'arcanist');
      const hasWeapons = ALL_SKILL_LINES.some((sl) => sl.category === 'weapon');
      const hasAlliance = ALL_SKILL_LINES.some((sl) => sl.category === 'alliance');

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

    it('should find abilities defined as actives', () => {
      const result = findSkillByName('Support Aura');

      expect(result).toBeDefined();
      expect(result?.node.name).toBe('Support Aura');
      expect(result?.abilityType).toBe('actives');
      expect(result?.category).toBe('alliance');
    });

    it('should find morphs and include parent reference', () => {
      const morphResult = findSkillByName('Aggressive Horn');

      expect(morphResult).toBeDefined();
      expect(morphResult?.node.name).toBe('Aggressive Horn');
      expect(morphResult?.parent?.name).toBe('War Horn');
      expect(morphResult?.skillLineName).toBe('Assault');
    });

    it('should find morphs with object structure', () => {
      const morphResult = findSkillByName('Empowered Support Aura');

      expect(morphResult).toBeDefined();
      expect(morphResult?.node.name).toBe('Empowered Support Aura');
      expect(morphResult?.parent?.name).toBe('Support Aura');
      expect(morphResult?.category).toBe('alliance');
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
      const classData: SkillLineData = {
        id: 'class.dk',
        name: 'Ardent Flame',
        class: 'Dragonknight',
        category: 'class',
        icon: 'icon',
        skills: [],
      };

      const result = getClassKey(classData);

      expect(result).toBe('dragonknight');
    });

    it('should return class key for SkillLineData entries', () => {
      const skillLineData: SkillLineData = {
        id: 'class.mock-line',
        name: 'Mock Line',
        class: 'Templar',
        category: 'class',
        icon: 'icon',
        skills: [],
      };

      const result = getClassKey(skillLineData);

      expect(result).toBe('templar');
    });

    it('should return weapon key for weapon data', () => {
      const weaponData: SkillLineData = {
        id: 'weapon.destro',
        name: 'Destruction Staff',
        class: 'Weapon',
        category: 'weapon',
        icon: 'icon',
        skills: [],
      };

      const result = getClassKey(weaponData);

      expect(result).toBe('weapon');
    });

    it('should return "unknown" for data without class or weapon', () => {
      const unknownData = {} as SkillLineData;

      const result = getClassKey(unknownData);

      expect(result).toBe('unknown');
    });

    it('should handle null/undefined input gracefully', () => {
      expect(getClassKey(null as any)).toBe('unknown');
      expect(getClassKey(undefined as any)).toBe('unknown');
      expect(getClassKey({} as any)).toBe('unknown');
    });

    it('should convert keys to lowercase', () => {
      const mixedCaseData: SkillLineData = {
        id: 'class.templar',
        name: 'Aedric Spear',
        class: 'TEMPLAR',
        category: 'class',
        icon: 'icon',
        skills: [],
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
        'Support Aura',
      ];

      abilityNames.forEach((name) => {
        const result = findSkillByName(name);
        expect(result).toBeDefined();
        expect(result?.node.name).toBe(name);
      });
    });

    it('should find all morph variations', () => {
      const morphNames = ['Aggressive Horn', 'Sturdy Horn', 'Empowered Support Aura'];

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

    it('should handle multiple abilities within the same skill line', () => {
      const warHorn = findSkillByName('War Horn');
      const supportAura = findSkillByName('Support Aura');

      expect(warHorn).toBeDefined();
      expect(supportAura).toBeDefined();
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
      const validTypes = ['ultimates', 'actives', 'passives'];
      const result = findSkillByName('War Horn');

      expect(validTypes).toContain(result?.abilityType);
    });

    it('should preserve all node properties in search results', () => {
      const result = findSkillByName('War Horn');

      expect(result?.node).toEqual(
        expect.objectContaining({
          name: 'War Horn',
          description: 'Sound a war horn',
          type: 'ultimate',
        }),
      );
    });
  });
});
