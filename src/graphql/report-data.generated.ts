/* eslint-disable */
import * as Types from './generated';

import { gql } from '@apollo/client';
import * as Apollo from '@apollo/client';
const defaultOptions = {} as const;
export const FightFragmentDoc = gql`
    fragment Fight on ReportFight {
  id
  name
  difficulty
  startTime
  endTime
}
    `;
export const CharacterFragmentDoc = gql`
    fragment Character on Character {
  id
  name
  displayName
  classID
}
    `;
export const EventFragmentDoc = gql`
    fragment Event on ReportEventPaginator {
  data
  nextPageTimestamp
}
    `;
export const ReportAbilityFragmentDoc = gql`
    fragment ReportAbility on ReportAbility {
  gameID
  icon
  name
  type
}
    `;
export const ReportActorFragmentDoc = gql`
    fragment ReportActor on ReportActor {
  displayName
  gameID
  icon
  id
  name
  server
  subType
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
${ReportActorFragmentDoc}`;
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
    ${CharacterFragmentDoc}`;

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
export function useGetCharactersForReportQuery(baseOptions: Apollo.QueryHookOptions<Types.GetCharactersForReportQuery, Types.GetCharactersForReportQueryVariables> & ({ variables: Types.GetCharactersForReportQueryVariables; skip?: boolean; } | { skip: boolean; }) ) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useQuery<Types.GetCharactersForReportQuery, Types.GetCharactersForReportQueryVariables>(GetCharactersForReportDocument, options);
      }
export function useGetCharactersForReportLazyQuery(baseOptions?: Apollo.LazyQueryHookOptions<Types.GetCharactersForReportQuery, Types.GetCharactersForReportQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return Apollo.useLazyQuery<Types.GetCharactersForReportQuery, Types.GetCharactersForReportQueryVariables>(GetCharactersForReportDocument, options);
        }
export function useGetCharactersForReportSuspenseQuery(baseOptions?: Apollo.SkipToken | Apollo.SuspenseQueryHookOptions<Types.GetCharactersForReportQuery, Types.GetCharactersForReportQueryVariables>) {
          const options = baseOptions === Apollo.skipToken ? baseOptions : {...defaultOptions, ...baseOptions}
          return Apollo.useSuspenseQuery<Types.GetCharactersForReportQuery, Types.GetCharactersForReportQueryVariables>(GetCharactersForReportDocument, options);
        }
export type GetCharactersForReportQueryHookResult = ReturnType<typeof useGetCharactersForReportQuery>;
export type GetCharactersForReportLazyQueryHookResult = ReturnType<typeof useGetCharactersForReportLazyQuery>;
export type GetCharactersForReportSuspenseQueryHookResult = ReturnType<typeof useGetCharactersForReportSuspenseQuery>;
export type GetCharactersForReportQueryResult = Apollo.QueryResult<Types.GetCharactersForReportQuery, Types.GetCharactersForReportQueryVariables>;
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
export const GetReportEventsDocument = gql`
    query getReportEvents($code: String!, $startTime: Float, $endTime: Float, $fightIds: [Int]!) {
  reportData {
    report(code: $code) {
      events(
        startTime: $startTime
        endTime: $endTime
        fightIDs: $fightIds
        useActorIDs: true
        includeResources: true
        limit: 100000000
      ) {
        ...Event
      }
    }
  }
}
    ${EventFragmentDoc}`;

/**
 * __useGetReportEventsQuery__
 *
 * To run a query within a React component, call `useGetReportEventsQuery` and pass it any options that fit your needs.
 * When your component renders, `useGetReportEventsQuery` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the query, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useGetReportEventsQuery({
 *   variables: {
 *      code: // value for 'code'
 *      startTime: // value for 'startTime'
 *      endTime: // value for 'endTime'
 *      fightIds: // value for 'fightIds'
 *   },
 * });
 */
export function useGetReportEventsQuery(baseOptions: Apollo.QueryHookOptions<Types.GetReportEventsQuery, Types.GetReportEventsQueryVariables> & ({ variables: Types.GetReportEventsQueryVariables; skip?: boolean; } | { skip: boolean; }) ) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useQuery<Types.GetReportEventsQuery, Types.GetReportEventsQueryVariables>(GetReportEventsDocument, options);
      }
export function useGetReportEventsLazyQuery(baseOptions?: Apollo.LazyQueryHookOptions<Types.GetReportEventsQuery, Types.GetReportEventsQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return Apollo.useLazyQuery<Types.GetReportEventsQuery, Types.GetReportEventsQueryVariables>(GetReportEventsDocument, options);
        }
export function useGetReportEventsSuspenseQuery(baseOptions?: Apollo.SkipToken | Apollo.SuspenseQueryHookOptions<Types.GetReportEventsQuery, Types.GetReportEventsQueryVariables>) {
          const options = baseOptions === Apollo.skipToken ? baseOptions : {...defaultOptions, ...baseOptions}
          return Apollo.useSuspenseQuery<Types.GetReportEventsQuery, Types.GetReportEventsQueryVariables>(GetReportEventsDocument, options);
        }
export type GetReportEventsQueryHookResult = ReturnType<typeof useGetReportEventsQuery>;
export type GetReportEventsLazyQueryHookResult = ReturnType<typeof useGetReportEventsLazyQuery>;
export type GetReportEventsSuspenseQueryHookResult = ReturnType<typeof useGetReportEventsSuspenseQuery>;
export type GetReportEventsQueryResult = Apollo.QueryResult<Types.GetReportEventsQuery, Types.GetReportEventsQueryVariables>;
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
    ${MasterDataFragmentDoc}`;

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
export function useGetReportMasterDataQuery(baseOptions: Apollo.QueryHookOptions<Types.GetReportMasterDataQuery, Types.GetReportMasterDataQueryVariables> & ({ variables: Types.GetReportMasterDataQueryVariables; skip?: boolean; } | { skip: boolean; }) ) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useQuery<Types.GetReportMasterDataQuery, Types.GetReportMasterDataQueryVariables>(GetReportMasterDataDocument, options);
      }
export function useGetReportMasterDataLazyQuery(baseOptions?: Apollo.LazyQueryHookOptions<Types.GetReportMasterDataQuery, Types.GetReportMasterDataQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return Apollo.useLazyQuery<Types.GetReportMasterDataQuery, Types.GetReportMasterDataQueryVariables>(GetReportMasterDataDocument, options);
        }
export function useGetReportMasterDataSuspenseQuery(baseOptions?: Apollo.SkipToken | Apollo.SuspenseQueryHookOptions<Types.GetReportMasterDataQuery, Types.GetReportMasterDataQueryVariables>) {
          const options = baseOptions === Apollo.skipToken ? baseOptions : {...defaultOptions, ...baseOptions}
          return Apollo.useSuspenseQuery<Types.GetReportMasterDataQuery, Types.GetReportMasterDataQueryVariables>(GetReportMasterDataDocument, options);
        }
export type GetReportMasterDataQueryHookResult = ReturnType<typeof useGetReportMasterDataQuery>;
export type GetReportMasterDataLazyQueryHookResult = ReturnType<typeof useGetReportMasterDataLazyQuery>;
export type GetReportMasterDataSuspenseQueryHookResult = ReturnType<typeof useGetReportMasterDataSuspenseQuery>;
export type GetReportMasterDataQueryResult = Apollo.QueryResult<Types.GetReportMasterDataQuery, Types.GetReportMasterDataQueryVariables>;