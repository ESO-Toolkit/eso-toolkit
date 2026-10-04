import type { TimestampPositionLookup } from '../../../workers/calculations/CalculateActorPositions';

import {
  buildRiggedWalkTimeline,
  createRiggedModelAnimationSample,
  sampleRiggedModelAnimation,
  type RiggedModelAnimationOptions,
} from './riggedModelAnimation';
import { createStaticModelMotionSample, sampleStaticModelMotion } from './staticModelMotion';

const OPTIONS: RiggedModelAnimationOptions = {
  walkDistance: 2,
  idleDuration: 3,
  walkDuration: 1.2,
  castDuration: 1,
};

function lookup(xs = [0, 0.5, 1, 1, 1, 1.5]): TimestampPositionLookup {
  const sortedTimestamps = xs.map((_, i) => i * 500);
  return {
    sortedTimestamps,
    positionsByTimestamp: Object.fromEntries(
      xs.map((x, i) => [
        i * 500,
        Object.fromEntries(
          [42, 43].map((id) => [
            id,
            {
              id,
              name: 'Yandir',
              type: 'boss' as const,
              position: [id === 42 ? x : x / 2, 0, 0] as [number, number, number],
              rotation: 0,
              isDead: false,
            },
          ]),
        ),
      ]),
    ),
    fightDuration: sortedTimestamps[sortedTimestamps.length - 1],
    fightStartTime: 0,
    sampleInterval: 500,
    hasRegularIntervals: true,
  };
}

function sample(data: TimestampPositionLookup, time: number, id = 42, options = OPTIONS) {
  const nearest =
    data.sortedTimestamps[
      Math.min(data.sortedTimestamps.length - 1, Math.max(0, Math.round(time / 500)))
    ];
  const actor = data.positionsByTimestamp[nearest]?.[id];
  const motion = sampleStaticModelMotion(
    data,
    id,
    time,
    actor?.position ?? [0, 0, 0],
    actor?.isDead ?? false,
    createStaticModelMotionSample(),
  );
  return sampleRiggedModelAnimation(
    data,
    id,
    time,
    buildRiggedWalkTimeline(data, id),
    options,
    motion,
    createRiggedModelAnimationSample(),
  );
}

describe('riggedModelAnimation', () => {
  it('advances the walk by logged XZ distance and freezes it when standing still', () => {
    const data = lookup();
    expect(buildRiggedWalkTimeline(data, 42).distances).toEqual([0, 0.5, 1, 1, 1, 1.5]);
    expect(sample(data, 500).walkTime).toBeCloseTo(0.3);
    expect(sample(data, 1000).walkTime).toBeCloseTo(0.6);
    expect(sample(data, 2000).walkTime).toBeCloseTo(0.6);
    expect(sample(data, 2000).walkWeight).toBe(0);
    expect(sample(data, 750).walkTime).toBe(sample(data, 1000).walkTime);
  });

  it('is unchanged by pauses, backwards seeks, or playback step sizes/rates', () => {
    const data = lookup();
    const expected = sample(data, 1000);
    for (const times of [
      [0, 500, 1000],
      [0, 250, 500, 750, 1000],
      [2500, 2000, 1000],
      [1000, 1000, 1000],
    ]) {
      let result = expected;
      for (const time of times) result = sample(data, time);
      expect(result).toEqual(expected);
    }
  });

  it('keeps actor phases and distances independent without changing the lookup', () => {
    const data = lookup();
    const original = JSON.stringify(data);
    const first = sample(data, 1000, 42);
    const second = sample(data, 1000, 43);
    expect(first.walkTime).toBeCloseTo(second.walkTime * 2);
    expect(first.idleTime).not.toBe(second.idleTime);
    expect(sample(data, 1000, 42)).toEqual(first);
    expect(JSON.stringify(data)).toBe(original);
  });

  it('chooses the strongest overlapping completed cast and never anticipates a cast', () => {
    const data = lookup();
    data.castTimesByActorId = { 42: [1000, 1250] };
    expect(sample(data, 999).castWeight).toBe(0);
    expect(sample(data, 999).castTime).toBe(0);
    const reaction = sample(data, 1300);
    expect(reaction.castWeight).toBeCloseTo(1);
    expect(reaction.castTime).toBeCloseTo(0.5);
    expect(reaction.idleWeight + reaction.walkWeight + reaction.castWeight).toBeCloseTo(1);
    expect(sample(data, 1900).castWeight).toBe(0);
  });

  it('freezes the active cast blend at exact death and restores it when seeking/resurrecting', () => {
    const data = lookup();
    data.castTimesByActorId = { 42: [1000, 1500] };
    data.lifecycleEventsByActorId = {
      42: [
        { timestamp: 1200, isDead: true, deathTimeMs: 1200 },
        { timestamp: 1550, isDead: false },
      ],
    };
    const living = sample(data, 1199);
    expect(living.castWeight).toBeGreaterThan(0);
    const dead = sample(data, 1200);
    expect(dead.castWeight).toBeCloseTo(0.75);
    expect(dead.castTime).toBeCloseTo(1 / 3);
    expect(dead.walkWeight).toBeCloseTo(living.walkWeight, 2);
    expect(dead.idleWeight + dead.walkWeight + dead.castWeight).toBeCloseTo(1);
    expect(sample(data, 1549)).toEqual(dead);
    expect(sample(data, 1550).castWeight).toBeGreaterThan(0);
    expect(sample(data, 1199)).toEqual(living);
    expect(buildRiggedWalkTimeline(data, 42).distances).toEqual([0, 0.5, 1, 1, 1, 1.5]);
  });

  it('freezes a walking pose independently of playback history and resumes after resurrection', () => {
    const data = lookup([0, 0.5, 1, 1.5, 2, 2.5]);
    data.lifecycleEventsByActorId = {
      42: [
        { timestamp: 1200, isDead: true, deathTimeMs: 1200 },
        { timestamp: 1750, isDead: false },
      ],
    };
    const living = sample(data, 1199);
    const directSeek = sample(data, 1749);
    expect(directSeek.walkWeight).toBe(1);
    expect(directSeek.walkTime).toBe(living.walkTime);
    expect(sample(data, 1200)).toEqual(directSeek);
    expect(sample(data, 1400)).toEqual(directSeek);
    expect(sample(data, 1199)).toEqual(living);
    expect(sample(data, 2500).walkTime).not.toBe(directSeek.walkTime);
  });

  it('keeps a sparse death-time pose stable and excludes casts at or after death', () => {
    const data = lookup([0, 0.5, 1, 1.5, 2, 2.5]);
    data.sortedTimestamps = [0, 500, 1000, 2000, 2500];
    data.hasRegularIntervals = false;
    data.lifecycleEventsByActorId = {
      42: [{ timestamp: 1200, isDead: true, deathTimeMs: 1200 }],
    };
    data.castTimesByActorId = { 42: [1000, 1200, 1300, 2000] };
    const dead = sample(data, 2500);
    expect(dead.castWeight).toBeCloseTo(0.75);
    expect(dead.castTime).toBeCloseTo(1 / 3);
    expect(dead.walkTime).toBe(sample(data, 1199).walkTime);
    expect(sample(data, 1200)).toEqual(dead);
    expect(sample(data, 2050)).toEqual(dead);
  });

  it('uses a stable idle pose when death occurs at zero without a prior living pose', () => {
    const data = lookup();
    data.lifecycleEventsByActorId = {
      42: [{ timestamp: 0, isDead: true, deathTimeMs: 0 }],
    };
    data.castTimesByActorId = { 42: [0, 500] };
    const dead = sample(data, 0);
    expect(dead.idleWeight).toBe(1);
    expect(dead.walkWeight).toBe(0);
    expect(dead.castWeight).toBe(0);
    expect(sample(data, 2500)).toEqual(dead);
  });

  it('breaks travel across missing actors, teleports, and death/resurrection between samples', () => {
    const data = lookup([0, 0.5, 100, 100.5, 101, 101.5]);
    delete data.positionsByTimestamp[1500][42];
    expect(buildRiggedWalkTimeline(data, 42).distances).toEqual([0, 0.5, 0.5, 0.5, 0.5, 1]);
    data.lifecycleEventsByActorId = {
      43: [
        { timestamp: 2100, isDead: true, deathTimeMs: 2100 },
        { timestamp: 2200, isDead: false },
      ],
    };
    const distances = buildRiggedWalkTimeline(data, 43).distances;
    expect(distances[5]).toBe(distances[4]);
  });

  it('freezes legacy dead samples and returns finite normalized outputs for invalid durations', () => {
    const data = lookup();
    for (const time of [1000, 1500, 2000, 2500]) data.positionsByTimestamp[time][42].isDead = true;
    data.castTimesByActorId = { 42: [700, 1500] };
    expect(sample(data, 1000)).toEqual(sample(data, 2500));
    expect(sample(data, 2500).castWeight).toBeCloseTo(1);
    const result = sample(data, NaN, 42, {
      walkDistance: 0,
      idleDuration: NaN,
      walkDuration: -1,
      castDuration: Infinity,
    });
    expect(Object.values(result).every(Number.isFinite)).toBe(true);
    expect(result.idleWeight + result.walkWeight + result.castWeight).toBe(1);
    const empty = lookup([]);
    expect(Object.values(sample(empty, 0)).every(Number.isFinite)).toBe(true);
  });
});
