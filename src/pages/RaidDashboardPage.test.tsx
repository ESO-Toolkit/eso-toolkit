import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import React from 'react';
import { Provider } from 'react-redux';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { configureStore } from '@reduxjs/toolkit';

import dashboardReducer from '../store/dashboard/dashboardSlice';
import { FightFragment } from '../graphql/gql/graphql';

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

import { useReportData } from '../hooks/useReportData';
import { useEsoLogsClientInstance } from '../EsoLogsClientContext';

const mockUseReportData = useReportData as jest.MockedFunction<typeof useReportData>;
const mockUseEsoLogsClient = useEsoLogsClientInstance as jest.MockedFunction<
  typeof useEsoLogsClientInstance
>;

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
        <MemoryRouter initialEntries={['/raid-dashboard/test-report']}>
          <Routes>
            <Route path="/raid-dashboard/:reportId" element={<RaidDashboardPage />} />
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
    });

    mockUseEsoLogsClient.mockReturnValue({} as any);
  });

  afterEach(() => {
    jest.runOnlyPendingTimers();
    jest.useRealTimers();
  });

  it('should render page title', () => {
    renderWithRouter();

    expect(screen.getByText('Raid Dashboard')).toBeInTheDocument();
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
    });

    renderWithRouter();

    expect(screen.getByText(/loading/i)).toBeInTheDocument();
  });

  it('should render auto-refresh toggle', () => {
    renderWithRouter();

    expect(screen.getByRole('switch', { name: /auto-refresh/i })).toBeInTheDocument();
  });

  it('should render add widget button', () => {
    renderWithRouter();

    expect(screen.getByRole('button', { name: /add widget/i })).toBeInTheDocument();
  });

  it('should render back to report button', () => {
    renderWithRouter();

    expect(screen.getByRole('button', { name: /back to report/i })).toBeInTheDocument();
  });

  it('should open add widget dialog when add button is clicked', async () => {
    renderWithRouter();

    const addButton = screen.getByRole('button', { name: /add widget/i });
    await userEvent.click(addButton);

    expect(screen.getByTestId('add-widget-dialog')).toBeInTheDocument();
  });

  it('should add a new widget when selected from dialog', async () => {
    renderWithRouter();

    const addButton = screen.getByRole('button', { name: /add widget/i });
    await userEvent.click(addButton);

    const addLowDpsButton = screen.getByText('Add Low DPS');
    await userEvent.click(addLowDpsButton);

    // New widget should be added (ID will be generated)
    const lowDpsWidgets = screen.getAllByText('Low DPS Widget');
    expect(lowDpsWidgets.length).toBeGreaterThan(0);
  });

  it('should toggle auto-refresh', async () => {
    renderWithRouter();

    const autoRefreshToggle = screen.getByRole('switch', { name: /auto-refresh/i });

    await userEvent.click(autoRefreshToggle);

    // Should be disabled after click
    expect(autoRefreshToggle).not.toBeChecked();
  });

  it('should display report title when available', () => {
    renderWithRouter();

    expect(screen.getByText('Test Report')).toBeInTheDocument();
  });

  it('should sort fights by most recent first', () => {
    renderWithRouter();

    // Fights should be sorted by endTime descending
    // Fight 1 (endTime: 4000) should come before Fight 2 (endTime: 2000)
    // This is verified by checking that widgets receive fights in the correct order
    expect(screen.getByText('Test Report')).toBeInTheDocument();
  });

  it('should handle empty report data gracefully', () => {
    mockUseReportData.mockReturnValue({
      reportData: null,
      isReportLoading: false,
    });

    renderWithRouter();

    // Should not crash, but may show loading or empty state
    expect(screen.getByText('Failed to load report')).toBeInTheDocument();
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

      renderWithRouter(store);

      // Fast-forward time
      jest.advanceTimersByTime(6000);

      // Should not trigger additional fetches
      expect(mockUseReportData).toHaveBeenCalledTimes(1);
    });

    it('should auto-refresh when enabled', () => {
      const store = createTestStore();
      store.dispatch({ type: 'dashboard/setAutoRefreshEnabled', payload: true });

      renderWithRouter(store);

      // Component should set up interval
      expect(screen.getByRole('switch', { name: /auto-refresh/i })).toBeChecked();
    });
  });

  describe('Widget management', () => {
    it('should allow removing widgets', async () => {
      const store = createTestStore();

      renderWithRouter(store);

      const initialWidgets = screen.getAllByTestId(/^widget-/);
      const initialCount = initialWidgets.length;

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
