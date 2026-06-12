/**
 * Regression test (Codex round 8, HIGH): even when icon data is globally READY,
 * individual weapon items can resolve to a generic "<Set> Weapon" name if the
 * local icon/weaponType data is stale or missing for them. Those rows must stay
 * non-selectable (browse) and be excluded from search — otherwise a user could
 * equip/export an indistinguishable, wrong weapon variant.
 */

import { ThemeProvider, createTheme } from '@mui/material/styles';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';

// icon data READY, but every weapon's type is UNRESOLVED (stale/missing data —
// e.g. a staff with no element data → generic "Staff"). The picker must treat
// these as ambiguous via isWeaponTypeResolved, independent of the display name.
jest.mock('@features/loadout-manager/utils/itemIconResolver', () => {
  const actual = jest.requireActual('@features/loadout-manager/utils/itemIconResolver');
  const isWeapon = (slot: string) => slot === 'weapon' || slot === 'offhand';
  return {
    ...actual,
    isIconDataReady: () => true,
    preloadIconData: () => Promise.resolve(),
    // Weapons can't be resolved (apparel is unaffected).
    isWeaponTypeResolved: (_itemId: number, slot: string) => !isWeapon(slot),
    deriveItemNameForSlot: (itemId: number, slot: string) => {
      if (isWeapon(slot)) return 'Stale Set Weapon';
      return actual.deriveItemNameForSlot(itemId, slot);
    },
  };
});

import { GearPickerDialog } from '../GearPicker';

const renderPicker = (slot: 'weapon' | 'chest') =>
  render(
    <ThemeProvider theme={createTheme()}>
      <GearPickerDialog
        open
        onClose={() => {}}
        onSelect={() => {}}
        targetSlot={slot}
        slotName={slot === 'weapon' ? 'Main-Hand' : 'Chest'}
        currentItemId={null}
      />
    </ThemeProvider>,
  );

describe('GearPickerDialog — stale icon data while globally ready', () => {
  it('keeps unresolved (generic-name) weapon rows non-selectable in browse', () => {
    renderPicker('weapon');
    const loadingRows = screen.getAllByRole('button', { name: /loading weapon types/i });
    expect(loadingRows.length).toBeGreaterThan(0);
    loadingRows.forEach((row) => expect(row).toBeDisabled());
    expect(screen.queryByRole('button', { name: /^Equip / })).toBeNull();
  });

  it('excludes unresolved weapon items from search results', async () => {
    renderPicker('weapon');
    const input = screen.getByPlaceholderText(/search .* gear/i);
    fireEvent.change(input, { target: { value: 'set' } });
    // Generic-named weapon items are filtered out → "No gear found", not a list
    // of indistinguishable "Stale Set Weapon" rows.
    await waitFor(() => expect(screen.getByText(/no gear found/i)).toBeInTheDocument());
    expect(screen.queryByText('Stale Set Weapon')).toBeNull();
  });

  it('apparel rows stay selectable (icon-independent names)', () => {
    renderPicker('chest');
    expect(screen.getAllByRole('button', { name: /^Equip / }).length).toBeGreaterThan(0);
  });
});
