import { fireEvent, render, screen } from '@testing-library/react';
import React from 'react';
import { MemoryRouter } from 'react-router-dom';
import '@testing-library/jest-dom';

import { useAuth } from '../features/auth/AuthContext';
import { importRosterHubPage, preloadHubRoutes } from '../utils/hubRoutePreload';

import { HeaderBar } from './HeaderBar';

const mockNavigate = jest.fn();

jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useNavigate: () => mockNavigate,
}));

jest.mock('../features/auth/AuthContext', () => ({
  useAuth: jest.fn(),
}));

jest.mock('../features/auth/auth', () => ({
  LOCAL_STORAGE_ACCESS_TOKEN_KEY: 'eso-access-token',
  startPKCEAuth: jest.fn(),
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
  useViewTransitionNavigate: () => jest.fn(),
}));

jest.mock('../utils/hubRoutePreload', () => ({
  importRosterHubPage: jest.fn(),
  importBuildHubPage: jest.fn(),
  importPackHubPage: jest.fn(),
  preloadHubRoutes: jest.fn(),
}));

const mockUseAuth = useAuth as jest.MockedFunction<typeof useAuth>;
const mockPreloadHubRoutes = preloadHubRoutes as jest.MockedFunction<typeof preloadHubRoutes>;
const mockImportRosterHubPage = importRosterHubPage as jest.MockedFunction<
  typeof importRosterHubPage
>;

describe('HeaderBar', () => {
  const originalConnection = Object.getOwnPropertyDescriptor(navigator, 'connection');

  const setConnection = (
    connection: { effectiveType?: string; saveData?: boolean } | undefined,
  ) => {
    if (connection) {
      Object.defineProperty(navigator, 'connection', { configurable: true, value: connection });
    } else {
      Object.defineProperty(navigator, 'connection', { configurable: true, value: undefined });
    }
  };

  const renderHeader = () =>
    render(
      <MemoryRouter>
        <HeaderBar />
      </MemoryRouter>,
    );

  beforeEach(() => {
    jest.clearAllMocks();
    setConnection(undefined);
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

  afterAll(() => {
    if (originalConnection) {
      Object.defineProperty(navigator, 'connection', originalConnection);
    } else {
      Reflect.deleteProperty(navigator, 'connection');
    }
  });

  it('renders without crashing', () => {
    renderHeader();

    // Check that the header bar is rendered with Tools button
    const toolsButton = screen.getByRole('button', { name: /tools/i });
    expect(toolsButton).toBeInTheDocument();
  });

  it.each([
    ['pointer', (button: HTMLElement) => fireEvent.pointerEnter(button)],
    ['focus', (button: HTMLElement) => fireEvent.focus(button)],
    ['touch', (button: HTMLElement) => fireEvent.touchStart(button)],
  ])('preloads only the targeted hub once on %s intent', (_intent, trigger) => {
    renderHeader();

    trigger(screen.getAllByRole('button', { name: /roster hub/i })[0]);

    expect(mockPreloadHubRoutes).toHaveBeenCalledTimes(1);
    expect(mockPreloadHubRoutes).toHaveBeenCalledWith([mockImportRosterHubPage]);
  });

  it.each([
    ['Save-Data', { saveData: true }],
    ['3g', { effectiveType: '3g' }],
  ])('does not preload a hub on pointer intent when %s is active', (_label, connection) => {
    setConnection(connection);
    renderHeader();

    fireEvent.pointerEnter(screen.getAllByRole('button', { name: /roster hub/i })[0]);

    expect(mockPreloadHubRoutes).not.toHaveBeenCalled();
  });

  it.each([
    ['Save-Data', { saveData: true }],
    ['3g', { effectiveType: '3g' }],
  ])('does not preload a hub on keyboard focus when %s is active', (_label, connection) => {
    setConnection(connection);
    renderHeader();

    fireEvent.focus(screen.getAllByRole('button', { name: /roster hub/i })[0]);

    expect(mockPreloadHubRoutes).not.toHaveBeenCalled();
  });

  it.each([
    ['Save-Data', { saveData: true }],
    ['3g', { effectiveType: '3g' }],
  ])('does not preload a hub on touch intent when %s is active', (_label, connection) => {
    setConnection(connection);
    renderHeader();

    fireEvent.touchStart(screen.getAllByRole('button', { name: /roster hub/i })[0]);

    expect(mockPreloadHubRoutes).not.toHaveBeenCalled();
  });
});
