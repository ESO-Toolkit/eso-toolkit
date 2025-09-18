import { Page, expect } from '@playwright/test';

/**
 * Test utilities for authentication-related functionality in nightly tests
 */

export interface AuthTestUtils {
  isAuthenticated: () => Promise<boolean>;
  getAccessToken: () => Promise<string | null>;
  setAccessToken: (token: string) => Promise<void>;
  clearAuth: () => Promise<void>;
  waitForAuthState: (authenticated: boolean, timeout?: number) => Promise<void>;
  verifyAuthenticationRequired: () => Promise<void>;
  verifyAuthenticatedAccess: () => Promise<void>;
}

/**
 * Create authentication test utilities for a page
 */
export function createAuthTestUtils(page: Page): AuthTestUtils {
  return {
    /**
     * Check if the user is currently authenticated
     */
    async isAuthenticated(): Promise<boolean> {
      try {
        // Wait for page to be fully loaded first
        await page.waitForLoadState('domcontentloaded');

        return await page.evaluate(() => {
          try {
            const token = localStorage.getItem('access_token');
            return !!token && token.length > 0;
          } catch (e) {
            // localStorage might not be accessible in this context
            return false;
          }
        });
      } catch (error) {
        // Handle cases where localStorage might not be accessible yet
        console.warn('Could not access localStorage:', error);
        return false;
      }
    },

    /**
     * Get the current access token from localStorage
     */
    async getAccessToken(): Promise<string | null> {
      try {
        // Wait for page to be fully loaded first
        await page.waitForLoadState('domcontentloaded');

        return await page.evaluate(() => {
          try {
            return localStorage.getItem('access_token');
          } catch (e) {
            // localStorage might not be accessible in this context
            return null;
          }
        });
      } catch (error) {
        console.warn('Could not access localStorage:', error);
        return null;
      }
    },

    /**
     * Set the access token in localStorage
     */
    async setAccessToken(token: string): Promise<void> {
      try {
        // Wait for page to be fully loaded first
        await page.waitForLoadState('domcontentloaded');

        await page.evaluate((token) => {
          try {
            localStorage.setItem('access_token', token);
            // Trigger storage event to notify the app
            window.dispatchEvent(
              new StorageEvent('storage', {
                key: 'access_token',
                newValue: token,
                storageArea: localStorage,
              }),
            );
          } catch (e) {
            console.warn('Could not set localStorage item:', e);
          }
        }, token);
      } catch (error) {
        console.warn('Could not access localStorage for setting token:', error);
      }
    },

    /**
     * Clear authentication state
     */
    async clearAuth(): Promise<void> {
      try {
        // Wait for page to be fully loaded first
        await page.waitForLoadState('domcontentloaded');

        await page.evaluate(() => {
          try {
            localStorage.removeItem('access_token');
            localStorage.removeItem('eso_code_verifier');
            localStorage.removeItem('eso_intended_destination');
            // Trigger storage event to notify the app
            window.dispatchEvent(
              new StorageEvent('storage', {
                key: 'access_token',
                newValue: null,
                storageArea: localStorage,
              }),
            );
          } catch (e) {
            console.warn('Could not access localStorage for clearing:', e);
          }
        });
      } catch (error) {
        console.warn('Could not clear localStorage:', error);
        // Continue anyway - this might be expected in some cases
      }
    },

    /**
     * Wait for a specific authentication state
     */
    async waitForAuthState(authenticated: boolean, timeout = 10000): Promise<void> {
      await page.waitForFunction(
        (expectedAuth) => {
          try {
            const token = localStorage.getItem('access_token');
            const isAuth = !!token && token.length > 0;
            return isAuth === expectedAuth;
          } catch (e) {
            console.warn('Could not access localStorage for auth state check:', e);
            // If we can't access localStorage, assume not authenticated
            return expectedAuth === false;
          }
        },
        authenticated,
        { timeout },
      );
    },

    /**
     * Verify that authentication is required (login prompt is shown)
     */
    async verifyAuthenticationRequired(): Promise<void> {
      // Check for login button or authentication prompt
      const hasLoginButton = await page
        .locator('button:has-text(Login)')
        .isVisible()
        .catch(() => false);
      const hasLoginLink = await page
        .locator('a:has-text(Login)')
        .isVisible()
        .catch(() => false);
      const hasConnectButton = await page
        .locator('button:has-text(Connect to ESO Logs)')
        .isVisible()
        .catch(() => false);
      const hasConnectLink = await page
        .locator('a:has-text(Connect to ESO Logs)')
        .isVisible()
        .catch(() => false);

      const hasAuthElements = hasLoginButton || hasLoginLink || hasConnectButton || hasConnectLink;

      // Also check for text patterns
      const hasLoginText = await page
        .getByText(/log.*in/i)
        .isVisible()
        .catch(() => false);
      const hasConnectText = await page
        .getByText(/connect.*account/i)
        .isVisible()
        .catch(() => false);
      const hasAuthText = await page
        .getByText(/authenticate/i)
        .isVisible()
        .catch(() => false);

      const hasAuthTextElements = hasLoginText || hasConnectText || hasAuthText;

      expect(hasAuthElements || hasAuthTextElements).toBeTruthy();
    },

    /**
     * Verify that the user has authenticated access (no login prompts)
     */
    async verifyAuthenticatedAccess(): Promise<void> {
      // Wait a moment for the page to process authentication
      await page.waitForTimeout(2000);

      // Check that we don't see login prompts
      const hasLoginButton = await page
        .locator('button:has-text(Login)')
        .isVisible()
        .catch(() => false);
      const hasLoginLink = await page
        .locator('a:has-text(Login)')
        .isVisible()
        .catch(() => false);
      const hasConnectButton = await page
        .locator('button:has-text(Connect to ESO Logs)')
        .isVisible()
        .catch(() => false);

      // Check for auth required text
      const hasAuthRequiredText = await page
        .getByText(/authenticate.*required/i)
        .isVisible()
        .catch(() => false);
      const hasLoginRequiredText = await page
        .getByText(/please.*log.*in/i)
        .isVisible()
        .catch(() => false);

      const hasAuthPrompts =
        hasLoginButton ||
        hasLoginLink ||
        hasConnectButton ||
        hasAuthRequiredText ||
        hasLoginRequiredText;

      // Should not see login prompts when authenticated
      expect(hasAuthPrompts).toBeFalsy();
    },
  };
}

/**
 * Environment variable utilities for authentication
 */
export const AuthEnv = {
  /**
   * Check if authentication credentials are available
   */
  hasAuthCredentials(): boolean {
    return !!(
      process.env.OAUTH_CLIENT_ID ||
      (process.env.ESO_LOGS_TEST_EMAIL && process.env.ESO_LOGS_TEST_PASSWORD)
    );
  },

  /**
   * Check if client credentials are available
   */
  hasClientCredentials(): boolean {
    return !!(process.env.OAUTH_CLIENT_ID && process.env.OAUTH_CLIENT_SECRET);
  },

  /**
   * Check if user credentials are available
   */
  hasUserCredentials(): boolean {
    return !!(process.env.ESO_LOGS_TEST_EMAIL && process.env.ESO_LOGS_TEST_PASSWORD);
  },

  /**
   * Get client ID
   */
  getClientId(): string | undefined {
    return process.env.OAUTH_CLIENT_ID;
  },

  /**
   * Get whether we're running in CI
   */
  isCI(): boolean {
    return !!process.env.CI;
  },
};

/**
 * Skip test if authentication is not available
 */
export function skipIfNoAuth(test: any): void {
  test.skip(
    !AuthEnv.hasAuthCredentials(),
    'Skipping test - no authentication credentials available',
  );
}

/**
 * Skip test if running in CI without proper auth setup
 */
export function skipInCIWithoutAuth(test: any): void {
  test.skip(
    AuthEnv.isCI() && !AuthEnv.hasClientCredentials(),
    'Skipping test in CI - client credentials required for authentication',
  );
}
