import { gql } from '@apollo/client';

/**
 * GraphQL for public ESO Logs shown on a user's profile page.
 *
 * The operation name MUST stay `getProfileUploadedReports` — the Cloudflare
 * Worker proxy whitelists requests by operation name (it routes via the
 * `?query=` URL param the Apollo link appends), and the canonical document
 * lives in `src/graphql/profile-logs.graphql` for codegen. Keep all three in
 * sync.
 *
 * This query routes through the client-credentials proxy, so only PUBLIC
 * reports are ever returned; the hook additionally filters on visibility.
 */
export const GET_PROFILE_UPLOADED_REPORTS = gql`
  query getProfileUploadedReports($userID: Int!, $limit: Int, $page: Int) {
    reportData {
      reports(userID: $userID, limit: $limit, page: $page) {
        data {
          ...ProfileReportSummary
        }
        total
        current_page
        per_page
        last_page
        has_more_pages
      }
    }
  }

  fragment ProfileReportSummary on Report {
    code
    title
    startTime
    endTime
    visibility
    zone {
      name
    }
    owner {
      id
      name
    }
  }
`;

/** A single report row as returned by {@link GET_PROFILE_UPLOADED_REPORTS}. */
export interface ProfileReportSummary {
  code: string;
  title: string;
  startTime: number;
  endTime: number;
  visibility: string;
  zone: { name: string } | null;
  owner: { id: number; name: string } | null;
}

export interface ProfileReportsPagination {
  data: (ProfileReportSummary | null)[] | null;
  total: number;
  current_page: number;
  per_page: number;
  last_page: number;
  has_more_pages: boolean;
}

export interface GetProfileUploadedReportsResult {
  reportData: {
    reports: ProfileReportsPagination | null;
  } | null;
}

export interface GetProfileUploadedReportsVariables {
  userID: number;
  limit?: number;
  page?: number;
}
