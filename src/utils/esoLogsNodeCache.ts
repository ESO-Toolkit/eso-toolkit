/**
 * Node.js file cache implementation for ESO Logs API responses
 * Only works in Node.js environment (server-side/tests)
 */

import crypto from 'crypto';
import { promises as fs } from 'fs';
import path from 'path';

import type { OperationVariables } from '@apollo/client';

import { Logger, LogLevel } from '../contexts/LoggerContext';

const CACHE_DIR = path.join(process.cwd(), 'cache', 'eso-logs-api');
const CACHE_VERSION = '1.0';
const DEFAULT_TTL = 7 * 24 * 60 * 60 * 1000; // 7 days in milliseconds

// Create logger instance for cache operations
const logger = new Logger({
  level:
    process.env.ENABLE_CACHE_LOGGING === 'true' || process.env.NODE_ENV === 'test'
      ? LogLevel.DEBUG
      : LogLevel.ERROR,
  contextPrefix: 'FileCache',
});

interface CacheEntry<T = unknown> {
  data: T;
  timestamp: number;
  ttl: number;
  version: string;
  key: string;
  metadata?: {
    operationName?: string;
    variables?: OperationVariables;
    endpoint?: string;
  };
}

export class EsoLogsNodeCache {
  /**
   * Ensure cache directory exists
   */
  private async ensureCacheDir(): Promise<void> {
    try {
      await fs.mkdir(CACHE_DIR, { recursive: true });
    } catch {
      // Directory might already exist, ignore error
    }
  }

  /**
   * Generate cache key from operation and variables
   */
  private generateCacheKey(
    operationName: string,
    variables: OperationVariables = {},
    endpoint: string = 'client',
  ): string {
    const content = JSON.stringify({
      operation: operationName,
      variables: this.normalizeVariables(variables),
      endpoint,
    });

    return crypto.createHash('sha256').update(content).digest('hex').substring(0, 16);
  }

  /**
   * Normalize variables for consistent cache keys
   */
  private normalizeVariables(variables: OperationVariables): OperationVariables {
    if (!variables || typeof variables !== 'object') {
      return variables;
    }

    // Sort object keys for consistent hashing
    const sorted: Record<string, unknown> = {};
    Object.keys(variables)
      .sort()
      .forEach((key) => {
        sorted[key] = variables[key];
      });

    return sorted;
  }

  /**
   * Get cache file path
   */
  private getCacheFilePath(cacheKey: string): string {
    return path.join(CACHE_DIR, `${cacheKey}.json`);
  }

  /**
   * Check if cache entry is valid (not expired)
   */
  private isValidCacheEntry<T>(entry: CacheEntry<T>): boolean {
    const now = Date.now();
    const isExpired = now - entry.timestamp > entry.ttl;
    const isCorrectVersion = entry.version === CACHE_VERSION;

    return !isExpired && isCorrectVersion;
  }

  /**
   * Get data from cache
   */
  async get<T = unknown>(
    operationName: string,
    variables: OperationVariables = {},
    endpoint: string = 'client',
  ): Promise<T | null> {
    try {
      await this.ensureCacheDir();

      const cacheKey = this.generateCacheKey(operationName, variables, endpoint);
      const filePath = this.getCacheFilePath(cacheKey);

      // Check if file exists
      try {
        await fs.access(filePath);
      } catch {
        return null; // File doesn't exist
      }

      // Read and parse cache file
      const fileContent = await fs.readFile(filePath, 'utf-8');
      const cacheEntry: CacheEntry<T> = JSON.parse(fileContent);

      // Validate cache entry
      if (!this.isValidCacheEntry(cacheEntry)) {
        // Clean up expired cache
        await this.delete(operationName, variables, endpoint);
        return null;
      }

      logger.debug(`🟢 File Cache HIT for ${operationName} (${endpoint})`);
      return cacheEntry.data;
    } catch (error) {
      logger.warn(`Failed to read from file cache: ${error}`);
      return null;
    }
  }

  /**
   * Store data in cache
   */
  async set<T = unknown>(
    operationName: string,
    variables: OperationVariables = {},
    endpoint: string = 'client',
    data: T,
    ttl: number = DEFAULT_TTL,
  ): Promise<void> {
    try {
      await this.ensureCacheDir();

      const cacheKey = this.generateCacheKey(operationName, variables, endpoint);
      const filePath = this.getCacheFilePath(cacheKey);

      const cacheEntry: CacheEntry<T> = {
        data,
        timestamp: Date.now(),
        ttl,
        version: CACHE_VERSION,
        key: cacheKey,
        metadata: {
          operationName,
          variables,
          endpoint,
        },
      };

      await fs.writeFile(filePath, JSON.stringify(cacheEntry, null, 2), 'utf-8');
      logger.debug(`💾 File Cache STORED for ${operationName} (${endpoint})`);
    } catch (error) {
      logger.warn(`Failed to write to file cache: ${error}`);
    }
  }

  /**
   * Delete specific cache entry
   */
  async delete(
    operationName: string,
    variables: OperationVariables = {},
    endpoint: string = 'client',
  ): Promise<void> {
    try {
      const cacheKey = this.generateCacheKey(operationName, variables, endpoint);
      const filePath = this.getCacheFilePath(cacheKey);

      await fs.unlink(filePath);
      logger.debug(`🗑️ File Cache DELETED for ${operationName} (${endpoint})`);
    } catch {
      // File might not exist, ignore error
    }
  }

  /**
   * Clear all cache files
   */
  async clear(): Promise<void> {
    try {
      const files = await fs.readdir(CACHE_DIR);

      for (const file of files) {
        if (file.endsWith('.json')) {
          await fs.unlink(path.join(CACHE_DIR, file));
        }
      }

      logger.info('🧹 File Cache CLEARED');
    } catch (error) {
      logger.warn(`Failed to clear file cache: ${error}`);
    }
  }

  /**
   * Get cache statistics
   */
  async getStats(): Promise<{
    totalEntries: number;
    totalSize: number;
    oldestEntry?: Date;
    newestEntry?: Date;
  }> {
    try {
      await this.ensureCacheDir();
      const files = await fs.readdir(CACHE_DIR);
      const jsonFiles = files.filter((f: string) => f.endsWith('.json'));

      let totalSize = 0;
      let oldestTimestamp = Infinity;
      let newestTimestamp = 0;

      for (const file of jsonFiles) {
        const filePath = path.join(CACHE_DIR, file);
        const stats = await fs.stat(filePath);
        totalSize += stats.size;

        try {
          const content = await fs.readFile(filePath, 'utf-8');
          const entry: CacheEntry = JSON.parse(content);

          if (entry.timestamp < oldestTimestamp) {
            oldestTimestamp = entry.timestamp;
          }
          if (entry.timestamp > newestTimestamp) {
            newestTimestamp = entry.timestamp;
          }
        } catch {
          // Skip invalid cache files
        }
      }

      return {
        totalEntries: jsonFiles.length,
        totalSize,
        oldestEntry: oldestTimestamp !== Infinity ? new Date(oldestTimestamp) : undefined,
        newestEntry: newestTimestamp > 0 ? new Date(newestTimestamp) : undefined,
      };
    } catch {
      return {
        totalEntries: 0,
        totalSize: 0,
      };
    }
  }

  /**
   * Clean expired entries
   */
  async cleanExpired(): Promise<number> {
    let cleanedCount = 0;

    try {
      await this.ensureCacheDir();
      const files = await fs.readdir(CACHE_DIR);

      for (const file of files) {
        if (!file.endsWith('.json')) continue;

        try {
          const filePath = path.join(CACHE_DIR, file);
          const content = await fs.readFile(filePath, 'utf-8');
          const entry: CacheEntry = JSON.parse(content);

          if (!this.isValidCacheEntry(entry)) {
            await fs.unlink(filePath);
            cleanedCount++;
          }
        } catch {
          // If we can't parse the file, delete it
          await fs.unlink(path.join(CACHE_DIR, file));
          cleanedCount++;
        }
      }

      if (cleanedCount > 0) {
        logger.info(`🧹 Cleaned ${cleanedCount} expired cache entries`);
      }
    } catch (error) {
      logger.warn(`Failed to clean expired cache: ${error}`);
    }

    return cleanedCount;
  }
}
