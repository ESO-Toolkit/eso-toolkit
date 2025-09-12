/* eslint-disable */
import * as Types from './generated';

import { gql } from '@apollo/client';
import * as Apollo from '@apollo/client';
const defaultOptions = {} as const;

export const GetEncounterInfoDocument = gql`
  query getEncounterInfo($encounterId: Int!) {
    worldData {
      encounter(id: $encounterId) {
        id
        name
        zone {
          id
          name
          encounters {
            id
            name
          }
          difficulties {
            id
            name
            sizes
          }
        }
      }
    }
  }
`;

/**
 * __useGetEncounterInfoQuery__
 *
 * To run a query within a React component, call `useGetEncounterInfoQuery` and pass it any options that fit your needs.
 * When your component renders, `useGetEncounterInfoQuery` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the query, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useGetEncounterInfoQuery({
 *   variables: {
 *      encounterId: // value for 'encounterId'
 *   },
 * });
 */
export function useGetEncounterInfoQuery(
  baseOptions: Apollo.QueryHookOptions<
    Types.GetEncounterInfoQuery,
    Types.GetEncounterInfoQueryVariables
  > &
    ({ variables: Types.GetEncounterInfoQueryVariables; skip?: boolean } | { skip: boolean }),
) {
  const options = { ...defaultOptions, ...baseOptions };
  return Apollo.useQuery<Types.GetEncounterInfoQuery, Types.GetEncounterInfoQueryVariables>(
    GetEncounterInfoDocument,
    options,
  );
}
export function useGetEncounterInfoLazyQuery(
  baseOptions?: Apollo.LazyQueryHookOptions<
    Types.GetEncounterInfoQuery,
    Types.GetEncounterInfoQueryVariables
  >,
) {
  const options = { ...defaultOptions, ...baseOptions };
  return Apollo.useLazyQuery<Types.GetEncounterInfoQuery, Types.GetEncounterInfoQueryVariables>(
    GetEncounterInfoDocument,
    options,
  );
}
export function useGetEncounterInfoSuspenseQuery(
  baseOptions?:
    | Apollo.SkipToken
    | Apollo.SuspenseQueryHookOptions<
        Types.GetEncounterInfoQuery,
        Types.GetEncounterInfoQueryVariables
      >,
) {
  const options =
    baseOptions === Apollo.skipToken ? baseOptions : { ...defaultOptions, ...baseOptions };
  return Apollo.useSuspenseQuery<Types.GetEncounterInfoQuery, Types.GetEncounterInfoQueryVariables>(
    GetEncounterInfoDocument,
    options,
  );
}
export type GetEncounterInfoQueryHookResult = ReturnType<typeof useGetEncounterInfoQuery>;
export type GetEncounterInfoLazyQueryHookResult = ReturnType<typeof useGetEncounterInfoLazyQuery>;
export type GetEncounterInfoSuspenseQueryHookResult = ReturnType<
  typeof useGetEncounterInfoSuspenseQuery
>;
export type GetEncounterInfoQueryResult = Apollo.QueryResult<
  Types.GetEncounterInfoQuery,
  Types.GetEncounterInfoQueryVariables
>;
