// Environment utilities for accessing Vite build-time variables
// This file can be easily mocked in tests

/**
 * Get the base URL set by Vite's build configuration
 */
export const getBaseUrl = (): string => {
  return import.meta.env.BASE_URL;
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
