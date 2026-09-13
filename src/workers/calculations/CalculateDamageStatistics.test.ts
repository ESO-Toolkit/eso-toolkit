import type { FightFragment } from '@/graphql/gql/graphql';
import { createMockDamageEvent } from '@/test/utils/combatLogMockFactories';
import { calculateDamageStatisticsWithActivity } from '@/utils/activePercentageUtils';

import {
  calculateDamageStatistics,
  type DamageStatisticsCalculationTask,
} from './CalculateDamageStatistics';

const FIGHT: FightFragment = {
  __typename: 'ReportFight',
  id: 1,
  startTime: 0,
  endTime: 10000,
  difficulty: 1,
  encounterID: 1,
  name: 'Worker test fight',
  friendlyPlayers: [],
  enemyPlayers: [],
  bossPercentage: null,
};

describe('calculateDamageStatistics', () => {
  it('matches main-thread semantics for selected targets, out-of-order events, and attributed pet damage', () => {
    const task: DamageStatisticsCalculationTask = {
      fight: FIGHT,
      selectedTargetIds: [456],
      damageEventsByPlayer: {
        // Damage is attributed to player 123, while the pet source must not
        // falsely create player activity.
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
            hitType: 2,
          }),
          createMockDamageEvent({
            timestamp: 4000,
            sourceID: 123,
            targetID: 457,
            targetIsFriendly: false,
            amount: 300,
          }),
        ],
      },
    };

    const result = calculateDamageStatistics(task);

    expect(result).toEqual(
      calculateDamageStatisticsWithActivity(
        task.fight,
        task.damageEventsByPlayer,
        new Set(task.selectedTargetIds),
      ),
    );
    expect(result.damageByPlayer).toEqual({ 123: 450 });
    expect(result.criticalDamageByPlayer).toEqual({ 123: 200 });
    expect(result.damageEventsBySource).toEqual({ 123: 3 });
    expect(result.activePercentages[123]).toMatchObject({
      activeTimeMs: 3000,
      activePercentage: 30,
    });
  });

  it.each([
    ['non-finite start', Number.NaN, 10000],
    ['non-finite end', 0, Number.POSITIVE_INFINITY],
    ['non-positive duration', 10000, 10000],
  ])('preserves totals and omits activity for %s', (_description, startTime, endTime) => {
    const task: DamageStatisticsCalculationTask = {
      fight: { ...FIGHT, startTime, endTime },
      selectedTargetIds: [],
      damageEventsByPlayer: {
        '123': [
          createMockDamageEvent({
            timestamp: 2000,
            sourceID: 123,
            targetID: 456,
            targetIsFriendly: false,
            amount: 100,
          }),
        ],
      },
    };

    const result = calculateDamageStatistics(task);

    expect(result).toEqual(
      calculateDamageStatisticsWithActivity(
        task.fight,
        task.damageEventsByPlayer,
        new Set(task.selectedTargetIds),
      ),
    );
    expect(result.activePercentages).toEqual({});
    expect(Object.values(result).flatMap(Object.values).some(Number.isNaN)).toBe(false);
  });
});
