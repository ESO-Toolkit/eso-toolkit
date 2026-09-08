import { render, screen } from '@testing-library/react';
import React from 'react';
import { MemoryRouter } from 'react-router-dom';
import '@testing-library/jest-dom';

import { useAuth } from '../features/auth/AuthContext';

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

const mockUseAuth = useAuth as jest.MockedFunction<typeof useAuth>;

describe('HeaderBar', () => {
  beforeEach(() => {
    jest.clearAllMocks();
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

  it('exposes menu relationships and a stateful mobile navigation control', () => {
    render(
      <MemoryRouter>
        <HeaderBar />
      </MemoryRouter>,
    );

    const toolsButton = screen.getByRole('button', { name: /tools/i });
    expect(toolsButton).toHaveAttribute('aria-haspopup', 'menu');
    expect(toolsButton).toHaveAttribute('aria-expanded', 'false');
    expect(toolsButton).not.toHaveAttribute('aria-controls');

    const menuButton = screen.getByRole('button', { name: 'Open navigation menu' });
    menuButton.focus();
    expect(menuButton).toHaveFocus();
    expect(menuButton).toHaveAttribute('aria-haspopup', 'dialog');
    expect(menuButton).toHaveAttribute('aria-expanded', 'false');
    expect(menuButton).toHaveAttribute('aria-controls', 'mobile-nav-menu');
  });
});
