import { ThemeProvider, createTheme } from '@mui/material/styles';
import { act, render, screen } from '@testing-library/react';
import React from 'react';
import { MemoryRouter } from 'react-router-dom';
import '@testing-library/jest-dom';

import { useCurrentFight, useReportData } from '@/hooks';
import { useSelectedReportAndFight } from '@/ReportFightContext';

import { ReportFightHeader } from './ReportFightHeader';

jest.mock('@mui/material', () => ({
  ...jest.requireActual('@mui/material'),
  useMediaQuery: jest.fn(),
}));

jest.mock('@/hooks', () => ({
  useCurrentFight: jest.fn(),
  useReportData: jest.fn(),
}));

jest.mock('@/ReportFightContext', () => ({
  useSelectedReportAndFight: jest.fn(),
}));

jest.mock('@/store/events_data/combatantInfoEventsSelectors', () => ({
  selectCombatantInfoEvents: jest.fn(),
}));

jest.mock('@/store/player_data/playerDataSelectors', () => ({
  selectActivePlayersById: jest.fn(),
}));

jest.mock('react-redux', () => ({
  ...jest.requireActual('react-redux'),
  useSelector: jest.fn(),
}));

const mockUseMediaQuery = jest.requireMock('@mui/material').useMediaQuery as jest.Mock;
const mockUseCurrentFight = useCurrentFight as jest.MockedFunction<typeof useCurrentFight>;
const mockUseReportData = useReportData as jest.MockedFunction<typeof useReportData>;
const mockUseSelectedReportAndFight = useSelectedReportAndFight as jest.MockedFunction<
  typeof useSelectedReportAndFight
>;
const mockUseSelector = jest.requireMock('react-redux').useSelector as jest.Mock;

const fight = {
  id: 7,
  name: 'Training Dummy',
  startTime: 1_000,
  endTime: 61_000,
  difficulty: null,
  bossPercentage: null,
  kill: true,
} as never;

function renderHeader(isMobile: boolean) {
  mockUseMediaQuery.mockReturnValue(isMobile);
  mockUseSelectedReportAndFight.mockReturnValue({ reportId: 'REPORT', fightId: '7' });
  mockUseCurrentFight.mockReturnValue({ fight, isFightLoading: false });
  mockUseReportData.mockReturnValue({ reportData: { fights: [fight] } } as never);
  mockUseSelector
    .mockImplementationOnce(() => ({ player: { id: 1, role: 'dps' } }))
    .mockImplementationOnce(() => []);

  return render(
    <ThemeProvider
      theme={createTheme({
        components: {
          MuiButtonBase: { defaultProps: { disableRipple: true } },
        },
      })}
    >
      <MemoryRouter>
        <ReportFightHeader />
      </MemoryRouter>
    </ThemeProvider>,
  );
}

function getHeaderControls() {
  return [
    screen.getByRole('button', { name: 'Back to Fight List' }),
    screen.getByRole('button', { name: 'Interactive Fight Replay' }),
    screen.getByRole('link', { name: 'View full report on ESO Logs' }),
    screen.getByRole('button', { name: "Create a roster from this fight's players" }),
  ];
}

describe('ReportFightHeader accessibility', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseSelector.mockReturnValue([]);
  });

  it.each([false, true])('exposes named controls with 44px targets in %s mode', (isMobile) => {
    renderHeader(isMobile);

    const controls = getHeaderControls();
    for (const control of controls) {
      expect(control).toHaveAccessibleName();
      expect(getComputedStyle(control).minHeight).toBe('44px');
      act(() => control.focus());
      expect(control).toHaveFocus();
    }

    if (isMobile) {
      for (const control of controls) {
        expect(getComputedStyle(control).minWidth).toBe('44px');
        expect(getComputedStyle(control).width).toBe('44px');
      }
    }
  });

  it('emits an explicit high-contrast focus-visible outline for header controls', () => {
    renderHeader(true);

    const cssRules = Array.from(document.styleSheets).flatMap((styleSheet) => {
      try {
        return Array.from(styleSheet.cssRules, (rule) => rule.cssText);
      } catch {
        return [];
      }
    });

    expect(
      cssRules.some(
        (rule) =>
          rule.includes(':focus-visible') && rule.includes('outline') && rule.includes('3px'),
      ),
    ).toBe(true);
  });
});
