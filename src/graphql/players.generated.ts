/* eslint-disable */
import * as Types from './generated';

import { gql } from '@apollo/client';
import { CharacterFragmentDoc } from './shared-fragments.generated';
import * as Apollo from '@apollo/client';
const defaultOptions = {} as const;

export const GetCharactersForReportDocument = gql`
  query getCharactersForReport($code: String!) {
    reportData {
      report(code: $code) {
        rankedCharacters {
          ...Character
        }
      }
    }
  }
  ${CharacterFragmentDoc}
`;

/**
 * __useGetCharactersForReportQuery__
 *
 * To run a query within a React component, call `useGetCharactersForReportQuery` and pass it any options that fit your needs.
 * When your component renders, `useGetCharactersForReportQuery` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the query, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useGetCharactersForReportQuery({
 *   variables: {
 *      code: // value for 'code'
 *   },
 * });
 */
export function useGetCharactersForReportQuery(
  baseOptions: Apollo.QueryHookOptions<
    Types.GetCharactersForReportQuery,
    Types.GetCharactersForReportQueryVariables
  > &
    ({ variables: Types.GetCharactersForReportQueryVariables; skip?: boolean } | { skip: boolean })
) {
  const options = { ...defaultOptions, ...baseOptions };
  return Apollo.useQuery<
    Types.GetCharactersForReportQuery,
    Types.GetCharactersForReportQueryVariables
  >(GetCharactersForReportDocument, options);
}
export function useGetCharactersForReportLazyQuery(
  baseOptions?: Apollo.LazyQueryHookOptions<
    Types.GetCharactersForReportQuery,
    Types.GetCharactersForReportQueryVariables
  >
) {
  const options = { ...defaultOptions, ...baseOptions };
  return Apollo.useLazyQuery<
    Types.GetCharactersForReportQuery,
    Types.GetCharactersForReportQueryVariables
  >(GetCharactersForReportDocument, options);
}
export function useGetCharactersForReportSuspenseQuery(
  baseOptions?:
    | Apollo.SkipToken
    | Apollo.SuspenseQueryHookOptions<
        Types.GetCharactersForReportQuery,
        Types.GetCharactersForReportQueryVariables
      >
) {
  const options =
    baseOptions === Apollo.skipToken ? baseOptions : { ...defaultOptions, ...baseOptions };
  return Apollo.useSuspenseQuery<
    Types.GetCharactersForReportQuery,
    Types.GetCharactersForReportQueryVariables
  >(GetCharactersForReportDocument, options);
}
export type GetCharactersForReportQueryHookResult = ReturnType<
  typeof useGetCharactersForReportQuery
>;
export type GetCharactersForReportLazyQueryHookResult = ReturnType<
  typeof useGetCharactersForReportLazyQuery
>;
export type GetCharactersForReportSuspenseQueryHookResult = ReturnType<
  typeof useGetCharactersForReportSuspenseQuery
>;
export type GetCharactersForReportQueryResult = Apollo.QueryResult<
  Types.GetCharactersForReportQuery,
  Types.GetCharactersForReportQueryVariables
>;
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
export function useGetPlayersForReportQuery(
  baseOptions: Apollo.QueryHookOptions<
    Types.GetPlayersForReportQuery,
    Types.GetPlayersForReportQueryVariables
  > &
    ({ variables: Types.GetPlayersForReportQueryVariables; skip?: boolean } | { skip: boolean })
) {
  const options = { ...defaultOptions, ...baseOptions };
  return Apollo.useQuery<Types.GetPlayersForReportQuery, Types.GetPlayersForReportQueryVariables>(
    GetPlayersForReportDocument,
    options
  );
}
export function useGetPlayersForReportLazyQuery(
  baseOptions?: Apollo.LazyQueryHookOptions<
    Types.GetPlayersForReportQuery,
    Types.GetPlayersForReportQueryVariables
  >
) {
  const options = { ...defaultOptions, ...baseOptions };
  return Apollo.useLazyQuery<
    Types.GetPlayersForReportQuery,
    Types.GetPlayersForReportQueryVariables
  >(GetPlayersForReportDocument, options);
}
export function useGetPlayersForReportSuspenseQuery(
  baseOptions?:
    | Apollo.SkipToken
    | Apollo.SuspenseQueryHookOptions<
        Types.GetPlayersForReportQuery,
        Types.GetPlayersForReportQueryVariables
      >
) {
  const options =
    baseOptions === Apollo.skipToken ? baseOptions : { ...defaultOptions, ...baseOptions };
  return Apollo.useSuspenseQuery<
    Types.GetPlayersForReportQuery,
    Types.GetPlayersForReportQueryVariables
  >(GetPlayersForReportDocument, options);
}
export type GetPlayersForReportQueryHookResult = ReturnType<typeof useGetPlayersForReportQuery>;
export type GetPlayersForReportLazyQueryHookResult = ReturnType<
  typeof useGetPlayersForReportLazyQuery
>;
export type GetPlayersForReportSuspenseQueryHookResult = ReturnType<
  typeof useGetPlayersForReportSuspenseQuery
>;
export type GetPlayersForReportQueryResult = Apollo.QueryResult<
  Types.GetPlayersForReportQuery,
  Types.GetPlayersForReportQueryVariables
>;
