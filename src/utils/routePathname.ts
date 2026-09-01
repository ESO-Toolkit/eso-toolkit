/**
 * Strip a deploy's base path off a browser pathname to get the app route.
 *
 * `window.location.pathname` is NOT the app route: dev previews are served from
 * `/dev-previews/pr-123/`, so a visitor on Latest Reports there has a pathname
 * of `/dev-previews/pr-123/latest-reports/`. Anything that matches routes before
 * React Router mounts — the entry module's gates and preloads — has to strip the
 * base first, or it silently mis-classifies every preview build: the Latest
 * Reports prefetch never fires and the gear-data warm-up runs on pages that
 * don't want it. Inside the router, `useLocation().pathname` is already
 * base-relative and needs none of this.
 *
 * Kept apart from envUtils so it is testable: envUtils reads `import.meta.env`,
 * which Jest cannot parse, so it is mocked wholesale in the suite.
 *
 * Returns a leading slash and no trailing slash (except for the root).
 */
export function stripBasePath(pathname: string, base: string): string {
  // BASE_URL always ends in '/'; drop that so the route keeps its leading one.
  const prefix = base.endsWith('/') ? base.slice(0, -1) : base;
  const relative =
    prefix && pathname.startsWith(`${prefix}/`) ? pathname.slice(prefix.length) : pathname;
  const withSlash = relative.startsWith('/') ? relative : `/${relative}`;
  return withSlash.length > 1 ? withSlash.replace(/\/+$/, '') || '/' : withSlash;
}
