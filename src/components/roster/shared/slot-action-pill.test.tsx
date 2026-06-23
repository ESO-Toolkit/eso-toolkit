import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import React from 'react';

import type { Build } from '../../../features/build-editor/types/build.types';

// Capture roster→editor navigation without a real router.
const mockNavigate = jest.fn();
jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useNavigate: () => mockNavigate,
}));

// Control the encoded payload deterministically.
const mockEncode = jest.fn();
jest.mock('../../../utils/buildEncoding', () => ({
  encodeBuildToURL: (...args: unknown[]) => mockEncode(...args),
}));

const mockEnqueue = jest.fn();
jest.mock('notistack', () => ({
  useSnackbar: () => ({ enqueueSnackbar: mockEnqueue }),
}));

jest.mock('react-redux', () => ({
  useDispatch: () => jest.fn(),
}));

import { SlotActionPill } from './slot-action-pill';

const buildFactory = (): Build => ({ name: 'Slot Build' }) as unknown as Build;

const clickEdit = (label: string) =>
  fireEvent.click(
    screen.getByRole('button', { name: new RegExp(`Edit ${label} in Build Editor`, 'i') }),
  );

describe('SlotActionPill roster → editor navigation', () => {
  beforeEach(() => {
    // resetMocks (jest.config) wipes implementations each test — re-establish.
    mockEncode.mockResolvedValue('ENCODED_BLOB');
  });

  it('keeps roster round-trip params in the URL but sends the build via router state (no ?b= blob)', async () => {
    render(
      <SlotActionPill
        buildFactory={buildFactory}
        color="#38bdf8"
        label="DPS 3"
        slotKey="dps3"
        rosterId="r1"
      />,
    );

    clickEdit('DPS 3');

    await waitFor(() => expect(mockNavigate).toHaveBeenCalled());
    const [to, options] = mockNavigate.mock.calls[0] as [string, Record<string, unknown>];
    expect(to).toBe('/build-editor?slot=dps3&rid=r1&from=roster');
    expect(to).not.toContain('b=');
    expect(options.state).toEqual({ buildData: 'ENCODED_BLOB' });
  });

  it('navigates to a bare /build-editor when there is no slot/roster context', async () => {
    render(<SlotActionPill buildFactory={buildFactory} color="#38bdf8" label="DPS 1" />);

    clickEdit('DPS 1');

    await waitFor(() => expect(mockNavigate).toHaveBeenCalled());
    const [to, options] = mockNavigate.mock.calls[0] as [string, Record<string, unknown>];
    expect(to).toBe('/build-editor');
    expect(to).not.toContain('b=');
    expect(options.state).toEqual({ buildData: 'ENCODED_BLOB' });
  });

  it('fails closed: no navigation when encoding yields an empty payload; shows an error', async () => {
    mockEncode.mockResolvedValue('');
    render(
      <SlotActionPill
        buildFactory={buildFactory}
        color="#38bdf8"
        label="Tank 1"
        slotKey="tank1"
        rosterId="r1"
      />,
    );

    clickEdit('Tank 1');

    await waitFor(() => expect(mockEncode).toHaveBeenCalled());
    expect(mockNavigate).not.toHaveBeenCalled();
    expect(mockEnqueue).toHaveBeenCalledWith(
      'Could not encode build — please try again.',
      expect.objectContaining({ variant: 'error' }),
    );
  });
});
