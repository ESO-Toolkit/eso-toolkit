/**
 * Cache busting utilities for ensuring fresh content delivery
 */

import { VERSION_INFO, cacheBuster } from './version';

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
 * @returns Version information object
 */
export const getBuildInfo = (): typeof VERSION_INFO => VERSION_INFO;

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
  if (VERSION_INFO.timestamp > cachedTimestamp) {
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
export const getCacheHeaders = (maxAge = 3600): Record<string, string> => ({
  'Cache-Control': `public, max-age=${maxAge}, must-revalidate`,
  ETag: `"${VERSION_INFO.buildId}"`,
  'Last-Modified': new Date(VERSION_INFO.buildTime).toUTCString(),
});

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
 * @returns Human-readable version string
 */
export const getDisplayVersion = (): string => {
  return `v${VERSION_INFO.version} (${VERSION_INFO.shortCommit})`;
};

/**
 * Check if this is a development build
 * @returns true if development build
 */
export const isDevelopmentBuild = (): boolean => {
  return VERSION_INFO.gitCommit.length === 40 ? false : true; // Real git commits are 40 chars
};
