import { ThemeProvider, createTheme } from '@mui/material/styles';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';

jest.mock('@features/loadout-manager/data/itemIdMap', () => {
  const items = {
    101: { name: 'Training Set Weapon', setName: 'Training Set', type: 'Gear', slot: 'weapon' },
    102: { name: 'Training Set Weapon', setName: 'Training Set', type: 'Gear', slot: 'weapon' },
    103: { name: 'Training Set Off-Hand', setName: 'Training Set', type: 'Gear', slot: 'offhand' },
  };
  type MockItem = (typeof items)[keyof typeof items];
  type MockSlotItem = { itemId: number; info: MockItem };
  type MockSetSummary = { setName: string; itemCount: number };
  type MockValidationResult = { valid: boolean; info?: MockItem };
  type MockKeyFn = (itemId: number, info: MockItem) => string;
  const getItemInfo = (itemId: number): MockItem | undefined => items[itemId as keyof typeof items];
  const getItemsBySlot = (slot: string): MockSlotItem[] =>
    Object.entries(items)
      .filter(([, info]) => info.slot === slot)
      .map(([itemId, info]) => ({ itemId: Number(itemId), info }));
  const canonicalize = (
    entries: MockSlotItem[],
    keyFn: MockKeyFn = (_itemId, info) => info.setName,
  ): MockSlotItem[] => {
    const byKey = new Map<string, MockSlotItem>();
    for (const entry of entries) {
      const key = keyFn(entry.itemId, entry.info);
      const existing = byKey.get(key);
      if (!existing || entry.itemId < existing.itemId) byKey.set(key, entry);
    }
    return Array.from(byKey.values());
  };

  return {
    getAvailableSetsForSlot: (slot: string): MockSetSummary[] =>
      Array.from(new Set(getItemsBySlot(slot).map(({ info }) => info.setName))).map((setName) => ({
        setName,
        itemCount: getItemsBySlot(slot).filter(({ info }) => info.setName === setName).length,
      })),
    getCanonicalItemsBySlot: (slot: string, keyFn?: MockKeyFn): MockSlotItem[] =>
      canonicalize(getItemsBySlot(slot), keyFn),
    getItemInfo,
    getItemsBySlot,
    validateItemForSlot: (itemId: number, slot: string): MockValidationResult => {
      const info = getItemInfo(itemId);
      return info?.slot === slot ? { valid: true, info } : { valid: false, info };
    },
  };
});

jest.mock('@features/loadout-manager/utils/itemIconResolver', () => ({
  deriveItemNameForSlot: (itemId: number): string => {
    if (itemId === 101) return 'Training Set Sword';
    if (itemId === 102) return 'Training Set Bow';
    if (itemId === 103) return 'Training Set Shield';
    return `Item #${itemId}`;
  },
  isIconDataReady: (): boolean => true,
  isTwoHandedWeapon: (itemId: number): boolean => itemId === 102,
  isWeaponTypeResolved: (): boolean => true,
  preloadIconData: (): Promise<void> => Promise.resolve(),
}));

import { GearPickerDialog } from '../GearPicker';

const renderOffhandPicker = (onSelect: jest.Mock = jest.fn()): jest.Mock => {
  render(
    <ThemeProvider theme={createTheme()}>
      <GearPickerDialog
        open
        onClose={() => {}}
        onSelect={onSelect}
        targetSlot="offhand"
        slotName="Off-Hand"
        currentItemId={null}
      />
    </ThemeProvider>,
  );
  return onSelect;
};

describe('GearPickerDialog - off-hand dual wield support', () => {
  it('allows one-handed weapons in the off-hand picker', async () => {
    const onSelect = renderOffhandPicker();

    fireEvent.change(screen.getByPlaceholderText(/search off-hand gear/i), {
      target: { value: 'Training Set Sword' },
    });

    const sword = await screen.findByText('Training Set Sword');
    fireEvent.click(sword.closest('button')!);

    expect(onSelect).toHaveBeenCalledWith(101);
  });

  it('does not offer two-handed weapons as off-hand choices', async () => {
    renderOffhandPicker();

    fireEvent.change(screen.getByPlaceholderText(/search off-hand gear/i), {
      target: { value: 'Training Set Bow' },
    });

    await waitFor(
      () => {
        expect(screen.queryByText(/loading weapon types/i)).not.toBeInTheDocument();
      },
      { timeout: 5000 },
    );

    expect(screen.queryByText('Training Set Bow')).not.toBeInTheDocument();
  });
});
