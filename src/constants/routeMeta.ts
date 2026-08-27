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

/** Loose lookup for callers that only have a runtime string path. */
export const getRouteMeta = (path: string): RouteMeta | undefined =>
  (ROUTE_META as Readonly<Record<string, RouteMeta>>)[path];

/** Loose title lookup for callers that only have a runtime string path. */
export const getRouteTitle = (path: string): string | undefined => getRouteMeta(path)?.title;
