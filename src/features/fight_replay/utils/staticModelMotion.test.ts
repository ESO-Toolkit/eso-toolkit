import type {
  ActorPosition,
  TimestampPositionLookup,
} from '../../../workers/calculations/CalculateActorPositions';
import { getActorPositionAtClosestTimestamp } from '../../../workers/calculations/CalculateActorPositions';

import {
  DEATH_FALL_MS,
  CAST_REACTION_MS,
  MOTION_VELOCITY_WINDOW_MS,
  actorMotionPhase,
  createStaticModelMotionSample,
  findDeathOnsetMs,
  sampleStaticModelMotion,
} from './staticModelMotion';

const ACTOR = 42;
const INTERVAL = 10;

/**
 * Regular-interval lookup for one actor. `at(t)` returns the actor's position and death flag at
 * each sample time, or null when the actor is absent.
 */
function buildLookup(
  durationMs: number,
  at: (t: number) => { x: number; z: number; dead: boolean } | null,
  interval = INTERVAL,
): TimestampPositionLookup {
  const sortedTimestamps: number[] = [];
  const positionsByTimestamp: Record<number, Record<number, ActorPosition>> = {};
  for (let t = 0; t <= durationMs; t += interval) {
    sortedTimestamps.push(t);
    const s = at(t);
    positionsByTimestamp[t] = s
      ? {
          [ACTOR]: {
            id: ACTOR,
            name: 'Boss',
            type: 'boss',
            position: [s.x, 0, s.z],
            rotation: 0,
            isDead: s.dead,
          },
        }
      : {};
  }
  return {
    positionsByTimestamp,
    sortedTimestamps,
    fightDuration: durationMs,
    fightStartTime: 0,
    sampleInterval: interval,
    hasRegularIntervals: true,
  };
}

function sampleAt(lookup: TimestampPositionLookup, timeMs: number) {
  const snap = getActorPositionAtClosestTimestamp(lookup, ACTOR, timeMs)!;
  return sampleStaticModelMotion(
    lookup,
    ACTOR,
    timeMs,
    snap.position,
    snap.isDead,
    createStaticModelMotionSample(),
  );
}

describe('staticModelMotion', () => {
  it('gives each actor a stable phase in [0, 1)', () => {
    for (const id of [0, 1, 2, 99, 12345]) {
      const phase = actorMotionPhase(id);
      expect(phase).toBeGreaterThanOrEqual(0);
      expect(phase).toBeLessThan(1);
      expect(actorMotionPhase(id)).toBe(phase);
    }
    expect(actorMotionPhase(1)).not.toBeCloseTo(actorMotionPhase(2), 2);
  });

  it('breathes but does not move or fall while standing still', () => {
    const lookup = buildLookup(5000, () => ({ x: 10, z: 10, dead: false }));
    const breaths = new Set<number>();
    for (let t = 1000; t <= 4000; t += 500) {
      const m = sampleAt(lookup, t);
      expect(m.moveStrength).toBe(0);
      expect(m.fall).toBe(0);
      expect(Math.abs(m.breath)).toBeLessThanOrEqual(1);
      breaths.add(Number(m.breath.toFixed(4)));
    }
    expect(breaths.size).toBeGreaterThan(1);
  });

  it('measures travel direction and strength from replay time alone', () => {
    // 1 world unit per second along +X.
    const lookup = buildLookup(5000, (t) => ({ x: t / 1000, z: 0, dead: false }));
    const m = sampleAt(lookup, 2000);
    expect(m.moveStrength).toBe(1);
    expect(m.moveDirX).toBeCloseTo(1);
    expect(m.moveDirZ).toBeCloseTo(0);
    // Same inputs, same output: no hidden per-frame state.
    expect(sampleAt(lookup, 2000)).toEqual(m);
  });

  it('ignores drift below the standing threshold', () => {
    // 0.05 u/s is below MOTION_SPEED_MIN.
    const lookup = buildLookup(5000, (t) => ({ x: t / 20000, z: 0, dead: false }));
    expect(sampleAt(lookup, 2000).moveStrength).toBe(0);
  });

  it.each([300, 500])('keeps constant-speed lean stable with %i ms samples', (interval) => {
    const lookup = buildLookup(6000, (t) => ({ x: t * 0.0003, z: 0, dead: false }), interval);
    for (let t = 1500; t < 4000; t += 50) {
      expect(sampleAt(lookup, t).moveStrength).toBeCloseTo(0.4);
    }
  });

  it('uses the actual elapsed time across irregular position gaps', () => {
    const lookup = buildLookup(5000, (t) => ({ x: t * 0.0003, z: 0, dead: false }), 1000);
    lookup.sortedTimestamps = [0, 1000, 4000, 5000];
    lookup.hasRegularIntervals = false;
    lookup.sampleInterval = 10;
    expect(sampleAt(lookup, 4000).moveStrength).toBeCloseTo(0.4);
  });

  it('reacts only after completed casts and reproduces the pose when seeking', () => {
    const lookup = buildLookup(5000, () => ({ x: 0, z: 0, dead: false }));
    lookup.castTimesByActorId = { [ACTOR]: [1000, 3000] };
    expect(sampleAt(lookup, 999).castPulse).toBe(0);
    expect(sampleAt(lookup, 1000).castPulse).toBe(0);
    const peak = sampleAt(lookup, 1000 + CAST_REACTION_MS / 2);
    expect(peak.castPulse).toBeCloseTo(1);
    expect(sampleAt(lookup, 1000 + CAST_REACTION_MS).castPulse).toBe(0);
    sampleAt(lookup, 3300);
    expect(sampleAt(lookup, 1300)).toEqual(peak);
    lookup.castTimesByActorId = { [ACTOR + 1]: [1000] };
    expect(sampleAt(lookup, 1300).castPulse).toBe(0);
  });

  it('keeps overlapping reactions continuous and suppresses them on death', () => {
    const lookup = buildLookup(5000, (t) => ({ x: 0, z: 0, dead: t >= 1400 }));
    lookup.castTimesByActorId = { [ACTOR]: [1000, 1300] };
    expect(sampleAt(lookup, 1300).castPulse).toBeCloseTo(1);
    expect(sampleAt(lookup, 1301).castPulse).toBeGreaterThan(0.99);
    expect(sampleAt(lookup, 1400).castPulse).toBe(0);
  });

  it('uses the recorded death time even with sparse samples', () => {
    const lookup = buildLookup(5000, (t) => ({ x: 0, z: 0, dead: t >= 1200 }), 500);
    for (const t of lookup.sortedTimestamps) {
      if (lookup.positionsByTimestamp[t][ACTOR].isDead) {
        lookup.positionsByTimestamp[t][ACTOR].deathTimeMs = 1200;
      }
    }
    expect(findDeathOnsetMs(lookup, ACTOR, 1500)).toBe(1200);
    expect(sampleAt(lookup, 1500).fall).toBeCloseTo((300 / DEATH_FALL_MS) ** 2);
    expect(sampleAt(lookup, 2000).fall).toBe(1);
  });

  it('eases the death fall from the death sample to rest', () => {
    const deathAt = 2000;
    const lookup = buildLookup(5000, (t) => ({ x: 0, z: 0, dead: t >= deathAt }));

    expect(sampleAt(lookup, deathAt - INTERVAL).fall).toBe(0);
    const early = sampleAt(lookup, deathAt + DEATH_FALL_MS * 0.25).fall;
    const late = sampleAt(lookup, deathAt + DEATH_FALL_MS * 0.75).fall;
    expect(early).toBeGreaterThan(0);
    expect(late).toBeGreaterThan(early);
    expect(late).toBeLessThan(1);
    expect(sampleAt(lookup, deathAt + DEATH_FALL_MS + 100).fall).toBe(1);

    const onset = findDeathOnsetMs(lookup, ACTOR, deathAt + 300);
    expect(onset).not.toBeNull();
    expect(Math.abs((onset as number) - deathAt)).toBeLessThanOrEqual(INTERVAL);
  });

  it('lands a seek past the fall directly on the resting pose', () => {
    const lookup = buildLookup(5000, (t) => ({ x: 0, z: 0, dead: t >= 1000 }));
    const m = sampleAt(lookup, 4000);
    expect(m.fall).toBe(1);
    expect(m.breath).toBe(0);
    expect(m.moveStrength).toBe(0);
  });

  it('does not lean on the frame an actor first appears', () => {
    const appearAt = 2000;
    const lookup = buildLookup(5000, (t) => (t < appearAt ? null : { x: 50, z: 50, dead: false }));
    expect(sampleAt(lookup, appearAt + MOTION_VELOCITY_WINDOW_MS / 2).moveStrength).toBe(0);
  });
});
