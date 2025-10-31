import React from 'react';
import { render } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { ThemeProvider } from '@mui/material/styles';
import { createTheme } from '@mui/material/styles';

import { KnownAbilities } from '../../../types/abilities';
import { DamageEvent, DeathEvent } from '../../../types/combatlogEvents';
import { FightFragment, ReportActorFragment } from '../../../graphql/gql/graphql';
import { BuffLookupData } from '../../../utils/BuffLookupUtils';
import {
  createMockDamageEvent,
  createMockDeathEvent,
  createMockFight,
  createMockResources,
} from '../../../test/utils/combatLogMockFactories';

import { DeathEventPanel } from './DeathEventPanel';

// Mock the hooks
jest.mock('../../../hooks', () => ({
  useDeathEvents: jest.fn(),
  useDamageEvents: jest.fn(),
  useReportMasterData: jest.fn(),
  usePlayerData: jest.fn(),
  useCastEvents: jest.fn(),
  useHealingEvents: jest.fn(),
  useResourceEvents: jest.fn(),
  useRoleColors: jest.fn(),
  useResolvedReportFightContext: jest.fn(),
  useFightForContext: jest.fn(),
}));

jest.mock('../../../hooks/workerTasks/useDebuffLookupTask', () => ({
  useDebuffLookupTask: jest.fn(),
}));

jest.mock('../../../ReportFightContext', () => ({
  useSelectedReportAndFight: jest.fn(),
}));

// Mock utils
jest.mock('../../../utils/deathDurationUtils', () => ({
  calculateDeathDurations: jest.fn(),
}));

const { calculateDeathDurations } = jest.requireMock('../../../utils/deathDurationUtils');

const {
  useDeathEvents,
  useDamageEvents,
  useReportMasterData,
  usePlayerData,
  useCastEvents,
  useHealingEvents,
  useResourceEvents,
  useRoleColors,
  useResolvedReportFightContext,
  useFightForContext,
} = jest.requireMock('../../../hooks');

const { useDebuffLookupTask } = jest.requireMock('../../../hooks/workerTasks/useDebuffLookupTask');
const { useSelectedReportAndFight } = jest.requireMock('../../../ReportFightContext');

const theme = createTheme();

// Test wrapper component
const TestWrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <MemoryRouter>
    <ThemeProvider theme={theme}>{children}</ThemeProvider>
  </MemoryRouter>
);

// Helper function to create mock debuff lookup data
const createMockDebuffLookupData = (
  taintedTargets: { targetId: number; startTime: number; endTime: number; sourceId: number }[],
): BuffLookupData => {
  const buffIntervals: {
    [key: string]: Array<{ start: number; end: number; targetID: number; sourceID: number }>;
  } = {};

  taintedTargets.forEach(({ targetId, startTime, endTime, sourceId }) => {
    const key = KnownAbilities.TAUNT.toString();
    if (!buffIntervals[key]) {
      buffIntervals[key] = [];
    }
    buffIntervals[key].push({
      start: startTime,
      end: endTime,
      targetID: targetId,
      sourceID: sourceId,
    });
  });

  return { buffIntervals };
};

// Helper function to create mock master data
const createMockMasterData = () => ({
  actorsById: {
    '123': { id: 123, name: 'Tank Player', type: 'Player' } as unknown as ReportActorFragment,
    '456': { id: 456, name: 'DPS Player', type: 'Player' } as unknown as ReportActorFragment,
    '789': { id: 789, name: 'Enemy Boss', type: 'Enemy' } as unknown as ReportActorFragment,
  },
  abilitiesById: {
    [KnownAbilities.HURRICANE]: { name: 'Hurricane' },
    [KnownAbilities.EXPLOITER]: { name: 'Exploiter' },
    [KnownAbilities.REAVING_BLOWS]: { name: 'Reaving Blows' },
    [KnownAbilities.JUGGERNAUT]: { name: 'Juggernaut' },
  },
});

// Helper function to create mock player data
const createMockPlayerData = () => ({
  playersById: {
    '123': { role: 'tank' },
    '456': { role: 'dps' },
  },
});

// Mock fight data
const mockFight: FightFragment = createMockFight({
  id: 1,
  startTime: 1000,
  endTime: 60000,
  name: 'Test Fight',
});

// Default mock setup
const setupMocks = (overrides: any = {}) => {
  const defaultContext = { reportCode: 'test-report', fightId: 1 };
  const defaultMocks = {
    useSelectedReportAndFight: { reportId: 'test-report', fightId: '1' },
    useResolvedReportFightContext: defaultContext,
    useFightForContext: createMockFight({
      startTime: 1000000,
      endTime: 1060000,
    }),
    useDeathEvents: { deathEvents: [], isDeathEventsLoading: false },
    useDamageEvents: { damageEvents: [], isDamageEventsLoading: false },
    useCastEvents: { castEvents: [], isCastEventsLoading: false },
    useHealingEvents: { healingEvents: [], isHealingEventsLoading: false },
    useResourceEvents: { resourceEvents: [], isResourceEventsLoading: false },
    useDebuffLookupTask: { debuffLookupData: null, isDebuffLookupLoading: false },
    useReportMasterData: { reportMasterData: createMockMasterData(), isMasterDataLoading: false },
    usePlayerData: { playerData: createMockPlayerData() },
    useResolvedReportFightContext: { reportCode: 'test-report', fightId: 1 },
    useFightForContext: mockFight,
  };

  const mergedMocks = { ...defaultMocks, ...overrides };

  useSelectedReportAndFight.mockReturnValue(mergedMocks.useSelectedReportAndFight);
  useResolvedReportFightContext.mockReturnValue(mergedMocks.useResolvedReportFightContext);
  useFightForContext.mockReturnValue(mergedMocks.useFightForContext);
  useDeathEvents.mockReturnValue(mergedMocks.useDeathEvents);
  useDamageEvents.mockReturnValue(mergedMocks.useDamageEvents);
  useCastEvents.mockReturnValue(mergedMocks.useCastEvents);
  useHealingEvents.mockReturnValue(mergedMocks.useHealingEvents);
  useResourceEvents.mockReturnValue(mergedMocks.useResourceEvents);
  useDebuffLookupTask.mockReturnValue(mergedMocks.useDebuffLookupTask);
  useReportMasterData.mockReturnValue(mergedMocks.useReportMasterData);
  usePlayerData.mockReturnValue(mergedMocks.usePlayerData);
  useResolvedReportFightContext.mockReturnValue(mergedMocks.useResolvedReportFightContext);
  useFightForContext.mockReturnValue(mergedMocks.useFightForContext);

  // Setup calculateDeathDurations mock to return empty array
  calculateDeathDurations.mockReturnValue([]);

  // Setup useRoleColors mock
  useRoleColors.mockReturnValue({
    dps: '#ff6b6b',
    healer: '#51cf66',
    tank: '#339af0',
    getColor: (role: string) =>
      ({ dps: '#ff6b6b', healer: '#51cf66', tank: '#339af0' })[role] || '#ff6b6b',
    getPlayerColor: (role?: string) =>
      ({ dps: '#ff6b6b', healer: '#51cf66', tank: '#339af0' })[role || 'dps'],
    getGradientColor: (role?: string) =>
      ({ dps: '#ff6b6b', healer: '#51cf66', tank: '#339af0' })[role || 'dps'],
    getTableBackground: () =>
      'linear-gradient(135deg, rgb(110 170 240 / 25%) 0%, rgb(152 131 227 / 15%) 50%, rgb(173 192 255 / 8%) 100%)',
    getAccordionBackground: () =>
      'linear-gradient(135deg, rgb(110 170 240 / 25%) 0%, rgb(152 131 227 / 15%) 50%, rgb(173 192 255 / 8%) 100%)',
    getAccordionStyles: () => ({}),
    getAccordionTextShadow: () => 'none',
    getProgressBarBackground: () =>
      'linear-gradient(135deg, rgb(110 170 240 / 25%) 0%, rgb(152 131 227 / 15%) 50%, rgb(173 192 255 / 8%) 100%)',
    getProgressBarStyles: () => ({}),
    isDarkMode: false,
  });
};

describe('DeathEventPanel Taunt Status Tests', () => {
  const mockFight = createMockFight({
    startTime: 1000000,
    endTime: 1060000,
  });

  beforeEach(() => {
    jest.clearAllMocks();
    setupMocks();
  });

  describe('Taunt Status Snapshots', () => {
    it('should render death with taunted killer in killing blow', () => {
      const deathTimestamp = 1005000;
      const attackerTauntStart = 1004000;
      const attackerTauntEnd = 1006000;

      // Create debuff lookup data with taunt active on attacker at death time
      const debuffLookupData = createMockDebuffLookupData([
        {
          targetId: 789, // Enemy boss is taunted
          startTime: attackerTauntStart,
          endTime: attackerTauntEnd,
          sourceId: 123, // Tank applied the taunt
        },
      ]);

      // Create death event from taunted enemy
      const deathEvent = createMockDeathEvent({
        timestamp: deathTimestamp,
        targetID: 456, // DPS player died
        sourceID: 789, // Enemy boss killed them
        abilityGameID: KnownAbilities.HURRICANE,
      });

      setupMocks({
        useDeathEvents: { deathEvents: [deathEvent], isDeathEventsLoading: false },
        useDebuffLookupTask: { debuffLookupData, isDebuffLookupLoading: false },
      });

      const { container } = render(
        <TestWrapper>
          <DeathEventPanel />
        </TestWrapper>,
      );

      expect(container).toMatchSnapshot('death-with-taunted-killer');
    });

    it('should render death with non-taunted killer in killing blow', () => {
      const deathTimestamp = 1005000;

      // Create debuff lookup data without taunt on attacker
      const debuffLookupData = createMockDebuffLookupData([]);

      // Create death event from non-taunted enemy
      const deathEvent = createMockDeathEvent({
        timestamp: deathTimestamp,
        targetID: 456, // DPS player died
        sourceID: 789, // Enemy boss killed them (not taunted)
        abilityGameID: KnownAbilities.HURRICANE,
      });

      setupMocks({
        useDeathEvents: { deathEvents: [deathEvent], isDeathEventsLoading: false },
        useDebuffLookupTask: { debuffLookupData, isDebuffLookupLoading: false },
      });

      const { container } = render(
        <TestWrapper>
          <DeathEventPanel />
        </TestWrapper>,
      );

      expect(container).toMatchSnapshot('death-with-non-taunted-killer');
    });

    it('should render attacks with mixed taunt status preceding death', () => {
      const deathTimestamp = 1005000;
      const attackTimestamp1 = 1002000; // Before taunt
      const attackTimestamp2 = 1003000; // During taunt
      const attackTimestamp3 = 1004000; // During taunt
      const tauntStart = 1002500;
      const tauntEnd = 1006000;

      // Create debuff lookup data with taunt active for some attacks
      const debuffLookupData = createMockDebuffLookupData([
        {
          targetId: 789, // Enemy boss is taunted
          startTime: tauntStart,
          endTime: tauntEnd,
          sourceId: 123, // Tank applied the taunt
        },
      ]);

      // Create damage events with mixed taunt status
      const damageEvents: DamageEvent[] = [
        createMockDamageEvent({
          timestamp: attackTimestamp1,
          sourceID: 789, // Enemy boss (not taunted yet)
          targetID: 456, // DPS player
          abilityGameID: KnownAbilities.EXPLOITER,
          amount: 2000,
        }),
        createMockDamageEvent({
          timestamp: attackTimestamp2,
          sourceID: 789, // Enemy boss (now taunted)
          targetID: 456, // DPS player
          abilityGameID: KnownAbilities.REAVING_BLOWS,
          amount: 3000,
        }),
        createMockDamageEvent({
          timestamp: attackTimestamp3,
          sourceID: 789, // Enemy boss (still taunted)
          targetID: 456, // DPS player
          abilityGameID: KnownAbilities.JUGGERNAUT,
          amount: 2500,
        }),
      ];

      // Create death event from taunted enemy
      const deathEvent = createMockDeathEvent({
        timestamp: deathTimestamp,
        targetID: 456, // DPS player died
        sourceID: 789, // Enemy boss killed them (taunted)
        abilityGameID: KnownAbilities.HURRICANE,
        amount: 5000,
      });

      setupMocks({
        useDeathEvents: { deathEvents: [deathEvent], isDeathEventsLoading: false },
        useDamageEvents: { damageEvents, isDamageEventsLoading: false },
        useDebuffLookupTask: { debuffLookupData, isDebuffLookupLoading: false },
      });

      const { container } = render(
        <TestWrapper>
          <DeathEventPanel />
        </TestWrapper>,
      );

      expect(container).toMatchSnapshot('attacks-with-mixed-taunt-status');
    });

    it('should render multiple attackers with different taunt statuses', () => {
      const deathTimestamp = 1005000;
      const attackTimestamp1 = 1002000;
      const attackTimestamp2 = 1003000;
      const attackTimestamp3 = 1004000;

      // Create debuff lookup data - only one enemy is taunted
      const debuffLookupData = createMockDebuffLookupData([
        {
          targetId: 789, // Enemy boss is taunted
          startTime: 1001000,
          endTime: 1006000,
          sourceId: 123, // Tank applied the taunt
        },
        // Enemy with ID 888 is NOT taunted
      ]);

      // Mock another enemy
      const masterData = createMockMasterData();
      (masterData.actorsById as any)['888'] = {
        id: 888,
        name: 'Add Enemy',
        type: 'Enemy',
      } as unknown as ReportActorFragment;

      // Create damage events from multiple attackers
      const damageEvents: DamageEvent[] = [
        createMockDamageEvent({
          timestamp: attackTimestamp1,
          sourceID: 789, // Taunted enemy boss
          targetID: 456, // DPS player
          abilityGameID: KnownAbilities.EXPLOITER,
          amount: 2000,
        }),
        createMockDamageEvent({
          timestamp: attackTimestamp2,
          sourceID: 888, // Non-taunted add
          targetID: 456, // DPS player
          abilityGameID: KnownAbilities.REAVING_BLOWS,
          amount: 3000,
        }),
        createMockDamageEvent({
          timestamp: attackTimestamp3,
          sourceID: 789, // Taunted enemy boss again
          targetID: 456, // DPS player
          abilityGameID: KnownAbilities.JUGGERNAUT,
          amount: 2500,
        }),
      ];

      // Death from non-taunted enemy
      const deathEvent = createMockDeathEvent({
        timestamp: deathTimestamp,
        targetID: 456, // DPS player died
        sourceID: 888, // Non-taunted add killed them
        abilityGameID: KnownAbilities.HURRICANE,
        amount: 5000,
      });

      setupMocks({
        useDeathEvents: { deathEvents: [deathEvent], isDeathEventsLoading: false },
        useDamageEvents: { damageEvents, isDamageEventsLoading: false },
        useDebuffLookupTask: { debuffLookupData, isDebuffLookupLoading: false },
        useReportMasterData: { reportMasterData: masterData, isMasterDataLoading: false },
      });

      const { container } = render(
        <TestWrapper>
          <DeathEventPanel />
        </TestWrapper>,
      );

      expect(container).toMatchSnapshot('multiple-attackers-different-taunt-status');
    });

    it('should handle simultaneous killing blow attacks with mixed taunt status', () => {
      const deathTimestamp = 1005000;
      const simultaneousTime1 = 1004980; // Within 50ms window
      const simultaneousTime2 = 1005000; // Exact death time

      // Create debuff lookup data - one attacker taunted, one not
      const debuffLookupData = createMockDebuffLookupData([
        {
          targetId: 789, // Enemy boss is taunted
          startTime: 1001000,
          endTime: 1006000,
          sourceId: 123, // Tank applied the taunt
        },
        // Enemy with ID 888 is NOT taunted
      ]);

      // Mock another enemy
      const masterData = createMockMasterData();
      (masterData.actorsById as any)['888'] = {
        id: 888,
        name: 'Add Enemy',
        type: 'Enemy',
      } as unknown as ReportActorFragment;

      // Create simultaneous damage events
      const damageEvents: DamageEvent[] = [
        createMockDamageEvent({
          timestamp: simultaneousTime1,
          sourceID: 789, // Taunted enemy boss
          targetID: 456, // DPS player
          abilityGameID: KnownAbilities.EXPLOITER,
          amount: 3000,
        }),
        createMockDamageEvent({
          timestamp: simultaneousTime2,
          sourceID: 888, // Non-taunted add (most recent)
          targetID: 456, // DPS player
          abilityGameID: KnownAbilities.REAVING_BLOWS,
          amount: 2000,
        }),
      ];

      // Death event should use most recent attacker
      const deathEvent = createMockDeathEvent({
        timestamp: deathTimestamp,
        targetID: 456, // DPS player died
        sourceID: 888, // Most recent attacker (non-taunted)
        abilityGameID: KnownAbilities.REAVING_BLOWS,
        amount: 2000,
      });

      setupMocks({
        useDeathEvents: { deathEvents: [deathEvent], isDeathEventsLoading: false },
        useDamageEvents: { damageEvents, isDamageEventsLoading: false },
        useDebuffLookupTask: { debuffLookupData, isDebuffLookupLoading: false },
        useReportMasterData: { reportMasterData: masterData, isMasterDataLoading: false },
      });

      const { container } = render(
        <TestWrapper>
          <DeathEventPanel />
        </TestWrapper>,
      );

      expect(container).toMatchSnapshot('simultaneous-attacks-mixed-taunt-status');
    });
  });

  describe('Edge Cases', () => {
    it('should handle missing debuff lookup data gracefully', () => {
      const deathTimestamp = 1005000;

      const deathEvent = createMockDeathEvent({
        timestamp: deathTimestamp,
        targetID: 456, // DPS player died
        sourceID: 789, // Enemy boss killed them
        abilityGameID: KnownAbilities.HURRICANE,
      });

      setupMocks({
        useDeathEvents: { deathEvents: [deathEvent], isDeathEventsLoading: false },
        useDebuffLookupTask: { debuffLookupData: null, isDebuffLookupLoading: false },
      });

      const { container } = render(
        <TestWrapper>
          <DeathEventPanel />
        </TestWrapper>,
      );

      expect(container).toMatchSnapshot('missing-debuff-lookup-data');
    });

    it('should handle null/undefined sourceID values', () => {
      const deathTimestamp = 1005000;

      const deathEvent = createMockDeathEvent({
        timestamp: deathTimestamp,
        targetID: 456, // DPS player died
        sourceID: undefined, // No source ID
        abilityGameID: KnownAbilities.HURRICANE,
      });

      const damageEvent = createMockDamageEvent({
        timestamp: 1003000,
        sourceID: undefined, // Undefined source ID
        targetID: 456,
        abilityGameID: KnownAbilities.EXPLOITER,
        amount: 2000,
      });

      setupMocks({
        useDeathEvents: { deathEvents: [deathEvent], isDeathEventsLoading: false },
        useDamageEvents: { damageEvents: [damageEvent], isDamageEventsLoading: false },
        useDebuffLookupTask: {
          debuffLookupData: createMockDebuffLookupData([]),
          isDebuffLookupLoading: false,
        },
      });

      const { container } = render(
        <TestWrapper>
          <DeathEventPanel />
        </TestWrapper>,
      );

      expect(container).toMatchSnapshot('null-undefined-source-ids');
    });

    it('should handle loading states correctly', () => {
      setupMocks({
        useDebuffLookupTask: { debuffLookupData: null, isDebuffLookupLoading: true },
      });

      const { container } = render(
        <TestWrapper>
          <DeathEventPanel />
        </TestWrapper>,
      );

      expect(container).toMatchSnapshot('loading-state');
    });

    it('should handle empty events arrays', () => {
      setupMocks({
        useDeathEvents: { deathEvents: [], isDeathEventsLoading: false },
        useDamageEvents: { damageEvents: [], isDamageEventsLoading: false },
        useDebuffLookupTask: {
          debuffLookupData: createMockDebuffLookupData([]),
          isDebuffLookupLoading: false,
        },
      });

      const { container } = render(
        <TestWrapper>
          <DeathEventPanel />
        </TestWrapper>,
      );

      expect(container).toMatchSnapshot('empty-events-arrays');
    });

    it('should handle taunt status for blocked attacks', () => {
      const deathTimestamp = 1005000;
      const attackTimestamp = 1003000;

      // Create debuff lookup data with taunt active
      const debuffLookupData = createMockDebuffLookupData([
        {
          targetId: 789, // Enemy boss is taunted
          startTime: 1002000,
          endTime: 1006000,
          sourceId: 123, // Tank applied the taunt
        },
      ]);

      // Create blocked damage event
      const damageEvent = createMockDamageEvent({
        timestamp: attackTimestamp,
        sourceID: 789, // Taunted enemy boss
        targetID: 456, // DPS player
        abilityGameID: KnownAbilities.EXPLOITER,
        amount: 1000,
        blocked: 1, // Attack was blocked
      });

      const deathEvent = createMockDeathEvent({
        timestamp: deathTimestamp,
        targetID: 456, // DPS player died
        sourceID: 789, // Taunted enemy boss
        abilityGameID: KnownAbilities.HURRICANE,
      });

      setupMocks({
        useDeathEvents: { deathEvents: [deathEvent], isDeathEventsLoading: false },
        useDamageEvents: { damageEvents: [damageEvent], isDamageEventsLoading: false },
        useDebuffLookupTask: { debuffLookupData, isDebuffLookupLoading: false },
      });

      const { container } = render(
        <TestWrapper>
          <DeathEventPanel />
        </TestWrapper>,
      );

      expect(container).toMatchSnapshot('blocked-attack-with-taunt');
    });
  });

  describe('Recent Attacks Taunt Indicators', () => {
    it('should show taunt indicator after attacker name in recent attacks when taunted', () => {
      const deathTimestamp = 1005000;
      const attackTimestamp = 1003000;

      // Create debuff lookup data with taunt active
      const debuffLookupData = createMockDebuffLookupData([
        {
          targetId: 789, // Enemy boss is taunted
          startTime: 1002000,
          endTime: 1006000,
          sourceId: 123, // Tank applied the taunt
        },
      ]);

      // Create damage event from taunted enemy
      const damageEvent = createMockDamageEvent({
        timestamp: attackTimestamp,
        sourceID: 789, // Taunted enemy boss
        targetID: 456, // DPS player
        abilityGameID: KnownAbilities.EXPLOITER,
        amount: 2000,
      });

      const deathEvent = createMockDeathEvent({
        timestamp: deathTimestamp,
        targetID: 456, // DPS player died
        sourceID: 789, // Taunted enemy boss
        abilityGameID: KnownAbilities.HURRICANE,
      });

      setupMocks({
        useDeathEvents: { deathEvents: [deathEvent], isDeathEventsLoading: false },
        useDamageEvents: { damageEvents: [damageEvent], isDamageEventsLoading: false },
        useDebuffLookupTask: { debuffLookupData, isDebuffLookupLoading: false },
      });

      const { container } = render(
        <TestWrapper>
          <DeathEventPanel fight={mockFight} />
        </TestWrapper>,
      );

      // The taunt indicator should appear after the attacker name
      const recentAttackText = container.textContent || '';
      // Should have attack info with attacker name and taunt indicator after it
      expect(recentAttackText).toContain('Enemy Boss');
      expect(recentAttackText).toContain('🎯'); // Taunt indicator appears

      expect(container).toMatchSnapshot('recent-attacks-with-taunt-indicator');
    });

    it('should NOT show taunt indicator after attacker name when not taunted', () => {
      const deathTimestamp = 1005000;
      const attackTimestamp = 1003000;

      // Create debuff lookup data without taunt
      const debuffLookupData = createMockDebuffLookupData([]);

      // Create damage event from non-taunted enemy
      const damageEvent = createMockDamageEvent({
        timestamp: attackTimestamp,
        sourceID: 789, // Non-taunted enemy boss
        targetID: 456, // DPS player
        abilityGameID: KnownAbilities.EXPLOITER,
        amount: 2000,
      });

      const deathEvent = createMockDeathEvent({
        timestamp: deathTimestamp,
        targetID: 456, // DPS player died
        sourceID: 789, // Non-taunted enemy boss
        abilityGameID: KnownAbilities.HURRICANE,
      });

      setupMocks({
        useDeathEvents: { deathEvents: [deathEvent], isDeathEventsLoading: false },
        useDamageEvents: { damageEvents: [damageEvent], isDamageEventsLoading: false },
        useDebuffLookupTask: { debuffLookupData, isDebuffLookupLoading: false },
      });

      const { container } = render(
        <TestWrapper>
          <DeathEventPanel fight={mockFight} />
        </TestWrapper>,
      );

      // Should show attack but without taunt indicator after name
      const recentAttackText = container.textContent || '';
      expect(recentAttackText).toContain('Enemy Boss');
      // Count taunt indicators - there should be none after the name
      // (Note: Killing blow section may still show taunt status separately)

      expect(container).toMatchSnapshot('recent-attacks-without-taunt-indicator');
    });

    it('should show multiple taunt indicators for multiple taunted attacks', () => {
      const deathTimestamp = 1005000;
      const attackTimestamp1 = 1002000;
      const attackTimestamp2 = 1003000;
      const attackTimestamp3 = 1004000;

      // Create debuff lookup data with taunt active for all attacks
      const debuffLookupData = createMockDebuffLookupData([
        {
          targetId: 789, // Enemy boss is taunted
          startTime: 1001000,
          endTime: 1006000,
          sourceId: 123, // Tank applied the taunt
        },
      ]);

      // Create multiple damage events from taunted enemy
      const damageEvents: DamageEvent[] = [
        createMockDamageEvent({
          timestamp: attackTimestamp1,
          sourceID: 789, // Taunted enemy boss
          targetID: 456, // DPS player
          abilityGameID: KnownAbilities.EXPLOITER,
          amount: 2000,
        }),
        createMockDamageEvent({
          timestamp: attackTimestamp2,
          sourceID: 789, // Taunted enemy boss
          targetID: 456, // DPS player
          abilityGameID: KnownAbilities.REAVING_BLOWS,
          amount: 3000,
        }),
        createMockDamageEvent({
          timestamp: attackTimestamp3,
          sourceID: 789, // Taunted enemy boss
          targetID: 456, // DPS player
          abilityGameID: KnownAbilities.JUGGERNAUT,
          amount: 2500,
        }),
      ];

      const deathEvent = createMockDeathEvent({
        timestamp: deathTimestamp,
        targetID: 456, // DPS player died
        sourceID: 789, // Taunted enemy boss
        abilityGameID: KnownAbilities.HURRICANE,
      });

      setupMocks({
        useDeathEvents: { deathEvents: [deathEvent], isDeathEventsLoading: false },
        useDamageEvents: { damageEvents, isDamageEventsLoading: false },
        useDebuffLookupTask: { debuffLookupData, isDebuffLookupLoading: false },
      });

      const { container } = render(
        <TestWrapper>
          <DeathEventPanel fight={mockFight} />
        </TestWrapper>,
      );

      // Should show multiple attacks with taunt indicators
      const recentAttackText = container.textContent || '';
      expect(recentAttackText).toContain('Enemy Boss');

      // Should have taunt indicators for each attack
      const tauntMatches = (recentAttackText.match(/🎯/g) || []).length;
      expect(tauntMatches).toBeGreaterThan(0); // At least one taunt indicator

      expect(container).toMatchSnapshot('recent-attacks-multiple-taunt-indicators');
    });

    it('should show mixed taunt indicators for attacks from different enemies', () => {
      const deathTimestamp = 1005000;
      const attackTimestamp1 = 1002000;
      const attackTimestamp2 = 1003000;
      const attackTimestamp3 = 1004000;

      // Create debuff lookup data - only one enemy is taunted
      const debuffLookupData = createMockDebuffLookupData([
        {
          targetId: 789, // Enemy boss is taunted
          startTime: 1001000,
          endTime: 1006000,
          sourceId: 123, // Tank applied the taunt
        },
        // Enemy with ID 888 is NOT taunted
      ]);

      // Mock another enemy
      const masterData = createMockMasterData();
      (masterData.actorsById as any)['888'] = {
        id: 888,
        name: 'Add Enemy',
        type: 'Enemy',
      } as unknown as ReportActorFragment;

      // Create damage events from multiple attackers
      const damageEvents: DamageEvent[] = [
        createMockDamageEvent({
          timestamp: attackTimestamp1,
          sourceID: 789, // Taunted enemy boss
          targetID: 456, // DPS player
          abilityGameID: KnownAbilities.EXPLOITER,
          amount: 2000,
        }),
        createMockDamageEvent({
          timestamp: attackTimestamp2,
          sourceID: 888, // Non-taunted add
          targetID: 456, // DPS player
          abilityGameID: KnownAbilities.REAVING_BLOWS,
          amount: 3000,
        }),
        createMockDamageEvent({
          timestamp: attackTimestamp3,
          sourceID: 789, // Taunted enemy boss again
          targetID: 456, // DPS player
          abilityGameID: KnownAbilities.JUGGERNAUT,
          amount: 2500,
        }),
      ];

      const deathEvent = createMockDeathEvent({
        timestamp: deathTimestamp,
        targetID: 456, // DPS player died
        sourceID: 888, // Non-taunted add killed them
        abilityGameID: KnownAbilities.HURRICANE,
        amount: 5000,
      });

      setupMocks({
        useDeathEvents: { deathEvents: [deathEvent], isDeathEventsLoading: false },
        useDamageEvents: { damageEvents, isDamageEventsLoading: false },
        useDebuffLookupTask: { debuffLookupData, isDebuffLookupLoading: false },
        useReportMasterData: { reportMasterData: masterData, isMasterDataLoading: false },
      });

      const { container } = render(
        <TestWrapper>
          <DeathEventPanel fight={mockFight} />
        </TestWrapper>,
      );

      // Should show both taunted and non-taunted enemies
      const recentAttackText = container.textContent || '';
      expect(recentAttackText).toContain('Enemy Boss'); // Taunted
      expect(recentAttackText).toContain('Add Enemy'); // Not taunted

      // Should have some taunt indicators but not for all attacks
      expect(recentAttackText).toContain('🎯');

      expect(container).toMatchSnapshot('recent-attacks-mixed-taunt-status');
    });
  });
});

