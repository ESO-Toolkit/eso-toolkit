// Mock for envUtils.ts to handle import.meta in Jest environment

/**
 * Get the base URL from Vite configuration
 * Mocked to return '/' for tests by default (root deployment).
 * Tests that need a specific base URL can override via mockReturnValue.
 */
export const getBaseUrl = jest.fn((): string => {
  return '/';
});

/**
 * Get the mode (development, production, etc.)
 * Mocked to return 'test' for tests
 */
export const getMode = jest.fn((): string => {
  return 'test';
});

/**
 * Check if we're in development mode
 * Mocked to return false for tests
 */
export const isDevelopment = jest.fn((): boolean => {
  return false;
});

/**
 * Check if we're in production mode
 * Mocked to return false for tests
 */
export const isProduction = jest.fn((): boolean => {
  return false;
});

/**
 * Get any custom VITE_ prefixed environment variable
 * Mocked to return undefined for tests
 */
export const getEnvVar = jest.fn((key: string): string | undefined => {
  // Return some default test values for common env vars if needed
  if (key === 'VITE_BASE_URL') return '/';
  return undefined;
});

/**
 * Base URL of the roster-hub-api Worker.
 * Mocked to the production Worker URL — the resolution tests saw before the
 * same-origin dev proxy existed (isDevelopment() is mocked false here, so the
 * real helper would resolve the same way).
 */
export const getRosterHubBaseUrl = jest.fn((): string => {
  return 'https://roster-hub-api.eso-toolkit.workers.dev';
});
