import type { BuffLookupData, BuffTimeInterval } from '../../../../utils/BuffLookupUtils';
import type { BuffUptime } from '../BuffUptimeProgressBar';

import { buildUptimeTimelineSeries } from './buildUptimeTimeline';

const ABILITY_ID = '123';

function createLookup(intervals: BuffTimeInterval[]): BuffLookupData {
  return { buffIntervals: { [ABILITY_ID]: intervals } };
}

const uptime: BuffUptime = {
  abilityGameID: ABILITY_ID,
  abilityName: 'Burning',
  totalDuration: 0,
  uptime: 0,
  uptimePercentage: 0,
  applications: 0,
  isDebuff: true,
  hostilityType: 1,
  uniqueKey: 'burning-status-effect',
};

describe('buildUptimeTimelineSeries', () => {
  it('accepts a fight starting at timestamp zero and keeps interval endpoints half-open', () => {
    const result = buildUptimeTimelineSeries({
      uptimes: [uptime],
      lookup: createLookup([{ start: 0, end: 2000, targetID: 1, sourceID: 2 }]),
      fightStartTime: 0,
      fightEndTime: 10000,
    });

    expect(result[0].points).toEqual([
      { x: 0, y: 0 },
      { x: 0, y: 1 },
      { x: 2, y: 1 },
      { x: 2, y: 0 },
      { x: 10, y: 0 },
    ]);
  });

  it('clips and unions overlapping or adjacent intervals at fight boundaries', () => {
    const result = buildUptimeTimelineSeries({
      uptimes: [uptime],
      lookup: createLookup([
        { start: -1000, end: 2000, targetID: 1, sourceID: 2 },
        { start: 2000, end: 5000, targetID: 1, sourceID: 2 },
        { start: 4000, end: 12000, targetID: 1, sourceID: 2 },
      ]),
      fightStartTime: 0,
      fightEndTime: 10000,
    });

    expect(result[0].points).toEqual([
      { x: 0, y: 0 },
      { x: 0, y: 1 },
      { x: 10, y: 1 },
      { x: 10, y: 0 },
    ]);
  });

  it('rejects non-finite fight windows and ignores malformed intervals', () => {
    const lookup = createLookup([
      { start: 0, end: 2000, targetID: 1, sourceID: 2 },
      { start: Number.NaN, end: 5000, targetID: 1, sourceID: 2 },
      { start: 3000, end: Number.POSITIVE_INFINITY, targetID: 1, sourceID: 2 },
    ]);

    expect(
      buildUptimeTimelineSeries({
        uptimes: [uptime],
        lookup,
        fightStartTime: Number.NEGATIVE_INFINITY,
        fightEndTime: 10000,
      }),
    ).toEqual([]);
    expect(
      buildUptimeTimelineSeries({
        uptimes: [uptime],
        lookup,
        fightStartTime: 0,
        fightEndTime: Number.POSITIVE_INFINITY,
      }),
    ).toEqual([]);

    const result = buildUptimeTimelineSeries({
      uptimes: [uptime],
      lookup,
      fightStartTime: 0,
      fightEndTime: 10000,
    });
    expect(result[0].points).toEqual([
      { x: 0, y: 0 },
      { x: 0, y: 1 },
      { x: 2, y: 1 },
      { x: 2, y: 0 },
      { x: 10, y: 0 },
    ]);
  });

  it('returns no timeline when finite endpoints overflow the derived fight duration', () => {
    const result = buildUptimeTimelineSeries({
      uptimes: [uptime],
      lookup: createLookup([{ start: -1e308, end: 1e308, targetID: 1, sourceID: 2 }]),
      fightStartTime: -1e308,
      fightEndTime: 1e308,
    });

    expect(result).toEqual([]);
    expect(result.some((series) => series.points.some((point) => !Number.isFinite(point.x)))).toBe(
      false,
    );
  });
});
