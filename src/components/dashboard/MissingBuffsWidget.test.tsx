import { render, screen } from '@testing-library/react';
import React from 'react';

import type { FightFragment } from '../../graphql/gql/graphql';
import { usePlayerData } from '../../hooks/usePlayerData';
import { useMultiFightBuffLookup } from '../../hooks/workerTasks/useMultiFightBuffLookup';

import { MissingBuffsWidget } from './MissingBuffsWidget';

jest.mock('../../hooks/usePlayerData', () => ({ usePlayerData: jest.fn() }));
jest.mock('../../hooks/workerTasks/useMultiFightBuffLookup', () => ({
  useMultiFightBuffLookup: jest.fn(),
}));
jest.mock('./BaseWidget', () => ({
  BaseWidget: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));
jest.mock('../ClassIcon', () => ({ ClassIcon: () => null }));

const mockUsePlayerData = jest.mocked(usePlayerData);
const mockUseMultiFightBuffLookup = jest.mocked(useMultiFightBuffLookup);

const fights: FightFragment[] = [
  {
    id: 1,
    startTime: 0,
    endTime: 1000,
    name: 'Update 51 hybrid buff',
    encounterID: 0,
    difficulty: null,
    kill: true,
    bossPercentage: null,
  },
];

const playerData = {
  playersById: {
    7: {
      id: 7,
      name: 'Arcanist',
      guid: 123,
      type: 'Arcanist',
      server: 'NA',
      displayName: '@arcanist',
      anonymous: false,
      icon: 'arcanist.png',
      specs: [],
      potionUse: 0,
      healthstoneUse: 0,
      combatantInfo: { stats: [], talents: [], gear: [] },
      role: 'dps' as const,
    },
  },
  status: 'succeeded' as const,
  error: null,
  cacheMetadata: { lastFetchedTimestamp: null, playerCount: 1 },
  currentRequest: null,
};

const renderWidget = () =>
  render(
    <MissingBuffsWidget
      id="missing-buffs"
      scope="most-recent"
      reportId="REPORT"
      fights={fights}
      onRemove={jest.fn()}
      onScopeChange={jest.fn()}
    />,
  );

describe('MissingBuffsWidget Update 51 hybrid buff', () => {
  beforeEach(() => {
    mockUsePlayerData.mockReturnValue({ playerData, isPlayerDataLoading: false });
  });

  it('does not report Major Brutality missing when the combined hybrid buff is active', () => {
    mockUseMultiFightBuffLookup.mockReturnValue({
      fightBuffData: new Map([
        [
          1,
          {
            buffIntervals: {
              219246: [{ start: 0, end: 1000, sourceID: 7, targetID: 7 }],
              61744: [{ start: 0, end: 1000, sourceID: 7, targetID: 7 }],
            },
          },
        ],
      ]),
      isLoading: false,
      hasError: false,
    });

    renderWidget();

    expect(screen.getByText('Major Brutality')).toBeInTheDocument();
    expect(screen.getAllByText(/all players active/)).toHaveLength(2);
    expect(screen.queryByText('1 missing')).not.toBeInTheDocument();
  });

  it('still reports Major Brutality missing when no current or legacy ID is active', () => {
    mockUseMultiFightBuffLookup.mockReturnValue({
      fightBuffData: new Map([[1, { buffIntervals: { 61744: [] } }]]),
      isLoading: false,
      hasError: false,
    });

    renderWidget();

    expect(screen.getByText('Major Brutality')).toBeInTheDocument();
    expect(screen.getAllByText('1 missing')).toHaveLength(2);
  });
});
