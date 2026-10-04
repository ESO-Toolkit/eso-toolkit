import {
  type TimestampPositionLookup,
  getActorLifecycleAtTimestamp,
  getActorPositionAtClosestTimestamp,
  getClosestTimestamp,
} from '../../../workers/calculations/CalculateActorPositions';

import {
  actorMotionPhase,
  CAST_REACTION_MS,
  type StaticModelMotionSample,
} from './staticModelMotion';

export interface RiggedWalkTimeline {
  readonly timestamps: readonly number[];
  readonly distances: readonly number[];
}

export interface RiggedModelAnimationOptions {
  /** World units traveled by the authored walk during one full cycle. */
  walkDistance: number;
  idleDuration: number;
  walkDuration: number;
  castDuration: number;
}

export interface RiggedModelAnimationSample {
  idleTime: number;
  walkTime: number;
  castTime: number;
  idleWeight: number;
  walkWeight: number;
  castWeight: number;
}

function lastIndexAtOrBefore(times: readonly number[], timeMs: number): number {
  let left = 0;
  let right = times.length - 1;
  while (left <= right) {
    const mid = (left + right) >>> 1;
    if (times[mid] <= timeMs) left = mid + 1;
    else right = mid - 1;
  }
  return right;
}

/**
 * Build once per actor/lookup. Missing samples, deaths, and implausible travel (>10 world units/s)
 * break continuity: respawns and teleports must not spin the legs through giant strides.
 * Keep every spatial timestamp so sampling matches the renderer's nearest-position policy.
 */
export function buildRiggedWalkTimeline(
  lookup: TimestampPositionLookup,
  actorId: number,
): RiggedWalkTimeline {
  const timestamps = [...lookup.sortedTimestamps];
  const distances: number[] = [];
  let total = 0;
  const lifecycle = lookup.lifecycleEventsByActorId?.[actorId] ?? [];
  const lifecycleTimes = lifecycle.map((event) => event.timestamp);
  for (let i = 0; i < timestamps.length; i++) {
    const time = timestamps[i];
    const previousTime = timestamps[i - 1];
    const current = lookup.positionsByTimestamp[time]?.[actorId];
    const previous = lookup.positionsByTimestamp[previousTime]?.[actorId];
    if (current && previous && time > previousTime) {
      const currentDead = getActorLifecycleAtTimestamp(lookup, actorId, time, current).isDead;
      const previousDead = getActorLifecycleAtTimestamp(
        lookup,
        actorId,
        previousTime,
        previous,
      ).isDead;
      const firstEvent = lastIndexAtOrBefore(lifecycleTimes, previousTime) + 1;
      let crossedDeath = false;
      for (let j = firstEvent; j < lifecycle.length && lifecycle[j].timestamp <= time; j++) {
        if (lifecycle[j].isDead) crossedDeath = true;
      }
      const distance = Math.hypot(
        current.position[0] - previous.position[0],
        current.position[2] - previous.position[2],
      );
      if (
        !currentDead &&
        !previousDead &&
        !crossedDeath &&
        distance <= (10 * (time - previousTime)) / 1000
      ) {
        total += distance;
      }
    }
    distances.push(total);
  }
  return { timestamps, distances };
}

export function createRiggedModelAnimationSample(): RiggedModelAnimationSample {
  return { idleTime: 0, walkTime: 0, castTime: 0, idleWeight: 1, walkWeight: 0, castWeight: 0 };
}

function positive(value: number): number {
  return Number.isFinite(value) && value > 0 ? value : 1;
}

function unit(value: number): number {
  return Number.isFinite(value) ? Math.min(1, Math.max(0, value)) : 0;
}

function cycle(value: number): number {
  return ((value % 1) + 1) % 1;
}

/** Explicit replay time and logged distance only; neither frame deltas nor playback rate enter. */
export function sampleRiggedModelAnimation(
  lookup: TimestampPositionLookup,
  actorId: number,
  timeMs: number,
  timeline: RiggedWalkTimeline,
  options: RiggedModelAnimationOptions,
  motion: StaticModelMotionSample,
  out: RiggedModelAnimationSample,
): RiggedModelAnimationSample {
  const time = Number.isFinite(timeMs) ? timeMs : 0;
  const spatialTime = getClosestTimestamp(lookup, time);
  const actor = getActorPositionAtClosestTimestamp(lookup, actorId, time);
  const state = getActorLifecycleAtTimestamp(lookup, actorId, time, actor ?? undefined);
  let idleClock = time;
  if (state.isDead) {
    idleClock = state.deathTimeMs ?? 0;
    // Legacy lookups lack an exact event index. Freeze at the first contiguous dead sample.
    if (state.deathTimeMs === undefined && lookup.lifecycleEventsByActorId === undefined) {
      let index = lastIndexAtOrBefore(lookup.sortedTimestamps, spatialTime ?? time);
      while (
        index >= 0 &&
        lookup.positionsByTimestamp[lookup.sortedTimestamps[index]]?.[actorId]?.isDead
      ) {
        idleClock = lookup.sortedTimestamps[index--];
      }
    }
  }
  const idleDuration = positive(options.idleDuration);
  out.idleTime =
    cycle(idleClock / (idleDuration * 1000) + actorMotionPhase(actorId)) * idleDuration;
  const distanceIndex = lastIndexAtOrBefore(timeline.timestamps, spatialTime ?? time);
  const distance = timeline.distances[distanceIndex] ?? 0;
  out.walkTime = cycle(distance / positive(options.walkDistance)) * positive(options.walkDuration);
  out.castTime = 0;
  let strongest = 0;
  const casts = lookup.castTimesByActorId?.[actorId] ?? [];
  if (!state.isDead) {
    for (let i = lastIndexAtOrBefore(casts, time); i >= 0; i--) {
      const elapsed = time - casts[i];
      if (elapsed >= CAST_REACTION_MS) break;
      const pulse = Math.sin((Math.PI * elapsed) / CAST_REACTION_MS) ** 2;
      if (pulse > strongest) {
        strongest = pulse;
        out.castTime = (elapsed / CAST_REACTION_MS) * positive(options.castDuration);
      }
    }
  }
  out.castWeight = state.isDead ? 0 : unit(motion.castPulse);
  out.walkWeight = state.isDead ? 0 : unit(motion.moveStrength) * (1 - out.castWeight);
  out.idleWeight = 1 - out.castWeight - out.walkWeight;
  return out;
}
