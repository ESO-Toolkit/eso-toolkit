import { getBaseUrl } from '../../utils/envUtils';
import { Logger, LogLevel } from '../../utils/logger';

// Create a logger instance for auth operations
const logger = new Logger({
  level: LogLevel.ERROR,
  contextPrefix: 'Auth',
});

// Compose redirect URI using Vite's BASE_URL
export const getRedirectUri = (): string => {
  const baseUrl = getBaseUrl();

  // Remove trailing slash if it exists
  const cleanBaseUrl = baseUrl.endsWith('/') ? baseUrl.slice(0, -1) : baseUrl;
  return `${cleanBaseUrl}/oauth-redirect`;
};
// Replace with your actual ESO Logs client ID
export const CLIENT_ID = '9fd28ffc-300a-44ce-8a0e-6167db47a7e1';
export const PKCE_CODE_VERIFIER_KEY = 'eso_code_verifier';
export const INTENDED_DESTINATION_KEY = 'eso_intended_destination';

export const LOCAL_STORAGE_ACCESS_TOKEN_KEY = 'access_token';
export const LOCAL_STORAGE_REFRESH_TOKEN_KEY = 'refresh_token';

export function setPkceCodeVerifier(verifier: string): void {
  localStorage.setItem(PKCE_CODE_VERIFIER_KEY, verifier);
}

export function getPkceCodeVerifier(): string {
  return localStorage.getItem(PKCE_CODE_VERIFIER_KEY) || '';
}

export function setIntendedDestination(path: string): void {
  localStorage.setItem(INTENDED_DESTINATION_KEY, path);
}

export function getIntendedDestination(): string {
  return localStorage.getItem(INTENDED_DESTINATION_KEY) || '/';
}

export function clearIntendedDestination(): void {
  localStorage.removeItem(INTENDED_DESTINATION_KEY);
}

const generateCodeVerifier = (): string => {
  const array = new Uint32Array(32);
  window.crypto.getRandomValues(array);
  const verifier = Array.from(array, (dec) => ('0' + dec.toString(16)).slice(-2)).join('');
  localStorage.setItem(PKCE_CODE_VERIFIER_KEY, verifier);
  return verifier;
};

const base64UrlEncode = (str: ArrayBuffer): string => {
  const uint8 = new Uint8Array(str);
  let binary = '';
  for (let i = 0; i < uint8.byteLength; i++) {
    binary += String.fromCharCode(uint8[i]);
  }
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
};

const generateCodeChallenge = async (verifier: string): Promise<string> => {
  if (!window.crypto?.subtle) {
    const origin = window.location.origin;
    throw new Error(
      `Web Crypto API is unavailable on "${origin}". ` +
        `Browsers only allow cryptographic login on localhost or HTTPS. ` +
        `To test on a phone over a local network, either:\n` +
        `  1. Use a tunnel (e.g. "npx localtunnel --port 5173" or ngrok)\n` +
        `  2. Enable HTTPS on the dev server (vite --https)\n` +
        `  3. In Chrome on Android, go to chrome://flags and add "${origin}" to ` +
        `"Insecure origins treated as secure"`,
    );
  }
  const encoder = new TextEncoder();
  const data = encoder.encode(verifier);
  const digest = await window.crypto.subtle.digest('SHA-256', data);
  return base64UrlEncode(digest);
};

export async function buildAuthUrl(verifier: string): Promise<string> {
  const challenge = await generateCodeChallenge(verifier);

  // Use the documented scope for user profile access
  const scope = 'view-user-profile';

  return `https://www.esologs.com/oauth/authorize?response_type=code&client_id=${CLIENT_ID}&code_challenge=${challenge}&code_challenge_method=S256&redirect_uri=${encodeURIComponent(getRedirectUri())}&scope=${encodeURIComponent(scope)}`;
}

export async function startPKCEAuth(): Promise<void> {
  const verifier = generateCodeVerifier();
  setPkceCodeVerifier(verifier);

  let authUrl: string | undefined;
  try {
    authUrl = await buildAuthUrl(verifier);
    window.location.href = authUrl;
  } catch (err) {
    logger.error(
      'Failed to start PKCE auth redirect',
      err instanceof Error ? err : new Error(String(err)),
      { authUrl },
    );
    const urlInfo = authUrl ? `\n\nURL attempted:\n${authUrl}` : '';
    alert(
      `Login redirect failed: ${err instanceof Error ? err.message : String(err)}${urlInfo}`,
    );
  }
}

const OAUTH_TOKEN_URL = 'https://www.esologs.com/oauth/token';

/**
 * Refreshes the access token using the stored refresh token
 * @returns The new access token, or null if refresh failed
 */
export async function refreshAccessToken(): Promise<string | null> {
  const refreshToken = localStorage.getItem(LOCAL_STORAGE_REFRESH_TOKEN_KEY);

  if (!refreshToken) {
    logger.warn('No refresh token available');
    return null;
  }

  try {
    const body = new URLSearchParams({
      grant_type: 'refresh_token',
      refresh_token: refreshToken,
      client_id: CLIENT_ID,
    });

    const response = await fetch(OAUTH_TOKEN_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: body.toString(),
    });

    if (!response.ok) {
      logger.error('Token refresh failed', undefined, { status: response.status });
      // Clear invalid tokens
      localStorage.removeItem(LOCAL_STORAGE_ACCESS_TOKEN_KEY);
      localStorage.removeItem(LOCAL_STORAGE_REFRESH_TOKEN_KEY);
      return null;
    }

    const data = await response.json();

    // Store new tokens
    localStorage.setItem(LOCAL_STORAGE_ACCESS_TOKEN_KEY, data.access_token);
    if (data.refresh_token) {
      localStorage.setItem(LOCAL_STORAGE_REFRESH_TOKEN_KEY, data.refresh_token);
    }

    logger.info('Token refreshed successfully');
    return data.access_token;
  } catch (error) {
    logger.error('Token refresh error', error instanceof Error ? error : undefined);
    // Clear invalid tokens
    localStorage.removeItem(LOCAL_STORAGE_ACCESS_TOKEN_KEY);
    localStorage.removeItem(LOCAL_STORAGE_REFRESH_TOKEN_KEY);
    return null;
  }
}
