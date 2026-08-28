/**
 * Guards the noindex list against the two ways it can fail silently.
 *
 * Over-matching hides a page that should rank, and under-matching exposes a
 * private one; neither is a type error and neither shows up in the UI. The
 * indexable cases below are therefore asserted just as hard as the private
 * ones, so a future pattern like `/b*` or `/report` cannot quietly swallow
 * `/build-leaderboard` or `/latest-reports`.
 */

import { NOINDEX_ROUTE_PATTERNS, shouldNoindexPath } from '../noindexRoutes';
import routeMeta from '../route-meta.json';

describe('shouldNoindexPath', () => {
  it.each([
    '/oauth-redirect',
    '/discord-oauth-redirect',
    '/app-auth',
    '/login',
    '/banned',
    '/whoami',
    '/my-reports',
    '/my-rosters',
    '/my-builds',
    '/discord-server-config',
    '/bv',
    '/rv',
  ])('noindexes %s', (pathname) => {
    expect(shouldNoindexPath(pathname)).toBe(true);
  });

  it('noindexes a shared-build permalink whatever the slug is', () => {
    expect(shouldNoindexPath('/b/abc123')).toBe(true);
    expect(shouldNoindexPath('/b/some-other-slug')).toBe(true);
  });

  it.each([
    '/report/ABC123',
    '/report/ABC123/summary',
    '/report/ABC123/dashboard',
    '/report/ABC123/live',
    '/report/ABC123/fight/7',
    '/report/ABC123/fight/7/damage-done',
    '/report/ABC123/fight/7/replay',
  ])('noindexes the whole report family: %s', (pathname) => {
    expect(shouldNoindexPath(pathname)).toBe(true);
  });

  it.each([
    '/',
    '/about',
    '/kalpa',
    '/gear-sets',
    '/latest-reports',
    '/leaderboards',
    '/build-leaderboard',
    '/build-leaderboard/class/arcanist',
    '/build-leaderboard/boss/xalvakka',
    '/build-leaderboard/class/arcanist/ansuul-the-tormentor',
    '/build-hub',
    '/build-editor',
    '/pack-hub',
    '/roster-hub',
    '/discord-setup',
    '/parse-analysis',
    '/parse-analysis/ABC123/7',
    '/u/somebody',
    // Shares a prefix with nothing in the list, but is one character away from
    // being caught by a careless `/report` pattern.
    '/sample-report',
  ])('leaves %s indexable', (pathname) => {
    expect(shouldNoindexPath(pathname)).toBe(false);
  });

  it('does not noindex a prerendered route', () => {
    // Prerendered routes are in sitemap.xml. One of them carrying noindex would
    // be a direct contradiction, so the two lists must never intersect.
    const prerendered = Object.entries(routeMeta)
      .filter(([, meta]) => meta.prerender)
      .map(([path]) => path);

    expect(prerendered.length).toBeGreaterThan(0);
    expect(prerendered.filter(shouldNoindexPath)).toEqual([]);
  });

  it('lists every pattern as an absolute path', () => {
    for (const pattern of NOINDEX_ROUTE_PATTERNS) {
      expect(pattern.startsWith('/')).toBe(true);
    }
  });
});
