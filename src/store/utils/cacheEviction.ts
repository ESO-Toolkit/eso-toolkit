import type { ReportFightCacheKey } from '../contextTypes';

/**
 * Metadata tracked per cache entry to support eviction policies.
 */
export interface CacheEntryMetadata {
  /** Timestamp (ms) when the entry was first created. */
  createdAt: number;
  /** Timestamp (ms) when the entry was last accessed/updated. */
  lastAccessedAt: number;
  /** Number of times the entry has been accessed. */
  accessCount: number;
  /** Estimated size in bytes (if applicable). */
  estimatedSize?: number;
}

/**
 * Configuration for cache eviction policies.
 */
export interface CacheEvictionConfig {
  /** Maximum number of entries to keep. Default: 10 */
  maxEntries?: number;
  /** Maximum age in milliseconds before entry is considered stale. Default: 30 minutes */
  maxAgeMs?: number;
  /** Maximum total estimated size in bytes. Default: undefined (no size limit) */
  maxSizeBytes?: number;
}

/**
 * Default eviction configuration values.
 */
export const DEFAULT_CACHE_EVICTION_CONFIG: Required<CacheEvictionConfig> = {
  maxEntries: 10,
  maxAgeMs: 30 * 60 * 1000, // 30 minutes
  maxSizeBytes: Number.POSITIVE_INFINITY,
};

/**
 * Creates initial metadata for a new cache entry.
 */
export const createCacheEntryMetadata = (estimatedSize?: number): CacheEntryMetadata => {
  const now = Date.now();
  return {
    createdAt: now,
    lastAccessedAt: now,
    accessCount: 1,
    estimatedSize,
  };
};

/**
 * Updates metadata when a cache entry is accessed.
 */
export const touchCacheEntryMetadata = (metadata: CacheEntryMetadata): CacheEntryMetadata => ({
  ...metadata,
  lastAccessedAt: Date.now(),
  accessCount: metadata.accessCount + 1,
});

/**
 * Checks if a cache entry is stale based on max age.
 */
export const isCacheEntryStale = (metadata: CacheEntryMetadata, maxAgeMs: number): boolean => {
  return Date.now() - metadata.lastAccessedAt > maxAgeMs;
};

/**
 * Determines which cache entries should be evicted based on the provided policy.
 * Returns keys to evict, sorted by priority (least important first).
 */
export const determineEvictionCandidates = <TEntry>(
  entries: Record<ReportFightCacheKey, TEntry>,
  metadata: Record<ReportFightCacheKey, CacheEntryMetadata>,
  config: CacheEvictionConfig = {},
): ReportFightCacheKey[] => {
  const {
    maxEntries = DEFAULT_CACHE_EVICTION_CONFIG.maxEntries,
    maxAgeMs = DEFAULT_CACHE_EVICTION_CONFIG.maxAgeMs,
    maxSizeBytes = DEFAULT_CACHE_EVICTION_CONFIG.maxSizeBytes,
  } = config;

  const keys = Object.keys(entries) as ReportFightCacheKey[];
  const keysToEvict: ReportFightCacheKey[] = [];

  // First pass: Remove stale entries
  for (const key of keys) {
    const meta = metadata[key];
    if (meta && isCacheEntryStale(meta, maxAgeMs)) {
      keysToEvict.push(key);
    }
  }

  // Second pass: Check size constraints
  if (maxSizeBytes < Number.POSITIVE_INFINITY) {
    const remainingKeys = keys.filter((k) => !keysToEvict.includes(k));
    let totalSize = 0;

    // Sort by last accessed (oldest first) for size-based eviction
    const sortedByAccess = [...remainingKeys].sort((a, b) => {
      const metaA = metadata[a];
      const metaB = metadata[b];
      return (metaA?.lastAccessedAt ?? 0) - (metaB?.lastAccessedAt ?? 0);
    });

    // Calculate total size
    for (const key of sortedByAccess) {
      const meta = metadata[key];
      if (meta?.estimatedSize) {
        totalSize += meta.estimatedSize;
      }
    }

    // Evict oldest entries until under size limit
    for (const key of sortedByAccess) {
      if (totalSize <= maxSizeBytes) break;
      const meta = metadata[key];
      if (meta?.estimatedSize) {
        totalSize -= meta.estimatedSize;
        keysToEvict.push(key);
      }
    }
  }

  // Third pass: Check entry count
  const remainingKeys = keys.filter((k) => !keysToEvict.includes(k));
  if (remainingKeys.length > maxEntries) {
    // Sort by LRU (Least Recently Used)
    const sortedByLRU = [...remainingKeys].sort((a, b) => {
      const metaA = metadata[a];
      const metaB = metadata[b];
      return (metaA?.lastAccessedAt ?? 0) - (metaB?.lastAccessedAt ?? 0);
    });

    const excess = sortedByLRU.length - maxEntries;
    keysToEvict.push(...sortedByLRU.slice(0, excess));
  }

  return keysToEvict;
};

/**
 * Calculates total estimated size of all cache entries.
 */
export const calculateTotalCacheSize = (
  metadata: Record<ReportFightCacheKey, CacheEntryMetadata>,
): number => {
  return Object.values(metadata).reduce((sum, meta) => sum + (meta.estimatedSize ?? 0), 0);
};
