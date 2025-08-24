/* eslint-disable */
import * as Types from './generated';

import { gql } from '@apollo/client';
import { EventFragmentDoc } from './shared-fragments.generated';
import * as Apollo from '@apollo/client';
const defaultOptions = {} as const;

export const GetDamageEventsDocument = gql`
    query getDamageEvents($code: String!, $startTime: Float, $endTime: Float, $fightIds: [Int]!, $hostilityType: HostilityType, $limit: Int = 1000000) {
  reportData {
    report(code: $code) {
      events(
        startTime: $startTime
        endTime: $endTime
        fightIDs: $fightIds
        dataType: DamageDone
        useActorIDs: true
        includeResources: true
        hostilityType: $hostilityType
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
 *      hostilityType: // value for 'hostilityType'
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
    query getHealingEvents($code: String!, $startTime: Float, $endTime: Float, $fightIds: [Int]!, $hostilityType: HostilityType, $limit: Int = 1000000) {
  reportData {
    report(code: $code) {
      events(
        startTime: $startTime
        endTime: $endTime
        fightIDs: $fightIds
        dataType: Healing
        useActorIDs: true
        includeResources: true
        hostilityType: $hostilityType
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
 *      hostilityType: // value for 'hostilityType'
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
    query getBuffEvents($code: String!, $startTime: Float, $endTime: Float, $fightIds: [Int]!, $hostilityType: HostilityType, $limit: Int = 1000000) {
  reportData {
    report(code: $code) {
      events(
        startTime: $startTime
        endTime: $endTime
        fightIDs: $fightIds
        dataType: Buffs
        useActorIDs: true
        includeResources: true
        hostilityType: $hostilityType
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
 *      hostilityType: // value for 'hostilityType'
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
    query getDeathEvents($code: String!, $startTime: Float, $endTime: Float, $fightIds: [Int]!, $hostilityType: HostilityType, $limit: Int = 1000000) {
  reportData {
    report(code: $code) {
      events(
        startTime: $startTime
        endTime: $endTime
        fightIDs: $fightIds
        dataType: Deaths
        useActorIDs: true
        includeResources: true
        hostilityType: $hostilityType
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
 *      hostilityType: // value for 'hostilityType'
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
export const GetCombatantInfoEventsDocument = gql`
    query getCombatantInfoEvents($code: String!, $startTime: Float, $endTime: Float, $fightIds: [Int]!, $hostilityType: HostilityType, $limit: Int = 1000000) {
  reportData {
    report(code: $code) {
      events(
        startTime: $startTime
        endTime: $endTime
        fightIDs: $fightIds
        dataType: CombatantInfo
        useActorIDs: true
        includeResources: true
        hostilityType: $hostilityType
        limit: $limit
      ) {
        ...Event
      }
    }
  }
}
    ${EventFragmentDoc}`;

/**
 * __useGetCombatantInfoEventsQuery__
 *
 * To run a query within a React component, call `useGetCombatantInfoEventsQuery` and pass it any options that fit your needs.
 * When your component renders, `useGetCombatantInfoEventsQuery` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the query, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useGetCombatantInfoEventsQuery({
 *   variables: {
 *      code: // value for 'code'
 *      startTime: // value for 'startTime'
 *      endTime: // value for 'endTime'
 *      fightIds: // value for 'fightIds'
 *      hostilityType: // value for 'hostilityType'
 *      limit: // value for 'limit'
 *   },
 * });
 */
export function useGetCombatantInfoEventsQuery(baseOptions: Apollo.QueryHookOptions<Types.GetCombatantInfoEventsQuery, Types.GetCombatantInfoEventsQueryVariables> & ({ variables: Types.GetCombatantInfoEventsQueryVariables; skip?: boolean; } | { skip: boolean; }) ) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useQuery<Types.GetCombatantInfoEventsQuery, Types.GetCombatantInfoEventsQueryVariables>(GetCombatantInfoEventsDocument, options);
      }
export function useGetCombatantInfoEventsLazyQuery(baseOptions?: Apollo.LazyQueryHookOptions<Types.GetCombatantInfoEventsQuery, Types.GetCombatantInfoEventsQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return Apollo.useLazyQuery<Types.GetCombatantInfoEventsQuery, Types.GetCombatantInfoEventsQueryVariables>(GetCombatantInfoEventsDocument, options);
        }
export function useGetCombatantInfoEventsSuspenseQuery(baseOptions?: Apollo.SkipToken | Apollo.SuspenseQueryHookOptions<Types.GetCombatantInfoEventsQuery, Types.GetCombatantInfoEventsQueryVariables>) {
          const options = baseOptions === Apollo.skipToken ? baseOptions : {...defaultOptions, ...baseOptions}
          return Apollo.useSuspenseQuery<Types.GetCombatantInfoEventsQuery, Types.GetCombatantInfoEventsQueryVariables>(GetCombatantInfoEventsDocument, options);
        }
export type GetCombatantInfoEventsQueryHookResult = ReturnType<typeof useGetCombatantInfoEventsQuery>;
export type GetCombatantInfoEventsLazyQueryHookResult = ReturnType<typeof useGetCombatantInfoEventsLazyQuery>;
export type GetCombatantInfoEventsSuspenseQueryHookResult = ReturnType<typeof useGetCombatantInfoEventsSuspenseQuery>;
export type GetCombatantInfoEventsQueryResult = Apollo.QueryResult<Types.GetCombatantInfoEventsQuery, Types.GetCombatantInfoEventsQueryVariables>;
export const GetDebuffEventsDocument = gql`
    query getDebuffEvents($code: String!, $startTime: Float, $endTime: Float, $fightIds: [Int]!, $hostilityType: HostilityType, $limit: Int = 1000000) {
  reportData {
    report(code: $code) {
      events(
        startTime: $startTime
        endTime: $endTime
        fightIDs: $fightIds
        dataType: Debuffs
        useActorIDs: true
        includeResources: true
        hostilityType: $hostilityType
        limit: $limit
      ) {
        ...Event
      }
    }
  }
}
    ${EventFragmentDoc}`;

/**
 * __useGetDebuffEventsQuery__
 *
 * To run a query within a React component, call `useGetDebuffEventsQuery` and pass it any options that fit your needs.
 * When your component renders, `useGetDebuffEventsQuery` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the query, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useGetDebuffEventsQuery({
 *   variables: {
 *      code: // value for 'code'
 *      startTime: // value for 'startTime'
 *      endTime: // value for 'endTime'
 *      fightIds: // value for 'fightIds'
 *      hostilityType: // value for 'hostilityType'
 *      limit: // value for 'limit'
 *   },
 * });
 */
export function useGetDebuffEventsQuery(baseOptions: Apollo.QueryHookOptions<Types.GetDebuffEventsQuery, Types.GetDebuffEventsQueryVariables> & ({ variables: Types.GetDebuffEventsQueryVariables; skip?: boolean; } | { skip: boolean; }) ) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useQuery<Types.GetDebuffEventsQuery, Types.GetDebuffEventsQueryVariables>(GetDebuffEventsDocument, options);
      }
export function useGetDebuffEventsLazyQuery(baseOptions?: Apollo.LazyQueryHookOptions<Types.GetDebuffEventsQuery, Types.GetDebuffEventsQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return Apollo.useLazyQuery<Types.GetDebuffEventsQuery, Types.GetDebuffEventsQueryVariables>(GetDebuffEventsDocument, options);
        }
export function useGetDebuffEventsSuspenseQuery(baseOptions?: Apollo.SkipToken | Apollo.SuspenseQueryHookOptions<Types.GetDebuffEventsQuery, Types.GetDebuffEventsQueryVariables>) {
          const options = baseOptions === Apollo.skipToken ? baseOptions : {...defaultOptions, ...baseOptions}
          return Apollo.useSuspenseQuery<Types.GetDebuffEventsQuery, Types.GetDebuffEventsQueryVariables>(GetDebuffEventsDocument, options);
        }
export type GetDebuffEventsQueryHookResult = ReturnType<typeof useGetDebuffEventsQuery>;
export type GetDebuffEventsLazyQueryHookResult = ReturnType<typeof useGetDebuffEventsLazyQuery>;
export type GetDebuffEventsSuspenseQueryHookResult = ReturnType<typeof useGetDebuffEventsSuspenseQuery>;
export type GetDebuffEventsQueryResult = Apollo.QueryResult<Types.GetDebuffEventsQuery, Types.GetDebuffEventsQueryVariables>;
export const GetCastEventsDocument = gql`
    query getCastEvents($code: String!, $startTime: Float, $endTime: Float, $fightIds: [Int]!, $hostilityType: HostilityType, $limit: Int = 1000000) {
  reportData {
    report(code: $code) {
      events(
        startTime: $startTime
        endTime: $endTime
        fightIDs: $fightIds
        dataType: Casts
        useActorIDs: true
        includeResources: true
        hostilityType: $hostilityType
        limit: $limit
      ) {
        ...Event
      }
    }
  }
}
    ${EventFragmentDoc}`;

/**
 * __useGetCastEventsQuery__
 *
 * To run a query within a React component, call `useGetCastEventsQuery` and pass it any options that fit your needs.
 * When your component renders, `useGetCastEventsQuery` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the query, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useGetCastEventsQuery({
 *   variables: {
 *      code: // value for 'code'
 *      startTime: // value for 'startTime'
 *      endTime: // value for 'endTime'
 *      fightIds: // value for 'fightIds'
 *      hostilityType: // value for 'hostilityType'
 *      limit: // value for 'limit'
 *   },
 * });
 */
export function useGetCastEventsQuery(baseOptions: Apollo.QueryHookOptions<Types.GetCastEventsQuery, Types.GetCastEventsQueryVariables> & ({ variables: Types.GetCastEventsQueryVariables; skip?: boolean; } | { skip: boolean; }) ) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useQuery<Types.GetCastEventsQuery, Types.GetCastEventsQueryVariables>(GetCastEventsDocument, options);
      }
export function useGetCastEventsLazyQuery(baseOptions?: Apollo.LazyQueryHookOptions<Types.GetCastEventsQuery, Types.GetCastEventsQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return Apollo.useLazyQuery<Types.GetCastEventsQuery, Types.GetCastEventsQueryVariables>(GetCastEventsDocument, options);
        }
export function useGetCastEventsSuspenseQuery(baseOptions?: Apollo.SkipToken | Apollo.SuspenseQueryHookOptions<Types.GetCastEventsQuery, Types.GetCastEventsQueryVariables>) {
          const options = baseOptions === Apollo.skipToken ? baseOptions : {...defaultOptions, ...baseOptions}
          return Apollo.useSuspenseQuery<Types.GetCastEventsQuery, Types.GetCastEventsQueryVariables>(GetCastEventsDocument, options);
        }
export type GetCastEventsQueryHookResult = ReturnType<typeof useGetCastEventsQuery>;
export type GetCastEventsLazyQueryHookResult = ReturnType<typeof useGetCastEventsLazyQuery>;
export type GetCastEventsSuspenseQueryHookResult = ReturnType<typeof useGetCastEventsSuspenseQuery>;
export type GetCastEventsQueryResult = Apollo.QueryResult<Types.GetCastEventsQuery, Types.GetCastEventsQueryVariables>;
export const GetResourceEventsDocument = gql`
    query getResourceEvents($code: String!, $startTime: Float, $endTime: Float, $fightIds: [Int]!, $hostilityType: HostilityType, $limit: Int = 1000000) {
  reportData {
    report(code: $code) {
      events(
        startTime: $startTime
        endTime: $endTime
        fightIDs: $fightIds
        dataType: Resources
        useActorIDs: true
        includeResources: true
        hostilityType: $hostilityType
        limit: $limit
      ) {
        ...Event
      }
    }
  }
}
    ${EventFragmentDoc}`;

/**
 * __useGetResourceEventsQuery__
 *
 * To run a query within a React component, call `useGetResourceEventsQuery` and pass it any options that fit your needs.
 * When your component renders, `useGetResourceEventsQuery` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the query, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useGetResourceEventsQuery({
 *   variables: {
 *      code: // value for 'code'
 *      startTime: // value for 'startTime'
 *      endTime: // value for 'endTime'
 *      fightIds: // value for 'fightIds'
 *      hostilityType: // value for 'hostilityType'
 *      limit: // value for 'limit'
 *   },
 * });
 */
export function useGetResourceEventsQuery(baseOptions: Apollo.QueryHookOptions<Types.GetResourceEventsQuery, Types.GetResourceEventsQueryVariables> & ({ variables: Types.GetResourceEventsQueryVariables; skip?: boolean; } | { skip: boolean; }) ) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useQuery<Types.GetResourceEventsQuery, Types.GetResourceEventsQueryVariables>(GetResourceEventsDocument, options);
      }
export function useGetResourceEventsLazyQuery(baseOptions?: Apollo.LazyQueryHookOptions<Types.GetResourceEventsQuery, Types.GetResourceEventsQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return Apollo.useLazyQuery<Types.GetResourceEventsQuery, Types.GetResourceEventsQueryVariables>(GetResourceEventsDocument, options);
        }
export function useGetResourceEventsSuspenseQuery(baseOptions?: Apollo.SkipToken | Apollo.SuspenseQueryHookOptions<Types.GetResourceEventsQuery, Types.GetResourceEventsQueryVariables>) {
          const options = baseOptions === Apollo.skipToken ? baseOptions : {...defaultOptions, ...baseOptions}
          return Apollo.useSuspenseQuery<Types.GetResourceEventsQuery, Types.GetResourceEventsQueryVariables>(GetResourceEventsDocument, options);
        }
export type GetResourceEventsQueryHookResult = ReturnType<typeof useGetResourceEventsQuery>;
export type GetResourceEventsLazyQueryHookResult = ReturnType<typeof useGetResourceEventsLazyQuery>;
export type GetResourceEventsSuspenseQueryHookResult = ReturnType<typeof useGetResourceEventsSuspenseQuery>;
export type GetResourceEventsQueryResult = Apollo.QueryResult<Types.GetResourceEventsQuery, Types.GetResourceEventsQueryVariables>;