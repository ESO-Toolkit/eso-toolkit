import React from 'react';
import { render, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes, useNavigate } from 'react-router-dom';

import { AnalyticsListener } from './AnalyticsListener';

jest.mock('../utils/analytics', () => ({
  trackPageView: jest.fn(),
}));

jest.mock('../utils/sentryUtils', () => ({
  addBreadcrumb: jest.fn(),
}));

const getTrackPageViewMock = (): jest.Mock => {
  return jest.requireMock('../utils/analytics').trackPageView as jest.Mock;
};

const getAddBreadcrumbMock = (): jest.Mock => {
  return jest.requireMock('../utils/sentryUtils').addBreadcrumb as jest.Mock;
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
});
