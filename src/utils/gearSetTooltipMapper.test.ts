import { createGearSetTooltipProps, getGearSetTooltipPropsByName } from './gearSetTooltipMapper';
import { ItemQuality } from './gearUtilities';
import type { PlayerGearSetRecord } from './gearUtilities';
import type { PlayerGear } from '../types/playerDetails';
import { ArmorType, GearSlot, GearTrait } from '../types/playerDetails';

jest.mock('../data/Gear Sets/legacyAdapters', () => ({
  arenaSpecialGearSets: {
    arenaSet1: {
      name: 'Arena Special Set',
      icon: 'arena',
      setType: 'Arena',
      bonuses: [
        '(2 items) Adds 1206 Maximum Health',
        '(3 items) Adds 1096 Maximum Stamina',
        '(5 items) Trigger a combat requirement effect',
      ],
    },
  },
  monsterGearSets: {
    monsterSet1: {
      name: 'Monster Helm Set',
      icon: 'monster',
      setType: 'Monster Set',
      bonuses: [
        '(1 item) Adds 1096 Maximum Magicka',
        '(2 items) Summon a monster ally',
      ],
    },
  },
}));

jest.mock('../data/Gear Sets/heavy', () => ({
  heavySet1: {
    name: 'Heavy Armor Set',
    icon: 'heavy',
    setType: 'Heavy Armor',
    bonuses: [
      '(2 items) Adds 1206 Maximum Health',
      '(3 items) Adds 1096 Maximum Stamina',
      '(5 items) Reduce enemy movement speed',
    ],
  },
}));

jest.mock('../data/Gear Sets/light', () => ({
  lightSet1: {
    name: 'Light Armor Set',
    icon: 'light',
    setType: 'Light Armor',
    bonuses: [
      '(2 items) Adds 1096 Maximum Magicka',
      '(3 items) Adds 129 Spell Damage',
      '(5 items) Increase spell critical rating',
    ],
  },
}));

jest.mock('../data/Gear Sets/medium', () => ({
  mediumSet1: {
    name: 'Medium Armor Set',
    icon: 'medium',
    setType: 'Medium Armor',
    bonuses: [
      '(2 items) Adds 129 Weapon Damage',
      '(3 items) Adds 657 Weapon Critical',
      '(5 items) Medium armor proc',
    ],
  },
}));

jest.mock('../data/Gear Sets/arena', () => ({
  arenaSetA: {
    name: 'Arena Master Set',
    icon: 'arena_master',
    setType: 'Arena',
    bonuses: [
      '(1 item) Adds 100 Weapon Damage',
      '(2 items) Arena effect',
    ],
  },
}));

jest.mock('../data/Gear Sets/mythics', () => ({
  mythicSet1: {
    name: 'Mythic Item Set',
    icon: 'mythic',
    setType: 'Mythic',
    bonuses: ['(1 item) Unique mythic effect that changes gameplay significantly'],
  },
}));

jest.mock('../data/Gear Sets/shared', () => ({
  sharedSet1: {
    name: 'Shared Gear Set',
    icon: 'shared',
    setType: 'PvP',
    bonuses: [
      '(2 items) Adds 1096 Maximum Health',
      '(3 items) Adds 1096 Maximum Stamina',
      '(5 items) Shared set bonus effect',
    ],
  },
}));

const buildGearRecord = (overrides: Partial<PlayerGearSetRecord> = {}): PlayerGearSetRecord => ({
  key: 'heavy-set',
  labelName: 'Heavy Armor Set',
  sortName: 'heavy armor set',
  count: 5,
  category: 0,
  secondary: 0,
  data: {
    total: 5,
    perfected: 0,
    setID: 1234,
    hasPerfected: false,
    hasRegular: true,
    baseDisplay: 'Heavy Armor Set',
    ...(overrides.data ?? {}),
  },
  ...overrides,
});

describe('gearSetTooltipMapper', () => {
  describe('createGearSetTooltipProps', () => {
    it('creates tooltip props for a known gear set', () => {
      const gearRecord = buildGearRecord();

      const result = createGearSetTooltipProps(gearRecord);

      expect(result).not.toBeNull();
      expect(result!.setName).toBe('Heavy Armor Set');
      expect(result!.headerBadge).toBe('Heavy Armor');
      expect(result!.itemCount).toBe('5');
      expect(result!.setBonuses).toHaveLength(3);
      expect(result!.setBonuses.every((bonus) => bonus.active)).toBe(true);
    });

    it('marks bonuses inactive when equipped count is lower than requirement', () => {
      const gearRecord = buildGearRecord({
        labelName: 'Light Armor Set',
        count: 3,
      });

      const result = createGearSetTooltipProps(gearRecord);

      expect(result).not.toBeNull();
      expect(result!.setBonuses.map((bonus) => bonus.active)).toEqual([true, true, false]);
    });

    it('uses category badges for specialty sets', () => {
      const mythicRecord = buildGearRecord({
        labelName: 'Mythic Item Set',
        count: 1,
      });

      const monsterRecord = buildGearRecord({
        labelName: 'Monster Helm Set',
        count: 2,
      });

      const arenaRecord = buildGearRecord({
        labelName: 'Arena Special Set',
        count: 5,
      });

      expect(createGearSetTooltipProps(mythicRecord)!.headerBadge).toBe('Mythic');
      expect(createGearSetTooltipProps(monsterRecord)!.headerBadge).toBe('Monster Set');
      expect(createGearSetTooltipProps(arenaRecord)!.headerBadge).toBe('Arena');
    });

    it('returns a fallback tooltip when the set is unknown', () => {
      const gearRecord = buildGearRecord({
        labelName: 'Unknown Set Name',
        count: 3,
      });

      const result = createGearSetTooltipProps(gearRecord);

      expect(result).not.toBeNull();
      expect(result!.headerBadge).toBe('Unknown Set');
      expect(result!.setBonuses).toEqual([
        {
          pieces: '(3 items)',
          effect: 'Set bonuses unknown',
          active: true,
        },
      ]);
    });

    it('includes equipped gear pieces when player gear is supplied', () => {
      const gearRecord = buildGearRecord();
      const playerGear: PlayerGear[] = [
        {
          id: 42,
          setID: gearRecord.data.setID ?? 0,
          setName: 'Heavy Armor Set',
          icon: 'heavy_icon',
          slot: GearSlot.CHEST,
          quality: ItemQuality.EPIC,
          championPoints: 1800,
          trait: GearTrait.REINFORCED,
          enchantType: 2,
          enchantQuality: 3,
          name: 'Heavy Chest',
          type: ArmorType.HEAVY,
        },
      ];

      const result = createGearSetTooltipProps(gearRecord, playerGear);

      expect(result).not.toBeNull();
      if (!result) {
        throw new Error('Expected tooltip to be created');
      }
      const { gearPieces } = result;
      if (!gearPieces) {
        throw new Error('Expected gear pieces to be populated');
      }
      expect(gearPieces).toHaveLength(1);
      const gearPiece = gearPieces[0];
      expect(gearPiece).toBeDefined();
      if (!gearPiece) {
        throw new Error('Expected gear piece to be defined');
      }
      expect(gearPiece.name).toBe('Heavy Chest');
      expect(result!.iconUrl).toContain('heavy_icon');
    });

    it('normalizes perfected names when building tooltips', () => {
      const gearRecord = buildGearRecord({
        labelName: 'Perfected Heavy Armor Set',
      });

      const result = createGearSetTooltipProps(gearRecord);

      expect(result).not.toBeNull();
      expect(result!.setName).toBe('Perfected Heavy Armor Set');
      expect(result!.headerBadge).toBe('Heavy Armor');
    });
  });

  describe('getGearSetTooltipPropsByName', () => {
    it('returns tooltip props for a known set', () => {
      const result = getGearSetTooltipPropsByName('Light Armor Set', 3);

      expect(result).not.toBeNull();
      expect(result!.setName).toBe('Light Armor Set');
      expect(result!.itemCount).toBe('3');
      expect(result!.setBonuses).toHaveLength(3);
    });

    it('returns null for unknown sets', () => {
      expect(getGearSetTooltipPropsByName('Non-Existent Set', 2)).toBeNull();
    });

    it('omits item count when equipped pieces are not provided', () => {
      const result = getGearSetTooltipPropsByName('Light Armor Set');

      expect(result).not.toBeNull();
      expect(result!.itemCount).toBeUndefined();
    });

    it('normalizes names for lookups', () => {
      const result = getGearSetTooltipPropsByName('LIGHT ARMOR SET', 2);

      expect(result).not.toBeNull();
      expect(result!.headerBadge).toBe('Light Armor');
    });

    it('handles perfected prefixes when searching', () => {
      const result = getGearSetTooltipPropsByName('Perfected Monster Helm Set', 2);

      expect(result).not.toBeNull();
      expect(result!.setName).toBe('Perfected Monster Helm Set');
      expect(result!.headerBadge).toBe('Monster Set');
    });
  });

  describe('bonus activation logic', () => {
    it('activates bonuses based on equipped count', () => {
      const result = getGearSetTooltipPropsByName('Heavy Armor Set', 2);

      expect(result).not.toBeNull();
      expect(result!.setBonuses.map((bonus) => bonus.active)).toEqual([true, false, false]);
    });

    it('treats zero equipped pieces as no active bonuses', () => {
      const result = getGearSetTooltipPropsByName('Light Armor Set', 0);

      expect(result).not.toBeNull();
      expect(result!.setBonuses.every((bonus) => bonus.active === false)).toBe(true);
    });
  });
});
