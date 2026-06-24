import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import React from 'react';

// Capture editor navigation without running the real View Transition wrapper.
const mockNavigate = jest.fn();
jest.mock('../hooks/useViewTransitionNavigate', () => ({
  useViewTransitionNavigate: () => mockNavigate,
}));

// Control the encoded payload deterministically.
const mockEncode = jest.fn();
jest.mock('../utils/buildEncoding', () => ({
  encodeBuildToURL: (...args: unknown[]) => mockEncode(...args),
}));

jest.mock('../features/auth/AuthContext', () => ({
  useAuth: () => ({ accessToken: null }),
}));

jest.mock('../store/useAppDispatch', () => ({
  useAppDispatch: () => jest.fn(),
}));

// The publish dialog is a heavy subtree never exercised by the edit-nav tests.
jest.mock('../features/build-hub/components/PublishBuildDialog', () => ({
  PublishBuildDialog: () => null,
}));

const mockUseSelector = jest.fn();
jest.mock('react-redux', () => ({
  useSelector: (selector: unknown) => mockUseSelector(selector),
}));

import { MyBuildsPage } from './MyBuildsPage';

const savedBuild = (visibility: string) =>
  ({
    id: 'saved-7',
    savedAt: '2024-01-01T00:00:00.000Z',
    build: {
      id: 'b7',
      name: 'My Build',
      esoClass: 'sorcerer',
      role: 'magicka-dps',
      gameMode: 'pve',
      shortDescription: '',
      settings: { visibility },
    },
  }) as never;

describe('MyBuildsPage edit navigation', () => {
  beforeEach(() => {
    mockEncode.mockResolvedValue('ENCODED_BLOB');
    mockUseSelector.mockReturnValue([savedBuild('private')]);
  });

  it('opens the editor with the build in router state — never a ?b= URL blob', async () => {
    render(<MyBuildsPage />);

    fireEvent.click(screen.getByRole('button', { name: /^Edit$/i }));

    await waitFor(() => expect(mockNavigate).toHaveBeenCalled());
    const [to, options] = mockNavigate.mock.calls[0] as [string, Record<string, unknown>];
    expect(to).toBe('/build-editor?id=saved-7');
    expect(to).not.toContain('b=');
    expect(options.state).toEqual({ buildData: 'ENCODED_BLOB' });
    expect(options.vtType).toBe('forward');
  });

  it('fails closed: no navigation when encoding yields an empty payload', async () => {
    mockEncode.mockResolvedValue('');
    render(<MyBuildsPage />);

    fireEvent.click(screen.getByRole('button', { name: /^Edit$/i }));

    await waitFor(() => expect(mockEncode).toHaveBeenCalled());
    expect(mockNavigate).not.toHaveBeenCalled();
  });
});
