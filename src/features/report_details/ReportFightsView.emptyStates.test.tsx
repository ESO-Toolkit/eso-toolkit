import { configureStore } from '@reduxjs/toolkit';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import React from 'react';
import { Provider } from 'react-redux';
import { MemoryRouter } from 'react-router-dom';
import '@testing-library/jest-dom';

import { FightFragment, ReportFragment } from '../../graphql/gql/graphql';

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

const makeBossFight = (id: number, bossPercentage: number | null | undefined): FightFragment =>
  ({
    __typename: 'ReportFight',
    id,
    name: 'Yolnahkriin',
    difficulty: 121,
    startTime: id * 100_000,
    endTime: id * 100_000 + 60_000,
    kill: null,
    encounterID: 21,
    originalEncounterID: null,
    bossPercentage,
    gameZone: { __typename: 'GameZone', id: 1121, name: 'Sunspire' },
  }) as FightFragment;

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

describe('ReportFightsView outcome cards', () => {
  it.each([
    ['null', null],
    ['missing', undefined],
    ['NaN', Number.NaN],
    ['Infinity', Number.POSITIVE_INFINITY],
  ])('renders %s boss health as UNKNOWN with no fabricated progress', (_, bossPercentage) => {
    const fight = makeBossFight(1, bossPercentage);
    renderView({
      fights: [fight],
      reportData: { ...emptyReport, fights: [fight] } as ReportFragment,
    });

    const card = screen.getByTestId(`fight-button-${fight.id}`);
    expect(card).toHaveAttribute('data-fight-outcome', 'unknown');
    expect(within(card).getByText('UNKNOWN')).toBeInTheDocument();
    expect(within(card).queryByText('KILL')).not.toBeInTheDocument();
    expect(within(card).queryByText('0%')).not.toBeInTheDocument();
    expect(screen.queryByTestId(`fight-progress-${fight.id}`)).not.toBeInTheDocument();
    expect(screen.queryByTestId(`fight-progress-bar-${fight.id}`)).not.toBeInTheDocument();
  });

  it('keeps valid kill and wipe progress distinct from unknown outcomes', () => {
    const kill = { ...makeBossFight(1, null), kill: true } as FightFragment;
    const wipe = { ...makeBossFight(2, 40), kill: false } as FightFragment;
    renderView({
      fights: [kill, wipe],
      reportData: { ...emptyReport, fights: [kill, wipe] } as ReportFragment,
    });

    const killCard = screen.getByTestId(`fight-button-${kill.id}`);
    const wipeCard = screen.getByTestId(`fight-button-${wipe.id}`);
    expect(killCard).toHaveAttribute('data-fight-outcome', 'kill');
    expect(within(killCard).getByText('KILL')).toBeInTheDocument();
    expect(screen.getByTestId(`fight-progress-${kill.id}`)).toBeInTheDocument();
    expect(wipeCard).toHaveAttribute('data-fight-outcome', 'wipe');
    expect(within(wipeCard).getByText('40%')).toBeInTheDocument();
    expect(screen.getByTestId(`fight-progress-bar-${wipe.id}`)).toBeInTheDocument();
  });
});
