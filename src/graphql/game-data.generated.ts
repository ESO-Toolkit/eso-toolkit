/* eslint-disable */
import * as Types from './generated';

import { gql } from '@apollo/client';
import * as Apollo from '@apollo/client';
const defaultOptions = {} as const;

export const GetAbilitiesDocument = gql`
  query getAbilities($limit: Int, $page: Int) {
    gameData {
      abilities(limit: $limit, page: $page) {
        data {
          id
          name
          icon
        }
        total
        per_page
        current_page
        from
        to
        last_page
        has_more_pages
      }
    }
  }
`;

/**
 * __useGetAbilitiesQuery__
 *
 * To run a query within a React component, call `useGetAbilitiesQuery` and pass it any options that fit your needs.
 * When your component renders, `useGetAbilitiesQuery` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the query, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useGetAbilitiesQuery({
 *   variables: {
 *      limit: // value for 'limit'
 *      page: // value for 'page'
 *   },
 * });
 */
export function useGetAbilitiesQuery(
  baseOptions?: Apollo.QueryHookOptions<Types.GetAbilitiesQuery, Types.GetAbilitiesQueryVariables>,
) {
  const options = { ...defaultOptions, ...baseOptions };
  return Apollo.useQuery<Types.GetAbilitiesQuery, Types.GetAbilitiesQueryVariables>(
    GetAbilitiesDocument,
    options,
  );
}
export function useGetAbilitiesLazyQuery(
  baseOptions?: Apollo.LazyQueryHookOptions<
    Types.GetAbilitiesQuery,
    Types.GetAbilitiesQueryVariables
  >,
) {
  const options = { ...defaultOptions, ...baseOptions };
  return Apollo.useLazyQuery<Types.GetAbilitiesQuery, Types.GetAbilitiesQueryVariables>(
    GetAbilitiesDocument,
    options,
  );
}
export function useGetAbilitiesSuspenseQuery(
  baseOptions?:
    | Apollo.SkipToken
    | Apollo.SuspenseQueryHookOptions<Types.GetAbilitiesQuery, Types.GetAbilitiesQueryVariables>,
) {
  const options =
    baseOptions === Apollo.skipToken ? baseOptions : { ...defaultOptions, ...baseOptions };
  return Apollo.useSuspenseQuery<Types.GetAbilitiesQuery, Types.GetAbilitiesQueryVariables>(
    GetAbilitiesDocument,
    options,
  );
}
export type GetAbilitiesQueryHookResult = ReturnType<typeof useGetAbilitiesQuery>;
export type GetAbilitiesLazyQueryHookResult = ReturnType<typeof useGetAbilitiesLazyQuery>;
export type GetAbilitiesSuspenseQueryHookResult = ReturnType<typeof useGetAbilitiesSuspenseQuery>;
export type GetAbilitiesQueryResult = Apollo.QueryResult<
  Types.GetAbilitiesQuery,
  Types.GetAbilitiesQueryVariables
>;
export const GetAbilityDocument = gql`
  query getAbility($id: Int!) {
    gameData {
      ability(id: $id) {
        id
        name
        icon
      }
    }
  }
`;

/**
 * __useGetAbilityQuery__
 *
 * To run a query within a React component, call `useGetAbilityQuery` and pass it any options that fit your needs.
 * When your component renders, `useGetAbilityQuery` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the query, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useGetAbilityQuery({
 *   variables: {
 *      id: // value for 'id'
 *   },
 * });
 */
export function useGetAbilityQuery(
  baseOptions: Apollo.QueryHookOptions<Types.GetAbilityQuery, Types.GetAbilityQueryVariables> &
    ({ variables: Types.GetAbilityQueryVariables; skip?: boolean } | { skip: boolean }),
) {
  const options = { ...defaultOptions, ...baseOptions };
  return Apollo.useQuery<Types.GetAbilityQuery, Types.GetAbilityQueryVariables>(
    GetAbilityDocument,
    options,
  );
}
export function useGetAbilityLazyQuery(
  baseOptions?: Apollo.LazyQueryHookOptions<Types.GetAbilityQuery, Types.GetAbilityQueryVariables>,
) {
  const options = { ...defaultOptions, ...baseOptions };
  return Apollo.useLazyQuery<Types.GetAbilityQuery, Types.GetAbilityQueryVariables>(
    GetAbilityDocument,
    options,
  );
}
export function useGetAbilitySuspenseQuery(
  baseOptions?:
    | Apollo.SkipToken
    | Apollo.SuspenseQueryHookOptions<Types.GetAbilityQuery, Types.GetAbilityQueryVariables>,
) {
  const options =
    baseOptions === Apollo.skipToken ? baseOptions : { ...defaultOptions, ...baseOptions };
  return Apollo.useSuspenseQuery<Types.GetAbilityQuery, Types.GetAbilityQueryVariables>(
    GetAbilityDocument,
    options,
  );
}
export type GetAbilityQueryHookResult = ReturnType<typeof useGetAbilityQuery>;
export type GetAbilityLazyQueryHookResult = ReturnType<typeof useGetAbilityLazyQuery>;
export type GetAbilitySuspenseQueryHookResult = ReturnType<typeof useGetAbilitySuspenseQuery>;
export type GetAbilityQueryResult = Apollo.QueryResult<
  Types.GetAbilityQuery,
  Types.GetAbilityQueryVariables
>;
export const GetClassDocument = gql`
  query getClass($id: Int!) {
    gameData {
      class(id: $id) {
        id
        name
        slug
      }
    }
  }
`;

/**
 * __useGetClassQuery__
 *
 * To run a query within a React component, call `useGetClassQuery` and pass it any options that fit your needs.
 * When your component renders, `useGetClassQuery` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the query, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useGetClassQuery({
 *   variables: {
 *      id: // value for 'id'
 *   },
 * });
 */
export function useGetClassQuery(
  baseOptions: Apollo.QueryHookOptions<Types.GetClassQuery, Types.GetClassQueryVariables> &
    ({ variables: Types.GetClassQueryVariables; skip?: boolean } | { skip: boolean }),
) {
  const options = { ...defaultOptions, ...baseOptions };
  return Apollo.useQuery<Types.GetClassQuery, Types.GetClassQueryVariables>(
    GetClassDocument,
    options,
  );
}
export function useGetClassLazyQuery(
  baseOptions?: Apollo.LazyQueryHookOptions<Types.GetClassQuery, Types.GetClassQueryVariables>,
) {
  const options = { ...defaultOptions, ...baseOptions };
  return Apollo.useLazyQuery<Types.GetClassQuery, Types.GetClassQueryVariables>(
    GetClassDocument,
    options,
  );
}
export function useGetClassSuspenseQuery(
  baseOptions?:
    | Apollo.SkipToken
    | Apollo.SuspenseQueryHookOptions<Types.GetClassQuery, Types.GetClassQueryVariables>,
) {
  const options =
    baseOptions === Apollo.skipToken ? baseOptions : { ...defaultOptions, ...baseOptions };
  return Apollo.useSuspenseQuery<Types.GetClassQuery, Types.GetClassQueryVariables>(
    GetClassDocument,
    options,
  );
}
export type GetClassQueryHookResult = ReturnType<typeof useGetClassQuery>;
export type GetClassLazyQueryHookResult = ReturnType<typeof useGetClassLazyQuery>;
export type GetClassSuspenseQueryHookResult = ReturnType<typeof useGetClassSuspenseQuery>;
export type GetClassQueryResult = Apollo.QueryResult<
  Types.GetClassQuery,
  Types.GetClassQueryVariables
>;
export const GetClassesDocument = gql`
  query getClasses {
    gameData {
      classes {
        id
        name
        slug
      }
    }
  }
`;

/**
 * __useGetClassesQuery__
 *
 * To run a query within a React component, call `useGetClassesQuery` and pass it any options that fit your needs.
 * When your component renders, `useGetClassesQuery` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the query, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useGetClassesQuery({
 *   variables: {
 *   },
 * });
 */
export function useGetClassesQuery(
  baseOptions?: Apollo.QueryHookOptions<Types.GetClassesQuery, Types.GetClassesQueryVariables>,
) {
  const options = { ...defaultOptions, ...baseOptions };
  return Apollo.useQuery<Types.GetClassesQuery, Types.GetClassesQueryVariables>(
    GetClassesDocument,
    options,
  );
}
export function useGetClassesLazyQuery(
  baseOptions?: Apollo.LazyQueryHookOptions<Types.GetClassesQuery, Types.GetClassesQueryVariables>,
) {
  const options = { ...defaultOptions, ...baseOptions };
  return Apollo.useLazyQuery<Types.GetClassesQuery, Types.GetClassesQueryVariables>(
    GetClassesDocument,
    options,
  );
}
export function useGetClassesSuspenseQuery(
  baseOptions?:
    | Apollo.SkipToken
    | Apollo.SuspenseQueryHookOptions<Types.GetClassesQuery, Types.GetClassesQueryVariables>,
) {
  const options =
    baseOptions === Apollo.skipToken ? baseOptions : { ...defaultOptions, ...baseOptions };
  return Apollo.useSuspenseQuery<Types.GetClassesQuery, Types.GetClassesQueryVariables>(
    GetClassesDocument,
    options,
  );
}
export type GetClassesQueryHookResult = ReturnType<typeof useGetClassesQuery>;
export type GetClassesLazyQueryHookResult = ReturnType<typeof useGetClassesLazyQuery>;
export type GetClassesSuspenseQueryHookResult = ReturnType<typeof useGetClassesSuspenseQuery>;
export type GetClassesQueryResult = Apollo.QueryResult<
  Types.GetClassesQuery,
  Types.GetClassesQueryVariables
>;
