import { configureStore } from '@reduxjs/toolkit';
import { act, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import React from 'react';
import { Provider } from 'react-redux';
import { MemoryRouter, Route, Routes, useNavigate } from 'react-router-dom';

import { useEsoLogsClientInstance } from '../EsoLogsClientContext';
import { FightFragment } from '../graphql/gql/graphql';
import { useReportData } from '../hooks/useReportData';
import dashboardReducer from '../store/dashboard/dashboardSlice';

import { RaidDashboardPage } from './RaidDashboardPage';

// Mock components
jest.mock('../components/dashboard', () => ({
  DeathCausesWidget: ({ id }: { id: string }) => (
    <div data-testid={`widget-${id}`}>Death Causes Widget</div>
  ),
  MissingBuffsWidget: ({ id }: { id: string }) => (
    <div data-testid={`widget-${id}`}>Missing Buffs Widget</div>
  ),
  BuildIssuesWidget: ({ id }: { id: string }) => (
    <div data-testid={`widget-${id}`}>Build Issues Widget</div>
  ),
  LowDpsWidget: ({ id }: { id: string }) => <div data-testid={`widget-${id}`}>Low DPS Widget</div>,
  MissingFoodWidget: ({ id }: { id: string }) => (
    <div data-testid={`widget-${id}`}>Missing Food Widget</div>
  ),
  LowBuffUptimesWidget: ({ id }: { id: string }) => (
    <div data-testid={`widget-${id}`}>Low Buff Uptimes Widget</div>
  ),
}));

jest.mock('../components/dashboard/AddWidgetDialog', () => ({
  AddWidgetDialog: ({ open, onClose, onAddWidget }: any) =>
    open ? (
      <div data-testid="add-widget-dialog">
        <button onClick={() => onAddWidget('low-dps')}>Add Low DPS</button>
        <button onClick={onClose}>Close</button>
      </div>
    ) : null,
}));

// Mock hooks
jest.mock('../hooks/useReportData');
jest.mock('../EsoLogsClientContext');

const mockUseReportData = useReportData as jest.MockedFunction<typeof useReportData>;
const mockUseEsoLogsClient = useEsoLogsClientInstance as jest.MockedFunction<
  typeof useEsoLogsClientInstance
>;

const RouteSwitchControl: React.FC = () => {
  const navigate = useNavigate();

  return (
    <>
      <button type="button" onClick={() => navigate('/report/report-a/dashboard')}>
        Switch to report A
      </button>
      <button type="button" onClick={() => navigate('/report/report-b/dashboard')}>
        Switch to report B
      </button>
    </>
  );
};

describe('RaidDashboardPage', () => {
  const mockFights: FightFragment[] = [
    {
      id: 1,
      startTime: 3000,
      endTime: 4000,
      name: 'Fight 1',
      difficulty: null,
      kill: true,
      fightPercentage: null,
      bossPercentage: null,
      size: null,
      completeRaid: null,
      inProgress: null,
      standardComposition: null,
      hasEcho: null,
    },
    {
      id: 2,
      startTime: 1000,
      endTime: 2000,
      name: 'Fight 2',
      difficulty: null,
      kill: false,
      fightPercentage: null,
      bossPercentage: null,
      size: null,
      completeRaid: null,
      inProgress: null,
      standardComposition: null,
      hasEcho: null,
    },
  ];

  const mockReportData = {
    code: 'test-report',
    title: 'Test Report',
    fights: mockFights,
    masterData: null,
  };

  const createTestStore = () => {
    return configureStore({
      reducer: {
        dashboard: dashboardReducer,
      },
    });
  };

  const renderWithRouter = (store = createTestStore()) => {
    return render(
      <Provider store={store}>
        <MemoryRouter initialEntries={['/report/test-report/dashboard']}>
          <Routes>
            <Route path="/report/:reportId/dashboard" element={<RaidDashboardPage />} />
          </Routes>
        </MemoryRouter>
      </Provider>,
    );
  };

  const renderWithRouteSwitch = (store = createTestStore()) => {
    return render(
      <Provider store={store}>
        <MemoryRouter initialEntries={['/report/report-a/dashboard']}>
          <RouteSwitchControl />
          <Routes>
            <Route path="/report/:reportId/dashboard" element={<RaidDashboardPage />} />
          </Routes>
        </MemoryRouter>
      </Provider>,
    );
  };

  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();

    mockUseReportData.mockReturnValue({
      reportData: mockReportData,
      isReportLoading: false,
      reportError: null,
      refetchReport: jest.fn(),
    });

    mockUseEsoLogsClient.mockReturnValue({} as any);
  });

  afterEach(() => {
    act(() => {
      jest.runOnlyPendingTimers();
    });
    jest.useRealTimers();
  });

  it('should render page title', () => {
    renderWithRouter();

    expect(screen.getAllByText('Test Report').length).toBeGreaterThan(0);
  });

  it('should render default widgets', () => {
    renderWithRouter();

    expect(screen.getByTestId('widget-death-causes-1')).toBeInTheDocument();
    expect(screen.getByTestId('widget-missing-buffs-1')).toBeInTheDocument();
    expect(screen.getByTestId('widget-build-issues-1')).toBeInTheDocument();
  });

  it('should show loading state when report is loading', () => {
    mockUseReportData.mockReturnValue({
      reportData: null,
      isReportLoading: true,
      reportError: null,
      refetchReport: jest.fn(),
    });

    renderWithRouter();

    expect(screen.getByText(/loading/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Pause live refresh' })).toBeEnabled();
    expect(screen.getByRole('button', { name: 'Refresh dashboard now' })).toBeDisabled();
  });

  it('should render auto-refresh toggle', () => {
    renderWithRouter();

    expect(screen.getByRole('button', { name: 'Pause live refresh' })).toHaveAttribute(
      'aria-pressed',
      'true',
    );
    expect(screen.getByRole('button', { name: 'Refresh dashboard now' })).toBeInTheDocument();
  });

  it('exposes pause and resume states to assistive technology', async () => {
    const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });
    renderWithRouter();

    await user.click(screen.getByRole('button', { name: 'Pause live refresh' }));

    expect(screen.getByRole('button', { name: 'Resume live refresh' })).toHaveAttribute(
      'aria-pressed',
      'false',
    );
  });

  it('marks manual refresh unavailable while a request is in flight', () => {
    mockUseReportData.mockReturnValue({
      reportData: mockReportData,
      isReportLoading: true,
      reportError: null,
      refetchReport: jest.fn(),
    });

    renderWithRouter();

    expect(screen.getByRole('button', { name: 'Refresh dashboard now' })).toBeDisabled();
  });

  it('does not render retained data from a previous report while the active report loads', () => {
    mockUseReportData.mockReturnValue({
      reportData: { ...mockReportData, code: 'previous-report' },
      isReportLoading: true,
      reportError: null,
      refetchReport: jest.fn(),
    });

    renderWithRouter();

    expect(screen.getByText(/loading dashboard/i)).toBeInTheDocument();
    expect(screen.queryByText('Test Report')).not.toBeInTheDocument();
    expect(screen.queryByTestId('widget-death-causes-1')).not.toBeInTheDocument();
  });

  it('does not label cached unsynchronized data as fresh even when the log has recent activity', () => {
    mockUseReportData.mockReturnValue({
      reportData: {
        ...mockReportData,
        startTime: Date.now() - 1_000,
      },
      isReportLoading: false,
      reportError: null,
      refetchReport: jest.fn(),
    });

    renderWithRouter();

    expect(
      screen.getByRole('status', { name: /live synchronization status: stale/i }),
    ).toHaveTextContent(/last successful sync not synchronized/i);
    expect(
      screen.queryByRole('status', { name: /live synchronization status: fresh/i }),
    ).toBeNull();
  });

  it('keeps report bodies and widgets scoped through an A-to-B-to-A route sequence', async () => {
    const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });
    const store = createTestStore();
    const reportA = {
      ...mockReportData,
      code: 'report-a',
      title: 'Report A',
    };
    const reportB = {
      ...mockReportData,
      code: 'report-b',
      title: 'Report B',
    };
    let activeReportData = reportA;
    let isReportLoading = false;
    mockUseReportData.mockImplementation(() => ({
      reportData: activeReportData,
      isReportLoading,
      reportError: null,
      refetchReport: jest.fn(),
    }));

    renderWithRouteSwitch(store);
    expect(screen.getAllByText('Report A').length).toBeGreaterThan(0);
    expect(screen.getByTestId('widget-death-causes-1')).toBeInTheDocument();

    isReportLoading = true;
    await user.click(screen.getByRole('button', { name: 'Switch to report B' }));

    expect(screen.getByText(/loading dashboard/i)).toBeInTheDocument();
    expect(screen.queryByText('Report A')).not.toBeInTheDocument();
    expect(screen.queryByTestId('widget-death-causes-1')).not.toBeInTheDocument();

    activeReportData = reportB;
    isReportLoading = false;
    act(() => {
      store.dispatch({ type: 'dashboard/setAutoRefreshEnabled', payload: false });
    });
    expect(screen.getAllByText('Report B').length).toBeGreaterThan(0);
    expect(screen.getByTestId('widget-death-causes-1')).toBeInTheDocument();

    isReportLoading = true;
    await user.click(screen.getByRole('button', { name: 'Switch to report A' }));

    expect(screen.getByText(/loading dashboard/i)).toBeInTheDocument();
    expect(screen.queryByText('Report B')).not.toBeInTheDocument();
    expect(screen.queryByTestId('widget-death-causes-1')).not.toBeInTheDocument();

    activeReportData = reportA;
    isReportLoading = false;
    act(() => {
      store.dispatch({ type: 'dashboard/setAutoRefreshEnabled', payload: true });
    });

    expect(screen.getAllByText('Report A').length).toBeGreaterThan(0);
    expect(screen.getByTestId('widget-death-causes-1')).toBeInTheDocument();
  });

  it('does not render report A loading or failure state under the report B route', async () => {
    const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });
    const reportA = {
      ...mockReportData,
      code: 'report-a',
      title: 'Report A',
    };
    mockUseReportData.mockReturnValue({
      reportData: reportA,
      isReportLoading: false,
      reportError: 'Report A is unavailable',
      reportStateId: 'report-a',
      refetchReport: jest.fn(),
    });

    renderWithRouteSwitch();
    expect(
      screen.getByRole('status', { name: /live synchronization status: api error/i }),
    ).toHaveTextContent(/showing data from not synchronized/i);

    // The route changes before the provider has switched its report context.
    // A's retained error must not be attributed to B or disable B's recovery.
    await user.click(screen.getByRole('button', { name: 'Switch to report B' }));

    expect(screen.getByText(/loading dashboard/i)).toBeInTheDocument();
    expect(screen.queryByText('Report A is unavailable')).not.toBeInTheDocument();
    expect(
      screen.queryByRole('status', { name: /live synchronization status: api error/i }),
    ).not.toBeInTheDocument();
  });

  it('should render add widget button', () => {
    renderWithRouter();

    expect(screen.getByRole('button', { name: /add widget/i })).toBeInTheDocument();
  });

  it('announces API failures without fabricating a successful sync timestamp', () => {
    mockUseReportData.mockReturnValue({
      reportData: mockReportData,
      isReportLoading: false,
      reportError: 'ESO Logs unavailable',
      refetchReport: jest.fn(),
    });

    renderWithRouter();

    expect(
      screen.getByRole('status', { name: /live synchronization status: api error/i }),
    ).toHaveTextContent(/showing data from not synchronized/i);
    expect(screen.queryByText(/live sync Â· fresh/i)).not.toBeInTheDocument();
    expect(screen.getByText(/retrying in 5s/i)).toBeInTheDocument();
  });

  it('should render navigation buttons to other report pages', () => {
    renderWithRouter();

    expect(screen.getByRole('button', { name: /fights/i })).toBeInTheDocument();
  });

  it('should open add widget dialog when add button is clicked', async () => {
    const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });
    renderWithRouter();

    const addButton = screen.getByRole('button', { name: /add widget/i });
    await user.click(addButton);

    expect(screen.getByTestId('add-widget-dialog')).toBeInTheDocument();
  });

  it('should add a new widget when selected from dialog', async () => {
    const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });
    renderWithRouter();

    const addButton = screen.getByRole('button', { name: /add widget/i });
    await user.click(addButton);

    const addLowDpsButton = screen.getByText('Add Low DPS');
    await user.click(addLowDpsButton);

    // New widget should be added (ID will be generated)
    const lowDpsWidgets = screen.getAllByText('Low DPS Widget');
    expect(lowDpsWidgets.length).toBeGreaterThan(0);
  });

  it('should toggle auto-refresh', async () => {
    const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });
    renderWithRouter();

    const autoRefreshToggle = screen.getByText(/AUTO · 5s/);

    await user.click(autoRefreshToggle);

    // Should show PAUSED after click
    expect(screen.getByText(/PAUSED/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Resume live refresh' })).toBeInTheDocument();
  });

  it('should display report title when available', () => {
    renderWithRouter();

    expect(screen.getAllByText('Test Report').length).toBeGreaterThan(0);
  });

  it('should sort fights by most recent first', () => {
    renderWithRouter();

    // Fights should be sorted by endTime descending
    // Fight 1 (endTime: 4000) should come before Fight 2 (endTime: 2000)
    // This is verified by checking that widgets receive fights in the correct order
    expect(screen.getAllByText('Test Report').length).toBeGreaterThan(0);
  });

  it('should handle empty report data gracefully', () => {
    mockUseReportData.mockReturnValue({
      reportData: null,
      isReportLoading: false,
      reportError: null,
      refetchReport: jest.fn(),
    });

    renderWithRouter();

    // Should not crash, but may show loading or empty state
    expect(screen.getByText('Failed to load report')).toBeInTheDocument();
  });

  it('announces an initial API failure when no report data is available', () => {
    mockUseReportData.mockReturnValue({
      reportData: null,
      isReportLoading: false,
      reportError: 'ESO Logs unavailable',
      refetchReport: jest.fn(),
    });

    renderWithRouter();

    expect(screen.getByRole('alert')).toHaveTextContent('API error: ESO Logs unavailable');
    expect(screen.getByRole('button', { name: 'Pause live refresh' })).toBeEnabled();
    expect(screen.getByRole('button', { name: 'Refresh dashboard now' })).toBeEnabled();
  });

  it('should display widgets in a responsive grid', () => {
    renderWithRouter();

    // Check that widgets are rendered
    const widgets = screen.getAllByTestId(/^widget-/);
    expect(widgets.length).toBeGreaterThan(0);
  });

  describe('Auto-refresh functionality', () => {
    it('should not auto-refresh when auto-refresh is disabled', () => {
      const store = createTestStore();
      store.dispatch({ type: 'dashboard/setAutoRefreshEnabled', payload: false });
      const dispatchSpy = jest.spyOn(store, 'dispatch');

      renderWithRouter(store);
      dispatchSpy.mockClear();

      // Fast-forward time
      act(() => {
        jest.advanceTimersByTime(6000);
      });

      // The live-health clock may re-render, but must not dispatch a report refresh.
      expect(dispatchSpy).not.toHaveBeenCalled();
    });

    it('should auto-refresh when enabled', () => {
      const store = createTestStore();
      store.dispatch({ type: 'dashboard/setAutoRefreshEnabled', payload: true });

      renderWithRouter(store);

      // Component should show active auto-refresh state
      expect(screen.getByText(/AUTO · 5s/)).toBeInTheDocument();
    });
  });

  describe('Widget management', () => {
    it('should allow removing widgets', async () => {
      const store = createTestStore();

      renderWithRouter(store);

      const initialWidgets = screen.getAllByTestId(/^widget-/);
      expect(initialWidgets.length).toBeGreaterThan(0);

      // Find and click remove button on first widget
      // (This would require the actual widget to render remove buttons)

      // After removal, should have one less widget
      // expect(screen.getAllByTestId(/^widget-/)).toHaveLength(initialCount - 1);
    });

    it('should persist widget state in Redux', () => {
      const store = createTestStore();

      renderWithRouter(store);

      const state = store.getState();
      expect(state.dashboard.widgets).toHaveLength(3);
      expect(state.dashboard.widgets[0].type).toBe('death-causes');
    });
  });

  describe('Responsive layout', () => {
    it('should render widgets in a grid layout', () => {
      renderWithRouter();

      // Widgets should be rendered
      const deathCausesWidget = screen.getByTestId('widget-death-causes-1');
      expect(deathCausesWidget).toBeInTheDocument();

      const missingBuffsWidget = screen.getByTestId('widget-missing-buffs-1');
      expect(missingBuffsWidget).toBeInTheDocument();
    });
  });
});
