import type { ReportFightCacheKey } from '../contextTypes';

import type { CacheEntryMetadata } from './cacheEviction';

/**
 * Cache operation types for metrics tracking.
 */
export enum CacheOperationType {
  HIT = 'hit',
  MISS = 'miss',
  SET = 'set',
  EVICT = 'evict',
  CLEAR = 'clear',
}

/**
 * Metrics for a single cache operation.
 */
export interface CacheOperationMetrics {
  /** Type of operation */
  operation: CacheOperationType;
  /** Cache key involved */
  cacheKey: ReportFightCacheKey;
  /** Timestamp of operation */
  timestamp: number;
  /** Name/identifier of the cache (e.g., 'damageEvents', 'playerData') */
  cacheName: string;
  /** Optional metadata about the entry */
  metadata?: CacheEntryMetadata;
}

/**
 * Aggregated cache statistics.
 */
export interface CacheStatistics {
  /** Cache name/identifier */
  cacheName: string;
  /** Total number of hits */
  hits: number;
  /** Total number of misses */
  misses: number;
  /** Total number of sets */
  sets: number;
  /** Total number of evictions */
  evictions: number;
  /** Total number of clears */
  clears: number;
  /** Hit rate (hits / (hits + misses)) */
  hitRate: number;
  /** Current number of entries */
  currentSize: number;
  /** Total estimated size in bytes */
  totalSizeBytes: number;
}

/**
 * Interface for cache metrics logging.
 */
export interface CacheMetricsLogger {
  /** Log a cache operation */
  logOperation(metrics: CacheOperationMetrics): void;
  /** Get statistics for a specific cache */
  getStatistics(cacheName: string): CacheStatistics | null;
  /** Get statistics for all caches */
  getAllStatistics(): Record<string, CacheStatistics>;
  /** Clear all metrics */
  clear(): void;
  /** Enable/disable logging */
  setEnabled(enabled: boolean): void;
  /** Check if logging is enabled */
  isEnabled(): boolean;
}

/**
 * In-memory implementation of cache metrics logger.
 * Only active when explicitly enabled via environment or runtime flag.
 */
class InMemoryCacheMetricsLogger implements CacheMetricsLogger {
  private enabled: boolean = false;
  private operations: CacheOperationMetrics[] = [];
  private statisticsCache: Map<string, CacheStatistics> = new Map();

  constructor() {
    // Default to disabled - must be explicitly enabled
    this.enabled = false;
  }

  setEnabled(enabled: boolean): void {
    this.enabled = enabled;
    if (!enabled) {
      this.clear();
    }
  }

  isEnabled(): boolean {
    return this.enabled;
  }

  logOperation(metrics: CacheOperationMetrics): void {
    if (!this.enabled) return;

    this.operations.push(metrics);
    this.invalidateStatistics(metrics.cacheName);

    // Optional: Log to console in dev mode
    if (process.env.NODE_ENV === 'development' && typeof console !== 'undefined') {
      // eslint-disable-next-line no-console
      console.debug('[Cache Metrics]', metrics);
    }
  }

  getStatistics(cacheName: string): CacheStatistics | null {
    if (!this.enabled) return null;

    if (this.statisticsCache.has(cacheName)) {
      return this.statisticsCache.get(cacheName)!;
    }

    const ops = this.operations.filter((op) => op.cacheName === cacheName);
    if (ops.length === 0) return null;

    const stats = this.calculateStatistics(cacheName, ops);
    this.statisticsCache.set(cacheName, stats);
    return stats;
  }

  getAllStatistics(): Record<string, CacheStatistics> {
    if (!this.enabled) return {};

    const cacheNames = new Set(this.operations.map((op) => op.cacheName));
    const result: Record<string, CacheStatistics> = {};

    for (const cacheName of cacheNames) {
      const stats = this.getStatistics(cacheName);
      if (stats) {
        result[cacheName] = stats;
      }
    }

    return result;
  }

  clear(): void {
    this.operations = [];
    this.statisticsCache.clear();
  }

  private invalidateStatistics(cacheName: string): void {
    this.statisticsCache.delete(cacheName);
  }

  private calculateStatistics(cacheName: string, ops: CacheOperationMetrics[]): CacheStatistics {
    let hits = 0;
    let misses = 0;
    let sets = 0;
    let evictions = 0;
    let clears = 0;

    const activeEntries = new Map<ReportFightCacheKey, CacheEntryMetadata>();

    for (const op of ops) {
      switch (op.operation) {
        case CacheOperationType.HIT:
          hits++;
          break;
        case CacheOperationType.MISS:
          misses++;
          break;
        case CacheOperationType.SET:
          sets++;
          if (op.metadata) {
            activeEntries.set(op.cacheKey, op.metadata);
          }
          break;
        case CacheOperationType.EVICT:
          evictions++;
          activeEntries.delete(op.cacheKey);
          break;
        case CacheOperationType.CLEAR:
          clears++;
          activeEntries.clear();
          break;
      }
    }

    const totalSizeBytes = Array.from(activeEntries.values()).reduce(
      (sum, meta) => sum + (meta.estimatedSize ?? 0),
      0,
    );

    const hitRate = hits + misses > 0 ? hits / (hits + misses) : 0;

    return {
      cacheName,
      hits,
      misses,
      sets,
      evictions,
      clears,
      hitRate,
      currentSize: activeEntries.size,
      totalSizeBytes,
    };
  }
}

/**
 * Singleton instance of the cache metrics logger.
 * Usage:
 *   import { cacheMetricsLogger } from '@/store/utils/cacheMetrics';
 *   cacheMetricsLogger.setEnabled(true); // Enable logging
 *   cacheMetricsLogger.logOperation({ ... }); // Log operations
 *   const stats = cacheMetricsLogger.getAllStatistics(); // View stats
 */
export const cacheMetricsLogger: CacheMetricsLogger = new InMemoryCacheMetricsLogger();

/**
 * Helper to log a cache hit.
 */
export const logCacheHit = (cacheName: string, cacheKey: ReportFightCacheKey): void => {
  cacheMetricsLogger.logOperation({
    operation: CacheOperationType.HIT,
    cacheKey,
    timestamp: Date.now(),
    cacheName,
  });
};

/**
 * Helper to log a cache miss.
 */
export const logCacheMiss = (cacheName: string, cacheKey: ReportFightCacheKey): void => {
  cacheMetricsLogger.logOperation({
    operation: CacheOperationType.MISS,
    cacheKey,
    timestamp: Date.now(),
    cacheName,
  });
};

/**
 * Helper to log a cache set operation.
 */
export const logCacheSet = (
  cacheName: string,
  cacheKey: ReportFightCacheKey,
  metadata?: CacheEntryMetadata,
): void => {
  cacheMetricsLogger.logOperation({
    operation: CacheOperationType.SET,
    cacheKey,
    timestamp: Date.now(),
    cacheName,
    metadata,
  });
};

/**
 * Helper to log a cache eviction.
 */
export const logCacheEvict = (
  cacheName: string,
  cacheKey: ReportFightCacheKey,
  metadata?: CacheEntryMetadata,
): void => {
  cacheMetricsLogger.logOperation({
    operation: CacheOperationType.EVICT,
    cacheKey,
    timestamp: Date.now(),
    cacheName,
    metadata,
  });
};

/**
 * Helper to log a cache clear operation.
 */
export const logCacheClear = (cacheName: string): void => {
  cacheMetricsLogger.logOperation({
    operation: CacheOperationType.CLEAR,
    cacheKey: '__all__' as ReportFightCacheKey,
    timestamp: Date.now(),
    cacheName,
  });
};
