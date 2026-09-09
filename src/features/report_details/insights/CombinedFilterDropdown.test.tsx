import { ThemeProvider, createTheme } from '@mui/material/styles';
import { act, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import React from 'react';
import { useSelector } from 'react-redux';

import '@testing-library/jest-dom';

import type { ReportActorFragment, FightFragment } from '../../../graphql/gql/graphql';
import { useReportMasterData } from '../../../hooks';
import { useSelectedFight } from '../../../hooks/useSelectedFight';
import { ALL_ENEMIES_SENTINEL, ALL_TARGETS_SENTINEL } from '../../../hooks/useSelectedTargetIds';
import { selectSelectedTargetIds } from '../../../store/ui/uiSelectors';
import { setSelectedFriendlyPlayerId, setSelectedTargetIds } from '../../../store/ui/uiSlice';
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

const theme = createTheme();
const dispatch = jest.fn();
const mockedUseSelector = useSelector as unknown as jest.Mock;
const mockedUseReportMasterData = useReportMasterData as jest.MockedFunction<
  typeof useReportMasterData
>;
const mockedUseSelectedFight = useSelectedFight as jest.MockedFunction<typeof useSelectedFight>;
const mockedUseAppDispatch = useAppDispatch as jest.MockedFunction<typeof useAppDispatch>;

type FilterState = {
  selectedTargetIds: number[];
  selectedFriendlyPlayerId: number | null;
};

const actorsById = {
  101: { id: 101, name: 'Trial Boss', subType: 'Boss' },
  102: { id: 102, name: 'Twin Add', subType: 'NPC' },
  103: { id: 103, name: 'Twin Add', subType: 'NPC' },
  104: { id: 104, name: 'Twin Add', subType: 'Boss' },
  105: { id: 105, name: 'Unique Add', subType: 'NPC' },
  106: { id: 106, name: '', subType: 'NPC' },
} as unknown as Record<number, ReportActorFragment>;

const fightWithTargets = {
  enemyNPCs: [
    { id: 101 },
    { id: 102 },
    { id: 103 },
    { id: 104 },
    { id: 105 },
    { id: 106 },
    { id: 999 }, // Actor metadata is intentionally missing.
    null,
  ],
} as unknown as FightFragment;

const players = [
  { id: 11, name: 'Aria', displayName: 'Ari' },
  { id: 22, name: 'Bastian', displayName: null },
];

const renderDropdown = (
  state: FilterState = { selectedTargetIds: [], selectedFriendlyPlayerId: null },
  fight: FightFragment | null = fightWithTargets,
) => {
  const testState = {
    ui: {
      selectedTargetIds: state.selectedTargetIds,
      selectedFriendlyPlayerId: state.selectedFriendlyPlayerId,
    },
  } as unknown as Parameters<typeof selectSelectedTargetIds>[0];

  mockedUseSelector.mockImplementation((selector: (value: typeof testState) => unknown) =>
    selector(testState),
  );
  mockedUseReportMasterData.mockReturnValue({
    reportMasterData: { actorsById, abilitiesById: {}, loaded: true },
    isMasterDataLoading: false,
  });
  mockedUseSelectedFight.mockReturnValue(fight);
  mockedUseAppDispatch.mockReturnValue(dispatch);

  return render(
    <ThemeProvider theme={theme}>
      <CombinedFilterDropdown players={players} />
    </ThemeProvider>,
  );
};

beforeEach(() => {
  jest.clearAllMocks();
});

describe('CombinedFilterDropdown', () => {
  it('exposes labelled target and player listboxes with aggregate and filtered targets', async () => {
    const user = userEvent.setup();
    renderDropdown();

    const trigger = screen.getByRole('button', { name: /All Bosses.*All Players/ });
    expect(trigger).toHaveAttribute('aria-haspopup', 'dialog');
    expect(trigger).toHaveAttribute('aria-expanded', 'false');

    await user.click(trigger);

    const targetList = screen.getByRole('listbox', { name: 'Target filter' });
    expect(targetList).toHaveAttribute('aria-multiselectable', 'true');
    expect(within(targetList).getByRole('option', { name: 'All Bosses' })).toHaveAttribute(
      'aria-selected',
      'true',
    );
    expect(within(targetList).getByRole('option', { name: 'All Enemies' })).toHaveAttribute(
      'aria-selected',
      'false',
    );

    // Unique names remain selectable, while duplicate non-boss names are
    // collapsed and the authoritative duplicate-name boss remains visible.
    expect(within(targetList).getByRole('option', { name: 'Trial Boss' })).toBeInTheDocument();
    expect(within(targetList).getByRole('option', { name: 'Unique Add' })).toBeInTheDocument();
    expect(within(targetList).getAllByRole('option', { name: 'Twin Add' })).toHaveLength(1);
    expect(within(targetList).getByText('Twin Add')).toBeInTheDocument();
    // Missing actor metadata and unnamed actors must not become phantom
    // options. The two aggregate options plus three valid actor options are
    // the complete target list for this fixture.
    expect(within(targetList).getAllByRole('option')).toHaveLength(5);

    const playerList = screen.getByRole('listbox', { name: 'Player filter' });
    expect(playerList).toBeInTheDocument();
    expect(within(playerList).getByRole('option', { name: 'Aria Ari' })).toHaveAttribute(
      'aria-selected',
      'false',
    );
  });

  it('dispatches aggregate target scopes and replaces an aggregate with an individual target', async () => {
    const user = userEvent.setup();
    renderDropdown();
    await user.click(screen.getByRole('button', { name: /All Bosses.*All Players/ }));

    const targetList = screen.getByRole('listbox', { name: 'Target filter' });
    await user.click(within(targetList).getByRole('option', { name: 'All Enemies' }));
    expect(dispatch).toHaveBeenCalledWith(setSelectedTargetIds([ALL_ENEMIES_SENTINEL]));

    dispatch.mockClear();
    await user.click(within(targetList).getByRole('option', { name: 'Trial Boss' }));
    expect(dispatch).toHaveBeenCalledWith(setSelectedTargetIds([101]));

    dispatch.mockClear();
    await user.click(within(targetList).getByRole('option', { name: 'All Bosses' }));
    expect(dispatch).toHaveBeenCalledWith(setSelectedTargetIds([ALL_TARGETS_SENTINEL]));
  });

  it('supports keyboard focus and activation for target and player controls', async () => {
    const user = userEvent.setup();
    renderDropdown();

    const trigger = screen.getByRole('button', { name: /All Bosses.*All Players/ });
    await user.tab();
    expect(trigger).toHaveFocus();
    await user.keyboard('{Enter}');

    const targetList = await screen.findByRole('listbox', { name: 'Target filter' });
    const allEnemies = within(targetList).getByRole('option', { name: 'All Enemies' });
    act(() => allEnemies.focus());
    expect(allEnemies).toHaveFocus();
    await user.keyboard('{Enter}');
    expect(dispatch).toHaveBeenCalledWith(setSelectedTargetIds([ALL_ENEMIES_SENTINEL]));

    const playerList = screen.getByRole('listbox', { name: 'Player filter' });
    const player = within(playerList).getByRole('option', { name: 'Bastian' });
    act(() => player.focus());
    expect(player).toHaveFocus();
    await user.keyboard('{Enter}');
    expect(dispatch).toHaveBeenCalledWith(setSelectedFriendlyPlayerId(22));
  });

  it('keeps the player filter explicit when a fight has no target actor records', async () => {
    const user = userEvent.setup();
    renderDropdown({ selectedTargetIds: [], selectedFriendlyPlayerId: null }, {
      enemyNPCs: [],
    } as unknown as FightFragment);
    await user.click(screen.getByRole('button', { name: /All Players/ }));

    expect(screen.queryByRole('listbox', { name: 'Target filter' })).not.toBeInTheDocument();
    const playerList = screen.getByRole('listbox', { name: 'Player filter' });
    expect(within(playerList).getByRole('option', { name: 'All Players' })).toHaveAttribute(
      'aria-selected',
      'true',
    );
    expect(within(playerList).getByRole('option', { name: 'Aria Ari' })).toBeInTheDocument();
  });
});
