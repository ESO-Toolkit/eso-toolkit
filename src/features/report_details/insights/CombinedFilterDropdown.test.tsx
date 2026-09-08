import { fireEvent, render, screen } from '@testing-library/react';
import { useSelector } from 'react-redux';

import { useReportMasterData } from '../../../hooks';
import { useSelectedFight } from '../../../hooks/useSelectedFight';
import { ALL_ENEMIES_SENTINEL } from '../../../hooks/useSelectedTargetIds';
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

const mockUseSelector = jest.mocked(useSelector);
const mockUseReportMasterData = jest.mocked(useReportMasterData);
const mockUseSelectedFight = jest.mocked(useSelectedFight);
const mockUseAppDispatch = jest.mocked(useAppDispatch);

describe('CombinedFilterDropdown', () => {
  const dispatch = jest.fn();

  beforeEach(() => {
    dispatch.mockClear();
    mockUseAppDispatch.mockReturnValue(dispatch);
    mockUseSelector.mockReturnValueOnce([]).mockReturnValueOnce(null);
    mockUseSelectedFight.mockReturnValue({
      id: 1,
      startTime: 0,
      endTime: 10_000,
      enemyNPCs: [{ id: 10 }, { id: 11 }, { id: 12 }, { id: 99 }],
    } as ReturnType<typeof useSelectedFight>);
    mockUseReportMasterData.mockReturnValue({
      isMasterDataLoading: false,
      reportMasterData: {
        actorsById: {
          10: { id: 10, name: 'Real Boss', type: 'NPC', subType: 'Boss' },
          11: { id: 11, name: 'Duplicate Add', type: 'NPC', subType: 'NPC' },
          12: { id: 12, name: 'Duplicate Add', type: 'NPC', subType: 'NPC' },
        },
      },
    } as unknown as ReturnType<typeof useReportMasterData>);
  });

  it('keeps duplicate enemies selectable by identity and exposes aggregate scopes', () => {
    render(<CombinedFilterDropdown players={[]} />);

    const trigger = screen.getByRole('button', { name: /All Bosses.*All Players/i });
    expect(trigger).toHaveAttribute('aria-expanded', 'false');
    fireEvent.click(trigger);

    expect(trigger).toHaveAttribute('aria-expanded', 'true');
    expect(screen.getByRole('dialog', { name: 'Analyzer filters' })).toBeInTheDocument();

    expect(screen.getByRole('option', { name: /All Bosses/i })).toHaveAttribute(
      'aria-selected',
      'true',
    );
    expect(screen.getByRole('option', { name: /All Enemies/i })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: /Real Boss/i })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: /Duplicate Add \(#11\)/i })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: /Duplicate Add \(#12\)/i })).toBeInTheDocument();

    fireEvent.click(screen.getByRole('option', { name: /All Enemies/i }));
    expect(dispatch).toHaveBeenCalledWith(
      expect.objectContaining({ payload: [ALL_ENEMIES_SENTINEL] }),
    );
  });
});
