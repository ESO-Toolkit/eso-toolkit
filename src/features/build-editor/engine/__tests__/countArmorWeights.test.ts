/**
 * Tests for countArmorWeights — specifically that a set locked to one armor
 * weight in-game is counted as that weight even when the stored GearPiece has
 * no `weight` field (the common case for imported / CSPS gear). The build
 * editor shows the locked weight as a read-only chip, so stats must agree.
 *
 * Concrete item IDs (from itemIdMap):
 *   97232 — Mother's Sorrow Chest  → locked LIGHT
 *   100602 — Spriggan's Thorns Chest → locked MEDIUM
 *   97050 — Plague Doctor Chest    → locked HEAVY
 */

import type { GearConfig } from '../../../loadout-manager/types/loadout.types';
import { countArmorWeights } from '../stat-engine';

// Apparel slot indices (chest=2, shoulders=3, head=0) — any apparel slot works.
const CHEST = 2;
const SHOULDERS = 3;
const HEAD = 0;

describe('countArmorWeights — locked-weight resolution', () => {
  it('counts a locked LIGHT set as light even with no stored weight', () => {
    const gear: GearConfig = { [CHEST]: { id: 97232 } }; // Mother's Sorrow, no weight
    expect(countArmorWeights(gear)).toEqual({ light: 1, medium: 0, heavy: 0 });
  });

  it('counts a locked MEDIUM set as medium with no stored weight', () => {
    const gear: GearConfig = { [CHEST]: { id: 100602 } }; // Spriggan's Thorns
    expect(countArmorWeights(gear)).toEqual({ light: 0, medium: 1, heavy: 0 });
  });

  it('counts a locked HEAVY set as heavy with no stored weight', () => {
    const gear: GearConfig = { [CHEST]: { id: 97050 } }; // Plague Doctor
    expect(countArmorWeights(gear)).toEqual({ light: 0, medium: 0, heavy: 1 });
  });

  it('locked weight overrides a stale/incorrect stored weight', () => {
    // Stored weight says heavy, but Mother's Sorrow only exists in light.
    const gear: GearConfig = { [CHEST]: { id: 97232, weight: 'heavy' } };
    expect(countArmorWeights(gear)).toEqual({ light: 1, medium: 0, heavy: 0 });
  });

  it('accepts a string item id (Wizard-Wardrobe compatibility)', () => {
    const gear: GearConfig = { [CHEST]: { id: '97232' } };
    expect(countArmorWeights(gear)).toEqual({ light: 1, medium: 0, heavy: 0 });
  });

  it('falls back to the stored weight for a free (all-weight) set', () => {
    // A crafted/monster set has no lock; the user-chosen weight must be honored.
    // Use an id whose set is not locked — Plague Doctor IS locked, so to test the
    // free path we rely on stored weight winning when no lock exists. We assert
    // via a deliberately-unknown id (no info → no lock) carrying a stored weight.
    const gear: GearConfig = { [CHEST]: { id: 999999999, weight: 'medium' } };
    expect(countArmorWeights(gear)).toEqual({ light: 0, medium: 1, heavy: 0 });
  });

  it('defaults to heavy when neither lock nor stored weight is known', () => {
    const gear: GearConfig = { [CHEST]: { id: 999999999 } };
    expect(countArmorWeights(gear)).toEqual({ light: 0, medium: 0, heavy: 1 });
  });

  it('skips empty slots and sums across multiple apparel slots', () => {
    const gear: GearConfig = {
      [HEAD]: { id: 97232 }, // Mother's Sorrow head variant? id is chest, but lock is by SET
      [CHEST]: { id: 97050 }, // Plague Doctor → heavy
      [SHOULDERS]: { weight: 'medium' }, // no id → ignored
    };
    // HEAD uses a Mother's Sorrow item id (set locked light), CHEST heavy.
    expect(countArmorWeights(gear)).toEqual({ light: 1, medium: 0, heavy: 1 });
  });
});
