// Environment utilities for accessing Vite build-time variables
// This file can be easily mocked in tests

/**
 * Get the base URL from Vite configuration
 * If BASE_URL is already a full URL (includes origin), return it as-is
 * If BASE_URL is just a path, combine it with current origin
 */
export const getBaseUrl = (): string => {
  // Get the base URL from Vite configuration
  const baseUrl = import.meta.env.BASE_URL || '/';

  // If BASE_URL is already a full URL (starts with http/https), return it as-is
  if (baseUrl.startsWith('http://') || baseUrl.startsWith('https://')) {
    return baseUrl.endsWith('/') ? baseUrl : baseUrl + '/';
  }

  // Otherwise, it's a relative path, so we need to combine with origin
  let normalizedPath = baseUrl;
  if (!normalizedPath.startsWith('/')) {
    normalizedPath = '/' + normalizedPath;
  }
  if (!normalizedPath.endsWith('/')) {
    normalizedPath = normalizedPath + '/';
  }

  // If we're in SSR context (no window), return just the path
  if (typeof window === 'undefined') {
    return normalizedPath;
  }

  // Combine origin with the path
  return window.location.origin + normalizedPath;
};

/**
 * Get the mode (development, production, etc.)
 */
export const getMode = (): string => {
  return import.meta.env.MODE;
};

/**
 * Check if we're in development mode
 */
export const isDevelopment = (): boolean => {
  return import.meta.env.DEV;
};

/**
 * Check if we're in production mode
 */
export const isProduction = (): boolean => {
  return import.meta.env.PROD;
};

/**
 * Get any custom VITE_ prefixed environment variable
 */
export const getEnvVar = (key: string): string | undefined => {
  return import.meta.env[key];
};
