import { getItemInfo, getSetItemsBySlot } from './itemIdMap';
import type { SlotType } from './slotTypes';

const CRAFTED_SETS = [
  "Order's Wrath",
  'Clever Alchemist',
  'Heartland Conqueror',
  'Tide-Born Wildstalker',
  "Druid's Braid",
  'Wretched Vitality',
] as const;

const SLOT_TYPES: SlotType[] = [
  'head',
  'chest',
  'shoulders',
  'hand',
  'waist',
  'legs',
  'feet',
  'neck',
  'ring',
  'weapon',
  'offhand',
];

describe('crafted set item slot lookup', () => {
  it('resolves collection-backed crafted set items by slot', () => {
    for (const setName of CRAFTED_SETS) {
      for (const slot of SLOT_TYPES) {
        const itemIds = getSetItemsBySlot(setName, slot);

        expect(itemIds.length).toBeGreaterThan(0);
        expect(getItemInfo(itemIds[0])).toMatchObject({ setName, slot });
      }
    }
  });
});
