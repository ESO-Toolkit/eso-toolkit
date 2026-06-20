import {
  ActorPosition,
  TimestampPositionLookup,
} from '../../../workers/calculations/CalculateActorPositions';

import {
  DEFAULT_PATH_SAMPLING,
  PathSamplingConfig,
  PathPoint,
  PlayerPath,
  calculateTrailOpacity,
  extractPlayerPaths,
  getPathPointsUpToTime,
  getPlayerInfo,
  getVisiblePlayerIds,
  smoothPath,
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

describe('smoothPath', () => {
  function makePoints(xs: number[]): PathPoint[] {
    return xs.map((x, i) => ({
      position: [x, 0, 0] as [number, number, number],
      timestamp: i * 100,
      actorId: 1,
    }));
  }

  it('returns the input unchanged when there are fewer than 3 points or factor <= 0', () => {
    const pts = makePoints([0, 10]);
    expect(smoothPath(pts, 0.5)).toBe(pts);
    const pts3 = makePoints([0, 10, 20]);
    expect(smoothPath(pts3, 0)).toBe(pts3);
  });

  it('preserves point count and non-position metadata', () => {
    const out = smoothPath(makePoints([0, 5, 10, 15, 20]), 0.5);
    expect(out).toHaveLength(5);
    expect(out.map((p) => p.timestamp)).toEqual([0, 100, 200, 300, 400]);
    expect(out.every((p) => p.actorId === 1)).toBe(true);
  });

  // Boundary-weighting regression (#75): the Gaussian kernel must be centered on the
  // point being smoothed (i), NOT on the clipped-window midpoint. At i=0 with factor=0.2
  // the window is indices {0,1}; centering on i weights index 0 highest, so the smoothed
  // x stays nearest the original first point. The old midpoint-centered weighting
  // (Math.abs(j - start - windowLen/2)) put equal weight on {0,1}, pulling the first
  // point toward the average and distorting the trail at the endpoint.
  it('centers the kernel on i at clipped boundaries (not the window midpoint)', () => {
    const factor = 0.2; // windowSize=3, halfWindow=1
    const out = smoothPath(makePoints([0, 10, 20]), factor);

    // Reference: i=0 window is {0,1}; weight uses distance |j - i|.
    const w = (d: number) => Math.exp(-(d * d) / (2 * factor * factor));
    const w0 = w(0); // |0-0|
    const w1 = w(1); // |1-0|
    const expectedFirstX = (0 * w0 + 10 * w1) / (w0 + w1);

    expect(out[0].position[0]).toBeCloseTo(expectedFirstX, 10);

    // The midpoint-centered bug would have weighted indices 0 and 1 equally
    // (distance |j - 1| -> 1 and 0... actually equal magnitudes), yielding the
    // plain average 5. The i-centered result must be strictly below that, hugging
    // the true first point.
    expect(out[0].position[0]).toBeLessThan(5);
  });

  it('keeps an interior point symmetric (kernel centered on i in a full window)', () => {
    const factor = 0.2;
    const out = smoothPath(makePoints([0, 10, 20, 30, 40]), factor);
    // Interior point i=2: window {1,2,3} centered on i=2 -> stays at 20 by symmetry.
    expect(out[2].position[0]).toBeCloseTo(20, 10);
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
