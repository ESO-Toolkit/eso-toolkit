/**
 * Weapon-slot equipType resolution for the Wizard's Wardrobe Transfer encoder.
 *
 * Weapon equipType (ONE_HAND / TWO_HAND / OFF_HAND) is HARD-matched on import, so
 * it is derived from the item's resolved weapon type. These tests stub the item
 * data, weapon-type, and set-catalog lookups so the encoder's branching is
 * deterministic (the real lookups depend on async-loaded icon data).
 */

import type { LoadoutSetup } from '../../types/loadout.types';
import { EQUIP_TYPE, weaponLabelToEquipType } from '../../data/esoEquipmentEnums';

// itemId → controlled ItemInfo. `slot: 'weapon' | 'offhand'` marks slot-specific
// weapons (resolvable); a generic set id (no slot field) must NOT resolve.
jest.mock('../../data/itemIdMap', () => ({
  getItemInfo: (itemId: number) =>
    (
      ({
        // slot-specific weapons in a known set
        201: { name: 'Test Set Sword', setName: 'Test Set', type: 'Gear', slot: 'weapon' },
        202: { name: 'Test Set Greatsword', setName: 'Test Set', type: 'Gear', slot: 'weapon' },
        203: { name: 'Test Set Shield', setName: 'Test Set', type: 'Gear', slot: 'offhand' },
        204: {
          name: 'Test Set Lightning Staff',
          setName: 'Test Set',
          type: 'Gear',
          slot: 'weapon',
        },
        // an armor (head) piece in a known set — exercises the non-weapon path
        301: { name: 'Test Set Head', setName: 'Test Set', type: 'Gear', slot: 'head' },
        // generic set id with no slot field — collides with unrelated weapon icons
        685: { name: "Bloodthorn's Touch Gear", setName: "Bloodthorn's Touch", type: 'Gear' },
      }) as Record<number, unknown>
    )[itemId],
}));

// Weapon-type label per item (what getItemIconUrl-based resolution would yield).
jest.mock('../itemIconResolver', () => ({
  getWeaponTypeLabel: (itemId: number) =>
    (
      ({
        201: 'Sword',
        202: 'Greatsword',
        203: 'Shield',
        204: 'Lightning Staff',
        685: 'Staff', // a label IS derivable, but the slot guard must reject the generic id
      }) as Record<number, string>
    )[itemId] ?? null,
}));

// Any known set name resolves to a positive set id; unknowns resolve to 0/falsy.
jest.mock('@/utils/setNameUtils', () => ({
  findSetIdByName: (name: string | undefined) => (name === 'Test Set' ? 999 : 0),
}));

import { loadoutSetupToWWTransfer } from '../wizardWardrobeTransfer';

function makeSetup(overrides: Partial<LoadoutSetup> = {}): LoadoutSetup {
  return {
    name: 'Weapon Test',
    disabled: false,
    condition: {},
    skills: { 0: {}, 1: {} },
    cp: {},
    food: {},
    gear: {},
    ...overrides,
  };
}

describe('weaponLabelToEquipType', () => {
  it('maps one-handed weapons to ONE_HAND', () => {
    for (const label of ['Sword', 'Axe', 'Mace', 'Dagger']) {
      expect(weaponLabelToEquipType(label)).toBe(EQUIP_TYPE.ONE_HAND);
    }
  });

  it('maps the shield to OFF_HAND', () => {
    expect(weaponLabelToEquipType('Shield')).toBe(EQUIP_TYPE.OFF_HAND);
  });

  it('maps every two-handed weapon (incl. all staves) to TWO_HAND', () => {
    for (const label of [
      'Greatsword',
      'Battle Axe',
      'Maul',
      'Bow',
      'Staff',
      'Inferno Staff',
      'Ice Staff',
      'Lightning Staff',
      'Restoration Staff',
    ]) {
      expect(weaponLabelToEquipType(label)).toBe(EQUIP_TYPE.TWO_HAND);
    }
  });

  it('returns undefined for non-weapon / unknown / missing labels', () => {
    expect(weaponLabelToEquipType('Helmet')).toBeUndefined();
    expect(weaponLabelToEquipType('')).toBeUndefined();
    expect(weaponLabelToEquipType(null)).toBeUndefined();
    expect(weaponLabelToEquipType(undefined)).toBeUndefined();
  });
});

describe('loadoutSetupToWWTransfer — weapon slots', () => {
  it('encodes the weapon equipType derived from the item type (with a valid trait)', () => {
    const result = loadoutSetupToWWTransfer(
      makeSetup({
        gear: {
          4: { id: 201, trait: 'sharpened' }, // main hand → Sword → ONE_HAND, sharpened=7
          5: { id: 203, trait: 'infused' }, // off hand → Shield → OFF_HAND, weapon infused=4
          20: { id: 202, trait: 'precise' }, // backup main → Greatsword → TWO_HAND, precise=3
          21: { id: 204, trait: 'charged' }, // backup off → Lightning Staff → TWO_HAND, charged=2
        },
      }),
    );

    expect(result.data.gear['4']).toEqual([EQUIP_TYPE.ONE_HAND, 999, 7]);
    expect(result.data.gear['5']).toEqual([EQUIP_TYPE.OFF_HAND, 999, 4]);
    expect(result.data.gear['20']).toEqual([EQUIP_TYPE.TWO_HAND, 999, 3]);
    expect(result.data.gear['21']).toEqual([EQUIP_TYPE.TWO_HAND, 999, 2]);
    expect(result.unresolvedSlots).toHaveLength(0);
  });

  it('omits an otherwise-resolvable weapon that has no recorded trait (WW rejects trait 0)', () => {
    const result = loadoutSetupToWWTransfer(makeSetup({ gear: { 4: { id: 201 } } }));
    expect(result.data.gear['4']).toBeUndefined();
    expect(result.unresolvedSlots).toEqual([
      expect.objectContaining({ slot: 4, reason: expect.stringContaining('No trait recorded') }),
    ]);
  });

  it('omits a weapon slot whose item is a generic set id (slot-specificity guard)', () => {
    const result = loadoutSetupToWWTransfer(makeSetup({ gear: { 4: { id: 685 } } }));
    expect(result.data.gear['4']).toBeUndefined();
    expect(result.unresolvedSlots).toEqual([
      expect.objectContaining({ slot: 4, reason: expect.stringContaining('Weapon type') }),
    ]);
  });

  it('omits a weapon slot whose item cannot be identified at all', () => {
    const result = loadoutSetupToWWTransfer(makeSetup({ gear: { 4: { id: '99999999999999' } } }));
    expect(result.data.gear['4']).toBeUndefined();
    expect(result.unresolvedSlots).toEqual([
      expect.objectContaining({
        slot: 4,
        reason: expect.stringContaining('couldn’t be identified'),
      }),
    ]);
  });
});

describe('loadoutSetupToWWTransfer — trait is required (any slot)', () => {
  it('encodes an armor slot when the trait maps to a non-zero ITEM_TRAIT_TYPE', () => {
    const result = loadoutSetupToWWTransfer(
      makeSetup({ gear: { 0: { id: 301, trait: 'divines' } } }),
    );
    expect(result.data.gear['0']).toEqual([EQUIP_TYPE.HEAD, 999, 18]); // armor divines = 18
    expect(result.unresolvedSlots).toHaveLength(0);
  });

  it('omits an otherwise-resolvable armor slot with no trait', () => {
    const result = loadoutSetupToWWTransfer(makeSetup({ gear: { 0: { id: 301 } } }));
    expect(result.data.gear['0']).toBeUndefined();
    expect(result.unresolvedSlots).toEqual([
      expect.objectContaining({ slot: 0, reason: expect.stringContaining('No trait recorded') }),
    ]);
  });

  it('omits a slot whose trait id is unrecognized, naming the trait', () => {
    const result = loadoutSetupToWWTransfer(
      makeSetup({ gear: { 0: { id: 301, trait: 'bogus' } } }),
    );
    expect(result.data.gear['0']).toBeUndefined();
    expect(result.unresolvedSlots).toEqual([
      expect.objectContaining({ slot: 0, reason: expect.stringContaining('bogus') }),
    ]);
  });
});
