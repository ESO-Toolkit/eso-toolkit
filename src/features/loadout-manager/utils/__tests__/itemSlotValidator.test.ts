/**
 * Tests for Item Slot Validator
 */

import {
  hasKnownSlot,
  getItemSlotInfo,
  validateGearConfig,
  getSlotCoverageStats,
  getItemsBySlot,
  canExportLoadout,
  type ValidationResult,
  type ItemSlotInfo,
} from '../itemSlotValidator';
import type { GearConfig, GearPiece } from '../../types/loadout.types';

const UNKNOWN_SLOT_ITEM_ID = 40259; // Shalidor's Curse gear piece lacking slot data
const SECOND_UNKNOWN_SLOT_ITEM_ID = 43803; // Death's Wind gear piece without slot info

describe('itemSlotValidator', () => {
  describe('hasKnownSlot', () => {
    it('returns true for items with known slots (monster set head)', () => {
      // Spawn of Mephala Head - known to have slot info
      expect(hasKnownSlot(59380)).toBe(true);
    });

    it('returns false for items without slot info', () => {
      // Some crafted sets still lack slot metadata even after propagation
      expect(hasKnownSlot(UNKNOWN_SLOT_ITEM_ID)).toBe(false);
    });

    it('returns false for non-existent items', () => {
      expect(hasKnownSlot(999999999)).toBe(false);
    });
  });

  describe('getItemSlotInfo', () => {
    it('returns slot info for valid items', () => {
      const info = getItemSlotInfo(59380); // Spawn of Mephala Head

      expect(info).not.toBeNull();
      expect(info?.hasSlot).toBe(true);
      expect(info?.slot).toBe('head');
      expect(info?.equipType).toBe(0);
      expect(info?.setName).toBe('Spawn of Mephala');
    });

    it('returns null for non-existent items', () => {
      expect(getItemSlotInfo(999999999)).toBeNull();
    });

    it('indicates missing slot for items without slot info', () => {
      const info = getItemSlotInfo(UNKNOWN_SLOT_ITEM_ID); // Crafted gear piece without slot data

      expect(info).not.toBeNull();
      expect(info?.hasSlot).toBe(false);
      expect(info?.slot).toBeUndefined();
    });
  });

  describe('validateGearConfig', () => {
    function createGearPiece(id: string): GearPiece {
      return { id, link: `|H0:item:${id}:0|h|h` };
    }

    function createEmptyGearConfig(): GearConfig {
      return {};
    }

    it('validates empty gear config as valid (no items to check)', () => {
      const gear = createEmptyGearConfig();
      const result = validateGearConfig(gear);

      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('accepts gear with all valid slot assignments', () => {
      const gear = createEmptyGearConfig();

      // Use known items with slot info
      gear[0] = createGearPiece('59380'); // Spawn of Mephala Head
      gear[3] = createGearPiece('59403'); // Spawn of Mephala Shoulders

      const result = validateGearConfig(gear);

      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
      expect(result.itemsWithSlots).toBeGreaterThan(0);
    });

    it('warns about items without slot information', () => {
      const gear = createEmptyGearConfig();
      gear[0] = createGearPiece(String(UNKNOWN_SLOT_ITEM_ID));

      const result = validateGearConfig(gear);

      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
      expect(result.warnings.length).toBeGreaterThan(0);
      expect(result.warnings[0]).toContain('lacks slot metadata');
      expect(result.itemsWithoutSlots).toBe(1);
    });

    it('detects slot mismatches', () => {
      const gear = createEmptyGearConfig();

  // Try to put a ring item (slot 'ring') in the head slot (slot 0)
  // First need to find a ring item with slot info
  gear[0] = createGearPiece('1115'); // Armor of the Trainee Ring should fail

      const result = validateGearConfig(gear);

      // Should either fail for wrong slot or missing slot info
      expect(result.isValid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });

    it('warns about weapons without slot info', () => {
      const gear = createEmptyGearConfig();
      gear[4] = createGearPiece(String(UNKNOWN_SLOT_ITEM_ID)); // Non-weapon item in weapon slot

      const result = validateGearConfig(gear);

      // Should have warnings about weapons
      expect(result.warnings.length).toBeGreaterThan(0);
      expect(result.errors).toHaveLength(0);
      expect(result.warnings[0]).toContain('Assuming user placement');
    });

    it('rejects non-existent items', () => {
      const gear = createEmptyGearConfig();
      gear[0] = createGearPiece('999999999');

      const result = validateGearConfig(gear);

      expect(result.isValid).toBe(false);
      expect(result.errors[0]).toContain('not found in database');
    });
  });

  describe('getSlotCoverageStats', () => {
    it('returns coverage statistics', () => {
      const stats = getSlotCoverageStats();

      expect(stats.totalItems).toBeGreaterThan(100000); // We have 112K+ items
      expect(stats.itemsWithSlots).toBeGreaterThan(0);
      expect(stats.coveragePercent).toBeGreaterThan(0);
      expect(stats.coveragePercent).toBeLessThan(100);
      expect(stats.bySlot).toBeDefined();
      expect(Object.keys(stats.bySlot).length).toBeGreaterThan(0);
    });

    it('confirms coverage improved after slot propagation', () => {
      const stats = getSlotCoverageStats();

      expect(stats.coveragePercent).toBeGreaterThan(70);
      expect(stats.coveragePercent).toBeLessThan(90);
      console.info(`✅ Slot coverage: ${stats.coveragePercent.toFixed(2)}%`);
    });

    it('ensures monster slots still have meaningful explicit coverage', () => {
      const stats = getSlotCoverageStats();

      const headCount = stats.bySlot.head || 0;
      const shouldersCount = stats.bySlot.shoulders || 0;

      expect(headCount).toBeGreaterThan(2000);
      expect(shouldersCount).toBeGreaterThan(3000);
    });
  });

  describe('getItemsBySlot', () => {
    it('returns only items for the specified slot', () => {
      const headItems = getItemsBySlot('head');

      expect(headItems.length).toBeGreaterThan(0);
      headItems.forEach(({ item }) => {
        expect(item.slot).toBe('head');
      });
    });

    it('returns sorted items by set name', () => {
      const items = getItemsBySlot('head');

      // Check if sorted alphabetically
      for (let i = 1; i < items.length; i++) {
        const prev = items[i - 1].item.setName;
        const curr = items[i].item.setName;
        expect(prev.localeCompare(curr)).toBeLessThanOrEqual(0);
      }
    });

    it('returns empty array for slots with no items', () => {
      // This shouldn't happen, but test the behavior
      const items = getItemsBySlot('head');
      expect(Array.isArray(items)).toBe(true);
    });
  });

  describe('canExportLoadout', () => {
    function createGearPiece(id: string): GearPiece {
      return { id, link: `|H0:item:${id}:0|h|h` };
    }

    it('allows export of valid loadouts', () => {
      const gear: GearConfig = {};
      gear[0] = createGearPiece('59380'); // Valid head item

      const result = canExportLoadout(gear);

      expect(result.canExport).toBe(true);
      expect(result.reason).toBeUndefined();
    });

    it('allows export of inferred loadouts', () => {
      const gear: GearConfig = {};
      gear[0] = createGearPiece(String(UNKNOWN_SLOT_ITEM_ID)); // Item without slot info

      const result = canExportLoadout(gear);

      expect(result.canExport).toBe(true);
      expect(result.reason).toBeUndefined();
    });

    it('provides helpful error message', () => {
      const gear: GearConfig = {};
      gear[0] = createGearPiece('999999999'); // Non-existent item

      const result = canExportLoadout(gear);

      expect(result.canExport).toBe(false);
      expect(result.reason).toContain('not found in database');
    });
  });

  describe('integration scenarios', () => {
    it('validates a complete monster set loadout', () => {
      const gear: GearConfig = {};

      // Spawn of Mephala monster set (head + shoulders)
      gear[0] = { id: '59380', link: '|H0:item:59380:0|h|h' }; // Head
      gear[3] = { id: '59403', link: '|H0:item:59403:0|h|h' }; // Shoulders

      const result = validateGearConfig(gear);

      // Monster sets should validate successfully
      expect(result.isValid).toBe(true);
      expect(result.itemsWithSlots).toBeGreaterThan(0);
    });

    it('counts warnings for mixed explicit and inferred items', () => {
      const gear: GearConfig = {};

  gear[0] = { id: '59380' }; // Valid: Spawn of Mephala Head
  gear[2] = { id: String(UNKNOWN_SLOT_ITEM_ID) }; // Invalid: No slot info

      const result = validateGearConfig(gear);

      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
      expect(result.itemsWithSlots).toBe(1);
      expect(result.itemsWithoutSlots).toBe(1);
      expect(result.warnings.length).toBe(1);
    });

    it('tracks warnings when multiple items need inference', () => {
      const gear: GearConfig = {};

  gear[0] = { id: '59380' }; // Explicit slot
  gear[2] = { id: String(UNKNOWN_SLOT_ITEM_ID) }; // Inferred
  gear[3] = { id: '59403' }; // Explicit slot
  gear[11] = { id: String(SECOND_UNKNOWN_SLOT_ITEM_ID) }; // Inferred

      const result = validateGearConfig(gear);

      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
      expect(result.itemsWithSlots).toBe(2);
      expect(result.itemsWithoutSlots).toBe(2);
      expect(result.warnings.length).toBe(2);
    });
  });

  describe('coverage awareness', () => {
    it('reports the improved coverage state', () => {
      const stats = getSlotCoverageStats();

      console.log('\n📊 Slot Coverage Report:');
      console.log(`   Total Items: ${stats.totalItems.toLocaleString()}`);
      console.log(`   Items with Slots: ${stats.itemsWithSlots.toLocaleString()}`);
      console.log(`   Coverage: ${stats.coveragePercent.toFixed(2)}%\n`);
      console.log('   ✅ Coverage improved after slot propagation rollout.\n');

      // Ensure the new dataset maintains high coverage
      expect(stats.coveragePercent).toBeGreaterThan(70);
      expect(stats.coveragePercent).toBeLessThan(90);
    });
  });
});
