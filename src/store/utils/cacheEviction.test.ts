import {
  calculateTotalCacheSize,
  createCacheEntryMetadata,
  DEFAULT_CACHE_EVICTION_CONFIG,
  determineEvictionCandidates,
  isCacheEntryStale,
  touchCacheEntryMetadata,
  type CacheEntryMetadata,
} from './cacheEviction';

describe('cacheEviction', () => {
  describe('createCacheEntryMetadata', () => {
    it('should create metadata with current timestamp', () => {
      const before = Date.now();
      const metadata = createCacheEntryMetadata();
      const after = Date.now();

      expect(metadata.createdAt).toBeGreaterThanOrEqual(before);
      expect(metadata.createdAt).toBeLessThanOrEqual(after);
      expect(metadata.lastAccessedAt).toBe(metadata.createdAt);
      expect(metadata.accessCount).toBe(1);
      expect(metadata.estimatedSize).toBeUndefined();
    });

    it('should include estimated size when provided', () => {
      const metadata = createCacheEntryMetadata(1024);
      expect(metadata.estimatedSize).toBe(1024);
    });
  });

  describe('touchCacheEntryMetadata', () => {
    beforeEach(() => {
      jest.useFakeTimers();
    });

    afterEach(() => {
      jest.useRealTimers();
    });

    it('should update lastAccessedAt and increment accessCount', () => {
      const original = createCacheEntryMetadata(512);
      const originalTime = original.lastAccessedAt;

      // Wait a tiny bit to ensure timestamp changes
      jest.advanceTimersByTime(100);

      const touched = touchCacheEntryMetadata(original);

      expect(touched.createdAt).toBe(original.createdAt);
      expect(touched.lastAccessedAt).toBeGreaterThan(originalTime);
      expect(touched.accessCount).toBe(original.accessCount + 1);
      expect(touched.estimatedSize).toBe(original.estimatedSize);
    });

    it('should preserve estimated size', () => {
      const metadata = createCacheEntryMetadata(2048);
      const touched = touchCacheEntryMetadata(metadata);
      expect(touched.estimatedSize).toBe(2048);
    });
  });

  describe('isCacheEntryStale', () => {
    it('should return true if entry exceeds maxAge', () => {
      const metadata: CacheEntryMetadata = {
        createdAt: Date.now() - 60000,
        lastAccessedAt: Date.now() - 60000,
        accessCount: 5,
      };

      expect(isCacheEntryStale(metadata, 30000)).toBe(true);
    });

    it('should return false if entry is within maxAge', () => {
      const metadata: CacheEntryMetadata = {
        createdAt: Date.now() - 10000,
        lastAccessedAt: Date.now() - 10000,
        accessCount: 3,
      };

      expect(isCacheEntryStale(metadata, 30000)).toBe(false);
    });
  });

  describe('determineEvictionCandidates', () => {
    it('should evict stale entries based on maxAge', () => {
      const now = Date.now();
      const entries = {
        'key1::1': { data: 'fresh' },
        'key2::2': { data: 'stale' },
        'key3::3': { data: 'fresh' },
      };

      const metadata = {
        'key1::1': {
          createdAt: now - 10000,
          lastAccessedAt: now - 10000,
          accessCount: 2,
        },
        'key2::2': {
          createdAt: now - 100000,
          lastAccessedAt: now - 100000,
          accessCount: 1,
        },
        'key3::3': {
          createdAt: now - 5000,
          lastAccessedAt: now - 5000,
          accessCount: 3,
        },
      };

      const candidates = determineEvictionCandidates(entries, metadata, {
        maxAgeMs: 50000,
        maxEntries: 10,
      });

      expect(candidates).toEqual(['key2::2']);
    });

    it('should evict oldest entries when exceeding maxEntries', () => {
      const now = Date.now();
      const entries = {
        'key1::1': { data: 'oldest' },
        'key2::2': { data: 'middle' },
        'key3::3': { data: 'newest' },
      };

      const metadata = {
        'key1::1': {
          createdAt: now - 30000,
          lastAccessedAt: now - 30000,
          accessCount: 1,
        },
        'key2::2': {
          createdAt: now - 20000,
          lastAccessedAt: now - 20000,
          accessCount: 2,
        },
        'key3::3': {
          createdAt: now - 10000,
          lastAccessedAt: now - 10000,
          accessCount: 3,
        },
      };

      const candidates = determineEvictionCandidates(entries, metadata, {
        maxEntries: 2,
        maxAgeMs: Number.POSITIVE_INFINITY,
      });

      expect(candidates).toContain('key1::1');
      expect(candidates).toHaveLength(1);
    });

    it('should evict entries to meet size constraints', () => {
      const now = Date.now();
      const entries = {
        'key1::1': { data: 'large' },
        'key2::2': { data: 'medium' },
        'key3::3': { data: 'small' },
      };

      const metadata = {
        'key1::1': {
          createdAt: now - 30000,
          lastAccessedAt: now - 30000,
          accessCount: 1,
          estimatedSize: 5000,
        },
        'key2::2': {
          createdAt: now - 20000,
          lastAccessedAt: now - 20000,
          accessCount: 2,
          estimatedSize: 3000,
        },
        'key3::3': {
          createdAt: now - 10000,
          lastAccessedAt: now - 10000,
          accessCount: 3,
          estimatedSize: 1000,
        },
      };

      const candidates = determineEvictionCandidates(entries, metadata, {
        maxEntries: 10,
        maxAgeMs: Number.POSITIVE_INFINITY,
        maxSizeBytes: 4000,
      });

      // Should evict oldest entries until size is under limit
      expect(candidates).toContain('key1::1');
    });

    it('should return empty array when no eviction needed', () => {
      const now = Date.now();
      const entries = {
        'key1::1': { data: 'fresh' },
        'key2::2': { data: 'fresh' },
      };

      const metadata = {
        'key1::1': {
          createdAt: now - 10000,
          lastAccessedAt: now - 10000,
          accessCount: 2,
        },
        'key2::2': {
          createdAt: now - 5000,
          lastAccessedAt: now - 5000,
          accessCount: 3,
        },
      };

      const candidates = determineEvictionCandidates(entries, metadata, {
        maxEntries: 10,
        maxAgeMs: DEFAULT_CACHE_EVICTION_CONFIG.maxAgeMs,
      });

      expect(candidates).toEqual([]);
    });
  });

  describe('calculateTotalCacheSize', () => {
    it('should sum all entry sizes', () => {
      const metadata = {
        'key1::1': {
          createdAt: Date.now(),
          lastAccessedAt: Date.now(),
          accessCount: 1,
          estimatedSize: 1000,
        },
        'key2::2': {
          createdAt: Date.now(),
          lastAccessedAt: Date.now(),
          accessCount: 2,
          estimatedSize: 2500,
        },
        'key3::3': {
          createdAt: Date.now(),
          lastAccessedAt: Date.now(),
          accessCount: 3,
          estimatedSize: 500,
        },
      };

      const total = calculateTotalCacheSize(metadata);
      expect(total).toBe(4000);
    });

    it('should return 0 for empty metadata', () => {
      const total = calculateTotalCacheSize({});
      expect(total).toBe(0);
    });

    it('should ignore entries without estimatedSize', () => {
      const metadata = {
        'key1::1': {
          createdAt: Date.now(),
          lastAccessedAt: Date.now(),
          accessCount: 1,
          estimatedSize: 1000,
        },
        'key2::2': {
          createdAt: Date.now(),
          lastAccessedAt: Date.now(),
          accessCount: 2,
        },
      };

      const total = calculateTotalCacheSize(metadata);
      expect(total).toBe(1000);
    });
  });
});
