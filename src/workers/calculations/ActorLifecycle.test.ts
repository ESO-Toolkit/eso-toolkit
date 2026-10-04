import {
  ActorPosition,
  TimestampPositionLookup,
  getActorLifecycleAtTimestamp,
  getActorPositionsByIdAtClosestTimestamp,
} from './CalculateActorPositions';

const sampledActor: ActorPosition = {
  id: 42,
  name: 'Boss',
  type: 'boss',
  position: [0, 0, 0],
  rotation: 0,
  isDead: false,
};

function makeLookup(): TimestampPositionLookup {
  return {
    positionsByTimestamp: { 1000: { 42: sampledActor }, 1500: { 42: sampledActor } },
    sortedTimestamps: [1000, 1500],
    fightDuration: 3000,
    fightStartTime: 10000,
    sampleInterval: 500,
    hasRegularIntervals: false,
    lifecycleEventsByActorId: {
      42: [
        { timestamp: 1200, isDead: true, deathTimeMs: 1200 },
        { timestamp: 1400, isDead: false },
        { timestamp: 1700, isDead: true, deathTimeMs: 1700 },
      ],
    },
  };
}

describe('getActorLifecycleAtTimestamp', () => {
  it('preserves both transitions between spatial samples at their exact boundaries', () => {
    const lookup = makeLookup();
    expect(getActorLifecycleAtTimestamp(lookup, 42, 1199)).toEqual({ isDead: false });
    expect(getActorLifecycleAtTimestamp(lookup, 42, 1200)).toMatchObject({
      isDead: true,
      deathTimeMs: 1200,
    });
    expect(getActorLifecycleAtTimestamp(lookup, 42, 1399).isDead).toBe(true);
    expect(getActorLifecycleAtTimestamp(lookup, 42, 1400)).toMatchObject({ isDead: false });
    expect(getActorLifecycleAtTimestamp(lookup, 42, 1400).deathTimeMs).toBeUndefined();
    expect(getActorLifecycleAtTimestamp(lookup, 42, 1700).deathTimeMs).toBe(1700);
  });

  it('is independent of seek order and leaves spatial records unchanged and by reference', () => {
    const lookup = makeLookup();
    const original = JSON.stringify(lookup);
    const dead = lookup.lifecycleEventsByActorId![42][0];
    for (const t of [1300, 1800, 1100, 1400, 1300, 1300]) {
      const state = getActorLifecycleAtTimestamp(lookup, 42, t, sampledActor);
      if (t === 1300) expect(state).toBe(dead);
    }
    expect(getActorPositionsByIdAtClosestTimestamp(lookup, 1100)).toBe(
      lookup.positionsByTimestamp[1000],
    );
    expect(JSON.stringify(lookup)).toBe(original);
  });

  it('supports deaths at zero and before fight start', () => {
    const lookup = makeLookup();
    lookup.lifecycleEventsByActorId = {
      42: [{ timestamp: 0, isDead: true, deathTimeMs: 0 }],
      43: [{ timestamp: -100, isDead: true, deathTimeMs: -100 }],
    };
    expect(getActorLifecycleAtTimestamp(lookup, 42, 0).deathTimeMs).toBe(0);
    expect(getActorLifecycleAtTimestamp(lookup, 43, 0).deathTimeMs).toBe(-100);
  });

  it('uses the last transition at equal timestamps without affecting sibling instances', () => {
    const lookup = makeLookup();
    lookup.lifecycleEventsByActorId![42] = [
      { timestamp: 1200, isDead: true, deathTimeMs: 1200 },
      { timestamp: 1200, isDead: false },
    ];
    lookup.lifecycleEventsByActorId![2000042] = [
      { timestamp: 1200, isDead: true, deathTimeMs: 1200 },
    ];
    expect(getActorLifecycleAtTimestamp(lookup, 42, 1200).isDead).toBe(false);
    expect(getActorLifecycleAtTimestamp(lookup, 2000042, 1200).isDead).toBe(true);
  });

  it('defaults to alive for indexed actors without events and falls back for old lookups', () => {
    const lookup = makeLookup();
    const deadSample = { isDead: true, deathTimeMs: 900 };
    const living = getActorLifecycleAtTimestamp(lookup, 99, 1300, deadSample);
    expect(living).toEqual({ isDead: false });
    expect(getActorLifecycleAtTimestamp(lookup, 98, 1300)).toBe(living);
    delete lookup.lifecycleEventsByActorId;
    expect(getActorLifecycleAtTimestamp(lookup, 99, 1300, deadSample)).toBe(deadSample);
    expect(getActorLifecycleAtTimestamp(lookup, 99, 1300)).toBe(living);
  });
});
