import type { FightFragment } from '../../graphql/gql/graphql';
import { damageOverTimeInputHash } from '../../store/worker_results/damageOverTimeSlice';
import type { DamageOverTimeCalculationTask } from '../../workers/calculations/CalculateDamageOverTime';

import { getOwnedDamageOverTimeResult } from './useDamageOverTimeTask';

const createInput = (startTime: number, endTime: number): DamageOverTimeCalculationTask => ({
  fight: { startTime, endTime } as FightFragment,
  players: {},
  damageEvents: [],
  bucketSizeMs: 1000,
});

describe('getOwnedDamageOverTimeResult', () => {
  it('hides a previous fight result while the current fight dependencies are unavailable', () => {
    const previousFight = createInput(0, 10_000);
    const previousResult = { buckets: ['fight-a'] };

    expect(
      getOwnedDamageOverTimeResult(null, {
        result: previousResult,
        cacheMetadata: { lastInputHash: damageOverTimeInputHash(previousFight) },
      }),
    ).toBeNull();
  });

  it('hides a result owned by a different fight or immutable event container', () => {
    const previousFight = createInput(0, 10_000);
    const currentFight = createInput(10_000, 20_000);

    expect(
      getOwnedDamageOverTimeResult(currentFight, {
        result: { buckets: ['fight-a'] },
        cacheMetadata: { lastInputHash: damageOverTimeInputHash(previousFight) },
      }),
    ).toBeNull();
  });

  it('returns only the result owned by the current worker input', () => {
    const currentFight = createInput(10_000, 20_000);
    const currentResult = { buckets: ['fight-b'] };

    expect(
      getOwnedDamageOverTimeResult(currentFight, {
        result: currentResult,
        cacheMetadata: { lastInputHash: damageOverTimeInputHash(currentFight) },
      }),
    ).toBe(currentResult);
  });
});
