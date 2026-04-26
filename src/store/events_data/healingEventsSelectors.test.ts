import { createMockState } from '../../test/utils/reduxMockFactories';
import { HealEvent } from '../../types/combatlogEvents';
import { RootState } from '../storeWithHistory';

import { resolveCacheKey } from '../utils/keyedCacheState';
import {
  selectHealingEvents,
  selectHealingEventsEntryForContext,
  selectHealingEventsError,
  selectHealingEventsLoading,
} from './healingEventsSelectors';

const createHealingEvent = (overrides: Partial<HealEvent> = {}): HealEvent => ({
  timestamp: 1000,
  type: 'heal',
  sourceID: 1,
  sourceIsFriendly: true,
  targetID: 2,
  targetIsFriendly: false,
  abilityGameID: 12345,
  fight: 1,
  hitType: 1,
  amount: 5000,
  overheal: 0,
  castTrackID: 1,
  sourceResources: {
    hitPoints: 100,
    maxHitPoints: 100,
    magicka: 100,
    maxMagicka: 100,
    stamina: 100,
    maxStamina: 100,
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
    magicka: 100,
    maxMagicka: 100,
    stamina: 100,
    maxStamina: 100,
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
  ...overrides,
});

const createStateWithHealingEvents = (
  events: HealEvent[],
  status: 'idle' | 'loading' | 'succeeded' | 'failed' = 'succeeded',
  error: string | null = null,
): RootState => {
  const base = createMockState();
  const reportCode = base.report.activeContext.reportId ?? base.report.reportId;
  const fightId = base.report.activeContext.fightId ?? 1;
  const { key } = resolveCacheKey({ reportCode, fightId });

  return {
    ...base,
    events: {
      ...base.events,
      healing: {
        entries: {
          [key]: {
            events,
            status,
            error,
            cacheMetadata: {
              lastFetchedTimestamp: Date.now(),
            },
            currentRequest: null,
          },
        },
        accessOrder: [key],
      },
    },
  } as RootState;
};

describe('healingEventsSelectors', () => {
  it('returns healing events for the active context', () => {
    const events = [createHealingEvent({ amount: 1000 }), createHealingEvent({ amount: 2000 })];
    const state = createStateWithHealingEvents(events);

    expect(selectHealingEvents(state)).toEqual(events);
  });

  it('returns loading state for active context entry', () => {
    const state = createStateWithHealingEvents([], 'loading');

    expect(selectHealingEventsLoading(state)).toBe(true);
  });

  it('returns error for active context entry', () => {
    const errorMessage = 'unable to fetch healing events';
    const state = createStateWithHealingEvents([], 'failed', errorMessage);

    expect(selectHealingEventsError(state)).toBe(errorMessage);
  });

  it('returns null entry when no cache exists for context', () => {
    const emptyState = createMockState();

    expect(
      selectHealingEventsEntryForContext(emptyState, {
        reportCode: emptyState.report.reportId,
        fightId: emptyState.report.activeContext.fightId,
      }),
    ).toBeNull();
  });
});
