import { isFullDailyRun } from './cron-schedule';

const at = (hourUtc: number, minute = 0): number => Date.UTC(2026, 7, 27, hourUtc, minute, 0, 0);

describe('isFullDailyRun', () => {
  it('claims the 04:00 firing', () => {
    expect(isFullDailyRun(at(4))).toBe(true);
  });

  /**
   * The schedule fires at 04, 10, 16 and 22. A `< 12` test would claim BOTH 04
   * and 10, running the roster sync (and its ESO Logs spend) twice a day.
   */
  it('does not claim the other three firings', () => {
    expect(isFullDailyRun(at(10))).toBe(false);
    expect(isFullDailyRun(at(16))).toBe(false);
    expect(isFullDailyRun(at(22))).toBe(false);
  });

  /**
   * A window rather than `=== 4`: an exact-hour test would silently skip the
   * roster sync for a whole day if a firing were ever reported off the hour.
   */
  it('tolerates a firing reported late within the window', () => {
    expect(isFullDailyRun(at(4, 59))).toBe(true);
    expect(isFullDailyRun(at(9, 59))).toBe(true);
  });
});
