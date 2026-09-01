/**
 * Report fight-details route chunk preloading.
 *
 * `ReportFightDetails` is the fight-analysis page — by a wide margin the
 * heaviest feature in the app. It used to be a STATIC import in `App.tsx` (every
 * other route there is `React.lazy`), which pulled its entire graph into the
 * entry bundle: every route, including a light list page like /latest-reports,
 * downloaded and evaluated it. The stated reason was LCP on a direct landing at
 * `/report/:reportId/fight/:fightId` — a lazy route there costs an extra network
 * round trip before anything can paint.
 *
 * Making it lazy keeps that LCP property without the entry-bundle cost: the
 * chunk fetch is kicked off imperatively (see `preloadReportFightDetails`) at
 * entry evaluation when the URL is already a report route, so it downloads in
 * parallel with the rest of boot exactly as a static import would have. Users
 * arriving from the report list get it warmed on idle instead. Everyone else
 * never pays for it at all.
 *
 * This importer is the SINGLE SOURCE OF TRUTH for the chunk: `App.tsx` builds
 * its `React.lazy` route from the same function, so preloading warms the exact
 * chunk the route will later load (no path drift, guaranteed chunk identity).
 */

export const importReportFightDetails = (): Promise<
  typeof import('../features/report_details/ReportFightDetails')
> => import('../features/report_details/ReportFightDetails');

// Importers that are currently loading or have already loaded successfully.
// Repeated calls skip these so we never re-fire a healthy preload. A REJECTED
// preload is removed again (in the .catch) so a later call can retry: a transient
// background failure (e.g. an idle preload during a network blip) must not
// permanently poison warming and leave a later mount unable to re-warm.
const warming = new Set<() => Promise<unknown>>();

/**
 * Warm the fight-details route chunk so the route resolves without a network
 * round trip when the user gets there.
 *
 * Safe to invoke repeatedly (entry evaluation, plus every report-list mount): an
 * importer already loading or loaded is skipped, but one whose previous attempt
 * rejected is retried. Import rejections are swallowed — a failed *preload* must
 * never surface as an unhandled rejection; the route's own Suspense boundary and
 * ErrorBoundary handle a genuine load failure if and when the user actually
 * navigates there.
 *
 * @param load Injectable for tests; defaults to the real fight-details chunk.
 */
export function preloadReportFightDetails(
  load: () => Promise<unknown> = importReportFightDetails,
): void {
  if (warming.has(load)) return;
  warming.add(load);
  void load().catch(() => {
    // Transient failure — allow a later call (a later mount) to retry.
    warming.delete(load);
  });
}
