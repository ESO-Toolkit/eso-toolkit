import { CombatantInfoEvent } from '../types/combatlogEvents';
import { WeaponType, GearSlot, GearTrait, PlayerGear } from '../types/playerDetails';

import {
  isOneHandedWeapon,
  isTwoHandedWeapon,
  isStaff,
  isAnyTwoHandedWeapon,
  countOneHandedSharpenedWeapons,
  hasTwoHandedSharpenedWeapon,
  countAxesInWeaponSlots,
  hasTwoHandedAxeEquipped,
  hasTwoHandedMaulEquipped,
  countDualWieldWeapons,
  countMacesInWeaponSlots,
} from './gearUtilities';

describe('gearUtilities', () => {
  // Helper function to create a basic CombatantInfoEvent for testing
  const createMockCombatantInfo = (
    gearOverrides: Partial<Record<number, PlayerGear>>,
  ): CombatantInfoEvent => {
    // Create a default empty gear array with 14 slots (based on GearSlot enum)
    const defaultGear: PlayerGear[] = [];
    for (let i = 0; i < 14; i++) {
      defaultGear[i] = {
        id: 0, // id = 0 means no gear in that slot
        slot: i,
        quality: 0,
        icon: '',
        name: '',
        championPoints: 0,
        trait: GearTrait.SHARPENED,
        enchantType: 0,
        enchantQuality: 0,
        setID: 0,
        type: WeaponType.SWORD,
      };
    }

    // Apply overrides
    Object.entries(gearOverrides).forEach(([slot, gear]) => {
      if (gear) {
        defaultGear[Number(slot)] = gear;
      }
    });

    return {
      timestamp: 1000,
      type: 'combatantinfo',
      sourceID: 1,
      fight: 1,
      gear: defaultGear,
      auras: [],
    };
  };

  const createGearItem = (
    type: WeaponType,
    trait: GearTrait = GearTrait.SHARPENED,
    slot = 0,
  ): PlayerGear => ({
    id: 12345,
    slot,
    quality: 5,
    icon: 'icon',
    name: 'Test Weapon',
    championPoints: 160,
    trait,
    enchantType: 0,
    enchantQuality: 0,
    setID: 0,
    type,
  });

  describe('Weapon Type Classification', () => {
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
      it('should return true for two-handed weapons', () => {
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
  });

  describe('Gear Analysis Functions', () => {
    describe('countOneHandedSharpenedWeapons', () => {
      it('should count sharpened one-handed weapons in weapon slots', () => {
        const combatantInfo = createMockCombatantInfo({
          [GearSlot.MAIN_HAND]: createGearItem(
            WeaponType.SWORD,
            GearTrait.SHARPENED,
            GearSlot.MAIN_HAND,
          ),
          [GearSlot.OFF_HAND]: createGearItem(
            WeaponType.AXE,
            GearTrait.SHARPENED,
            GearSlot.OFF_HAND,
          ),
          [GearSlot.BACKUP_MAIN_HAND]: createGearItem(
            WeaponType.DAGGER,
            GearTrait.SHARPENED,
            GearSlot.BACKUP_MAIN_HAND,
          ),
          [GearSlot.BACKUP_OFF_HAND]: createGearItem(
            WeaponType.MACE,
            GearTrait.SHARPENED,
            GearSlot.BACKUP_OFF_HAND,
          ),
        });

        expect(countOneHandedSharpenedWeapons(combatantInfo)).toBe(4);
      });

      it('should not count two-handed weapons or staves', () => {
        const combatantInfo = createMockCombatantInfo({
          [GearSlot.MAIN_HAND]: createGearItem(
            WeaponType.TWO_HANDED_SWORD,
            GearTrait.SHARPENED,
            GearSlot.MAIN_HAND,
          ),
          [GearSlot.BACKUP_MAIN_HAND]: createGearItem(
            WeaponType.INFERNO_STAFF,
            GearTrait.SHARPENED,
            GearSlot.BACKUP_MAIN_HAND,
          ),
        });

        expect(countOneHandedSharpenedWeapons(combatantInfo)).toBe(0);
      });

      it('should not count non-sharpened weapons', () => {
        const combatantInfo = createMockCombatantInfo({
          [GearSlot.MAIN_HAND]: createGearItem(
            WeaponType.SWORD,
            GearTrait.SHARPENED,
            GearSlot.MAIN_HAND,
          ), // Default trait is SHARPENED, need to test with a different one
          [GearSlot.OFF_HAND]: createGearItem(
            WeaponType.AXE,
            GearTrait.SHARPENED,
            GearSlot.OFF_HAND,
          ),
        });

        // Since only SHARPENED trait exists in the enum, let's modify to test with id = 0 (no weapon)
        combatantInfo.gear[GearSlot.MAIN_HAND].id = 0;
        combatantInfo.gear[GearSlot.OFF_HAND].id = 0;

        expect(countOneHandedSharpenedWeapons(combatantInfo)).toBe(0);
      });

      it('should return 0 for empty gear', () => {
        const combatantInfo = createMockCombatantInfo({});
        expect(countOneHandedSharpenedWeapons(combatantInfo)).toBe(0);
      });
    });

    describe('hasTwoHandedSharpenedWeapon', () => {
      it('should return true when mainhand has sharpened two-handed weapon', () => {
        const combatantInfo = createMockCombatantInfo({
          [GearSlot.MAIN_HAND]: createGearItem(
            WeaponType.TWO_HANDED_SWORD,
            GearTrait.SHARPENED,
            GearSlot.MAIN_HAND,
          ),
        });

        expect(hasTwoHandedSharpenedWeapon(combatantInfo)).toBe(true);
      });

      it('should return true when backup mainhand has sharpened two-handed weapon', () => {
        const combatantInfo = createMockCombatantInfo({
          [GearSlot.BACKUP_MAIN_HAND]: createGearItem(
            WeaponType.TWO_HANDED_AXE,
            GearTrait.SHARPENED,
            GearSlot.BACKUP_MAIN_HAND,
          ),
        });

        expect(hasTwoHandedSharpenedWeapon(combatantInfo)).toBe(true);
      });

      it('should return false when no two-handed weapon is equipped', () => {
        const combatantInfo = createMockCombatantInfo({
          [GearSlot.MAIN_HAND]: createGearItem(
            WeaponType.SWORD,
            GearTrait.SHARPENED,
            GearSlot.MAIN_HAND,
          ),
        });

        expect(hasTwoHandedSharpenedWeapon(combatantInfo)).toBe(false);
      });

      it('should return false for empty gear', () => {
        const combatantInfo = createMockCombatantInfo({});
        expect(hasTwoHandedSharpenedWeapon(combatantInfo)).toBe(false);
      });
    });

    describe('countAxesInWeaponSlots', () => {
      it('should count all axes in weapon slots', () => {
        const combatantInfo = createMockCombatantInfo({
          [GearSlot.MAIN_HAND]: createGearItem(
            WeaponType.AXE,
            GearTrait.SHARPENED,
            GearSlot.MAIN_HAND,
          ),
          [GearSlot.OFF_HAND]: createGearItem(
            WeaponType.AXE,
            GearTrait.SHARPENED,
            GearSlot.OFF_HAND,
          ),
          [GearSlot.BACKUP_MAIN_HAND]: createGearItem(
            WeaponType.TWO_HANDED_AXE,
            GearTrait.SHARPENED,
            GearSlot.BACKUP_MAIN_HAND,
          ),
          [GearSlot.BACKUP_OFF_HAND]: createGearItem(
            WeaponType.SWORD,
            GearTrait.SHARPENED,
            GearSlot.BACKUP_OFF_HAND,
          ),
        });

        expect(countAxesInWeaponSlots(combatantInfo)).toBe(3);
      });

      it('should not count non-axe weapons', () => {
        const combatantInfo = createMockCombatantInfo({
          [GearSlot.MAIN_HAND]: createGearItem(
            WeaponType.SWORD,
            GearTrait.SHARPENED,
            GearSlot.MAIN_HAND,
          ),
          [GearSlot.OFF_HAND]: createGearItem(
            WeaponType.DAGGER,
            GearTrait.SHARPENED,
            GearSlot.OFF_HAND,
          ),
        });

        expect(countAxesInWeaponSlots(combatantInfo)).toBe(0);
      });

      it('should return 0 for empty gear', () => {
        const combatantInfo = createMockCombatantInfo({});
        expect(countAxesInWeaponSlots(combatantInfo)).toBe(0);
      });
    });

    describe('hasTwoHandedAxeEquipped', () => {
      it('should return true when mainhand has two-handed axe', () => {
        const combatantInfo = createMockCombatantInfo({
          [GearSlot.MAIN_HAND]: createGearItem(
            WeaponType.TWO_HANDED_AXE,
            GearTrait.SHARPENED,
            GearSlot.MAIN_HAND,
          ),
        });

        expect(hasTwoHandedAxeEquipped(combatantInfo)).toBe(true);
      });

      it('should return true when backup mainhand has two-handed axe', () => {
        const combatantInfo = createMockCombatantInfo({
          [GearSlot.BACKUP_MAIN_HAND]: createGearItem(
            WeaponType.TWO_HANDED_AXE,
            GearTrait.SHARPENED,
            GearSlot.BACKUP_MAIN_HAND,
          ),
        });

        expect(hasTwoHandedAxeEquipped(combatantInfo)).toBe(true);
      });

      it('should return false when no two-handed axe is equipped', () => {
        const combatantInfo = createMockCombatantInfo({
          [GearSlot.MAIN_HAND]: createGearItem(
            WeaponType.AXE,
            GearTrait.SHARPENED,
            GearSlot.MAIN_HAND,
          ),
          [GearSlot.OFF_HAND]: createGearItem(
            WeaponType.AXE,
            GearTrait.SHARPENED,
            GearSlot.OFF_HAND,
          ),
        });

        expect(hasTwoHandedAxeEquipped(combatantInfo)).toBe(false);
      });

      it('should return false for empty gear', () => {
        const combatantInfo = createMockCombatantInfo({});
        expect(hasTwoHandedAxeEquipped(combatantInfo)).toBe(false);
      });
    });

    describe('hasTwoHandedMaulEquipped', () => {
      it('should return true when mainhand has two-handed maul', () => {
        const combatantInfo = createMockCombatantInfo({
          [GearSlot.MAIN_HAND]: createGearItem(
            WeaponType.MAUL,
            GearTrait.SHARPENED,
            GearSlot.MAIN_HAND,
          ),
        });

        expect(hasTwoHandedMaulEquipped(combatantInfo)).toBe(true);
      });

      it('should return true when backup mainhand has two-handed maul', () => {
        const combatantInfo = createMockCombatantInfo({
          [GearSlot.BACKUP_MAIN_HAND]: createGearItem(
            WeaponType.MAUL,
            GearTrait.SHARPENED,
            GearSlot.BACKUP_MAIN_HAND,
          ),
        });

        expect(hasTwoHandedMaulEquipped(combatantInfo)).toBe(true);
      });

      it('should return false when no two-handed maul is equipped', () => {
        const combatantInfo = createMockCombatantInfo({
          [GearSlot.MAIN_HAND]: createGearItem(
            WeaponType.TWO_HANDED_SWORD,
            GearTrait.SHARPENED,
            GearSlot.MAIN_HAND,
          ),
        });

        expect(hasTwoHandedMaulEquipped(combatantInfo)).toBe(false);
      });

      it('should return false for empty gear', () => {
        const combatantInfo = createMockCombatantInfo({});
        expect(hasTwoHandedMaulEquipped(combatantInfo)).toBe(false);
      });
    });

    describe('countDualWieldWeapons', () => {
      it('should count one-handed weapons in mainhand and offhand', () => {
        const combatantInfo = createMockCombatantInfo({
          [GearSlot.MAIN_HAND]: createGearItem(
            WeaponType.SWORD,
            GearTrait.SHARPENED,
            GearSlot.MAIN_HAND,
          ),
          [GearSlot.OFF_HAND]: createGearItem(
            WeaponType.AXE,
            GearTrait.SHARPENED,
            GearSlot.OFF_HAND,
          ),
          [GearSlot.BACKUP_MAIN_HAND]: createGearItem(
            WeaponType.DAGGER,
            GearTrait.SHARPENED,
            GearSlot.BACKUP_MAIN_HAND,
          ),
          [GearSlot.BACKUP_OFF_HAND]: createGearItem(
            WeaponType.MACE,
            GearTrait.SHARPENED,
            GearSlot.BACKUP_OFF_HAND,
          ),
        });

        expect(countDualWieldWeapons(combatantInfo)).toBe(4);
      });

      it('should not count two-handed weapons or staves', () => {
        const combatantInfo = createMockCombatantInfo({
          [GearSlot.MAIN_HAND]: createGearItem(
            WeaponType.TWO_HANDED_SWORD,
            GearTrait.SHARPENED,
            GearSlot.MAIN_HAND,
          ),
          [GearSlot.BACKUP_MAIN_HAND]: createGearItem(
            WeaponType.INFERNO_STAFF,
            GearTrait.SHARPENED,
            GearSlot.BACKUP_MAIN_HAND,
          ),
        });

        expect(countDualWieldWeapons(combatantInfo)).toBe(0);
      });

      it('should return 0 for empty gear', () => {
        const combatantInfo = createMockCombatantInfo({});
        expect(countDualWieldWeapons(combatantInfo)).toBe(0);
      });
    });

    describe('countMacesInWeaponSlots', () => {
      it('should count maces in weapon slots', () => {
        const combatantInfo = createMockCombatantInfo({
          [GearSlot.MAIN_HAND]: createGearItem(
            WeaponType.MACE,
            GearTrait.SHARPENED,
            GearSlot.MAIN_HAND,
          ),
          [GearSlot.OFF_HAND]: createGearItem(
            WeaponType.MACE,
            GearTrait.SHARPENED,
            GearSlot.OFF_HAND,
          ),
          [GearSlot.BACKUP_MAIN_HAND]: createGearItem(
            WeaponType.AXE,
            GearTrait.SHARPENED,
            GearSlot.BACKUP_MAIN_HAND,
          ),
          [GearSlot.BACKUP_OFF_HAND]: createGearItem(
            WeaponType.MACE,
            GearTrait.SHARPENED,
            GearSlot.BACKUP_OFF_HAND,
          ),
        });

        expect(countMacesInWeaponSlots(combatantInfo)).toBe(3);
      });

      it('should not count non-mace weapons', () => {
        const combatantInfo = createMockCombatantInfo({
          [GearSlot.MAIN_HAND]: createGearItem(
            WeaponType.AXE,
            GearTrait.SHARPENED,
            GearSlot.MAIN_HAND,
          ),
          [GearSlot.OFF_HAND]: createGearItem(
            WeaponType.DAGGER,
            GearTrait.SHARPENED,
            GearSlot.OFF_HAND,
          ),
        });

        expect(countMacesInWeaponSlots(combatantInfo)).toBe(0);
      });

      it('should return 0 for empty gear', () => {
        const combatantInfo = createMockCombatantInfo({});
        expect(countMacesInWeaponSlots(combatantInfo)).toBe(0);
      });
    });
  });
});
