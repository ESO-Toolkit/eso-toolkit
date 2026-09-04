import { clampReplayTime, formatDurationMs } from './replayTime';

describe('formatDurationMs', () => {
  it('formats m:ss', () => {
    expect(formatDurationMs(0)).toBe('0:00');
    expect(formatDurationMs(5000)).toBe('0:05');
    expect(formatDurationMs(65000)).toBe('1:05');
    expect(formatDurationMs(600000)).toBe('10:00');
  });

  it('floors sub-second remainders', () => {
    expect(formatDurationMs(1999)).toBe('0:01');
  });

  it('renders non-finite and negative input as 0:00 (clocks never show garbage)', () => {
    expect(formatDurationMs(NaN)).toBe('0:00');
    expect(formatDurationMs(Infinity)).toBe('0:00');
    expect(formatDurationMs(-5000)).toBe('0:00');
  });
});

describe('clampReplayTime', () => {
  it('clamps into range and rejects non-finite input', () => {
    expect(clampReplayTime(5000, 10000)).toBe(5000);
    expect(clampReplayTime(-5, 10000)).toBe(0);
    expect(clampReplayTime(99999, 10000)).toBe(10000);
    expect(clampReplayTime(NaN, 10000)).toBe(0);
  });
});
