import { configureStore } from '@reduxjs/toolkit';
import { act, renderHook, waitFor } from '@testing-library/react';
import React from 'react';
import { Provider } from 'react-redux';

import { EsoLogsClientProvider } from '../../../EsoLogsClientContext';
import { LoggerProvider } from '../../../contexts/LoggerContext';

import { useOptimizedReportSummaryData, withTimeout } from './useOptimizedReportSummaryData';

// One 10s fight.
const mockFights = [{ id: 1, name: 'Boss', startTime: 0, endTime: 10_000 }];

// When set to a fight id, the mocked damage fetch for that fight never settles —
// used to exercise the per-fight timeout wiring. `mock`-prefixed so jest's
// hoisted mock factory may reference it.
let mockHangDamageFightId: number | null = null;

// Tier-1 server-side tables (damage leaderboard + death analysis inputs).
// jest's global `resetMocks` wipes jest.fn implementations before each test, so
// this returns undefined by default (the hook falls back to the raw-event path,
// exactly what the default tests exercise). Override per-test with
// `mockResolvedValueOnce`. (The real module would hit the network via the
// context's real client, which hangs in jsdom — every fetch path is mocked.)
const mockFetchSummaryTables = jest.fn();

// Raw death-events fetch — a jest.fn so the table path can assert it was NOT
// dispatched. `resetMocks` clears its calls + impl between tests; the
// fallback test sets its return with `mockResolvedValueOnce`.
const mockFetchDeathEventsImpl = jest.fn();

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

// A plain async function (not a jest.fn) so `resetMocks` can't wipe its body —
// mirrors how the original damage thunk was mocked via createAsyncThunk.
jest.mock('../summaryDamageEvents', () => ({
  fetchSummaryFriendlyDamageEvents: async ({ fight }: { fight: { id: number } }) => {
    if (mockHangDamageFightId === fight.id) {
      // Never settles — the per-fight timeout must rescue the batch loop.
      return new Promise<unknown[]>(() => {});
    }
    return mockDamageByFight[fight.id] ?? [];
  },
}));

jest.mock('../../../store/events_data/deathEventsSlice', () => {
  const { createAsyncThunk } = jest.requireActual('@reduxjs/toolkit');
  return {
    fetchDeathEvents: createAsyncThunk('test/fetchDeathEvents', (...args: unknown[]) =>
      mockFetchDeathEventsImpl(...(args as [])),
    ),
  };
});

jest.mock('../resurrectionEvents', () => ({
  fetchResurrectionEvents: jest.fn(async () => []),
}));

jest.mock('../reportSummaryTables', () => ({
  fetchSummaryTables: (...args: unknown[]) => mockFetchSummaryTables(...args),
}));

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

  it('prefers the Tier-1 aggregated leaderboard when it is available', async () => {
    mockFetchSummaryTables.mockResolvedValueOnce({
      damage: {
        totalDamage: 1234,
        dps: 99,
        playerBreakdown: [
          {
            playerId: '1',
            playerName: 'Alice',
            totalDamage: 1234,
            dps: 99,
            damagePercentage: 100,
            fightBreakdown: [],
          },
        ],
      },
      deaths: null,
    });

    const { result } = renderHook(() => useOptimizedReportSummaryData('test123'), {
      wrapper: makeWrapper(),
    });
    await waitFor(() => expect(result.current.reportSummaryData).not.toBeNull());

    const { damageBreakdown } = result.current.reportSummaryData!;
    // Player table comes from the Tier-1 table(), not the raw-event sum.
    expect(damageBreakdown.totalDamage).toBe(1234);
    expect(damageBreakdown.playerBreakdown).toHaveLength(1);
    expect(damageBreakdown.playerBreakdown[0].playerName).toBe('Alice');
    // Tier-2 raw events still fill the damage-type breakdown.
    expect(Array.isArray(damageBreakdown.abilityTypeBreakdown)).toBe(true);
  });

  it('builds the death analysis from the Deaths table without fetching raw deaths', async () => {
    const { adaptDeathsTable } = jest.requireActual('../reportSummaryTables');
    const tableDeaths = adaptDeathsTable({
      data: {
        entries: [
          {
            name: 'Alice',
            id: 1,
            type: 'Arcanist',
            timestamp: 5000,
            fight: 1,
            overkill: 10,
            killingBlow: { guid: 9000, name: 'Meteor', type: 1 },
            events: [
              {
                timestamp: 5000,
                type: 'damage',
                sourceID: 50,
                sourceIsFriendly: false,
                targetID: 1,
                amount: 1000,
              },
            ],
          },
        ],
      },
    });
    mockFetchSummaryTables.mockResolvedValueOnce({
      damage: {
        totalDamage: 1234,
        dps: 99,
        playerBreakdown: [
          {
            playerId: '1',
            playerName: 'Alice',
            totalDamage: 1234,
            dps: 99,
            damagePercentage: 100,
            fightBreakdown: [],
          },
        ],
      },
      deaths: tableDeaths,
    });

    const { result } = renderHook(() => useOptimizedReportSummaryData('test123'), {
      wrapper: makeWrapper(),
    });
    await waitFor(() => expect(result.current.reportSummaryData?.deathAnalysis).toBeDefined());

    const death = result.current.reportSummaryData!.deathAnalysis!;
    // One player death; A8 hit size comes from the table recap (not a raw crawl).
    expect(death.totalDeaths).toBe(1);
    expect(death.mechanicDeaths.find((m) => m.mechanicId === 9000)?.averageKillingBlowHitSize).toBe(
      1000,
    );
    // The raw death thunk is never dispatched when the table provided deaths.
    expect(mockFetchDeathEventsImpl).not.toHaveBeenCalled();
  });

  it('falls back to the raw death fetch when the Deaths table is unavailable', async () => {
    // Default mockFetchSummaryTables returns deaths:null -> raw-death fallback.
    mockFetchDeathEventsImpl.mockResolvedValueOnce([
      {
        type: 'death',
        targetID: 1,
        targetIsFriendly: true,
        sourceID: 50,
        sourceIsFriendly: false,
        abilityGameID: 2000,
        fight: 1,
        timestamp: 5000,
        amount: 0,
      },
    ]);

    const { result } = renderHook(() => useOptimizedReportSummaryData('test123'), {
      wrapper: makeWrapper(),
    });
    await waitFor(() => expect(result.current.reportSummaryData?.deathAnalysis).toBeDefined());

    expect(mockFetchDeathEventsImpl).toHaveBeenCalled();
    expect(result.current.reportSummaryData!.deathAnalysis!.totalDeaths).toBe(1);
  });
});

describe('useOptimizedReportSummaryData per-fight timeout wiring', () => {
  beforeEach(() => jest.useFakeTimers());
  afterEach(() => {
    jest.useRealTimers();
    mockHangDamageFightId = null;
  });

  it('records a fight error and still commits the summary when a fetch hangs', async () => {
    // Fight 1's damage fetch never settles; death/rez resolve normally.
    mockHangDamageFightId = 1;

    const { result } = renderHook(() => useOptimizedReportSummaryData('test123'), {
      wrapper: makeWrapper(),
    });

    // Advance past the per-fight timeout; act() flushes the rejection, the
    // batch-loop continuation, aggregation and the final state commit.
    await act(async () => {
      await jest.advanceTimersByTimeAsync(60_000);
    });

    // The hook recovered instead of hanging: it committed a summary...
    expect(result.current.isLoading).toBe(false);
    expect(result.current.reportSummaryData).not.toBeNull();
    // ...with the hung fight recorded as a per-fight error.
    expect(result.current.reportSummaryData!.errors.fightErrors[1]).toMatch(
      /Timed out fetching damage events for Boss after 60000 ms/,
    );
  });
});

describe('withTimeout (per-fight fetch safety net)', () => {
  afterEach(() => {
    jest.useRealTimers();
  });

  it('rejects a hung promise once the timeout elapses', async () => {
    jest.useFakeTimers();
    const neverSettles = new Promise<number>(() => {});
    const raced = withTimeout(neverSettles, 60_000, 'damage events for Boss');
    const assertion = expect(raced).rejects.toThrow(
      'Timed out fetching damage events for Boss after 60000 ms',
    );
    await jest.advanceTimersByTimeAsync(60_000);
    await assertion;
  });

  it('passes a value straight through and clears the timer when it settles first', async () => {
    jest.useFakeTimers();
    await expect(withTimeout(Promise.resolve('events'), 60_000, 'death events')).resolves.toBe(
      'events',
    );
    // The timeout timer is cleared on settle — nothing left to leak.
    expect(jest.getTimerCount()).toBe(0);
  });
});
