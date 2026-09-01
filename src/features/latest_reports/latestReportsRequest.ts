/**
 * Addressing + boot-time prefetch for the Latest Reports server query.
 *
 * WHY THIS EXISTS: on a cold visit to /latest-reports the list query used to be
 * issued only after the whole app had booted — entry chunk evaluated, React
 * mounted, the lazy route chunk fetched and rendered — which on a mid-range
 * device measured around four seconds before the request even left the browser.
 * The request itself takes ~0.5 s, so the page spent seconds staring at a
 * skeleton for no reason other than request ordering.
 *
 * So the entry module (src/index.tsx) fires the exact same request during its
 * own evaluation, in parallel with the rest of boot, and `useLatestReportsQuery`
 * adopts the in-flight promise when it finally mounts. Nothing else changes: the
 * variables, the document and the endpoint are the ones the hook would have
 * used, so the response is byte-for-byte what Apollo would have received.
 *
 * It is a raw `fetch` rather than an Apollo query on purpose. The Apollo client
 * is created inside `EsoLogsClientProvider`, i.e. during React render — which is
 * exactly the part of boot we are trying to get ahead of — and the operation is
 * public (the Worker proxy injects the credentials; the browser sends no auth
 * header for it), so there is nothing in the link chain this bypasses.
 *
 * The document is `print()`ed from the codegen'd `DocumentNode`, the same value
 * scripts/generate-graphql-manifest.ts hashes, so the proxy's persisted-query
 * pin accepts it by construction.
 */

import { print } from 'graphql';

import {
  GetLatestReportsDocument,
  type GetLatestReportsQuery,
  type GetLatestReportsQueryVariables,
} from '../../graphql/gql/graphql';
import { getRosterHubBaseUrl } from '../../utils/envUtils';

import { rangeToEpochMs, type DateRangePreset } from './hooks/rangeToEpochMs';
import { parseLatestReportsFilters } from './hooks/useLatestReportsUrlState';

export const REPORTS_PER_PAGE = 25;

const OPERATION_NAME = 'getLatestReports';

/** The server-filter inputs of the list query (text search is client-side). */
export interface LatestReportsQueryInput {
  page: number;
  zoneId: number | null;
  range: DateRangePreset;
  customFrom: string | null;
  customTo: string | null;
}

/** The single place the query variables are derived, so prefetch and hook agree. */
export function buildLatestReportsVariables(
  input: LatestReportsQueryInput,
): GetLatestReportsQueryVariables {
  const { start, end } = rangeToEpochMs(input.range, input.customFrom, input.customTo);
  return {
    limit: REPORTS_PER_PAGE,
    page: input.page,
    zoneID: input.zoneId ?? undefined,
    startTime: start,
    endTime: end,
  };
}

/**
 * Stable identity for a set of variables. Undefined entries are dropped so the
 * hook's `{ zoneID: undefined }` and a prefetch's omitted key compare equal.
 */
function variablesKey(variables: GetLatestReportsQueryVariables): string {
  const defined = Object.entries(variables)
    .filter(([, value]) => value !== undefined)
    .sort(([a], [b]) => a.localeCompare(b));
  return JSON.stringify(defined);
}

/**
 * How long a boot prefetch stays adoptable.
 *
 * The prefetch is normally consumed within a second or two, when the route
 * chunk mounts. But nothing guarantees that mount happens: the visitor can
 * navigate away before the lazy chunk resolves, and the promise would then sit
 * in module scope for the rest of the session. Adopting a snapshot that old on
 * some later visit would hand the list a stale page with `loading: false` and
 * no revalidation — precisely what the hook's cache-and-network design exists
 * to avoid. Past this window the prefetch is ignored and the hook fetches
 * normally.
 */
const PREFETCH_MAX_AGE_MS = 30_000;

interface Prefetch {
  key: string;
  startedAt: number;
  promise: Promise<GetLatestReportsQuery>;
}

let pending: Prefetch | null = null;

async function requestLatestReports(
  variables: GetLatestReportsQueryVariables,
): Promise<GetLatestReportsQuery> {
  const response = await fetch(`${getRosterHubBaseUrl()}/graphql?query=${OPERATION_NAME}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      operationName: OPERATION_NAME,
      variables,
      query: print(GetLatestReportsDocument),
    }),
  });
  if (!response.ok) {
    throw new Error(`Latest Reports prefetch failed (${response.status})`);
  }
  const payload = (await response.json()) as { data?: GetLatestReportsQuery };
  // A response with no reports pagination is a degraded one (upstream error,
  // rate limit). Reject so the hook falls back to its normal cache+network
  // path and surfaces the failure the way it always has.
  if (!payload.data?.reportData?.reports) {
    throw new Error('Latest Reports prefetch returned no reports data');
  }
  return payload.data;
}

/**
 * Start the list request for `pathname`+`search` if they address Latest Reports.
 *
 * Called once from the entry module. Any URL under /latest-reports qualifies —
 * the filters are parsed from the query string, so a shared link to page 3 or a
 * zone-filtered view is prefetched with its own variables, not the defaults.
 */
export function prefetchLatestReportsForUrl(pathname: string, search: string): void {
  if (pending) return;
  if (typeof fetch !== 'function') return;
  if (pathname !== '/latest-reports' && !pathname.startsWith('/latest-reports/')) return;

  const filters = parseLatestReportsFilters(new URLSearchParams(search));
  // Rolling presets anchor `startTime` to `Date.now()`, so the value computed
  // here and the one the hook computes on mount differ by however long boot
  // took — the variables would never match and the prefetch would be dropped
  // after spending an upstream request (and a token from the proxy's per-IP
  // budget). Only prefetch the ranges that are stable between the two calls:
  // `all`, and `custom`, whose bounds come from the URL.
  if (filters.range !== 'all' && filters.range !== 'custom') return;
  const variables = buildLatestReportsVariables(filters);
  // Swallow here so a failed prefetch is never an unhandled rejection; the
  // consumer below re-observes the same promise and handles the rejection.
  const promise = requestLatestReports(variables);
  void promise.catch(() => {});
  pending = { key: variablesKey(variables), startedAt: Date.now(), promise };
}

/**
 * Hand the prefetched request to the first caller whose variables match it.
 *
 * Single use: once taken (or once a non-matching caller arrives) the prefetch is
 * cleared, so every later fetch — a page change, a Refresh — goes through the
 * hook's normal Apollo path.
 */
export function takePrefetchedLatestReports(
  variables: GetLatestReportsQueryVariables,
): Promise<GetLatestReportsQuery> | null {
  if (!pending) return null;
  const { key, startedAt, promise } = pending;
  pending = null;
  if (Date.now() - startedAt > PREFETCH_MAX_AGE_MS) return null;
  return key === variablesKey(variables) ? promise : null;
}

/** Test-only: drop any pending prefetch. */
export function resetLatestReportsPrefetchForTests(): void {
  pending = null;
}
