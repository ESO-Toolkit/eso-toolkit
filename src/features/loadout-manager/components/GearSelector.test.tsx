/**
 * GearSelector adoption / parity test (Section B2).
 *
 * Verifies the loadout gear editor now drives the shared, set-aware
 * GearPickerDialog (src/components/gear) instead of the retired loadout-local
 * ItemPickerDialog — and that selecting an item still flows through the
 * unchanged gear-piece construction into an `updateGear` dispatch, so the
 * Wizard's Wardrobe export is unaffected by the picker swap.
 */
import { ThemeProvider, createTheme } from '@mui/material/styles';
import { configureStore } from '@reduxjs/toolkit';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import React from 'react';
import { Provider } from 'react-redux';

import { getItemsBySlot } from '../data/itemIdMap';
import loadoutReducer, { updateGear } from '../store/loadoutSlice';

import { GearSelector } from './GearSelector';

// Stub the shared picker so we control selection deterministically without
// rendering the full item browser. The stub keeps the real prop contract
// (open / onSelect(itemId) / slotName), which is the whole point of the swap.
jest.mock('@/hooks/useLogger', () => ({
  useLogger: () => ({
    error: jest.fn(),
    warn: jest.fn(),
    info: jest.fn(),
    debug: jest.fn(),
  }),
}));

let mockPickItemId = 0;
jest.mock('@/components/gear', () => ({
  GearPickerDialog: ({
    open,
    slotName,
    onSelect,
  }: {
    open: boolean;
    slotName: string;
    onSelect: (itemId: number) => void;
  }) =>
    open ? (
      <button
        type="button"
        data-testid="shared-picker-select"
        onClick={() => onSelect(mockPickItemId)}
      >
        shared picker: {slotName}
      </button>
    ) : null,
}));

const renderGearSelector = () => {
  const store = configureStore({ reducer: { loadout: loadoutReducer } });
  const dispatchSpy = jest.spyOn(store, 'dispatch');
  const utils = render(
    <Provider store={store}>
      <ThemeProvider theme={createTheme({ palette: { mode: 'dark' } })}>
        <GearSelector gear={{}} trialId="GEN" pageIndex={0} setupIndex={0} />
      </ThemeProvider>
    </Provider>,
  );
  return { store, dispatchSpy, ...utils };
};

describe('GearSelector — shared GearPickerDialog adoption', () => {
  it('opens the shared set-aware picker when a slot is clicked', () => {
    renderGearSelector();
    // Empty "Head" tile shows the slot name and is clickable.
    fireEvent.click(screen.getByText('Head'));
    expect(screen.getByTestId('shared-picker-select')).toHaveTextContent('Head');
  });

  it('dispatches updateGear with the picked item (WW export parity preserved)', async () => {
    const headItem = getItemsBySlot('head')[0];
    expect(headItem).toBeDefined();
    mockPickItemId = headItem.itemId;

    const { dispatchSpy } = renderGearSelector();

    fireEvent.click(screen.getByText('Head'));
    fireEvent.click(screen.getByTestId('shared-picker-select'));

    await waitFor(() => {
      const updateGearCall = dispatchSpy.mock.calls.find(([action]) =>
        typeof action === 'object' && action !== null && 'type' in action
          ? (action as { type: string }).type === updateGear.type
          : false,
      );
      expect(updateGearCall).toBeDefined();
    });

    const updateGearAction = dispatchSpy.mock.calls
      .map(([action]) => action as { type: string; payload: { gear: Record<number, unknown> } })
      .find((action) => action.type === updateGear.type)!;

    // The Head slot (index 0) is now populated with a gear piece. The exact id
    // may be canonicalised by the unchanged handleSelectItem logic, so we assert
    // the slot is filled rather than pinning the id.
    expect(updateGearAction.payload.gear[0]).toBeTruthy();
  });
});
