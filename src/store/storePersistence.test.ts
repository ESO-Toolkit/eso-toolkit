import { eventsTransform, PERSISTED_ROOT_KEYS, persistConfig } from './storeWithHistory';

describe('store persistence event boundary', () => {
  it('does not select raw event arrays for persisted Redux state', () => {
    const rawEventSentinel = 'raw-event-must-not-persist';
    const rootState = {
      events: {
        damage: {
          entries: {
            'report::1': { events: [{ rawEventSentinel }] },
          },
        },
      },
      ui: { darkMode: true },
      loadout: {},
      dashboard: {},
      savedRosters: {},
      savedBuilds: {},
    };
    const persistedState = Object.fromEntries(
      PERSISTED_ROOT_KEYS.map((key) => [key, rootState[key]]),
    );

    expect(persistConfig.whitelist).toEqual(PERSISTED_ROOT_KEYS);
    expect(PERSISTED_ROOT_KEYS).not.toContain('events');
    expect(persistedState).not.toHaveProperty('events');
    expect(JSON.stringify(persistedState)).not.toContain(rawEventSentinel);

    const rehydratedState = JSON.parse(JSON.stringify(persistedState)) as Record<string, unknown>;
    expect(rehydratedState).not.toHaveProperty('events');
    expect(JSON.stringify(rehydratedState)).not.toContain(rawEventSentinel);
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
