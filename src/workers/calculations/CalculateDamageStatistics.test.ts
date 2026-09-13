import type { FightFragment } from '@/graphql/gql/graphql';
import { createMockDamageEvent } from '@/test/utils/combatLogMockFactories';
import { calculateDamageStatisticsWithActivity } from '@/utils/activePercentageUtils';

import {
  calculateDamageStatistics,
  type DamageStatisticsCalculationTask,
  type PackedDamageStatisticsCalculationTask,
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

  it('preserves raw calculation semantics for transferable packed events', () => {
    const rawTask: DamageStatisticsCalculationTask = {
      fight: FIGHT,
      selectedTargetIds: [456],
      damageEventsByPlayer: {
        '123': [
          createMockDamageEvent({
            timestamp: 0,
            sourceID: 123,
            targetID: 456,
            targetIsFriendly: false,
            amount: 100,
            hitType: 2,
          }),
          createMockDamageEvent({
            timestamp: 5000,
            sourceID: 999,
            targetID: 456,
            targetIsFriendly: false,
            amount: 50,
          }),
          createMockDamageEvent({
            timestamp: 12000,
            sourceID: 123,
            targetID: 456,
            targetIsFriendly: false,
            amount: 25,
          }),
          createMockDamageEvent({
            timestamp: 6000,
            sourceID: 123,
            targetID: 789,
            targetIsFriendly: false,
            amount: 1000,
          }),
        ],
      },
    };
    const packedTask: PackedDamageStatisticsCalculationTask = {
      fight: rawTask.fight,
      selectedTargetIds: rawTask.selectedTargetIds,
      playerEvents: [
        {
          playerId: 123,
          values: new Float64Array([
            123, 456, 0, 100, 2, 0, 999, 456, 5000, 50, 1, 0, 123, 456, 12000, 25, 1, 0, 123, 789,
            6000, 1000, 1, 0,
          ]),
        },
      ],
    };

    expect(calculateDamageStatistics(packedTask)).toEqual(calculateDamageStatistics(rawTask));
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
