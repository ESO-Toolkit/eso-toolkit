import { dateRangePresetLabel, rangeToEpochMs } from './rangeToEpochMs';

// Fixed clock: 2026-06-14T12:00:00.000Z
const NOW = Date.UTC(2026, 5, 14, 12, 0, 0, 0);
const DAY = 86_400_000;

describe('rangeToEpochMs', () => {
  it('returns an empty range for "all" (both vars omitted)', () => {
    expect(rangeToEpochMs('all', null, null, NOW)).toEqual({});
  });

  it('anchors 7d to now - 7 days with no end bound', () => {
    expect(rangeToEpochMs('7d', null, null, NOW)).toEqual({ start: NOW - 7 * DAY });
  });

  it('anchors 30d to now - 30 days', () => {
    expect(rangeToEpochMs('30d', null, null, NOW)).toEqual({ start: NOW - 30 * DAY });
  });

  it('anchors 90d to now - 90 days', () => {
    expect(rangeToEpochMs('90d', null, null, NOW)).toEqual({ start: NOW - 90 * DAY });
  });

  it('custom range snaps from to start-of-day and to to end-of-day (local)', () => {
    const result = rangeToEpochMs('custom', '2026-06-01', '2026-06-10', NOW);
    expect(result.start).toBeDefined();
    expect(result.end).toBeDefined();
    // start is local midnight of Jun 1; end is local 23:59:59.999 of Jun 10.
    const start = new Date(result.start as number);
    const end = new Date(result.end as number);
    expect(start.getFullYear()).toBe(2026);
    expect(start.getMonth()).toBe(5);
    expect(start.getDate()).toBe(1);
    expect(start.getHours()).toBe(0);
    expect(start.getMinutes()).toBe(0);
    expect(end.getDate()).toBe(10);
    expect(end.getHours()).toBe(23);
    expect(end.getMinutes()).toBe(59);
    expect(end.getSeconds()).toBe(59);
  });

  it('custom range with only a from bound omits end', () => {
    const result = rangeToEpochMs('custom', '2026-06-01', null, NOW);
    expect(result.start).toBeDefined();
    expect(result.end).toBeUndefined();
  });

  it('custom range with no bounds returns empty', () => {
    expect(rangeToEpochMs('custom', null, null, NOW)).toEqual({});
  });

  it('single-day custom range covers the whole day (not zero-width)', () => {
    const result = rangeToEpochMs('custom', '2026-06-14', '2026-06-14', NOW);
    expect(result.start).toBeDefined();
    expect(result.end).toBeDefined();
    expect((result.end as number) - (result.start as number)).toBeGreaterThan(DAY - 1000);
  });

  it('ignores malformed custom dates rather than producing NaN', () => {
    const result = rangeToEpochMs('custom', 'not-a-date', '', NOW);
    expect(result.start).toBeUndefined();
    expect(result.end).toBeUndefined();
  });
});

describe('dateRangePresetLabel', () => {
  it('produces human labels', () => {
    expect(dateRangePresetLabel('all')).toBe('All time');
    expect(dateRangePresetLabel('7d')).toBe('Last 7 days');
    expect(dateRangePresetLabel('30d')).toBe('Last 30 days');
    expect(dateRangePresetLabel('90d')).toBe('Last 90 days');
    expect(dateRangePresetLabel('custom')).toBe('Custom');
  });
});
