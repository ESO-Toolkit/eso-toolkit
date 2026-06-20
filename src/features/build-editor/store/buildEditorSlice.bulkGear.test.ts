/**
 * Tests for bulkSetGear — specifically that bulk weight edits honour sets that
 * are locked to a single in-game armor weight (mythics / overland drops), which
 * the single-slot UI shows as read-only. Trait/enchant still apply to any piece.
 *
 * The item/lock data is mocked so the test is deterministic: item 100 belongs to
 * a locked set, item 200 to a free (all-weight) set.
 */

jest.mock('../../loadout-manager/data/itemIdMap', () => ({
  getItemInfo: (id: number) => ({ setName: id === 100 ? 'Locked Set' : 'Free Set' }),
}));
jest.mock('../data/setArmorWeights', () => ({
  getLockedArmorWeight: (setName?: string | null) => (setName === 'Locked Set' ? 'medium' : null),
}));

import reducer, { bulkSetGear, setGearSlot } from './buildEditorSlice';
import type { BuildEditorState } from './buildEditorSlice';

const fresh = (): BuildEditorState => reducer(undefined, { type: '@@test/init' });

describe('buildEditorSlice — bulkSetGear locked weight', () => {
  it('skips weight on locked apparel but applies it to free apparel', () => {
    let s = fresh();
    s = reducer(s, setGearSlot({ slot: 0, itemId: 100 })); // Head — locked set
    s = reducer(s, setGearSlot({ slot: 3, itemId: 200 })); // Shoulders — free set

    s = reducer(s, bulkSetGear({ slots: [0, 3], weight: 'light' }));

    expect(s.build.setups[0].gear[0].weight).toBeUndefined(); // locked → unchanged
    expect(s.build.setups[0].gear[3].weight).toBe('light'); // free → applied
  });

  it('still applies trait/enchant to a locked piece (only weight is gated)', () => {
    let s = fresh();
    s = reducer(s, setGearSlot({ slot: 0, itemId: 100 })); // locked set

    s = reducer(
      s,
      bulkSetGear({ slots: [0], trait: 'reinforced', enchant: 'magicka', weight: 'heavy' }),
    );

    expect(s.build.setups[0].gear[0].trait).toBe('reinforced');
    expect(s.build.setups[0].gear[0].enchant).toBe('magicka');
    expect(s.build.setups[0].gear[0].weight).toBeUndefined(); // weight still skipped
  });
});
