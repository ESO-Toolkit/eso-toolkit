import { fireEvent, render, screen } from '@testing-library/react';
import React from 'react';
import '@testing-library/jest-dom';

import { useReportData } from '../../hooks';
import { preloadReportFightDetails } from '../../utils/reportRoutePreload';

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

jest.mock('../../utils/reportRoutePreload', () => ({
  preloadReportFightDetails: jest.fn(),
}));

jest.mock('./ReportFightsView', () => ({
  ReportFightsView: ({
    onFightIntent,
  }: {
    onFightIntent?: (intent: 'pointer' | 'focus' | 'touch') => void;
  }) => (
    <>
      <button
        type="button"
        onPointerEnter={() => onFightIntent?.('pointer')}
        onFocus={() => onFightIntent?.('focus')}
        onTouchStart={() => onFightIntent?.('touch')}
      >
        Target fight
      </button>
      <button type="button">Check again</button>
    </>
  ),
}));

const mockUseReportData = useReportData as jest.MockedFunction<typeof useReportData>;
const mockPreloadReportFightDetails = preloadReportFightDetails as jest.MockedFunction<
  typeof preloadReportFightDetails
>;

describe('ReportFights prefetch wiring', () => {
  const originalConnection = Object.getOwnPropertyDescriptor(navigator, 'connection');

  const setConnection = (
    connection: { effectiveType?: string; saveData?: boolean } | undefined,
  ) => {
    Object.defineProperty(navigator, 'connection', { configurable: true, value: connection });
  };

  beforeEach(() => {
    jest.clearAllMocks();
    setConnection(undefined);
    mockUseReportData.mockReturnValue({
      reportData: null,
      isReportLoading: false,
      reportError: null,
      refetchReport: jest.fn(),
    } as ReturnType<typeof useReportData>);
  });

  afterAll(() => {
    if (originalConnection) {
      Object.defineProperty(navigator, 'connection', originalConnection);
    } else {
      Reflect.deleteProperty(navigator, 'connection');
    }
  });

  it.each([
    ['Save-Data', { saveData: true }],
    ['3g', { effectiveType: '3g' }],
  ])(
    'suppresses actual fight-detail preloading on pointer intent with %s',
    (_label, connection) => {
      setConnection(connection);
      render(<ReportFights />);

      fireEvent.pointerEnter(screen.getAllByRole('button', { name: 'Target fight' })[0]);

      expect(mockPreloadReportFightDetails).not.toHaveBeenCalled();
    },
  );

  it.each([
    ['Save-Data', { saveData: true }],
    ['3g', { effectiveType: '3g' }],
  ])(
    'suppresses actual fight-detail preloading on keyboard focus with %s',
    (_label, connection) => {
      setConnection(connection);
      render(<ReportFights />);

      fireEvent.focus(screen.getAllByRole('button', { name: 'Target fight' })[0]);

      expect(mockPreloadReportFightDetails).not.toHaveBeenCalled();
    },
  );

  it.each([
    ['Save-Data', { saveData: true }],
    ['3g', { effectiveType: '3g' }],
  ])('suppresses actual fight-detail preloading on touch intent with %s', (_label, connection) => {
    setConnection(connection);
    render(<ReportFights />);

    fireEvent.touchStart(screen.getAllByRole('button', { name: 'Target fight' })[0]);

    expect(mockPreloadReportFightDetails).not.toHaveBeenCalled();
  });

  it('only preloads when the targeted fight control receives intent', () => {
    render(<ReportFights />);

    fireEvent.touchStart(screen.getByRole('button', { name: 'Check again' }));
    expect(mockPreloadReportFightDetails).not.toHaveBeenCalled();

    fireEvent.pointerEnter(screen.getByRole('button', { name: 'Target fight' }));
    expect(mockPreloadReportFightDetails).toHaveBeenCalledTimes(1);
  });
});
