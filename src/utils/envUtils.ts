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

/**
 * Base URL of the roster-hub-api Worker (reports, roster hub, pack hub, build hub,
 * the ESO Logs client-credential proxy) — the single resolution every API client uses.
 *
 * Resolution order:
 *  1. `VITE_ROSTER_HUB_API_URL` when set — prod builds pin the Worker URL here, and
 *     Worker developers point it at `http://localhost:8787` (wrangler dev).
 *  2. Dev fallback: `/roster-hub-api`, a SAME-ORIGIN path the Vite dev server proxies
 *     to the deployed Worker (see `server.proxy` in vite.config.mjs). Same-origin means
 *     no CORS preflight, so dev works on ANY localhost port — the Worker's CORS
 *     allowlist only covers localhost:3000–3003/5173, and worktree dev servers on other
 *     ports (e.g. :3007) had every report query silently blocked.
 *  3. Prod fallback: the deployed Worker URL.
 *
 * Trailing slash is stripped so callers can append `/graphql`, `/packs`, … verbatim.
 */
export const getRosterHubBaseUrl = (): string => {
  const explicit = getEnvVar('VITE_ROSTER_HUB_API_URL');
  if (explicit) return explicit.replace(/\/$/, '');
  if (isDevelopment()) return '/roster-hub-api';
  return 'https://roster-hub-api.eso-toolkit.workers.dev';
};
