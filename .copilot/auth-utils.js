/**
 * Helper utilities for managing authentication tokens in the Claude skill
 */

import fs from 'fs';
import path from 'path';

/**
 * Default paths
 */
export const DEFAULT_AUTH_STATE_PATH = path.resolve('tests', 'auth-state.json');
export const DEFAULT_AUTH_METADATA_PATH = path.resolve('tests', 'auth-metadata.json');

/**
 * Load authentication state from file
 * @param {string} authStatePath - Path to auth state file
 * @returns {object|null} Authentication state or null if not found
 */
export function loadAuthState(authStatePath = DEFAULT_AUTH_STATE_PATH) {
  try {
    if (fs.existsSync(authStatePath)) {
      const content = fs.readFileSync(authStatePath, 'utf-8');
      return JSON.parse(content);
    }
    return null;
  } catch (error) {
    console.error('Error loading auth state:', error);
    return null;
  }
}

/**
 * Extract access token from auth state
 * @param {object} authState - Authentication state object
 * @returns {string|null} Access token or null
 */
export function getAccessToken(authState) {
  if (!authState || !authState.origins) return null;

  for (const origin of authState.origins) {
    if (origin.localStorage) {
      const tokenEntry = origin.localStorage.find((entry) => entry.name === 'access_token');
      if (tokenEntry) {
        return tokenEntry.value;
      }
    }
  }
  return null;
}

/**
 * Get token expiration info from auth state
 * @param {object} authState - Authentication state object
 * @returns {object} Expiration information
 */
export function getTokenExpiryInfo(authState) {
  if (!authState || !authState.origins) {
    return { hasExpiry: false };
  }

  for (const origin of authState.origins) {
    if (origin.localStorage) {
      const expiresAtEntry = origin.localStorage.find(
        (entry) => entry.name === 'access_token_expires_at'
      );
      if (expiresAtEntry) {
        const expiresAt = parseInt(expiresAtEntry.value);
        const now = Date.now();
        const isExpired = expiresAt < now;
        const expiresIn = Math.floor((expiresAt - now) / 1000 / 60); // minutes

        return {
          hasExpiry: true,
          expiresAt: new Date(expiresAt).toISOString(),
          expiresInMinutes: expiresIn,
          isExpired,
        };
      }
    }
  }

  return { hasExpiry: false };
}

/**
 * Check if auth state is valid and not expired
 * @param {string} authStatePath - Path to auth state file
 * @returns {object} Validation result
 */
export function validateAuthState(authStatePath = DEFAULT_AUTH_STATE_PATH) {
  const authState = loadAuthState(authStatePath);

  if (!authState) {
    return {
      valid: false,
      reason: 'Auth state file not found',
    };
  }

  const token = getAccessToken(authState);
  if (!token) {
    return {
      valid: false,
      reason: 'No access token found in auth state',
    };
  }

  const expiryInfo = getTokenExpiryInfo(authState);
  if (expiryInfo.hasExpiry && expiryInfo.isExpired) {
    return {
      valid: false,
      reason: 'Token has expired',
      expiryInfo,
    };
  }

  return {
    valid: true,
    token,
    expiryInfo,
  };
}

/**
 * Create a new auth state file with a token
 * @param {string} accessToken - Access token to store
 * @param {object} options - Additional options
 * @returns {void}
 */
export function createAuthState(accessToken, options = {}) {
  const {
    authStatePath = DEFAULT_AUTH_STATE_PATH,
    expiresAt = null,
    origins = ['http://localhost:3000', 'https://esotk.com'],
  } = options;

  const authState = {
    cookies: [],
    origins: origins.map((origin) => {
      const localStorage = [
        {
          name: 'access_token',
          value: accessToken,
        },
        {
          name: 'authenticated',
          value: 'true',
        },
        {
          name: 'access_token_refreshed_at',
          value: String(Date.now()),
        },
      ];

      if (expiresAt) {
        localStorage.push({
          name: 'access_token_expires_at',
          value: String(expiresAt),
        });
      }

      return {
        origin,
        localStorage,
      };
    }),
  };

  // Ensure directory exists
  const dir = path.dirname(authStatePath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  // Write auth state
  fs.writeFileSync(authStatePath, JSON.stringify(authState, null, 2));
}

/**
 * Parse JWT token (without verification)
 * @param {string} token - JWT token
 * @returns {object} Decoded token payload
 */
export function parseJWT(token) {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) {
      throw new Error('Invalid JWT format');
    }

    const payload = parts[1];
    const decoded = Buffer.from(payload, 'base64').toString('utf-8');
    return JSON.parse(decoded);
  } catch (error) {
    console.error('Error parsing JWT:', error);
    return null;
  }
}

/**
 * Get user info from token
 * @param {string} token - JWT access token
 * @returns {object|null} User information
 */
export function getUserInfoFromToken(token) {
  const payload = parseJWT(token);
  if (!payload) return null;

  return {
    sub: payload.sub,
    scopes: payload.scopes || [],
    exp: payload.exp ? new Date(payload.exp * 1000).toISOString() : null,
    iat: payload.iat ? new Date(payload.iat * 1000).toISOString() : null,
  };
}
