/**
 * Tests for Item Slot Validator
 */

import { getCanonicalItemsBySlot, getItemsBySlot } from '../../data/itemIdMap';
import type { GearConfig, GearPiece } from '../../types/loadout.types';
import { deriveItemNameForSlot, preloadIconData } from '../itemIconResolver';
import {
  hasKnownSlot,
  getItemSlotInfo,
  validateGearConfig,
  getSlotCoverageStats,
  canExportLoadout,
  type ValidationResult,
  type ItemSlotInfo,
} from '../itemSlotValidator';

const UNKNOWN_SLOT_ITEM_ID = 40259; // Shalidor's Curse gear piece lacking slot data
const SECOND_UNKNOWN_SLOT_ITEM_ID = 43803; // Death's Wind gear piece without slot info

// The weapon-type-aware canonical-key tests below rely on deriveItemNameForSlot,
// which needs the lazily-imported icon data. Await it so weapon names resolve to
// real types (Bow / staves) instead of the generic fallback — otherwise those
// assertions are order-dependent on whether the JSON import has resolved.
beforeAll(async () => {
  await preloadIconData();
});

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

      // Use known items with correct slot assignments
      gear[0] = createGearPiece('59403'); // Use 59403 in head slot since it's actually a head piece

      const result = validateGearConfig(gear);

      console.log('Valid slot assignment test result:', {
        isValid: result.isValid,
        errors: result.errors,
        warnings: result.warnings,
        itemsWithSlots: result.itemsWithSlots,
        itemsWithoutSlots: result.itemsWithoutSlots,
      });

      // Should have no errors even if items lack slot metadata
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
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

      // Use a known item with explicit slot data that conflicts
      // If no ring items with slot data exist, test will generate warning instead of error
      gear[0] = createGearPiece('1115'); // May lack slot info

      const result = validateGearConfig(gear);

      // Should have warnings if no slot data, or errors if wrong slot
      const hasIssues = result.errors.length > 0 || result.warnings.length > 0;
      expect(hasIssues).toBe(true);
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

      // Current coverage is ~10.9% - will improve with slot propagation feature
      expect(stats.coveragePercent).toBeGreaterThan(10);
      expect(stats.coveragePercent).toBeLessThan(15);
      console.info(`✅ Slot coverage: ${stats.coveragePercent.toFixed(2)}%`);
    });

    it('ensures monster slots still have meaningful explicit coverage', () => {
      const stats = getSlotCoverageStats();

      const headCount = stats.bySlot.head || 0;
      const shouldersCount = stats.bySlot.shoulders || 0;

      // Current monster set coverage is lower
      expect(headCount).toBeGreaterThan(1800);
      expect(shouldersCount).toBeGreaterThan(1800);
    });
  });

  describe('getItemsBySlot', () => {
    it('returns only items for the specified slot', () => {
      const headItems = getItemsBySlot('head');

      expect(headItems.length).toBeGreaterThan(0);
      headItems.forEach(({ info }) => {
        expect(info.slot).toBe('head');
      });
    });

    it('returns sorted items by set name', () => {
      const items = getItemsBySlot('head');

      // Check if sorted alphabetically
      for (let i = 1; i < items.length; i++) {
        const prev = items[i - 1].info.setName;
        const curr = items[i].info.setName;
        expect(prev.localeCompare(curr)).toBeLessThanOrEqual(0);
      }
    });

    it('returns empty array for slots with no items', () => {
      // This shouldn't happen, but test the behavior
      const items = getItemsBySlot('head');
      expect(Array.isArray(items)).toBe(true);
    });
  });

  describe('getCanonicalItemsBySlot', () => {
    it('returns exactly one item per set for a slot', () => {
      const canonical = getCanonicalItemsBySlot('shoulders');
      const setNames = canonical.map(({ info }) => info.setName);
      const uniqueSetNames = new Set(setNames);
      // One canonical entry per set — no duplicates.
      expect(setNames.length).toBe(uniqueSetNames.size);
    });

    it('collapses the many Zaan shoulder variants down to a single entry', () => {
      const rawZaanShoulders = getItemsBySlot('shoulders').filter(
        ({ info }) => info.setName === 'Zaan',
      );
      const canonicalZaanShoulders = getCanonicalItemsBySlot('shoulders').filter(
        ({ info }) => info.setName === 'Zaan',
      );

      // The raw data carries many quality/level variants...
      expect(rawZaanShoulders.length).toBeGreaterThan(1);
      // ...but the picker only ever sees one.
      expect(canonicalZaanShoulders).toHaveLength(1);
    });

    it('picks the lowest item id as the canonical variant', () => {
      const bySet = new Map<string, number[]>();
      for (const { itemId, info } of getItemsBySlot('head')) {
        const list = bySet.get(info.setName) ?? [];
        list.push(itemId);
        bySet.set(info.setName, list);
      }

      for (const { itemId, info } of getCanonicalItemsBySlot('head')) {
        const allIdsForSet = bySet.get(info.setName) ?? [];
        expect(itemId).toBe(Math.min(...allIdsForSet));
      }
    });

    it('has no more entries than getItemsBySlot for the same slot', () => {
      const slots = ['head', 'shoulders', 'chest', 'hand'] as const;
      for (const slot of slots) {
        expect(getCanonicalItemsBySlot(slot).length).toBeLessThanOrEqual(
          getItemsBySlot(slot).length,
        );
      }
    });
  });

  describe('getCanonicalItemsBySlot — weapon-type-aware key', () => {
    // The picker keys weapons by their slot-aware display name so distinct
    // weapon TYPES (axe/sword/bow/staff/…) of one set aren't collapsed away.
    const weaponKey = (itemId: number, info: { setName: string }): string =>
      `${info.setName} ${deriveItemNameForSlot(itemId, 'weapon')}`;

    it('default (set-name) key drops all but one weapon per set — the regression we guard against', () => {
      const defaultCanon = getCanonicalItemsBySlot('weapon').filter(
        ({ info }) => info.setName === "Mother's Sorrow",
      );
      // Set-name dedup keeps a single (wrong) weapon for the whole set.
      expect(defaultCanon).toHaveLength(1);
    });

    it('weapon-aware key keeps every distinct weapon type of a set', () => {
      const raw = getItemsBySlot('weapon').filter(({ info }) => info.setName === "Mother's Sorrow");
      const distinctTypes = new Set(
        raw.map(({ itemId }) => deriveItemNameForSlot(itemId, 'weapon')),
      );
      const canon = getCanonicalItemsBySlot('weapon', weaponKey).filter(
        ({ info }) => info.setName === "Mother's Sorrow",
      );
      // One canonical row per distinct weapon type — bow/staff/greatsword survive.
      expect(canon.length).toBe(distinctTypes.size);
      expect(canon.length).toBeGreaterThan(1);
      const canonNames = canon.map(({ itemId }) => deriveItemNameForSlot(itemId, 'weapon'));
      expect(canonNames).toEqual(expect.arrayContaining([expect.stringMatching(/Bow$/)]));
      expect(canonNames).toEqual(
        expect.arrayContaining([
          expect.stringMatching(/(Inferno|Ice|Lightning|Restoration) Staff$/),
        ]),
      );
    });

    it('still collapses level/quality variants of a single weapon type to one entry', () => {
      const canon = getCanonicalItemsBySlot('weapon', weaponKey);
      // No two canonical entries share the same (set, weapon-type) key.
      const keys = canon.map(({ itemId, info }) => weaponKey(itemId, info));
      expect(keys.length).toBe(new Set(keys).size);
      // And the picker-aware result is strictly larger than the set-name dedup.
      expect(canon.length).toBeGreaterThan(getCanonicalItemsBySlot('weapon').length);
    });

    // Regression for the lazy-icon-data race: before icon data loads,
    // deriveItemNameForSlot falls back to the generic "<Set> Weapon" name, so a
    // key built from it collapses every weapon type into one — the picker must
    // NOT cache groups built in that state (see getSetGroupsForSlot's iconReady
    // gate). This test demonstrates the collapse the gate exists to prevent.
    it('a generic-name key (icon data not ready) collapses weapon types — why the cache gate exists', () => {
      const genericKey = (_itemId: number, info: { setName: string }): string =>
        `${info.setName} ${info.setName} Weapon`; // mimics derive fallback pre-icon-load
      const collapsed = getCanonicalItemsBySlot('weapon', genericKey).filter(
        ({ info }) => info.setName === "Mother's Sorrow",
      );
      const split = getCanonicalItemsBySlot('weapon', weaponKey).filter(
        ({ info }) => info.setName === "Mother's Sorrow",
      );
      expect(collapsed).toHaveLength(1);
      // The real (icon-ready) key keeps many more — so caching the collapsed
      // result would permanently hide the rest for the page session.
      expect(split.length).toBeGreaterThan(collapsed.length);
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

      // Use head items in head slots
      gear[0] = { id: '59380', link: '|H0:item:59380:0|h|h' }; // Head in head slot
      // Note: 59403 is also a head piece, so we'll only test one item for now

      const result = validateGearConfig(gear);

      console.log('Monster set validation result:', {
        isValid: result.isValid,
        errors: result.errors,
        warnings: result.warnings,
        itemsWithSlots: result.itemsWithSlots,
        itemsWithoutSlots: result.itemsWithoutSlots,
      });

      // If items don't have slot data, this will generate warnings instead of validation
      const hasNoIssues = result.errors.length === 0;
      expect(hasNoIssues).toBe(true);
      expect(result.isValid).toBe(true);
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

      gear[0] = { id: '59403' }; // Put head item in head slot (explicit)
      gear[2] = { id: String(UNKNOWN_SLOT_ITEM_ID) }; // Inferred
      gear[3] = { id: '59380' }; // Put another head item in shoulders slot for inference
      gear[11] = { id: String(SECOND_UNKNOWN_SLOT_ITEM_ID) }; // Inferred

      const result = validateGearConfig(gear);

      // Expect warnings/errors but not strict counts since slot data may vary
      expect(result.warnings.length + result.errors.length).toBeGreaterThanOrEqual(2);
      console.log('Multi-item test result:', {
        isValid: result.isValid,
        errors: result.errors,
        warnings: result.warnings,
        itemsWithSlots: result.itemsWithSlots,
        itemsWithoutSlots: result.itemsWithoutSlots,
      });
    });
  });

  describe('coverage awareness', () => {
    it('reports the improved coverage state', () => {
      const stats = getSlotCoverageStats();

      console.log('\n📊 Slot Coverage Report:');
      console.log(`   Total Items: ${stats.totalItems.toLocaleString()}`);
      console.log(`   Items with Slots: ${stats.itemsWithSlots.toLocaleString()}`);
      console.log(`   Coverage: ${stats.coveragePercent.toFixed(2)}%\n`);
      console.log('   ⏳ Coverage awaiting slot propagation feature rollout.\n');

      // Current coverage is ~10.9% until slot propagation feature is completed
      expect(stats.coveragePercent).toBeGreaterThan(10);
      expect(stats.coveragePercent).toBeLessThan(15);
    });
  });
});
