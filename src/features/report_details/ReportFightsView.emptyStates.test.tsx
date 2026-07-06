import { configureStore } from '@reduxjs/toolkit';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import React from 'react';
import { Provider } from 'react-redux';
import { MemoryRouter } from 'react-router-dom';
import '@testing-library/jest-dom';

import { ReportFragment } from '../../graphql/gql/graphql';

import { ReportFightsView } from './ReportFightsView';

jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useNavigate: () => jest.fn(),
}));

jest.mock('../../components/ReportActionBar', () => ({
  ReportActionBar: () => null,
}));

jest.mock('../../components/ReportFightsSkeleton', () => ({
  ReportFightsSkeleton: () => <div data-testid="fights-skeleton" />,
}));

const makeStore = () =>
  configureStore({
    reducer: { ui: () => ({ darkMode: false }) },
  });

const emptyReport = {
  code: 'ABC123',
  title: 'Test report',
  startTime: 1_700_000_000_000,
  endTime: 1_700_000_360_000,
  visibility: 'public',
  zone: null,
  owner: null,
  fights: [],
  phases: null,
} as unknown as ReportFragment;

type ViewProps = React.ComponentProps<typeof ReportFightsView>;

const renderView = (overrides: Partial<ViewProps> = {}) =>
  render(
    <Provider store={makeStore()}>
      <MemoryRouter>
        <ReportFightsView
          fights={[]}
          loading={false}
          fightId={null}
          reportId="ABC123"
          reportStartTime={emptyReport.startTime}
          reportData={emptyReport}
          {...overrides}
        />
      </MemoryRouter>
    </Provider>,
  );

describe('ReportFightsView no-fights states', () => {
  it('shows a distinct ERROR card (not "Empty Log") when the fetch failed and nothing loaded', async () => {
    const onRetry = jest.fn();
    renderView({
      reportData: null,
      error: 'API rate limit exceeded. Too many requests were sent in a short period.',
      onRetry,
    });

    expect(screen.getByText(/couldn.t load this report/i)).toBeInTheDocument();
    // Friendly guidance leads; the raw (humanized) error is secondary detail.
    expect(screen.getByText(/usually temporary/i)).toBeInTheDocument();
    expect(screen.getByText(/rate limit exceeded/i)).toBeInTheDocument();
    // The error must never masquerade as a broken/empty log.
    expect(screen.queryByText('Empty Log')).not.toBeInTheDocument();
    expect(screen.queryByText(/no fights available/i)).not.toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: /try again/i }));
    expect(onRetry).toHaveBeenCalledTimes(1);
  });

  it('shows the STILL PROCESSING card for a recently uploaded empty log', async () => {
    const onRetry = jest.fn();
    renderView({ stillProcessing: true, onRetry });

    expect(screen.getByText(/still processing/i)).toBeInTheDocument();
    expect(screen.getByText('Processing')).toBeInTheDocument();
    // Not presented as a permanently broken log.
    expect(screen.queryByText('Empty Log')).not.toBeInTheDocument();
    expect(screen.queryByText(/re-uploading/i)).not.toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: /check again/i }));
    expect(onRetry).toHaveBeenCalledTimes(1);
  });

  it('keeps the EMPTY LOG card for an old report with zero fights', () => {
    renderView({ stillProcessing: false, onRetry: jest.fn() });

    expect(screen.getByText(/no fights available/i)).toBeInTheDocument();
    expect(screen.getByText('Empty Log')).toBeInTheDocument();
    expect(screen.getByText(/re-uploading the log/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /check again/i })).toBeInTheDocument();
  });

  it('prioritizes the error card over still-processing when nothing is loaded', () => {
    renderView({
      reportData: null,
      stillProcessing: false,
      error: 'Network error: Could not connect to the ESO Logs API.',
    });

    expect(screen.getByText(/couldn.t load this report/i)).toBeInTheDocument();
    expect(screen.queryByText('Empty Log')).not.toBeInTheDocument();
  });

  it('still renders the cached empty state when a background re-check errors (data present)', () => {
    // A failed auto-recheck must not swap an already-rendered empty/processing
    // card for an error card — we still have server truth that the log was empty.
    renderView({
      stillProcessing: true,
      error: 'Network error: Could not connect to the ESO Logs API.',
    });

    expect(screen.getByText(/still processing/i)).toBeInTheDocument();
    expect(screen.queryByText(/couldn.t load this report/i)).not.toBeInTheDocument();
  });

  it('renders the skeleton while loading', () => {
    renderView({ loading: true, fights: undefined, reportData: null });
    expect(screen.getByTestId('fights-skeleton')).toBeInTheDocument();
  });
});
