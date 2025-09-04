/* eslint-disable */
import * as Types from './generated';

import { gql } from '@apollo/client';
import { ReportActorFragmentDoc } from './shared-fragments.generated';
import * as Apollo from '@apollo/client';
const defaultOptions = {} as const;
export const ReportAbilityFragmentDoc = gql`
  fragment ReportAbility on ReportAbility {
    gameID
    icon
    name
    type
  }
`;
export const MasterDataFragmentDoc = gql`
  fragment MasterData on ReportMasterData {
    abilities {
      ...ReportAbility
    }
    actors {
      ...ReportActor
    }
  }
  ${ReportAbilityFragmentDoc}
  ${ReportActorFragmentDoc}
`;
export const GetReportMasterDataDocument = gql`
  query getReportMasterData($code: String!) {
    reportData {
      report(code: $code) {
        masterData {
          ...MasterData
        }
      }
    }
  }
  ${MasterDataFragmentDoc}
`;

/**
 * __useGetReportMasterDataQuery__
 *
 * To run a query within a React component, call `useGetReportMasterDataQuery` and pass it any options that fit your needs.
 * When your component renders, `useGetReportMasterDataQuery` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the query, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useGetReportMasterDataQuery({
 *   variables: {
 *      code: // value for 'code'
 *   },
 * });
 */
export function useGetReportMasterDataQuery(
  baseOptions: Apollo.QueryHookOptions<
    Types.GetReportMasterDataQuery,
    Types.GetReportMasterDataQueryVariables
  > &
    ({ variables: Types.GetReportMasterDataQueryVariables; skip?: boolean } | { skip: boolean }),
) {
  const options = { ...defaultOptions, ...baseOptions };
  return Apollo.useQuery<Types.GetReportMasterDataQuery, Types.GetReportMasterDataQueryVariables>(
    GetReportMasterDataDocument,
    options,
  );
}
export function useGetReportMasterDataLazyQuery(
  baseOptions?: Apollo.LazyQueryHookOptions<
    Types.GetReportMasterDataQuery,
    Types.GetReportMasterDataQueryVariables
  >,
) {
  const options = { ...defaultOptions, ...baseOptions };
  return Apollo.useLazyQuery<
    Types.GetReportMasterDataQuery,
    Types.GetReportMasterDataQueryVariables
  >(GetReportMasterDataDocument, options);
}
export function useGetReportMasterDataSuspenseQuery(
  baseOptions?:
    | Apollo.SkipToken
    | Apollo.SuspenseQueryHookOptions<
        Types.GetReportMasterDataQuery,
        Types.GetReportMasterDataQueryVariables
      >,
) {
  const options =
    baseOptions === Apollo.skipToken ? baseOptions : { ...defaultOptions, ...baseOptions };
  return Apollo.useSuspenseQuery<
    Types.GetReportMasterDataQuery,
    Types.GetReportMasterDataQueryVariables
  >(GetReportMasterDataDocument, options);
}
export type GetReportMasterDataQueryHookResult = ReturnType<typeof useGetReportMasterDataQuery>;
export type GetReportMasterDataLazyQueryHookResult = ReturnType<
  typeof useGetReportMasterDataLazyQuery
>;
export type GetReportMasterDataSuspenseQueryHookResult = ReturnType<
  typeof useGetReportMasterDataSuspenseQuery
>;
export type GetReportMasterDataQueryResult = Apollo.QueryResult<
  Types.GetReportMasterDataQuery,
  Types.GetReportMasterDataQueryVariables
>;
