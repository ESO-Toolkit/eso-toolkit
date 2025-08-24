import {
  ApolloClient,
  InMemoryCache,
  createHttpLink,
  NormalizedCacheObject,
  QueryOptions,
  MutationOptions,
  SubscriptionOptions,
  WatchQueryOptions,
  ObservableQuery,
  ApolloQueryResult,
  FetchResult,
  OperationVariables,
  Observable,
  from,
} from '@apollo/client';
import { setContext } from '@apollo/client/link/context';

export class EsoLogsClient {
  private static readonly CACHE = new InMemoryCache({
    typePolicies: {
      Query: {
        fields: {
          gameData: {
            merge(_existing, incoming) {
              // Always return incoming, never cache gameData
              return incoming;
            },
          },
        },
      },
    },
  });

  private accessToken: string;
  private client: ApolloClient<NormalizedCacheObject>;

  constructor(accessToken: string) {
    this.accessToken = accessToken;
    this.client = this.createApolloClient(accessToken);
  }

  private createApolloClient(accessToken: string): ApolloClient<NormalizedCacheObject> {
    // Custom link to append query name to URL
    const customHttpLink = createHttpLink({
      uri: (operation) => {
        const baseUrl = 'https://www.esologs.com/api/v2/client';
        const queryName = operation.operationName;
        if (queryName) {
          return `${baseUrl}?query=${encodeURIComponent(queryName)}`;
        }
        return baseUrl;
      },
    });

    const authLink = setContext((_, { headers }) => {
      return {
        headers: {
          ...headers,
          Authorization: accessToken ? `Bearer ${accessToken}` : undefined,
        },
      };
    });

    return new ApolloClient({
      link: from([authLink, customHttpLink]),
      cache: EsoLogsClient.CACHE,
    });
  }

  /**
   * Updates the access token and recreates the Apollo client
   */
  public updateAccessToken(newAccessToken: string): void {
    this.accessToken = newAccessToken;
    this.client = this.createApolloClient(newAccessToken);
  }

  /**
   * Gets the current access token
   */
  public getAccessToken(): string {
    return this.accessToken;
  }

  /**
   * Gets the underlying Apollo client instance
   */
  public getClient(): ApolloClient<NormalizedCacheObject> {
    return this.client;
  }

  // Delegate Apollo Client methods
  public async query<TData = unknown, TVariables extends OperationVariables = OperationVariables>(
    options: QueryOptions<TVariables, TData>
  ): Promise<TData> {
    const result = await this.client.query(options);

    // Check for GraphQL errors and reject if they exist
    if (result.error) {
      throw new Error(`GraphQL error: ${result.error.message}`);
    }

    return result.data;
  }

  public mutate<T = unknown, TVariables extends OperationVariables = OperationVariables>(
    options: MutationOptions<T, TVariables>
  ): Promise<FetchResult<T>> {
    return this.client.mutate(options);
  }

  public watchQuery<T = unknown, TVariables extends OperationVariables = OperationVariables>(
    options: WatchQueryOptions<TVariables, T>
  ): ObservableQuery<T, TVariables> {
    return this.client.watchQuery(options);
  }

  public subscribe<T = unknown, TVariables extends OperationVariables = OperationVariables>(
    options: SubscriptionOptions<TVariables, T>
  ): Observable<FetchResult<T>> {
    return this.client.subscribe(options);
  }

  public resetStore(): Promise<ApolloQueryResult<unknown>[] | null> {
    return this.client.resetStore();
  }

  public clearStore(): Promise<unknown[]> {
    return this.client.clearStore();
  }

  public stop(): void {
    this.client.stop();
  }
} // Factory function for backward compatibility
export function createEsoLogsClient(accessToken: string): EsoLogsClient {
  return new EsoLogsClient(accessToken);
}
