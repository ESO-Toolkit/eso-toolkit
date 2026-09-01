import {
  resetItemDataWarmupForTests,
  scheduleItemDataWarmupForPath,
  shouldWarmItemData,
} from './itemDataWarmup';

describe('shouldWarmItemData', () => {
  it.each([
    '/build-editor',
    '/bv',
    '/b/some-build-slug',
    '/roster-builder',
    '/report/AbCd1234/fight/5',
    '/gear-sets',
    '/',
  ])('warms for the gear route %s', (pathname) => {
    expect(shouldWarmItemData(pathname)).toBe(true);
  });

  it.each(['/latest-reports', '/my-reports', '/leaderboards', '/calculator', '/privacy'])(
    'skips the non-gear route %s',
    (pathname) => {
      expect(shouldWarmItemData(pathname)).toBe(false);
    },
  );

  it('matches a denied prefix on segment boundaries only', () => {
    // A nested path under a denied route is still denied…
    expect(shouldWarmItemData('/latest-reports/')).toBe(false);
    // …but a different route that merely starts with the same characters is not.
    expect(shouldWarmItemData('/calculators-comparison')).toBe(true);
  });
});

describe('scheduleItemDataWarmupForPath', () => {
  // jsdom has no requestIdleCallback; install one so the test exercises the
  // scheduling branch the browser actually takes.
  let idle: jest.Mock;

  beforeEach(() => {
    resetItemDataWarmupForTests();
    idle = jest.fn().mockReturnValue(1);
    (window as unknown as { requestIdleCallback: unknown }).requestIdleCallback = idle;
  });

  afterEach(() => {
    delete (window as unknown as { requestIdleCallback?: unknown }).requestIdleCallback;
  });

  it('does not schedule anything on a non-gear route', () => {
    scheduleItemDataWarmupForPath('/latest-reports');
    expect(idle).not.toHaveBeenCalled();
  });

  it('schedules once on a gear route', () => {
    scheduleItemDataWarmupForPath('/build-editor');
    expect(idle).toHaveBeenCalledTimes(1);
  });

  it('schedules only once across repeated navigations', () => {
    scheduleItemDataWarmupForPath('/build-editor');
    scheduleItemDataWarmupForPath('/roster-builder');
    expect(idle).toHaveBeenCalledTimes(1);
  });

  it('still warms when the visitor lands on a list page and then opens a gear page', () => {
    scheduleItemDataWarmupForPath('/latest-reports');
    scheduleItemDataWarmupForPath('/build-editor');
    expect(idle).toHaveBeenCalledTimes(1);
  });

  it('does not warm at all without a true idle callback', () => {
    // A multi-megabyte transfer we cannot schedule politely is not worth
    // forcing onto a timer; consumers await the data themselves.
    delete (window as unknown as { requestIdleCallback?: unknown }).requestIdleCallback;
    const timeout = jest.spyOn(window, 'setTimeout').mockReturnValue(0 as never);

    scheduleItemDataWarmupForPath('/build-editor');

    expect(timeout).not.toHaveBeenCalled();
    timeout.mockRestore();
  });

  it('skips the warm-up on a Data Saver connection', () => {
    Object.defineProperty(navigator, 'connection', {
      value: { saveData: true },
      configurable: true,
    });

    scheduleItemDataWarmupForPath('/build-editor');

    expect(idle).not.toHaveBeenCalled();
    delete (navigator as unknown as { connection?: unknown }).connection;
  });

  it('skips the warm-up on a 2g connection', () => {
    Object.defineProperty(navigator, 'connection', {
      value: { effectiveType: '2g' },
      configurable: true,
    });

    scheduleItemDataWarmupForPath('/build-editor');

    expect(idle).not.toHaveBeenCalled();
    delete (navigator as unknown as { connection?: unknown }).connection;
  });
});
