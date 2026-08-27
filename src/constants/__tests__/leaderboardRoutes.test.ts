/**
 * Guards the leaderboard slug table, which is a set of PERMANENT PUBLIC URLS.
 *
 * A duplicate slug or a duplicate title is not a type error and would ship
 * silently, so it is caught here instead: two boards sharing a slug makes one
 * unreachable, and two sharing a title makes Google treat them as one page,
 * which is the exact defect the route-meta single-sourcing was introduced to
 * fix in the first place.
 */

import leaderboardRoutes from '../leaderboard-routes.json';
import {
  bossLeaderboardPath,
  classLeaderboardPath,
  encounterKeyOf,
  getBossRouteByEncounter,
  getBossRouteBySlug,
  getClassRouteByEsoClass,
  getClassRouteBySlug,
  LEADERBOARD_BOSS_ROUTES,
  LEADERBOARD_CLASS_ROUTES,
  LEADERBOARD_ROUTE_META,
} from '../leaderboardRoutes';
import { getRouteMeta } from '../routeMeta';

const SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

const allEntries = [...LEADERBOARD_CLASS_ROUTES, ...LEADERBOARD_BOSS_ROUTES];

describe('leaderboard slug table', () => {
  it('exposes every class and boss board', () => {
    expect(LEADERBOARD_CLASS_ROUTES).toHaveLength(7);
    expect(LEADERBOARD_BOSS_ROUTES).toHaveLength(14);
  });

  it('uses lowercase kebab-case slugs', () => {
    allEntries.forEach((entry) => {
      expect(entry.slug).toMatch(SLUG_PATTERN);
    });
  });

  it('has no duplicate slug within a namespace', () => {
    const classSlugs = LEADERBOARD_CLASS_ROUTES.map((entry) => entry.slug);
    const bossSlugs = LEADERBOARD_BOSS_ROUTES.map((entry) => entry.slug);
    expect(new Set(classSlugs).size).toBe(classSlugs.length);
    expect(new Set(bossSlugs).size).toBe(bossSlugs.length);
  });

  it('has no duplicate encounter key', () => {
    // Two boards on the same (encounterId, difficulty) would be the same data
    // served at two URLs.
    const keys = LEADERBOARD_BOSS_ROUTES.map((entry) =>
      encounterKeyOf(entry.encounterId, entry.difficulty),
    );
    expect(new Set(keys).size).toBe(keys.length);
  });

  it('gives every board a unique title and description', () => {
    const titles = allEntries.map((entry) => entry.title);
    const descriptions = allEntries.map((entry) => entry.description);
    expect(new Set(titles).size).toBe(titles.length);
    expect(new Set(descriptions).size).toBe(descriptions.length);
  });

  it('suffixes every title with the site name', () => {
    allEntries.forEach((entry) => {
      expect(entry.title.endsWith(' | ESO Toolkit')).toBe(true);
    });
  });

  it('keeps user-facing copy free of em dashes', () => {
    // House style. A stray em dash here would be stamped into prerendered
    // <title> and <meta description>, where it is expensive to notice.
    allEntries.forEach((entry) => {
      expect(entry.title).not.toMatch(/[—–]/);
      expect(entry.description).not.toMatch(/[—–]/);
    });
  });

  it('never describes the project as open source', () => {
    // ESO Toolkit and Kalpa are BSL 1.1: source-available, not open source.
    allEntries.forEach((entry) => {
      expect(`${entry.title} ${entry.description}`.toLowerCase()).not.toContain('open source');
      expect(`${entry.title} ${entry.description}`.toLowerCase()).not.toContain('open-source');
    });
  });

  it('resolves slugs back to their entries', () => {
    LEADERBOARD_CLASS_ROUTES.forEach((entry) => {
      expect(getClassRouteBySlug(entry.slug)).toBe(entry);
      expect(getClassRouteByEsoClass(entry.esoClass)).toBe(entry);
    });
    LEADERBOARD_BOSS_ROUTES.forEach((entry) => {
      expect(getBossRouteBySlug(entry.slug)).toBe(entry);
      expect(getBossRouteByEncounter(entry.encounterId, entry.difficulty)).toBe(entry);
    });
  });

  it('returns undefined for unknown slugs rather than throwing', () => {
    expect(getClassRouteBySlug('spellsword')).toBeUndefined();
    expect(getBossRouteBySlug('molag-bal')).toBeUndefined();
    expect(getClassRouteBySlug(undefined)).toBeUndefined();
    expect(getBossRouteBySlug(undefined)).toBeUndefined();
    // The case that actually happens: the ingest starts serving an encounter
    // before anyone adds a slug for it.
    expect(getBossRouteByEncounter(9999, 122)).toBeUndefined();
  });

  it('namespaces class and boss paths so their slugs can never collide', () => {
    expect(classLeaderboardPath('arcanist')).toBe('/build-leaderboard/class/arcanist');
    expect(bossLeaderboardPath('arcanist')).toBe('/build-leaderboard/boss/arcanist');
    expect(classLeaderboardPath('arcanist', 'xalvakka')).toBe(
      '/build-leaderboard/class/arcanist/xalvakka',
    );
  });
});

describe('leaderboard route metadata', () => {
  it('covers exactly the 21 crawlable boards', () => {
    // The 98 class-by-boss permutations are deliberately absent: they
    // canonicalize to the pooled class board instead of being indexed.
    expect(Object.keys(LEADERBOARD_ROUTE_META)).toHaveLength(21);
  });

  it('is reachable through the shared getRouteMeta lookup the page uses', () => {
    LEADERBOARD_CLASS_ROUTES.forEach((entry) => {
      const meta = getRouteMeta(classLeaderboardPath(entry.slug));
      expect(meta?.title).toBe(entry.title);
      expect(meta?.description).toBe(entry.description);
      expect(meta?.prerender).toBe(true);
    });
    LEADERBOARD_BOSS_ROUTES.forEach((entry) => {
      const meta = getRouteMeta(bossLeaderboardPath(entry.slug));
      expect(meta?.title).toBe(entry.title);
      expect(meta?.prerender).toBe(true);
    });
  });

  it('does not shadow an existing top-level route', () => {
    Object.keys(LEADERBOARD_ROUTE_META).forEach((path) => {
      expect(path.startsWith('/build-leaderboard/')).toBe(true);
    });
  });

  it('matches the raw JSON the prerender script reads', () => {
    // scripts/generate-static-routes.cjs require()s this file directly under
    // plain node. If the shapes diverge, prerendering silently emits nothing
    // for these routes and the sitemap loses 21 URLs.
    expect(leaderboardRoutes.classes.map((entry) => entry.slug)).toEqual(
      LEADERBOARD_CLASS_ROUTES.map((entry) => entry.slug),
    );
    expect(leaderboardRoutes.bosses.map((entry) => entry.slug)).toEqual(
      LEADERBOARD_BOSS_ROUTES.map((entry) => entry.slug),
    );
    [...leaderboardRoutes.classes, ...leaderboardRoutes.bosses].forEach((entry) => {
      expect(typeof entry.title).toBe('string');
      expect(typeof entry.description).toBe('string');
      expect(entry.description.length).toBeGreaterThan(0);
    });
  });
});
