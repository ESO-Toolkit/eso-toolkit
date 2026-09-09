import { render, screen } from '@testing-library/react';
import React from 'react';

import { useCombatantInfoEvents, usePlayerData, useReportMasterData } from '../../../hooks';
import { useDebuffEvents } from '../../../hooks/events/useDebuffEvents';
import { useFriendlyBuffEvents } from '../../../hooks/events/useFriendlyBuffEvents';
import { useBuffLookupTask } from '../../../hooks/workerTasks/useBuffLookupTask';
import { useDebuffLookupTask } from '../../../hooks/workerTasks/useDebuffLookupTask';

import { AurasPanel } from './AurasPanel';
import { BuffsOverviewPanel } from './BuffsOverviewPanel';
import { DebuffsOverviewPanel } from './DebuffsOverviewPanel';

jest.mock('react-redux', () => ({
  useSelector: (selector: (state: object) => unknown) => selector({}),
}));

jest.mock('../../../hooks', () => ({
  useCombatantInfoEvents: jest.fn(),
  usePlayerData: jest.fn(),
  useReportMasterData: jest.fn(),
}));
jest.mock('../../../hooks/events/useDebuffEvents', () => ({ useDebuffEvents: jest.fn() }));
jest.mock('../../../hooks/events/useFriendlyBuffEvents', () => ({
  useFriendlyBuffEvents: jest.fn(),
}));
jest.mock('../../../hooks/workerTasks/useBuffLookupTask', () => ({
  useBuffLookupTask: jest.fn(),
}));
jest.mock('../../../hooks/workerTasks/useDebuffLookupTask', () => ({
  useDebuffLookupTask: jest.fn(),
}));
jest.mock('../../../ReportFightContext', () => ({
  useSelectedReportAndFight: () => ({ reportId: 'REPORT', fightId: '1' }),
}));
jest.mock('../../../store/master_data/masterDataSelectors', () => ({
  selectMasterDataErrorState: () => null,
}));
jest.mock('../../../store/ui/uiSelectors', () => ({ selectSelectedTargetId: () => null }));
jest.mock('../../../components/LazyDataGrid', () => ({
  DataGrid: ({ title }: { title: string }) => <div>{title}</div>,
}));
jest.mock('../../../components/LazySkillTooltip', () => ({
  LazySkillTooltip: () => null,
}));

const mockUsePlayerData = jest.mocked(usePlayerData);
const mockUseReportMasterData = jest.mocked(useReportMasterData);
const mockUseCombatantInfoEvents = jest.mocked(useCombatantInfoEvents);
const mockUseDebuffEvents = jest.mocked(useDebuffEvents);
const mockUseFriendlyBuffEvents = jest.mocked(useFriendlyBuffEvents);
const mockUseBuffLookupTask = jest.mocked(useBuffLookupTask);
const mockUseDebuffLookupTask = jest.mocked(useDebuffLookupTask);

const successfulPlayerData = {
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

const loadedMasterData = {
  reportMasterData: {
    actorsById: {},
    abilitiesById: { 101: { gameID: 101, name: 'Major Courage', icon: 'buff.png' } },
    loaded: true,
  },
  isMasterDataLoading: false,
};

const lookupData = {
  buffIntervals: {
    101: [{ targetID: 7, sourceID: 7, start: 0, end: 1000 }],
  },
};

beforeEach(() => {
  mockUsePlayerData.mockReturnValue({
    playerData: successfulPlayerData,
    isPlayerDataLoading: false,
  });
  mockUseReportMasterData.mockReturnValue(loadedMasterData);
  mockUseCombatantInfoEvents.mockReturnValue({
    combatantInfoEvents: [],
    isCombatantInfoEventsLoading: false,
    combatantInfoEventsStatus: 'succeeded',
    combatantInfoEventsError: null,
    selectedFight: null,
  });
  mockUseFriendlyBuffEvents.mockReturnValue({
    friendlyBuffEvents: [],
    isFriendlyBuffEventsLoading: false,
    friendlyBuffEventsStatus: 'succeeded',
    friendlyBuffEventsError: null,
    selectedFight: null,
  });
  mockUseBuffLookupTask.mockReturnValue({
    buffLookupData: lookupData,
    isBuffLookupLoading: false,
    buffLookupError: null,
    buffLookupProgress: null,
  });
  mockUseDebuffEvents.mockReturnValue({
    debuffEvents: [],
    isDebuffEventsLoading: false,
    debuffEventsStatus: 'succeeded',
    debuffEventsError: null,
    selectedFight: null,
  });
  mockUseDebuffLookupTask.mockReturnValue({
    debuffLookupData: lookupData,
    isDebuffLookupLoading: false,
    debuffLookupError: null,
    debuffLookupProgress: null,
    selectedFight: null,
  });
});

describe('AurasPanel lifecycle', () => {
  it('moves from an accessible loading state to a successful empty state', () => {
    mockUseCombatantInfoEvents.mockReturnValue({
      combatantInfoEvents: [],
      isCombatantInfoEventsLoading: true,
      combatantInfoEventsStatus: 'loading',
      combatantInfoEventsError: null,
      selectedFight: null,
    });
    const { rerender } = render(<AurasPanel />);

    expect(screen.getByRole('status')).toHaveTextContent('Loading data.');
    expect(screen.getByLabelText('Experimental: Auras overview: loading')).toBeInTheDocument();

    mockUseCombatantInfoEvents.mockReturnValue({
      combatantInfoEvents: [],
      isCombatantInfoEventsLoading: false,
      combatantInfoEventsStatus: 'succeeded',
      combatantInfoEventsError: null,
      selectedFight: null,
    });
    rerender(<AurasPanel />);

    expect(screen.getByRole('status')).toHaveTextContent('No data is available for this panel.');
  });

  it('retains aura rows while a refresh is partial and announces a later failure', () => {
    mockUseCombatantInfoEvents.mockReturnValue({
      combatantInfoEvents: [
        {
          timestamp: 0,
          type: 'combatantinfo',
          fight: 1,
          sourceID: 7,
          gear: [],
          auras: [{ ability: 42, source: 7, name: 'Test Aura', icon: 'aura.png', stacks: 1 }],
        },
      ],
      isCombatantInfoEventsLoading: true,
      combatantInfoEventsStatus: 'loading',
      combatantInfoEventsError: null,
      selectedFight: null,
    });
    const { rerender } = render(<AurasPanel />);

    expect(screen.getByRole('status')).toHaveTextContent('Updating data');
    expect(screen.getByText('Auras (1 unique)')).toBeInTheDocument();

    mockUseCombatantInfoEvents.mockReturnValue({
      combatantInfoEvents: [],
      isCombatantInfoEventsLoading: false,
      combatantInfoEventsStatus: 'failed',
      combatantInfoEventsError: 'Combatant stream failed',
      selectedFight: null,
    });
    rerender(<AurasPanel />);

    expect(screen.getByRole('alert')).toHaveTextContent('Combatant stream failed');
    expect(screen.queryByRole('button', { name: /try again/i })).not.toBeInTheDocument();
  });
});

describe('BuffsOverviewPanel lifecycle', () => {
  it('does not report an unconfirmed worker result as an empty success', () => {
    mockUseBuffLookupTask.mockReturnValue({
      buffLookupData: null,
      isBuffLookupLoading: false,
      buffLookupError: null,
      buffLookupProgress: null,
    });

    render(<BuffsOverviewPanel />);

    expect(screen.getByRole('status')).toHaveTextContent('not confirmed current');
  });

  it('announces a source failure instead of masking it as an empty grid', () => {
    mockUseFriendlyBuffEvents.mockReturnValue({
      friendlyBuffEvents: [],
      isFriendlyBuffEventsLoading: false,
      friendlyBuffEventsStatus: 'failed',
      friendlyBuffEventsError: 'Private report',
      selectedFight: null,
    });

    render(<BuffsOverviewPanel />);

    expect(screen.getByRole('alert')).toHaveTextContent('Private report');
    expect(screen.queryByText(/No buff data available/i)).not.toBeInTheDocument();
  });

  it('renders a ready result with an accessible status announcement', () => {
    render(<BuffsOverviewPanel />);

    expect(screen.getByRole('status')).toHaveTextContent('Data is ready.');
    expect(screen.getByText('Buffs (1 unique)')).toBeInTheDocument();
  });
});

describe('DebuffsOverviewPanel lifecycle', () => {
  it('retains results and announces partial state while dependencies refresh', () => {
    mockUseDebuffEvents.mockReturnValue({
      debuffEvents: [],
      isDebuffEventsLoading: true,
      debuffEventsStatus: 'loading',
      debuffEventsError: null,
      selectedFight: null,
    });

    render(<DebuffsOverviewPanel />);

    expect(screen.getByRole('status')).toHaveTextContent('Updating data');
    expect(screen.getByText('Debuffs (1 unique)')).toBeInTheDocument();
  });

  it('reports successful filtered emptiness only after all dependencies complete', () => {
    mockUseDebuffLookupTask.mockReturnValue({
      debuffLookupData: { buffIntervals: {} },
      isDebuffLookupLoading: false,
      debuffLookupError: null,
      debuffLookupProgress: null,
      selectedFight: null,
    });

    render(<DebuffsOverviewPanel />);

    expect(screen.getByRole('status')).toHaveTextContent('No data is available for this panel.');
  });

  it('announces player-data failure without offering a nonexistent retry action', () => {
    mockUsePlayerData.mockReturnValue({
      playerData: { ...successfulPlayerData, status: 'failed', error: 'Players unavailable' },
      isPlayerDataLoading: false,
    });

    render(<DebuffsOverviewPanel />);

    expect(screen.getByRole('alert')).toHaveTextContent('Players unavailable');
    expect(screen.queryByRole('button', { name: /try again/i })).not.toBeInTheDocument();
  });
});
