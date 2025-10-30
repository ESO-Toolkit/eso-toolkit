import { DamageEvent } from '../../types/combatlogEvents';
import { selectDamageEventsByPlayer } from '../events_data/damageEventsSelectors';
import { resolveCacheKey } from '../utils/keyedCacheState';
import { RootState } from '../storeWithHistory';
import { createMockState } from '../../test/utils/reduxMockFactories';

// Mock state for testing keyed damage events
const createStateWithDamageEvents = (damageEvents: DamageEvent[]): RootState => {
  const baseState = createMockState();
  const { key } = resolveCacheKey({
    reportCode: baseState.report.activeContext.reportId,
    fightId: baseState.report.activeContext.fightId,
  });

  return {
    ...baseState,
    events: {
      ...baseState.events,
      damage: {
        entries: damageEvents.length
          ? {
              [key]: {
                events: damageEvents,
                status: 'succeeded',
                error: null,
                cacheMetadata: {
                  lastFetchedTimestamp: null,
                  restrictToFightWindow: true,
                },
                currentRequest: null,
              },
            }
          : {},
        accessOrder: damageEvents.length ? [key] : [],
      },
    },
  } as RootState;
};

// Helper function to create test damage events
const createDamageEvent = (sourceID: number, targetID: number, amount: number): DamageEvent => ({
  timestamp: 1000,
  type: 'damage',
  sourceID,
  sourceIsFriendly: true,
  targetID,
  targetIsFriendly: false,
  abilityGameID: 12345,
  fight: 1,
  hitType: 1,
  amount,
  castTrackID: 1,
  sourceResources: {
    hitPoints: 100,
    maxHitPoints: 100,
    stamina: 100,
    maxStamina: 100,
    magicka: 100,
    maxMagicka: 100,
    ultimate: 0,
    maxUltimate: 500,
    werewolf: 0,
    maxWerewolf: 100,
    absorb: 0,
    championPoints: 0,
    x: 0,
    y: 0,
    facing: 0,
  },
  targetResources: {
    hitPoints: 100,
    maxHitPoints: 100,
    stamina: 100,
    maxStamina: 100,
    magicka: 100,
    maxMagicka: 100,
    ultimate: 0,
    maxUltimate: 500,
    werewolf: 0,
    maxWerewolf: 100,
    absorb: 0,
    championPoints: 0,
    x: 0,
    y: 0,
    facing: 0,
  },
});

describe('selectDamageEventsByPlayer', () => {
  it('should group damage events by player ID', () => {
    const events = [
      createDamageEvent(123, 456, 1000),
      createDamageEvent(123, 789, 500),
      createDamageEvent(789, 456, 750),
    ];

  const state = createStateWithDamageEvents(events);
    const result = selectDamageEventsByPlayer(state);

    expect(result).toEqual({
      '123': [events[0], events[1]],
      '789': [events[2]],
    });
  });

  it('should return empty object for empty damage events', () => {
  const state = createStateWithDamageEvents([]);
    const result = selectDamageEventsByPlayer(state);

    expect(result).toEqual({});
  });

  it('should memoize results correctly', () => {
    const events = [createDamageEvent(123, 456, 1000), createDamageEvent(789, 456, 750)];

  const state = createStateWithDamageEvents(events);
    const result1 = selectDamageEventsByPlayer(state);
    const result2 = selectDamageEventsByPlayer(state);

    // Results should be the same reference due to memoization
    expect(result1).toBe(result2);
  });
});
