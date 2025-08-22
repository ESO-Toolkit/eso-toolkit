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
export const OptimizedReportActorFragmentDoc = gql`
    fragment OptimizedReportActor on ReportActor {
  displayName
  gameID
  id
  name
  server
  subType
  type
}
    `;
export const OptimizedMasterDataFragmentDoc = gql`
    fragment OptimizedMasterData on ReportMasterData {
  abilities {
    ...ReportAbility
  }
  actors(type: "Player") {
    ...OptimizedReportActor
  }
}
    ${ReportAbilityFragmentDoc}
${OptimizedReportActorFragmentDoc}`;
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
export const GetDamageEventsDocument = gql`
    query getDamageEvents($code: String!, $startTime: Float, $endTime: Float, $fightIds: [Int]!, $limit: Int = 50000) {
  reportData {
    report(code: $code) {
      events(
        startTime: $startTime
        endTime: $endTime
        fightIDs: $fightIds
        dataType: DamageDone
        useActorIDs: true
        includeResources: false
        limit: $limit
      ) {
        ...Event
      }
    }
  }
}
    ${EventFragmentDoc}`;

/**
 * __useGetDamageEventsQuery__
 *
 * To run a query within a React component, call `useGetDamageEventsQuery` and pass it any options that fit your needs.
 * When your component renders, `useGetDamageEventsQuery` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the query, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useGetDamageEventsQuery({
 *   variables: {
 *      code: // value for 'code'
 *      startTime: // value for 'startTime'
 *      endTime: // value for 'endTime'
 *      fightIds: // value for 'fightIds'
 *      limit: // value for 'limit'
 *   },
 * });
 */
export function useGetDamageEventsQuery(baseOptions: Apollo.QueryHookOptions<Types.GetDamageEventsQuery, Types.GetDamageEventsQueryVariables> & ({ variables: Types.GetDamageEventsQueryVariables; skip?: boolean; } | { skip: boolean; }) ) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useQuery<Types.GetDamageEventsQuery, Types.GetDamageEventsQueryVariables>(GetDamageEventsDocument, options);
      }
export function useGetDamageEventsLazyQuery(baseOptions?: Apollo.LazyQueryHookOptions<Types.GetDamageEventsQuery, Types.GetDamageEventsQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return Apollo.useLazyQuery<Types.GetDamageEventsQuery, Types.GetDamageEventsQueryVariables>(GetDamageEventsDocument, options);
        }
export function useGetDamageEventsSuspenseQuery(baseOptions?: Apollo.SkipToken | Apollo.SuspenseQueryHookOptions<Types.GetDamageEventsQuery, Types.GetDamageEventsQueryVariables>) {
          const options = baseOptions === Apollo.skipToken ? baseOptions : {...defaultOptions, ...baseOptions}
          return Apollo.useSuspenseQuery<Types.GetDamageEventsQuery, Types.GetDamageEventsQueryVariables>(GetDamageEventsDocument, options);
        }
export type GetDamageEventsQueryHookResult = ReturnType<typeof useGetDamageEventsQuery>;
export type GetDamageEventsLazyQueryHookResult = ReturnType<typeof useGetDamageEventsLazyQuery>;
export type GetDamageEventsSuspenseQueryHookResult = ReturnType<typeof useGetDamageEventsSuspenseQuery>;
export type GetDamageEventsQueryResult = Apollo.QueryResult<Types.GetDamageEventsQuery, Types.GetDamageEventsQueryVariables>;
export const GetHealingEventsDocument = gql`
    query getHealingEvents($code: String!, $startTime: Float, $endTime: Float, $fightIds: [Int]!, $limit: Int = 50000) {
  reportData {
    report(code: $code) {
      events(
        startTime: $startTime
        endTime: $endTime
        fightIDs: $fightIds
        dataType: Healing
        useActorIDs: true
        includeResources: false
        limit: $limit
      ) {
        ...Event
      }
    }
  }
}
    ${EventFragmentDoc}`;

/**
 * __useGetHealingEventsQuery__
 *
 * To run a query within a React component, call `useGetHealingEventsQuery` and pass it any options that fit your needs.
 * When your component renders, `useGetHealingEventsQuery` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the query, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useGetHealingEventsQuery({
 *   variables: {
 *      code: // value for 'code'
 *      startTime: // value for 'startTime'
 *      endTime: // value for 'endTime'
 *      fightIds: // value for 'fightIds'
 *      limit: // value for 'limit'
 *   },
 * });
 */
export function useGetHealingEventsQuery(baseOptions: Apollo.QueryHookOptions<Types.GetHealingEventsQuery, Types.GetHealingEventsQueryVariables> & ({ variables: Types.GetHealingEventsQueryVariables; skip?: boolean; } | { skip: boolean; }) ) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useQuery<Types.GetHealingEventsQuery, Types.GetHealingEventsQueryVariables>(GetHealingEventsDocument, options);
      }
export function useGetHealingEventsLazyQuery(baseOptions?: Apollo.LazyQueryHookOptions<Types.GetHealingEventsQuery, Types.GetHealingEventsQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return Apollo.useLazyQuery<Types.GetHealingEventsQuery, Types.GetHealingEventsQueryVariables>(GetHealingEventsDocument, options);
        }
export function useGetHealingEventsSuspenseQuery(baseOptions?: Apollo.SkipToken | Apollo.SuspenseQueryHookOptions<Types.GetHealingEventsQuery, Types.GetHealingEventsQueryVariables>) {
          const options = baseOptions === Apollo.skipToken ? baseOptions : {...defaultOptions, ...baseOptions}
          return Apollo.useSuspenseQuery<Types.GetHealingEventsQuery, Types.GetHealingEventsQueryVariables>(GetHealingEventsDocument, options);
        }
export type GetHealingEventsQueryHookResult = ReturnType<typeof useGetHealingEventsQuery>;
export type GetHealingEventsLazyQueryHookResult = ReturnType<typeof useGetHealingEventsLazyQuery>;
export type GetHealingEventsSuspenseQueryHookResult = ReturnType<typeof useGetHealingEventsSuspenseQuery>;
export type GetHealingEventsQueryResult = Apollo.QueryResult<Types.GetHealingEventsQuery, Types.GetHealingEventsQueryVariables>;
export const GetBuffEventsDocument = gql`
    query getBuffEvents($code: String!, $startTime: Float, $endTime: Float, $fightIds: [Int]!, $limit: Int = 30000) {
  reportData {
    report(code: $code) {
      events(
        startTime: $startTime
        endTime: $endTime
        fightIDs: $fightIds
        dataType: Buffs
        useActorIDs: true
        includeResources: false
        limit: $limit
      ) {
        ...Event
      }
    }
  }
}
    ${EventFragmentDoc}`;

/**
 * __useGetBuffEventsQuery__
 *
 * To run a query within a React component, call `useGetBuffEventsQuery` and pass it any options that fit your needs.
 * When your component renders, `useGetBuffEventsQuery` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the query, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useGetBuffEventsQuery({
 *   variables: {
 *      code: // value for 'code'
 *      startTime: // value for 'startTime'
 *      endTime: // value for 'endTime'
 *      fightIds: // value for 'fightIds'
 *      limit: // value for 'limit'
 *   },
 * });
 */
export function useGetBuffEventsQuery(baseOptions: Apollo.QueryHookOptions<Types.GetBuffEventsQuery, Types.GetBuffEventsQueryVariables> & ({ variables: Types.GetBuffEventsQueryVariables; skip?: boolean; } | { skip: boolean; }) ) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useQuery<Types.GetBuffEventsQuery, Types.GetBuffEventsQueryVariables>(GetBuffEventsDocument, options);
      }
export function useGetBuffEventsLazyQuery(baseOptions?: Apollo.LazyQueryHookOptions<Types.GetBuffEventsQuery, Types.GetBuffEventsQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return Apollo.useLazyQuery<Types.GetBuffEventsQuery, Types.GetBuffEventsQueryVariables>(GetBuffEventsDocument, options);
        }
export function useGetBuffEventsSuspenseQuery(baseOptions?: Apollo.SkipToken | Apollo.SuspenseQueryHookOptions<Types.GetBuffEventsQuery, Types.GetBuffEventsQueryVariables>) {
          const options = baseOptions === Apollo.skipToken ? baseOptions : {...defaultOptions, ...baseOptions}
          return Apollo.useSuspenseQuery<Types.GetBuffEventsQuery, Types.GetBuffEventsQueryVariables>(GetBuffEventsDocument, options);
        }
export type GetBuffEventsQueryHookResult = ReturnType<typeof useGetBuffEventsQuery>;
export type GetBuffEventsLazyQueryHookResult = ReturnType<typeof useGetBuffEventsLazyQuery>;
export type GetBuffEventsSuspenseQueryHookResult = ReturnType<typeof useGetBuffEventsSuspenseQuery>;
export type GetBuffEventsQueryResult = Apollo.QueryResult<Types.GetBuffEventsQuery, Types.GetBuffEventsQueryVariables>;
export const GetDeathEventsDocument = gql`
    query getDeathEvents($code: String!, $startTime: Float, $endTime: Float, $fightIds: [Int]!, $limit: Int = 10000) {
  reportData {
    report(code: $code) {
      events(
        startTime: $startTime
        endTime: $endTime
        fightIDs: $fightIds
        dataType: Deaths
        useActorIDs: true
        includeResources: false
        limit: $limit
      ) {
        ...Event
      }
    }
  }
}
    ${EventFragmentDoc}`;

/**
 * __useGetDeathEventsQuery__
 *
 * To run a query within a React component, call `useGetDeathEventsQuery` and pass it any options that fit your needs.
 * When your component renders, `useGetDeathEventsQuery` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the query, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useGetDeathEventsQuery({
 *   variables: {
 *      code: // value for 'code'
 *      startTime: // value for 'startTime'
 *      endTime: // value for 'endTime'
 *      fightIds: // value for 'fightIds'
 *      limit: // value for 'limit'
 *   },
 * });
 */
export function useGetDeathEventsQuery(baseOptions: Apollo.QueryHookOptions<Types.GetDeathEventsQuery, Types.GetDeathEventsQueryVariables> & ({ variables: Types.GetDeathEventsQueryVariables; skip?: boolean; } | { skip: boolean; }) ) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useQuery<Types.GetDeathEventsQuery, Types.GetDeathEventsQueryVariables>(GetDeathEventsDocument, options);
      }
export function useGetDeathEventsLazyQuery(baseOptions?: Apollo.LazyQueryHookOptions<Types.GetDeathEventsQuery, Types.GetDeathEventsQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return Apollo.useLazyQuery<Types.GetDeathEventsQuery, Types.GetDeathEventsQueryVariables>(GetDeathEventsDocument, options);
        }
export function useGetDeathEventsSuspenseQuery(baseOptions?: Apollo.SkipToken | Apollo.SuspenseQueryHookOptions<Types.GetDeathEventsQuery, Types.GetDeathEventsQueryVariables>) {
          const options = baseOptions === Apollo.skipToken ? baseOptions : {...defaultOptions, ...baseOptions}
          return Apollo.useSuspenseQuery<Types.GetDeathEventsQuery, Types.GetDeathEventsQueryVariables>(GetDeathEventsDocument, options);
        }
export type GetDeathEventsQueryHookResult = ReturnType<typeof useGetDeathEventsQuery>;
export type GetDeathEventsLazyQueryHookResult = ReturnType<typeof useGetDeathEventsLazyQuery>;
export type GetDeathEventsSuspenseQueryHookResult = ReturnType<typeof useGetDeathEventsSuspenseQuery>;
export type GetDeathEventsQueryResult = Apollo.QueryResult<Types.GetDeathEventsQuery, Types.GetDeathEventsQueryVariables>;
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
export const GetReportPlayersOnlyDocument = gql`
    query getReportPlayersOnly($code: String!) {
  reportData {
    report(code: $code) {
      masterData {
        ...OptimizedMasterData
      }
    }
  }
}
    ${OptimizedMasterDataFragmentDoc}`;

/**
 * __useGetReportPlayersOnlyQuery__
 *
 * To run a query within a React component, call `useGetReportPlayersOnlyQuery` and pass it any options that fit your needs.
 * When your component renders, `useGetReportPlayersOnlyQuery` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the query, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useGetReportPlayersOnlyQuery({
 *   variables: {
 *      code: // value for 'code'
 *   },
 * });
 */
export function useGetReportPlayersOnlyQuery(baseOptions: Apollo.QueryHookOptions<Types.GetReportPlayersOnlyQuery, Types.GetReportPlayersOnlyQueryVariables> & ({ variables: Types.GetReportPlayersOnlyQueryVariables; skip?: boolean; } | { skip: boolean; }) ) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useQuery<Types.GetReportPlayersOnlyQuery, Types.GetReportPlayersOnlyQueryVariables>(GetReportPlayersOnlyDocument, options);
      }
export function useGetReportPlayersOnlyLazyQuery(baseOptions?: Apollo.LazyQueryHookOptions<Types.GetReportPlayersOnlyQuery, Types.GetReportPlayersOnlyQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return Apollo.useLazyQuery<Types.GetReportPlayersOnlyQuery, Types.GetReportPlayersOnlyQueryVariables>(GetReportPlayersOnlyDocument, options);
        }
export function useGetReportPlayersOnlySuspenseQuery(baseOptions?: Apollo.SkipToken | Apollo.SuspenseQueryHookOptions<Types.GetReportPlayersOnlyQuery, Types.GetReportPlayersOnlyQueryVariables>) {
          const options = baseOptions === Apollo.skipToken ? baseOptions : {...defaultOptions, ...baseOptions}
          return Apollo.useSuspenseQuery<Types.GetReportPlayersOnlyQuery, Types.GetReportPlayersOnlyQueryVariables>(GetReportPlayersOnlyDocument, options);
        }
export type GetReportPlayersOnlyQueryHookResult = ReturnType<typeof useGetReportPlayersOnlyQuery>;
export type GetReportPlayersOnlyLazyQueryHookResult = ReturnType<typeof useGetReportPlayersOnlyLazyQuery>;
export type GetReportPlayersOnlySuspenseQueryHookResult = ReturnType<typeof useGetReportPlayersOnlySuspenseQuery>;
export type GetReportPlayersOnlyQueryResult = Apollo.QueryResult<Types.GetReportPlayersOnlyQuery, Types.GetReportPlayersOnlyQueryVariables>;