/* eslint-disable */
import * as Types from './generated';

import { gql } from '@apollo/client';
import { EventFragmentDoc } from './shared-fragments.generated';
import * as Apollo from '@apollo/client';
const defaultOptions = {} as const;

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