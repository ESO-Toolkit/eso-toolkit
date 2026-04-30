import { render, screen } from '@testing-library/react';
import React from 'react';

import { FightFragment } from '../../graphql/gql/graphql';
import { DeathEvent } from '../../types/combatlogEvents';

import { DeathCausesWidget } from './DeathCausesWidget';

// Mock hooks
jest.mock('../../hooks/events/useDeathEvents');
jest.mock('../../hooks/usePlayerData');

import { useDeathEvents } from '../../hooks/events/useDeathEvents';
import { usePlayerData } from '../../hooks/usePlayerData';

const mockUseDeathEvents = useDeathEvents as jest.MockedFunction<typeof useDeathEvents>;
const mockUsePlayerData = usePlayerData as jest.MockedFunction<typeof usePlayerData>;

describe('DeathCausesWidget', () => {
  const mockFight: FightFragment = {
    id: 1,
    startTime: 1000,
    endTime: 2000,
    name: 'Test Fight',
    difficulty: null,
    kill: true,
    fightPercentage: null,
    bossPercentage: null,
    size: null,
    completeRaid: null,
    inProgress: null,
    standardComposition: null,
    hasEcho: null,
  };

  const defaultProps = {
    id: 'death-widget-1',
    scope: 'most-recent' as const,
    reportId: 'test-report',
    fights: [mockFight],
    onRemove: jest.fn(),
    onScopeChange: jest.fn(),
  };

  const mockPlayerData = {
    playersById: {
      1: { id: 1, name: 'Player1', role: 'dps' as const, combatantInfo: null },
      2: { id: 2, name: 'Player2', role: 'tank' as const, combatantInfo: null },
    },
    playersByName: {},
    sortedPlayerIds: [1, 2],
  };

  beforeEach(() => {
    jest.clearAllMocks();

    // Default mock implementations
    mockUsePlayerData.mockReturnValue({
      playerData: mockPlayerData,
      isPlayerDataLoading: false,
    });
  });

  it('should render widget title', () => {
    mockUseDeathEvents.mockReturnValue({
      deathEvents: [],
      isDeathEventsLoading: false,
    });

    render(<DeathCausesWidget {...defaultProps} />);

    expect(screen.getByText('Death Causes')).toBeInTheDocument();
  });

  it('should show "No issues detected" when there are no deaths', () => {
    mockUseDeathEvents.mockReturnValue({
      deathEvents: [],
      isDeathEventsLoading: false,
    });

    render(<DeathCausesWidget {...defaultProps} />);

    expect(screen.getByText('No issues detected')).toBeInTheDocument();
  });

  it('should display player deaths', () => {
    const mockDeathEvents: DeathEvent[] = [
      {
        timestamp: 1500,
        targetID: 1,
        targetIsFriendly: true,
        abilityGameID: 12345,
      } as DeathEvent,
      {
        timestamp: 1600,
        targetID: 1,
        targetIsFriendly: true,
        abilityGameID: 12345,
      } as DeathEvent,
    ];

    mockUseDeathEvents.mockReturnValue({
      deathEvents: mockDeathEvents,
      isDeathEventsLoading: false,
    });

    render(<DeathCausesWidget {...defaultProps} />);

    expect(screen.getByText('Player1')).toBeInTheDocument();
    expect(screen.getByText('2x')).toBeInTheDocument();
  });

  it('should show loading state', () => {
    mockUseDeathEvents.mockReturnValue({
      deathEvents: [],
      isDeathEventsLoading: true,
    });

    render(<DeathCausesWidget {...defaultProps} />);

    expect(screen.getByText('Loading...')).toBeInTheDocument();
  });

  it('should display top cause ability ID', () => {
    const mockDeathEvents: DeathEvent[] = [
      {
        timestamp: 1500,
        targetID: 1,
        targetIsFriendly: true,
        abilityGameID: 12345,
      } as DeathEvent,
      {
        timestamp: 1600,
        targetID: 1,
        targetIsFriendly: true,
        abilityGameID: 12345,
      } as DeathEvent,
      {
        timestamp: 1700,
        targetID: 1,
        targetIsFriendly: true,
        abilityGameID: 67890,
      } as DeathEvent,
    ];

    mockUseDeathEvents.mockReturnValue({
      deathEvents: mockDeathEvents,
      isDeathEventsLoading: false,
    });

    render(<DeathCausesWidget {...defaultProps} />);

    // Should show the most common ability (12345 appears 2 times)
    expect(screen.getByText(/Ability 12345.*\(2x\)/)).toBeInTheDocument();
  });

  it('should sort players by death count descending', () => {
    const mockDeathEvents: DeathEvent[] = [
      { timestamp: 1500, targetID: 1, targetIsFriendly: true, abilityGameID: 12345 } as DeathEvent,
      { timestamp: 1600, targetID: 2, targetIsFriendly: true, abilityGameID: 12345 } as DeathEvent,
      { timestamp: 1700, targetID: 2, targetIsFriendly: true, abilityGameID: 12345 } as DeathEvent,
      { timestamp: 1800, targetID: 2, targetIsFriendly: true, abilityGameID: 12345 } as DeathEvent,
    ];

    mockUseDeathEvents.mockReturnValue({
      deathEvents: mockDeathEvents,
      isDeathEventsLoading: false,
    });

    render(<DeathCausesWidget {...defaultProps} />);

    const playerElements = screen.getAllByRole('listitem');
    // Player2 should appear first (3 deaths) before Player1 (1 death)
    expect(playerElements[0]).toHaveTextContent('Player2');
    expect(playerElements[1]).toHaveTextContent('Player1');
  });

  it('should handle multiple fights when scope is set to last-3', () => {
    const fight1: FightFragment = { ...mockFight, id: 1 };
    const fight2: FightFragment = { ...mockFight, id: 2 };
    const fight3: FightFragment = { ...mockFight, id: 3 };

    const mockDeathsForFight1: DeathEvent[] = [
      { timestamp: 1500, targetID: 1, targetIsFriendly: true, abilityGameID: 12345 } as DeathEvent,
    ];

    const mockDeathsForFight2: DeathEvent[] = [
      { timestamp: 1500, targetID: 1, targetIsFriendly: true, abilityGameID: 12345 } as DeathEvent,
    ];

    const mockDeathsForFight3: DeathEvent[] = [
      { timestamp: 1500, targetID: 1, targetIsFriendly: true, abilityGameID: 12345 } as DeathEvent,
    ];

    // Mock multiple hook calls for multiple fights
    mockUseDeathEvents
      .mockReturnValueOnce({ deathEvents: mockDeathsForFight1, isDeathEventsLoading: false })
      .mockReturnValueOnce({ deathEvents: mockDeathsForFight2, isDeathEventsLoading: false })
      .mockReturnValueOnce({ deathEvents: mockDeathsForFight3, isDeathEventsLoading: false })
      .mockReturnValue({ deathEvents: [], isDeathEventsLoading: false });

    render(
      <DeathCausesWidget {...defaultProps} scope="last-3" fights={[fight1, fight2, fight3]} />,
    );

    // Should aggregate deaths from all 3 fights
    expect(screen.getByText('Player1')).toBeInTheDocument();
    expect(screen.getByText('3x')).toBeInTheDocument();
  });

  it('should ignore non-friendly deaths', () => {
    const mockDeathEvents: DeathEvent[] = [
      { timestamp: 1500, targetID: 1, targetIsFriendly: false, abilityGameID: 12345 } as DeathEvent,
      { timestamp: 1600, targetID: 2, targetIsFriendly: true, abilityGameID: 12345 } as DeathEvent,
    ];

    mockUseDeathEvents.mockReturnValue({
      deathEvents: mockDeathEvents,
      isDeathEventsLoading: false,
    });

    render(<DeathCausesWidget {...defaultProps} />);

    // Should only show Player2 (friendly death), not Player1 (hostile death)
    expect(screen.getByText('Player2')).toBeInTheDocument();
    expect(screen.queryByText('Player1')).not.toBeInTheDocument();
  });
});
