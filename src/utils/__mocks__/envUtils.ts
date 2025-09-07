// Mock for envUtils.ts to handle import.meta in Jest environment

/**
 * Get the base URL set by Vite's build configuration
 * Mocked to return '/' for tests
 */
export const getBaseUrl = (): string => {
  return '/';
};

/**
 * Get the mode (development, production, etc.)
 * Mocked to return 'test' for tests
 */
export const getMode = (): string => {
  return 'test';
};

/**
 * Check if we're in development mode
 * Mocked to return false for tests
 */
export const isDevelopment = (): boolean => {
  return false;
};

/**
 * Check if we're in production mode
 * Mocked to return false for tests
 */
export const isProduction = (): boolean => {
  return false;
};

/**
 * Get any custom VITE_ prefixed environment variable
 * Mocked to return undefined for tests
 */
export const getEnvVar = (key: string): string | undefined => {
  // Return some default test values for common env vars if needed
  if (key === 'VITE_BASE_URL') return '/';
  return undefined;
};
