/**
 * Regression test (PR #1400 review): an ICON-data load failure must not block
 * apparel/jewelry browsing — those slots only need the fetched item map.
 * Weapon slots keep their error state (see GearPicker.iconError.test.tsx);
 * apparel proceeds with real set groups and no error alert.
 */

// Populate itemIdMap synchronously with the REAL generated data — must be
// the FIRST import (module-scope reads elsewhere depend on it).
import '@/test/initItemData';

import { ThemeProvider, createTheme } from '@mui/material/styles';
import { render, screen, waitFor } from '@testing-library/react';

// Simulate: icon data never becomes ready, and preloadIconData rejects.
jest.mock('@features/loadout-manager/utils/itemIconResolver', () => {
  const actual = jest.requireActual('@features/loadout-manager/utils/itemIconResolver');
  return {
    ...actual,
    isIconDataReady: () => false,
    preloadIconData: () => Promise.reject(new Error('chunk load failed')),
  };
});

import { GearPickerDialog } from '../GearPicker';

describe('GearPickerDialog — apparel browsing under icon-data failure', () => {
  it('renders real set groups for a head slot with no error alert', async () => {
    render(
      <ThemeProvider theme={createTheme()}>
        <GearPickerDialog
          open
          onClose={() => {}}
          onSelect={() => {}}
          targetSlot="head"
          slotName="Head"
          currentItemId={null}
        />
      </ThemeProvider>,
    );

    // Real apparel sets render from the item map alone.
    await waitFor(() => {
      expect(screen.getAllByText(/Mother's Sorrow/i).length).toBeGreaterThan(0);
    });
    // The icon failure must not surface an error for an icon-independent slot.
    expect(screen.queryByRole('alert')).toBeNull();
  });
});
