import { useCallback, useEffect, useState } from 'react';

import { useEsoLogsClientInstance } from '../../../EsoLogsClientContext';
import {
  GetLatestReportsDocument,
  GetLatestReportsQuery,
  GetLatestReportsQueryVariables,
  UserReportSummaryFragment,
} from '../../../graphql/gql/graphql';
import { partitionReportsByData } from '../../reports/reportFormatting';

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

  const fetchReports = useCallback(async (): Promise<void> => {
    setState((prev) => ({ ...prev, loading: true, error: null }));

    try {
      const variables = buildVariables({ page, zoneId, range, customFrom, customTo });
      const result = await client.query<GetLatestReportsQuery>({
        query: GetLatestReportsDocument,
        variables,
        errorPolicy: 'all',
      });

      const reportPagination = result.reportData?.reports;
      if (!reportPagination) {
        setState((prev) => ({
          ...prev,
          loading: false,
          error:
            'No reports data available. This may be due to authentication issues or API limitations.',
        }));
        return;
      }

      const fetched = (reportPagination.data ?? []).filter(
        (report): report is UserReportSummaryFragment => report !== null,
      );
      const { reportsWithData, emptyCount } = partitionReportsByData(fetched);

      const currentPage = reportPagination.current_page || 1;
      const lastPage = reportPagination.last_page;
      const hasMorePages = reportPagination.has_more_pages || false;
      const totalPages = lastPage > 0 ? lastPage : hasMorePages ? currentPage + 1 : currentPage;

      setState({
        reports: reportsWithData,
        hiddenEmptyCount: emptyCount,
        loading: false,
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
    } catch (error) {
      setState((prev) => ({
        ...prev,
        loading: false,
        error: error instanceof Error ? error.message : 'Failed to fetch latest reports',
      }));
    }
  }, [client, page, zoneId, range, customFrom, customTo]);

  useEffect(() => {
    void fetchReports();
  }, [fetchReports]);

  return { ...state, refetch: () => void fetchReports() };
}
