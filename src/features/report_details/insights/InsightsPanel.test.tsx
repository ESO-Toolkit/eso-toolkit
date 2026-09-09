import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import React from 'react';

import type { FightFragment } from '../../../graphql/gql/graphql';

import { InsightsPanel } from './InsightsPanel';

const mockUseDamageEvents = jest.fn();
const mockUsePlayerData = jest.fn();
const mockUseCombatantInfoEvents = jest.fn();
const mockDispatch = jest.fn();
const mockDamageClient = {};
const mockEventClient = {};
const mockUseEsoLogsClientContext = jest.fn();

jest.mock('react-redux', () => ({
  useSelector: jest.fn(() => null),
}));

jest.mock('../../../hooks', () => ({
  useCombatantInfoEvents: (...args: unknown[]) => mockUseCombatantInfoEvents(...args),
  useDamageEvents: (...args: unknown[]) => mockUseDamageEvents(...args),
  usePlayerData: (...args: unknown[]) => mockUsePlayerData(...args),
  useResolvedReportFightContext: (context: unknown) => context,
}));

jest.mock('../../../EsoLogsClientContext', () => ({
  useEsoLogsClientContext: () => mockUseEsoLogsClientContext(),
  useEsoLogsClientInstance: () => mockEventClient,
}));

jest.mock('../../../store/useAppDispatch', () => ({
  useAppDispatch: () => mockDispatch,
}));

jest.mock('../../../store/events_data/damageEventsSlice', () => ({
  clearDamageEventsForContext: (payload: unknown) => ({ type: 'clear-damage', payload }),
  fetchDamageEvents: (payload: unknown) => ({ type: 'fetch-damage', payload }),
}));

jest.mock('../../../store/events_data/combatantInfoEventsSlice', () => ({
  clearCombatantInfoEventsForContext: (payload: unknown) => ({
    type: 'clear-combatant-info',
    payload,
  }),
  fetchCombatantInfoEvents: (payload: unknown) => ({ type: 'fetch-combatant-info', payload }),
}));

jest.mock('../../../store/player_data/playerDataSlice', () => ({
  clearPlayerDataForContext: (payload: unknown) => ({ type: 'clear-player-data', payload }),
  fetchPlayerData: (payload: unknown) => ({ type: 'fetch-player-data', payload }),
}));

jest.mock('./InsightsPanelView', () => ({
  InsightsPanelView: ({
    dataState,
    fightInitiator,
    onRetry,
    retryAvailability,
  }: {
    dataState: { kind: string };
    fightInitiator: { kind: string; message?: string; name?: string };
    onRetry: () => void;
    retryAvailability: { canRetry: boolean; unavailableReason: string | null };
  }) => (
    <>
      <button disabled={!retryAvailability.canRetry} onClick={onRetry}>
        {dataState.kind}
      </button>
      {retryAvailability.unavailableReason ? (
        <span>{retryAvailability.unavailableReason}</span>
      ) : null}
      <output data-testid="fight-initiator-state">
        {fightInitiator.kind === 'available' ? fightInitiator.name : fightInitiator.message}
      </output>
    </>
  ),
}));

const fight = {
  encounterID: 1,
  endTime: 65_000,
  friendlyPlayers: [],
  id: 1,
  name: 'Test fight',
  startTime: 0,
} as FightFragment;

type MockDamageState = {
  damageEvents: unknown[];
  damageEventsError: string | null;
  damageEventsStatus: 'failed' | 'loading' | 'succeeded';
  isDamageEventsLoading: boolean;
  selectedFight: FightFragment;
};

const succeededCombatantInfoEvents = {
  combatantInfoEvents: [],
  combatantInfoEventsError: null,
  combatantInfoEventsStatus: 'succeeded' as const,
  isCombatantInfoEventsLoading: false,
};

const succeededPlayerData = {
  isPlayerDataLoading: false,
  playerData: {
    error: null,
    playersById: {},
    status: 'succeeded' as const,
  },
};

describe('InsightsPanel retry', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseEsoLogsClientContext.mockReturnValue({ client: mockDamageClient, isReady: true });
    mockUseCombatantInfoEvents.mockReturnValue(succeededCombatantInfoEvents);
    mockUsePlayerData.mockReturnValue(succeededPlayerData);
  });

  it('keeps the initiator state independent while damage events finish loading', () => {
    const initiatorFight = { ...fight, friendlyPlayers: [42] };
    mockUseDamageEvents.mockReturnValue({
      damageEvents: [{ sourceID: 42, sourceIsFriendly: true, timestamp: 10 }],
      damageEventsError: null,
      damageEventsStatus: 'loading' as const,
      isDamageEventsLoading: true,
      selectedFight: initiatorFight,
    });
    mockUsePlayerData.mockReturnValue({
      isPlayerDataLoading: false,
      playerData: {
        error: null,
        playersById: { 42: { displayName: 'Initiating Player' } },
        status: 'succeeded' as const,
      },
    });

    const { rerender } = render(
      <InsightsPanel context={{ reportCode: 'report-1', fightId: 1 }} fight={initiatorFight} />,
    );

    expect(screen.getByTestId('fight-initiator-state')).toHaveTextContent(
      'Loading damage events to identify the fight initiator.',
    );

    mockUseDamageEvents.mockReturnValue({
      damageEvents: [{ sourceID: 42, sourceIsFriendly: true, timestamp: 10 }],
      damageEventsError: null,
      damageEventsStatus: 'succeeded' as const,
      isDamageEventsLoading: false,
      selectedFight: initiatorFight,
    });
    mockUsePlayerData.mockReturnValue({
      isPlayerDataLoading: false,
      playerData: {
        error: null,
        playersById: { 42: { displayName: 'Initiating Player' } },
        status: 'succeeded' as const,
      },
    });

    rerender(
      <InsightsPanel context={{ reportCode: 'report-1', fightId: 1 }} fight={initiatorFight} />,
    );

    expect(screen.getByTestId('fight-initiator-state')).toHaveTextContent('Initiating Player');
  });

  it('invalidates and directly refetches only the failed stream', () => {
    mockUseDamageEvents.mockReturnValue({
      damageEvents: [],
      damageEventsError: 'Damage request timed out.',
      damageEventsStatus: 'failed' as const,
      isDamageEventsLoading: false,
      selectedFight: fight,
    });

    render(<InsightsPanel context={{ reportCode: 'report-1', fightId: 1 }} fight={fight} />);

    expect(screen.getByRole('button', { name: 'partial' })).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'partial' }));

    expect(mockDispatch).toHaveBeenCalledWith({
      type: 'clear-damage',
      payload: { reportCode: 'report-1', fightId: 1 },
    });
    expect(mockDispatch).toHaveBeenCalledWith(
      expect.objectContaining({
        payload: expect.objectContaining({
          client: mockDamageClient,
          fight,
          reportCode: 'report-1',
          restrictToFightWindow: true,
        }),
        type: 'fetch-damage',
      }),
    );
    expect(mockDispatch).not.toHaveBeenCalledWith(
      expect.objectContaining({ type: 'clear-combatant-info' }),
    );
    expect(mockDispatch).not.toHaveBeenCalledWith(
      expect.objectContaining({ type: 'clear-player-data' }),
    );
  });

  it('keeps retained failed data when a fresh damage request cannot be dispatched', () => {
    mockUseEsoLogsClientContext.mockReturnValue({ client: null, isReady: false });
    mockUseDamageEvents.mockReturnValue({
      damageEvents: [{}],
      damageEventsError: 'Damage request timed out.',
      damageEventsStatus: 'failed' as const,
      isDamageEventsLoading: false,
      selectedFight: fight,
    });

    render(<InsightsPanel context={{ reportCode: 'report-1', fightId: 1 }} fight={fight} />);

    expect(screen.getByRole('button', { name: 'stale' })).toBeDisabled();
    expect(
      screen.getByText(
        'Retry is unavailable until the report, selected fight, and required data client are ready.',
      ),
    ).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'stale' }));

    expect(mockDispatch).not.toHaveBeenCalledWith(
      expect.objectContaining({ type: 'clear-damage' }),
    );
    expect(mockDispatch).not.toHaveBeenCalledWith(
      expect.objectContaining({ type: 'fetch-damage' }),
    );
  });

  it('suppresses rapid repeated retry activations before hook state catches up', () => {
    mockUseDamageEvents.mockReturnValue({
      damageEvents: [],
      damageEventsError: 'Damage request timed out.',
      damageEventsStatus: 'failed' as const,
      isDamageEventsLoading: false,
      selectedFight: fight,
    });

    render(<InsightsPanel context={{ reportCode: 'report-1', fightId: 1 }} fight={fight} />);

    const retryButton = screen.getByRole('button', { name: 'partial' });
    fireEvent.click(retryButton);
    fireEvent.click(retryButton);

    expect(
      mockDispatch.mock.calls.filter(([action]) => action.type === 'clear-damage'),
    ).toHaveLength(1);
    expect(
      mockDispatch.mock.calls.filter(([action]) => action.type === 'fetch-damage'),
    ).toHaveLength(1);
  });

  it('releases retry suppression after an immediate repeat of the same failed outcome', async () => {
    mockUseDamageEvents.mockReturnValue({
      damageEvents: [],
      damageEventsError: 'Damage request timed out.',
      damageEventsStatus: 'failed' as const,
      isDamageEventsLoading: false,
      selectedFight: fight,
    });

    render(<InsightsPanel context={{ reportCode: 'report-1', fightId: 1 }} fight={fight} />);

    fireEvent.click(screen.getByRole('button', { name: 'partial' }));

    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'partial' })).toBeEnabled();
    });

    fireEvent.click(screen.getByRole('button', { name: 'partial' }));
    expect(
      mockDispatch.mock.calls.filter(([action]) => action.type === 'fetch-damage'),
    ).toHaveLength(2);
  });

  it('releases retry suppression after immediate terminal outcomes', () => {
    let damageState: MockDamageState = {
      damageEvents: [],
      damageEventsError: 'Damage request timed out.',
      damageEventsStatus: 'failed' as const,
      isDamageEventsLoading: false,
      selectedFight: fight,
    };
    mockUseDamageEvents.mockImplementation(() => damageState);

    const { rerender } = render(
      <InsightsPanel context={{ reportCode: 'report-1', fightId: 1 }} fight={fight} />,
    );

    fireEvent.click(screen.getByRole('button', { name: 'partial' }));

    damageState = {
      ...damageState,
      damageEventsError: null,
      damageEventsStatus: 'succeeded',
    };
    rerender(<InsightsPanel context={{ reportCode: 'report-1', fightId: 1 }} fight={fight} />);
    expect(screen.getByRole('button', { name: 'empty' })).toBeInTheDocument();

    damageState = {
      ...damageState,
      damageEventsError: 'A later damage request timed out.',
      damageEventsStatus: 'failed',
    };
    rerender(<InsightsPanel context={{ reportCode: 'report-1', fightId: 1 }} fight={fight} />);

    fireEvent.click(screen.getByRole('button', { name: 'partial' }));

    damageState = {
      ...damageState,
      damageEventsError: 'The retried request timed out immediately.',
      damageEventsStatus: 'failed',
    };
    rerender(<InsightsPanel context={{ reportCode: 'report-1', fightId: 1 }} fight={fight} />);

    fireEvent.click(screen.getByRole('button', { name: 'partial' }));
    expect(
      mockDispatch.mock.calls.filter(([action]) => action.type === 'fetch-damage'),
    ).toHaveLength(3);
  });

  it('does not schedule retry state work when a deferred thunk settles after unmount', async () => {
    let resolveRetry: (value: unknown) => void;
    const retryAttempt = new Promise<unknown>((resolve) => {
      resolveRetry = resolve;
    });
    mockDispatch.mockImplementation((action) =>
      action.type === 'fetch-damage' ? retryAttempt : action,
    );
    mockUseDamageEvents.mockReturnValue({
      damageEvents: [],
      damageEventsError: 'Damage request timed out.',
      damageEventsStatus: 'failed' as const,
      isDamageEventsLoading: false,
      selectedFight: fight,
    });

    const consoleError = jest.spyOn(console, 'error').mockImplementation(() => undefined);
    const { unmount } = render(
      <InsightsPanel context={{ reportCode: 'report-1', fightId: 1 }} fight={fight} />,
    );

    fireEvent.click(screen.getByRole('button', { name: 'partial' }));
    unmount();

    await act(async () => {
      resolveRetry!({ type: 'damage/rejected' });
      await retryAttempt;
    });

    expect(consoleError).not.toHaveBeenCalled();
    consoleError.mockRestore();
  });

  it('keeps a deferred prior-report settlement isolated from the active report retry', async () => {
    const nextFight = { ...fight, id: 2 };
    const retryAttempts: Array<{ promise: Promise<unknown>; resolve: (value: unknown) => void }> =
      [];
    mockDispatch.mockImplementation((action) => {
      if (action.type !== 'fetch-damage') {
        return action;
      }

      let resolveRetry: (value: unknown) => void;
      const promise = new Promise<unknown>((resolve) => {
        resolveRetry = resolve;
      });
      retryAttempts.push({ promise, resolve: resolveRetry! });
      return promise;
    });
    const damageStateByReport: Record<'report-a' | 'report-b', MockDamageState> = {
      'report-a': {
        damageEvents: [],
        damageEventsError: 'Damage request timed out.',
        damageEventsStatus: 'failed' as const,
        isDamageEventsLoading: false,
        selectedFight: fight,
      },
      'report-b': {
        damageEvents: [],
        damageEventsError: 'Damage request timed out.',
        damageEventsStatus: 'failed' as const,
        isDamageEventsLoading: false,
        selectedFight: nextFight,
      },
    };
    mockUseDamageEvents.mockImplementation(
      ({ context }: { context: { reportCode: string } }) =>
        damageStateByReport[context.reportCode as 'report-a' | 'report-b'],
    );

    const { rerender } = render(
      <InsightsPanel context={{ reportCode: 'report-a', fightId: 1 }} fight={fight} />,
    );

    fireEvent.click(screen.getByRole('button', { name: 'partial' }));
    expect(
      mockDispatch.mock.calls.filter(([action]) => action.type === 'fetch-damage'),
    ).toHaveLength(1);

    rerender(<InsightsPanel context={{ reportCode: 'report-b', fightId: 2 }} fight={nextFight} />);

    const retryButton = screen.getByRole('button', { name: 'partial' });
    expect(retryButton).toBeEnabled();
    fireEvent.click(retryButton);

    const damageFetches = mockDispatch.mock.calls
      .map(([action]) => action)
      .filter((action) => action.type === 'fetch-damage');
    expect(damageFetches).toHaveLength(2);
    expect(damageFetches[1]).toMatchObject({
      payload: expect.objectContaining({ reportCode: 'report-b' }),
      type: 'fetch-damage',
    });
    expect(screen.getByRole('button', { name: 'partial' })).toBeDisabled();

    await act(async () => {
      retryAttempts[0].resolve({ type: 'damage/rejected' });
      await retryAttempts[0].promise;
    });

    // The old report settled, but the B retry remains locked until B itself
    // settles. This specifically exercises the asynchronous thunk callback.
    expect(screen.getByRole('button', { name: 'partial' })).toBeDisabled();

    damageStateByReport['report-b'] = {
      ...damageStateByReport['report-b'],
      damageEventsError: 'The report B retry timed out.',
      damageEventsStatus: 'failed',
      isDamageEventsLoading: false,
    };
    rerender(<InsightsPanel context={{ reportCode: 'report-b', fightId: 2 }} fight={nextFight} />);

    await act(async () => {
      retryAttempts[1].resolve({ type: 'damage/rejected' });
      await retryAttempts[1].promise;
    });

    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'partial' })).toBeEnabled();
    });

    const reportBRetryButton = screen.getByRole('button', { name: 'partial' });
    fireEvent.click(reportBRetryButton);

    const finalDamageFetches = mockDispatch.mock.calls
      .map(([action]) => action)
      .filter((action) => action.type === 'fetch-damage');
    expect(finalDamageFetches).toHaveLength(3);
    expect(finalDamageFetches[2]).toMatchObject({
      payload: expect.objectContaining({ reportCode: 'report-b' }),
      type: 'fetch-damage',
    });
  });

  it('enables retry only after prerequisites are ready and reaches the recovered state', () => {
    mockUseEsoLogsClientContext.mockReturnValue({ client: null, isReady: false });
    mockUseDamageEvents.mockReturnValue({
      damageEvents: [],
      damageEventsError: 'Damage request timed out.',
      damageEventsStatus: 'failed' as const,
      isDamageEventsLoading: false,
      selectedFight: fight,
    });

    const { rerender } = render(
      <InsightsPanel context={{ reportCode: 'report-1', fightId: 1 }} fight={fight} />,
    );

    expect(screen.getByRole('button', { name: 'partial' })).toBeDisabled();

    mockUseEsoLogsClientContext.mockReturnValue({ client: mockDamageClient, isReady: true });
    rerender(<InsightsPanel context={{ reportCode: 'report-1', fightId: 1 }} fight={fight} />);

    const retryButton = screen.getByRole('button', { name: 'partial' });
    expect(retryButton).toBeEnabled();
    fireEvent.click(retryButton);
    expect(
      mockDispatch.mock.calls.filter(([action]) => action.type === 'fetch-damage'),
    ).toHaveLength(1);

    mockUseDamageEvents.mockReturnValue({
      damageEvents: [],
      damageEventsError: null,
      damageEventsStatus: 'succeeded' as const,
      isDamageEventsLoading: false,
      selectedFight: fight,
    });
    rerender(<InsightsPanel context={{ reportCode: 'report-1', fightId: 1 }} fight={fight} />);

    expect(screen.getByRole('button', { name: 'empty' })).toBeInTheDocument();
  });
});
