/**
 * Regression tests (Codex round 11):
 *  1. A MIXED weapon group (some types resolved, some not) must NOT disable the
 *     whole set — resolved variants stay selectable; only the unresolved ones
 *     are inert.
 *  2. Weapon search must match the DERIVED type name (Bow, Inferno Staff, …),
 *     not just the generic info.name, so "bow"/"inferno" find their rows.
 */

import { ThemeProvider, createTheme } from '@mui/material/styles';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';

import { getItemsBySlot } from '../../../../loadout-manager/data/itemIdMap';

// Pick a real weapon set and split its items: the first resolves to a specific
// type, the rest are treated as unresolved (stale data). The mocked resolver
// below returns a specific name for that one id so search-by-type works.
const msIds: number[] = (() => {
  try {
    return getItemsBySlot('weapon')
      .filter(({ info }: { info: { setName: string } }) => info.setName === "Mother's Sorrow")
      .map(({ itemId }: { itemId: number }) => itemId)
      .sort((a, b) => a - b);
  } catch {
    return [];
  }
})();
const RESOLVED_ID = msIds[0];

jest.mock('@features/loadout-manager/utils/itemIconResolver', () => {
  const actual = jest.requireActual('@features/loadout-manager/utils/itemIconResolver');
  const isWeapon = (slot: string) => slot === 'weapon' || slot === 'offhand';
  return {
    ...actual,
    isIconDataReady: () => true,
    preloadIconData: () => Promise.resolve(),
    // Only the first Mother's Sorrow weapon resolves; the rest are "stale".
    isWeaponTypeResolved: (itemId: number, slot: string) => {
      if (!isWeapon(slot)) return true;
      return itemId === RESOLVED_ID;
    },
    deriveItemNameForSlot: (itemId: number, slot: string) => {
      if (isWeapon(slot) && itemId === RESOLVED_ID) return "Mother's Sorrow Bow";
      return actual.deriveItemNameForSlot(itemId, slot);
    },
  };
});

import { GearPickerDialog } from '../GearPicker';

const renderWeaponPicker = () =>
  render(
    <ThemeProvider theme={createTheme()}>
      <GearPickerDialog
        open
        onClose={() => {}}
        onSelect={() => {}}
        targetSlot="weapon"
        slotName="Main-Hand"
        currentItemId={null}
      />
    </ThemeProvider>,
  );

describe('GearPickerDialog — mixed weapon resolution', () => {
  it('has Mother’s Sorrow weapon ids available for the fixture', () => {
    expect(msIds.length).toBeGreaterThan(1);
  });

  it('keeps a resolved weapon selectable even when siblings are unresolved', async () => {
    renderWeaponPicker();
    // The Mother's Sorrow set row is a toggle (mixed group → expandable, not
    // fully disabled). Expand it.
    const setRow = await screen.findByRole('button', { name: /Choose a Mother's Sorrow weapon/i });
    expect(setRow).not.toBeDisabled();
    fireEvent.click(setRow);
    // The resolved variant is selectable…
    const resolved = await screen.findByRole('button', { name: /Equip Mother's Sorrow Bow/i });
    expect(resolved).not.toBeDisabled();
    // …and at least one unresolved variant is inert ("type loading").
    const loading = screen.getAllByRole('button', { name: /weapon — type loading/i });
    expect(loading.length).toBeGreaterThan(0);
    loading.forEach((row) => expect(row).toBeDisabled());
  });

  it('finds a weapon by its derived type name in search', async () => {
    renderWeaponPicker();
    const input = screen.getByPlaceholderText(/search .* gear/i);
    fireEvent.change(input, { target: { value: 'bow' } });
    // The resolved "Mother's Sorrow Bow" row appears even though info.name is the
    // generic "<Set> Weapon".
    await waitFor(() => {
      expect(screen.getByText("Mother's Sorrow Bow")).toBeInTheDocument();
    });
  });
});
