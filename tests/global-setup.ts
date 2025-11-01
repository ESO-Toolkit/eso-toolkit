import { chromium, FullConfig } from '@playwright/test';
import axios from 'axios';
import * as dotenv from 'dotenv';
import * as fs from 'fs';
import * as path from 'path';
import { getBaseUrl } from './selectors';
import { EsoLogsNodeCache } from '../src/utils/esoLogsNodeCache';
import { clearCache } from './screen-sizes/cache-utils';
import { preprocessWorkerComputations } from './screen-sizes/shared-preprocessing';

/**
 * Global setup for Playwright nightly tests
 *
 * This setup handles authentication with ESO Logs for nightly regression tests.
 * It performs OAuth authentication and saves the auth state for reuse across tests.
 */

// Load environment variables
dotenv.config();

const AUTH_STATE_PATH = path.resolve('tests', 'auth-state.json');
const AUTH_METADATA_PATH = path.resolve('tests', 'auth-metadata.json');
const TOKEN_REFRESH_BUFFER_MS = 5 * 60 * 1000; // refresh 5 minutes before expiry
const DEFAULT_BROWSER_TOKEN_TTL_MS = 55 * 60 * 1000; // fallback TTL when expiry unknown
const MAX_TOKEN_CACHE_TTL_MS = 45 * 60 * 1000; // never cache tokens for longer than 45 minutes

type AuthTokenSource = 'client_credentials' | 'browser';

interface AuthMetadata {
  accessToken: string;
  obtainedAt: number;
  expiresAt: number;
  source: AuthTokenSource;
}

interface ClientCredentialsToken {
  accessToken: string;
  expiresIn: number;
  obtainedAt: number;
  expiresAt: number;
}

function ensureTestsDir(): void {
  const testsDir = path.dirname(AUTH_STATE_PATH);
  if (!fs.existsSync(testsDir)) {
    fs.mkdirSync(testsDir, { recursive: true });
  }
}

function loadAuthMetadata(): AuthMetadata | null {
  try {
    if (!fs.existsSync(AUTH_METADATA_PATH)) {
      return null;
    }

    const raw = fs.readFileSync(AUTH_METADATA_PATH, 'utf-8');
    const metadata = normalizeAuthMetadata(JSON.parse(raw) as AuthMetadata);

    if (!metadata.accessToken || !metadata.expiresAt || !metadata.obtainedAt) {
      return null;
    }

    return metadata;
  } catch (error) {
    console.warn('⚠️  Failed to load auth metadata:', error);
    return null;
  }
}

function saveAuthMetadata(metadata: AuthMetadata): void {
  try {
    ensureTestsDir();
    fs.writeFileSync(
      AUTH_METADATA_PATH,
      JSON.stringify(normalizeAuthMetadata(metadata), null, 2),
    );
  } catch (error) {
    console.warn('⚠️  Failed to persist auth metadata:', error);
  }
}

function clearAuthMetadata(): void {
  try {
    if (fs.existsSync(AUTH_METADATA_PATH)) {
      fs.unlinkSync(AUTH_METADATA_PATH);
    }
  } catch (error) {
    console.warn('⚠️  Failed to clear auth metadata:', error);
  }
}

function isTokenExpired(metadata: AuthMetadata, bufferMs: number = TOKEN_REFRESH_BUFFER_MS): boolean {
  const now = Date.now();
  const normalized = normalizeAuthMetadata(metadata);
  return normalized.expiresAt - bufferMs <= now;
}

function normalizeAuthMetadata(metadata: AuthMetadata): AuthMetadata {
  const maxExpiresAt = metadata.obtainedAt + MAX_TOKEN_CACHE_TTL_MS;
  const expiresAt = Math.min(metadata.expiresAt, maxExpiresAt);
  return {
    ...metadata,
    expiresAt,
  };
}

async function ensureFreshClientCredentialsToken(
  clientId: string,
  clientSecret: string,
): Promise<AuthMetadata> {
  const existing = loadAuthMetadata();

  if (existing && existing.source === 'client_credentials' && !isTokenExpired(existing)) {
    console.log(
      `♻️  Reusing cached OAuth token (expires ${new Date(existing.expiresAt).toISOString()})`,
    );
    await createAuthStateWithToken(existing.accessToken, existing.expiresAt);
    return existing;
  }

  console.log('🔑 Getting OAuth access token...');
  const token = await getClientCredentialsToken(clientId, clientSecret);

  const metadata = normalizeAuthMetadata({
    accessToken: token.accessToken,
    obtainedAt: token.obtainedAt,
    expiresAt: token.expiresAt,
    source: 'client_credentials',
  });

  await createAuthStateWithToken(metadata.accessToken, metadata.expiresAt);
  saveAuthMetadata(metadata);

  const lifetimeMinutes = Math.round((metadata.expiresAt - metadata.obtainedAt) / 60000);
  console.log(`✅ Obtained fresh OAuth token (expires in ~${lifetimeMinutes}m)`);
  return metadata;
}

async function globalSetup(config: FullConfig) {
  console.log('🚀 Starting global setup for nightly tests...');

  // Clear all cached ESO Logs API responses to ensure fresh data
  console.log('🧹 Clearing ESO Logs API cache...');
  try {
    // Clear the main ESO Logs API cache
    const cache = new EsoLogsNodeCache();
    await cache.clear();
    
    // Clear the screen sizes test cache
    clearCache();
    
    console.log('✅ All ESO Logs caches cleared successfully');
  } catch (error) {
    console.warn('⚠️  Failed to clear cache:', error);
  }

  // Check if we have authentication credentials
  const clientId = process.env.OAUTH_CLIENT_ID;
  const clientSecret = process.env.OAUTH_CLIENT_SECRET;
  const testUserEmail = process.env.ESO_LOGS_TEST_EMAIL;
  const testUserPassword = process.env.ESO_LOGS_TEST_PASSWORD;

  if (!clientId) {
    console.log('⚠️  No OAUTH_CLIENT_ID found - tests will run without authentication');
    console.log(
      '💡 To enable authentication, set OAUTH_CLIENT_ID and OAUTH_CLIENT_SECRET in your environment',
    );
    return;
  }

  console.log('🔑 Setting up authentication for nightly tests...');

  // Primary method: OAuth client credentials flow (same as download-report-data script)
  let accessToken: string | null = null;
  let tokenMetadata: AuthMetadata | null = null;

  if (clientSecret) {
    try {
      tokenMetadata = await ensureFreshClientCredentialsToken(clientId, clientSecret);
      accessToken = tokenMetadata.accessToken;
      console.log(
        `✅ Authentication state ready (token expires ${new Date(tokenMetadata.expiresAt).toISOString()})`,
      );
    } catch (error) {
      clearAuthMetadata();
      console.error('❌ Failed to get client credentials token:', error);
      console.log(
        '💡 Falling back to browser-based authentication if user credentials are available',
      );
    }
  } else {
    console.log('ℹ️  No OAUTH_CLIENT_SECRET found - skipping client credentials flow');
    console.log('💡 Set OAUTH_CLIENT_SECRET for automatic token acquisition');
  }

  // Fallback method: Browser-based login (only if client credentials failed and user creds available)
  if (!accessToken && testUserEmail && testUserPassword) {
    try {
      console.log('🔐 Attempting browser-based authentication as fallback...');
      const browserToken = await performBrowserLogin(testUserEmail, testUserPassword, accessToken);
      if (browserToken) {
        accessToken = browserToken;
        tokenMetadata = loadAuthMetadata();
      }
      console.log('✅ Successfully completed browser-based authentication');
    } catch (error) {
      console.error('❌ Failed browser-based authentication:', error);
      console.log('⚠️  Authentication setup failed - tests will run without authentication');
      clearAuthMetadata();
    }
  } else if (!accessToken) {
    if (!testUserEmail || !testUserPassword) {
      console.log('ℹ️  No fallback user credentials available');
      console.log('💡 For comprehensive authentication testing, consider setting:');
      console.log('   - OAUTH_CLIENT_SECRET (recommended for automatic token acquisition)');
      console.log('   - ESO_LOGS_TEST_EMAIL and ESO_LOGS_TEST_PASSWORD (for browser flow testing)');
    }
    clearAuthMetadata();
    console.log('⚠️  No authentication token available - tests will run in unauthenticated mode');
  }

  // Pre-cache getCurrentUser response to avoid spamming the API during tests
  if (accessToken) {
    await preCacheCurrentUser(accessToken);
  }

  // Pre-process heavy worker computations for screen size tests
  // Only do this if we have authentication (since the test data requires it)
  if (accessToken) {
    try {
      console.log('🏭 Pre-processing worker computations for screen size tests...');
      const browser = await chromium.launch();
      const context = await browser.newContext({
        storageState: AUTH_STATE_PATH,
      });
      const page = await context.newPage();
      
      await preprocessWorkerComputations(page);
      
      await browser.close();
      console.log('✅ Worker computation preprocessing completed');
    } catch (error) {
      console.warn('⚠️  Failed to preprocess worker computations:', error);
      // Don't fail the entire setup if preprocessing fails
    }
  }

  console.log('✅ Global setup completed');
}

/**
 * Create authentication state directly with a token (no browser needed)
 * This mimics what the app would do after successful OAuth flow
 */
async function createAuthStateWithToken(accessToken: string, expiresAt?: number): Promise<void> {
  console.log('💾 Creating authentication state with OAuth token...');

  const candidateUrls = [
    process.env.NIGHTLY_BASE_URL,
    process.env.BASE_URL,
    getBaseUrl(),
    'https://esotk.com/',
    'http://localhost:3000',
  ].filter(Boolean) as string[];

  const origins = Array.from(
    new Set(
      candidateUrls
        .map((url) => {
          try {
            return new URL(url).origin;
          } catch (error) {
            console.warn('⚠️  Unable to determine origin for auth state URL:', url, error);
            return null;
          }
        })
        .filter((origin): origin is string => Boolean(origin)),
    ),
  );

  // Create minimal auth state that includes the access token in localStorage for all relevant origins
  const authState = {
    cookies: [],
    origins: origins.map((origin) => ({
      origin,
      localStorage: (() => {
        const entries = [
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
          entries.push({
            name: 'access_token_expires_at',
            value: String(expiresAt),
          });
        }

        return entries;
      })(),
    })),
  };

  // Ensure tests directory exists
  ensureTestsDir();

  // Write the auth state file
  fs.writeFileSync(AUTH_STATE_PATH, JSON.stringify(authState, null, 2));

  console.log(`✅ Authentication state file created at ${AUTH_STATE_PATH}`);
}

/**
 * Get access token using OAuth client credentials flow
 * Uses the same approach as download-report-data.ts script
 */
async function getClientCredentialsToken(
  clientId: string,
  clientSecret: string,
): Promise<ClientCredentialsToken> {
  const tokenUrl = process.env.ESOLOGS_TOKEN_URL || 'https://www.esologs.com/oauth/token';

  const params = new URLSearchParams({
    grant_type: 'client_credentials',
    client_id: clientId,
    client_secret: clientSecret,
  });

  try {
    const response = await axios.post(tokenUrl, params, {
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
    });

    const data = response.data as { access_token?: string; expires_in?: number };

    if (!data.access_token) {
      throw new Error('No access token in response');
    }

    const obtainedAt = Date.now();
    const expiresIn = typeof data.expires_in === 'number' && !Number.isNaN(data.expires_in)
      ? data.expires_in
      : 3600;

    return {
      accessToken: data.access_token,
      expiresIn,
      obtainedAt,
      expiresAt: obtainedAt + expiresIn * 1000,
    };
  } catch (error) {
    if (axios.isAxiosError(error)) {
      const status = error.response?.status ?? 'unknown';
      const statusText = error.response?.statusText ?? 'Unknown';
      const responseBody = error.response?.data;
      const serializedBody =
        typeof responseBody === 'string'
          ? responseBody
          : responseBody
          ? JSON.stringify(responseBody)
          : 'No response body';

      throw new Error(
        `Token request failed: ${status} ${statusText}\nResponse: ${serializedBody}`,
      );
    }

    throw error;
  }
}

/**
 * Perform browser-based login to save authentication state
 * This is used as a fallback when client credentials are not available
 * or when you want to test the full OAuth browser flow
 */
async function performBrowserLogin(
  email: string,
  password: string,
  existingToken?: string | null,
): Promise<string | null> {
  console.log('🌐 Starting browser-based authentication...');

  const browser = await chromium.launch();
  const context = await browser.newContext();
  const page = await context.newPage();
  let resolvedToken: string | null = existingToken ?? null;

  try {
    // Navigate to the app
    const baseUrl = getBaseUrl();
    await page.goto(`${baseUrl}/login`, { waitUntil: 'domcontentloaded', timeout: 30000 });

    // If we have an existing token from client credentials, inject it
    if (existingToken) {
      console.log('💉 Injecting existing OAuth token into browser...');

      await page.evaluate((token) => {
        localStorage.setItem('access_token', token);
      }, existingToken);

      // Reload to activate the token
      await page.reload({ waitUntil: 'domcontentloaded' });

      // Wait a bit for the app to process the token
      await page.waitForTimeout(2000);

      // Check if we're now authenticated
      const isAuthenticated = await page.evaluate(() => {
        return !!localStorage.getItem('access_token');
      });

      if (isAuthenticated) {
        console.log('✅ OAuth token injected successfully');

        // Save authentication state
        if (!existingToken) {
          resolvedToken = await page.evaluate(() => localStorage.getItem('access_token'));
          if (resolvedToken) {
            saveAuthMetadata({
              accessToken: resolvedToken,
              obtainedAt: Date.now(),
              expiresAt: Date.now() + DEFAULT_BROWSER_TOKEN_TTL_MS,
              source: 'browser',
            });
          }
        }

        await context.storageState({ path: AUTH_STATE_PATH });
        console.log(`💾 Authentication state saved to ${AUTH_STATE_PATH}`);
        return resolvedToken;
      }
    }

    // If no existing token or injection failed, try manual login
    console.log('🔐 Attempting manual OAuth flow...');

    // Look for ESO Logs login button
    const loginButton = page.locator(
      'button:has-text("Connect to ESO Logs"), a:has-text("Connect to ESO Logs")',
    );

    if (await loginButton.isVisible({ timeout: 10000 })) {
      await loginButton.click();

      // Wait for ESO Logs login page
      await page.waitForURL(/esologs\.com.*login/, { timeout: 15000 });

      // Fill in credentials if we reach the login form
      const emailField = page.locator('input[type="email"], input[name="email"]');
      const passwordField = page.locator('input[type="password"], input[name="password"]');

      if (await emailField.isVisible({ timeout: 10000 })) {
        console.log('📝 Filling in login credentials...');
        await emailField.fill(email);
        await passwordField.fill(password);

        // Submit the form
        const submitButton = page.locator('button[type="submit"], input[type="submit"]');
        await submitButton.click();

        // Wait for redirect back to our app
        await page.waitForURL(new RegExp(baseUrl.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')), {
          timeout: 45000,
        });

        console.log('✅ Manual OAuth flow completed');

        // Save authentication state
        const browserToken = await page.evaluate(() => localStorage.getItem('access_token'));
        if (browserToken) {
          resolvedToken = browserToken;
          saveAuthMetadata({
            accessToken: browserToken,
            obtainedAt: Date.now(),
            expiresAt: Date.now() + DEFAULT_BROWSER_TOKEN_TTL_MS,
            source: 'browser',
          });
        }

        await context.storageState({ path: AUTH_STATE_PATH });
        console.log(`💾 Authentication state saved to ${AUTH_STATE_PATH}`);
        return resolvedToken;
      } else {
        throw new Error('Login form not found on ESO Logs page');
      }
    } else {
      throw new Error('Login button not found on app page');
    }
  } catch (error) {
    console.error('❌ Browser-based authentication failed:', error);
    throw error;
  } finally {
    await browser.close();
  }

  return resolvedToken;
}

/**
 * Pre-cache getCurrentUser response to avoid API spam during tests
 * This creates a mock response in the cache without making an API call
 */
async function preCacheCurrentUser(accessToken: string): Promise<void> {
  console.log('💾 Pre-caching getCurrentUser response...');
  
  try {
    const cache = new EsoLogsNodeCache();
    
    // Check if getCurrentUser is already cached
    const cached = await cache.get('getCurrentUser', {}, 'network');
    if (cached) {
      console.log('✅ getCurrentUser already cached, skipping');
      return;
    }

    // Create a mock getCurrentUser response to avoid API spam
    // This represents a successful authentication check
    const mockCurrentUserResponse = {
      data: {
        userData: {
          currentUser: {
            id: 999999,
            name: 'TestUser',
            naDisplayName: '@TestUser',
            euDisplayName: null,
          },
        },
      },
    };
    
    // Cache the mock response with a longer TTL (24 hours) to reduce API spam
    await cache.set('getCurrentUser', {}, 'network', {
      data: mockCurrentUserResponse,
      status: 200,
      headers: { 'content-type': 'application/json' },
      timestamp: Date.now(),
    }, 24 * 60 * 60 * 1000); // 24 hours TTL

    console.log('✅ getCurrentUser mock response pre-cached successfully');
    
  } catch (error) {
    console.warn('⚠️  Failed to pre-cache getCurrentUser:', error);
    // Don't fail the entire setup if pre-caching fails
  }
}

export default globalSetup;
