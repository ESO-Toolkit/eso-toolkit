/**
 * Routes that must never be indexed, regardless of what serves them.
 *
 * Until now the only `noindex` in this codebase was sed-injected into preview
 * and report deploys by the workflows in `.github/workflows/`. Production had
 * NO runtime robots mechanism at all: the auth-gated and share-only routes were
 * protected purely by incidentally returning HTTP 404 on GitHub Pages, which is
 * a hosting accident rather than a decision. The moment anything serves 200 for
 * unprerendered paths — the Cloudflare edge layer in
 * `documentation/seo/CLOUDFLARE_EDGE_REQUEST.md` is exactly that — every one of
 * these becomes indexable. This list is the standing answer so that change is
 * safe to make on its own.
 *
 * Note that "not prerendered" is NOT the same as "should be hidden". `/u/:username`
 * and `/parse-analysis/:reportId?` are runtime-only too and both WANT to be
 * indexed, so membership here is explicit rather than derived from
 * `prerender: false` in route-meta.json.
 */

import { matchPath } from 'react-router-dom';

/**
 * React Router path patterns, matched against `location.pathname`.
 *
 * Grouped by why each one is here; the reasons are not interchangeable and a
 * future reader removing an entry needs to know which argument they are
 * overturning.
 */
export const NOINDEX_ROUTE_PATTERNS: readonly string[] = Object.freeze([
  // OAuth handoff targets. Transient, carry provider state in the URL, and
  // render nothing a reader would want.
  '/oauth-redirect',
  '/discord-oauth-redirect',
  '/app-auth',

  // Auth surfaces. A login form is not a landing page, and /banned indexed
  // would be actively embarrassing.
  '/login',
  '/banned',

  // Account-scoped. Every visitor sees different content, and a crawler
  // (always signed out) sees an empty shell.
  '/whoami',
  '/my-reports',
  '/my-rosters',
  '/my-builds',

  // Server-admin tooling, meaningless without a Discord guild context.
  '/discord-server-config',

  // Share-only views. `/b/:slug` in particular can address a build the author
  // chose not to publish; see the visibility work in PR #1232. These are
  // shared by link deliberately, which is not the same as consenting to being
  // in a search index.
  '/b/:slug',
  '/bv',
  '/rv',

  // The whole /report family: 4 route shapes over unbounded reportId x fightId
  // x tabId, all fetching their data client-side, so a crawler that renders
  // one gets a loading skeleton. /latest-reports links into them from a
  // prerendered page, so they ARE reachable and would otherwise consume crawl
  // budget indefinitely for pages that can never rank.
  //
  // The alternative was self-canonicalizing /report/:reportId and folding the
  // sub-views onto it. Rejected: it still spends the budget, and consolidating
  // onto a page whose content is fetched at runtime buys an index entry with
  // nothing in it. /sample-report is a separate path and stays indexable as
  // the one curated, stable example of this UI.
  '/report/*',
]);

/**
 * Whether `pathname` names a route that must carry `noindex`.
 *
 * @param pathname App-absolute path, e.g. `/my-reports`. Router basename must
 *   already be stripped, which is what `useLocation().pathname` gives you.
 */
export const shouldNoindexPath = (pathname: string): boolean =>
  NOINDEX_ROUTE_PATTERNS.some((pattern) => matchPath(pattern, pathname) !== null);
