import { fireEvent, render, screen } from '@testing-library/react';
import React from 'react';

import type { LiveDashboardHealth } from './liveDashboardHealth';
import { LiveDashboardHealthBar } from './LiveDashboardHealthBar';

const health: LiveDashboardHealth = {
  status: 'api-error',
  isOnline: true,
  lastSuccessfulSyncAt: new Date('2026-09-05T12:00:00.000Z').getTime(),
  newestActivityAt: new Date('2026-09-05T11:59:00.000Z').getTime(),
  lagMs: 60_000,
  nextRetryAt: new Date('2026-09-05T12:00:05.000Z').getTime(),
  retryCount: 1,
  newPullDetected: true,
};

describe('LiveDashboardHealthBar', () => {
  it('makes retained-data failures explicit and exposes accessible refresh controls', () => {
    const onRefresh = jest.fn();
    const onToggleAutoRefresh = jest.fn();
    render(
      <LiveDashboardHealthBar
        health={health}
        autoRefreshEnabled
        isRefreshing={false}
        onRefresh={onRefresh}
        onToggleAutoRefresh={onToggleAutoRefresh}
      />,
    );

    expect(screen.getByRole('alert')).toHaveTextContent('Live refresh failed');
    expect(screen.getByText(/Displayed data may be stale/)).toBeInTheDocument();
    expect(screen.getByText(/Newest completed fight:/)).toBeInTheDocument();
    expect(screen.getByText(/Next retry at/)).toBeInTheDocument();
    expect(screen.getByRole('status')).toHaveTextContent('New pull arrived');

    const pauseButton = screen.getByRole('button', { name: 'Pause automatic refresh' });
    expect(pauseButton).toHaveAttribute('aria-pressed', 'true');
    fireEvent.click(pauseButton);
    fireEvent.click(screen.getByRole('button', { name: 'Refresh now' }));

    expect(onToggleAutoRefresh).toHaveBeenCalledTimes(1);
    expect(onRefresh).toHaveBeenCalledTimes(1);
  });

  it('does not claim an initial failed request has a previous successful result', () => {
    render(
      <LiveDashboardHealthBar
        health={{ ...health, lastSuccessfulSyncAt: null, newestActivityAt: null }}
        autoRefreshEnabled
        isRefreshing={false}
        onRefresh={jest.fn()}
        onToggleAutoRefresh={jest.fn()}
      />,
    );

    expect(screen.getByRole('alert')).toHaveTextContent(
      'A successful live synchronization has not completed yet.',
    );
    expect(
      screen.queryByText(/previous successful result is still shown/i),
    ).not.toBeInTheDocument();
  });

  it('reports current data without an assertive error announcement', () => {
    render(
      <LiveDashboardHealthBar
        health={{ ...health, status: 'fresh', nextRetryAt: null, newPullDetected: false }}
        autoRefreshEnabled={false}
        isRefreshing
        onRefresh={jest.fn()}
        onToggleAutoRefresh={jest.fn()}
      />,
    );

    expect(screen.getByRole('status')).toHaveTextContent('Live synchronization is current');
    expect(screen.getByRole('button', { name: 'Resume automatic refresh' })).toHaveAttribute(
      'aria-pressed',
      'false',
    );
    expect(screen.getByRole('button', { name: 'Refreshing live data' })).toBeDisabled();
  });
});
