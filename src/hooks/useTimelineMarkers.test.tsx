import { renderHook } from '@testing-library/react';
import React from 'react';
import { Provider } from 'react-redux';
import { createStore, combineReducers, Store } from 'redux';

import { FightFragment, ReportActorFragment } from '../graphql/gql/graphql';
import { DeathEvent, Resources } from '../types/combatlogEvents';

import { useTimelineMarkers } from './useTimelineMarkers';

// --- Mock actors (master data) -------------------------------------------------------------
const mockPlayerActor: ReportActorFragment = {
  __typename: 'ReportActor',
  id: 17,
  name: 'Stamblade McTest',
  displayName: '@StamTest',
  subType: 'StaminaNightblade',
  type: 'Player',
  gameID: 1701,
  icon: 'player.png',
  server: 'NA',
};

const mockKillerActor: ReportActorFragment = {
  __typename: 'ReportActor',
  id: 3,
  name: 'Lord Falgravn',
  displayName: 'Lord Falgravn',
  subType: 'Boss',
  type: 'NPC',
  gameID: 301,
  icon: 'boss.png',
  server: null,
};

// Actor present in the map but with an empty name — must fall back to `Actor <id>`.
const mockUnnamedActor: ReportActorFragment = {
  __typename: 'ReportActor',
  id: 42,
  name: '',
  displayName: null,
  subType: 'NPC',
  type: 'NPC',
  gameID: 4201,
  icon: null,
  server: null,
};

const mockActorsById: Record<string | number, ReportActorFragment> = {
  17: mockPlayerActor,
  3: mockKillerActor,
  42: mockUnnamedActor,
};

// --- Mock fight ----------------------------------------------------------------------------
const mockFight: FightFragment = {
  __typename: 'ReportFight',
  id: 1,
  startTime: 1000,
  endTime: 5000,
  name: 'Test Fight',
  difficulty: null,
  bossPercentage: null,
  encounterID: 1001,
  friendlyPlayers: [17],
  enemyPlayers: [],
  enemyNPCs: [
    { __typename: 'ReportFightNPC', id: 3, gameID: 301, groupCount: 1, instanceCount: 1 },
    { __typename: 'ReportFightNPC', id: 42, gameID: 4201, groupCount: 1, instanceCount: 1 },
  ],
};

// --- Mock death events ---------------------------------------------------------------------
const emptyResources = {} as Resources;

const makeDeath = (overrides: Partial<DeathEvent>): DeathEvent => ({
  timestamp: 2000,
  type: 'death',
  sourceID: 3,
  sourceIsFriendly: false,
  targetID: 17,
  targetInstance: 0,
  targetIsFriendly: true,
  abilityGameID: 0,
  fight: 1,
  castTrackID: 0,
  sourceResources: emptyResources,
  targetResources: emptyResources,
  amount: 0,
  ...overrides,
});

// Friendly player killed by a named NPC.
const friendlyDeath = makeDeath({
  timestamp: 2000,
  targetID: 17,
  targetIsFriendly: true,
  sourceID: 3,
});

// Enemy actor (present in map but with an empty name) dies, environmental (sourceID 0).
const unnamedEnemyDeath = makeDeath({
  timestamp: 3000,
  targetID: 42,
  targetIsFriendly: false,
  sourceID: 0,
});

// Enemy actor that is entirely absent from the actor map (exercises the `?.`-undefined branch).
const missingActorDeath = makeDeath({
  timestamp: 4000,
  targetID: 999,
  targetIsFriendly: false,
  sourceID: 0,
});

// --- Mock store ----------------------------------------------------------------------------
const createMockStore = (deathEvents: DeathEvent[]): Store => {
  const initialState = {
    masterData: {
      entries: {
        'test-report::__all__': {
          abilitiesById: {},
          actorsById: mockActorsById,
          status: 'succeeded' as const,
          error: null,
          cacheMetadata: {
            lastFetchedTimestamp: Date.now(),
            actorCount: Object.keys(mockActorsById).length,
            abilityCount: 0,
          },
          currentRequest: null,
        },
      },
      accessOrder: ['test-report::__all__'],
    },
    events: {
      deaths: {
        entries: {
          // Death events are fight-scoped, so the cache key includes the fight id.
          'test-report::1': {
            events: deathEvents,
            status: 'succeeded' as const,
            error: null,
            cacheMetadata: {
              lastFetchedTimestamp: Date.now(),
              intervalCount: 1,
              failedIntervals: 0,
            },
            currentRequest: null,
          },
        },
        accessOrder: ['test-report::1'],
      },
    },
    report: {
      entries: {
        'test-report::__all__': {
          data: null,
          status: 'succeeded' as const,
          error: null,
          fightsById: { 1: mockFight },
          fightIds: [1],
          cacheMetadata: { lastFetchedTimestamp: Date.now() },
          currentRequest: null,
        },
      },
      accessOrder: ['test-report::__all__'],
      reportId: 'test-report',
      data: null,
      loading: false,
      error: null,
      cacheMetadata: {
        lastFetchedReportId: 'test-report',
        lastFetchedTimestamp: Date.now(),
      },
      // The hook reads the active fight from the Redux store (not React context),
      // so fightId MUST be set here or currentFight resolves to null and deathMarkers is empty.
      activeContext: {
        reportId: 'test-report',
        fightId: 1,
      },
      fightIndexByReport: {
        'test-report': [1],
      },
    },
  };

  const rootReducer = combineReducers({
    masterData: (state = initialState.masterData) => state,
    events: (state = initialState.events) => state,
    report: (state = initialState.report) => state,
  });

  return createStore(rootReducer);
};

const wrapperFor = (store: Store) =>
  function Wrapper({ children }: { children: React.ReactNode }) {
    return <Provider store={store}>{children}</Provider>;
  };

describe('useTimelineMarkers — death-marker name resolution', () => {
  it('uses the real actor name for the death label, actorName, and killerName', () => {
    const store = createMockStore([friendlyDeath]);

    const { result } = renderHook(() => useTimelineMarkers(), {
      wrapper: wrapperFor(store),
    });

    expect(result.current.deathMarkers).toHaveLength(1);
    const marker = result.current.deathMarkers[0];

    expect(marker.actorName).toBe('Stamblade McTest');
    expect(marker.killerName).toBe('Lord Falgravn');
    // Friendly death uses the 💀 prefix.
    expect(marker.label).toBe('💀 Stamblade McTest');
    expect(marker.actorId).toBe(17);
    expect(marker.killerId).toBe(3);
  });

  it('falls back to `Actor <id>` when the actor has no usable name and has no killer', () => {
    const store = createMockStore([unnamedEnemyDeath]);

    const { result } = renderHook(() => useTimelineMarkers(), {
      wrapper: wrapperFor(store),
    });

    expect(result.current.deathMarkers).toHaveLength(1);
    const marker = result.current.deathMarkers[0];

    // Empty-string name must fall back, not render a blank label.
    expect(marker.actorName).toBe('Actor 42');
    // Enemy death uses the ☠️ prefix.
    expect(marker.label).toBe('☠️ Actor 42');
    // Environmental death (sourceID 0) has no killer.
    expect(marker.killerName).toBeUndefined();
  });

  it('falls back to `Actor <id>` when the actor is entirely absent from the actor map', () => {
    const store = createMockStore([missingActorDeath]);

    const { result } = renderHook(() => useTimelineMarkers(), {
      wrapper: wrapperFor(store),
    });

    expect(result.current.deathMarkers).toHaveLength(1);
    const marker = result.current.deathMarkers[0];

    // actorsById[999] is undefined — must not throw and must fall back.
    expect(marker.actorName).toBe('Actor 999');
    expect(marker.label).toBe('☠️ Actor 999');
    expect(marker.killerName).toBeUndefined();
  });

  it('keeps a stable deathMarkers reference across re-renders when inputs do not change', () => {
    const store = createMockStore([friendlyDeath]);

    const { result, rerender } = renderHook(() => useTimelineMarkers(), {
      wrapper: wrapperFor(store),
    });

    const first = result.current.deathMarkers;
    rerender();
    const second = result.current.deathMarkers;

    expect(second).toBe(first);
  });
});
