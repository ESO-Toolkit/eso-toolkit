/**
 * The roster-hub-api worker runs two scheduled passes a day from ONE cron
 * trigger (`0 4,16 * * *`), because the Cloudflare account is at the free-plan
 * cap of five triggers. `event.cron` is therefore identical for both firings
 * and the pass has to be derived from the fire time.
 *
 * Getting this wrong is silent: the 04:00 pass owns the temp-build cleanup and
 * the roster sync, so a bad predicate means those simply stop happening.
 */
import { isFullDailyRun } from '../../roster-hub-api/src/cron-schedule';

/** Epoch ms for a given UTC hour on a fixed date. */
const atUtcHour = (hour: number, minute = 0): number => Date.UTC(2026, 7, 5, hour, minute, 0, 0);

describe('isFullDailyRun', () => {
  it('treats the 04:00 UTC firing as the full daily pass', () => {
    expect(isFullDailyRun(atUtcHour(4))).toBe(true);
  });

  it('treats the 16:00 UTC firing as the DPS-only pass', () => {
    expect(isFullDailyRun(atUtcHour(16))).toBe(false);
  });

  it('splits the day at noon UTC', () => {
    expect(isFullDailyRun(atUtcHour(11, 59))).toBe(true);
    expect(isFullDailyRun(atUtcHour(12))).toBe(false);
  });

  it('is unaffected by the local timezone of whatever runs it', () => {
    // getUTCHours, not getHours: a Worker isolate is UTC but a dev machine
    // running these helpers is not, and the pass must not flip because of that.
    const morning = new Date(atUtcHour(4));
    expect(morning.getUTCHours()).toBe(4);
    expect(isFullDailyRun(morning.getTime())).toBe(true);
  });

  it('classifies every hour of the day exactly once', () => {
    const full: number[] = [];
    const dpsOnly: number[] = [];
    for (let h = 0; h < 24; h += 1) (isFullDailyRun(atUtcHour(h)) ? full : dpsOnly).push(h);
    expect(full).toEqual([0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11]);
    expect(dpsOnly).toEqual([12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23]);
  });
});
