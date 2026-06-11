/**
 * Regression test for the icon-data LOAD FAILURE path (adversarial review,
 * round 4). When preloadIconData rejects (chunk/network failure), the weapon
 * picker must surface a recoverable error state — NOT hang forever on
 * "loading…" — and the underlying promise must reset so reopening retries.
 */

import { ThemeProvider, createTheme } from '@mui/material/styles';
import { render, screen, waitFor } from '@testing-library/react';

// Simulate: icon data never becomes ready, and preloadIconData rejects.
jest.mock('@features/loadout-manager/utils/itemIconResolver', () => {
  const actual = jest.requireActual('@features/loadout-manager/utils/itemIconResolver');
  return {
    ...actual,
    isIconDataReady: () => false,
    preloadIconData: () => Promise.reject(new Error('chunk load failed')),
    deriveItemNameForSlot: () => 'Generic Weapon',
  };
});

import { GearPickerDialog } from '../GearPicker';

describe('GearPickerDialog — icon-data load failure', () => {
  it('shows a recoverable error instead of an endless loading state', async () => {
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

    // After the rejected preload settles, the browse list shows an error alert.
    await waitFor(() => {
      expect(screen.getByRole('alert')).toHaveTextContent(/couldn.t load weapon types/i);
    });
    // And no weapon row is directly equippable in the failed state.
    expect(screen.queryByRole('button', { name: /^Equip / })).toBeNull();
  });
});
