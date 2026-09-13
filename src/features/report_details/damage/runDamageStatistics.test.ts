import type { FightFragment } from '@/graphql/gql/graphql';
import { createMockDamageEvent } from '@/test/utils/combatLogMockFactories';
import { calculateDamageStatisticsWithActivity } from '@/utils/activePercentageUtils';
import { workerManager } from '@/workers';

import type { DamageStatisticsCalculationTask } from '../../../workers/calculations/CalculateDamageStatistics';

import { runDamageStatistics } from './runDamageStatistics';

const manager = workerManager as typeof workerManager & {
  executeTask?: jest.Mock;
};
const originalWorker = Object.getOwnPropertyDescriptor(globalThis, 'Worker');

function setWorker(value: unknown): void {
  Object.defineProperty(globalThis, 'Worker', {
    configurable: true,
    writable: true,
    value,
  });
}

const FIGHT: FightFragment = {
  __typename: 'ReportFight',
  id: 1,
  startTime: 0,
  endTime: 10000,
  difficulty: 1,
  encounterID: 1,
  name: 'Runner test fight',
  friendlyPlayers: [],
  enemyPlayers: [],
  bossPercentage: null,
};

const INPUT: DamageStatisticsCalculationTask = {
  fight: FIGHT,
  selectedTargetIds: [456],
  damageEventsByPlayer: {
    '123': [
      createMockDamageEvent({
        timestamp: 5000,
        sourceID: 123,
        targetID: 456,
        targetIsFriendly: false,
        amount: 100,
      }),
      createMockDamageEvent({
        timestamp: 2000,
        sourceID: 123,
        targetID: 456,
        targetIsFriendly: false,
        amount: 150,
      }),
      createMockDamageEvent({
        timestamp: 3000,
        sourceID: 999,
        targetID: 456,
        targetIsFriendly: false,
        amount: 200,
      }),
    ],
  },
};

describe('runDamageStatistics', () => {
  const originalNodeEnv = process.env.NODE_ENV;

  afterEach(() => {
    process.env.NODE_ENV = originalNodeEnv;
    Reflect.deleteProperty(manager, 'executeTask');
    if (originalWorker) {
      Object.defineProperty(globalThis, 'Worker', originalWorker);
    } else {
      Reflect.deleteProperty(globalThis, 'Worker');
    }
    jest.restoreAllMocks();
  });

  it('uses its deterministic synchronous path only in Jest and retains calculation parity', async () => {
    const result = await runDamageStatistics(INPUT);

    expect(result).toEqual(
      calculateDamageStatisticsWithActivity(
        INPUT.fight,
        INPUT.damageEventsByPlayer,
        new Set(INPUT.selectedTargetIds),
      ),
    );
  });

  it('forwards AbortSignal to the worker and rejects an in-flight calculation when cancelled', async () => {
    process.env.NODE_ENV = 'production';
    setWorker(class WorkerStub {});
    manager.executeTask = jest.fn().mockReturnValue(new Promise(() => undefined));
    const controller = new AbortController();

    const result = runDamageStatistics(INPUT, { signal: controller.signal });
    controller.abort();

    await expect(result).rejects.toMatchObject({ name: 'AbortError' });
    expect(manager.executeTask).toHaveBeenCalledWith(
      'calculateDamageStatistics',
      expect.objectContaining({
        fight: INPUT.fight,
        selectedTargetIds: INPUT.selectedTargetIds,
        playerEvents: [
          expect.objectContaining({ playerId: 123, values: expect.any(Float64Array) }),
        ],
      }),
      undefined,
      'damage-statistics',
      { signal: controller.signal },
    );
  });

  it('does not start a worker when the signal was already cancelled', async () => {
    process.env.NODE_ENV = 'production';
    manager.executeTask = jest.fn();
    const controller = new AbortController();
    controller.abort();

    await expect(runDamageStatistics(INPUT, { signal: controller.signal })).rejects.toMatchObject({
      name: 'AbortError',
    });
    expect(manager.executeTask).not.toHaveBeenCalled();
  });

  it('surfaces production worker failures without falling back to the main thread', async () => {
    process.env.NODE_ENV = 'production';
    setWorker(class WorkerStub {});
    const workerFailure = new Error('worker disconnected');
    manager.executeTask = jest.fn().mockRejectedValue(workerFailure);

    await expect(runDamageStatistics(INPUT)).rejects.toThrow(
      'Damage statistics stopped in its background worker',
    );

    try {
      await runDamageStatistics(INPUT);
    } catch (error) {
      expect((error as Error & { cause?: unknown }).cause).toBe(workerFailure);
    }
  });
});
