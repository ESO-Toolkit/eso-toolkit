import {
  ActorPosition,
  TimestampPositionLookup,
} from '../../../workers/calculations/CalculateActorPositions';

import {
  DEFAULT_PATH_SAMPLING,
  PathSamplingConfig,
  PlayerPath,
  calculateTrailOpacity,
  extractPlayerPaths,
  getPathPointsUpToTime,
  getPlayerInfo,
  getVisiblePlayerIds,
} from './pathUtils';

function makeActor(
  id: number,
  position: [number, number, number],
  overrides: Partial<ActorPosition> = {},
): ActorPosition {
  return {
    id,
    name: `Player ${id}`,
    type: 'player',
    position,
    rotation: 0,
    isDead: false,
    ...overrides,
  };
}

/**
 * Build a lookup from a list of frames. Each frame maps actorId -> ActorPosition.
 * sortedTimestamps is derived and sorted; irregular intervals are used so the
 * binary-search path in the worker helpers is exercised.
 */
function makeLookup(
  frames: Array<{ t: number; actors: ActorPosition[] }>,
): TimestampPositionLookup {
  const positionsByTimestamp: Record<number, Record<number, ActorPosition>> = {};
  for (const { t, actors } of frames) {
    positionsByTimestamp[t] = {};
    for (const actor of actors) {
      positionsByTimestamp[t][actor.id] = actor;
    }
  }
  const sortedTimestamps = frames.map((f) => f.t).sort((a, b) => a - b);
  return {
    positionsByTimestamp,
    sortedTimestamps,
    fightDuration: sortedTimestamps[sortedTimestamps.length - 1] ?? 0,
    fightStartTime: 0,
    sampleInterval: 0,
    hasRegularIntervals: false,
  };
}

describe('extractPlayerPaths', () => {
  const noSmoothing: PathSamplingConfig = {
    ...DEFAULT_PATH_SAMPLING,
    smoothingFactor: 0,
    minDistance: 0,
  };

  it('initializes a path entry (with no points) for selected actors even when lookup is empty', () => {
    // extractPlayerPaths seeds a PlayerPath for each selected id before scanning
    // timestamps, so the map always contains the selected actors.
    const empty = makeLookup([]);
    const paths = extractPlayerPaths(empty, [1], noSmoothing);
    expect(paths.size).toBe(1);
    expect(paths.get(1)!.points).toHaveLength(0);
  });

  it('returns an empty map when no actors are selected', () => {
    const lookup = makeLookup([{ t: 0, actors: [makeActor(1, [0, 0, 0])] }]);
    expect(extractPlayerPaths(lookup, [], noSmoothing).size).toBe(0);
  });

  it('only includes selected actor ids', () => {
    const lookup = makeLookup([
      { t: 0, actors: [makeActor(1, [0, 0, 0]), makeActor(2, [5, 0, 5])] },
      { t: 200, actors: [makeActor(1, [10, 0, 0]), makeActor(2, [6, 0, 5])] },
    ]);
    const paths = extractPlayerPaths(lookup, [1], noSmoothing);
    expect(paths.has(1)).toBe(true);
    expect(paths.has(2)).toBe(false);
  });

  it('enforces minSampleInterval — frames closer than the interval are skipped', () => {
    const lookup = makeLookup([
      { t: 1000, actors: [makeActor(1, [0, 0, 0])] }, // first sample (always kept)
      { t: 1050, actors: [makeActor(1, [10, 0, 0])] }, // 50ms later -> skipped
      { t: 1150, actors: [makeActor(1, [20, 0, 0])] }, // 150ms after last sample -> sampled
    ]);
    const paths = extractPlayerPaths(lookup, [1], { ...noSmoothing, minSampleInterval: 100 });
    const points = paths.get(1)!.points;
    expect(points.map((p) => p.timestamp)).toEqual([1000, 1150]);
  });

  it('keeps the first frame at timestamp 0 (lastSampleTime starts at -minSampleInterval)', () => {
    // Regression guard: lastSampleTime initializes to -minSampleInterval, so the very
    // first frame — even one at exactly t=0 — passes the
    // (timestamp - lastSampleTime < minSampleInterval) check (0 - (-100) = 100 >= 100).
    // Previously lastSampleTime started at 0 and silently dropped a path's t=0 point.
    const lookup = makeLookup([
      { t: 0, actors: [makeActor(1, [0, 0, 0])] },
      { t: 150, actors: [makeActor(1, [20, 0, 0])] },
    ]);
    const paths = extractPlayerPaths(lookup, [1], { ...noSmoothing, minSampleInterval: 100 });
    expect(paths.get(1)!.points.map((p) => p.timestamp)).toEqual([0, 150]);
  });

  it('filters points that move less than minDistance', () => {
    const lookup = makeLookup([
      { t: 1000, actors: [makeActor(1, [0, 0, 0])] }, // first kept point
      { t: 1200, actors: [makeActor(1, [0.3, 0, 0])] }, // 0.3 < 0.5 from last -> filtered
      { t: 1400, actors: [makeActor(1, [1, 0, 0])] }, // 1.0 from last kept >= 0.5 -> kept
    ]);
    const paths = extractPlayerPaths(lookup, [1], {
      ...DEFAULT_PATH_SAMPLING,
      smoothingFactor: 0,
      minDistance: 0.5,
      minSampleInterval: 100,
    });
    const points = paths.get(1)!.points;
    expect(points.map((p) => p.timestamp)).toEqual([1000, 1400]);
  });

  it('trims paths to maxPoints, keeping the most recent points', () => {
    const frames = [];
    for (let i = 0; i < 20; i++) {
      // Each frame 200ms apart and 2 units apart so nothing is filtered.
      frames.push({ t: i * 200, actors: [makeActor(1, [i * 2, 0, 0])] });
    }
    const lookup = makeLookup(frames);
    const paths = extractPlayerPaths(lookup, [1], {
      ...noSmoothing,
      maxPoints: 5,
      minSampleInterval: 100,
    });
    const points = paths.get(1)!.points;
    expect(points).toHaveLength(5);
    // Most recent 5 of 20 frames -> timestamps for i=15..19
    expect(points[points.length - 1].timestamp).toBe(19 * 200);
    expect(points[0].timestamp).toBe(15 * 200);
  });

  it('updates name and role from the first valid actor data', () => {
    const lookup = makeLookup([
      { t: 0, actors: [makeActor(1, [0, 0, 0], { name: 'Healbot', role: 'healer' })] },
      { t: 200, actors: [makeActor(1, [10, 0, 0], { name: 'Healbot', role: 'healer' })] },
    ]);
    const paths = extractPlayerPaths(lookup, [1], { ...noSmoothing, minSampleInterval: 100 });
    const path = paths.get(1)!;
    expect(path.name).toBe('Healbot');
    expect(path.role).toBe('healer');
  });

  it('omits rotation when includeRotation is false', () => {
    const lookup = makeLookup([
      { t: 0, actors: [makeActor(1, [0, 0, 0], { rotation: 1.5 })] },
      { t: 200, actors: [makeActor(1, [10, 0, 0], { rotation: 2.5 })] },
    ]);
    const paths = extractPlayerPaths(lookup, [1], {
      ...noSmoothing,
      includeRotation: false,
      minSampleInterval: 100,
    });
    expect(paths.get(1)!.points.every((p) => p.rotation === undefined)).toBe(true);
  });
});

describe('getPathPointsUpToTime', () => {
  function makePath(timestamps: number[]): PlayerPath {
    return {
      actorId: 1,
      name: 'P1',
      points: timestamps.map((t) => ({ position: [0, 0, 0], timestamp: t, actorId: 1 })),
      color: '#fff',
      visible: true,
    };
  }

  it('returns [] for an empty path', () => {
    expect(getPathPointsUpToTime(makePath([]), 1000)).toEqual([]);
  });

  it('returns [] when currentTime is before the first point', () => {
    expect(getPathPointsUpToTime(makePath([100, 200, 300]), 50)).toEqual([]);
  });

  it('returns all points when currentTime is at or after the last point', () => {
    const path = makePath([100, 200, 300]);
    expect(getPathPointsUpToTime(path, 300)).toHaveLength(3);
    expect(getPathPointsUpToTime(path, 999)).toHaveLength(3);
  });

  it('returns points up to and including currentTime (binary search boundary)', () => {
    const path = makePath([0, 100, 200, 300, 400]);
    expect(getPathPointsUpToTime(path, 250).map((p) => p.timestamp)).toEqual([0, 100, 200]);
    expect(getPathPointsUpToTime(path, 200).map((p) => p.timestamp)).toEqual([0, 100, 200]);
  });
});

describe('calculateTrailOpacity', () => {
  it('is 0 for future points (negative age)', () => {
    expect(calculateTrailOpacity(2000, 1000, 5000)).toBe(0);
  });

  it('is 0 for points older than the fade window', () => {
    expect(calculateTrailOpacity(0, 6000, 5000)).toBe(0);
  });

  it('is 1 at the exact current time and fades linearly', () => {
    expect(calculateTrailOpacity(1000, 1000, 5000)).toBe(1);
    expect(calculateTrailOpacity(0, 2500, 5000)).toBeCloseTo(0.5, 6);
  });
});

describe('getVisiblePlayerIds', () => {
  it('returns sorted unique player ids and excludes non-players', () => {
    const lookup = makeLookup([
      {
        t: 0,
        actors: [
          makeActor(3, [0, 0, 0]),
          makeActor(1, [0, 0, 0]),
          makeActor(99, [0, 0, 0], { type: 'boss' }),
        ],
      },
    ]);
    expect(getVisiblePlayerIds(lookup)).toEqual([1, 3]);
  });

  it('returns [] when there are no positions', () => {
    expect(getVisiblePlayerIds(makeLookup([]))).toEqual([]);
  });
});

describe('getPlayerInfo', () => {
  it('returns name and role for a player from the first frame it appears in', () => {
    const lookup = makeLookup([
      { t: 0, actors: [makeActor(1, [0, 0, 0], { name: 'Tanky', role: 'tank' })] },
    ]);
    expect(getPlayerInfo(lookup, 1)).toEqual({ name: 'Tanky', role: 'tank' });
  });

  it('returns null for an unknown player id', () => {
    const lookup = makeLookup([{ t: 0, actors: [makeActor(1, [0, 0, 0])] }]);
    expect(getPlayerInfo(lookup, 999)).toBeNull();
  });

  it('ignores non-player actors with the requested id', () => {
    const lookup = makeLookup([{ t: 0, actors: [makeActor(1, [0, 0, 0], { type: 'boss' })] }]);
    expect(getPlayerInfo(lookup, 1)).toBeNull();
  });
});
