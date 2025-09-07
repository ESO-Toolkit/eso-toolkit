import { gql } from '@apollo/client';

export const GET_CURRENT_USER = gql`
  query getCurrentUser {
    userData {
      currentUser {
        id
        name
        naDisplayName
        euDisplayName
      }
    }
  }
`;

export const GET_USER_REPORTS = gql`
  query getUserReports($limit: Int, $page: Int) {
    reportData {
      reports(limit: $limit, page: $page) {
        data {
          ...UserReportSummary
        }
        total
        current_page
        per_page
        last_page
        has_more_pages
      }
    }
  }

  fragment UserReportSummary on Report {
    code
    startTime
    endTime
    title
    visibility
    zone {
      name
    }
    owner {
      name
    }
  }
`;
