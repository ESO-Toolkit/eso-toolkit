/* eslint-disable */
import * as Types from './generated';

import { gql } from '@apollo/client';
import * as Apollo from '@apollo/client';
const defaultOptions = {} as const;

export const GetGuildByIdDocument = gql`
  query getGuildById($guildId: Int!) {
    guildData {
      guild(id: $guildId) {
        id
        name
        description
        faction {
          name
        }
        server {
          name
          region {
            name
          }
        }
        tags {
          id
          name
        }
      }
    }
  }
`;

/**
 * __useGetGuildByIdQuery__
 *
 * To run a query within a React component, call `useGetGuildByIdQuery` and pass it any options that fit your needs.
 * When your component renders, `useGetGuildByIdQuery` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the query, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useGetGuildByIdQuery({
 *   variables: {
 *      guildId: // value for 'guildId'
 *   },
 * });
 */
export function useGetGuildByIdQuery(
  baseOptions: Apollo.QueryHookOptions<Types.GetGuildByIdQuery, Types.GetGuildByIdQueryVariables> &
    ({ variables: Types.GetGuildByIdQueryVariables; skip?: boolean } | { skip: boolean })
) {
  const options = { ...defaultOptions, ...baseOptions };
  return Apollo.useQuery<Types.GetGuildByIdQuery, Types.GetGuildByIdQueryVariables>(
    GetGuildByIdDocument,
    options
  );
}
export function useGetGuildByIdLazyQuery(
  baseOptions?: Apollo.LazyQueryHookOptions<
    Types.GetGuildByIdQuery,
    Types.GetGuildByIdQueryVariables
  >
) {
  const options = { ...defaultOptions, ...baseOptions };
  return Apollo.useLazyQuery<Types.GetGuildByIdQuery, Types.GetGuildByIdQueryVariables>(
    GetGuildByIdDocument,
    options
  );
}
export function useGetGuildByIdSuspenseQuery(
  baseOptions?:
    | Apollo.SkipToken
    | Apollo.SuspenseQueryHookOptions<Types.GetGuildByIdQuery, Types.GetGuildByIdQueryVariables>
) {
  const options =
    baseOptions === Apollo.skipToken ? baseOptions : { ...defaultOptions, ...baseOptions };
  return Apollo.useSuspenseQuery<Types.GetGuildByIdQuery, Types.GetGuildByIdQueryVariables>(
    GetGuildByIdDocument,
    options
  );
}
export type GetGuildByIdQueryHookResult = ReturnType<typeof useGetGuildByIdQuery>;
export type GetGuildByIdLazyQueryHookResult = ReturnType<typeof useGetGuildByIdLazyQuery>;
export type GetGuildByIdSuspenseQueryHookResult = ReturnType<typeof useGetGuildByIdSuspenseQuery>;
export type GetGuildByIdQueryResult = Apollo.QueryResult<
  Types.GetGuildByIdQuery,
  Types.GetGuildByIdQueryVariables
>;
export const GetGuildsDocument = gql`
  query getGuilds(
    $limit: Int
    $page: Int
    $serverID: Int
    $serverSlug: String
    $serverRegion: String
  ) {
    guildData {
      guilds(
        limit: $limit
        page: $page
        serverID: $serverID
        serverSlug: $serverSlug
        serverRegion: $serverRegion
      ) {
        total
        per_page
        current_page
        from
        to
        last_page
        has_more_pages
        data {
          id
          name
          faction {
            name
          }
          server {
            name
            region {
              name
            }
          }
        }
      }
    }
  }
`;

/**
 * __useGetGuildsQuery__
 *
 * To run a query within a React component, call `useGetGuildsQuery` and pass it any options that fit your needs.
 * When your component renders, `useGetGuildsQuery` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the query, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useGetGuildsQuery({
 *   variables: {
 *      limit: // value for 'limit'
 *      page: // value for 'page'
 *      serverID: // value for 'serverID'
 *      serverSlug: // value for 'serverSlug'
 *      serverRegion: // value for 'serverRegion'
 *   },
 * });
 */
export function useGetGuildsQuery(
  baseOptions?: Apollo.QueryHookOptions<Types.GetGuildsQuery, Types.GetGuildsQueryVariables>
) {
  const options = { ...defaultOptions, ...baseOptions };
  return Apollo.useQuery<Types.GetGuildsQuery, Types.GetGuildsQueryVariables>(
    GetGuildsDocument,
    options
  );
}
export function useGetGuildsLazyQuery(
  baseOptions?: Apollo.LazyQueryHookOptions<Types.GetGuildsQuery, Types.GetGuildsQueryVariables>
) {
  const options = { ...defaultOptions, ...baseOptions };
  return Apollo.useLazyQuery<Types.GetGuildsQuery, Types.GetGuildsQueryVariables>(
    GetGuildsDocument,
    options
  );
}
export function useGetGuildsSuspenseQuery(
  baseOptions?:
    | Apollo.SkipToken
    | Apollo.SuspenseQueryHookOptions<Types.GetGuildsQuery, Types.GetGuildsQueryVariables>
) {
  const options =
    baseOptions === Apollo.skipToken ? baseOptions : { ...defaultOptions, ...baseOptions };
  return Apollo.useSuspenseQuery<Types.GetGuildsQuery, Types.GetGuildsQueryVariables>(
    GetGuildsDocument,
    options
  );
}
export type GetGuildsQueryHookResult = ReturnType<typeof useGetGuildsQuery>;
export type GetGuildsLazyQueryHookResult = ReturnType<typeof useGetGuildsLazyQuery>;
export type GetGuildsSuspenseQueryHookResult = ReturnType<typeof useGetGuildsSuspenseQuery>;
export type GetGuildsQueryResult = Apollo.QueryResult<
  Types.GetGuildsQuery,
  Types.GetGuildsQueryVariables
>;
export const GetGuildByNameDocument = gql`
  query getGuildByName($name: String!, $serverSlug: String!, $serverRegion: String!) {
    guildData {
      guild(name: $name, serverSlug: $serverSlug, serverRegion: $serverRegion) {
        id
        name
        description
        faction {
          name
        }
        server {
          name
          region {
            name
          }
        }
        tags {
          id
          name
        }
      }
    }
  }
`;

/**
 * __useGetGuildByNameQuery__
 *
 * To run a query within a React component, call `useGetGuildByNameQuery` and pass it any options that fit your needs.
 * When your component renders, `useGetGuildByNameQuery` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the query, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useGetGuildByNameQuery({
 *   variables: {
 *      name: // value for 'name'
 *      serverSlug: // value for 'serverSlug'
 *      serverRegion: // value for 'serverRegion'
 *   },
 * });
 */
export function useGetGuildByNameQuery(
  baseOptions: Apollo.QueryHookOptions<
    Types.GetGuildByNameQuery,
    Types.GetGuildByNameQueryVariables
  > &
    ({ variables: Types.GetGuildByNameQueryVariables; skip?: boolean } | { skip: boolean })
) {
  const options = { ...defaultOptions, ...baseOptions };
  return Apollo.useQuery<Types.GetGuildByNameQuery, Types.GetGuildByNameQueryVariables>(
    GetGuildByNameDocument,
    options
  );
}
export function useGetGuildByNameLazyQuery(
  baseOptions?: Apollo.LazyQueryHookOptions<
    Types.GetGuildByNameQuery,
    Types.GetGuildByNameQueryVariables
  >
) {
  const options = { ...defaultOptions, ...baseOptions };
  return Apollo.useLazyQuery<Types.GetGuildByNameQuery, Types.GetGuildByNameQueryVariables>(
    GetGuildByNameDocument,
    options
  );
}
export function useGetGuildByNameSuspenseQuery(
  baseOptions?:
    | Apollo.SkipToken
    | Apollo.SuspenseQueryHookOptions<Types.GetGuildByNameQuery, Types.GetGuildByNameQueryVariables>
) {
  const options =
    baseOptions === Apollo.skipToken ? baseOptions : { ...defaultOptions, ...baseOptions };
  return Apollo.useSuspenseQuery<Types.GetGuildByNameQuery, Types.GetGuildByNameQueryVariables>(
    GetGuildByNameDocument,
    options
  );
}
export type GetGuildByNameQueryHookResult = ReturnType<typeof useGetGuildByNameQuery>;
export type GetGuildByNameLazyQueryHookResult = ReturnType<typeof useGetGuildByNameLazyQuery>;
export type GetGuildByNameSuspenseQueryHookResult = ReturnType<
  typeof useGetGuildByNameSuspenseQuery
>;
export type GetGuildByNameQueryResult = Apollo.QueryResult<
  Types.GetGuildByNameQuery,
  Types.GetGuildByNameQueryVariables
>;
export const GetGuildAttendanceDocument = gql`
  query getGuildAttendance(
    $guildId: Int!
    $guildTagID: Int
    $limit: Int
    $page: Int
    $zoneID: Int
  ) {
    guildData {
      guild(id: $guildId) {
        attendance(guildTagID: $guildTagID, limit: $limit, page: $page, zoneID: $zoneID) {
          total
          per_page
          current_page
          has_more_pages
          data {
            code
            startTime
            players {
              name
              type
              presence
            }
          }
        }
      }
    }
  }
`;

/**
 * __useGetGuildAttendanceQuery__
 *
 * To run a query within a React component, call `useGetGuildAttendanceQuery` and pass it any options that fit your needs.
 * When your component renders, `useGetGuildAttendanceQuery` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the query, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useGetGuildAttendanceQuery({
 *   variables: {
 *      guildId: // value for 'guildId'
 *      guildTagID: // value for 'guildTagID'
 *      limit: // value for 'limit'
 *      page: // value for 'page'
 *      zoneID: // value for 'zoneID'
 *   },
 * });
 */
export function useGetGuildAttendanceQuery(
  baseOptions: Apollo.QueryHookOptions<
    Types.GetGuildAttendanceQuery,
    Types.GetGuildAttendanceQueryVariables
  > &
    ({ variables: Types.GetGuildAttendanceQueryVariables; skip?: boolean } | { skip: boolean })
) {
  const options = { ...defaultOptions, ...baseOptions };
  return Apollo.useQuery<Types.GetGuildAttendanceQuery, Types.GetGuildAttendanceQueryVariables>(
    GetGuildAttendanceDocument,
    options
  );
}
export function useGetGuildAttendanceLazyQuery(
  baseOptions?: Apollo.LazyQueryHookOptions<
    Types.GetGuildAttendanceQuery,
    Types.GetGuildAttendanceQueryVariables
  >
) {
  const options = { ...defaultOptions, ...baseOptions };
  return Apollo.useLazyQuery<Types.GetGuildAttendanceQuery, Types.GetGuildAttendanceQueryVariables>(
    GetGuildAttendanceDocument,
    options
  );
}
export function useGetGuildAttendanceSuspenseQuery(
  baseOptions?:
    | Apollo.SkipToken
    | Apollo.SuspenseQueryHookOptions<
        Types.GetGuildAttendanceQuery,
        Types.GetGuildAttendanceQueryVariables
      >
) {
  const options =
    baseOptions === Apollo.skipToken ? baseOptions : { ...defaultOptions, ...baseOptions };
  return Apollo.useSuspenseQuery<
    Types.GetGuildAttendanceQuery,
    Types.GetGuildAttendanceQueryVariables
  >(GetGuildAttendanceDocument, options);
}
export type GetGuildAttendanceQueryHookResult = ReturnType<typeof useGetGuildAttendanceQuery>;
export type GetGuildAttendanceLazyQueryHookResult = ReturnType<
  typeof useGetGuildAttendanceLazyQuery
>;
export type GetGuildAttendanceSuspenseQueryHookResult = ReturnType<
  typeof useGetGuildAttendanceSuspenseQuery
>;
export type GetGuildAttendanceQueryResult = Apollo.QueryResult<
  Types.GetGuildAttendanceQuery,
  Types.GetGuildAttendanceQueryVariables
>;
export const GetGuildMembersDocument = gql`
  query getGuildMembers($guildId: Int!, $limit: Int, $page: Int) {
    guildData {
      guild(id: $guildId) {
        members(limit: $limit, page: $page) {
          total
          per_page
          current_page
          has_more_pages
          data {
            id
            name
            server {
              name
              region {
                name
              }
            }
            guildRank
          }
        }
      }
    }
  }
`;

/**
 * __useGetGuildMembersQuery__
 *
 * To run a query within a React component, call `useGetGuildMembersQuery` and pass it any options that fit your needs.
 * When your component renders, `useGetGuildMembersQuery` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the query, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useGetGuildMembersQuery({
 *   variables: {
 *      guildId: // value for 'guildId'
 *      limit: // value for 'limit'
 *      page: // value for 'page'
 *   },
 * });
 */
export function useGetGuildMembersQuery(
  baseOptions: Apollo.QueryHookOptions<
    Types.GetGuildMembersQuery,
    Types.GetGuildMembersQueryVariables
  > &
    ({ variables: Types.GetGuildMembersQueryVariables; skip?: boolean } | { skip: boolean })
) {
  const options = { ...defaultOptions, ...baseOptions };
  return Apollo.useQuery<Types.GetGuildMembersQuery, Types.GetGuildMembersQueryVariables>(
    GetGuildMembersDocument,
    options
  );
}
export function useGetGuildMembersLazyQuery(
  baseOptions?: Apollo.LazyQueryHookOptions<
    Types.GetGuildMembersQuery,
    Types.GetGuildMembersQueryVariables
  >
) {
  const options = { ...defaultOptions, ...baseOptions };
  return Apollo.useLazyQuery<Types.GetGuildMembersQuery, Types.GetGuildMembersQueryVariables>(
    GetGuildMembersDocument,
    options
  );
}
export function useGetGuildMembersSuspenseQuery(
  baseOptions?:
    | Apollo.SkipToken
    | Apollo.SuspenseQueryHookOptions<
        Types.GetGuildMembersQuery,
        Types.GetGuildMembersQueryVariables
      >
) {
  const options =
    baseOptions === Apollo.skipToken ? baseOptions : { ...defaultOptions, ...baseOptions };
  return Apollo.useSuspenseQuery<Types.GetGuildMembersQuery, Types.GetGuildMembersQueryVariables>(
    GetGuildMembersDocument,
    options
  );
}
export type GetGuildMembersQueryHookResult = ReturnType<typeof useGetGuildMembersQuery>;
export type GetGuildMembersLazyQueryHookResult = ReturnType<typeof useGetGuildMembersLazyQuery>;
export type GetGuildMembersSuspenseQueryHookResult = ReturnType<
  typeof useGetGuildMembersSuspenseQuery
>;
export type GetGuildMembersQueryResult = Apollo.QueryResult<
  Types.GetGuildMembersQuery,
  Types.GetGuildMembersQueryVariables
>;
