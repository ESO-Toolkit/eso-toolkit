import { render, screen } from '@testing-library/react';
import React from 'react';

import type { FightFragment } from '../../../graphql/gql/graphql';
import type { StatusEffectUptimesByTarget } from '../../../workers/calculations/CalculateStatusEffectUptimes';

import { StatusEffectUptimesPanel } from './StatusEffectUptimesPanel';

jest.mock('@/hooks', () => ({
  useStatusEffectUptimesTask: jest.fn(),
  useHostileBuffLookupTask: jest.fn(),
  useDebuffLookupTask: jest.fn(),
  useReportMasterData: jest.fn(),
  useSelectedTargetIds: jest.fn(),
}));

jest.mock('react-redux', () => ({
  useSelector: jest.fn(),
}));

jest.mock('../../../ReportFightContext', () => ({
  useSelectedReportAndFight: jest.fn(),
}));

jest.mock('./EffectUptimeTimelineModal', () => ({
  EffectUptimeTimelineModal: () => null,
}));

jest.mock('./StatusEffectUptimesView', () => ({
  StatusEffectUptimesView: ({
    statusEffectUptimes,
    isLoading,
    canOpenTimeline,
  }: {
    statusEffectUptimes: Array<{ abilityName: string }> | null;
    isLoading: boolean;
    canOpenTimeline?: boolean;
  }) => (
    <div data-testid="status-effect-view">
      <span data-testid="loading-state">{String(isLoading)}</span>
      <span data-testid="effect-count">{statusEffectUptimes?.length ?? 0}</span>
      <span data-testid="timeline-state">{String(Boolean(canOpenTimeline))}</span>
      {statusEffectUptimes?.map((effect) => (
        <span key={effect.abilityName}>{effect.abilityName}</span>
      ))}
    </div>
  ),
}));

const {
  useStatusEffectUptimesTask,
  useHostileBuffLookupTask,
  useDebuffLookupTask,
  useReportMasterData,
  useSelectedTargetIds,
} = jest.requireMock('@/hooks') as Record<string, jest.Mock>;
const { useSelector } = jest.requireMock('react-redux') as { useSelector: jest.Mock };
const { useSelectedReportAndFight } = jest.requireMock('../../../ReportFightContext') as {
  useSelectedReportAndFight: jest.Mock;
};

const fight = {
  id: 'fight-1',
  startTime: 1_000,
  endTime: 11_000,
  friendlyPlayers: [101],
  enemyNPCs: [],
} as unknown as FightFragment;

const statusEffect: StatusEffectUptimesByTarget = {
  abilityGameID: '42',
  abilityName: 'Fallback Effect',
  isDebuff: true,
  hostilityType: 1,
  uniqueKey: 'effect-42',
  allPlayers: {
    7: { totalDuration: 2_000, uptime: 2, uptimePercentage: 20, applications: 1 },
  },
  byPlayer: {},
};

beforeEach(() => {
  jest.clearAllMocks();
  useSelectedTargetIds.mockReturnValue(new Set([-1]));
  useSelector.mockReturnValue(null);
  useSelectedReportAndFight.mockReturnValue({ reportId: 'report-1', fightId: 'fight-1' });
  useReportMasterData.mockReturnValue({
    reportMasterData: {
      abilitiesById: { '42': { name: 'Burning', icon: 'burning.png' } },
    },
    isMasterDataLoading: false,
  });
  useHostileBuffLookupTask.mockReturnValue({
    hostileBuffLookupData: {
      buffIntervals: { '42': [{ start: 1_000, end: 3_000, targetID: 7, sourceID: 8 }] },
    },
    isHostileBuffLookupLoading: false,
  });
  useDebuffLookupTask.mockReturnValue({
    debuffLookupData: null,
    isDebuffLookupLoading: false,
  });
  useStatusEffectUptimesTask.mockReturnValue({
    statusEffectUptimesData: { status: 'ok', data: [] },
    isStatusEffectUptimesLoading: false,
  });
});

describe('StatusEffectUptimesPanel', () => {
  it('exposes loading state while status-effect data is unresolved', () => {
    useStatusEffectUptimesTask.mockReturnValue({
      statusEffectUptimesData: undefined,
      isStatusEffectUptimesLoading: false,
    });

    render(<StatusEffectUptimesPanel fight={fight} />);

    expect(screen.getByTestId('loading-state')).toHaveTextContent('true');
    expect(screen.getByTestId('effect-count')).toHaveTextContent('0');
  });

  it('treats a completed empty result as an honest empty state', () => {
    render(<StatusEffectUptimesPanel fight={fight} />);

    expect(screen.getByTestId('loading-state')).toHaveTextContent('false');
    expect(screen.getByTestId('effect-count')).toHaveTextContent('0');
  });

  it('renders available partial results and enables timeline only when evidence exists', () => {
    useStatusEffectUptimesTask.mockReturnValue({
      statusEffectUptimesData: { status: 'ok', data: [statusEffect] },
      isStatusEffectUptimesLoading: false,
    });

    render(<StatusEffectUptimesPanel fight={fight} />);

    expect(screen.getByTestId('loading-state')).toHaveTextContent('false');
    expect(screen.getByTestId('effect-count')).toHaveTextContent('1');
    expect(screen.getByText('Burning')).toBeInTheDocument();
    expect(screen.getByTestId('timeline-state')).toHaveTextContent('true');
  });
});
