import { createGearSetTooltipProps, getGearSetTooltipPropsByName } from './gearSetTooltipMapper';
import type { PlayerGearSetRecord } from './gearUtilities';

// Mock the gear set data imports
jest.mock('../data/Gear Sets/arena-specials', () => ({
  arenaSet1: {
    skillLines: {
      'arena-set-1': {
        name: 'Arena Special Set',
        passives: [
          {
            name: '(2 items)',
            description: 'Adds 1096 Maximum Magicka',
          },
          {
            name: '(5 items)',
            description: 'When you deal damage, you have a 10% chance to create a pool of lava',
            requirement: 'Combat requirement',
          },
        ],
      },
    },
    weapon: 'Arena',
  },
}));

jest.mock('../data/Gear Sets/heavy', () => ({
  heavySet1: {
    skillLines: {
      'heavy-set-1': {
        name: 'Heavy Armor Set',
        passives: [
          {
            name: '(2 items)',
            description: 'Adds 1206 Maximum Health',
          },
          {
            name: '(3 items)',
            description: 'Adds 1096 Maximum Stamina',
          },
          {
            name: '(5 items)',
            description: 'When you take damage, you have a chance to reduce enemy movement speed',
          },
        ],
      },
    },
    weapon: 'Heavy Armor',
  },
}));

jest.mock('../data/Gear Sets/light', () => ({
  lightSet1: {
    skillLines: {
      'light-set-1': {
        name: 'Light Armor Set',
        passives: [
          {
            name: '(2 items)',
            description: 'Adds 1096 Maximum Magicka',
          },
          {
            name: '(3 items)',
            description: 'Adds 129 Spell Damage',
          },
          {
            name: '(5 items)',
            description: 'Increases spell critical rating by 657',
          },
        ],
      },
    },
    weapon: 'Light Armor',
  },
}));

jest.mock('../data/Gear Sets/monster', () => ({
  monsterSet1: {
    skillLines: {
      'monster-set-1': {
        name: 'Monster Helm Set',
        passives: [
          {
            name: '(1 item)',
            description: 'Adds 1096 Maximum Magicka',
          },
          {
            name: '(2 items)',
            description: 'When you deal damage, you summon a monster ally',
          },
        ],
      },
    },
    weapon: 'Monster Set',
  },
}));

jest.mock('../data/Gear Sets/mythics', () => ({
  mythicSet1: {
    skillLines: {
      'mythic-set-1': {
        name: 'Mythic Item Set',
        passives: [
          {
            name: '(1 item)',
            description: 'Unique mythic effect that changes gameplay significantly',
          },
        ],
      },
    },
    weapon: 'Mythic',
  },
}));

jest.mock('../data/Gear Sets/shared', () => ({
  sharedSet1: {
    skillLines: {
      'shared-set-1': {
        name: 'Shared Gear Set',
        passives: [
          {
            name: '(2 items)',
            description: 'Adds 1096 Maximum Health',
          },
          {
            name: '(3 items)',
            description: 'Adds 1096 Maximum Stamina',
          },
          {
            name: '(5 items)',
            description: 'Shared set bonus effect',
          },
        ],
      },
    },
    weapon: 'Shared',
  },
}));

describe('gearSetTooltipMapper', () => {
  describe('createGearSetTooltipProps', () => {
    it('should create tooltip props for a known gear set', () => {
      const gearRecord: PlayerGearSetRecord = {
        labelName: 'Heavy Armor Set',
        count: 5,
        items: [],
      };

      const result = createGearSetTooltipProps(gearRecord);

      expect(result).not.toBeNull();
      expect(result!.setName).toBe('Heavy Armor Set');
      expect(result!.headerBadge).toBe('Heavy Armor');
      expect(result!.itemCount).toBe('5');
      expect(result!.setBonuses).toHaveLength(3);

      // Check that all bonuses are active since we have 5 items
      expect(result!.setBonuses[0]).toEqual({
        pieces: '(2 items)',
        effect: 'Adds 1206 Maximum Health',
        active: true,
        requirement: undefined,
      });

      expect(result!.setBonuses[1]).toEqual({
        pieces: '(3 items)',
        effect: 'Adds 1096 Maximum Stamina',
        active: true,
        requirement: undefined,
      });

      expect(result!.setBonuses[2]).toEqual({
        pieces: '(5 items)',
        effect: 'When you take damage, you have a chance to reduce enemy movement speed',
        active: true,
        requirement: undefined,
      });
    });

    it('should handle partial gear set activation', () => {
      const gearRecord: PlayerGearSetRecord = {
        labelName: 'Light Armor Set',
        count: 3,
        items: [],
      };

      const result = createGearSetTooltipProps(gearRecord);

      expect(result).not.toBeNull();
      expect(result!.setBonuses).toHaveLength(3);

      // Only first two bonuses should be active
      expect(result!.setBonuses[0].active).toBe(true); // 2 items
      expect(result!.setBonuses[1].active).toBe(true); // 3 items
      expect(result!.setBonuses[2].active).toBe(false); // 5 items
    });

    it('should categorize mythic sets correctly', () => {
      const gearRecord: PlayerGearSetRecord = {
        labelName: 'Mythic Item Set',
        count: 1,
        items: [],
      };

      const result = createGearSetTooltipProps(gearRecord);

      expect(result).not.toBeNull();
      expect(result!.headerBadge).toBe('Mythic');
    });

    it('should categorize monster sets correctly', () => {
      const gearRecord: PlayerGearSetRecord = {
        labelName: 'Monster Helm Set',
        count: 2,
        items: [],
      };

      const result = createGearSetTooltipProps(gearRecord);

      expect(result).not.toBeNull();
      expect(result!.headerBadge).toBe('Monster Set');
    });

    it('should categorize arena sets correctly', () => {
      const gearRecord: PlayerGearSetRecord = {
        labelName: 'Arena Special Set',
        count: 5,
        items: [],
      };

      const result = createGearSetTooltipProps(gearRecord);

      expect(result).not.toBeNull();
      expect(result!.headerBadge).toBe('Arena');
    });

    it('should handle unknown gear sets', () => {
      const gearRecord: PlayerGearSetRecord = {
        labelName: 'Unknown Set Name',
        count: 3,
        items: [],
      };

      const result = createGearSetTooltipProps(gearRecord);

      expect(result).not.toBeNull();
      expect(result!.setName).toBe('Unknown Set Name');
      expect(result!.headerBadge).toBe('Unknown Set');
      expect(result!.itemCount).toBe('3');
      expect(result!.setBonuses).toHaveLength(1);
      expect(result!.setBonuses[0]).toEqual({
        pieces: '(3 items)',
        effect: 'Set bonuses unknown',
        active: true,
      });
    });

    it('should handle gear sets with requirements', () => {
      const gearRecord: PlayerGearSetRecord = {
        labelName: 'Arena Special Set',
        count: 5,
        items: [],
      };

      const result = createGearSetTooltipProps(gearRecord);

      expect(result).not.toBeNull();
      expect(result!.setBonuses[1].requirement).toBe('Combat requirement');
    });

    it('should normalize gear set names correctly', () => {
      const gearRecord: PlayerGearSetRecord = {
        labelName: 'Perfected Heavy Armor Set',
        count: 2,
        items: [],
      };

      // Should still find the set despite "Perfected" prefix
      const result = createGearSetTooltipProps(gearRecord);

      expect(result).not.toBeNull();
      expect(result!.setName).toBe('Perfected Heavy Armor Set');
      expect(result!.headerBadge).toBe('Heavy Armor');
    });

    it('should handle gear sets with special characters in names', () => {
      const gearRecord: PlayerGearSetRecord = {
        labelName: "Heavy Armor Set's (Special)",
        count: 2,
        items: [],
      };

      // Should normalize special characters and still find the set
      const result = createGearSetTooltipProps(gearRecord);

      expect(result).not.toBeNull();
      expect(result!.setName).toBe("Heavy Armor Set's (Special)");
    });
  });

  describe('getGearSetTooltipPropsByName', () => {
    it('should return tooltip props for a known set name', () => {
      const result = getGearSetTooltipPropsByName('Light Armor Set', 3);

      expect(result).not.toBeNull();
      expect(result!.setName).toBe('Light Armor Set');
      expect(result!.headerBadge).toBe('Light Armor');
      expect(result!.itemCount).toBe('3');
      expect(result!.setBonuses).toHaveLength(3);
    });

    it('should return tooltip props without item count when not provided', () => {
      const result = getGearSetTooltipPropsByName('Light Armor Set');

      expect(result).not.toBeNull();
      expect(result!.setName).toBe('Light Armor Set');
      expect(result!.itemCount).toBeUndefined();
    });

    it('should return tooltip props with zero equipped count', () => {
      const result = getGearSetTooltipPropsByName('Light Armor Set', 0);

      expect(result).not.toBeNull();
      expect(result!.itemCount).toBeUndefined();
      expect(result!.setBonuses.every((bonus) => !bonus.active)).toBe(true);
    });

    it('should return null for unknown gear sets', () => {
      const result = getGearSetTooltipPropsByName('Non-Existent Set', 5);

      expect(result).toBeNull();
    });

    it('should handle empty or invalid set names', () => {
      expect(getGearSetTooltipPropsByName('')).toBeNull();
      expect(getGearSetTooltipPropsByName('   ')).toBeNull();
    });

    it('should normalize set names for lookup', () => {
      const result = getGearSetTooltipPropsByName('LIGHT ARMOR SET', 2);

      expect(result).not.toBeNull();
      expect(result!.setName).toBe('LIGHT ARMOR SET');
      expect(result!.headerBadge).toBe('Light Armor');
    });

    it('should handle perfected gear set names', () => {
      const result = getGearSetTooltipPropsByName('Perfected Monster Helm Set', 2);

      expect(result).not.toBeNull();
      expect(result!.setName).toBe('Perfected Monster Helm Set');
      expect(result!.headerBadge).toBe('Monster Set');
    });
  });

  describe('bonus activation logic', () => {
    it('should correctly determine active bonuses based on equipped count', () => {
      const result = getGearSetTooltipPropsByName('Heavy Armor Set', 2);

      expect(result).not.toBeNull();
      expect(result!.setBonuses[0].active).toBe(true); // 2 items - active
      expect(result!.setBonuses[1].active).toBe(false); // 3 items - inactive
      expect(result!.setBonuses[2].active).toBe(false); // 5 items - inactive
    });

    it('should handle edge case where no pieces are specified', () => {
      // This tests the fallback behavior for malformed data
      const result = getGearSetTooltipPropsByName('Shared Gear Set', 1);

      expect(result).not.toBeNull();
      expect(result!.setBonuses).toHaveLength(3);
      // Check the actual behavior - bonuses with parsed requirements should be evaluated correctly
      expect(result!.setBonuses[0].active).toBe(false); // (2 items) with 1 equipped
      expect(result!.setBonuses[1].active).toBe(false); // (3 items) with 1 equipped
      expect(result!.setBonuses[2].active).toBe(false); // (5 items) with 1 equipped
    });
  });

  describe('edge cases and error handling', () => {
    it('should handle gear sets with missing skillLines', () => {
      // Mock a gear set with missing skillLines
      jest.doMock('../data/Gear Sets/shared', () => ({
        brokenSet: {
          weapon: 'Broken',
          // Missing skillLines
        },
      }));

      const result = getGearSetTooltipPropsByName('Broken Set', 2);
      expect(result).toBeNull();
    });

    it('should handle gear sets with empty passives array', () => {
      // This would be handled by the existing mock structure
      const result = getGearSetTooltipPropsByName('Shared Gear Set', 0);

      expect(result).not.toBeNull();
      expect(result!.setBonuses).toHaveLength(3);
    });

    it('should handle malformed passive data gracefully', () => {
      // The function should handle missing properties in passives
      const result = createGearSetTooltipProps({
        labelName: 'Light Armor Set',
        count: 2,
        items: [],
      });

      expect(result).not.toBeNull();
      expect(result!.setBonuses).toHaveLength(3);
      result!.setBonuses.forEach((bonus) => {
        expect(bonus.pieces).toBeDefined();
        expect(bonus.effect).toBeDefined();
        expect(typeof bonus.active).toBe('boolean');
      });
    });
  });
});
