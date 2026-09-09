import { act, render, screen } from '@testing-library/react';
import React from 'react';

import { useReportFightContext } from '../../ReportFightContext';

import { formatLiveTimestamp } from './liveDashboardHealth';
import { LiveLog } from './LiveLog';

const query = jest.fn();
const dispatch = jest.fn();
let poll: (() => void) | undefined;
let intervalOptions: { enabled?: boolean } | undefined;
let mockParams: { reportId?: string; fightId?: string } = { reportId: 'live-report' };

const ReportFightContextProbe: React.FC = () => {
  const { reportId, fightId } = useReportFightContext();
  return <output aria-label="Live report fight context">{`${reportId}:${fightId}`}</output>;
};

jest.mock('../../EsoLogsClientContext', () => ({
  useEsoLogsClientInstance: () => ({ query }),
}));
jest.mock('../../hooks/useVisibilityGatedInterval', () => ({
  useVisibilityGatedInterval: (
    callback: () => void,
    _interval: number,
    options: { enabled?: boolean },
  ) => {
    poll = callback;
    intervalOptions = options;
  },
}));
jest.mock('../../utils/errorTracking', () => ({ reportError: jest.fn() }));
jest.mock('react-router-dom', () => ({ useParams: () => mockParams }));
jest.mock('@/store/useAppDispatch', () => ({ useAppDispatch: () => dispatch }));
jest.mock('@/store/master_data/masterDataSlice', () => ({
  fetchReportMasterData: jest.fn(),
  forceMasterDataRefresh: jest.fn(),
}));
jest.mock('@/store/report/reportSlice', () => ({
  setActiveReportContext: jest.fn(),
  setReportCacheMetadata: jest.fn(),
  setReportData: jest.fn(),
}));
jest.mock('@/store/ui/uiSlice', () => ({ setSelectedTargetIds: jest.fn() }));

describe('LiveLog polling', () => {
  beforeEach(() => {
    dispatch.mockReset();
    query.mockReset();
    poll = undefined;
    intervalOptions = undefined;
    mockParams = { reportId: 'live-report' };
  });

  it('suppresses overlapping polls and ignores a response that completes after unmount', async () => {
    let resolveQuery: (value: unknown) => void = () => undefined;
    query.mockImplementation(
      () =>
        new Promise((resolve) => {
          resolveQuery = resolve;
        }),
    );

    const view = render(
      <LiveLog>
        <div>Live content</div>
      </LiveLog>,
    );
    dispatch.mockClear();

    await act(async () => {
      poll?.();
      poll?.();
    });
    expect(query).toHaveBeenCalledTimes(1);

    view.unmount();
    await act(async () => {
      resolveQuery({ reportData: { report: { fights: [], startTime: 1 } } });
    });

    expect(dispatch).not.toHaveBeenCalled();
  });

  it('treats a partial GraphQL response as a failed live synchronization', async () => {
    query.mockResolvedValue({
      reportData: { report: { fights: [], startTime: 1 } },
      errors: [{ message: 'A field could not be resolved.' }],
    });

    render(
      <LiveLog>
        <div>Live content</div>
      </LiveLog>,
    );
    dispatch.mockClear();

    await act(async () => {
      poll?.();
    });

    expect(query).toHaveBeenLastCalledWith(expect.objectContaining({ errorPolicy: 'none' }));
    expect(dispatch).not.toHaveBeenCalled();
    expect(screen.getByRole('alert')).toHaveTextContent('Live refresh failed');
  });

  it('stops fixed-interval polling when bounded health retries own an API failure', async () => {
    query.mockRejectedValue(new Error('Temporary API failure'));

    render(
      <LiveLog>
        <div>Live content</div>
      </LiveLog>,
    );

    expect(intervalOptions).toEqual(expect.objectContaining({ enabled: true }));

    await act(async () => {
      poll?.();
    });

    expect(intervalOptions).toEqual(expect.objectContaining({ enabled: false }));
  });

  it('refreshes a new report immediately and ignores a late response for the previous report', async () => {
    let resolveReportA: (value: unknown) => void = () => undefined;
    let resolveReportB: (value: unknown) => void = () => undefined;
    mockParams = { reportId: 'report-a' };
    query.mockImplementation(({ variables }: { variables: { code: string } }) => {
      return new Promise((resolve) => {
        if (variables.code === 'report-a') {
          resolveReportA = resolve;
        } else {
          resolveReportB = resolve;
        }
      });
    });

    const view = render(
      <LiveLog>
        <div>Live content</div>
      </LiveLog>,
    );
    dispatch.mockClear();

    await act(async () => {
      poll?.();
    });
    expect(query).toHaveBeenLastCalledWith(
      expect.objectContaining({ variables: expect.objectContaining({ code: 'report-a' }) }),
    );

    mockParams = { reportId: 'report-b' };
    view.rerender(
      <LiveLog>
        <div>Live content</div>
      </LiveLog>,
    );

    await act(async () => {
      poll?.();
    });
    expect(query).toHaveBeenLastCalledWith(
      expect.objectContaining({ variables: expect.objectContaining({ code: 'report-b' }) }),
    );

    await act(async () => {
      resolveReportB({ reportData: { report: { fights: [], startTime: 1 } } });
    });
    const dispatchesAfterReportB = dispatch.mock.calls.length;
    expect(screen.getByText('Live synchronization is current')).toBeInTheDocument();

    await act(async () => {
      resolveReportA({ reportData: { report: { fights: [], startTime: 1 } } });
    });

    expect(dispatch).toHaveBeenCalledTimes(dispatchesAfterReportB);
    expect(screen.getByText('Live synchronization is current')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Refresh now' })).not.toBeDisabled();
  });

  it('keeps latest-fight children and context scoped through unresolved A to B to A requests', async () => {
    mockParams = { reportId: 'report-a', fightId: 'fight-a' };
    query.mockImplementation(() => new Promise(() => undefined));
    const view = render(
      <LiveLog>
        <ReportFightContextProbe />
      </LiveLog>,
    );

    expect(screen.getByLabelText('Live report fight context')).toHaveTextContent(
      'report-a:fight-a',
    );
    await act(async () => {
      poll?.();
    });

    mockParams = { reportId: 'report-b', fightId: 'fight-b' };
    view.rerender(
      <LiveLog>
        <ReportFightContextProbe />
      </LiveLog>,
    );
    expect(screen.getByLabelText('Live report fight context')).toHaveTextContent(
      'report-b:fight-b',
    );
    await act(async () => {
      poll?.();
    });

    mockParams = { reportId: 'report-a', fightId: 'fight-a' };
    view.rerender(
      <LiveLog>
        <ReportFightContextProbe />
      </LiveLog>,
    );
    expect(screen.getByLabelText('Live report fight context')).toHaveTextContent(
      'report-a:fight-a',
    );
    await act(async () => {
      poll?.();
    });

    // Both route-owned requests remain unresolved; returning to A must not
    // duplicate its request or show its fight while B is active.
    expect(query).toHaveBeenCalledTimes(2);
  });

  it('keeps health and last-sync ownership with the active report through an A to B to A switch', async () => {
    let resolveReportA: (value: unknown) => void = () => undefined;
    let resolveReportB: (value: unknown) => void = () => undefined;
    const synchronizationAt = new Date('2026-09-05T12:00:00.000Z').getTime();
    jest.useFakeTimers();
    jest.setSystemTime(synchronizationAt);
    mockParams = { reportId: 'report-a' };
    query.mockImplementation(({ variables }: { variables: { code: string } }) => {
      return new Promise((resolve) => {
        if (variables.code === 'report-a') {
          resolveReportA = resolve;
        } else {
          resolveReportB = resolve;
        }
      });
    });

    let view: ReturnType<typeof render> | undefined;
    try {
      view = render(
        <LiveLog>
          <div>Live content</div>
        </LiveLog>,
      );
      dispatch.mockClear();

      await act(async () => {
        poll?.();
      });

      mockParams = { reportId: 'report-b' };
      view.rerender(
        <LiveLog>
          <div>Live content</div>
        </LiveLog>,
      );
      await act(async () => {
        poll?.();
      });

      // Rendering A again happens before either request settles. The synchronous
      // active-report guard must retain A's request rather than starting a third.
      mockParams = { reportId: 'report-a' };
      view.rerender(
        <LiveLog>
          <div>Live content</div>
        </LiveLog>,
      );
      await act(async () => {
        poll?.();
      });

      expect(query).toHaveBeenCalledTimes(2);
      expect(screen.getByRole('button', { name: 'Refreshing live data' })).toBeDisabled();

      const dispatchesBeforeReportBCompletion = dispatch.mock.calls.length;
      await act(async () => {
        resolveReportB({ reportData: { report: { fights: [], startTime: 1 } } });
      });
      expect(dispatch).toHaveBeenCalledTimes(dispatchesBeforeReportBCompletion);
      expect(screen.getByRole('button', { name: 'Refreshing live data' })).toBeDisabled();
      expect(
        screen.getByText(/Last successful synchronization: not synchronized/i),
      ).toBeInTheDocument();

      await act(async () => {
        resolveReportA({ reportData: { report: { fights: [], startTime: 1 } } });
      });
      expect(screen.getByRole('button', { name: 'Refresh now' })).not.toBeDisabled();
      expect(screen.getByRole('status')).toHaveTextContent(
        `Last successful synchronization: ${formatLiveTimestamp(synchronizationAt)}.`,
      );

      // Complete another B -> A render pass after A settles. An unkeyed
      // report-reset effect would erase this just-recorded A timestamp after
      // the route returns to A; report-owned health must retain it.
      mockParams = { reportId: 'report-b' };
      view.rerender(
        <LiveLog>
          <div>Live content</div>
        </LiveLog>,
      );
      mockParams = { reportId: 'report-a' };
      view.rerender(
        <LiveLog>
          <div>Live content</div>
        </LiveLog>,
      );
      expect(query).toHaveBeenCalledTimes(2);
      expect(screen.getByRole('status')).toHaveTextContent(
        `Last successful synchronization: ${formatLiveTimestamp(synchronizationAt)}.`,
      );
    } finally {
      view?.unmount();
      jest.clearAllTimers();
      jest.useRealTimers();
    }
  });
});
