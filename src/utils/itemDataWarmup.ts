/**
 * Gear item-data warm-up scheduling.
 *
 * The loadout gear data is big: `itemIdMap.json` is ~12 MB decoded, the icon
 * map ~3.8 MB, and the set-collections payload another ~1.9 MB that rides along
 * in the itemIdMap chunk — roughly 1.3 MB over the wire compressed, and ~18 MB
 * of JSON to parse on the main thread. Warming it in the background makes the
 * gear-heavy pages (build editor, /bv, roster tools, report player cards) feel
 * instant, which is why the entry module schedules it on idle.
 *
 * What it must NOT do is spend that budget on a page that never touches gear.
 * `/latest-reports` is the clearest case: a plain report list that was paying
 * the full 1.3 MB download plus several hundred ms of parse on every visit,
 * landing right on top of its own first render.
 *
 * So the warm-up is gated by path. The gate is a DENY list, not an allow list:
 * a route that isn't listed keeps the previous always-warm behaviour, so adding
 * a new gear page can never silently lose the optimisation. Skipping is always
 * safe regardless — every consumer of this data (`preloadItemData()` /
 * `preloadIconData()`) awaits its own load and retries, so the warm-up is a
 * latency optimisation and never a correctness dependency.
 */

/**
 * Route prefixes whose pages never read gear item data. Compared against
 * `location.pathname` with `startsWith`, so `/logs` also covers `/logs/foo`.
 */
const NON_GEAR_ROUTE_PREFIXES: ReadonlyArray<string> = [
  '/latest-reports',
  '/my-reports',
  '/logs',
  '/leaderboards',
  '/calculator',
  '/text-editor',
  '/ultimate-simulator',
  '/scribing-simulator',
  '/about',
  '/privacy',
  '/privacy-settings',
  '/whats-new',
  '/whoami',
  '/login',
  '/banned',
  '/docs/calculations',
  '/docs/discord-roster-bot',
  '/discord-setup',
  '/discord-server-config',
  '/oauth-redirect',
  '/discord-oauth-redirect',
  '/app-auth',
];

/**
 * Whether the gear item data is worth warming for `pathname`.
 *
 * Exported for tests and for the route-change hook; see the deny-list rationale
 * in the module doc comment.
 */
export function shouldWarmItemData(pathname: string): boolean {
  return !NON_GEAR_ROUTE_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
  );
}

type NavigatorWithConnection = Navigator & {
  connection?: { effectiveType?: string; saveData?: boolean };
};

/**
 * Whether the visitor's connection can afford a multi-megabyte background
 * transfer. Data Saver and 2g are explicit "don't" signals.
 */
function connectionCanAffordWarmup(): boolean {
  const connection = (navigator as NavigatorWithConnection).connection;
  return !connection?.saveData && !['slow-2g', '2g'].includes(connection?.effectiveType ?? '');
}

/** Set once a warm-up has been scheduled, so repeated calls are no-ops. */
let scheduled = false;

const startWarmup = (): void => {
  // Dynamic imports, deliberately: a STATIC import of either module would drag
  // the loadout data graph (and the ~1.9 MB set collections it bundles) into
  // the entry chunk, parsed before first paint on every page. Both modules also
  // start their fetch as a top-level side effect, so importing them IS the
  // warm-up; the explicit preload calls just surface the promise.
  void import('../features/loadout-manager/utils/itemIconResolver')
    .then((m) => m.preloadIconData())
    .catch(() => {});
  void import('../features/loadout-manager/data/itemIdMap')
    .then((m) => m.preloadItemData())
    .catch(() => {});
};

/**
 * Warm the gear item + icon caches off the critical path, once per session.
 *
 * Idle-scheduled so the fetches and their JSON parse stay out of the startup
 * window, and skipped entirely on a Data Saver or 2g connection. Call it at
 * entry evaluation for a gear route, and again on navigation into one (see
 * AppLayout); the `scheduled` guard makes the extra calls free.
 */
export function scheduleItemDataWarmup(): void {
  if (scheduled) return;

  // No fallback timer on browsers without a true idle callback: we must not
  // force a multi-megabyte background transfer we cannot schedule politely.
  // Feature consumers already await these datasets when they need them.
  if (typeof window.requestIdleCallback !== 'function') return;
  if (!connectionCanAffordWarmup()) return;

  scheduled = true;
  window.requestIdleCallback(startWarmup, { timeout: 15000 });
}

/**
 * Schedule the warm-up for `pathname` if that route can use the data.
 *
 * The single entry point for both the boot-time call and the route-change hook.
 */
export function scheduleItemDataWarmupForPath(pathname: string): void {
  if (!shouldWarmItemData(pathname)) return;
  scheduleItemDataWarmup();
}

/** Test-only: forget that a warm-up was scheduled. */
export function resetItemDataWarmupForTests(): void {
  scheduled = false;
}
