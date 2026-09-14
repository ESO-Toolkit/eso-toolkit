import { render, screen } from '@testing-library/react';
import React from 'react';

import type { FightFragment } from '../../graphql/gql/graphql';
import { usePlayerData } from '../../hooks/usePlayerData';
import { useBuffLookupTask } from '../../hooks/workerTasks/useBuffLookupTask';

import { getClippedUnionDuration, LowBuffUptimesWidget } from './LowBuffUptimesWidget';

jest.mock('../../hooks/usePlayerData', () => ({ usePlayerData: jest.fn() }));
jest.mock('../../hooks/workerTasks/useBuffLookupTask', () => ({ useBuffLookupTask: jest.fn() }));
jest.mock('./BaseWidget', () => ({
  BaseWidget: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  WidgetPlayerAvatar: () => null,
}));

const mockUsePlayerData = jest.mocked(usePlayerData);
const mockUseBuffLookupTask = jest.mocked(useBuffLookupTask);

const fights: FightFragment[] = [
  {
    id: 1,
    startTime: 0,
    endTime: 1000,
    name: 'Boundary test',
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

describe('LowBuffUptimesWidget', () => {
  beforeEach(() => {
    mockUsePlayerData.mockReturnValue({ playerData, isPlayerDataLoading: false });
    mockUseBuffLookupTask.mockReturnValue({
      buffLookupData: {
        buffIntervals: {
          61746: [
            { start: -100, end: 600, sourceID: 1, targetID: 7 },
            { start: 500, end: 800, sourceID: 2, targetID: 7 },
            { start: 550, end: 800, sourceID: 3, targetID: 7 },
            { start: 900, end: 1200, sourceID: 4, targetID: 7 },
          ],
        },
      },
      isBuffLookupLoading: false,
      buffLookupError: null,
      buffLookupProgress: null,
    });
  });

  it('unions overlapping intervals after clipping both fight boundaries', () => {
    expect(
      getClippedUnionDuration(
        [
          { start: -100, end: 600, sourceID: 1, targetID: 7 },
          { start: 500, end: 800, sourceID: 2, targetID: 7 },
          { start: 900, end: 1200, sourceID: 3, targetID: 7 },
        ],
        0,
        1000,
      ),
    ).toBe(900);
  });

  it('shows the unioned uptime instead of an uptime above 100 percent', () => {
    render(
      <LowBuffUptimesWidget
        id="low-buff-uptime"
        scope="most-recent"
        reportId="REPORT"
        fights={fights}
        onRemove={jest.fn()}
        onScopeChange={jest.fn()}
      />,
    );

    expect(screen.getByText('90%')).toBeInTheDocument();
    expect(screen.queryByText('125%')).not.toBeInTheDocument();
  });
});
