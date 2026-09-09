import { ThemeProvider, createTheme } from '@mui/material/styles';
import { render, screen } from '@testing-library/react';
import React from 'react';
import '@testing-library/jest-dom';

import type { FightFragment } from '../../graphql/gql/graphql';
import { useReportMasterData } from '../../hooks';
import { usePhaseTransitions } from '../../hooks/usePhaseTransitions';
import { TabId } from '../../utils/getSkeletonForTab';

import { FightDetailsView } from './FightDetailsView';
import { useFightNavigation } from './ReportFightHeader';

jest.mock('../../hooks', () => ({
  useReportMasterData: jest.fn(),
}));

jest.mock('../../hooks/usePhaseTransitions', () => ({
  usePhaseTransitions: jest.fn(),
}));

jest.mock('./ReportFightHeader', () => ({
  useFightNavigation: jest.fn(),
}));

jest.mock('./insights/CombinedFilterDropdown', () => ({
  CombinedFilterDropdown: () => null,
}));

jest.mock('./insights/PlayersPanel', () => ({
  PlayersPanel: () => null,
}));

const mockUseReportMasterData = useReportMasterData as jest.MockedFunction<
  typeof useReportMasterData
>;
const mockUsePhaseTransitions = usePhaseTransitions as jest.MockedFunction<
  typeof usePhaseTransitions
>;
const mockUseFightNavigation = useFightNavigation as jest.MockedFunction<typeof useFightNavigation>;

describe('FightDetailsView', () => {
  it('provides named navigation controls and an accessible tab panel', async () => {
    mockUseReportMasterData.mockReturnValue({
      isMasterDataLoading: false,
      reportMasterData: { actorsById: {} },
    } as never);
    mockUsePhaseTransitions.mockReturnValue({
      phaseTransitions: null,
      fightStartTime: 0,
      fightEndTime: 60_000,
      isLoading: false,
      source: null,
    });
    mockUseFightNavigation.mockReturnValue({
      navigationMode: 'all',
      navigationData: {
        currentIndex: 0,
        previousFight: null,
        nextFight: null,
        totalCount: 1,
        modeLabel: 'Fight',
        currentFightType: 'boss',
      },
      navigateToPrevious: jest.fn(),
      navigateToNext: jest.fn(),
      handleNavigationModeChange: jest.fn(),
    });

    const fight = {
      id: 1,
      startTime: 0,
      endTime: 60_000,
      friendlyPlayers: [],
      phaseTransitions: [],
    } as unknown as FightFragment;

    render(
      <ThemeProvider theme={createTheme()}>
        <FightDetailsView
          fight={fight}
          selectedTabId={TabId.PLAYERS}
          onTabChange={jest.fn()}
          showExperimentalTabs={false}
          onToggleExperimentalTabs={jest.fn()}
        />
      </ThemeProvider>,
    );

    expect(screen.getByRole('button', { name: 'Previous fight' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Next fight' })).toBeDisabled();
    expect(screen.getByRole('group', { name: 'Fight navigation mode' })).toBeInTheDocument();
    expect(screen.getByRole('status', { name: 'Fight 1 of 1' })).toBeInTheDocument();
    expect(screen.getByRole('tablist', { name: 'Fight detail sections' })).toBeInTheDocument();

    const playersTab = screen.getByRole('tab', { name: 'Players' });
    expect(playersTab).toHaveAttribute('aria-selected', 'true');
    expect(playersTab).toHaveAttribute('tabindex', '0');

    const panel = await screen.findByRole('tabpanel', { name: 'Players' });
    expect(playersTab).toHaveAttribute('id', 'fight-detail-tab-players');
    expect(playersTab).toHaveAttribute('aria-controls', 'fight-detail-panel-players');
    expect(panel).toHaveAttribute('id', 'fight-detail-panel-players');
    expect(panel).toHaveAttribute('aria-labelledby', 'fight-detail-tab-players');
    panel.focus();
    expect(panel).toHaveFocus();
    expect(panel).toHaveAttribute('tabindex', '0');
  });
});
