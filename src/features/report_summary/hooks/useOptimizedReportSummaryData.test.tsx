import { configureStore } from '@reduxjs/toolkit';
import { renderHook, waitFor } from '@testing-library/react';
import React from 'react';
import { Provider } from 'react-redux';

import { EsoLogsClientProvider } from '../../../EsoLogsClientContext';
import { LoggerProvider } from '../../../contexts/LoggerContext';

import { useOptimizedReportSummaryData } from './useOptimizedReportSummaryData';

// One 10s fight.
const mockFights = [{ id: 1, name: 'Boss', startTime: 0, endTime: 10_000 }];

// Player 1 deals 600 to the boss; the boss (enemy) deals 400 to the player.
// Only the player-outgoing 600 should count toward totals/DPS/percentages.
const mockDamageByFight: Record<number, unknown[]> = {
  1: [
    {
      timestamp: 1,
      type: 'damage',
      sourceID: 1,
      sourceIsFriendly: true,
      targetID: 50,
      targetIsFriendly: false,
      abilityGameID: 1000,
      fight: 1,
      hitType: 1,
      amount: 600,
      castTrackID: 0,
      sourceResources: {},
      targetResources: {},
    },
    {
      timestamp: 2,
      type: 'damage',
      sourceID: 50,
      sourceIsFriendly: false,
      targetID: 1,
      targetIsFriendly: false,
      abilityGameID: 2000,
      fight: 1,
      hitType: 1,
      amount: 400,
      castTrackID: 0,
      sourceResources: {},
      targetResources: {},
    },
  ],
};

const mockActors = {
  1: { id: 1, name: 'Alice', type: 'Player' },
  50: { id: 50, name: 'Boss', type: 'NPC' },
};

const mockAbilities = {
  1000: { gameID: 1000, name: 'Sword Hit', type: '1' },
  2000: { gameID: 2000, name: 'Boss Slam', type: '1' },
};

jest.mock('../../../store/events_data/damageEventsSlice', () => {
  const { createAsyncThunk } = jest.requireActual('@reduxjs/toolkit');
  return {
    fetchDamageEvents: createAsyncThunk(
      'test/fetchDamageEvents',
      async ({ fight }: { fight: { id: number } }) => mockDamageByFight[fight.id] ?? [],
    ),
  };
});

jest.mock('../../../store/events_data/deathEventsSlice', () => {
  const { createAsyncThunk } = jest.requireActual('@reduxjs/toolkit');
  return {
    fetchDeathEvents: createAsyncThunk('test/fetchDeathEvents', async () => []),
  };
});

jest.mock('../../../store/events_data/healingEventsSlice', () => {
  const { createAsyncThunk } = jest.requireActual('@reduxjs/toolkit');
  return {
    fetchHealingEvents: createAsyncThunk('test/fetchHealingEvents', async () => []),
  };
});

jest.mock('../../../store/report/reportSelectors', () => ({
  selectReportFights: () => mockFights,
}));

jest.mock('../../../store/master_data/masterDataSelectors', () => ({
  selectActorsByIdForContext: () => mockActors,
  selectAbilitiesByIdForContext: () => mockAbilities,
}));

const makeWrapper = (
  reportData: Record<string, unknown> = { title: 'Test Report', zone: { name: 'Test Zone' } },
) => {
  const store = configureStore({
    reducer: {
      report: () => ({ data: reportData }),
    },
    middleware: (getDefault) => getDefault({ serializableCheck: false, immutableCheck: false }),
  });
  const client = { query: jest.fn(), mutate: jest.fn(), watchQuery: jest.fn() };
  const wrapper = ({ children }: { children: React.ReactNode }) => (
    <Provider store={store}>
      <LoggerProvider>
        {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
        <EsoLogsClientProvider client={client as any}>{children}</EsoLogsClientProvider>
      </LoggerProvider>
    </Provider>
  );
  return wrapper;
};

describe('useOptimizedReportSummaryData', () => {
  it('excludes enemy/damage-taken events from totals and percentages', async () => {
    const { result } = renderHook(() => useOptimizedReportSummaryData('test123'), {
      wrapper: makeWrapper(),
    });

    await waitFor(() => expect(result.current.reportSummaryData).not.toBeNull());

    const { damageBreakdown } = result.current.reportSummaryData!;

    // 600 player-outgoing damage; the boss's 400 incoming is excluded.
    expect(damageBreakdown.totalDamage).toBe(600);

    // Only the player appears, and is 100% of player-outgoing damage (not 60%).
    expect(damageBreakdown.playerBreakdown).toHaveLength(1);
    expect(damageBreakdown.playerBreakdown[0].playerName).toBe('Alice');
    expect(damageBreakdown.playerBreakdown[0].damagePercentage).toBe(100);

    // 600 damage over a 10s fight = 60 DPS.
    expect(damageBreakdown.dps).toBeCloseTo(60);
  });

  it('reports the session wall-clock span as the header duration', async () => {
    const { result } = renderHook(() => useOptimizedReportSummaryData('test123'), {
      wrapper: makeWrapper(),
    });

    await waitFor(() => expect(result.current.reportSummaryData).not.toBeNull());

    // first.startTime (0) -> last.endTime (10_000)
    expect(result.current.reportSummaryData!.reportInfo.duration).toBe(10_000);
    // No hardcoded owner placeholder.
    expect(result.current.reportSummaryData!.reportInfo.ownerName).toBeUndefined();
  });

  it('surfaces the report owner name when the report has an owner', async () => {
    const { result } = renderHook(() => useOptimizedReportSummaryData('test123'), {
      wrapper: makeWrapper({
        title: 'Test Report',
        zone: { name: 'Test Zone' },
        owner: { name: 'GuildLeader' },
      }),
    });

    await waitFor(() => expect(result.current.reportSummaryData).not.toBeNull());

    expect(result.current.reportSummaryData!.reportInfo.ownerName).toBe('GuildLeader');
  });
});
