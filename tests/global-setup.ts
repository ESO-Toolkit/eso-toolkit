import { chromium, FullConfig } from '@playwright/test';
import * as dotenv from 'dotenv';
import fetch from 'cross-fetch';
import * as fs from 'fs';
import * as path from 'path';
import { getBaseUrl } from './selectors';
import { EsoLogsNodeCache } from '../src/utils/esoLogsNodeCache';
import { clearCache } from './screen-sizes/cache-utils';

/**
 * Global setup for Playwright nightly tests
 *
 * This setup handles authentication with ESO Logs for nightly regression tests.
 * It performs OAuth authentication and saves the auth state for reuse across tests.
 */

// Load environment variables
dotenv.config();

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

  console.log('✅ Global setup completed');
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

  const response = await fetch(tokenUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({
      grant_type: 'client_credentials',
      client_id: clientId,
      client_secret: clientSecret,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(
      `Token request failed: ${response.status} ${response.statusText}\nResponse: ${errorText}`,
    );
  }

  const data = await response.json();

  if (!data.access_token) {
    throw new Error('No access token in response');
  }

  console.log('✅ OAuth access token obtained successfully');
  return data.access_token;
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
): Promise<void> {
  console.log('🌐 Starting browser-based authentication...');

  const browser = await chromium.launch();
  const context = await browser.newContext();
  const page = await context.newPage();

  try {
    // Navigate to the app
    const baseUrl = getBaseUrl();
    await page.goto(`${baseUrl}/#/login`, { waitUntil: 'domcontentloaded', timeout: 30000 });

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
        await context.storageState({ path: 'tests/auth-state.json' });
        console.log('💾 Authentication state saved to tests/auth-state.json');
        return;
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
        await context.storageState({ path: 'tests/auth-state.json' });
        console.log('💾 Authentication state saved to tests/auth-state.json');
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
