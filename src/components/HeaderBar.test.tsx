import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
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
    jest.spyOn(window, 'scrollTo').mockImplementation(() => undefined);
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

  it('exposes menu relationships and a stateful mobile navigation control', async () => {
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
    await act(async () => {
      menuButton.focus();
    });
    expect(menuButton).toHaveFocus();
    expect(menuButton).toHaveAttribute('aria-haspopup', 'dialog');
    expect(menuButton).toHaveAttribute('aria-expanded', 'false');
    expect(menuButton).toHaveAttribute('aria-controls', 'mobile-nav-menu');
  });

  it('opens the mobile navigation dialog with Enter and restores trigger focus on Escape', async () => {
    const user = userEvent.setup();
    render(
      <MemoryRouter>
        <HeaderBar />
      </MemoryRouter>,
    );

    const menuButton = screen.getByRole('button', { name: 'Open navigation menu' });
    await act(async () => {
      menuButton.focus();
    });
    await user.keyboard('{Enter}');

    const navigationDialog = screen.getByRole('dialog', { name: 'Navigation menu' });
    expect(menuButton).toHaveAttribute('aria-expanded', 'true');
    expect(menuButton).toHaveAttribute('aria-label', 'Close navigation menu');
    expect(navigationDialog).toHaveAttribute('aria-modal', 'true');

    await user.keyboard('{Escape}');

    await waitFor(() => {
      expect(menuButton).toHaveAttribute('aria-expanded', 'false');
      expect(menuButton).toHaveFocus();
    });
  });

  it('opens profile settings as a named dialog rather than a menu', () => {
    mockUseAuth.mockReturnValue({
      accessToken: 'token',
      isLoggedIn: true,
      isBanned: false,
      banReason: null,
      currentUser: { id: 1, name: 'Aria' },
      userLoading: false,
      userError: null,
      setAccessToken: jest.fn(),
      refetchUser: jest.fn(),
      rebindAccessToken: jest.fn(),
    } as ReturnType<typeof useAuth>);

    render(
      <MemoryRouter>
        <HeaderBar />
      </MemoryRouter>,
    );

    const profileControl = screen.getByRole('button', { name: 'Profile: Aria' });
    expect(profileControl).toHaveAttribute('aria-haspopup', 'dialog');

    fireEvent.click(profileControl);

    expect(screen.getByRole('dialog', { name: 'Profile settings' })).toBeInTheDocument();
  });
});
