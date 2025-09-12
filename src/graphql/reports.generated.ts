/* eslint-disable */
import * as Types from './generated';

import { gql } from '@apollo/client';
import { FightFragmentDoc } from './shared-fragments.generated';
import * as Apollo from '@apollo/client';
const defaultOptions = {} as const;
export const ReportFragmentDoc = gql`
  fragment Report on Report {
    code
    startTime
    endTime
    title
    visibility
    zone {
      name
    }
    fights {
      ...Fight
    }
    phases {
      encounterID
      separatesWipes
      phases {
        id
        name
        isIntermission
      }
    }
  }
  ${FightFragmentDoc}
`;
export const UserReportSummaryFragmentDoc = gql`
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
export const GetReportByCodeDocument = gql`
  query getReportByCode($code: String!) {
    reportData {
      report(code: $code) {
        ...Report
      }
    }
  }
  ${ReportFragmentDoc}
`;

/**
 * __useGetReportByCodeQuery__
 *
 * To run a query within a React component, call `useGetReportByCodeQuery` and pass it any options that fit your needs.
 * When your component renders, `useGetReportByCodeQuery` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the query, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useGetReportByCodeQuery({
 *   variables: {
 *      code: // value for 'code'
 *   },
 * });
 */
export function useGetReportByCodeQuery(
  baseOptions: Apollo.QueryHookOptions<
    Types.GetReportByCodeQuery,
    Types.GetReportByCodeQueryVariables
  > &
    ({ variables: Types.GetReportByCodeQueryVariables; skip?: boolean } | { skip: boolean }),
) {
  const options = { ...defaultOptions, ...baseOptions };
  return Apollo.useQuery<Types.GetReportByCodeQuery, Types.GetReportByCodeQueryVariables>(
    GetReportByCodeDocument,
    options,
  );
}
export function useGetReportByCodeLazyQuery(
  baseOptions?: Apollo.LazyQueryHookOptions<
    Types.GetReportByCodeQuery,
    Types.GetReportByCodeQueryVariables
  >,
) {
  const options = { ...defaultOptions, ...baseOptions };
  return Apollo.useLazyQuery<Types.GetReportByCodeQuery, Types.GetReportByCodeQueryVariables>(
    GetReportByCodeDocument,
    options,
  );
}
export function useGetReportByCodeSuspenseQuery(
  baseOptions?:
    | Apollo.SkipToken
    | Apollo.SuspenseQueryHookOptions<
        Types.GetReportByCodeQuery,
        Types.GetReportByCodeQueryVariables
      >,
) {
  const options =
    baseOptions === Apollo.skipToken ? baseOptions : { ...defaultOptions, ...baseOptions };
  return Apollo.useSuspenseQuery<Types.GetReportByCodeQuery, Types.GetReportByCodeQueryVariables>(
    GetReportByCodeDocument,
    options,
  );
}
export type GetReportByCodeQueryHookResult = ReturnType<typeof useGetReportByCodeQuery>;
export type GetReportByCodeLazyQueryHookResult = ReturnType<typeof useGetReportByCodeLazyQuery>;
export type GetReportByCodeSuspenseQueryHookResult = ReturnType<
  typeof useGetReportByCodeSuspenseQuery
>;
export type GetReportByCodeQueryResult = Apollo.QueryResult<
  Types.GetReportByCodeQuery,
  Types.GetReportByCodeQueryVariables
>;
export const GetCurrentUserDocument = gql`
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

/**
 * __useGetCurrentUserQuery__
 *
 * To run a query within a React component, call `useGetCurrentUserQuery` and pass it any options that fit your needs.
 * When your component renders, `useGetCurrentUserQuery` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the query, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useGetCurrentUserQuery({
 *   variables: {
 *   },
 * });
 */
export function useGetCurrentUserQuery(
  baseOptions?: Apollo.QueryHookOptions<
    Types.GetCurrentUserQuery,
    Types.GetCurrentUserQueryVariables
  >,
) {
  const options = { ...defaultOptions, ...baseOptions };
  return Apollo.useQuery<Types.GetCurrentUserQuery, Types.GetCurrentUserQueryVariables>(
    GetCurrentUserDocument,
    options,
  );
}
export function useGetCurrentUserLazyQuery(
  baseOptions?: Apollo.LazyQueryHookOptions<
    Types.GetCurrentUserQuery,
    Types.GetCurrentUserQueryVariables
  >,
) {
  const options = { ...defaultOptions, ...baseOptions };
  return Apollo.useLazyQuery<Types.GetCurrentUserQuery, Types.GetCurrentUserQueryVariables>(
    GetCurrentUserDocument,
    options,
  );
}
export function useGetCurrentUserSuspenseQuery(
  baseOptions?:
    | Apollo.SkipToken
    | Apollo.SuspenseQueryHookOptions<
        Types.GetCurrentUserQuery,
        Types.GetCurrentUserQueryVariables
      >,
) {
  const options =
    baseOptions === Apollo.skipToken ? baseOptions : { ...defaultOptions, ...baseOptions };
  return Apollo.useSuspenseQuery<Types.GetCurrentUserQuery, Types.GetCurrentUserQueryVariables>(
    GetCurrentUserDocument,
    options,
  );
}
export type GetCurrentUserQueryHookResult = ReturnType<typeof useGetCurrentUserQuery>;
export type GetCurrentUserLazyQueryHookResult = ReturnType<typeof useGetCurrentUserLazyQuery>;
export type GetCurrentUserSuspenseQueryHookResult = ReturnType<
  typeof useGetCurrentUserSuspenseQuery
>;
export type GetCurrentUserQueryResult = Apollo.QueryResult<
  Types.GetCurrentUserQuery,
  Types.GetCurrentUserQueryVariables
>;
export const GetUserReportsDocument = gql`
  query getUserReports($limit: Int, $page: Int, $userID: Int) {
    reportData {
      reports(limit: $limit, page: $page, userID: $userID) {
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
  ${UserReportSummaryFragmentDoc}
`;

/**
 * __useGetUserReportsQuery__
 *
 * To run a query within a React component, call `useGetUserReportsQuery` and pass it any options that fit your needs.
 * When your component renders, `useGetUserReportsQuery` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the query, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useGetUserReportsQuery({
 *   variables: {
 *      limit: // value for 'limit'
 *      page: // value for 'page'
 *      userID: // value for 'userID'
 *   },
 * });
 */
export function useGetUserReportsQuery(
  baseOptions?: Apollo.QueryHookOptions<
    Types.GetUserReportsQuery,
    Types.GetUserReportsQueryVariables
  >,
) {
  const options = { ...defaultOptions, ...baseOptions };
  return Apollo.useQuery<Types.GetUserReportsQuery, Types.GetUserReportsQueryVariables>(
    GetUserReportsDocument,
    options,
  );
}
export function useGetUserReportsLazyQuery(
  baseOptions?: Apollo.LazyQueryHookOptions<
    Types.GetUserReportsQuery,
    Types.GetUserReportsQueryVariables
  >,
) {
  const options = { ...defaultOptions, ...baseOptions };
  return Apollo.useLazyQuery<Types.GetUserReportsQuery, Types.GetUserReportsQueryVariables>(
    GetUserReportsDocument,
    options,
  );
}
export function useGetUserReportsSuspenseQuery(
  baseOptions?:
    | Apollo.SkipToken
    | Apollo.SuspenseQueryHookOptions<
        Types.GetUserReportsQuery,
        Types.GetUserReportsQueryVariables
      >,
) {
  const options =
    baseOptions === Apollo.skipToken ? baseOptions : { ...defaultOptions, ...baseOptions };
  return Apollo.useSuspenseQuery<Types.GetUserReportsQuery, Types.GetUserReportsQueryVariables>(
    GetUserReportsDocument,
    options,
  );
}
export type GetUserReportsQueryHookResult = ReturnType<typeof useGetUserReportsQuery>;
export type GetUserReportsLazyQueryHookResult = ReturnType<typeof useGetUserReportsLazyQuery>;
export type GetUserReportsSuspenseQueryHookResult = ReturnType<
  typeof useGetUserReportsSuspenseQuery
>;
export type GetUserReportsQueryResult = Apollo.QueryResult<
  Types.GetUserReportsQuery,
  Types.GetUserReportsQueryVariables
>;
export const GetLatestReportsDocument = gql`
  query getLatestReports($limit: Int, $page: Int) {
    reportData {
      reports(limit: $limit, page: $page) {
        data {
          ...UserReportSummary
        }
        current_page
        per_page
        last_page
        has_more_pages
      }
    }
  }
  ${UserReportSummaryFragmentDoc}
`;

/**
 * __useGetLatestReportsQuery__
 *
 * To run a query within a React component, call `useGetLatestReportsQuery` and pass it any options that fit your needs.
 * When your component renders, `useGetLatestReportsQuery` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the query, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useGetLatestReportsQuery({
 *   variables: {
 *      limit: // value for 'limit'
 *      page: // value for 'page'
 *   },
 * });
 */
export function useGetLatestReportsQuery(
  baseOptions?: Apollo.QueryHookOptions<
    Types.GetLatestReportsQuery,
    Types.GetLatestReportsQueryVariables
  >,
) {
  const options = { ...defaultOptions, ...baseOptions };
  return Apollo.useQuery<Types.GetLatestReportsQuery, Types.GetLatestReportsQueryVariables>(
    GetLatestReportsDocument,
    options,
  );
}
export function useGetLatestReportsLazyQuery(
  baseOptions?: Apollo.LazyQueryHookOptions<
    Types.GetLatestReportsQuery,
    Types.GetLatestReportsQueryVariables
  >,
) {
  const options = { ...defaultOptions, ...baseOptions };
  return Apollo.useLazyQuery<Types.GetLatestReportsQuery, Types.GetLatestReportsQueryVariables>(
    GetLatestReportsDocument,
    options,
  );
}
export function useGetLatestReportsSuspenseQuery(
  baseOptions?:
    | Apollo.SkipToken
    | Apollo.SuspenseQueryHookOptions<
        Types.GetLatestReportsQuery,
        Types.GetLatestReportsQueryVariables
      >,
) {
  const options =
    baseOptions === Apollo.skipToken ? baseOptions : { ...defaultOptions, ...baseOptions };
  return Apollo.useSuspenseQuery<Types.GetLatestReportsQuery, Types.GetLatestReportsQueryVariables>(
    GetLatestReportsDocument,
    options,
  );
}
export type GetLatestReportsQueryHookResult = ReturnType<typeof useGetLatestReportsQuery>;
export type GetLatestReportsLazyQueryHookResult = ReturnType<typeof useGetLatestReportsLazyQuery>;
export type GetLatestReportsSuspenseQueryHookResult = ReturnType<
  typeof useGetLatestReportsSuspenseQuery
>;
export type GetLatestReportsQueryResult = Apollo.QueryResult<
  Types.GetLatestReportsQuery,
  Types.GetLatestReportsQueryVariables
>;
