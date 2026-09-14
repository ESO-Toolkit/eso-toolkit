import type { DamageOverTimeCalculationTask } from '@/workers/calculations/CalculateDamageOverTime';

import { damageOverTimeInputHash } from './damageOverTimeSlice';

const createInput = (overrides: Partial<DamageOverTimeCalculationTask> = {}) =>
  ({
    fight: { startTime: 0, endTime: 10_000 },
    players: { 1: { name: 'Player One' } },
    damageEvents: [
      {
        timestamp: 100,
        sourceID: 1,
        sourceIsFriendly: true,
        targetID: 10,
        targetIsFriendly: false,
        amount: 1_000,
      },
    ],
    bucketSizeMs: 1_000,
    ...overrides,
  }) as DamageOverTimeCalculationTask;

describe('damageOverTimeInputHash', () => {
  it('is stable when the immutable input containers are reused', () => {
    const input = createInput();

    expect(damageOverTimeInputHash(input)).toBe(damageOverTimeInputHash({ ...input }));
  });

  it('distinguishes equal-sized fights with different damage events', () => {
    const first = createInput();
    const second = createInput({
      damageEvents: [{ ...first.damageEvents[0], targetID: 11, amount: 2_000 }],
    });

    expect(damageOverTimeInputHash(first)).not.toBe(damageOverTimeInputHash(second));
  });

  it('distinguishes player metadata used in timeline output', () => {
    const first = createInput();
    const second = createInput({ players: { 1: { name: 'Replacement Player' } } as never });

    expect(damageOverTimeInputHash(first)).not.toBe(damageOverTimeInputHash(second));
  });
});
