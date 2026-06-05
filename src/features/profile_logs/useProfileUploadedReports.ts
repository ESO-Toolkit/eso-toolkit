import { useCallback, useEffect, useRef, useState } from 'react';

import { useLogger } from '../../contexts/LoggerContext';
import { useEsoLogsClientContext } from '../../EsoLogsClientContext';

import {
  GET_PROFILE_UPLOADED_REPORTS,
  type GetProfileUploadedReportsResult,
  type GetProfileUploadedReportsVariables,
  type ProfileReportSummary,
} from './profileLogsQueries';

const PAGE_SIZE = 12;

/**
 * Parses a profile's `eso_logs_user_id` (the stringified ESO Logs numeric user
 * ID, == author_id) into a valid `userID` argument, or null when it is missing
 * or non-numeric.
 *
 * `author_id` is usually numeric, but some rows use synthetic ids (e.g. the
 * leaderboard's `system:eso-1`). `Number('system:eso-1')` is `NaN` and
 * `Number('')` is `0`; both are invalid as an ESO Logs `userID: Int!`, so we
 * reject anything that is not a positive integer.
 */
export function parseEsoLogsUserId(raw: string | null | undefined): number | null {
  if (raw == null || raw === '') return null;
  const n = Number(raw);
  return Number.isInteger(n) && n > 0 ? n : null;
}

export interface UseProfileUploadedReportsResult {
  /** Public reports the user uploaded, accumulated across loaded pages. */
  reports: ProfileReportSummary[];
  /** Total public+private count reported by the API for the first page. */
  total: number;
  loading: boolean;
  /** True while a "load more" page (beyond the first) is in flight. */
  loadingMore: boolean;
  error: string | null;
  hasMore: boolean;
  loadMore: () => void;
  /** Reloads the first page from scratch (used to retry after an error). */
  reload: () => void;
  /** True when there is no usable ESO Logs user id to query. */
  unavailable: boolean;
}

/**
 * Fetches the PUBLIC reports a user uploaded to ESO Logs, keyed by their numeric
 * ESO Logs user id. Routes through the client-credentials Worker proxy (no login
 * required), which only ever returns public reports; we additionally filter on
 * `visibility === 'public'` as defence-in-depth.
 */
export function useProfileUploadedReports(
  esoLogsUserId: string | null | undefined,
): UseProfileUploadedReportsResult {
  const { client, isReady } = useEsoLogsClientContext();
  const logger = useLogger('ProfileLogs');

  const userId = parseEsoLogsUserId(esoLogsUserId);
  const unavailable = userId === null;

  const [reports, setReports] = useState<ProfileReportSummary[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Guards against state updates after unmount or after the keyed user changes.
  const requestSeq = useRef(0);

  const fetchPage = useCallback(
    async (targetPage: number) => {
      if (userId === null || !client) return;

      const seq = ++requestSeq.current;
      if (targetPage === 1) {
        setLoading(true);
        setError(null);
      } else {
        setLoadingMore(true);
      }

      try {
        const result = await client.query<
          GetProfileUploadedReportsResult,
          GetProfileUploadedReportsVariables
        >({
          query: GET_PROFILE_UPLOADED_REPORTS,
          variables: { userID: userId, limit: PAGE_SIZE, page: targetPage },
          fetchPolicy: 'network-only',
        });

        if (seq !== requestSeq.current) return; // superseded

        const pagination = result.reportData?.reports;
        const pageReports = (pagination?.data ?? []).filter(
          (r): r is ProfileReportSummary => r != null && r.visibility === 'public',
        );

        setReports((prev) => {
          if (targetPage === 1) return pageReports;
          // De-dupe by code in case pages overlap.
          const seen = new Set(prev.map((r) => r.code));
          return [...prev, ...pageReports.filter((r) => !seen.has(r.code))];
        });
        setTotal(pagination?.total ?? pageReports.length);
        setHasMore(Boolean(pagination?.has_more_pages));
        setPage(targetPage);
      } catch (err) {
        if (seq !== requestSeq.current) return;
        logger.error(
          'Failed to load profile uploaded reports',
          err instanceof Error ? err : new Error(String(err)),
        );
        if (targetPage === 1) {
          setReports([]);
          setTotal(0);
          setHasMore(false);
        }
        setError('Could not load logs right now. Please try again later.');
      } finally {
        if (seq === requestSeq.current) {
          setLoading(false);
          setLoadingMore(false);
        }
      }
    },
    [client, userId, logger],
  );

  // (Re)load the first page whenever the keyed user becomes available.
  useEffect(() => {
    if (userId === null || !isReady || !client) {
      requestSeq.current++; // cancel any in-flight request
      setReports([]);
      setTotal(0);
      setPage(1);
      setHasMore(false);
      setLoading(false);
      setLoadingMore(false);
      setError(null);
      return;
    }
    void fetchPage(1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId, isReady, client]);

  const loadMore = useCallback(() => {
    if (loading || loadingMore || !hasMore) return;
    void fetchPage(page + 1);
  }, [loading, loadingMore, hasMore, page, fetchPage]);

  const reload = useCallback(() => {
    if (loading) return;
    void fetchPage(1);
  }, [loading, fetchPage]);

  return {
    reports,
    total,
    loading,
    loadingMore,
    error,
    hasMore,
    loadMore,
    reload,
    unavailable,
  };
}
