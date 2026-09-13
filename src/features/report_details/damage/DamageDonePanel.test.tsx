import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';

import type { FightFragment } from '@/graphql/gql/graphql';
import type { DamageEvent } from '@/types/combatlogEvents';

import { DamageDonePanel } from './DamageDonePanel';
import { runDamageStatistics } from './runDamageStatistics';
import { DAMAGE_STATISTICS_WORKER_THRESHOLD } from './useDamageStatistics';

const mockFight = { id: 1, startTime: 0, endTime: 60_000, friendlyPlayers: [1] } as FightFragment;
const mockActor = { id: 1, name: 'Arcanist' };
const mockDamageEvent = {
  type: 'damage',
  sourceID: 1,
  targetID: 99,
  timestamp: 1_000,
  amount: 100,
  hitType: 1,
  targetIsFriendly: false,
} as DamageEvent;
const mockDamageEventsByPlayer = {
  1: Array(DAMAGE_STATISTICS_WORKER_THRESHOLD).fill(mockDamageEvent),
};
const mockSelectedTargetIds = new Set<number>();

jest.mock('react-redux', () => ({ useSelector: () => ({ 1: mockActor }) }));
jest.mock('../../../components/DamageDoneTableSkeleton', () => ({
  DamageDoneTableSkeleton: () => <div data-testid="damage-skeleton">Loading damage</div>,
}));
jest.mock('../../../components/PlayerCardModal', () => ({ PlayerCardModal: () => null }));
jest.mock('./DamageDonePanelView', () => ({
  DamageDonePanelView: ({ damageRows }: { damageRows: Array<{ name: string; total: number }> }) => (
    <div data-testid="damage-table">
      {damageRows[0]?.name}: {damageRows[0]?.total}
    </div>
  ),
}));
jest.mock('./runDamageStatistics', () => ({ runDamageStatistics: jest.fn() }));
jest.mock('../../../hooks', () => ({
  useResolvedReportFightContext: () => ({ reportCode: 'TEST', fightId: 1 }),
  useFightForContext: () => mockFight,
  useDamageEventsLookup: () => ({
    damageEventsByPlayer: mockDamageEventsByPlayer,
    isDamageEventsLookupLoading: false,
  }),
  useReportMasterData: () => ({
    reportMasterData: { actorsById: { 1: mockActor }, abilitiesById: {} },
    isMasterDataLoading: false,
  }),
  usePlayerData: () => ({
    playerData: { playersById: { 1: { role: 'dps' } } },
    isPlayerDataLoading: false,
  }),
  useSelectedTargetIds: () => mockSelectedTargetIds,
  useDeathEvents: () => ({ deathEvents: [], isDeathEventsLoading: false }),
  useCastEvents: () => ({ castEvents: [], isCastEventsLoading: false }),
  useDamageOverTimeTask: () => ({
    damageOverTimeData: null,
    isDamageOverTimeLoading: false,
  }),
}));

const mockRunDamageStatistics = jest.mocked(runDamageStatistics);

function deferred<T>(): {
  promise: Promise<T>;
  resolve: (value: T) => void;
  reject: (cause: unknown) => void;
} {
  let resolve!: (value: T) => void;
  let reject!: (cause: unknown) => void;
  const promise = new Promise<T>((resolvePromise, rejectPromise) => {
    resolve = resolvePromise;
    reject = rejectPromise;
  });
  return { promise, resolve, reject };
}

describe('DamageDonePanel background calculation', () => {
  beforeEach(() => mockRunDamageStatistics.mockReset());

  it('shows loading, exposes a worker failure, and recovers when retried', async () => {
    const failed = deferred<Awaited<ReturnType<typeof runDamageStatistics>>>();
    const recovered = deferred<Awaited<ReturnType<typeof runDamageStatistics>>>();
    mockRunDamageStatistics
      .mockReturnValueOnce(failed.promise)
      .mockReturnValueOnce(recovered.promise);

    render(<DamageDonePanel />);

    expect(screen.getByTestId('damage-skeleton')).toBeInTheDocument();
    await waitFor(() => expect(mockRunDamageStatistics).toHaveBeenCalledTimes(1));

    await act(async () => failed.reject(new Error('worker unavailable')));
    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Damage statistics could not be calculated in the background',
    );

    fireEvent.click(screen.getByRole('button', { name: /try again/i }));
    expect(screen.getByTestId('damage-skeleton')).toBeInTheDocument();
    await waitFor(() => expect(mockRunDamageStatistics).toHaveBeenCalledTimes(2));

    await act(async () =>
      recovered.resolve({
        damageByPlayer: { 1: 1_000_000 },
        criticalDamageByPlayer: { 1: 250_000 },
        damageEventsBySource: { 1: DAMAGE_STATISTICS_WORKER_THRESHOLD },
        activePercentages: {
          1: {
            playerId: 1,
            activeTimeMs: 60_000,
            totalTimeMs: 60_000,
            activePercentage: 100,
          },
        },
      }),
    );

    expect(await screen.findByTestId('damage-table')).toHaveTextContent('Arcanist: 1000000');
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });
});
