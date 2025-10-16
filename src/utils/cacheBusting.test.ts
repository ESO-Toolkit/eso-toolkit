import {
  addCacheBuster,
  getBuildInfo,
  getBuildInfoAsync,
  shouldInvalidateCache,
  getCacheHeaders,
  createVersionedAssetUrl,
  isCurrentVersion,
  getCacheBustingQuery,
  getDisplayVersion,
  isDevelopmentBuild,
  __resetVersionInfoForTesting,
} from './cacheBusting';

// Import the mocked function - it's already mocked globally in setupTests.ts
import { getBaseUrl } from './envUtils';
const mockGetBaseUrl = getBaseUrl as jest.MockedFunction<typeof getBaseUrl>;

// Mock fetch globally
const mockFetch = jest.fn();
global.fetch = mockFetch;

describe('cacheBusting', () => {
  // Use a consistent base timestamp for testing
  const baseTimestamp = 1697364600000; // October 15, 2023

  const mockVersionInfo = {
    version: '2.1.0',
    buildTime: '2023-10-15T10:30:00.000Z',
    gitCommit: 'abcd1234567890abcd1234567890abcd12345678',
    shortCommit: 'abcd123',
    buildId: '2.1.0-abcd123-1697364600000',
    timestamp: baseTimestamp,
    cacheBuster: 'v=2.1.0-abcd123',
  };

  const fallbackVersionInfo = {
    version: '0.1.0',
    buildTime: expect.any(String),
    gitCommit: 'dev-commit',
    shortCommit: 'dev',
    buildId: expect.stringMatching(/^0\.1\.0-dev-\d+$/),
    timestamp: expect.any(Number),
    cacheBuster: expect.stringMatching(/^v=dev\d+$/),
  };

  beforeEach(() => {
    jest.clearAllMocks();

    // Reset the module state to ensure clean tests
    __resetVersionInfoForTesting();

    mockGetBaseUrl.mockReturnValue('https://example.com/');

    // Set up default fetch mock to return version info
    mockFetch.mockResolvedValue({
      ok: true,
      json: () =>
        Promise.resolve({
          version: '0.1.0',
          buildTime: new Date().toISOString(),
          gitCommit: 'dev-commit',
          shortCommit: 'dev',
          buildId: `0.1.0-dev-${Date.now()}`,
          timestamp: Date.now(),
          cacheBuster: `v=dev${Date.now()}`,
        }),
    } as Response);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('addCacheBuster', () => {
    it('should add cache buster to URL without query parameters', () => {
      const result = addCacheBuster('https://example.com/app.js');
      expect(result).toMatch(/^https:\/\/example\.com\/app\.js\?v=dev\d+$/);
    });

    it('should add cache buster to URL with existing query parameters', () => {
      const result = addCacheBuster('https://example.com/app.js?param=value');
      expect(result).toMatch(/^https:\/\/example\.com\/app\.js\?param=value&v=dev\d+$/);
    });

    it('should use custom version when provided', () => {
      const result = addCacheBuster('https://example.com/app.js', 'v=custom123');
      expect(result).toBe('https://example.com/app.js?v=custom123');
    });

    it('should handle empty URLs', () => {
      const result = addCacheBuster('', 'v=test');
      expect(result).toBe('?v=test');
    });

    it('should handle URLs with fragments', () => {
      const result = addCacheBuster('https://example.com/app.js#section', 'v=test');
      expect(result).toBe('https://example.com/app.js#section?v=test');
    });
  });

  describe('getBuildInfo', () => {
    it('should return undefined initially before version is loaded', () => {
      const result = getBuildInfo();
      expect(result).toBeUndefined();
    });
  });

  describe('getBuildInfoAsync', () => {
    it('should return version info when fetch succeeds', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockVersionInfo),
      } as Response);

      const result = await getBuildInfoAsync();
      expect(result).toEqual(mockVersionInfo);
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringMatching(/^https:\/\/example\.com\/version\.json\?t=\d+$/),
      );
    });

    it('should return fallback info when fetch fails', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Network error'));

      const result = await getBuildInfoAsync();
      expect(result).toEqual(fallbackVersionInfo);
    });

    it('should return fallback info when response is not ok', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 404,
      } as Response);

      const result = await getBuildInfoAsync();
      expect(result).toEqual(fallbackVersionInfo);
    });

    it('should use correct base URL', async () => {
      mockGetBaseUrl.mockReturnValue('/custom-base/');
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockVersionInfo),
      } as Response);

      await getBuildInfoAsync();
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringMatching(/^\/custom-base\/version\.json\?t=\d+$/),
      );
    });
  });

  describe('shouldInvalidateCache', () => {
    // Use the same base timestamp as mockVersionInfo for consistent testing
    const now = baseTimestamp + 30 * 60 * 1000; // 30 minutes after build time
    const oneHourAgo = now - 60 * 60 * 1000;
    const twoHoursAgo = now - 2 * 60 * 60 * 1000;

    beforeEach(() => {
      jest.spyOn(Date, 'now').mockReturnValue(now);
    });

    afterEach(() => {
      jest.restoreAllMocks();
    });

    it('should not invalidate cache for recent timestamps within maxAge', () => {
      const fiftyNineMinutesAgo = now - 59 * 60 * 1000; // 59 minutes ago
      const result = shouldInvalidateCache(fiftyNineMinutesAgo);
      expect(result).toBe(false);
    });

    it('should invalidate cache for old timestamps beyond maxAge', () => {
      const result = shouldInvalidateCache(twoHoursAgo);
      expect(result).toBe(true);
    });

    it('should respect custom maxAge parameter', () => {
      const thirtyMinutesAgo = now - 30 * 60 * 1000;
      const customMaxAge = 15 * 60 * 1000; // 15 minutes

      const result = shouldInvalidateCache(thirtyMinutesAgo, customMaxAge);
      expect(result).toBe(true);
    });

    it('should invalidate cache when build is newer than cached timestamp', async () => {
      // First load version info
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockVersionInfo),
      } as Response);

      await getBuildInfoAsync();

      // Test with timestamp older than build
      const result = shouldInvalidateCache(mockVersionInfo.timestamp - 1000);
      expect(result).toBe(true);
    });

    it('should not invalidate cache when build is older than cached timestamp', async () => {
      // First load version info
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockVersionInfo),
      } as Response);

      await getBuildInfoAsync();

      // Test with timestamp newer than build but within maxAge
      const recentTimestamp = mockVersionInfo.timestamp + 1000;
      const result = shouldInvalidateCache(recentTimestamp);
      expect(result).toBe(false);
    });
  });

  describe('getCacheHeaders', () => {
    it('should return basic cache headers when version info not loaded', () => {
      const result = getCacheHeaders();
      expect(result).toEqual({
        'Cache-Control': 'public, max-age=3600, must-revalidate',
      });
    });

    it('should return headers with custom maxAge', () => {
      const result = getCacheHeaders(7200);
      expect(result).toEqual({
        'Cache-Control': 'public, max-age=7200, must-revalidate',
      });
    });

    it('should return complete headers when version info is loaded', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockVersionInfo),
      } as Response);

      await getBuildInfoAsync();
      const result = getCacheHeaders();

      expect(result).toEqual({
        'Cache-Control': 'public, max-age=3600, must-revalidate',
        ETag: `"${mockVersionInfo.buildId}"`,
        'Last-Modified': 'Sun, 15 Oct 2023 10:30:00 GMT',
      });
    });
  });

  describe('createVersionedAssetUrl', () => {
    it('should create versioned URL with default base', () => {
      const result = createVersionedAssetUrl('/assets/app.js');
      expect(result).toMatch(/^\/assets\/app\.js\?v=dev\d+$/);
    });

    it('should create versioned URL with custom base', () => {
      const result = createVersionedAssetUrl('/assets/app.js', 'https://cdn.example.com');
      expect(result).toMatch(/^https:\/\/cdn\.example\.com\/assets\/app\.js\?v=dev\d+$/);
    });

    it('should handle empty asset path', () => {
      const result = createVersionedAssetUrl('', 'https://example.com');
      expect(result).toMatch(/^https:\/\/example\.com\?v=dev\d+$/);
    });
  });

  describe('isCurrentVersion', () => {
    it('should return false when no stored version provided', () => {
      const result = isCurrentVersion();
      expect(result).toBe(false);
    });

    it('should return false when version info not loaded', () => {
      const result = isCurrentVersion('some-build-id');
      expect(result).toBe(false);
    });

    it('should return true when stored version matches current build ID', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockVersionInfo),
      } as Response);

      await getBuildInfoAsync();
      const result = isCurrentVersion(mockVersionInfo.buildId);
      expect(result).toBe(true);
    });

    it('should return false when stored version does not match current build ID', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockVersionInfo),
      } as Response);

      await getBuildInfoAsync();
      const result = isCurrentVersion('different-build-id');
      expect(result).toBe(false);
    });
  });

  describe('getCacheBustingQuery', () => {
    it('should return cache busting query string', () => {
      const result = getCacheBustingQuery();
      expect(result).toMatch(/^v=dev\d+$/);
    });

    it('should return updated query string after version loads', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockVersionInfo),
      } as Response);

      await getBuildInfoAsync();
      const result = getCacheBustingQuery();
      expect(result).toBe(mockVersionInfo.cacheBuster);
    });
  });

  describe('getDisplayVersion', () => {
    it('should return undefined when version info not loaded', () => {
      const result = getDisplayVersion();
      expect(result).toBeUndefined();
    });

    it('should return formatted version string when loaded', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockVersionInfo),
      } as Response);

      await getBuildInfoAsync();
      const result = getDisplayVersion();
      expect(result).toBe('v2.1.0 (abcd123)');
    });
  });

  describe('isDevelopmentBuild', () => {
    it('should return true when version info not loaded', () => {
      const result = isDevelopmentBuild();
      expect(result).toBe(true);
    });

    it('should return false for production build with full git commit', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockVersionInfo),
      } as Response);

      await getBuildInfoAsync();
      const result = isDevelopmentBuild();
      expect(result).toBe(false);
    });

    it('should return true for development build with short commit', async () => {
      const devVersionInfo = {
        ...mockVersionInfo,
        gitCommit: 'dev-commit',
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(devVersionInfo),
      } as Response);

      await getBuildInfoAsync();
      const result = isDevelopmentBuild();
      expect(result).toBe(true);
    });
  });

  describe('Error Handling', () => {
    it('should handle fetch network errors gracefully', async () => {
      const consoleDebugSpy = jest.spyOn(console, 'debug').mockImplementation();
      mockFetch.mockRejectedValueOnce(new Error('Network error'));

      const result = await getBuildInfoAsync();
      expect(result).toEqual(fallbackVersionInfo);
      expect(consoleDebugSpy).toHaveBeenCalledWith(
        expect.stringContaining('Could not load version.json, using fallback'),
      );

      consoleDebugSpy.mockRestore();
    });

    it('should handle invalid JSON response gracefully', async () => {
      const consoleDebugSpy = jest.spyOn(console, 'debug').mockImplementation();
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.reject(new Error('Invalid JSON')),
      } as Response);

      const result = await getBuildInfoAsync();
      expect(result).toEqual(fallbackVersionInfo);
      expect(consoleDebugSpy).toHaveBeenCalledWith(
        expect.stringContaining('Could not load version.json, using fallback'),
      );

      consoleDebugSpy.mockRestore();
    });
  });

  describe('Integration', () => {
    it('should maintain consistent state across multiple function calls', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockVersionInfo),
      } as Response);

      // Load version info
      await getBuildInfoAsync();

      // All functions should now use the loaded version
      expect(getBuildInfo()).toEqual(mockVersionInfo);
      expect(getCacheBustingQuery()).toBe(mockVersionInfo.cacheBuster);
      expect(getDisplayVersion()).toBe('v2.1.0 (abcd123)');
      expect(isDevelopmentBuild()).toBe(false);
      expect(isCurrentVersion(mockVersionInfo.buildId)).toBe(true);

      const versionedUrl = addCacheBuster('https://example.com/app.js');
      expect(versionedUrl).toBe(`https://example.com/app.js?${mockVersionInfo.cacheBuster}`);
    });
  });
});
