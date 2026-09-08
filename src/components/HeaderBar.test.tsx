import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import React from 'react';
import { MemoryRouter } from 'react-router-dom';
import '@testing-library/jest-dom';

import { useAuth } from '../features/auth/AuthContext';

import { HeaderBar } from './HeaderBar';

const mockNavigate = jest.fn();
const mockDispatch = jest.fn();
const mockBeginBuildStorageCleanup = jest.fn();
const mockClearBuildStorage = jest.fn();
const mockClearStoredTokens = jest.fn();
const mockEnqueueSnackbar = jest.fn();
const mockPurge = jest.fn();

jest.mock('notistack', () => ({
  useSnackbar: () => ({ enqueueSnackbar: mockEnqueueSnackbar }),
}));

jest.mock('../store/useAppDispatch', () => ({
  useAppDispatch: () => mockDispatch,
}));

jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useNavigate: () => mockNavigate,
}));

jest.mock('../features/auth/AuthContext', () => ({
  useAuth: jest.fn(),
}));

jest.mock('../features/auth/auth', () => ({
  LOCAL_STORAGE_ACCESS_TOKEN_KEY: 'eso-access-token',
  clearStoredTokens: () => mockClearStoredTokens(),
  setFallbackDestination: jest.fn(),
  startPKCEAuth: jest.fn(),
}));

jest.mock('../store/storeWithHistory', () => ({
  persistor: { purge: () => mockPurge() },
}));

jest.mock('../store/saved_builds/savedBuildStorage', () => ({
  beginBuildStorageCleanup: () => mockBeginBuildStorageCleanup(),
  clearBuildStorage: () => mockClearBuildStorage(),
}));

jest.mock('../utils/errorTracking', () => ({
  clearUserContext: jest.fn(),
}));

jest.mock('../utils/hubRoutePreload', () => ({
  preloadHubRoutes: jest.fn(),
}));

jest.mock('./ThemeToggle', () => ({
  ThemeToggle: () => null,
}));

jest.mock('./PerfTierToggle', () => ({
  PerfTierToggle: () => null,
}));

jest.mock('../hooks/usePersistentDarkMode', () => ({
  usePersistentDarkMode: () => ({
    darkMode: false,
    toggleDarkMode: jest.fn(),
  }),
}));

jest.mock('../hooks/useCurrentUserAvatar', () => ({
  useCurrentUserAvatar: () => ({
    avatarUrl: null,
    loading: false,
  }),
}));

jest.mock('../hooks/useViewTransitionNavigate', () => ({
  useViewTransitionNavigate: () => mockNavigate,
}));

const mockUseAuth = useAuth as jest.MockedFunction<typeof useAuth>;

describe('HeaderBar', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockPurge.mockResolvedValue(undefined);
    mockClearBuildStorage.mockResolvedValue(undefined);
    mockUseAuth.mockReturnValue({
      accessToken: '',
      isLoggedIn: false,
      isBanned: false,
      banReason: null,
      currentUser: null,
      userLoading: false,
      userError: null,
      setAccessToken: jest.fn(),
      refetchUser: jest.fn(),
      rebindAccessToken: jest.fn(),
    } as ReturnType<typeof useAuth>);
  });

  it('renders without crashing', () => {
    render(
      <MemoryRouter>
        <HeaderBar />
      </MemoryRouter>,
    );

    // Check that the header bar is rendered with Tools button
    const toolsButton = screen.getByRole('button', { name: /tools/i });
    expect(toolsButton).toBeInTheDocument();
  });

  it('fences and clears build data before completing logout navigation', async () => {
    let finishDurableCleanup!: () => void;
    mockClearBuildStorage.mockReturnValue(
      new Promise<void>((resolve) => {
        finishDurableCleanup = resolve;
      }),
    );
    const rebindAccessToken = jest.fn();
    mockUseAuth.mockReturnValue({
      accessToken: 'token',
      isLoggedIn: true,
      isBanned: false,
      banReason: null,
      currentUser: { id: 1, name: 'Test User' },
      userLoading: false,
      userError: null,
      setAccessToken: jest.fn(),
      refetchUser: jest.fn(),
      rebindAccessToken,
    } as ReturnType<typeof useAuth>);

    render(
      <MemoryRouter>
        <HeaderBar />
      </MemoryRouter>,
    );

    fireEvent.click(screen.getByRole('button', { name: 'Profile: Test User' }));
    fireEvent.click(await screen.findByText('Sign out'));

    expect(mockBeginBuildStorageCleanup).toHaveBeenCalledTimes(1);
    expect(mockClearStoredTokens).toHaveBeenCalledTimes(1);
    expect(rebindAccessToken).toHaveBeenCalledTimes(1);
    expect(mockDispatch).toHaveBeenCalledWith(
      expect.objectContaining({ type: 'savedBuilds/clearSavedBuilds' }),
    );
    expect(mockDispatch).toHaveBeenCalledWith(
      expect.objectContaining({ type: 'buildEditor/resetBuild' }),
    );
    expect(mockNavigate).not.toHaveBeenCalled();

    await act(async () => {
      finishDurableCleanup();
    });

    await waitFor(() => expect(mockNavigate).toHaveBeenCalledWith('/', { vtType: 'down' }));
  });
});
