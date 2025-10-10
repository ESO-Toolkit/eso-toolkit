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
import { getOperationName } from '@apollo/client/utilities';

import { Logger, LogLevel } from './contexts/LoggerContext';

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
  private client: ApolloClient<NormalizedCacheObject>;

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

  private createApolloClient(accessToken: string): ApolloClient<NormalizedCacheObject> {
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

  /**
   * Checks if test caching is enabled
   */
  private isTestCacheEnabled(): boolean {
    try {
      return typeof window !== 'undefined' && 
             window.localStorage?.getItem('test-cache-enabled') === 'true';
    } catch {
      return false;
    }
  }

  /**
   * Generates a cache key for test caching
   */
  private generateTestCacheKey(
    operationName: string,
    variables: OperationVariables = {},
    endpoint: 'client' | 'user' = 'client'
  ): string {
    const sortedVars = JSON.stringify(variables, Object.keys(variables || {}).sort());
    const content = `${operationName}:${endpoint}:${sortedVars}`;
    
    let hash = 0;
    for (let i = 0; i < content.length; i++) {
      const char = content.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash;
    }
    
    return `eso-logs-cache-${Math.abs(hash).toString(16)}`;
  }

  /**
   * Reads from test cache
   */
  private readTestCache<T>(cacheKey: string): T | null {
    try {
      if (typeof window === 'undefined') return null;
      
      const cached = window.localStorage.getItem(cacheKey);
      if (!cached) return null;
      
      const parsedCache = JSON.parse(cached);
      
      // Check if cache has expired (1 hour for tests)
      const maxAge = 60 * 60 * 1000;
      if (Date.now() - parsedCache.timestamp > maxAge) {
        window.localStorage.removeItem(cacheKey);
        return null;
      }
      
      return parsedCache.data;
    } catch {
      return null;
    }
  }

  /**
   * Writes to test cache
   */
  private writeTestCache<T>(cacheKey: string, data: T): void {
    try {
      if (typeof window === 'undefined') return;
      
      const cacheData = {
        data,
        timestamp: Date.now()
      };
      
      window.localStorage.setItem(cacheKey, JSON.stringify(cacheData));
    } catch (error) {
      logger.debug('Failed to write test cache', error);
    }
  }

  // Delegate Apollo Client methods
  public async query<TData = unknown, TVariables extends OperationVariables = OperationVariables>(
    options: QueryOptions<TVariables, TData>,
  ): Promise<TData> {
    // Check for test caching
    if (this.isTestCacheEnabled()) {
      console.log('🧪 Test caching is ENABLED');
      const operationName = getOperationName(options.query);
      
      if (operationName) {
        const isUserOperation = this.isUserSpecificOperation(operationName);
        const endpoint = isUserOperation ? 'user' : 'client';
        const cacheKey = this.generateTestCacheKey(operationName, options.variables, endpoint);
        
        // Try to read from cache first
        const cachedData = this.readTestCache<TData>(cacheKey);
        if (cachedData) {
          console.log(`🟢 Cache HIT for ${operationName} (${endpoint})`);
          logger.debug(`🟢 Cache HIT for ${operationName} (${endpoint})`);
          return cachedData;
        }
        
        console.log(`🔴 Cache MISS for ${operationName} (${endpoint}) - fetching from API`);
        logger.debug(`🔴 Cache MISS for ${operationName} (${endpoint}) - fetching from API`);
        
        // Fetch from API and cache the result
        const result = await this.client.query(options);
        
        if (result.error) {
          logger.error('GraphQL query error', result.error, {
            query: operationName,
          });
          throw new Error(`GraphQL error: ${result.error.message}`);
        }
        
        // Cache the successful response
        console.log(`💾 Caching response for ${operationName} (${endpoint})`);
        this.writeTestCache(cacheKey, result.data);
        return result.data;
      }
    }

    // Normal flow without caching
    const result = await this.client.query(options);

    // Check for GraphQL errors and reject if they exist
    if (result.error) {
      logger.error('GraphQL query error', result.error, {
        query: getOperationName(options.query),
      });
      throw new Error(`GraphQL error: ${result.error.message}`);
    }

    return result.data;
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
