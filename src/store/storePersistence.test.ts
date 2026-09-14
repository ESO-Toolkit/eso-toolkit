import { configureStore } from '@reduxjs/toolkit';
import { persistReducer, persistStore } from 'redux-persist';

import { eventsTransform, PERSISTED_ROOT_KEYS, persistConfig } from './storeWithHistory';

describe('store persistence event boundary', () => {
  it('serializes durable preferences while excluding every raw combat-event cache', async () => {
    const storageValues = new Map<string, string>();
    const storage = {
      getItem: jest.fn((key: string) => Promise.resolve(storageValues.get(key) ?? null)),
      setItem: jest.fn((key: string, value: string) => {
        storageValues.set(key, value);
        return Promise.resolve();
      }),
      removeItem: jest.fn((key: string) => {
        storageValues.delete(key);
        return Promise.resolve();
      }),
    };
    const eventStreams = [
      'casts',
      'combatantInfo',
      'damage',
      'deaths',
      'debuffs',
      'friendlyBuffs',
      'healing',
      'hostileBuffs',
      'resources',
    ] as const;
    const rawEventSentinels = eventStreams.map((stream) => `raw-${stream}-must-not-persist`);
    const rawEvents = Object.fromEntries(
      eventStreams.map((stream, index) => [
        stream,
        {
          entries: {
            'report::1': { events: [{ persistenceSentinel: rawEventSentinels[index] }] },
          },
        },
      ]),
    );
    const initialState = {
      events: rawEvents,
      playerData: { entries: { 'report::1': { persistenceSentinel: 'raw-player-cache' } } },
      workerResults: { task: { persistenceSentinel: 'raw-worker-cache' } },
      report: { persistenceSentinel: 'raw-report-cache' },
      ui: {
        darkMode: false,
        showExperimentalTabs: true,
        sidebarOpen: true,
        myReportsPage: 4,
        selectedPlayerId: 17,
      },
      loadout: { sortOrder: 'name' },
      dashboard: { autoRefreshEnabled: false },
      savedRosters: { rosterIds: ['roster-1'] },
      savedBuilds: { buildIds: ['build-1'] },
    };
    const persistedReducer = persistReducer(
      { ...persistConfig, storage },
      (state = initialState) => state,
    );
    const store = configureStore({
      reducer: persistedReducer,
      middleware: (getDefaultMiddleware) => getDefaultMiddleware({ serializableCheck: false }),
    });

    const persistor = persistStore(store);
    await new Promise<void>((resolve) => {
      if (persistor.getState().bootstrapped) {
        resolve();
        return;
      }
      const unsubscribe = persistor.subscribe(() => {
        if (persistor.getState().bootstrapped) {
          unsubscribe();
          resolve();
        }
      });
    });
    await persistor.flush();

    const persistedPayload = storageValues.get('persist:root');

    expect(persistConfig.whitelist).toEqual(PERSISTED_ROOT_KEYS);
    expect(PERSISTED_ROOT_KEYS).not.toContain('events');
    expect(persistedPayload).toBeDefined();

    const serializedPayload = persistedPayload as string;
    const persistedState = JSON.parse(serializedPayload) as Record<string, string>;

    for (const sentinel of [
      ...rawEventSentinels,
      'raw-player-cache',
      'raw-worker-cache',
      'raw-report-cache',
    ]) {
      expect(serializedPayload).not.toContain(sentinel);
    }
    expect(persistedState).not.toHaveProperty('events');
    expect(persistedState).not.toHaveProperty('playerData');
    expect(persistedState).not.toHaveProperty('workerResults');
    expect(persistedState).not.toHaveProperty('report');
    expect(JSON.parse(persistedState.ui)).toMatchObject({
      darkMode: false,
      showExperimentalTabs: true,
      sidebarOpen: true,
      myReportsPage: 4,
    });
  });

  it('drops event data even if a future persistence whitelist includes it', () => {
    const eventState = {
      damage: {
        entries: {
          'report::1': { events: [{ timestamp: 1234 }] },
        },
      },
    };

    expect(eventsTransform.in(eventState, 'events', { events: eventState })).toBeUndefined();
  });
});
