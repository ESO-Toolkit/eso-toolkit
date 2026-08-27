/**
 * Single source of truth for per-route SEO metadata (title + description).
 *
 * The data itself lives in `route-meta.json` so that BOTH consumers can read it
 * with zero build tooling:
 *   - the runtime app imports it here (TypeScript `resolveJsonModule`), and
 *   - `scripts/generate-static-routes.cjs` `require()`s the same JSON under
 *     plain node to stamp prerendered <title>/canonical/og tags and sitemap.xml.
 *
 * Before this module existed the two sides held independent hardcoded strings
 * and had already drifted (e.g. /calculator prerendered "ESO Calculators |
 * ESO Toolkit" but hydrated to "Calculator | ESO Toolkit"), so Google indexed
 * the weaker runtime title. Keep new titles in the JSON, never in components.
 */

import { LEADERBOARD_ROUTE_META } from './leaderboardRoutes';
import routeMetaJson from './route-meta.json';

export interface RouteMeta {
  /** Exact <title> text. Prerender and runtime must agree byte for byte. */
  readonly title: string;
  /** Meta/og/twitter description. Required for prerendered routes. */
  readonly description?: string;
  /**
   * Whether `scripts/generate-static-routes.cjs` emits a static shell and a
   * sitemap entry for this path. Parameterized, auth-gated and share-only
   * routes are runtime-only.
   */
  readonly prerender: boolean;
}

/** Every route path known to the metadata map, as a literal union. */
export type RouteMetaPath = keyof typeof routeMetaJson;

export const ROUTE_META: Readonly<Record<RouteMetaPath, RouteMeta>> = routeMetaJson;

/**
 * The build-leaderboard sub-routes live in their own JSON because each entry
 * also carries the encounter id / class filter the page needs, not just SEO
 * copy. They are folded in here so `getRouteMeta` stays the one lookup callers
 * need, and so `scripts/generate-static-routes.cjs` prerendering them requires
 * no second code path.
 *
 * They are NOT added to `RouteMetaPath`: those paths are built from slugs at
 * runtime, so no caller can name one as a literal anyway.
 */
const LEADERBOARD_META: Readonly<Record<string, RouteMeta>> = Object.freeze(
  Object.fromEntries(
    Object.entries(LEADERBOARD_ROUTE_META).map(([path, meta]) => [
      path,
      { ...meta, prerender: true },
    ]),
  ),
);

/** Every prerenderable path, including the generated leaderboard sub-routes. */
export const ALL_ROUTE_META: Readonly<Record<string, RouteMeta>> = Object.freeze({
  ...(ROUTE_META as Readonly<Record<string, RouteMeta>>),
  ...LEADERBOARD_META,
});

/** Loose lookup for callers that only have a runtime string path. */
export const getRouteMeta = (path: string): RouteMeta | undefined => ALL_ROUTE_META[path];

/** Loose title lookup for callers that only have a runtime string path. */
export const getRouteTitle = (path: string): string | undefined => getRouteMeta(path)?.title;
