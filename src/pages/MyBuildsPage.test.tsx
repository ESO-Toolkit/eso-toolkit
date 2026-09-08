import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import React from 'react';

import type { SavedBuild } from '../store/saved_builds';

// Capture editor navigation without running the real View Transition wrapper.
const mockNavigate = jest.fn();
const mockDispatch = jest.fn();
const mockAssertSessionCurrent = jest.fn();
const mockAcquireSession = jest.fn();
const mockDeleteSavedBuildRecord = jest.fn();
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
  useAppDispatch: () => mockDispatch,
}));

jest.mock('../store/saved_builds/savedBuildStorage', () => ({
  acquireBuildStorageSessionGeneration: (...args: unknown[]) => mockAcquireSession(...args),
  assertBuildStorageSessionCurrent: (...args: unknown[]) => mockAssertSessionCurrent(...args),
  deleteSavedBuildRecord: (...args: unknown[]) => mockDeleteSavedBuildRecord(...args),
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

const savedBuild = (visibility: string): SavedBuild =>
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
  }) as unknown as SavedBuild;

describe('MyBuildsPage edit navigation', () => {
  beforeEach(() => {
    mockEncode.mockResolvedValue('ENCODED_BLOB');
    mockAcquireSession.mockResolvedValue('session-1');
    mockAssertSessionCurrent.mockImplementation(() => undefined);
    mockDeleteSavedBuildRecord.mockResolvedValue(undefined);
    mockUseSelector.mockReturnValue([savedBuild('private')]);
  });

  it('opens the editor with the build in router state — never a ?b= URL blob', async () => {
    render(<MyBuildsPage />);

    fireEvent.click(screen.getByRole('button', { name: /^Edit$/i }));

    await waitFor(() => expect(mockNavigate).toHaveBeenCalled());
    const [to, options] = mockNavigate.mock.calls[0] as [string, Record<string, unknown>];
    expect(to).toBe('/build-editor?id=saved-7');
    expect(to).not.toContain('b=');
    expect(options.state).toEqual({ build: savedBuild('private').build });
    expect(options.vtType).toBe('forward');
    expect(mockEncode).not.toHaveBeenCalled();
  });

  it('keeps editor-only fields intact when reopening a saved build', async () => {
    const buildWithEditorData = savedBuild('private');
    Object.assign(buildWithEditorData.build, {
      addonImportString: 'CSPS_IMPORT',
      trialTags: ['lucent_citadel'],
      guide: { content: '# Rotation', youtubeUrl: '', bannerImageUrl: '' },
      setups: [
        {
          id: 'setup-1',
          name: 'Boss',
          screenshots: ['data:image/png;base64,full-fidelity'],
          statOverrides: { targetResistance: 18200 },
        },
      ],
    });
    mockUseSelector.mockReturnValue([buildWithEditorData]);
    render(<MyBuildsPage />);

    fireEvent.click(screen.getByRole('button', { name: /^Edit$/i }));

    await waitFor(() => expect(mockNavigate).toHaveBeenCalled());
    const options = mockNavigate.mock.calls[0]?.[1] as { state: { build: unknown } };
    expect(options.state.build).toBe(buildWithEditorData.build);
    expect(options.state.build).toEqual(
      expect.objectContaining({ addonImportString: 'CSPS_IMPORT' }),
    );
    expect(mockEncode).not.toHaveBeenCalled();
  });

  it('deletes durably in the captured session before removing the live card', async () => {
    render(<MyBuildsPage />);

    fireEvent.click(screen.getByRole('button', { name: /^Delete$/i }));
    fireEvent.click(within(screen.getByRole('dialog')).getByRole('button', { name: /^Delete$/i }));

    await waitFor(() => expect(mockDispatch).toHaveBeenCalled());
    expect(mockDeleteSavedBuildRecord).toHaveBeenCalledWith('saved-7', 'session-1');
    expect(mockAssertSessionCurrent).toHaveBeenCalledWith('session-1');
  });
});
