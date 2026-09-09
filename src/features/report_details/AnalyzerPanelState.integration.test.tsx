import { render, screen, within } from '@testing-library/react';
import React from 'react';

import { ActorsPanel } from './actors/ActorsPanel';
import { CriticalDamagePanel } from './critical_damage/CriticalDamagePanel';
import { PenetrationPanel } from './penetration/PenetrationPanel';
import { SynergyPanel } from './synergy/SynergyPanel';

jest.mock('../../hooks', () => ({
  useCombatantInfoEvents: jest.fn(),
  usePlayerData: jest.fn(),
  useReportMasterData: jest.fn(),
  useCriticalDamageTask: jest.fn(),
  useResolvedReportFightContext: jest.fn(),
  useFightForContext: jest.fn(),
  useSelectedTargetIds: jest.fn(),
  useCastEvents: jest.fn(),
}));

jest.mock('react-redux', () => ({
  useSelector: jest.fn(),
}));

jest.mock('../../hooks/workerTasks/useCompanionCritEvidence', () => ({
  useCompanionCritEvidence: jest.fn(),
}));

jest.mock('../../hooks/workerTasks/usePenetrationDataTask', () => ({
  usePenetrationDataTask: jest.fn(),
}));

jest.mock('./actors/ActorsPanelView', () => ({
  ActorsPanelView: ({ actors }: { actors: Array<{ gameID: number | null }> }) => (
    <div>
      actors view
      <span>actor game ID: {actors[0]?.gameID ?? 'unknown'}</span>
    </div>
  ),
}));
jest.mock('./critical_damage/CriticalDamagePanelView', () => ({
  CriticalDamagePanelView: () => <div>critical damage view</div>,
}));
jest.mock('./penetration/PenetrationPanelView', () => ({
  PenetrationPanelView: () => <div>penetration view</div>,
}));
jest.mock('./synergy/SynergyPanelView', () => ({
  SynergyPanelView: () => <div>synergy view</div>,
}));
jest.mock('./synergy/synergyUtils', () => ({
  extractSynergyData: jest.fn(),
}));

const hooks = jest.requireMock('../../hooks');
const { useSelector } = jest.requireMock('react-redux');
const { useCompanionCritEvidence } = jest.requireMock(
  '../../hooks/workerTasks/useCompanionCritEvidence',
);
const { usePenetrationDataTask } = jest.requireMock(
  '../../hooks/workerTasks/usePenetrationDataTask',
);
const { extractSynergyData } = jest.requireMock('./synergy/synergyUtils');

const fight = { id: 1, friendlyPlayers: [], startTime: 0 };
const playersById = { 1: { id: 1, name: 'Player', role: 'dps' } };
const actorsById = { 1: { id: 1, name: 'Player', type: 'Player' } };
const criticalDamageMap = {
  1: {
    playerId: 1,
    playerName: 'Player',
    dataPoints: [],
    effectiveCriticalDamage: 0,
    maximumCriticalDamage: 0,
    timeAtCapPercentage: 0,
    criticalDamageAlerts: [],
    criticalDamageSources: [],
    staticCriticalDamage: 0,
    inactiveCombatIntervals: [],
    activeCombatIntervals: [],
  },
};
const penetrationData = {
  1: {
    playerId: '1',
    playerName: 'Player',
    dataPoints: [],
    max: 0,
    effective: 0,
    timeAtCapPercentage: 0,
    penetrationSources: [],
    playerBasePenetration: 0,
    inactiveCombatIntervals: [],
  },
};
const panel = (title: string) => screen.getByRole('region', { name: title });

describe('Analyzer panel state integration', () => {
  beforeEach(() => {
    jest.resetAllMocks();
    useSelector.mockReturnValue(null);
    hooks.useResolvedReportFightContext.mockReturnValue({ reportCode: 'report', fightId: 1 });
    hooks.useFightForContext.mockReturnValue(fight);
    hooks.useSelectedTargetIds.mockReturnValue(new Set([1]));
    hooks.usePlayerData.mockReturnValue({
      playerData: { playersById, status: 'succeeded', error: null },
      isPlayerDataLoading: false,
    });
    hooks.useReportMasterData.mockReturnValue({
      reportMasterData: { actorsById: {}, abilitiesById: {}, loaded: true },
      isMasterDataLoading: false,
    });
    hooks.useCombatantInfoEvents.mockReturnValue({
      combatantInfoEvents: [],
      isCombatantInfoEventsLoading: false,
      combatantInfoEventsStatus: 'succeeded',
      combatantInfoEventsError: null,
    });
    hooks.useCriticalDamageTask.mockReturnValue({
      criticalDamageData: { playerDataMap: criticalDamageMap },
      isCriticalDamageLoading: false,
      criticalDamageError: null,
    });
    hooks.useCastEvents.mockReturnValue({
      castEvents: [],
      isCastEventsLoading: false,
      castEventsStatus: 'succeeded',
      castEventsError: null,
    });
    useCompanionCritEvidence.mockReturnValue({});
    usePenetrationDataTask.mockReturnValue({
      penetrationData,
      isPenetrationDataLoading: false,
      penetrationDataError: null,
    });
    extractSynergyData.mockReturnValue({
      activations: [],
      byPlayer: [],
      byAbility: [],
      totalCount: 0,
    });
  });

  it('announces loading when Actors has no retained data and a dependency is pending', () => {
    hooks.useReportMasterData.mockReturnValue({
      reportMasterData: { actorsById: {}, abilitiesById: {}, loaded: false },
      isMasterDataLoading: true,
    });

    render(<ActorsPanel />);

    expect(within(panel('Actors')).getByRole('status')).toHaveTextContent('Loading data.');
    expect(within(panel('Actors')).getByLabelText('Actors: loading')).toBeInTheDocument();
  });

  it('announces a fresh empty Actors result only after all sources complete', () => {
    render(<ActorsPanel />);

    expect(within(panel('Actors')).getByRole('status')).toHaveTextContent(
      'No data is available for this panel.',
    );
    expect(screen.queryByText('actors view')).not.toBeInTheDocument();
  });

  it('keeps retained Actors visible and announces a partial refresh', () => {
    hooks.useReportMasterData.mockReturnValue({
      reportMasterData: {
        actorsById,
        abilitiesById: {},
        loaded: true,
      },
      isMasterDataLoading: true,
    });

    render(<ActorsPanel />);

    expect(within(panel('Actors')).getByRole('status')).toHaveTextContent(
      'Updating data; showing the latest available results.',
    );
    expect(screen.getByText('actors view')).toBeInTheDocument();
  });

  it('marks unconfirmed retained Actors as stale instead of showing an empty result', () => {
    hooks.useReportMasterData.mockReturnValue({
      reportMasterData: {
        actorsById,
        abilitiesById: {},
        loaded: false,
      },
      isMasterDataLoading: false,
    });

    render(<ActorsPanel />);

    expect(within(panel('Actors')).getByRole('status')).toHaveTextContent(
      'Panel data is not confirmed current.',
    );
    expect(screen.getByText('actors view')).toBeInTheDocument();
  });

  it('announces an Actors failure instead of leaving an infinite loading state', () => {
    hooks.useCombatantInfoEvents.mockReturnValue({
      combatantInfoEvents: [],
      isCombatantInfoEventsLoading: false,
      combatantInfoEventsStatus: 'failed',
      combatantInfoEventsError: 'Events request failed',
    });

    render(<ActorsPanel />);

    expect(within(panel('Actors')).getByRole('alert')).toHaveTextContent(
      'The latest refresh failed. Retained data may be out of date.',
    );
    expect(within(panel('Actors')).getByRole('alert')).toHaveTextContent('Events request failed');
  });

  it('announces a master-data failure for Actors', () => {
    useSelector.mockReturnValue('Master data request failed');

    render(<ActorsPanel />);

    expect(within(panel('Actors')).getByRole('alert')).toHaveTextContent(
      'Master data request failed',
    );
  });

  it('announces a ready Actors result after every dependency completes', () => {
    hooks.useReportMasterData.mockReturnValue({
      reportMasterData: {
        actorsById,
        abilitiesById: {},
        loaded: true,
      },
      isMasterDataLoading: false,
    });

    render(<ActorsPanel />);

    expect(within(panel('Actors')).getByRole('status')).toHaveTextContent('Data is ready.');
    expect(screen.getByText('actors view')).toBeInTheDocument();
    expect(screen.getByText('actor game ID: unknown')).toBeInTheDocument();
  });

  it('announces a ready critical damage result', () => {
    render(<CriticalDamagePanel />);

    expect(within(panel('Critical damage')).getByRole('status')).toHaveTextContent(
      'Data is ready.',
    );
    expect(screen.getByText('critical damage view')).toBeInTheDocument();
  });

  it('marks a completed empty critical-damage calculation as empty', () => {
    hooks.useCriticalDamageTask.mockReturnValue({
      criticalDamageData: { playerDataMap: {} },
      isCriticalDamageLoading: false,
      criticalDamageError: null,
    });
    hooks.usePlayerData.mockReturnValue({
      playerData: { playersById: {}, status: 'succeeded', error: null },
      isPlayerDataLoading: false,
    });

    render(<CriticalDamagePanel />);

    expect(within(panel('Critical damage')).getByRole('status')).toHaveTextContent(
      'No data is available for this panel.',
    );
    expect(screen.queryByText('critical damage view')).not.toBeInTheDocument();
  });

  it('does not treat a missing critical-damage result as completed empty', () => {
    hooks.useCriticalDamageTask.mockReturnValue({
      criticalDamageData: null,
      isCriticalDamageLoading: false,
      criticalDamageError: null,
    });
    hooks.usePlayerData.mockReturnValue({
      playerData: { playersById: {}, status: 'succeeded', error: null },
      isPlayerDataLoading: false,
    });

    render(<CriticalDamagePanel />);

    expect(within(panel('Critical damage')).getByRole('status')).toHaveTextContent(
      'Panel data is not confirmed current.',
    );
  });

  it('announces critical damage calculation errors as failures', () => {
    hooks.useCriticalDamageTask.mockReturnValue({
      criticalDamageData: { playerDataMap: criticalDamageMap },
      isCriticalDamageLoading: false,
      criticalDamageError: 'Worker failed',
    });

    render(<CriticalDamagePanel />);

    expect(within(panel('Critical damage')).getByRole('alert')).toHaveTextContent('Worker failed');
    expect(screen.getByText('critical damage view')).toBeInTheDocument();
  });

  it('distinguishes loading, empty, partial, and stale critical damage data', () => {
    hooks.useCriticalDamageTask.mockReturnValue({
      criticalDamageData: null,
      isCriticalDamageLoading: true,
      criticalDamageError: null,
    });
    const { rerender } = render(<CriticalDamagePanel />);
    expect(within(panel('Critical damage')).getByRole('status')).toHaveTextContent('Loading data.');

    hooks.useCriticalDamageTask.mockReturnValue({
      criticalDamageData: { playerDataMap: {} },
      isCriticalDamageLoading: false,
      criticalDamageError: null,
    });
    hooks.usePlayerData.mockReturnValue({
      playerData: { playersById: {}, status: 'succeeded', error: null },
      isPlayerDataLoading: false,
    });
    rerender(<CriticalDamagePanel />);
    expect(within(panel('Critical damage')).getByRole('status')).toHaveTextContent(
      'No data is available for this panel.',
    );
    expect(screen.queryByText('critical damage view')).not.toBeInTheDocument();

    hooks.usePlayerData.mockReturnValue({
      playerData: { playersById, status: 'succeeded', error: null },
      isPlayerDataLoading: false,
    });
    hooks.useCriticalDamageTask.mockReturnValue({
      criticalDamageData: { playerDataMap: criticalDamageMap },
      isCriticalDamageLoading: true,
      criticalDamageError: null,
    });
    rerender(<CriticalDamagePanel />);
    expect(within(panel('Critical damage')).getByRole('status')).toHaveTextContent(
      'Updating data; showing the latest available results.',
    );
    expect(screen.getByText('critical damage view')).toBeInTheDocument();

    hooks.usePlayerData.mockReturnValue({
      playerData: { playersById, status: 'idle', error: null },
      isPlayerDataLoading: false,
    });
    hooks.useCriticalDamageTask.mockReturnValue({
      criticalDamageData: { playerDataMap: criticalDamageMap },
      isCriticalDamageLoading: false,
      criticalDamageError: null,
    });
    rerender(<CriticalDamagePanel />);
    expect(within(panel('Critical damage')).getByRole('status')).toHaveTextContent(
      'Panel data is not confirmed current.',
    );
    expect(screen.getByText('critical damage view')).toBeInTheDocument();
  });

  it('marks a missing critical-damage fight context as stale even while dependencies load', () => {
    hooks.useFightForContext.mockReturnValue(null);
    hooks.useCriticalDamageTask.mockReturnValue({
      criticalDamageData: null,
      isCriticalDamageLoading: true,
      criticalDamageError: null,
    });
    hooks.usePlayerData.mockReturnValue({ playerData: null, isPlayerDataLoading: true });

    render(<CriticalDamagePanel />);

    expect(within(panel('Critical damage')).getByRole('status')).toHaveTextContent(
      'Panel data is not confirmed current.',
    );
    expect(screen.queryByLabelText('Critical damage: loading')).not.toBeInTheDocument();
    expect(screen.queryByText('critical damage view')).not.toBeInTheDocument();
  });

  it('reports a critical-damage player-data failure while retaining prior results', () => {
    hooks.usePlayerData.mockReturnValue({
      playerData: { playersById, status: 'failed', error: 'Player data request failed' },
      isPlayerDataLoading: false,
    });

    render(<CriticalDamagePanel />);

    expect(within(panel('Critical damage')).getByRole('alert')).toHaveTextContent(
      'Player data request failed',
    );
    expect(screen.getByText('critical damage view')).toBeInTheDocument();
  });

  it('marks a completed penetration calculation without players as empty', () => {
    hooks.usePlayerData.mockReturnValue({
      playerData: { playersById: {}, status: 'succeeded', error: null },
      isPlayerDataLoading: false,
    });

    render(<PenetrationPanel />);

    expect(within(panel('Penetration')).getByRole('status')).toHaveTextContent(
      'No data is available for this panel.',
    );
  });

  it('does not treat a missing penetration result as completed empty', () => {
    usePenetrationDataTask.mockReturnValue({
      penetrationData: null,
      isPenetrationDataLoading: false,
      penetrationDataError: null,
    });
    hooks.usePlayerData.mockReturnValue({
      playerData: { playersById: {}, status: 'succeeded', error: null },
      isPlayerDataLoading: false,
    });

    render(<PenetrationPanel />);

    expect(within(panel('Penetration')).getByRole('status')).toHaveTextContent(
      'Panel data is not confirmed current.',
    );
  });

  it('marks a missing penetration fight context as stale even while dependencies load', () => {
    hooks.useFightForContext.mockReturnValue(null);
    hooks.usePlayerData.mockReturnValue({ playerData: null, isPlayerDataLoading: true });
    usePenetrationDataTask.mockReturnValue({
      penetrationData: null,
      isPenetrationDataLoading: true,
      penetrationDataError: null,
    });

    render(<PenetrationPanel />);

    expect(within(panel('Penetration')).getByRole('status')).toHaveTextContent(
      'Panel data is not confirmed current.',
    );
    expect(screen.queryByLabelText('Penetration: loading')).not.toBeInTheDocument();
  });

  it('reports a penetration player-data failure while retaining prior results', () => {
    hooks.usePlayerData.mockReturnValue({
      playerData: { playersById, status: 'failed', error: 'Player data request failed' },
      isPlayerDataLoading: false,
    });

    render(<PenetrationPanel />);

    expect(within(panel('Penetration')).getByRole('alert')).toHaveTextContent(
      'Player data request failed',
    );
    expect(screen.getByText('penetration view')).toBeInTheDocument();
  });

  it('distinguishes loading, partial, stale, failed, and ready penetration data', () => {
    usePenetrationDataTask.mockReturnValue({
      penetrationData: null,
      isPenetrationDataLoading: true,
      penetrationDataError: null,
    });
    const { rerender } = render(<PenetrationPanel />);
    expect(within(panel('Penetration')).getByRole('status')).toHaveTextContent('Loading data.');

    usePenetrationDataTask.mockReturnValue({
      penetrationData: {},
      isPenetrationDataLoading: true,
      penetrationDataError: null,
    });
    rerender(<PenetrationPanel />);
    expect(within(panel('Penetration')).getByRole('status')).toHaveTextContent('Loading data.');
    expect(screen.queryByText('penetration view')).not.toBeInTheDocument();

    usePenetrationDataTask.mockReturnValue({
      penetrationData,
      isPenetrationDataLoading: true,
      penetrationDataError: null,
    });
    rerender(<PenetrationPanel />);
    expect(within(panel('Penetration')).getByRole('status')).toHaveTextContent(
      'Updating data; showing the latest available results.',
    );
    expect(screen.getByText('penetration view')).toBeInTheDocument();

    hooks.usePlayerData.mockReturnValue({
      playerData: { playersById, status: 'idle', error: null },
      isPlayerDataLoading: false,
    });
    usePenetrationDataTask.mockReturnValue({
      penetrationData,
      isPenetrationDataLoading: false,
      penetrationDataError: null,
    });
    rerender(<PenetrationPanel />);
    expect(within(panel('Penetration')).getByRole('status')).toHaveTextContent(
      'Panel data is not confirmed current.',
    );

    usePenetrationDataTask.mockReturnValue({
      penetrationData,
      isPenetrationDataLoading: false,
      penetrationDataError: 'Calculation failed',
    });
    rerender(<PenetrationPanel />);
    expect(within(panel('Penetration')).getByRole('alert')).toHaveTextContent('Calculation failed');
    expect(screen.getByText('penetration view')).toBeInTheDocument();

    hooks.usePlayerData.mockReturnValue({
      playerData: { playersById, status: 'succeeded', error: null },
      isPlayerDataLoading: false,
    });
    usePenetrationDataTask.mockReturnValue({
      penetrationData,
      isPenetrationDataLoading: false,
      penetrationDataError: null,
    });
    rerender(<PenetrationPanel />);
    expect(within(panel('Penetration')).getByRole('status')).toHaveTextContent('Data is ready.');
    expect(screen.getByText('penetration view')).toBeInTheDocument();
  });

  it('marks synergy data as loading until its event query resolves', () => {
    hooks.useCastEvents.mockReturnValue({
      castEvents: [],
      isCastEventsLoading: true,
      castEventsStatus: 'loading',
      castEventsError: null,
    });

    render(<SynergyPanel />);

    expect(within(panel('Synergies')).getByRole('status')).toHaveTextContent('Loading data.');
  });

  it('marks a missing synergy fight context as stale even while dependencies load', () => {
    hooks.useFightForContext.mockReturnValue(null);
    hooks.useCastEvents.mockReturnValue({
      castEvents: [],
      isCastEventsLoading: true,
      castEventsStatus: 'loading',
      castEventsError: null,
    });
    hooks.useReportMasterData.mockReturnValue({
      reportMasterData: { actorsById: {}, abilitiesById: {}, loaded: false },
      isMasterDataLoading: true,
    });

    render(<SynergyPanel />);

    expect(within(panel('Synergies')).getByRole('status')).toHaveTextContent(
      'Panel data is not confirmed current.',
    );
    expect(screen.queryByLabelText('Synergies: loading')).not.toBeInTheDocument();
  });

  it('announces a Synergy query failure instead of suppressing the error', () => {
    hooks.useCastEvents.mockReturnValue({
      castEvents: [],
      isCastEventsLoading: false,
      castEventsStatus: 'failed',
      castEventsError: 'Cast events request failed',
    });

    render(<SynergyPanel />);

    expect(within(panel('Synergies')).getByRole('alert')).toHaveTextContent(
      'Cast events request failed',
    );
  });

  it('announces a master-data failure for Synergies', () => {
    useSelector.mockReturnValue('Master data request failed');

    render(<SynergyPanel />);

    expect(within(panel('Synergies')).getByRole('alert')).toHaveTextContent(
      'Master data request failed',
    );
  });

  it('distinguishes empty, partial, stale, failed, and ready synergy data', () => {
    const availableSynergies = {
      activations: [{}],
      byPlayer: [],
      byAbility: [],
      totalCount: 1,
    };
    const { rerender } = render(<SynergyPanel />);
    expect(within(panel('Synergies')).getByRole('status')).toHaveTextContent(
      'No data is available for this panel.',
    );

    extractSynergyData.mockReturnValue(availableSynergies);
    hooks.useCastEvents.mockReturnValue({
      castEvents: [{}],
      isCastEventsLoading: true,
      castEventsStatus: 'loading',
      castEventsError: null,
    });
    rerender(<SynergyPanel />);
    expect(within(panel('Synergies')).getByRole('status')).toHaveTextContent(
      'Updating data; showing the latest available results.',
    );
    expect(screen.getByText('synergy view')).toBeInTheDocument();

    hooks.useCastEvents.mockReturnValue({
      castEvents: [{}],
      isCastEventsLoading: false,
      castEventsStatus: 'idle',
      castEventsError: null,
    });
    rerender(<SynergyPanel />);
    expect(within(panel('Synergies')).getByRole('status')).toHaveTextContent(
      'Panel data is not confirmed current.',
    );
    expect(screen.getByText('synergy view')).toBeInTheDocument();

    hooks.useCastEvents.mockReturnValue({
      castEvents: [{}],
      isCastEventsLoading: false,
      castEventsStatus: 'failed',
      castEventsError: 'Cast events request failed',
    });
    rerender(<SynergyPanel />);
    expect(within(panel('Synergies')).getByRole('alert')).toHaveTextContent(
      'Cast events request failed',
    );
    expect(screen.getByText('synergy view')).toBeInTheDocument();

    hooks.useCastEvents.mockReturnValue({
      castEvents: [{}],
      isCastEventsLoading: false,
      castEventsStatus: 'succeeded',
      castEventsError: null,
    });
    rerender(<SynergyPanel />);
    expect(within(panel('Synergies')).getByRole('status')).toHaveTextContent('Data is ready.');
    expect(screen.getByText('synergy view')).toBeInTheDocument();
  });
});
