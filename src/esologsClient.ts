import {
  ApolloClient,
  InMemoryCache,
  createHttpLink,
  QueryOptions,
  MutationOptions,
  SubscriptionOptions,
  WatchQueryOptions,
  ObservableQuery,
  FetchResult,
  OperationVariables,
  Observable,
  from,
} from '@apollo/client';
import { setContext } from '@apollo/client/link/context';
import { onError, ErrorLink } from '@apollo/client/link/error';
import { RetryLink } from '@apollo/client/link/retry';
import { getOperationAST } from 'graphql';

import { clearStoredTokens, refreshAccessToken } from './features/auth/auth';
import { Logger, LogLevel } from './utils/logger';
import {
  classifyRequestFailure,
  getRetryDelayMs,
  shouldRetryRequest,
  toRequestFailure,
} from './utils/requestFailure';

// Create a logger instance for GraphQL client
const logger = new Logger({
  level: LogLevel.ERROR,
  contextPrefix: 'GraphQL',
});

export class EsoLogsClient {
  private static readonly CACHE = new InMemoryCache({
    typePolicies: {
      Query: {
        fields: {
          gameData: {
            merge(existing, incoming) {
              // Shallow-merge so fields fetched by one query aren't discarded when
              // a sibling query writes a different subtree of gameData.
              return incoming && typeof incoming === 'object'
                ? { ...existing, ...incoming }
                : incoming;
            },
          },
          reportData: {
            merge(existing, incoming) {
              // Shallow-merge so sibling reportData fields survive partial writes.
              return incoming && typeof incoming === 'object'
                ? { ...existing, ...incoming }
                : incoming;
            },
          },
        },
      },
    },
  });

  private accessToken: string;
  private clientApiProxyUrl: string;
  private client: ApolloClient;

  constructor(accessToken: string, clientApiProxyUrl: string) {
    this.accessToken = accessToken;
    this.clientApiProxyUrl = clientApiProxyUrl;
    this.client = this.createApolloClient(accessToken);
  }

  /**
   * Determines if an operation requires the user API endpoint
   *
   * ESO Logs has two API endpoints:
   * - /api/v2/client: Public data, better performance, higher rate limits
   * - /api/v2/user: Private user data, requires authentication, lower rate limits
   *
   * We want to use /client for most operations and only use /user when necessary
   */
  private isUserSpecificOperation(operationName?: string): boolean {
    if (!operationName) return false;

    // Operations that require user authentication and the /user endpoint
    const userOperations = [
      'getCurrentUser',
      'getUserReports',
      'getUserCharacters',
      'getUserGuilds',
      // Add more user-specific operations as needed
      // Examples: getUserPrivateReports, updateUserProfile, etc.
    ];

    return userOperations.includes(operationName);
  }

  private createApolloClient(accessToken: string): ApolloClient {
    // Retry link: automatically retries requests that fail with HTTP 429 (rate limit)
    // or transient network errors (status 0 / no statusCode — CORS block, DNS failure,
    // dropped connection, etc.). Delays are deterministic, bounded, and honour
    // the server's Retry-After header where present.
    const retryLink = new RetryLink({
      delay: (retryCount, _operation, error) => getRetryDelayMs(error, retryCount),
      attempts: (retryCount, operation, error) => {
        const failure = classifyRequestFailure(error);
        const retry = shouldRetryRequest(error, retryCount);
        if (retry) {
          logger.warn(`Request failed (${failure.kind}) - retrying with backoff`, {
            operation: operation.operationName,
            retryCount,
            retryAfterMs: failure.retryAfterMs,
          });
        }
        return retry;
      },
    });

    // Error handling link for 401 responses
    const errorLink: ErrorLink = onError(({ error, operation, forward }) => {
      const failure = classifyRequestFailure(error);

      if (failure.kind === 'authentication') {
        // Loop guard is PER-OPERATION, not client-wide: if THIS op was already
        // retried with a freshly refreshed token and still fails auth, the
        // refresh genuinely didn't help — clear tokens and stop. Concurrent ops
        // that 401 during the same expiry window each get their own single
        // refresh-and-retry attempt instead of one op's in-flight refresh
        // tripping a shared guard that wipes everyone's tokens (H2).
        if (operation.getContext().retriedAfterRefresh) {
          logger.error('Auth error persisted after token refresh — clearing tokens');
          clearStoredTokens();
          return;
        }

        logger.warn('Authentication error detected - attempting to refresh token');

        // Create a new observable that will retry the request after refreshing the token
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        return new Observable((observer: any) => {
          let innerSub: { unsubscribe: () => void } | undefined;
          // refreshAccessToken() dedupes concurrent callers via its shared
          // pendingRefreshPromise, so several ops that 401 at once all await the
          // SAME refresh instead of racing (and burning) the single-use token.
          refreshAccessToken()
            .then((newToken) => {
              if (newToken) {
                // Update the operation context with the new token and mark it as
                // retried, so a second auth failure on this op hits the guard
                // above (clear tokens) rather than looping through refresh again.
                operation.setContext({
                  headers: {
                    ...operation.getContext().headers,
                    Authorization: `Bearer ${newToken}`,
                  },
                  retriedAfterRefresh: true,
                });

                // Update our internal token
                this.accessToken = newToken;

                // Retry the request
                innerSub = forward(operation).subscribe({
                  next: observer.next.bind(observer),
                  error: observer.error.bind(observer),
                  complete: observer.complete.bind(observer),
                });
              } else {
                // Refresh failed, clear tokens and notify user
                logger.error('Token refresh failed - user needs to re-authenticate');
                clearStoredTokens();
                observer.error(new Error('Authentication failed. Please log in again.'));
              }
            })
            .catch((err) => {
              logger.error('Error during token refresh', err);
              observer.error(err);
            });

          // If the consumer unsubscribes (component unmount / cancelled query)
          // while the refresh or forwarded request is in flight, tear down the
          // inner subscription.
          return () => {
            innerSub?.unsubscribe();
          };
        });
      }

      // Log the error for debugging — skip noisy 429 logs since RetryLink already
      // warned on each attempt and the query() catch block will surface a
      // human-readable message to the UI.
      if (failure.kind === 'rate-limited') {
        logger.warn('API rate limit (429) — all retries exhausted', {
          operation: operation.operationName,
          retryAfterMs: failure.retryAfterMs,
        });
        return;
      }
      logger.error('GraphQL operation error', error, {
        operation: operation.operationName,
      });
    });

    // Custom link to append query name to URL
    const customHttpLink = createHttpLink({
      uri: (operation) => {
        // Determine which endpoint to use based on the operation
        const isUserOperation = this.isUserSpecificOperation(operation.operationName);
        const baseUrl =
          isUserOperation && accessToken
            ? 'https://www.esologs.com/api/v2/user'
            : this.clientApiProxyUrl;

        // Log which endpoint is being used for debugging
        logger.debug(`Operation ${operation.operationName} using endpoint: ${baseUrl}`);

        const queryName = operation.operationName;
        if (queryName) {
          return `${baseUrl}?query=${encodeURIComponent(queryName)}`;
        }
        return baseUrl;
      },
    });

    const authLink = setContext((_, { headers }) => {
      // Always read this.accessToken rather than the constructor closure so that
      // token updates from the error-link refresh path (which sets this.accessToken
      // without rebuilding the Apollo client) are immediately reflected in retries
      // and subsequent requests on the same client instance.
      return {
        headers: {
          ...headers,
          Authorization: this.accessToken ? `Bearer ${this.accessToken}` : undefined,
        },
      };
    });

    return new ApolloClient({
      // retryLink must come first so it intercepts 429s before errorLink logs them
      link: from([retryLink, errorLink, authLink, customHttpLink]),
      cache: EsoLogsClient.CACHE,
    });
  }

  /**
   * Updates the access token and recreates the Apollo client
   */
  public updateAccessToken(newAccessToken: string): void {
    this.accessToken = newAccessToken;
    // Clear cached data from the previous session to avoid leaking stale
    // query results across different user identities.
    EsoLogsClient.CACHE.reset();
    this.client = this.createApolloClient(newAccessToken);
  }

  public getClientApiProxyUrl(): string {
    return this.clientApiProxyUrl;
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
  public getClient(): ApolloClient {
    return this.client;
  }

  // Delegate Apollo Client methods
  public async query<TData = unknown, TVariables extends OperationVariables = OperationVariables>(
    options: QueryOptions<TVariables, TData>,
  ): Promise<TData> {
    let result;
    try {
      result = await this.client.query(options);
    } catch (networkError) {
      throw toRequestFailure(networkError);
    }

    // Check for GraphQL errors and reject if they exist
    if (result.error) {
      const operationAST = getOperationAST(options.query);
      const operationName = operationAST?.name?.value;
      const hasData = typeof result.data !== 'undefined' && result.data !== null;
      const errorPolicy = options.errorPolicy ?? 'none';

      if (errorPolicy === 'all' && hasData) {
        throw toRequestFailure(result.error, { partial: true });
      } else {
        logger.error('GraphQL query error', result.error, {
          query: operationName,
        });
        throw toRequestFailure(result.error);
      }
    }

    return result.data as TData;
  }

  public mutate<T = unknown, TVariables extends OperationVariables = OperationVariables>(
    options: MutationOptions<T, TVariables>,
  ): Promise<FetchResult<T>> {
    return this.client.mutate(options);
  }

  public watchQuery<T = unknown, TVariables extends OperationVariables = OperationVariables>(
    options: WatchQueryOptions<TVariables, T>,
  ): ObservableQuery<T, TVariables> {
    return this.client.watchQuery(options);
  }

  public subscribe<T = unknown, TVariables extends OperationVariables = OperationVariables>(
    options: SubscriptionOptions<TVariables, T>,
  ): Observable<FetchResult<T>> {
    return this.client.subscribe(options);
  }

  public resetStore(): Promise<unknown[] | null> {
    return this.client.resetStore();
  }

  public clearStore(): Promise<unknown[]> {
    return this.client.clearStore();
  }

  public stop(): void {
    this.client.stop();
  }
} // Factory function for backward compatibility
export function createEsoLogsClient(accessToken: string, clientApiProxyUrl: string): EsoLogsClient {
  return new EsoLogsClient(accessToken, clientApiProxyUrl);
}
