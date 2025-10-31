import {
  CacheOperationType,
  cacheMetricsLogger,
  logCacheClear,
  logCacheEvict,
  logCacheHit,
  logCacheMiss,
  logCacheSet,
  type CacheOperationMetrics,
} from './cacheMetrics';

describe('cacheMetrics', () => {
  beforeEach(() => {
    cacheMetricsLogger.clear();
    cacheMetricsLogger.setEnabled(false);
  });

  afterEach(() => {
    cacheMetricsLogger.setEnabled(false);
    cacheMetricsLogger.clear();
  });

  describe('CacheMetricsLogger', () => {
    it('should not log operations when disabled', () => {
      cacheMetricsLogger.setEnabled(false);

      logCacheHit('testCache', 'key1::1');
      logCacheMiss('testCache', 'key2::2');

      const stats = cacheMetricsLogger.getStatistics('testCache');
      expect(stats).toBeNull();
    });

    it('should log operations when enabled', () => {
      cacheMetricsLogger.setEnabled(true);

      logCacheHit('testCache', 'key1::1');
      logCacheMiss('testCache', 'key2::2');
      logCacheSet('testCache', 'key2::2');

      const stats = cacheMetricsLogger.getStatistics('testCache');
      expect(stats).not.toBeNull();
      expect(stats?.hits).toBe(1);
      expect(stats?.misses).toBe(1);
      expect(stats?.sets).toBe(1);
    });

    it('should calculate hit rate correctly', () => {
      cacheMetricsLogger.setEnabled(true);

      logCacheHit('testCache', 'key1::1');
      logCacheHit('testCache', 'key1::1');
      logCacheHit('testCache', 'key1::1');
      logCacheMiss('testCache', 'key2::2');

      const stats = cacheMetricsLogger.getStatistics('testCache');
      expect(stats?.hitRate).toBe(0.75); // 3 hits / 4 total accesses
    });

    it('should track multiple caches separately', () => {
      cacheMetricsLogger.setEnabled(true);

      logCacheHit('cache1', 'key1::1');
      logCacheHit('cache1', 'key2::2');
      logCacheMiss('cache2', 'key3::3');

      const stats1 = cacheMetricsLogger.getStatistics('cache1');
      const stats2 = cacheMetricsLogger.getStatistics('cache2');

      expect(stats1?.hits).toBe(2);
      expect(stats1?.misses).toBe(0);
      expect(stats2?.hits).toBe(0);
      expect(stats2?.misses).toBe(1);
    });

    it('should track current cache size', () => {
      cacheMetricsLogger.setEnabled(true);

      logCacheSet('testCache', 'key1::1', {
        createdAt: Date.now(),
        lastAccessedAt: Date.now(),
        accessCount: 1,
        estimatedSize: 1000,
      });
      logCacheSet('testCache', 'key2::2', {
        createdAt: Date.now(),
        lastAccessedAt: Date.now(),
        accessCount: 1,
        estimatedSize: 2000,
      });

      const stats = cacheMetricsLogger.getStatistics('testCache');
      expect(stats?.currentSize).toBe(2);
      expect(stats?.totalSizeBytes).toBe(3000);
    });

    it('should update size when entries are evicted', () => {
      cacheMetricsLogger.setEnabled(true);

      logCacheSet('testCache', 'key1::1', {
        createdAt: Date.now(),
        lastAccessedAt: Date.now(),
        accessCount: 1,
        estimatedSize: 1000,
      });
      logCacheSet('testCache', 'key2::2', {
        createdAt: Date.now(),
        lastAccessedAt: Date.now(),
        accessCount: 1,
        estimatedSize: 2000,
      });
      logCacheEvict('testCache', 'key1::1');

      const stats = cacheMetricsLogger.getStatistics('testCache');
      expect(stats?.currentSize).toBe(1);
      expect(stats?.evictions).toBe(1);
    });

    it('should clear all entries on cache clear operation', () => {
      cacheMetricsLogger.setEnabled(true);

      logCacheSet('testCache', 'key1::1');
      logCacheSet('testCache', 'key2::2');
      logCacheClear('testCache');

      const stats = cacheMetricsLogger.getStatistics('testCache');
      expect(stats?.currentSize).toBe(0);
      expect(stats?.clears).toBe(1);
    });

    it('should return all statistics for all caches', () => {
      cacheMetricsLogger.setEnabled(true);

      logCacheHit('cache1', 'key1::1');
      logCacheMiss('cache2', 'key2::2');
      logCacheSet('cache3', 'key3::3');

      const allStats = cacheMetricsLogger.getAllStatistics();
      expect(Object.keys(allStats)).toHaveLength(3);
      expect(allStats['cache1']).toBeDefined();
      expect(allStats['cache2']).toBeDefined();
      expect(allStats['cache3']).toBeDefined();
    });

    it('should return empty object when disabled', () => {
      cacheMetricsLogger.setEnabled(false);

      logCacheHit('testCache', 'key1::1');

      const allStats = cacheMetricsLogger.getAllStatistics();
      expect(allStats).toEqual({});
    });

    it('should clear all metrics', () => {
      cacheMetricsLogger.setEnabled(true);

      logCacheHit('testCache', 'key1::1');
      logCacheMiss('testCache', 'key2::2');

      cacheMetricsLogger.clear();

      const stats = cacheMetricsLogger.getStatistics('testCache');
      expect(stats).toBeNull();
    });

    it('should clear metrics when disabled', () => {
      cacheMetricsLogger.setEnabled(true);
      logCacheHit('testCache', 'key1::1');

      cacheMetricsLogger.setEnabled(false);

      const stats = cacheMetricsLogger.getStatistics('testCache');
      expect(stats).toBeNull();
    });
  });

  describe('helper functions', () => {
    beforeEach(() => {
      cacheMetricsLogger.setEnabled(true);
    });

    it('should log cache hit with correct operation type', () => {
      const logSpy = jest.spyOn(cacheMetricsLogger, 'logOperation');
      logCacheHit('testCache', 'key1::1');

      expect(logSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          operation: CacheOperationType.HIT,
          cacheName: 'testCache',
          cacheKey: 'key1::1',
        }),
      );
    });

    it('should log cache miss with correct operation type', () => {
      const logSpy = jest.spyOn(cacheMetricsLogger, 'logOperation');
      logCacheMiss('testCache', 'key2::2');

      expect(logSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          operation: CacheOperationType.MISS,
          cacheName: 'testCache',
          cacheKey: 'key2::2',
        }),
      );
    });

    it('should log cache set with metadata', () => {
      const logSpy = jest.spyOn(cacheMetricsLogger, 'logOperation');
      const metadata = {
        createdAt: Date.now(),
        lastAccessedAt: Date.now(),
        accessCount: 1,
        estimatedSize: 500,
      };

      logCacheSet('testCache', 'key3::3', metadata);

      expect(logSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          operation: CacheOperationType.SET,
          cacheName: 'testCache',
          cacheKey: 'key3::3',
          metadata,
        }),
      );
    });

    it('should log cache evict', () => {
      const logSpy = jest.spyOn(cacheMetricsLogger, 'logOperation');
      logCacheEvict('testCache', 'key4::4');

      expect(logSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          operation: CacheOperationType.EVICT,
          cacheName: 'testCache',
          cacheKey: 'key4::4',
        }),
      );
    });

    it('should log cache clear', () => {
      const logSpy = jest.spyOn(cacheMetricsLogger, 'logOperation');
      logCacheClear('testCache');

      expect(logSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          operation: CacheOperationType.CLEAR,
          cacheName: 'testCache',
          cacheKey: '__all__',
        }),
      );
    });
  });
});
