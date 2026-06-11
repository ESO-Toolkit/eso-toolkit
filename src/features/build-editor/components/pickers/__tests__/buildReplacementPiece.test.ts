/**
 * Tests for buildReplacementPiece — the gear-replace logic in EquipmentPicker.
 *
 * The critical guarantee: replacing an item must NOT keep the previous item's
 * `link` (which encodes the OLD item id). GearSelector resolves a slot's item id
 * from `link` before `id`, so a stale link would silently leave the slot on the
 * old item. Trait/enchant (and apparel weight) carry over; everything else is
 * rebuilt from the fresh id.
 *
 * Concrete ids: 97232 = Mother's Sorrow Chest (locked LIGHT).
 */

import { buildReplacementPiece } from '../EquipmentPicker';

describe('buildReplacementPiece', () => {
  it('drops a stale link from the previous item', () => {
    const prev = {
      id: 12345,
      link: '|H0:item:12345:0|h|h',
      trait: 'divines',
      enchant: 'magicka',
    };
    const next = buildReplacementPiece(prev, 97232, 'apparel');
    expect(next.id).toBe(97232);
    expect(next.link).toBeUndefined(); // ← the bug this guards against
  });

  it('carries over trait and enchant', () => {
    const next = buildReplacementPiece(
      { id: 1, trait: 'sharpened', enchant: 'weapon-damage' },
      97232,
      'apparel',
    );
    expect(next.trait).toBe('sharpened');
    expect(next.enchant).toBe('weapon-damage');
  });

  it('forces the locked weight for a single-weight set, ignoring stored weight', () => {
    const next = buildReplacementPiece({ id: 1, weight: 'heavy' }, 97232, 'apparel');
    expect(next.weight).toBe('light'); // Mother's Sorrow is light-only
  });

  it('keeps the user weight for a free apparel set', () => {
    // 999999999 is unknown → no lock → user weight carries over.
    const next = buildReplacementPiece({ id: 1, weight: 'medium' }, 999999999, 'apparel');
    expect(next.weight).toBe('medium');
  });

  it('never sets weight for weapon/accessory slots without a lock', () => {
    expect(
      buildReplacementPiece({ id: 1, weight: 'heavy' }, 999999999, 'weapons').weight,
    ).toBeUndefined();
    expect(
      buildReplacementPiece({ id: 1, weight: 'heavy' }, 999999999, 'accessories').weight,
    ).toBeUndefined();
  });

  it('handles a missing previous piece', () => {
    const next = buildReplacementPiece(undefined, 97232, 'apparel');
    expect(next).toEqual({ id: 97232, weight: 'light' });
  });
});
