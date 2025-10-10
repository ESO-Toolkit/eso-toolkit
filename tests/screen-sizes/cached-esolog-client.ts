import {
  QueryOptions,
  MutationOptions,
  OperationVariables,
  FetchResult,
} from '@apollo/client';
import { EsoLogsClient } from '../../src/esologsClient';
import {
  generateCacheKey,
  readCachedResponse,
  writeCachedResponse,
  ensureCacheDir
} from './cache-utils';

/**
 * Test-specific wrapper for EsoLogsClient that caches API responses to reduce load during testing
 * Uses composition instead of inheritance to avoid TypeScript complexity
 */
export class CachedEsoLogsClient {
  private client: EsoLogsClient;
  private enableCache: boolean;

  constructor(accessToken: string, enableCache: boolean = true) {
    this.client = new EsoLogsClient(accessToken);
    this.enableCache = enableCache;
    
    if (enableCache) {
      ensureCacheDir();
    }
  }

  /**
   * Cached query method
   */
  async query<TData = unknown, TVariables extends OperationVariables = OperationVariables>(
    options: QueryOptions<TVariables, TData>
  ): Promise<TData> {
    if (!this.enableCache) {
      return this.client.query(options);
    }

    // Extract operation name safely
    const operationDefinition = options.query.definitions
      .find((def: any) => def.kind === 'OperationDefinition');
    const operationName = operationDefinition?.name?.value as string | undefined;
    
    if (!operationName) {
      // If we can't determine the operation name, fall back to non-cached
      return this.client.query(options);
    }

    // Determine endpoint type based on operation name
    const isUserOperation = this.isUserSpecificOperation(operationName);
    const endpoint = isUserOperation ? 'user' : 'client';
    
    // Generate cache key
    const cacheKey = generateCacheKey(operationName, options.variables as OperationVariables, endpoint);
    
    // Try to read from cache first
    const cachedResponse = readCachedResponse<TData>(cacheKey);
    if (cachedResponse) {
      console.log(`🟢 Cache HIT for ${operationName} (${endpoint})`);
      return cachedResponse;
    }

    console.log(`🔴 Cache MISS for ${operationName} (${endpoint}) - fetching from API`);
    
    // Fetch from API
    try {
      const response = await this.client.query(options);
      
      // Cache the response
      writeCachedResponse(cacheKey, response);
      
      return response;
    } catch (error) {
      console.warn(`API call failed for ${operationName}:`, error);
      throw error;
    }
  }

  /**
   * Cached mutate method (for read-only mutations only)
   */
  async mutate<TData = unknown, TVariables extends OperationVariables = OperationVariables>(
    options: MutationOptions<TData, TVariables>
  ): Promise<FetchResult<TData>> {
    // Mutations should generally not be cached as they modify state
    if (!this.enableCache) {
      return this.client.mutate(options);
    }

    const operationDefinition = options.mutation?.definitions
      .find((def: any) => def.kind === 'OperationDefinition');
    const operationName = operationDefinition?.name?.value as string | undefined;
    
    if (!operationName) {
      return this.client.mutate(options);
    }

    // For mutations, we'll be more conservative about caching
    // Only cache if it's a "safe" read-like mutation
    const readOnlyMutations: string[] = [
      // Add mutation names here that are safe to cache
      // e.g., 'refreshToken', 'validateUser'
    ];

    if (!readOnlyMutations.includes(operationName)) {
      console.log(`🟡 Skipping cache for mutation ${operationName} - executing directly`);
      return this.client.mutate(options);
    }

    const isUserOperation = this.isUserSpecificOperation(operationName);
    const endpoint = isUserOperation ? 'user' : 'client';
    const cacheKey = generateCacheKey(operationName, options.variables as OperationVariables, endpoint);
    
    const cachedResponse = readCachedResponse<FetchResult<TData>>(cacheKey);
    if (cachedResponse) {
      console.log(`🟢 Cache HIT for mutation ${operationName} (${endpoint})`);
      return cachedResponse;
    }

    console.log(`🔴 Cache MISS for mutation ${operationName} (${endpoint}) - executing`);
    
    try {
      const response = await this.client.mutate(options);
      writeCachedResponse(cacheKey, response);
      return response;
    } catch (error) {
      console.warn(`Mutation failed for ${operationName}:`, error);
      throw error;
    }
  }

  /**
   * Delegate other methods to the underlying client
   */
  updateAccessToken(newAccessToken: string): void {
    this.client.updateAccessToken(newAccessToken);
  }

  getAccessToken(): string {
    return this.client.getAccessToken();
  }

  getClient() {
    return this.client.getClient();
  }

  resetStore() {
    return this.client.resetStore();
  }

  clearStore() {
    return this.client.clearStore();
  }

  stop(): void {
    this.client.stop();
  }

  watchQuery<T = unknown, TVariables extends OperationVariables = OperationVariables>(
    options: any
  ) {
    return this.client.watchQuery<T, TVariables>(options);
  }

  subscribe<T = unknown, TVariables extends OperationVariables = OperationVariables>(
    options: any
  ) {
    return this.client.subscribe<T, TVariables>(options);
  }

  /**
   * Helper method to check if an operation should use the user endpoint
   * This duplicates the private method from the EsoLogsClient class
   */
  private isUserSpecificOperation(operationName?: string): boolean {
    if (!operationName) return false;

    const userOperations = [
      'getCurrentUser',
      'getUserReports',
      'getUserCharacters',
      'getUserGuilds',
    ];

    return userOperations.includes(operationName);
  }

  /**
   * Disable caching for this instance
   */
  disableCache(): void {
    this.enableCache = false;
  }

  /**
   * Enable caching for this instance
   */
  enableCaching(): void {
    this.enableCache = true;
    ensureCacheDir();
  }

  /**
   * Check if caching is enabled
   */
  isCacheEnabled(): boolean {
    return this.enableCache;
  }
}