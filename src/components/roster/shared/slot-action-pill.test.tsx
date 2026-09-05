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
const mockDispatch = jest.fn();
const mockAssertSessionCurrent = jest.fn();
const mockAcquireSession = jest.fn();
const mockPutSavedBuildRecord = jest.fn();
jest.mock('../../../store/saved_builds/savedBuildStorage', () => ({
  acquireBuildStorageSessionGeneration: (...args: unknown[]) => mockAcquireSession(...args),
  assertBuildStorageSessionCurrent: (...args: unknown[]) => mockAssertSessionCurrent(...args),
  putSavedBuildRecord: (...args: unknown[]) => mockPutSavedBuildRecord(...args),
}));
jest.mock('notistack', () => ({
  useSnackbar: () => ({ enqueueSnackbar: mockEnqueue }),
}));

jest.mock('react-redux', () => ({
  useDispatch: () => mockDispatch,
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
    mockAcquireSession.mockResolvedValue('session-1');
    mockAssertSessionCurrent.mockImplementation(() => undefined);
    mockPutSavedBuildRecord.mockResolvedValue(undefined);
  });

  it('keeps canonical roster round-trip params in the URL but sends the build via router state', async () => {
    render(
      <SlotActionPill
        buildFactory={buildFactory}
        color="#38bdf8"
        label="DPS 3"
        slotKey="dps:2"
        rosterId="r1"
      />,
    );

    clickEdit('DPS 3');

    await waitFor(() => expect(mockNavigate).toHaveBeenCalled());
    const [to, options] = mockNavigate.mock.calls[0] as [string, Record<string, unknown>];
    expect(to).toBe('/build-editor?slot=dps%3A2&rid=r1&from=roster');
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
        slotKey="tank:0"
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

  it('commits a roster build to the captured storage session before dispatching it', async () => {
    render(<SlotActionPill buildFactory={buildFactory} color="#38bdf8" label="DPS 1" />);

    fireEvent.click(screen.getByRole('button', { name: 'Save DPS 1 to My Builds' }));

    await waitFor(() => expect(mockDispatch).toHaveBeenCalled());
    expect(mockPutSavedBuildRecord).toHaveBeenCalledWith(expect.any(Object), 'session-1');
    expect(mockAssertSessionCurrent).toHaveBeenCalledWith('session-1');
  });
});
