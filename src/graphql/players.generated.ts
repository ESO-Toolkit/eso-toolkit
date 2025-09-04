/* eslint-disable */
import * as Types from './generated';

import { gql } from '@apollo/client';
import * as Apollo from '@apollo/client';
const defaultOptions = {} as const;

export const GetPlayersForReportDocument = gql`
    query getPlayersForReport($code: String!, $fightIDs: [Int]) {
  reportData {
    report(code: $code) {
      playerDetails(includeCombatantInfo: true, fightIDs: $fightIDs)
    }
  }
}
    `;

/**
 * __useGetPlayersForReportQuery__
 *
 * To run a query within a React component, call `useGetPlayersForReportQuery` and pass it any options that fit your needs.
 * When your component renders, `useGetPlayersForReportQuery` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the query, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useGetPlayersForReportQuery({
 *   variables: {
 *      code: // value for 'code'
 *      fightIDs: // value for 'fightIDs'
 *   },
 * });
 */
export function useGetPlayersForReportQuery(baseOptions: Apollo.QueryHookOptions<Types.GetPlayersForReportQuery, Types.GetPlayersForReportQueryVariables> & ({ variables: Types.GetPlayersForReportQueryVariables; skip?: boolean; } | { skip: boolean; }) ) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useQuery<Types.GetPlayersForReportQuery, Types.GetPlayersForReportQueryVariables>(GetPlayersForReportDocument, options);
      }
export function useGetPlayersForReportLazyQuery(baseOptions?: Apollo.LazyQueryHookOptions<Types.GetPlayersForReportQuery, Types.GetPlayersForReportQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return Apollo.useLazyQuery<Types.GetPlayersForReportQuery, Types.GetPlayersForReportQueryVariables>(GetPlayersForReportDocument, options);
        }
export function useGetPlayersForReportSuspenseQuery(baseOptions?: Apollo.SkipToken | Apollo.SuspenseQueryHookOptions<Types.GetPlayersForReportQuery, Types.GetPlayersForReportQueryVariables>) {
          const options = baseOptions === Apollo.skipToken ? baseOptions : {...defaultOptions, ...baseOptions}
          return Apollo.useSuspenseQuery<Types.GetPlayersForReportQuery, Types.GetPlayersForReportQueryVariables>(GetPlayersForReportDocument, options);
        }
export type GetPlayersForReportQueryHookResult = ReturnType<typeof useGetPlayersForReportQuery>;
export type GetPlayersForReportLazyQueryHookResult = ReturnType<typeof useGetPlayersForReportLazyQuery>;
export type GetPlayersForReportSuspenseQueryHookResult = ReturnType<typeof useGetPlayersForReportSuspenseQuery>;
export type GetPlayersForReportQueryResult = Apollo.QueryResult<Types.GetPlayersForReportQuery, Types.GetPlayersForReportQueryVariables>;