/* eslint-disable */
import * as Types from './generated';

import { gql } from '@apollo/client';
import { FightFragmentDoc } from './shared-fragments.generated';
import * as Apollo from '@apollo/client';
const defaultOptions = {} as const;

export const GetReportByCodeDocument = gql`
    query getReportByCode($code: String!) {
  reportData {
    report(code: $code) {
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
    }
  }
}
    ${FightFragmentDoc}`;

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
export function useGetReportByCodeQuery(baseOptions: Apollo.QueryHookOptions<Types.GetReportByCodeQuery, Types.GetReportByCodeQueryVariables> & ({ variables: Types.GetReportByCodeQueryVariables; skip?: boolean; } | { skip: boolean; }) ) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useQuery<Types.GetReportByCodeQuery, Types.GetReportByCodeQueryVariables>(GetReportByCodeDocument, options);
      }
export function useGetReportByCodeLazyQuery(baseOptions?: Apollo.LazyQueryHookOptions<Types.GetReportByCodeQuery, Types.GetReportByCodeQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return Apollo.useLazyQuery<Types.GetReportByCodeQuery, Types.GetReportByCodeQueryVariables>(GetReportByCodeDocument, options);
        }
export function useGetReportByCodeSuspenseQuery(baseOptions?: Apollo.SkipToken | Apollo.SuspenseQueryHookOptions<Types.GetReportByCodeQuery, Types.GetReportByCodeQueryVariables>) {
          const options = baseOptions === Apollo.skipToken ? baseOptions : {...defaultOptions, ...baseOptions}
          return Apollo.useSuspenseQuery<Types.GetReportByCodeQuery, Types.GetReportByCodeQueryVariables>(GetReportByCodeDocument, options);
        }
export type GetReportByCodeQueryHookResult = ReturnType<typeof useGetReportByCodeQuery>;
export type GetReportByCodeLazyQueryHookResult = ReturnType<typeof useGetReportByCodeLazyQuery>;
export type GetReportByCodeSuspenseQueryHookResult = ReturnType<typeof useGetReportByCodeSuspenseQuery>;
export type GetReportByCodeQueryResult = Apollo.QueryResult<Types.GetReportByCodeQuery, Types.GetReportByCodeQueryVariables>;