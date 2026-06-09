import { fireEvent, render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import { ThemeProvider, createTheme } from '@mui/material';

import { ProfileLogsPanel } from './ProfileLogsPanel';
import type { UseProfileUploadedReportsResult } from './useProfileUploadedReports';
import type { ProfileReportSummary } from './profileLogsQueries';

// ─── Mocks ───────────────────────────────────────────────────────────────────

const mockNavigate = jest.fn();
jest.mock('../../hooks/useViewTransitionNavigate', () => ({
  useViewTransitionNavigate: () => mockNavigate,
}));

jest.mock('../reports/reportFormatting', () => ({
  ...jest.requireActual('../reports/reportFormatting'),
  formatReportDateTime: () => 'Jan 01, 2024 10:00',
  formatReportDuration: () => '6m',
}));

let hookValue: UseProfileUploadedReportsResult;
jest.mock('./useProfileUploadedReports', () => ({
  useProfileUploadedReports: () => hookValue,
}));

const baseHook: UseProfileUploadedReportsResult = {
  reports: [],
  total: 0,
  loading: false,
  loadingMore: false,
  error: null,
  hasMore: false,
  loadMore: jest.fn(),
  reload: jest.fn(),
  unavailable: false,
};

const renderPanel = (overrides: Partial<UseProfileUploadedReportsResult> = {}) => {
  hookValue = { ...baseHook, ...overrides };
  return render(
    <ThemeProvider theme={createTheme({ palette: { mode: 'dark' } })}>
      <ProfileLogsPanel esoLogsUserId="12345" username="Tester" />
    </ThemeProvider>,
  );
};

const makeReport = (
  code: string,
  overrides: Partial<ProfileReportSummary> = {},
): ProfileReportSummary => ({
  code,
  title: `My ${code} run`,
  startTime: 1_700_000_000_000,
  endTime: 1_700_000_360_000,
  visibility: 'public',
  segments: 3,
  zone: { name: 'Rockgrove' },
  owner: { id: 42, name: 'Tester' },
  ...overrides,
});

beforeEach(() => {
  mockNavigate.mockReset();
});

// ─── Tests ───────────────────────────────────────────────────────────────────

describe('ProfileLogsPanel', () => {
  it('renders nothing when there is no usable ESO Logs id', () => {
    const { container } = renderPanel({ unavailable: true });
    expect(container).toBeEmptyDOMElement();
  });

  it('shows the section heading and a loading skeleton while loading', () => {
    renderPanel({ loading: true });
    expect(screen.getByText('Recent Logs')).toBeInTheDocument();
  });

  it('shows an empty state when there are no public logs', () => {
    renderPanel({ reports: [], total: 0 });
    expect(screen.getByText(/no public logs uploaded yet/i)).toBeInTheDocument();
  });

  it('renders a row per report and navigates to the in-app viewer on click', () => {
    renderPanel({ reports: [makeReport('ABC123')], total: 1 });

    // The primary in-app action is a real <button> (not a nested role="link"),
    // so its keyboard activation is native — no custom handler to hijack.
    const open = screen.getByRole('button', { name: /open log: my abc123 run/i });
    expect(open).toBeInTheDocument();
    expect(screen.getByText('My ABC123 run')).toBeInTheDocument();

    fireEvent.click(open);
    expect(mockNavigate).toHaveBeenCalledWith('/report/ABC123', { vtType: 'forward' });
  });

  it('renders the external ESO Logs link as a sibling that does not trigger in-app nav', () => {
    renderPanel({ reports: [makeReport('ABC123')], total: 1 });

    const external = screen.getByRole('link', { name: /open on eso logs/i });
    expect(external).toHaveAttribute('href', 'https://www.esologs.com/reports/ABC123');
    // It must NOT be nested inside the in-app button (invalid nested interactive).
    const openBtn = screen.getByRole('button', { name: /open log: my abc123 run/i });
    expect(openBtn).not.toContainElement(external);

    fireEvent.click(external);
    expect(mockNavigate).not.toHaveBeenCalled();
  });

  it('shows a "Show more" button when more pages exist and calls loadMore', () => {
    const loadMore = jest.fn();
    renderPanel({ reports: [makeReport('ABC123')], total: 20, hasMore: true, loadMore });

    const btn = screen.getByRole('button', { name: /show more logs/i });
    fireEvent.click(btn);
    expect(loadMore).toHaveBeenCalled();
  });

  it('flags logs with no combat data with an "Empty Log" chip', () => {
    renderPanel({
      reports: [makeReport('ABC123'), makeReport('EMPTY1', { segments: 0 })],
      total: 2,
    });

    const chips = screen.getAllByText('Empty Log');
    expect(chips).toHaveLength(1);
    // The healthy log row must not be flagged.
    expect(screen.getByText('My ABC123 run')).toBeInTheDocument();
  });

  it('shows an error state with a retry that calls reload', () => {
    const reload = jest.fn();
    renderPanel({ error: 'Could not load logs right now. Please try again later.', reload });

    expect(screen.getByText(/could not load logs/i)).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /try again/i }));
    expect(reload).toHaveBeenCalled();
  });
});
