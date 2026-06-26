import { useCallback, useEffect, useRef, useState } from 'react';

import { useEsoLogsClientInstance } from '../../../EsoLogsClientContext';
import {
  GetLatestReportsDocument,
  GetLatestReportsQuery,
  GetLatestReportsQueryVariables,
  UserReportSummaryFragment,
} from '../../../graphql/gql/graphql';
import { selectReportsForDisplay } from '../../reports/reportFormatting';

import { rangeToEpochMs, type DateRangePreset } from './rangeToEpochMs';

export const REPORTS_PER_PAGE = 25;

export interface LatestReportsPagination {
  currentPage: number;
  totalPages: number;
  totalReports: number;
  perPage: number;
  hasMorePages: boolean;
  from: number | null;
  to: number | null;
}

export interface LatestReportsQueryState {
  /** Reports on the current page that contain combat data. */
  reports: UserReportSummaryFragment[];
  /** Count of reports on the current page hidden for having no combat data. */
  hiddenEmptyCount: number;
  loading: boolean;
  error: string | null;
  pagination: LatestReportsPagination;
}

export interface LatestReportsQueryInput {
  page: number;
  zoneId: number | null;
  range: DateRangePreset;
  customFrom: string | null;
  customTo: string | null;
}

const INITIAL_PAGINATION: LatestReportsPagination = {
  currentPage: 1,
  totalPages: 1,
  totalReports: 0,
  perPage: REPORTS_PER_PAGE,
  hasMorePages: false,
  from: null,
  to: null,
};

function buildVariables(input: LatestReportsQueryInput): GetLatestReportsQueryVariables {
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
 * Owns the server-side fetch for Latest Reports. Re-runs whenever the server
 * filter inputs (page/zone/date) change. Text search is deliberately NOT an
 * input here — it is a client-side refinement applied downstream, so typing in
 * the search box never triggers a network request.
 *
 * Page-reset-on-filter-change is handled upstream in the URL-state hook; this
 * hook simply fetches whatever (page, filters) it is given.
 */
export function useLatestReportsQuery(input: LatestReportsQueryInput): LatestReportsQueryState & {
  refetch: () => void;
} {
  const client = useEsoLogsClientInstance();
  const [state, setState] = useState<LatestReportsQueryState>({
    reports: [],
    hiddenEmptyCount: 0,
    loading: true,
    error: null,
    pagination: INITIAL_PAGINATION,
  });

  const { page, zoneId, range, customFrom, customTo } = input;

  // Identifies the latest fetch so a slower, superseded request (e.g. the page or
  // filters changed mid-flight) can't overwrite newer state — including the
  // two-step cache-only + network-only sequence below. Mirrors useLatestReport.
  const requestIdRef = useRef(0);

  // Map a GetLatestReports response into hook state. Returns false when the
  // payload carried no reports pagination — an empty cache-only read, or a
  // degraded response — so the caller can decide whether that is an error
  // (network read) or simply "nothing cached yet" (cache peek).
  const applyReportData = useCallback(
    (result: GetLatestReportsQuery, loading: boolean): boolean => {
      const reportPagination = result.reportData?.reports;
      if (!reportPagination) return false;

      // Keep the non-null narrowing on the query's own row type (which now also
      // carries `fights`) rather than the bare summary fragment, so the empty-log
      // partition below can read the authoritative fight count.
      const fetched = (reportPagination.data ?? []).filter(
        (report): report is NonNullable<typeof report> => report !== null,
      );
      // Hide empty (no-combat) logs, but never the whole page: if every report
      // the server returned would be hidden — e.g. a busy upload window where the
      // freshest page is dominated by still-parsing logs — fail open and show
      // them all so the user is never stranded on an "every report is empty" wall.
      const { reportsToShow, hiddenEmptyCount } = selectReportsForDisplay(fetched);

      const currentPage = reportPagination.current_page || 1;
      const lastPage = reportPagination.last_page;
      const hasMorePages = reportPagination.has_more_pages || false;
      const totalPages = lastPage > 0 ? lastPage : hasMorePages ? currentPage + 1 : currentPage;

      setState({
        reports: reportsToShow,
        hiddenEmptyCount,
        loading,
        error: null,
        pagination: {
          currentPage,
          totalPages,
          totalReports: reportPagination.total ?? 0,
          perPage: reportPagination.per_page || REPORTS_PER_PAGE,
          hasMorePages,
          from: reportPagination.from ?? null,
          to: reportPagination.to ?? null,
        },
      });
      return true;
    },
    [],
  );

  const fetchReports = useCallback(
    async (skipCachePeek = false): Promise<void> => {
      const requestId = ++requestIdRef.current;
      setState((prev) => ({ ...prev, loading: true, error: null }));

      const variables = buildVariables({ page, zoneId, range, customFrom, customTo });
      try {
        // cache-and-network, hand-composed: client.query() doesn't accept that
        // fetchPolicy, so on a normal load we first read the cache (cache-only
        // never touches the network) to paint an already-seen view instantly — no
        // skeleton flash, and the last-known list stays put if the network is slow
        // or down — and THEN always revalidate from the network below. That second
        // read is what matters for the empty-log UX: the freshest page is dominated
        // by just-uploaded logs still parsing on ESO Logs (segments: 0, fights: [])
        // that self-heal within minutes, so revalidating on every mount means a
        // healed log's stale "Empty" badge can never survive a re-visit (the prior
        // cache-first default re-served the old snapshot with no round-trip). The
        // cache stays warm because each network read writes back to it. An explicit
        // Refresh skips the peek — the list is already on screen — and just
        // revalidates.
        if (!skipCachePeek) {
          try {
            const cached = await client.query<GetLatestReportsQuery>({
              query: GetLatestReportsDocument,
              variables,
              errorPolicy: 'all',
              fetchPolicy: 'cache-only',
            });
            // Drop the peek if a newer load has superseded this one.
            if (requestId === requestIdRef.current) {
              applyReportData(cached, true); // keep loading: true; the network result follows
            }
          } catch {
            // Nothing usable in the cache yet — fall through to the network read.
          }
        }

        const fresh = await client.query<GetLatestReportsQuery>({
          query: GetLatestReportsDocument,
          variables,
          errorPolicy: 'all',
          fetchPolicy: 'network-only',
        });
        // The request-id guard keeps the DISPLAYED state from the newest load. A
        // superseded same-variable response can still write its (seconds-older)
        // snapshot into Apollo's shared cache before this check — but that is within
        // cache-and-network's tolerance: the only effect is a future cache-only peek
        // briefly showing that snapshot, which the same mount's network read then
        // corrects. We intentionally don't use no-cache here (that would leave the
        // peek with nothing to paint) or hand-roll abort/writeQuery for it.
        if (requestId !== requestIdRef.current) return; // superseded by a newer load
        if (!applyReportData(fresh, false)) {
          setState((prev) => ({
            ...prev,
            loading: false,
            error:
              'No reports data available. This may be due to authentication issues or API limitations.',
          }));
        }
      } catch (error) {
        if (requestId !== requestIdRef.current) return; // superseded by a newer load
        // Keep whatever is already shown (e.g. the cache peek) and surface the
        // error rather than blanking the list.
        setState((prev) => ({
          ...prev,
          loading: false,
          error: error instanceof Error ? error.message : 'Failed to fetch latest reports',
        }));
      }
    },
    [client, page, zoneId, range, customFrom, customTo, applyReportData],
  );

  useEffect(() => {
    // Mount + page/zone/date changes: peek the cache for an instant paint, then
    // revalidate from the network (see fetchReports).
    void fetchReports();
  }, [fetchReports]);

  // Refresh just revalidates from the network — the list is already on screen, so
  // there is no cache to peek, and this is what clears a healed log's stale badge.
  return { ...state, refetch: () => void fetchReports(true) };
}
