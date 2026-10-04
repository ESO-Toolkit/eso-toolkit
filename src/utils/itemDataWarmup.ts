/**
 * Warm large gear datasets only on known gear-consuming routes. New routes
 * opt in here; every consumer still awaits its own data, so warming is only
 * a latency optimisation and never a correctness dependency.
 */
const GEAR_ROUTE_PREFIXES: ReadonlyArray<string> = [
  '/build-editor',
  '/loadout-manager',
  '/bv',
  '/b',
  '/roster-builder',
  '/rv',
  '/report',
  '/sample-report',
  '/gear-sets',
];

/** Whether this route can use the large gear item and icon caches. */
export function shouldWarmItemData(pathname: string): boolean {
  return GEAR_ROUTE_PREFIXES.some(
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
