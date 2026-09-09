import { ThemeProvider, createTheme } from '@mui/material/styles';
import { fireEvent, render, screen } from '@testing-library/react';
import React from 'react';
import { useSelector } from 'react-redux';
import '@testing-library/jest-dom';

import { useReportMasterData } from '../../../hooks';
import { useSelectedFight } from '../../../hooks/useSelectedFight';
import { useAppDispatch } from '../../../store/useAppDispatch';

import { CombinedFilterDropdown } from './CombinedFilterDropdown';

jest.mock('react-redux', () => ({
  useSelector: jest.fn(),
}));

jest.mock('../../../hooks', () => ({
  useReportMasterData: jest.fn(),
}));

jest.mock('../../../hooks/useSelectedFight', () => ({
  useSelectedFight: jest.fn(),
}));

jest.mock('../../../store/useAppDispatch', () => ({
  useAppDispatch: jest.fn(),
}));

const mockUseSelector = useSelector as jest.MockedFunction<typeof useSelector>;
const mockUseReportMasterData = useReportMasterData as jest.MockedFunction<
  typeof useReportMasterData
>;
const mockUseSelectedFight = useSelectedFight as jest.MockedFunction<typeof useSelectedFight>;
const mockUseAppDispatch = useAppDispatch as jest.MockedFunction<typeof useAppDispatch>;

describe('CombinedFilterDropdown', () => {
  it('provides native checkbox and radio controls with named selected states', () => {
    const dispatch = jest.fn();
    mockUseAppDispatch.mockReturnValue(dispatch);
    mockUseSelector.mockReturnValue([] as never);
    mockUseSelectedFight.mockReturnValue({
      enemyNPCs: [{ id: 7 }],
    } as never);
    mockUseReportMasterData.mockReturnValue({
      isMasterDataLoading: false,
      reportMasterData: {
        actorsById: {
          7: { id: 7, name: 'Test Boss', subType: 'Boss' },
        },
      },
    } as never);

    render(
      <ThemeProvider theme={createTheme()}>
        <CombinedFilterDropdown players={[{ id: 42, name: 'Aria' }]} />
      </ThemeProvider>,
    );

    const trigger = screen.getByRole('button', { name: /all bosses.*player/i });
    trigger.focus();
    expect(trigger).toHaveFocus();
    expect(trigger).toHaveAttribute('aria-haspopup', 'dialog');
    expect(trigger).toHaveAttribute('aria-expanded', 'false');

    fireEvent.click(trigger);

    const dialog = screen.getByRole('dialog', { name: 'Fight filters' });
    expect(dialog).toBeInTheDocument();
    expect(screen.getByRole('group', { name: 'Target filter' })).toBeInTheDocument();
    expect(screen.getByRole('radiogroup', { name: 'Player filter' })).toBeInTheDocument();
    expect(screen.getByRole('checkbox', { name: 'All Bosses' })).toBeChecked();
    expect(screen.getByRole('radio', { name: 'Aria' })).not.toBeChecked();

    const playerControl = screen.getByRole('radio', { name: 'Aria' });
    playerControl.focus();
    expect(playerControl).toHaveFocus();
    fireEvent.click(playerControl);
    expect(dispatch).toHaveBeenCalled();
  });
});
