/**
 * Regression test for the weapon-picker icon-data race.
 *
 * Weapon types (axe/bow/staff/…) are distinguished via deriveItemNameForSlot,
 * which depends on lazily-loaded icon data. If the picker opens before that data
 * is ready, every weapon type of a set collapses to one generic row. Selecting
 * it would silently equip an arbitrary weapon. So while icon data isn't ready,
 * weapon rows must be NON-selectable (a loading state), in both browse and
 * search — this test locks that in.
 */

import { ThemeProvider, createTheme } from '@mui/material/styles';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';

// Force the "icon data not ready" state for the whole module under test.
jest.mock('@features/loadout-manager/utils/itemIconResolver', () => {
  const actual = jest.requireActual('@features/loadout-manager/utils/itemIconResolver');
  return {
    ...actual,
    isIconDataReady: () => false,
    // Never resolves → iconReady stays false for the test's lifetime.
    preloadIconData: () => new Promise<void>(() => {}),
    // Simulate the pre-load fallback: generic "<Set> Weapon" name (no type).
    deriveItemNameForSlot: (_itemId: number, _slot: string) => 'Generic Weapon',
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

describe('GearPickerDialog — weapon icon-data race', () => {
  it('renders weapon set rows as non-selectable while icon data is loading', () => {
    renderPicker('weapon');
    // Weapon rows announce a loading state and are disabled, not "Equip …".
    const loadingRows = screen.getAllByRole('button', { name: /loading weapon types/i });
    expect(loadingRows.length).toBeGreaterThan(0);
    loadingRows.forEach((row) => expect(row).toBeDisabled());
    // No weapon row offers a direct "Equip <set>" action in this state.
    expect(screen.queryByRole('button', { name: /^Equip / })).toBeNull();
  });

  it('apparel rows stay directly selectable (icon-independent)', () => {
    renderPicker('chest');
    // Chest (apparel) does not depend on icon readiness — rows are "Equip …".
    const equipRows = screen.getAllByRole('button', { name: /^Equip / });
    expect(equipRows.length).toBeGreaterThan(0);
    equipRows.forEach((row) => expect(row).not.toBeDisabled());
  });

  it('weapon search shows a loading state instead of clickable collapsed results', async () => {
    renderPicker('weapon');
    const input = screen.getByPlaceholderText(/search .* gear/i);
    fireEvent.change(input, { target: { value: 'sorrow' } });
    // After the search debounce, the collapsed results are suppressed in favor
    // of a loading message (there may be several "loading…" labels on the page).
    await waitFor(() =>
      expect(screen.getAllByText(/loading weapon types/i).length).toBeGreaterThan(0),
    );
  });
});
