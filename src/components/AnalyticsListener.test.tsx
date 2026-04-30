import React from 'react';
import { act, render, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes, useNavigate } from 'react-router-dom';

import { AnalyticsListener } from './AnalyticsListener';

type MockCurrentUser = { name: string } | null;
type MockAuthState = { currentUser: MockCurrentUser };

const authSubscribers = new Set<() => void>();
let mockAuthState: MockAuthState = { currentUser: { name: 'Tester' } };

const subscribeToAuth = (callback: () => void): (() => void) => {
  authSubscribers.add(callback);
  return () => authSubscribers.delete(callback);
};

const getAuthSnapshot = (): MockAuthState => mockAuthState;

const setMockAuthState = (state: MockAuthState): void => {
  mockAuthState = state;
  authSubscribers.forEach((callback) => callback());
};

jest.mock('../utils/analytics', () => ({
  trackPageView: jest.fn(),
}));

jest.mock('../utils/errorTracking', () => ({
  addBreadcrumb: jest.fn(),
}));

jest.mock('../features/auth/AuthContext', () => {
  const React = require('react');
  return {
    useAuth: () => React.useSyncExternalStore(subscribeToAuth, getAuthSnapshot),
  };
});

const getTrackPageViewMock = (): jest.Mock => {
  return jest.requireMock('../utils/analytics').trackPageView as jest.Mock;
};

const getAddBreadcrumbMock = (): jest.Mock => {
  return jest.requireMock('../utils/errorTracking').addBreadcrumb as jest.Mock;
};

const NavigateOnMount: React.FC = () => {
  const navigate = useNavigate();

  React.useEffect(() => {
    navigate('/second');
  }, [navigate]);

  return <div>First</div>;
};

describe('AnalyticsListener', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    document.title = 'Test Title';
    setMockAuthState({ currentUser: { name: 'Tester' } });
  });

  it('tracks page views when the route changes', async () => {
    render(
      <MemoryRouter initialEntries={['/first']}>
        <AnalyticsListener />
        <Routes>
          <Route path="/first" element={<NavigateOnMount />} />
          <Route path="/second" element={<div>Second</div>} />
        </Routes>
      </MemoryRouter>,
    );

    const trackPageView = getTrackPageViewMock();
    const addBreadcrumb = getAddBreadcrumbMock();

    await waitFor(() => {
      expect(trackPageView).toHaveBeenNthCalledWith(1, '/first', 'Test Title');
    });

    await waitFor(() => {
      expect(addBreadcrumb).toHaveBeenNthCalledWith(1, 'Route change detected', 'navigation', {
        path: '/first',
        previousPath: null,
        title: 'Test Title',
      });
    });

    await waitFor(() => {
      expect(trackPageView).toHaveBeenNthCalledWith(2, '/second', 'Test Title');
    });

    await waitFor(() => {
      expect(addBreadcrumb).toHaveBeenNthCalledWith(2, 'Route change detected', 'navigation', {
        path: '/second',
        previousPath: '/first',
        title: 'Test Title',
      });
    });
  });

  it('re-tracks the active route when the username resolves later', async () => {
    setMockAuthState({ currentUser: null });

    render(
      <MemoryRouter initialEntries={['/profile']}>
        <AnalyticsListener />
        <Routes>
          <Route path="/profile" element={<div>Profile</div>} />
        </Routes>
      </MemoryRouter>,
    );

    const trackPageView = getTrackPageViewMock();
    const addBreadcrumb = getAddBreadcrumbMock();

    await waitFor(() => {
      expect(trackPageView).toHaveBeenCalledWith('/profile', 'Test Title');
    });

    expect(trackPageView).toHaveBeenCalledTimes(1);

    await act(async () => {
      setMockAuthState({ currentUser: { name: 'ResolvedUser' } });
    });

    await waitFor(() => {
      expect(trackPageView).toHaveBeenCalledTimes(2);
    });

    expect(trackPageView).toHaveBeenNthCalledWith(2, '/profile', 'Test Title');
    expect(addBreadcrumb).toHaveBeenLastCalledWith('Route re-tracked with username', 'navigation', {
      path: '/profile',
      previousPath: '/profile',
      title: 'Test Title',
    });
  });

  it('only re-tracks once after the username becomes available', async () => {
    setMockAuthState({ currentUser: null });

    render(
      <MemoryRouter initialEntries={['/dashboard']}>
        <AnalyticsListener />
        <Routes>
          <Route path="/dashboard" element={<div>Dashboard</div>} />
        </Routes>
      </MemoryRouter>,
    );

    const trackPageView = getTrackPageViewMock();

    await waitFor(() => {
      expect(trackPageView).toHaveBeenCalledWith('/dashboard', 'Test Title');
    });

    await act(async () => {
      setMockAuthState({ currentUser: { name: 'ResolvedUser' } });
    });

    await waitFor(() => {
      expect(trackPageView).toHaveBeenCalledTimes(2);
    });

    await act(async () => {
      setMockAuthState({ currentUser: { name: 'AnotherName' } });
    });

    await waitFor(() => {
      expect(trackPageView).toHaveBeenCalledTimes(2);
    });
  });
});
