/**
 * Hub route chunk preloading.
 *
 * The three "hub" pages — /roster-hub, /build-hub, /pack-hub — are peers in the
 * top navigation and users frequently slide laterally between them. Each is a
 * `React.lazy` code-split chunk.
 *
 * Why preload them: navigating to a hub whose chunk is still COLD breaks the
 * native View Transition. react-router wraps navigation in `startTransition`, so
 * while the lazy route suspends React keeps the *previous* page committed (the
 * null Suspense fallback never paints). The View Transition therefore captures a
 * non-destination "new" snapshot — effectively the page you just left — and the
 * real content only commits after the transition has finished, so the slide looks
 * like it plays against a duplicate of the old page and the destination then pops
 * in. Once the chunk is warm React resolves it synchronously, the real content is
 * captured in the snapshot, and the slide is clean — which is exactly why the
 * glitch "goes away once triggered".
 *
 * Warming all three chunks shortly after the header mounts makes the first hop
 * behave like a warm one, so the View Transition always captures real content.
 *
 * These importers are the SINGLE SOURCE OF TRUTH for the hub route chunks:
 * `App.tsx` builds its `React.lazy` routes from the same functions, so preloading
 * warms the exact chunk the route will later load (no path drift, guaranteed
 * chunk identity).
 */

export const importRosterHubPage = (): Promise<
  typeof import('../features/roster-hub/components/RosterHubPage')
> => import('../features/roster-hub/components/RosterHubPage');

export const importBuildHubPage = (): Promise<
  typeof import('../features/build-hub/components/BuildHubPage')
> => import('../features/build-hub/components/BuildHubPage');

export const importPackHubPage = (): Promise<
  typeof import('../features/pack-hub/components/PackHubPage')
> => import('../features/pack-hub/components/PackHubPage');

const hubRouteImporters: ReadonlyArray<() => Promise<unknown>> = [
  importRosterHubPage,
  importBuildHubPage,
  importPackHubPage,
];

// Importers that are currently loading or have already loaded successfully.
// Repeated calls skip these so we never re-fire a healthy preload. A REJECTED
// preload is removed again (in the .catch) so a later call can retry: a transient
// background failure (e.g. an idle preload during a network blip) must not
// permanently poison hub warming and leave hover/focus/idle unable to re-warm.
const warming = new Set<() => Promise<unknown>>();

/**
 * Warm the three hub route chunks so a subsequent hub navigation captures real
 * destination content in its View Transition snapshot.
 *
 * Safe to invoke repeatedly (every header mount, plus hover/focus): an importer
 * already loading or loaded is skipped, but one whose previous attempt rejected is
 * retried. Import rejections are swallowed — a failed *preload* must never surface
 * as an unhandled rejection; the route's own Suspense boundary and ErrorBoundary
 * handle a genuine load failure if and when the user actually navigates there.
 *
 * @param importers Injectable for tests; defaults to the real hub route chunks.
 */
export function preloadHubRoutes(
  importers: ReadonlyArray<() => Promise<unknown>> = hubRouteImporters,
): void {
  for (const load of importers) {
    if (warming.has(load)) continue;
    warming.add(load);
    void load().catch(() => {
      // Transient failure — allow a later call (hover/focus/idle) to retry.
      warming.delete(load);
    });
  }
}
