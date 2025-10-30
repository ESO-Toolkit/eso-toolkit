import { render, screen, waitFor } from '@testing-library/react';
import { act } from 'react';
import userEvent from '@testing-library/user-event';
import React from 'react';
import { MemoryRouter } from 'react-router-dom';
import '@testing-library/jest-dom';

import { useAuth } from '../../features/auth/AuthContext';
import { WhoAmIPage } from '../WhoAmIPage';
import { trackEvent, trackPageView } from '../../utils/analytics';

jest.mock('../../features/auth/AuthContext', () => ({
  useAuth: jest.fn(),
}));

jest.mock('../../utils/sentryUtils', () => ({
  addBreadcrumb: jest.fn(),
}));

jest.mock('../../utils/analytics', () => ({
  trackEvent: jest.fn(),
  trackPageView: jest.fn(),
}));
type MockAuthContext = ReturnType<typeof useAuth>;
type PartialAuthContext = Partial<MockAuthContext>;

const mockUseAuth = useAuth as unknown as jest.MockedFunction<typeof useAuth>;

const buildAuthContext = (overrides: PartialAuthContext = {}): MockAuthContext => {
  const refetchUser = jest.fn().mockResolvedValue(undefined);

  const baseContext = {
    accessToken: 'token',
    isLoggedIn: true,
    isBanned: false,
    banReason: null,
    currentUser: null,
    userLoading: false,
    userError: null,
    setAccessToken: jest.fn(),
    rebindAccessToken: jest.fn(),
    refetchUser,
  } as MockAuthContext;

  return {
    ...baseContext,
    ...overrides,
    refetchUser: overrides.refetchUser ?? refetchUser,
  };
};

const renderWhoAmIPage = (): void => {
  render(
    <MemoryRouter>
      <WhoAmIPage />
    </MemoryRouter>,
  );
};

describe('WhoAmIPage', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('displays the current user fields when data is available', () => {
    const currentUser = {
      id: 42,
      name: 'Test User',
      naDisplayName: 'TestUserNA',
      euDisplayName: 'TestUserEU',
    };

    const context = buildAuthContext({ currentUser });
    mockUseAuth.mockReturnValue(context);

    renderWhoAmIPage();

    expect(screen.getByText('Who am I')).toBeInTheDocument();
    expect(screen.getByText('User ID')).toBeInTheDocument();
    expect(screen.getByText('42')).toBeInTheDocument();
    expect(screen.getByText('TestUserNA')).toBeInTheDocument();
    expect(screen.getByText('TestUserEU')).toBeInTheDocument();
    expect(screen.getByText(/Raw user payload/i)).toBeInTheDocument();
    expect(screen.getByText(/Last synced/i)).toBeInTheDocument();
    expect(trackPageView).toHaveBeenCalledWith('/whoami', 'Who Am I');
  });

  it('invokes refetchUser when refresh is clicked', async () => {
    const refetchUser = jest.fn().mockResolvedValue(undefined);
    const context = buildAuthContext({
      currentUser: {
        id: 7,
        name: 'Refresh Me',
        naDisplayName: 'RefreshNA',
        euDisplayName: null,
      },
      refetchUser,
    });
    mockUseAuth.mockReturnValue(context);

    renderWhoAmIPage();

    const refreshButton = screen.getByTestId('whoami-refresh-button');
    await act(async () => {
      await userEvent.click(refreshButton);
    });

    await waitFor(() => {
      expect(refetchUser).toHaveBeenCalledTimes(1);
    });

    expect(trackEvent).toHaveBeenNthCalledWith(
      1,
      'WhoAmI',
      'Manual Refresh Started',
      undefined,
      undefined,
      expect.objectContaining({ had_user_before: true }),
    );

    await waitFor(() => {
      expect(trackEvent).toHaveBeenNthCalledWith(
        2,
        'WhoAmI',
        'Manual Refresh Completed',
        undefined,
        undefined,
        expect.objectContaining({ status: 'success', had_user_before: true }),
      );
    });
  });

  it('shows backend error message when userError is present', () => {
    const context = buildAuthContext({
      currentUser: null,
      userError: 'Failed to fetch user data',
    });
    mockUseAuth.mockReturnValue(context);

    renderWhoAmIPage();

    expect(screen.getByTestId('whoami-error-alert')).toHaveTextContent('Failed to fetch user data');
  });

  it('renders empty state when no user data is available', () => {
    const context = buildAuthContext({ currentUser: null });
    mockUseAuth.mockReturnValue(context);

    renderWhoAmIPage();

    expect(screen.getByTestId('whoami-empty-state')).toBeInTheDocument();
  });
});
