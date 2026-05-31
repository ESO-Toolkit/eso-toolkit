import { clampReplayTime } from './replayTime';

describe('clampReplayTime', () => {
  const DURATION = 60_000; // 60s fight

  it('returns the time unchanged when within range', () => {
    expect(clampReplayTime(0, DURATION)).toBe(0);
    expect(clampReplayTime(30_000, DURATION)).toBe(30_000);
    expect(clampReplayTime(DURATION, DURATION)).toBe(DURATION);
  });

  it('clamps negative times to 0', () => {
    expect(clampReplayTime(-5_000, DURATION)).toBe(0);
    expect(clampReplayTime(-1, DURATION)).toBe(0);
  });

  it('clamps times beyond the duration to the duration', () => {
    expect(clampReplayTime(999_999_999, DURATION)).toBe(DURATION);
    expect(clampReplayTime(DURATION + 1, DURATION)).toBe(DURATION);
  });

  it('returns 0 for non-finite time input (NaN/±Infinity are rejected)', () => {
    expect(clampReplayTime(NaN, DURATION)).toBe(0);
    expect(clampReplayTime(Infinity, DURATION)).toBe(0);
    expect(clampReplayTime(-Infinity, DURATION)).toBe(0);
  });

  it('treats invalid or zero duration as 0 (collapses to start)', () => {
    expect(clampReplayTime(10_000, 0)).toBe(0);
    expect(clampReplayTime(10_000, -100)).toBe(0);
    expect(clampReplayTime(10_000, NaN)).toBe(0);
  });
});
