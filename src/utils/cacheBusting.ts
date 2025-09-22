/**
 * Cache busting utilities for ensuring fresh content delivery
 */

import { getBaseUrl } from './envUtils';

// Fallback version info for development when version files don't exist
const FALLBACK_VERSION_INFO = {
  version: '0.1.0',
  buildTime: new Date().toISOString(),
  gitCommit: 'dev-commit',
  shortCommit: 'dev',
  buildId: `0.1.0-dev-${Date.now()}`,
  timestamp: Date.now(),
  cacheBuster: `v=dev${Date.now()}`,
} as const;

// Start with undefined, will be updated once version loads
let VERSION_INFO: typeof FALLBACK_VERSION_INFO | undefined = undefined;
let cacheBuster: string = FALLBACK_VERSION_INFO.cacheBuster;

// Load version info asynchronously from the public directory
const loadVersionInfo = async (): Promise<typeof FALLBACK_VERSION_INFO> => {
  try {
    // Try to fetch version.json from the public directory, respecting BASE_URL
    const baseUrl = getBaseUrl();
    const versionUrl = `${baseUrl}version.json?t=${Date.now()}`;
    const response = await fetch(versionUrl);
    if (response.ok) {
      const versionData = (await response.json()) as typeof FALLBACK_VERSION_INFO;
      VERSION_INFO = versionData;
      cacheBuster = versionData.cacheBuster;
      return versionData;
    }
  } catch {
    // Fall back to default version only if fetch fails
    // eslint-disable-next-line no-console
    console.debug('Could not load version.json, using fallback');
    VERSION_INFO = FALLBACK_VERSION_INFO;
    cacheBuster = FALLBACK_VERSION_INFO.cacheBuster;
  }
  return VERSION_INFO || FALLBACK_VERSION_INFO;
};

// Store the loading promise so we can wait for it
const versionLoadingPromise = loadVersionInfo();

/**
 * Add cache-busting parameter to a URL
 * @param url - The base URL
 * @param customVersion - Optional custom version parameter
 * @returns URL with cache-busting parameter
 */
export const addCacheBuster = (url: string, customVersion?: string): string => {
  const versionParam = customVersion || cacheBuster;
  const separator = url.includes('?') ? '&' : '?';
  return `${url}${separator}${versionParam}`;
};

/**
 * Get the current build version information
 * @returns Version information object, or undefined if not loaded yet
 */
export const getBuildInfo = (): typeof FALLBACK_VERSION_INFO | undefined => {
  return VERSION_INFO;
};

/**
 * Get the current build version information asynchronously
 * This ensures the version is loaded from the server
 * @returns Promise with version information object
 */
export const getBuildInfoAsync = async (): Promise<typeof VERSION_INFO> => {
  // If VERSION_INFO is undefined (e.g., after reset), reload
  if (!VERSION_INFO) {
    return await loadVersionInfo();
  }
  await versionLoadingPromise;
  return VERSION_INFO || FALLBACK_VERSION_INFO;
};

/**
 * Check if a cached resource should be invalidated
 * @param cachedTimestamp - Timestamp of the cached resource
 * @param maxAge - Maximum age in milliseconds (default: 1 hour)
 * @returns true if cache should be invalidated
 */
export const shouldInvalidateCache = (
  cachedTimestamp: number,
  maxAge: number = 60 * 60 * 1000, // 1 hour
): boolean => {
  const now = Date.now();
  const age = now - cachedTimestamp;

  // Always invalidate if build is newer than cache
  if (VERSION_INFO && VERSION_INFO.timestamp > cachedTimestamp) {
    return true;
  }

  // Invalidate if cache is older than maxAge
  return age > maxAge;
};

/**
 * Generate cache headers for HTTP responses
 * @param maxAge - Cache max age in seconds
 * @returns Cache control headers object
 */
export const getCacheHeaders = (maxAge = 3600): Record<string, string> => {
  if (!VERSION_INFO) {
    return {
      'Cache-Control': `public, max-age=${maxAge}, must-revalidate`,
    };
  }
  return {
    'Cache-Control': `public, max-age=${maxAge}, must-revalidate`,
    ETag: `"${VERSION_INFO.buildId}"`,
    'Last-Modified': new Date(VERSION_INFO.buildTime).toUTCString(),
  };
};

/**
 * Create a versioned URL for assets
 * @param assetPath - Path to the asset
 * @param baseUrl - Base URL (optional)
 * @returns Versioned asset URL
 */
export const createVersionedAssetUrl = (assetPath: string, baseUrl?: string): string => {
  const base = baseUrl || '';
  const fullPath = base + assetPath;
  return addCacheBuster(fullPath);
};

/**
 * Check if current version matches a stored version
 * @param storedVersion - Previously stored version string
 * @returns true if versions match
 */
export const isCurrentVersion = (storedVersion?: string): boolean => {
  if (!storedVersion || !VERSION_INFO?.buildId) {
    return false;
  }
  return storedVersion === VERSION_INFO.buildId;
};

/**
 * Get cache-busting query string
 * @returns Query string for cache busting
 */
export const getCacheBustingQuery = (): string => {
  return cacheBuster;
};

/**
 * Format version for display
 * @returns Human-readable version string, or undefined if not loaded
 */
export const getDisplayVersion = (): string | undefined => {
  if (!VERSION_INFO) return undefined;
  return `v${VERSION_INFO.version} (${VERSION_INFO.shortCommit})`;
};

/**
 * Check if this is a development build
 * @returns true if development build
 */
export const isDevelopmentBuild = (): boolean => {
  if (!VERSION_INFO) return true; // Assume dev if version not loaded
  return VERSION_INFO.gitCommit.length === 40 ? false : true; // Real git commits are 40 chars
};

/**
 * Reset the version info for testing purposes
 * @internal This function is intended for testing only
 */
export const __resetVersionInfoForTesting = (): void => {
  VERSION_INFO = undefined;
  cacheBuster = FALLBACK_VERSION_INFO.cacheBuster;
};
