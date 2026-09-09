import { act, render, screen } from '@testing-library/react';
import React from 'react';

import {
  LIVE_NEW_PULL_NOTICE_MS,
  LIVE_SYNC_FRESH_MS,
  LIVE_SYNC_RETRY_BASE_MS,
  LIVE_SYNC_RETRY_MAX_ATTEMPTS,
  LIVE_SYNC_STALE_MS,
  getNewestReportActivityAt,
  useLiveDashboardHealth,
} from './liveDashboardHealth';
import { LiveDashboardHealthBar } from './LiveDashboardHealthBar';

interface HealthHarnessProps {
  scopeKey?: string;
  hasData?: boolean;
  isLoading?: boolean;
  apiError?: string | null;
  autoRefreshEnabled?: boolean;
  lastSuccessfulSyncAt?: number | null;
  newestActivityAt?: number | null;
  onRetry: () => void;
}

const HealthHarness: React.FC<HealthHarnessProps> = ({
  scopeKey = 'report-a',
  hasData = true,
  isLoading = false,
  apiError = null,
  autoRefreshEnabled = true,
  lastSuccessfulSyncAt,
  newestActivityAt = null,
  onRetry,
}) => {
  const health = useLiveDashboardHealth({
    scopeKey,
    hasData,
    isLoading,
    apiError,
    autoRefreshEnabled,
    lastSuccessfulSyncAt,
    newestActivityAt,
    onRetry,
  });

  return (
    <output aria-label="Live synchronization status">
      {health.status}|{String(health.lastSuccessfulSyncAt)}|{String(health.lagMs)}|
      {String(health.nextRetryAt)}|{health.retryCount}|
      {health.newPullDetected ? 'new-pull' : 'no-new-pull'}
    </output>
  );
};

describe('useLiveDashboardHealth', () => {
  const start = new Date('2026-09-05T12:00:00.000Z').getTime();

  beforeEach(() => {
    jest.useFakeTimers();
    jest.setSystemTime(start);
  });

  afterEach(() => {
    Object.defineProperty(document, 'hidden', { configurable: true, value: false });
    act(() => jest.runOnlyPendingTimers());
    jest.useRealTimers();
  });

  it('moves from fresh to delayed then stale using deterministic sync age', () => {
    const onRetry = jest.fn();
    render(<HealthHarness lastSuccessfulSyncAt={start} onRetry={onRetry} />);

    expect(screen.getByLabelText('Live synchronization status')).toHaveTextContent(/^fresh\|/);

    act(() => jest.advanceTimersByTime(LIVE_SYNC_FRESH_MS + 1_000));
    expect(screen.getByLabelText('Live synchronization status')).toHaveTextContent(/^delayed\|/);

    act(() => jest.advanceTimersByTime(LIVE_SYNC_STALE_MS - LIVE_SYNC_FRESH_MS));
    expect(screen.getByLabelText('Live synchronization status')).toHaveTextContent(/^stale\|/);
  });

  it('marks preserved data as an API error and schedules exponential retry', () => {
    const onRetry = jest.fn();
    const view = render(<HealthHarness lastSuccessfulSyncAt={start} onRetry={onRetry} />);

    view.rerender(<HealthHarness apiError="Gateway failed" onRetry={onRetry} />);

    expect(screen.getByLabelText('Live synchronization status')).toHaveTextContent(
      new RegExp(`^api-error\\|${start}\\|null\\|${start + LIVE_SYNC_RETRY_BASE_MS}\\|0\\|`),
    );

    act(() => jest.advanceTimersByTime(LIVE_SYNC_RETRY_BASE_MS));
    expect(onRetry).toHaveBeenCalledTimes(1);

    view.rerender(<HealthHarness apiError="Gateway failed" isLoading onRetry={onRetry} />);
    view.rerender(<HealthHarness apiError="Gateway failed" onRetry={onRetry} />);
    expect(screen.getByLabelText('Live synchronization status')).toHaveTextContent(
      new RegExp(`^api-error\\|${start}\\|null\\|${start + LIVE_SYNC_RETRY_BASE_MS * 3}\\|1\\|`),
    );
  });

  it('does not present an initial API failure with cached data as a successful live sync', () => {
    const onRetry = jest.fn();
    render(<HealthHarness apiError="Gateway failed" onRetry={onRetry} />);

    expect(screen.getByLabelText('Live synchronization status')).toHaveTextContent(
      new RegExp(`^api-error\\|null\\|null\\|${start + LIVE_SYNC_RETRY_BASE_MS}\\|0\\|`),
    );
  });

  it('does not label cached unsynchronized activity as fresh', () => {
    const onRetry = jest.fn();
    render(<HealthHarness newestActivityAt={start - 1_000} onRetry={onRetry} />);

    expect(screen.getByLabelText('Live synchronization status')).toHaveTextContent(
      /^stale\|null\|1000\|null\|0\|/,
    );
  });

  it('does not promote passive cache hydration to a successful synchronization', () => {
    const onRetry = jest.fn();
    const view = render(
      <HealthHarness hasData={false} newestActivityAt={null} onRetry={onRetry} />,
    );

    // Redux Persist can hydrate a cached payload without a corresponding
    // request lifecycle. That activity must remain stale until a real request
    // completes or the report supplies its own authoritative success stamp.
    view.rerender(<HealthHarness hasData newestActivityAt={start - 1_000} onRetry={onRetry} />);
    expect(screen.getByLabelText('Live synchronization status')).toHaveTextContent(
      /^stale\|null\|1000\|null\|0\|/,
    );

    view.rerender(
      <HealthHarness
        hasData
        lastSuccessfulSyncAt={start}
        newestActivityAt={start - 1_000}
        onRetry={onRetry}
      />,
    );
    expect(screen.getByLabelText('Live synchronization status')).toHaveTextContent(
      new RegExp(`^fresh\\|${start}\\|1000\\|null\\|0\\|`),
    );
  });

  it('records a successful sync when an API failure recovers', () => {
    const onRetry = jest.fn();
    const view = render(<HealthHarness apiError="Gateway failed" onRetry={onRetry} />);

    view.rerender(<HealthHarness apiError="Gateway failed" isLoading onRetry={onRetry} />);
    view.rerender(<HealthHarness onRetry={onRetry} />);

    expect(screen.getByLabelText('Live synchronization status')).toHaveTextContent(
      new RegExp(`^fresh\\|${start}\\|null\\|null\\|0\\|`),
    );
  });

  it('cancels a pending retry while paused and reschedules it when auto-refresh resumes', () => {
    const onRetry = jest.fn();
    const view = render(<HealthHarness apiError="Gateway failed" onRetry={onRetry} />);

    view.rerender(
      <HealthHarness apiError="Gateway failed" autoRefreshEnabled={false} onRetry={onRetry} />,
    );
    expect(screen.getByLabelText('Live synchronization status')).toHaveTextContent(
      /^api-error\|null\|null\|null\|0\|/,
    );

    view.rerender(<HealthHarness apiError="Gateway failed" onRetry={onRetry} />);
    expect(screen.getByLabelText('Live synchronization status')).toHaveTextContent(
      new RegExp(`^api-error\\|null\\|null\\|${start + LIVE_SYNC_RETRY_BASE_MS}\\|0\\|`),
    );
  });

  it('limits automatic retry attempts until a successful recovery resets the budget', () => {
    const onRetry = jest.fn();
    const view = render(<HealthHarness apiError="Gateway failed" onRetry={onRetry} />);

    for (let retry = 1; retry <= LIVE_SYNC_RETRY_MAX_ATTEMPTS; retry += 1) {
      const delay = LIVE_SYNC_RETRY_BASE_MS * 2 ** (retry - 1);
      act(() => jest.advanceTimersByTime(delay));
      view.rerender(<HealthHarness apiError="Gateway failed" isLoading onRetry={onRetry} />);
      view.rerender(<HealthHarness apiError="Gateway failed" onRetry={onRetry} />);
    }

    expect(onRetry).toHaveBeenCalledTimes(LIVE_SYNC_RETRY_MAX_ATTEMPTS);
    expect(screen.getByLabelText('Live synchronization status')).toHaveTextContent(
      new RegExp(`\\|null\\|${LIVE_SYNC_RETRY_MAX_ATTEMPTS}\\|`),
    );

    view.rerender(<HealthHarness isLoading onRetry={onRetry} />);
    view.rerender(<HealthHarness onRetry={onRetry} />);
    view.rerender(<HealthHarness apiError="Gateway failed" onRetry={onRetry} />);
    expect(screen.getByLabelText('Live synchronization status')).toHaveTextContent(
      new RegExp(`\\|${start + 155_000}\\|null\\|${start + 160_000}\\|0\\|`),
    );
  });

  it('does not retain retry work while the document is hidden and cleans timers up on unmount', () => {
    const onRetry = jest.fn();
    const view = render(<HealthHarness apiError="Gateway failed" onRetry={onRetry} />);

    Object.defineProperty(document, 'hidden', { configurable: true, value: true });
    act(() => document.dispatchEvent(new Event('visibilitychange')));
    expect(screen.getByLabelText('Live synchronization status')).toHaveTextContent(
      /^api-error\|null\|null\|null\|0\|/,
    );

    view.unmount();
    act(() => jest.advanceTimersByTime(LIVE_SYNC_RETRY_BASE_MS * 2));
    expect(onRetry).not.toHaveBeenCalled();

    Object.defineProperty(document, 'hidden', { configurable: true, value: false });
  });

  it('keeps the committed scope retry alive when a replacement render is abandoned', () => {
    const retryA = jest.fn();
    const retryB = jest.fn();
    const never = new Promise<never>(() => undefined);
    const Suspend: React.FC = () => {
      throw never;
    };
    const view = render(
      <React.Suspense fallback={null}>
        <HealthHarness scopeKey="report-a" apiError="Gateway failed" onRetry={retryA} />
      </React.Suspense>,
    );

    act(() => {
      React.startTransition(() => {
        view.rerender(
          <React.Suspense fallback={null}>
            <HealthHarness scopeKey="report-b" apiError="Gateway failed" onRetry={retryB} />
            <Suspend />
          </React.Suspense>,
        );
      });
    });
    act(() => jest.advanceTimersByTime(LIVE_SYNC_RETRY_BASE_MS));

    expect(retryA).toHaveBeenCalledTimes(1);
    expect(retryB).not.toHaveBeenCalled();
  });

  it('keeps synchronization fresh while separately reporting an old completed fight', () => {
    const onRetry = jest.fn();
    render(
      <HealthHarness
        lastSuccessfulSyncAt={start}
        newestActivityAt={start - LIVE_SYNC_STALE_MS - 1}
        onRetry={onRetry}
      />,
    );

    expect(screen.getByLabelText('Live synchronization status')).toHaveTextContent(
      new RegExp(`^fresh\\|${start}\\|${LIVE_SYNC_STALE_MS + 1}\\|`),
    );
  });

  it('labels a current synchronization separately from quiet fight activity', () => {
    render(
      <LiveDashboardHealthBar
        health={{
          status: 'fresh',
          isOnline: true,
          lastSuccessfulSyncAt: start,
          newestActivityAt: start - LIVE_SYNC_STALE_MS - 1,
          lagMs: LIVE_SYNC_STALE_MS + 1,
          nextRetryAt: null,
          retryCount: 0,
          newPullDetected: false,
        }}
        autoRefreshEnabled
        isRefreshing={false}
        onToggleAutoRefresh={jest.fn()}
        onRefresh={jest.fn()}
      />,
    );

    expect(screen.getByText('Live synchronization is current')).toBeInTheDocument();
    expect(screen.getByText(/Fight activity lag: 30s/)).toBeInTheDocument();
  });

  it.each([
    {
      name: 'paused',
      props: { autoRefreshEnabled: false },
    },
    {
      name: 'loading',
      props: { isLoading: true },
    },
  ])('does not invoke a due retry after a committed $name transition', ({ props }) => {
    const onRetry = jest.fn();
    const view = render(<HealthHarness apiError="Gateway failed" onRetry={onRetry} />);

    view.rerender(<HealthHarness apiError="Gateway failed" onRetry={onRetry} {...props} />);
    act(() => jest.advanceTimersByTime(LIVE_SYNC_RETRY_BASE_MS));

    expect(onRetry).not.toHaveBeenCalled();
  });

  it.each([
    {
      name: 'offline',
      event: () => window.dispatchEvent(new Event('offline')),
    },
    {
      name: 'hidden',
      event: () => {
        Object.defineProperty(document, 'hidden', { configurable: true, value: true });
        document.dispatchEvent(new Event('visibilitychange'));
      },
    },
  ])('does not invoke a due retry after a committed $name transition', ({ event }) => {
    const onRetry = jest.fn();
    render(<HealthHarness apiError="Gateway failed" onRetry={onRetry} />);

    act(() => event());
    act(() => jest.advanceTimersByTime(LIVE_SYNC_RETRY_BASE_MS));

    expect(onRetry).not.toHaveBeenCalled();
  });

  it('reports offline immediately and refreshes when the browser recovers', () => {
    const onRetry = jest.fn();
    render(<HealthHarness lastSuccessfulSyncAt={start} onRetry={onRetry} />);

    act(() => window.dispatchEvent(new Event('offline')));
    expect(screen.getByLabelText('Live synchronization status')).toHaveTextContent(/^offline\|/);

    act(() => window.dispatchEvent(new Event('online')));
    expect(screen.getByLabelText('Live synchronization status')).toHaveTextContent(/^fresh\|/);
    expect(onRetry).toHaveBeenCalledTimes(1);
  });

  it('does not reconnect-refresh while the document is hidden', () => {
    const onRetry = jest.fn();
    render(<HealthHarness onRetry={onRetry} />);

    Object.defineProperty(document, 'hidden', { configurable: true, value: true });
    act(() => document.dispatchEvent(new Event('visibilitychange')));
    act(() => window.dispatchEvent(new Event('offline')));
    act(() => window.dispatchEvent(new Event('online')));

    expect(onRetry).not.toHaveBeenCalled();
  });

  it('notifies about a newly arrived or advancing pull', () => {
    const onRetry = jest.fn();
    const view = render(<HealthHarness newestActivityAt={null} onRetry={onRetry} />);

    expect(screen.getByLabelText('Live synchronization status')).toHaveTextContent(/no-new-pull$/);

    view.rerender(<HealthHarness newestActivityAt={start - 5_000} onRetry={onRetry} />);
    expect(screen.getByLabelText('Live synchronization status')).toHaveTextContent(/new-pull$/);

    act(() => jest.advanceTimersByTime(LIVE_NEW_PULL_NOTICE_MS));
    expect(screen.getByLabelText('Live synchronization status')).toHaveTextContent(/no-new-pull$/);
  });

  it('resets freshness, retry budget, and pull detection when the report scope changes', () => {
    const onRetry = jest.fn();
    const view = render(
      <HealthHarness
        scopeKey="report-a"
        apiError="Gateway failed"
        newestActivityAt={start - 5_000}
        onRetry={onRetry}
      />,
    );

    expect(screen.getByLabelText('Live synchronization status')).toHaveTextContent(
      new RegExp(`^api-error\\|null\\|5000\\|${start + LIVE_SYNC_RETRY_BASE_MS}\\|0\\|`),
    );

    view.rerender(
      <HealthHarness
        scopeKey="report-b"
        hasData={false}
        newestActivityAt={null}
        onRetry={onRetry}
      />,
    );

    expect(screen.getByLabelText('Live synchronization status')).toHaveTextContent(
      /^stale\|null\|null\|null\|0\|no-new-pull$/,
    );
    act(() => jest.advanceTimersByTime(LIVE_SYNC_RETRY_BASE_MS));
    expect(onRetry).not.toHaveBeenCalled();
  });

  it('uses the latest completed fight timestamp as the activity lag source', () => {
    expect(getNewestReportActivityAt(start, [{ endTime: 3_000 }, { endTime: 5_000 }])).toBe(
      start + 5_000,
    );
    expect(getNewestReportActivityAt(start, [{ endTime: start + 5_000 }])).toBe(start + 5_000);
    expect(getNewestReportActivityAt(start, [{ endTime: null }])).toBeNull();
    expect(getNewestReportActivityAt(Number.NaN, [{ endTime: 5_000 }])).toBeNull();
  });
});
