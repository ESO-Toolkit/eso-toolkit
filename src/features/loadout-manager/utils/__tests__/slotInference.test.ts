/**
 * Tests for Slot Inference System
 */

import {
  validateGearConfigWithInference,
  canExportLoadoutWithInference,
  suggestSlotForItem,
  generateExportMetadata,
} from '../slotInference';
import type { GearConfig } from '../../types/loadout.types';

const SLOTLESS_ITEM_ID = 40259; // Shalidor's Curse - missing slot metadata
const SECOND_SLOTLESS_ITEM_ID = 43803; // Death's Wind - missing slot metadata
const THIRD_SLOTLESS_ITEM_ID = 43804;
const FOURTH_SLOTLESS_ITEM_ID = 43805;
const FIFTH_SLOTLESS_ITEM_ID = 43806;

describe('slotInference', () => {
  function createGearPiece(id: string) {
    return { id, link: `|H0:item:${id}:0|h|h` };
  }

  describe('validateGearConfigWithInference', () => {
    it('accepts items with explicit slot data (high confidence)', () => {
      const gear: GearConfig = {};
      gear[0] = createGearPiece('59380'); // Spawn of Mephala Head - HAS slot data

      const result = validateGearConfigWithInference(gear);

      expect(result.isValid).toBe(true);
      expect(result.itemsWithExplicitSlots).toBe(1);
      expect(result.itemsWithInferredSlots).toBe(0);
      expect(result.confidence).toBe('high');
      expect(result.errors).toHaveLength(0);
    });

    it('accepts items WITHOUT slot data via inference (medium confidence)', () => {
      const gear: GearConfig = {};
      gear[0] = createGearPiece(String(SLOTLESS_ITEM_ID)); // Crafted set - no slot data

      const result = validateGearConfigWithInference(gear);

      expect(result.isValid).toBe(true);
      expect(result.itemsWithExplicitSlots).toBe(0);
      expect(result.itemsWithInferredSlots).toBe(1);
      expect(result.confidence).toBe('medium');
      expect(result.warnings.length).toBeGreaterThan(0);
      expect(result.warnings[0]).toContain('has no slot verification');
      expect(result.warnings[0]).toContain('Assuming');
    });

    it('rejects items with CONFLICTING explicit slot data', () => {
      const gear: GearConfig = {};
      gear[0] = createGearPiece('1115'); // Armor of the Trainee Ring - explicit slot

      const result = validateGearConfigWithInference(gear);

      expect(result.isValid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
      expect(result.errors[0]).toContain('explicitly marked as a ring');
      expect(result.errors[0]).toContain('head slot');
    });

    it('handles mixed loadout (some explicit, some inferred)', () => {
      const gear: GearConfig = {};
      gear[0] = createGearPiece('59380'); // Head - explicit slot
      gear[2] = createGearPiece(String(SLOTLESS_ITEM_ID)); // Chest - no slot (inferred)
      gear[3] = createGearPiece('59403'); // Shoulders - explicit slot

      const result = validateGearConfigWithInference(gear);

      expect(result.isValid).toBe(true);
      expect(result.itemsWithExplicitSlots).toBe(2);
      expect(result.itemsWithInferredSlots).toBe(1);
      expect(result.confidence).toBe('high'); // <30% inferred
      expect(result.warnings.length).toBe(1);
    });

    it('assigns medium confidence when mostly inferred', () => {
      const gear: GearConfig = {};
      gear[0] = createGearPiece(String(SLOTLESS_ITEM_ID)); // No slot
      gear[2] = createGearPiece(String(SECOND_SLOTLESS_ITEM_ID)); // No slot
      gear[3] = createGearPiece('59403'); // Has slot

      const result = validateGearConfigWithInference(gear);

      expect(result.isValid).toBe(true);
      expect(result.itemsWithInferredSlots).toBe(2);
      expect(result.itemsWithExplicitSlots).toBe(1);
      expect(result.confidence).toBe('medium'); // >30% inferred
    });

    it('rejects non-existent items', () => {
      const gear: GearConfig = {};
      gear[0] = createGearPiece('999999999');

      const result = validateGearConfigWithInference(gear);

      expect(result.isValid).toBe(false);
      expect(result.errors[0]).toContain('not found in database');
    });

    it('validates empty loadout as high confidence', () => {
      const gear: GearConfig = {};

      const result = validateGearConfigWithInference(gear);

      expect(result.isValid).toBe(true);
      expect(result.confidence).toBe('high');
      expect(result.errors).toHaveLength(0);
      expect(result.warnings).toHaveLength(0);
    });
  });

  describe('canExportLoadoutWithInference', () => {
    it('allows export of explicit-only loadout (high confidence)', () => {
      const gear: GearConfig = {};
      gear[0] = createGearPiece('59380'); // Explicit slot

      const result = canExportLoadoutWithInference(gear);

      expect(result.canExport).toBe(true);
      expect(result.confidence).toBe('high');
      expect(result.warnings).toHaveLength(0);
    });

    it('allows export of inferred loadout with warnings (medium confidence)', () => {
      const gear: GearConfig = {};
      gear[0] = createGearPiece(String(SLOTLESS_ITEM_ID)); // No slot - inferred

      const result = canExportLoadoutWithInference(gear);

      expect(result.canExport).toBe(true);
      expect(result.confidence).toBe('medium');
      expect(result.warnings.length).toBeGreaterThan(0);
      expect(result.reason).toBeUndefined(); // No error, so no reason
    });

    it('blocks export of conflicting slots (low confidence)', () => {
      const gear: GearConfig = {};
      gear[0] = createGearPiece('1115'); // Ring in head slot - conflict!

      const result = canExportLoadoutWithInference(gear);

      expect(result.canExport).toBe(false);
      expect(result.confidence).toBe('low');
      expect(result.reason).toBeDefined();
      expect(result.reason).toContain('Cannot export');
    });

    it('includes warnings even when export is allowed', () => {
      const gear: GearConfig = {};
      gear[0] = createGearPiece('59380'); // Explicit
      gear[2] = createGearPiece(String(SLOTLESS_ITEM_ID)); // Inferred

      const result = canExportLoadoutWithInference(gear);

      expect(result.canExport).toBe(true);
      expect(result.warnings.length).toBe(1);
      expect(result.warnings[0]).toContain('has no slot verification');
    });
  });

  describe('suggestSlotForItem', () => {
    it('returns explicit slot when available', () => {
      const slot = suggestSlotForItem(59380); // Spawn of Mephala Head
      expect(slot).toBe('head');
    });

    it('returns null for generic "Gear" items', () => {
      const slot = suggestSlotForItem(SLOTLESS_ITEM_ID); // Shalidor's Curse Gear
      expect(slot).toBeNull();
    });

    it('returns null for non-existent items', () => {
      const slot = suggestSlotForItem(999999999);
      expect(slot).toBeNull();
    });

    it('infers from item name patterns when available', () => {
      // This would work if we had items with descriptive names
      // For now, most items are just "Gear" so will return null
      const slot = suggestSlotForItem(1115); // Armor of the Trainee Ring
      expect(slot).toBe('ring'); // Has explicit slot
    });
  });

  describe('generateExportMetadata', () => {
    it('generates metadata with explicit and inferred assignments', () => {
      const gear: GearConfig = {};
      gear[0] = createGearPiece('59380'); // Explicit
      gear[2] = createGearPiece(String(SLOTLESS_ITEM_ID)); // Inferred

      const metadata = generateExportMetadata(gear);

      expect(metadata.validation.isValid).toBe(true);
      expect(metadata.slotAssignments).toHaveLength(2);

      const headAssignment = metadata.slotAssignments.find((a) => a.slot === 'Head');
      expect(headAssignment?.assignmentType).toBe('explicit');

      const chestAssignment = metadata.slotAssignments.find((a) => a.slot === 'Chest');
      expect(chestAssignment?.assignmentType).toBe('inferred');
    });

    it('includes export timestamp', () => {
      const gear: GearConfig = {};
      const metadata = generateExportMetadata(gear);

      expect(metadata.exportDate).toBeDefined();
      expect(new Date(metadata.exportDate)).toBeInstanceOf(Date);
    });

    it('includes validation results', () => {
      const gear: GearConfig = {};
      gear[0] = createGearPiece('1115'); // Conflict

      const metadata = generateExportMetadata(gear);

      expect(metadata.validation.isValid).toBe(false);
      expect(metadata.validation.errors.length).toBeGreaterThan(0);
    });
  });

  describe('real-world scenarios', () => {
    it('allows full loadout of regular sets (all inferred)', () => {
      const gear: GearConfig = {};
      // Build a full Death's Wind loadout (no explicit slots)
      gear[0] = createGearPiece(String(SLOTLESS_ITEM_ID));
      gear[1] = createGearPiece(String(SECOND_SLOTLESS_ITEM_ID));
      gear[2] = createGearPiece(String(THIRD_SLOTLESS_ITEM_ID));
      gear[8] = createGearPiece(String(FOURTH_SLOTLESS_ITEM_ID));
      gear[9] = createGearPiece(String(FIFTH_SLOTLESS_ITEM_ID));

      const result = validateGearConfigWithInference(gear);

      expect(result.isValid).toBe(true);
      expect(result.itemsWithInferredSlots).toBe(5);
      expect(result.confidence).toBe('medium');
      expect(result.warnings).toHaveLength(5);
    });

    it('validates typical monster set + body pieces loadout', () => {
      const gear: GearConfig = {};
      // Monster set (explicit slots)
      gear[0] = createGearPiece('59380'); // Spawn of Mephala Head - explicit
      gear[3] = createGearPiece('59403'); // Spawn of Mephala Shoulders - explicit

      // Body set (inferred slots)
      gear[2] = createGearPiece(String(SLOTLESS_ITEM_ID)); // Chest - inferred
      gear[8] = createGearPiece(String(SECOND_SLOTLESS_ITEM_ID)); // Legs - inferred
      gear[9] = createGearPiece(String(THIRD_SLOTLESS_ITEM_ID)); // Feet - inferred

      const result = validateGearConfigWithInference(gear);

      expect(result.isValid).toBe(true);
      expect(result.itemsWithExplicitSlots).toBe(2);
      expect(result.itemsWithInferredSlots).toBe(3);
      expect(result.confidence).toBe('medium'); // 60% inferred (3/5)
    });

    it('provides useful warnings for user review', () => {
      const gear: GearConfig = {};
      gear[0] = createGearPiece(String(SLOTLESS_ITEM_ID)); // Shalidor's Curse - inferred

      const result = validateGearConfigWithInference(gear);
      const exportCheck = canExportLoadoutWithInference(gear);

      expect(result.warnings[0]).toContain("Shalidor's Curse Gear");
      expect(result.warnings[0]).toContain('has no slot verification');
      expect(result.warnings[0]).toContain('Assuming');

      expect(exportCheck.canExport).toBe(true);
      expect(exportCheck.warnings).toEqual(result.warnings);
    });
  });

  describe('confidence levels', () => {
    it('high confidence: all explicit', () => {
      const gear: GearConfig = {};
      gear[0] = createGearPiece('59380');
      gear[3] = createGearPiece('59403');

      const result = validateGearConfigWithInference(gear);
      expect(result.confidence).toBe('high');
    });

    it('high confidence: <30% inferred', () => {
      const gear: GearConfig = {};
      gear[0] = createGearPiece('59380'); // Explicit
      gear[3] = createGearPiece('59403'); // Explicit
      gear[2] = createGearPiece(String(SLOTLESS_ITEM_ID)); // Inferred (25%)

      const result = validateGearConfigWithInference(gear);
      expect(result.confidence).toBe('high');
    });

    it('medium confidence: >30% inferred', () => {
      const gear: GearConfig = {};
      gear[0] = createGearPiece('59380'); // Explicit
      gear[2] = createGearPiece(String(SLOTLESS_ITEM_ID)); // Inferred (50%)

      const result = validateGearConfigWithInference(gear);
      expect(result.confidence).toBe('medium');
    });

    it('medium confidence: all inferred', () => {
      const gear: GearConfig = {};
      gear[0] = createGearPiece(String(SLOTLESS_ITEM_ID));

      const result = validateGearConfigWithInference(gear);
      expect(result.confidence).toBe('medium');
    });
  });
});
