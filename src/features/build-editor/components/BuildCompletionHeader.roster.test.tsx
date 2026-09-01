import { fireEvent, render, screen } from '@testing-library/react';
import React from 'react';

import { createDefaultRoster } from '@/types/roster';

const mockDispatch = jest.fn();
const mockNavigate = jest.fn();
const mockEnqueue = jest.fn();
let mockSearchParams = new URLSearchParams();
let mockState: unknown;

jest.mock('react-redux', () => ({
  useDispatch: () => mockDispatch,
  useSelector: (selector: (state: unknown) => unknown) => selector(mockState),
}));

jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useNavigate: () => mockNavigate,
  useSearchParams: () => [mockSearchParams],
}));

jest.mock('notistack', () => ({
  useSnackbar: () => ({ enqueueSnackbar: mockEnqueue }),
}));

jest.mock('@/features/auth/AuthContext', () => ({
  useAuth: () => ({ isLoggedIn: true, accessToken: 'test-token' }),
}));

jest.mock('@/utils/envUtils');

jest.mock('../hooks/useBuildCompleteness', () => ({
  useBuildCompleteness: () => 50,
}));

jest.mock('@/features/build-hub/components/PublishBuildDialog', () => ({
  PublishBuildDialog: () => null,
}));

jest.mock('./AddToRosterDialog', () => ({ AddToRosterDialog: () => null }));
jest.mock('./ImportBuildImagePanel', () => ({ ImportBuildImagePanel: () => null }));
jest.mock('./ImportBuildLinkPanel', () => ({ ImportBuildLinkPanel: () => null }));
jest.mock('./ImportBuildTextPanel', () => ({ ImportBuildTextPanel: () => null }));

import buildEditorReducer from '../store/buildEditorSlice';

import { BuildCompletionHeader } from './BuildCompletionHeader';

const setRosterContext = (slotKey: string): void => {
  mockSearchParams = new URLSearchParams({ from: 'roster', slot: slotKey, rid: 'roster-1' });
};

const makeState = (): unknown => ({
  buildEditor: buildEditorReducer(undefined, { type: 'test/init' }),
  savedBuilds: { builds: [] },
  savedRosters: {
    rosters: [
      {
        id: 'roster-1',
        savedAt: '2026-01-01T00:00:00.000Z',
        roster: { ...createDefaultRoster(), rosterName: 'Core Team' },
      },
    ],
  },
});

const applyToRoster = (): void => {
  fireEvent.click(screen.getByRole('button', { name: 'Apply changes to roster slot' }));
};

describe('BuildCompletionHeader roster application', () => {
  beforeEach(() => {
    mockState = makeState();
  });

  it('applies a valid canonical key and reports success only after dispatch', () => {
    setRosterContext('dps:2');
    render(<BuildCompletionHeader />);

    expect(screen.getByText('Apply to DPS 3')).toBeInTheDocument();
    applyToRoster();

    expect(mockDispatch).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'savedRosters/attachBuildToSlot',
        payload: expect.objectContaining({ rosterId: 'roster-1', slotKey: 'dps:2' }),
      }),
    );
    expect(mockEnqueue).toHaveBeenCalledWith(
      'Changes applied to DPS 3 in "Core Team"',
      expect.objectContaining({ variant: 'success' }),
    );
    expect(mockNavigate).toHaveBeenCalledWith('/roster-builder');
  });

  it('rejects a legacy key without dispatching or reporting success', () => {
    setRosterContext('dps3');
    render(<BuildCompletionHeader />);

    applyToRoster();

    expect(mockDispatch).not.toHaveBeenCalled();
    expect(mockEnqueue).toHaveBeenCalledWith(
      'Roster slot is no longer available — changes could not be applied.',
      { variant: 'error' },
    );
    expect(mockEnqueue).not.toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({ variant: 'success' }),
    );
    expect(mockNavigate).not.toHaveBeenCalled();
  });

  it('rejects a canonical key whose slot no longer exists', () => {
    setRosterContext('healer:9');
    render(<BuildCompletionHeader />);

    applyToRoster();

    expect(mockDispatch).not.toHaveBeenCalled();
    expect(mockEnqueue).toHaveBeenCalledWith(
      'Roster slot is no longer available — changes could not be applied.',
      { variant: 'error' },
    );
    expect(mockEnqueue).not.toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({ variant: 'success' }),
    );
    expect(mockNavigate).not.toHaveBeenCalled();
  });
});
