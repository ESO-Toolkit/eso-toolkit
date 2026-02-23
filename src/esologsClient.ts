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
import { CombinedGraphQLErrors } from '@apollo/client/errors';
import { setContext } from '@apollo/client/link/context';
import { onError, ErrorLink } from '@apollo/client/link/error';
import { RetryLink } from '@apollo/client/link/retry';
import { getOperationAST } from 'graphql';

import { refreshAccessToken } from './features/auth/auth';
import { Logger, LogLevel } from './utils/logger';

type ErrorWithGraphQLErrors = {
  graphQLErrors?: Array<{ message?: string }>;
  message?: string;
};

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
            merge(_existing, incoming) {
              // Always return incoming, never cache gameData
              return incoming;
            },
          },
          reportData: {
            merge(_existing, incoming) {
              // Always return incoming, never cache reportData
              return incoming;
            },
          },
        },
      },
    },
  });

  private accessToken: string;
  private client: ApolloClient;

  constructor(accessToken: string) {
    this.accessToken = accessToken;
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
    // dropped connection, etc.). Uses exponential backoff with jitter to avoid
    // thundering-herd retries.
    const retryLink = new RetryLink({
      delay: {
        initial: 1000, // wait 1 s before the first retry
        max: 15000, // cap at 15 s
        jitter: true, // randomise to spread concurrent retries
      },
      attempts: {
        max: 3,
        retryIf: (error: unknown) => {
          const statusCode = (error as { statusCode?: number })?.statusCode;
          if (statusCode === 429) {
            logger.warn('API rate limit hit (429) — retrying with backoff', {
              operation: 'pending',
            });
            return true;
          }
          // Also retry on network-level errors (no statusCode means the request
          // never reached the server — transient connectivity failure).
          if (error != null && statusCode === undefined) {
            logger.warn('Network error — retrying with backoff');
            return true;
          }
          return false;
        },
      },
    });

    // Error handling link for 401 responses
    const errorLink: ErrorLink = onError(({ error, operation, forward }) => {
      // Check if this is a GraphQL error with authentication issues
      let hasAuthError = false;

      if (CombinedGraphQLErrors.is(error)) {
        hasAuthError = error.errors.some(
          (err) =>
            err.message?.includes('Unauthenticated') ||
            err.message?.includes('Unauthorized') ||
            err.extensions?.code === 'UNAUTHENTICATED' ||
            err.extensions?.code === 'UNAUTHORIZED',
        );
      }

      if (hasAuthError) {
        logger.warn('Authentication error detected - attempting to refresh token');

        // Create a new observable that will retry the request after refreshing the token
        return new Observable((observer) => {
          refreshAccessToken()
            .then((newToken) => {
              if (newToken) {
                // Update the operation context with the new token
                operation.setContext({
                  headers: {
                    ...operation.getContext().headers,
                    Authorization: `Bearer ${newToken}`,
                  },
                });

                // Update our internal token
                this.accessToken = newToken;

                // Retry the request
                const subscriber = {
                  next: observer.next.bind(observer),
                  error: observer.error.bind(observer),
                  complete: observer.complete.bind(observer),
                };

                forward(operation).subscribe(subscriber);
              } else {
                // Refresh failed, clear tokens and notify user
                logger.error('Token refresh failed - user needs to re-authenticate');
                localStorage.removeItem('access_token');
                localStorage.removeItem('refresh_token');
                observer.error(new Error('Authentication failed. Please log in again.'));
              }
            })
            .catch((err) => {
              logger.error('Error during token refresh', err);
              observer.error(err);
            });
        });
      }

      // Log the error for debugging — skip noisy 429 logs since RetryLink already
      // warned on each attempt and the query() catch block will surface a
      // human-readable message to the UI.
      const networkStatusCode = (error as { statusCode?: number })?.statusCode;
      if (networkStatusCode === 429) {
        logger.warn('API rate limit (429) — all retries exhausted', {
          operation: operation.operationName,
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
            : 'https://www.esologs.com/api/v2/client';

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
      return {
        headers: {
          ...headers,
          Authorization: accessToken ? `Bearer ${accessToken}` : undefined,
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
      // Convert well-known network failures to human-readable messages so that UI
      // components can surface actionable feedback instead of an opaque stack trace.
      //
      // When ApolloClient.query() throws, it always wraps low-level errors inside
      // an ApolloError.  The HTTP status code therefore lives at:
      //   error.networkError.statusCode  (ApolloError → ServerError)
      // NOT at the top-level error.statusCode (which is always undefined).
      // We check both locations for robustness.
      const innerNetworkError = (networkError as { networkError?: { statusCode?: number } })
        ?.networkError;
      const statusCode =
        innerNetworkError?.statusCode ?? (networkError as { statusCode?: number })?.statusCode;
      if (statusCode === 429) {
        throw new Error(
          'API rate limit exceeded. Too many requests were sent in a short period — please wait a moment and try again.',
        );
      }
      // statusCode === undefined (or 0) means the request never got a response —
      // this is the NetworkError case captured in sentry as ESO-LOGS-8J / ESO-589.
      if (statusCode === undefined || statusCode === 0) {
        throw new Error(
          'Network error: Could not connect to the ESO Logs API. Please check your internet connection and try again.',
        );
      }
      throw networkError;
    }

    // Check for GraphQL errors and reject if they exist
    if (result.error) {
      const operationAST = getOperationAST(options.query);
      const operationName = operationAST?.name?.value;
      const hasData = typeof result.data !== 'undefined' && result.data !== null;
      const errorPolicy = options.errorPolicy ?? 'none';

      if (errorPolicy === 'all' && hasData) {
        const graphErrors = (result.error as ErrorWithGraphQLErrors | undefined)?.graphQLErrors;
        const errorMessages =
          Array.isArray(graphErrors) && graphErrors.length > 0
            ? graphErrors.map((graphError) => graphError?.message ?? 'Unknown GraphQL error')
            : [result.error.message ?? 'Unknown GraphQL error'];
        logger.warn('GraphQL query completed with errors', {
          query: operationName,
          messages: errorMessages,
        });
      } else {
        logger.error('GraphQL query error', result.error, {
          query: operationName,
        });
        throw new Error(`GraphQL error: ${result.error.message}`);
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
export function createEsoLogsClient(accessToken: string): EsoLogsClient {
  return new EsoLogsClient(accessToken);
}
