import { act, render, screen } from '@testing-library/react';
import React from 'react';
import '@testing-library/jest-dom';

import { ReportFragment } from '../../graphql/gql/graphql';
import { useReportData } from '../../hooks';

import { ReportFights } from './ReportFights';

jest.mock('../../hooks', () => ({
  useReportData: jest.fn(),
}));

jest.mock('../../ReportFightContext', () => ({
  useSelectedReportAndFight: () => ({ reportId: 'ABC123', fightId: null }),
}));

jest.mock('../../components/DynamicMetaTags', () => ({
  DynamicMetaTags: () => null,
}));

// Probe stand-in: exposes the props the container computes so the tests can
// assert card stability without rendering the real (MUI-heavy) view.
jest.mock('./ReportFightsView', () => ({
  ReportFightsView: (props: { stillProcessing?: boolean; loading: boolean }) => (
    <div
      data-testid="view"
      data-still-processing={String(Boolean(props.stillProcessing))}
      data-loading={String(props.loading)}
    />
  ),
}));

const mockUseReportData = useReportData as jest.MockedFunction<typeof useReportData>;

const makeReport = (endTime: number): ReportFragment =>
  ({
    code: 'ABC123',
    title: 'Fresh upload',
    startTime: endTime - 60_000,
    endTime,
    visibility: 'public',
    zone: null,
    owner: null,
    fights: [],
    phases: null,
  }) as unknown as ReportFragment;

const hookState = (overrides: Partial<ReturnType<typeof useReportData>> = {}) => ({
  reportData: makeReport(Date.now() - 5 * 60 * 1000), // ended 5 min ago → still processing
  isReportLoading: false,
  reportError: null,
  refetchReport: jest.fn(),
  ...overrides,
});

describe('ReportFights still-processing auto-recheck', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
    jest.clearAllMocks();
  });

  it('re-checks every 30s and stops at the cap (10 checks), never unbounded', () => {
    const state = hookState();
    mockUseReportData.mockReturnValue(state);

    render(<ReportFights />);

    // Advance well past the cap: 20 ticks of 30s.
    for (let i = 0; i < 20; i++) {
      act(() => {
        jest.advanceTimersByTime(30_000);
      });
    }

    expect(state.refetchReport).toHaveBeenCalledTimes(10);
  });

  it('keeps the still-processing card up while a background re-check is in flight', () => {
    // During a poll the slice flips to loading with the empty data still
    // present. The card must neither fall back to the permanent "Empty Log"
    // variant nor blank to a skeleton — either would flicker every 30s.
    mockUseReportData.mockReturnValue(hookState({ isReportLoading: true }));

    render(<ReportFights />);

    const view = screen.getByTestId('view');
    expect(view).toHaveAttribute('data-still-processing', 'true');
    expect(view).toHaveAttribute('data-loading', 'false');
  });

  it('does not poll an OLD empty report (permanent Empty Log case)', () => {
    const state = hookState({
      reportData: makeReport(Date.now() - 3 * 60 * 60 * 1000), // 3 h old
    });
    mockUseReportData.mockReturnValue(state);

    render(<ReportFights />);

    act(() => {
      jest.advanceTimersByTime(10 * 60_000);
    });

    expect(state.refetchReport).not.toHaveBeenCalled();
    expect(screen.getByTestId('view')).toHaveAttribute('data-still-processing', 'false');
  });

  it('stops polling once fights appear (report healed)', () => {
    const state = hookState();
    mockUseReportData.mockReturnValue(state);

    const { rerender } = render(<ReportFights />);
    act(() => {
      jest.advanceTimersByTime(30_000);
    });
    expect(state.refetchReport).toHaveBeenCalledTimes(1);

    // The re-check found fights: the report healed.
    const healed = {
      ...makeReport(Date.now() - 5 * 60 * 1000),
      fights: [{ id: 1 }],
    } as unknown as ReportFragment;
    mockUseReportData.mockReturnValue(hookState({ reportData: healed }));
    rerender(<ReportFights />);

    act(() => {
      jest.advanceTimersByTime(10 * 60_000);
    });
    // No further polls after healing.
    expect(state.refetchReport).toHaveBeenCalledTimes(1);
  });
});
