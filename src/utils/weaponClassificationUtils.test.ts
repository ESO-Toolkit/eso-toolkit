/**
 * Tests for weaponClassificationUtils
 * Comprehensive test coverage for weapon and gear classification functions
 */

import { WeaponType } from '../types/playerDetails';
import {
  isOneHandedWeapon,
  isTwoHandedWeapon,
  isStaff,
  isAnyTwoHandedWeapon,
  isDoubleSetWeapon,
  isMace,
  canDualWield,
  ONE_HANDED_WEAPONS,
  TWO_HANDED_WEAPONS,
  STAFF_WEAPONS,
  DOUBLE_SET_TYPES,
} from './weaponClassificationUtils';

describe('weaponClassificationUtils', () => {
  describe('isOneHandedWeapon', () => {
    it('should return true for one-handed weapons', () => {
      expect(isOneHandedWeapon(WeaponType.SWORD)).toBe(true);
      expect(isOneHandedWeapon(WeaponType.AXE)).toBe(true);
      expect(isOneHandedWeapon(WeaponType.DAGGER)).toBe(true);
      expect(isOneHandedWeapon(WeaponType.MACE)).toBe(true);
    });

    it('should return false for two-handed weapons', () => {
      expect(isOneHandedWeapon(WeaponType.TWO_HANDED_SWORD)).toBe(false);
      expect(isOneHandedWeapon(WeaponType.TWO_HANDED_AXE)).toBe(false);
      expect(isOneHandedWeapon(WeaponType.MAUL)).toBe(false);
    });

    it('should return false for staves', () => {
      expect(isOneHandedWeapon(WeaponType.INFERNO_STAFF)).toBe(false);
      expect(isOneHandedWeapon(WeaponType.FROST_STAFF)).toBe(false);
      expect(isOneHandedWeapon(WeaponType.LIGHTNING_STAFF)).toBe(false);
      expect(isOneHandedWeapon(WeaponType.RESO_STAFF)).toBe(false);
    });
  });

  describe('isTwoHandedWeapon', () => {
    it('should return true for two-handed weapons (excluding staves)', () => {
      expect(isTwoHandedWeapon(WeaponType.TWO_HANDED_SWORD)).toBe(true);
      expect(isTwoHandedWeapon(WeaponType.TWO_HANDED_AXE)).toBe(true);
      expect(isTwoHandedWeapon(WeaponType.MAUL)).toBe(true);
    });

    it('should return false for one-handed weapons', () => {
      expect(isTwoHandedWeapon(WeaponType.SWORD)).toBe(false);
      expect(isTwoHandedWeapon(WeaponType.AXE)).toBe(false);
      expect(isTwoHandedWeapon(WeaponType.DAGGER)).toBe(false);
      expect(isTwoHandedWeapon(WeaponType.MACE)).toBe(false);
    });

    it('should return false for staves', () => {
      expect(isTwoHandedWeapon(WeaponType.INFERNO_STAFF)).toBe(false);
      expect(isTwoHandedWeapon(WeaponType.FROST_STAFF)).toBe(false);
      expect(isTwoHandedWeapon(WeaponType.LIGHTNING_STAFF)).toBe(false);
      expect(isTwoHandedWeapon(WeaponType.RESO_STAFF)).toBe(false);
    });
  });

  describe('isStaff', () => {
    it('should return true for all staff types', () => {
      expect(isStaff(WeaponType.INFERNO_STAFF)).toBe(true);
      expect(isStaff(WeaponType.FROST_STAFF)).toBe(true);
      expect(isStaff(WeaponType.LIGHTNING_STAFF)).toBe(true);
      expect(isStaff(WeaponType.RESO_STAFF)).toBe(true);
    });

    it('should return false for one-handed weapons', () => {
      expect(isStaff(WeaponType.SWORD)).toBe(false);
      expect(isStaff(WeaponType.AXE)).toBe(false);
      expect(isStaff(WeaponType.DAGGER)).toBe(false);
      expect(isStaff(WeaponType.MACE)).toBe(false);
    });

    it('should return false for two-handed weapons', () => {
      expect(isStaff(WeaponType.TWO_HANDED_SWORD)).toBe(false);
      expect(isStaff(WeaponType.TWO_HANDED_AXE)).toBe(false);
      expect(isStaff(WeaponType.MAUL)).toBe(false);
    });
  });

  describe('isAnyTwoHandedWeapon', () => {
    it('should return true for two-handed weapons', () => {
      expect(isAnyTwoHandedWeapon(WeaponType.TWO_HANDED_SWORD)).toBe(true);
      expect(isAnyTwoHandedWeapon(WeaponType.TWO_HANDED_AXE)).toBe(true);
      expect(isAnyTwoHandedWeapon(WeaponType.MAUL)).toBe(true);
    });

    it('should return true for staves', () => {
      expect(isAnyTwoHandedWeapon(WeaponType.INFERNO_STAFF)).toBe(true);
      expect(isAnyTwoHandedWeapon(WeaponType.FROST_STAFF)).toBe(true);
      expect(isAnyTwoHandedWeapon(WeaponType.LIGHTNING_STAFF)).toBe(true);
      expect(isAnyTwoHandedWeapon(WeaponType.RESO_STAFF)).toBe(true);
    });

    it('should return false for one-handed weapons', () => {
      expect(isAnyTwoHandedWeapon(WeaponType.SWORD)).toBe(false);
      expect(isAnyTwoHandedWeapon(WeaponType.AXE)).toBe(false);
      expect(isAnyTwoHandedWeapon(WeaponType.DAGGER)).toBe(false);
      expect(isAnyTwoHandedWeapon(WeaponType.MACE)).toBe(false);
    });
  });

  describe('isDoubleSetWeapon', () => {
    it('should return true for staves', () => {
      expect(isDoubleSetWeapon(WeaponType.INFERNO_STAFF)).toBe(true);
      expect(isDoubleSetWeapon(WeaponType.FROST_STAFF)).toBe(true);
      expect(isDoubleSetWeapon(WeaponType.LIGHTNING_STAFF)).toBe(true);
      expect(isDoubleSetWeapon(WeaponType.RESO_STAFF)).toBe(true);
    });

    it('should return true for two-handed sword', () => {
      expect(isDoubleSetWeapon(WeaponType.TWO_HANDED_SWORD)).toBe(true);
    });

    it('should return false for other two-handed weapons', () => {
      expect(isDoubleSetWeapon(WeaponType.TWO_HANDED_AXE)).toBe(false);
      expect(isDoubleSetWeapon(WeaponType.MAUL)).toBe(false);
    });

    it('should return false for one-handed weapons', () => {
      expect(isDoubleSetWeapon(WeaponType.SWORD)).toBe(false);
      expect(isDoubleSetWeapon(WeaponType.AXE)).toBe(false);
      expect(isDoubleSetWeapon(WeaponType.DAGGER)).toBe(false);
      expect(isDoubleSetWeapon(WeaponType.MACE)).toBe(false);
    });
  });

  describe('isMace', () => {
    it('should return true only for mace', () => {
      expect(isMace(WeaponType.MACE)).toBe(true);
    });

    it('should return false for all other weapon types', () => {
      expect(isMace(WeaponType.SWORD)).toBe(false);
      expect(isMace(WeaponType.AXE)).toBe(false);
      expect(isMace(WeaponType.DAGGER)).toBe(false);
      expect(isMace(WeaponType.TWO_HANDED_SWORD)).toBe(false);
      expect(isMace(WeaponType.TWO_HANDED_AXE)).toBe(false);
      expect(isMace(WeaponType.MAUL)).toBe(false);
      expect(isMace(WeaponType.INFERNO_STAFF)).toBe(false);
    });
  });

  describe('canDualWield', () => {
    it('should return true for one-handed weapons', () => {
      expect(canDualWield(WeaponType.SWORD)).toBe(true);
      expect(canDualWield(WeaponType.AXE)).toBe(true);
      expect(canDualWield(WeaponType.DAGGER)).toBe(true);
      expect(canDualWield(WeaponType.MACE)).toBe(true);
    });

    it('should return false for two-handed weapons', () => {
      expect(canDualWield(WeaponType.TWO_HANDED_SWORD)).toBe(false);
      expect(canDualWield(WeaponType.TWO_HANDED_AXE)).toBe(false);
      expect(canDualWield(WeaponType.MAUL)).toBe(false);
    });

    it('should return false for staves', () => {
      expect(canDualWield(WeaponType.INFERNO_STAFF)).toBe(false);
      expect(canDualWield(WeaponType.FROST_STAFF)).toBe(false);
      expect(canDualWield(WeaponType.LIGHTNING_STAFF)).toBe(false);
      expect(canDualWield(WeaponType.RESO_STAFF)).toBe(false);
    });
  });

  describe('exported sets', () => {
    it('should export correct one-handed weapon set', () => {
      expect(ONE_HANDED_WEAPONS.has(WeaponType.SWORD)).toBe(true);
      expect(ONE_HANDED_WEAPONS.has(WeaponType.AXE)).toBe(true);
      expect(ONE_HANDED_WEAPONS.has(WeaponType.DAGGER)).toBe(true);
      expect(ONE_HANDED_WEAPONS.has(WeaponType.MACE)).toBe(true);
      expect(ONE_HANDED_WEAPONS.has(WeaponType.TWO_HANDED_SWORD)).toBe(false);
    });

    it('should export correct two-handed weapon set', () => {
      expect(TWO_HANDED_WEAPONS.has(WeaponType.TWO_HANDED_SWORD)).toBe(true);
      expect(TWO_HANDED_WEAPONS.has(WeaponType.TWO_HANDED_AXE)).toBe(true);
      expect(TWO_HANDED_WEAPONS.has(WeaponType.MAUL)).toBe(true);
      expect(TWO_HANDED_WEAPONS.has(WeaponType.SWORD)).toBe(false);
    });

    it('should export correct staff weapon set', () => {
      expect(STAFF_WEAPONS.has(WeaponType.INFERNO_STAFF)).toBe(true);
      expect(STAFF_WEAPONS.has(WeaponType.FROST_STAFF)).toBe(true);
      expect(STAFF_WEAPONS.has(WeaponType.LIGHTNING_STAFF)).toBe(true);
      expect(STAFF_WEAPONS.has(WeaponType.RESO_STAFF)).toBe(true);
      expect(STAFF_WEAPONS.has(WeaponType.SWORD)).toBe(false);
    });

    it('should export correct double set types', () => {
      expect(DOUBLE_SET_TYPES.has(WeaponType.INFERNO_STAFF)).toBe(true);
      expect(DOUBLE_SET_TYPES.has(WeaponType.FROST_STAFF)).toBe(true);
      expect(DOUBLE_SET_TYPES.has(WeaponType.LIGHTNING_STAFF)).toBe(true);
      expect(DOUBLE_SET_TYPES.has(WeaponType.RESO_STAFF)).toBe(true);
      expect(DOUBLE_SET_TYPES.has(WeaponType.TWO_HANDED_SWORD)).toBe(true);
      expect(DOUBLE_SET_TYPES.has(WeaponType.SWORD)).toBe(false);
    });
  });

  describe('edge cases and consistency', () => {
    it('should be consistent with isOneHandedWeapon and canDualWield', () => {
      Object.values(WeaponType).forEach((weaponType) => {
        if (typeof weaponType === 'number') {
          expect(isOneHandedWeapon(weaponType)).toBe(canDualWield(weaponType));
        }
      });
    });

    it('should ensure no weapon is both one-handed and two-handed', () => {
      Object.values(WeaponType).forEach((weaponType) => {
        if (typeof weaponType === 'number') {
          const isOneHanded = isOneHandedWeapon(weaponType);
          const isTwoHanded = isTwoHandedWeapon(weaponType);
          const isStaffType = isStaff(weaponType);

          // A weapon can't be both one-handed and two-handed
          expect(isOneHanded && isTwoHanded).toBe(false);

          // A weapon can't be both one-handed and a staff
          expect(isOneHanded && isStaffType).toBe(false);
        }
      });
    });

    it('should ensure isAnyTwoHandedWeapon includes both two-handed and staff weapons', () => {
      Object.values(WeaponType).forEach((weaponType) => {
        if (typeof weaponType === 'number') {
          const isTwoHanded = isTwoHandedWeapon(weaponType);
          const isStaffType = isStaff(weaponType);
          const isAnyTwoHanded = isAnyTwoHandedWeapon(weaponType);

          if (isTwoHanded || isStaffType) {
            expect(isAnyTwoHanded).toBe(true);
          }
        }
      });
    });
  });
});
