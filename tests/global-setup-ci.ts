import { chromium, FullConfig } from '@playwright/test';
import axios from 'axios';
import * as dotenv from 'dotenv';
import * as fs from 'fs';
import * as path from 'path';
import { getBaseUrl } from './selectors';
import { EsoLogsNodeCache } from '../src/utils/esoLogsNodeCache';
import { clearCache } from './screen-sizes/cache-utils';

/**
 * Lightweight global setup for screen size tests (CI mode)
 * 
 * This version excludes preprocessing to allow for separate CI step visibility.
 * Preprocessing is handled separately in the GitHub Action for better monitoring.
 */

// Load environment variables
dotenv.config();

async function globalSetup(config: FullConfig) {
  console.log('🚀 Starting lightweight global setup for screen size tests...');

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

  console.log('🔑 Setting up authentication for screen size tests...');

  // Primary method: OAuth client credentials flow (same as download-report-data script)
  let accessToken: string | null = null;

  if (clientSecret) {
    try {
      accessToken = await getClientCredentialsToken(clientId, clientSecret);
      console.log('✅ Successfully obtained OAuth client credentials token');

      // Save the token and create auth state
      await createAuthStateWithToken(accessToken);
      console.log('✅ Authentication state created successfully');
    } catch (error) {
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
      await performBrowserLogin(testUserEmail, testUserPassword, accessToken);
      console.log('✅ Successfully completed browser-based authentication');
    } catch (error) {
      console.error('❌ Failed browser-based authentication:', error);
      console.log('⚠️  Authentication setup failed - tests will run without authentication');
    }
  } else if (!accessToken) {
    if (!testUserEmail || !testUserPassword) {
      console.log('ℹ️  No fallback user credentials available');
      console.log('💡 For comprehensive authentication testing, consider setting:');
      console.log('   - OAUTH_CLIENT_SECRET (recommended for automatic token acquisition)');
      console.log('   - ESO_LOGS_TEST_EMAIL and ESO_LOGS_TEST_PASSWORD (for browser flow testing)');
    }
    console.log('⚠️  No authentication token available - tests will run in unauthenticated mode');
  }

  // Pre-cache getCurrentUser response to avoid spamming the API during tests
  if (accessToken) {
    await preCacheCurrentUser(accessToken);
  }

  // NOTE: Preprocessing is now handled separately in CI for better visibility
  console.log('ℹ️  Preprocessing will be handled separately in CI pipeline');

  console.log('✅ Lightweight global setup completed');
}

/**
 * Create authentication state directly with a token (no browser needed)
 * This mimics what the app would do after successful OAuth flow
 */
async function createAuthStateWithToken(accessToken: string): Promise<void> {
  console.log('💾 Creating authentication state with OAuth token...');

  // Create minimal auth state that includes the access token in localStorage
  const authState = {
    cookies: [],
    origins: [
      {
        origin: process.env.NIGHTLY_BASE_URL || 'http://localhost:3000',
        localStorage: [
          {
            name: 'access_token',
            value: accessToken,
          },
        ],
      },
    ],
  };

  // Ensure tests directory exists
  const testsDir = path.dirname('tests/auth-state.json');
  if (!fs.existsSync(testsDir)) {
    fs.mkdirSync(testsDir, { recursive: true });
  }

  // Write the auth state file
  fs.writeFileSync('tests/auth-state.json', JSON.stringify(authState, null, 2));

  console.log('✅ Authentication state file created at tests/auth-state.json');
}

/**
 * Get access token using OAuth client credentials flow
 * Uses the same approach as download-report-data.ts script
 */
async function getClientCredentialsToken(clientId: string, clientSecret: string): Promise<string> {
  const tokenUrl = process.env.ESOLOGS_TOKEN_URL || 'https://www.esologs.com/oauth/token';

  console.log('🔑 Getting OAuth access token...');

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

    const data = response.data as { access_token?: string };

    if (!data.access_token) {
      throw new Error('No access token in response');
    }

    console.log('✅ OAuth access token obtained successfully');
    return data.access_token;
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
 * Pre-cache getCurrentUser response to mock it during tests
 * This prevents repeated API calls for the same user data
 */
async function preCacheCurrentUser(accessToken: string): Promise<void> {
  console.log('💾 Pre-caching getCurrentUser response...');

  // Create a simple mock response for getCurrentUser
  const mockUserResponse = {
    data: {
      currentUser: {
        id: 'test-user',
        name: 'Test User',
        guilds: [],
        battleTag: 'TestUser#1234',
      },
    },
  };

  // Save to cache directory for tests to find
  const cacheDir = 'tests/cache';
  if (!fs.existsSync(cacheDir)) {
    fs.mkdirSync(cacheDir, { recursive: true });
  }

  fs.writeFileSync(
    path.join(cacheDir, 'currentUser.json'),
    JSON.stringify(mockUserResponse, null, 2),
  );

  console.log('✅ getCurrentUser mock response pre-cached successfully');
}

/**
 * Perform browser-based login for fallback authentication
 */
async function performBrowserLogin(
  email: string,
  password: string,
  existingToken: string | null,
): Promise<void> {
  if (existingToken) {
    console.log('ℹ️  Already have access token from client credentials, skipping browser login');
    return;
  }

  const browser = await chromium.launch();
  const context = await browser.newContext();
  const page = await context.newPage();

  try {
    console.log('🌐 Navigating to ESO Logs login page...');
    await page.goto('https://www.esologs.com/');

    // Click login button
    await page.getByRole('link', { name: 'Login' }).click();

    // Fill login form
    console.log('📝 Filling login form...');
    await page.getByLabel('Email').fill(email);
    await page.getByLabel('Password').fill(password);
    await page.getByRole('button', { name: 'Login' }).click();

    // Wait for successful login (look for user menu)
    console.log('⏳ Waiting for login to complete...');
    await page.waitForSelector('[data-cy="user-menu"], .user-menu, [class*="user"]', {
      timeout: 10000,
    });

    console.log('✅ Successfully logged in');

    // Save authenticated storage state
    await context.storageState({ path: 'tests/auth-state.json' });
    console.log('💾 Saved authentication state to tests/auth-state.json');
  } catch (error) {
    console.error('❌ Browser login failed:', error);
    throw error;
  } finally {
    await browser.close();
  }
}

export default globalSetup;