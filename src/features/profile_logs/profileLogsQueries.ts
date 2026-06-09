import { gql } from '@apollo/client';

/**
 * GraphQL for public ESO Logs shown on a user's profile page.
 *
 * This inline `gql` document is the single source of truth (the same pattern as
 * `userReportsQueries.ts` — there is no `.graphql`/codegen counterpart). The
 * operation name MUST stay `getProfileUploadedReports`: the Cloudflare Worker
 * proxy whitelists requests by operation name, matched against the `?query=`
 * URL param the Apollo link appends.
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
    segments
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
  /** Number of uploaded log segments; 0 means the log contains no data. */
  segments: number;
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
