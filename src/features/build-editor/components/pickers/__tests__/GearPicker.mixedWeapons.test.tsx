/**
 * Regression tests (Codex round 11):
 *  1. A MIXED weapon group (some types resolved, some not) must NOT disable the
 *     whole set — resolved variants stay selectable; only the unresolved ones
 *     are inert.
 *  2. Weapon search must match the DERIVED type name (Bow, Inferno Staff, …),
 *     not just the generic info.name, so "bow"/"inferno" find their rows.
 */

import { ThemeProvider, createTheme } from '@mui/material/styles';
import { act, fireEvent, render, screen } from '@testing-library/react';

import { GearPickerDialog } from '../GearPicker';

// Keep this regression focused and deterministic. The production map contains
// 119K entries, so loading it here makes a small picker interaction contend
// with unrelated suites and occasionally exceed Jest's 10s test timeout.
// These three entries model the only behavior this test needs: one resolved
// weapon type and unresolved siblings in the same set.
const msIds = [100001, 100002, 100003];

jest.mock('@features/loadout-manager/data/itemIdMap', () => {
  const actual = jest.requireActual('@features/loadout-manager/data/itemIdMap');
  const mockMsItems = [100001, 100002, 100003].map((itemId) => ({
    itemId,
    info: {
      name: "Mother's Sorrow Weapon",
      setName: "Mother's Sorrow",
      type: 'weapon',
      slot: 'weapon' as const,
    },
  }));
  const byId = new Map(mockMsItems.map((item) => [item.itemId, item.info]));
  const getWeaponItems = () => mockMsItems;

  return {
    ...actual,
    getItemsBySlot: (slot: string) => (slot === 'weapon' ? getWeaponItems() : []),
    getAvailableSetsForSlot: (slot: string) =>
      slot === 'weapon' ? [{ setName: "Mother's Sorrow", itemCount: mockMsItems.length }] : [],
    getCanonicalItemsBySlot: (
      slot: string,
      keyFn: (itemId: number, info: (typeof mockMsItems)[number]['info']) => string,
    ) => {
      if (slot !== 'weapon') return [];
      const byKey = new Map<string, (typeof mockMsItems)[number]>();
      for (const item of getWeaponItems()) {
        const key = keyFn(item.itemId, item.info);
        const existing = byKey.get(key);
        if (!existing || item.itemId < existing.itemId) byKey.set(key, item);
      }
      return [...byKey.values()];
    },
    getItemInfo: (itemId: number) => byId.get(itemId),
    isItemDataReady: () => true,
    preloadItemData: () => Promise.resolve(),
    validateItemForSlot: (itemId: number, slot: string) => ({
      valid: slot === 'weapon' && byId.has(itemId),
      info: byId.get(itemId),
    }),
  };
});

jest.mock('@features/loadout-manager/utils/itemIconResolver', () => {
  const actual = jest.requireActual('@features/loadout-manager/utils/itemIconResolver');
  const resolvedId = 100001;
  const isWeapon = (slot: string) => slot === 'weapon' || slot === 'offhand';
  return {
    ...actual,
    isIconDataReady: () => true,
    preloadIconData: () => Promise.resolve(),
    // Only the first Mother's Sorrow weapon resolves; the rest are "stale".
    isWeaponTypeResolved: (itemId: number, slot: string) => {
      if (!isWeapon(slot)) return true;
      return itemId === resolvedId;
    },
    deriveItemNameForSlot: (itemId: number, slot: string) => {
      if (isWeapon(slot) && itemId === resolvedId) return "Mother's Sorrow Bow";
      return actual.deriveItemNameForSlot(itemId, slot);
    },
  };
});

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
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.clearAllTimers();
    jest.useRealTimers();
  });

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
    act(() => {
      jest.advanceTimersByTime(300);
    });
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
    act(() => {
      jest.advanceTimersByTime(300);
    });
    // The resolved "Mother's Sorrow Bow" row appears even though info.name is the
    // generic "<Set> Weapon".
    expect(screen.getByText("Mother's Sorrow Bow")).toBeInTheDocument();
  });
});
