import { ThemeProvider, createTheme } from '@mui/material/styles';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import React from 'react';
import { useSelector } from 'react-redux';

import { useReportMasterData } from '../../../hooks';
import { useSelectedFight } from '../../../hooks/useSelectedFight';
import {
  selectSelectedFriendlyPlayerId,
  selectSelectedTargetIds,
} from '../../../store/ui/uiSelectors';
import { useAppDispatch } from '../../../store/useAppDispatch';

import { CombinedFilterDropdown } from './CombinedFilterDropdown';

jest.mock('react-redux', () => ({ useSelector: jest.fn() }));
jest.mock('../../../hooks', () => ({ useReportMasterData: jest.fn() }));
jest.mock('../../../hooks/useSelectedFight', () => ({ useSelectedFight: jest.fn() }));
jest.mock('../../../store/ui/uiSelectors', () => ({
  selectSelectedFriendlyPlayerId: jest.fn(),
  selectSelectedTargetIds: jest.fn(),
}));
jest.mock('../../../store/ui/uiSlice', () => ({
  setSelectedFriendlyPlayerId: (id: number | null) => ({ type: 'setPlayer', payload: id }),
  setSelectedTargetIds: (ids: number[]) => ({ type: 'setTargets', payload: ids }),
}));
jest.mock('../../../store/useAppDispatch', () => ({ useAppDispatch: jest.fn() }));

const mockedUseSelector = useSelector as jest.MockedFunction<typeof useSelector>;
const mockedUseReportMasterData = useReportMasterData as jest.MockedFunction<
  typeof useReportMasterData
>;
const mockedUseSelectedFight = useSelectedFight as jest.MockedFunction<typeof useSelectedFight>;
const mockedUseAppDispatch = useAppDispatch as jest.MockedFunction<typeof useAppDispatch>;

let dispatch: jest.Mock;
let selectedTargetIds: number[];
let selectedFriendlyPlayerId: number | null;

const renderFilter = () =>
  render(
    <ThemeProvider theme={createTheme({ palette: { mode: 'dark' } })}>
      <CombinedFilterDropdown players={[{ id: 2, name: 'A11y Player', displayName: 'Tester' }]} />
    </ThemeProvider>,
  );

describe('CombinedFilterDropdown accessibility', () => {
  beforeEach(() => {
    dispatch = jest.fn();
    selectedTargetIds = [];
    selectedFriendlyPlayerId = null;
    mockedUseAppDispatch.mockReturnValue(dispatch);
    mockedUseSelector.mockImplementation((selector) => {
      if (selector === selectSelectedTargetIds) return selectedTargetIds;
      if (selector === selectSelectedFriendlyPlayerId) return selectedFriendlyPlayerId;
      return undefined;
    });
    mockedUseSelectedFight.mockReturnValue({ enemyNPCs: [{ id: 1 }] } as ReturnType<
      typeof useSelectedFight
    >);
    mockedUseReportMasterData.mockReturnValue({
      reportMasterData: {
        actorsById: {
          1: { id: 1, name: 'A11y Boss', subType: 'Boss' },
        },
        abilitiesById: {},
        loaded: true,
      },
      isMasterDataLoading: false,
    } as ReturnType<typeof useReportMasterData>);
  });

  it('exposes its selected filters through a named dialog and native control state', async () => {
    const user = userEvent.setup();
    renderFilter();

    const trigger = screen.getByRole('button', {
      name: 'Filters: All Bosses; All Players',
    });
    expect(trigger).toHaveAttribute('aria-haspopup', 'dialog');
    expect(trigger).toHaveAttribute('aria-expanded', 'false');
    expect(trigger).toHaveStyle({ minHeight: '44px' });

    await user.tab();
    expect(trigger).toHaveFocus();
    expect(trigger).toHaveClass('Mui-focusVisible');

    await user.click(trigger);

    const dialog = screen.getByRole('dialog', { name: 'Analyzer filters' });
    expect(trigger).toHaveAttribute('aria-expanded', 'true');
    const targetFilters = within(dialog).getByRole('group', { name: 'Target filter' });
    const playerFilters = within(dialog).getByRole('radiogroup', { name: 'Player filter' });
    const allBosses = within(targetFilters).getByRole('checkbox', { name: 'All Bosses' });
    const allPlayers = within(playerFilters).getByRole('radio', { name: 'All Players' });
    expect(allBosses).toBeChecked();
    expect(allPlayers).toBeChecked();
    expect(allBosses.closest('label')).toHaveStyle({ minHeight: '44px' });

    await user.tab();
    expect(document.activeElement).not.toBe(document.body);
    await user.keyboard('{Escape}');
    expect(trigger).toHaveFocus();
  });

  it('keeps its name and filter state in sync with a selected player', async () => {
    const user = userEvent.setup();
    selectedFriendlyPlayerId = 2;
    renderFilter();

    const trigger = screen.getByRole('button', {
      name: 'Filters: All Bosses; A11y Player (Tester)',
    });
    await user.click(trigger);

    const dialog = screen.getByRole('dialog', { name: 'Analyzer filters' });
    const playerFilters = within(dialog).getByRole('radiogroup', { name: 'Player filter' });
    const selectedPlayer = within(playerFilters).getByRole('radio', { name: /A11y Player Tester/ });
    expect(selectedPlayer).toBeChecked();

    const allPlayers = within(playerFilters).getByRole('radio', { name: 'All Players' });
    await user.click(allPlayers);
    expect(dispatch).toHaveBeenCalledWith({ type: 'setPlayer', payload: null });
  });

  it('omits the target summary when the fight has no target filter', () => {
    mockedUseSelectedFight.mockReturnValue({ enemyNPCs: [] } as unknown as ReturnType<
      typeof useSelectedFight
    >);
    renderFilter();

    expect(screen.getByRole('button', { name: 'Filters: All Players' })).toBeInTheDocument();
  });
});
