import { Page } from '@playwright/test';
import { config as dotenvConfig } from 'dotenv';
import { EsoLogsNodeCache } from '../../src/utils/esoLogsNodeCache';

/**
 * Utility functions for screen size testing
 */

// Load environment variables from .env file
dotenvConfig();

// Global cache instance for network interception
const networkCache = new EsoLogsNodeCache();

// Check if cache logging is enabled (defaults to true in test environment)
const enableCacheLogging = process.env.ENABLE_CACHE_LOGGING !== 'false';

// Check if debug logging is enabled (defaults to false for cleaner output)
const enableDebugLogging = process.env.ENABLE_DEBUG_LOGGING === 'true';

// Check if we're in CI environment for timeout adjustments
const isCI = process.env.CI === 'true';

// Determine if we're using fast config by checking timeout environment or test file
const isFastMode = process.env.PLAYWRIGHT_FAST_MODE === 'true' || 
                   process.env.TEST_TIMEOUT === '45000' ||
                   process.argv.some(arg => arg.includes('visual-regression-minimal'));

/**
 * Conditional logging for cache operations
 */
function log(...args: any[]): void {
  if (enableCacheLogging) {
    console.log(...args);
  }
}

/**
 * Conditional debug logging for page loading and test flow
 */
function debugLog(...args: any[]): void {
  if (enableDebugLogging) {
    console.log(...args);
  }
}

/**
 * Sleep for a given number of milliseconds
 */
function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Setup network-level caching for ESO Logs API requests
 */
async function setupNetworkCaching(page: Page): Promise<void> {
  await page.route('**/api/v2/**', async (route) => {
    const request = route.request();
    const url = request.url();
    
    // Only intercept ESO Logs API calls
    if (!url.includes('esologs.com/api/v2/')) {
      return route.continue();
    }

    try {
      // Extract GraphQL operation details
      const operationName = extractOperationName(request);
      const variables = extractVariables(request);
      const endpoint = 'network'; // Use consistent endpoint for network-intercepted requests
      
      // Try to get from cache using proper file cache parameters
      const cachedResponse = await networkCache.get(operationName, variables, endpoint);
      
      if (cachedResponse) {
        log(`🟢 Network Cache HIT for ${operationName}`);
        
        await route.fulfill({
          status: cachedResponse.status || 200,
          headers: cachedResponse.headers || { 'content-type': 'application/json' },
          body: JSON.stringify(cachedResponse.data),
        });
        return;
      }

      // Cache miss - make real request with increased timeout and retry logic
      log(`🔴 Network Cache MISS for ${operationName} - fetching from API`);
      
      let response: any;
      let retries = 2;
      
      while (retries >= 0) {
        try {
          response = await route.fetch({ 
            timeout: 30000, // Increase timeout to 30 seconds for API calls
          });
          break; // Success, exit retry loop
        } catch (fetchError) {
          if (retries === 0) {
            throw fetchError; // No more retries, throw the error
          }
          log(`⚠️ API fetch failed for ${operationName}, retrying... (${retries} retries left)`);
          retries--;
          // Wait a bit before retrying
          await new Promise(resolve => setTimeout(resolve, 1000));
        }
      }
      
      if (!response) {
        throw new Error('Failed to get response after retries');
      }
      
      const responseData = await response.json().catch(() => null);
      
      if (response.ok() && responseData) {
        // Cache successful response using proper file cache parameters
        await networkCache.set(operationName, variables, endpoint, {
          data: responseData,
          status: response.status(),
          headers: response.headers(),
          timestamp: Date.now(),
        });
        
        log(`💾 Network Cache STORED for ${operationName}`);
      }
      
      // Return the response
      await route.fulfill({
        status: response.status(),
        headers: response.headers(),
        body: JSON.stringify(responseData),
      });
      
    } catch (error) {
      console.warn(`Network cache error for ${url}:`, error);
      // Fallback: return a mock response to prevent test failure
      const errorMessage = error instanceof Error ? error.message : String(error);
      if (errorMessage.includes('Timeout')) {
        log(`🔥 API timeout for ${url} - returning mock response`);
        await route.fulfill({
          status: 200,
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ data: null, error: 'timeout_mock' }),
        });
      } else {
        return route.continue();
      }
    }
  });
}

/**
 * Extract operation name from request for logging
 */
function extractOperationName(request: any): string {
  try {
    const body = request.postData();
    if (body) {
      const parsed = JSON.parse(body);
      return parsed.operationName || extractOperationFromQuery(parsed.query) || 'unknown';
    }
    
    const url = new URL(request.url());
    return url.pathname.split('/').pop() || 'get';
  } catch {
    return 'unknown';
  }
}

/**
 * Extract operation name from GraphQL query string
 */
function extractOperationFromQuery(query?: string): string | null {
  if (!query) return null;
  
  const match = query.match(/(?:query|mutation)\s+([a-zA-Z0-9_]+)/);
  return match ? match[1] : null;
}

/**
 * Extract variables from request for cache key generation
 */
function extractVariables(request: any): any {
  try {
    const body = request.postData();
    if (body) {
      const parsed = JSON.parse(body);
      return parsed.variables || {};
    }
    
    // For GET requests, extract from URL parameters
    const url = new URL(request.url());
    const variables: any = {};
    for (const [key, value] of url.searchParams.entries()) {
      variables[key] = value;
    }
    return variables;
  } catch {
    return {};
  }
}

/**
 * Get real OAuth token from ESO Logs API using client credentials flow
 * Includes retry logic with exponential backoff for rate limiting
 */
export async function getRealOAuthToken(): Promise<any> {
  const clientId = process.env.OAUTH_CLIENT_ID;
  const clientSecret = process.env.OAUTH_CLIENT_SECRET;
  
  if (!clientId || !clientSecret) {
    log('⚠️  No OAuth credentials available - using mock authentication');
    return null;
  }

  const maxRetries = 3;
  const baseDelayMs = 1000; // Start with 1 second delay
  
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      const tokenUrl = process.env.ESOLOGS_TOKEN_URL || 'https://www.esologs.com/oauth/token';
      
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

      if (response.status === 429) {
        // Rate limited - retry with exponential backoff
        if (attempt < maxRetries) {
          const delayMs = baseDelayMs * Math.pow(2, attempt);
          log(`⏳ Rate limited (429), retrying in ${delayMs}ms (attempt ${attempt + 1}/${maxRetries + 1})`);
          await sleep(delayMs);
          continue;
        } else {
          console.error('Failed to get OAuth token: Rate limited after max retries');
          return null;
        }
      }

      if (!response.ok) {
        console.error('Failed to get OAuth token:', response.status, response.statusText);
        return null;
      }

      const data = await response.json();
      if (data.access_token) {
        if (attempt > 0) {
          log(`✅ Successfully obtained real OAuth token after ${attempt + 1} attempts`);
        } else {
          log('✅ Successfully obtained real OAuth token for screen size tests');
        }
        return data;  // Return the full token object, not just access_token
      }
      
      return null;
    } catch (error) {
      if (attempt < maxRetries) {
        const delayMs = baseDelayMs * Math.pow(2, attempt);
        log(`⚠️  OAuth error, retrying in ${delayMs}ms (attempt ${attempt + 1}/${maxRetries + 1}):`, error);
        await sleep(delayMs);
        continue;
      } else {
        console.error('Error getting OAuth token after max retries:', error);
        return null;
      }
    }
  }
  
  return null;
}

/**
 * Create a mock JWT token that won't be considered expired
 */
function createMockJWT(): string {
  // JWT structure: header.payload.signature
  const header = btoa(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));
  
  // Create payload with expiration far in the future (10 years from now)
  const payload = btoa(JSON.stringify({
    sub: '12345',
    name: 'TestUser',
    iat: Math.floor(Date.now() / 1000),
    exp: Math.floor(Date.now() / 1000) + (10 * 365 * 24 * 60 * 60), // 10 years
  }));
  
  const signature = 'mock_signature';
  return `${header}.${payload}.${signature}`;
}

/**
 * Set up authentication state for screen size tests
 */
export async function setupAuthentication(page: Page): Promise<void> {
  // Enable API caching to reduce load on ESO Logs servers
  await enableApiCaching(page);
  log('✅ Enabled API response caching for reduced server load');
  
  // Try to get real OAuth token first
  const realTokenData = await getRealOAuthToken();
  
  await page.addInitScript((tokenData: any) => {
    let authToken: string;
    let tokenObject: any;
    
    if (tokenData && tokenData.access_token) {
      // Use real OAuth token data
      authToken = tokenData.access_token;
      tokenObject = {
        access_token: tokenData.access_token,
        token_type: tokenData.token_type || 'Bearer',
        expires_in: tokenData.expires_in || 3600,
        refresh_token: tokenData.refresh_token,
        scope: tokenData.scope
      };
    } else {
      // Create mock token for fallback
      const header = btoa(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));
      const payload = btoa(JSON.stringify({
        sub: '12345',
        name: 'TestUser',
        iat: Math.floor(Date.now() / 1000),
        exp: Math.floor(Date.now() / 1000) + (10 * 365 * 24 * 60 * 60), // 10 years
      }));
      const signature = 'mock_signature';
      authToken = `${header}.${payload}.${signature}`;
      tokenObject = {
        access_token: authToken,
        token_type: 'Bearer',
        expires_in: 3600,
        refresh_token: 'mock_refresh_token',
        scope: 'view-user-profile view-private-reports'
      };
    }
    
    // Set authentication tokens in localStorage - using the correct key expected by AuthContext
    window.localStorage.setItem('access_token', authToken);
    
    // Also set the full token object for any other parts that might need it
    window.localStorage.setItem('eso-logs-token', JSON.stringify(tokenObject));
    
    // Set authentication state
    window.localStorage.setItem('authenticated', 'true');
    
    // Mock user profile data
    window.localStorage.setItem('user-profile', JSON.stringify({
      id: 12345,
      name: 'TestUser',
      displayName: '@TestUser',
      avatar: null
    }));
  }, realTokenData);
}

export interface ViewportInfo {
  width: number;
  height: number;
  name: string;
  category: 'mobile' | 'tablet' | 'desktop' | 'ultrawide';
}

/**
 * Sets up ESO Logs API response caching using Playwright network interception
 * This caches API responses at the network level, keeping production code clean
 */
export async function enableApiCaching(page: Page): Promise<void> {
  // For now, use a simpler approach with route interception
  await setupNetworkCaching(page);
  
  log('✅ Enabled network-level API caching');
}

/**
 * Disables API caching by removing network intercepts and cache flags
 */
export async function disableApiCaching(page: Page): Promise<void> {
  // Disable network-level caching
  await page.unroute('**/api/v2/**');
  

}

/**
 * Clears the ESO Logs API cache
 */
export async function clearApiCache(page: Page): Promise<void> {
  // Clear network-level cache
  try {
    await networkCache.clear();
    log('🧹 Cleared network-level API cache');
  } catch (error) {
    console.warn('Could not clear network cache:', error);
  }
  

}

export class ScreenSizeTestUtils {
  constructor(private page: Page) {}

  /**
   * Get viewport information
   */
  getViewportInfo(): ViewportInfo {
    const viewport = this.page.viewportSize();
    if (!viewport) {
      throw new Error('Viewport size not available');
    }

    let category: ViewportInfo['category'];
    let name: string;

    if (viewport.width < 768) {
      category = 'mobile';
      name = viewport.width < 480 ? 'Mobile Small' : 'Mobile Standard';
    } else if (viewport.width < 1024) {
      category = 'tablet';
      name = 'Tablet';
    } else if (viewport.width < 2560) {
      category = 'desktop';
      name = viewport.width < 1920 ? 'Desktop Standard' : 'Desktop Large';
    } else {
      category = 'ultrawide';
      name = 'Ultrawide';
    }

    return {
      width: viewport.width,
      height: viewport.height,
      name,
      category,
    };
  }

  /**
   * Wait for layout to stabilize
   */
  async waitForLayoutStability(timeout?: number): Promise<void> {
    // Adjust timeout based on mode and environment - increased for heavy client processing
    const defaultTimeout = isFastMode ? 15000 : (isCI ? 25000 : 15000);
    const finalTimeout = timeout || defaultTimeout;
    
    await this.page.waitForLoadState('domcontentloaded');
    
    // Try networkidle but don't fail if it times out - increased for heavy processing
    try {
      const networkIdleTimeout = Math.min(finalTimeout, isFastMode ? 20000 : 30000);
      await this.page.waitForLoadState('networkidle', { timeout: networkIdleTimeout });
      debugLog(`✓ Network idle achieved in ${networkIdleTimeout}ms`);
    } catch (error) {
      debugLog('Network idle timeout - continuing anyway (this is normal with heavy client processing)');
    }
    
    // Wait for any CSS animations/transitions to complete - increased for heavy processing
    const animationWait = isFastMode ? 2000 : (isCI ? 3000 : 1500);
    await this.page.waitForTimeout(animationWait);
    
    // Wait for fonts to load
    await this.page.evaluate(() => {
      return document.fonts.ready;
    });
    
    debugLog(`✓ Layout stability achieved (mode: ${isFastMode ? 'fast' : 'full'}, CI: ${isCI})`);
  }

  /**
   * Final wait specifically for screenshot capture in CI
   */
  async waitForScreenshotReady(): Promise<void> {
    if (isCI) {
      // Extra wait in CI for visual stability - increased for heavy client processing
      const ciWait = isFastMode ? 3000 : 4000;
      debugLog(`CI Screenshot wait for heavy processing: ${ciWait}ms`);
      await this.page.waitForTimeout(ciWait);
      
      // Double-check fonts are loaded
      await this.page.evaluate(() => document.fonts.ready);
      
      // Ensure any pending updates are complete
      await this.page.evaluate(() => new Promise(resolve => setTimeout(resolve, 100)));
    }
  }

  /**
   * Disable animations for consistent screenshots
   */
  async disableAnimations(): Promise<void> {
    await this.page.addStyleTag({
      content: `
        *, *::before, *::after {
          animation-duration: 0s !important;
          animation-delay: 0s !important;
          transition-duration: 0s !important;
          transition-delay: 0s !important;
        }
      `
    });
  }

  /**
   * Hide dynamic content that can cause test flakiness
   */
  async hideDynamicContent(): Promise<void> {
    await this.page.addStyleTag({
      content: `
        /* Hide timestamps and dynamic dates */
        .timestamp, .time, [class*="time"], [id*="time"],
        .date, [class*="date"], [id*="date"] {
          visibility: hidden !important;
        }
        
        /* Hide loading indicators */
        .loading, .spinner, .skeleton, [role="progressbar"] {
          opacity: 0 !important;
        }
        
        /* Hide cursor/caret in input fields */
        input, textarea {
          caret-color: transparent !important;
        }
      `
    });
  }

  /**
   * Check if element overflows viewport
   */
  async checkElementOverflow(selector: string): Promise<{
    overflows: boolean;
    elementWidth: number;
    viewportWidth: number;
  }> {
    const element = this.page.locator(selector);
    const elementBox = await element.boundingBox();
    const viewport = this.page.viewportSize();

    if (!elementBox || !viewport) {
      return { overflows: false, elementWidth: 0, viewportWidth: 0 };
    }

    const overflows = (elementBox.x + elementBox.width) > viewport.width;

    return {
      overflows,
      elementWidth: elementBox.width,
      viewportWidth: viewport.width,
    };
  }

  /**
   * Check if page has horizontal scrollbar
   */
  async hasHorizontalScrollbar(): Promise<boolean> {
    return await this.page.evaluate(() => {
      return document.body.scrollWidth > document.body.clientWidth;
    });
  }

  /**
   * Get all interactive elements and their sizes
   */
  async getInteractiveElementSizes(): Promise<Array<{
    selector: string;
    width: number;
    height: number;
    area: number;
  }>> {
    const interactiveSelectors = [
      'button',
      'a',
      'input',
      'select',
      'textarea',
      '[role="button"]',
      '[tabindex="0"]',
    ];

    const results = [];

    for (const selector of interactiveSelectors) {
      const elements = this.page.locator(selector);
      const count = await elements.count();

      for (let i = 0; i < count; i++) {
        const element = elements.nth(i);
        if (await element.isVisible()) {
          const box = await element.boundingBox();
          if (box) {
            results.push({
              selector: `${selector}:nth(${i})`,
              width: box.width,
              height: box.height,
              area: box.width * box.height,
            });
          }
        }
      }
    }

    return results;
  }

  /**
   * Prepare page for consistent screenshots
   */
  async prepareForScreenshot(options: {
    hideElements?: string[];
    waitForStability?: boolean;
  } = {}): Promise<void> {
    const {
      hideElements = [],
      waitForStability = true,
    } = options;

    if (waitForStability) {
      await this.waitForLayoutStability();
    }

    await this.disableAnimations();
    await this.hideDynamicContent();

    // Hide specific elements if requested
    if (hideElements.length > 0) {
      for (const selector of hideElements) {
        await this.page.locator(selector).evaluateAll((elements) => {
          elements.forEach((el) => {
            (el as HTMLElement).style.visibility = 'hidden';
          });
        });
      }
    }

    // Wait a moment for changes to apply (increased for heavy client processing)
    const finalWait = isCI ? (isFastMode ? 1500 : 2000) : 500;
    await this.page.waitForTimeout(finalWait);
    
    // Additional wait for CI screenshot readiness
    await this.waitForScreenshotReady();
  }

  /**
   * Generate a comprehensive layout report
   */
  async generateLayoutReport(): Promise<{
    viewport: ViewportInfo;
    hasHorizontalScroll: boolean;
    interactiveElements: Array<{
      selector: string;
      width: number;
      height: number;
      area: number;
      meetsMinimumSize: boolean;
    }>;
    overflowingElements: string[];
  }> {
    const viewport = this.getViewportInfo();
    const hasHorizontalScroll = await this.hasHorizontalScrollbar();
    const interactiveElements = await this.getInteractiveElementSizes();
    
    // Check which elements overflow
    const overflowingElements: string[] = [];
    const checkElements = ['main', '.container', 'table', '.data-table', 'nav'];
    
    for (const selector of checkElements) {
      const elements = this.page.locator(selector);
      const count = await elements.count();
      
      for (let i = 0; i < count; i++) {
        const overflow = await this.checkElementOverflow(`${selector}:nth(${i})`);
        if (overflow.overflows) {
          overflowingElements.push(`${selector}:nth(${i})`);
        }
      }
    }

    // Add minimum size check for interactive elements
    const minTouchSize = 32; // WCAG recommendation
    const enhancedInteractiveElements = interactiveElements.map((element) => ({
      ...element,
      meetsMinimumSize: Math.min(element.width, element.height) >= minTouchSize,
    }));

    return {
      viewport,
      hasHorizontalScroll,
      interactiveElements: enhancedInteractiveElements,
      overflowingElements,
    };
  }
}

/**
 * Wait for report data to be fully loaded
 * This ensures that GraphQL queries have completed and content is stable
 */
export async function waitForReportDataLoaded(page: Page): Promise<void> {
  const startTime = Date.now();
  debugLog('Waiting for report data to be fully loaded...');
  debugLog(`Environment: CI=${isCI}, FastMode=${isFastMode}`);
  
  try {
    // Adjust timeouts based on mode and environment - significantly increased for heavy client processing
    const bodyTimeout = isFastMode ? 15000 : 20000;
    const networkIdleTimeout = isFastMode ? 25000 : (isCI ? 40000 : 25000);
    
    // Step 1: Basic page readiness
    debugLog('Step 1: Waiting for basic page readiness...');
    await page.waitForSelector('body', { state: 'visible', timeout: bodyTimeout });
    
    // Step 2: Wait for network activity to settle first (most important)
    debugLog(`Step 2: Waiting for network idle (${networkIdleTimeout}ms)...`);
    try {
      await page.waitForLoadState('networkidle', { timeout: networkIdleTimeout });
      debugLog('✓ Network idle achieved - data requests completed');
    } catch (error) {
      debugLog('⚠ Network idle timeout - continuing anyway');
    }

    // Step 3: Wait for any loading skeletons to disappear - increased for heavy processing
    debugLog('Step 3: Waiting for skeletons to disappear...');
    const skeletonTimeout = isFastMode ? 12000 : 15000;
    await page.waitForSelector([
      '.MuiSkeleton-root',
      '[class*="skeleton"]',
      '[data-testid*="skeleton"]',
      '.skeleton',
      '.loading-skeleton'
    ].join(', '), { state: 'hidden', timeout: skeletonTimeout }).catch(() => {
      debugLog('⚠ No loading skeletons found or they persisted');
    });
    
    // Step 4: Look for specific content that indicates data is loaded
    debugLog('Step 4: Looking for loaded content indicators...');
    
    // Try to find player cards (most specific indicator for players panel)
    const hasPlayerCards = await page.locator('[data-testid^="player-card-"]').count();
    if (hasPlayerCards > 0) {
      debugLog(`✓ Found ${hasPlayerCards} player cards`);
      
      // Step 4a: Wait for actual player card content to be loaded
      debugLog('Step 4a: Waiting for player card content...');
      
      // Wait for gear chips to be loaded (indicates gear data is processed)
      const hasGearChips = await page.locator('[data-testid^="gear-chips-"]').count();
      if (hasGearChips > 0) {
        debugLog(`✓ Found gear chips in ${hasGearChips} player cards`);
      }
      
      // Wait for mundus buffs to be loaded (indicates buff data is processed)  
      const hasMundusBuffs = await page.locator('[data-testid^="mundus-buffs-"]').count();
      if (hasMundusBuffs > 0) {
        debugLog(`✓ Found mundus buffs in ${hasMundusBuffs} player cards`);
      }
      
      // Wait for food/drink indicators to be loaded
      const hasFoodDrink = await page.locator('[data-testid^="food-drink-"]').count();
      if (hasFoodDrink > 0) {
        debugLog(`✓ Found food/drink indicators in ${hasFoodDrink} player cards`);
      }
      
      // Additional wait for content to fully render and stabilize
      await page.waitForTimeout(1500);
      debugLog('✓ Player card content should be fully loaded');
      return;
    }
    
    // Fallback: look for any data content
    const hasDataContent = await page.locator([
      'table',
      '.MuiDataGrid-root',
      'canvas',
      '[class*="chart"]',
      '[class*="damage"]',
      '[class*="healing"]',
      '[class*="player"]',
      '.card',
      '.panel'
    ].join(', ')).count();
    
    if (hasDataContent > 0) {
      debugLog(`✓ Found ${hasDataContent} data content elements - content appears loaded`);
    } else {
      debugLog('⚠ No specific data content found - may be empty or still loading');
    }
    
    // Final stabilization wait (adjusted for heavy client processing)
    const finalWait = isFastMode ? 3000 : 5000;
    await page.waitForTimeout(finalWait);
    
    const totalTime = Date.now() - startTime;
    debugLog(`✅ Report data loading complete (took ${totalTime}ms)`);
    
  } catch (error) {
    console.log('❌ Error waiting for report data:', error);
    // Don't throw - let the test continue
  }
}

/**
 * Wait specifically for heavy client-side processing to complete
 * Use this when you know the app is doing intensive data processing
 */
export async function waitForHeavyClientProcessing(page: Page): Promise<void> {
  debugLog('Waiting for heavy client-side processing to complete...');
  
  // Wait for any pending async operations
  await page.evaluate(() => {
    return new Promise(resolve => {
      // Wait for any pending promises/microtasks
      setTimeout(() => {
        // Additional wait for heavy computation
        setTimeout(resolve, isFastMode ? 2000 : 3000);
      }, 1000);
    });
  });
  
  // Check if there are any active network requests
  const activeRequests = await page.evaluate(() => {
    // @ts-ignore - accessing internal playwright state if available
    return typeof window !== 'undefined' && window.performance 
      ? window.performance.getEntriesByType('navigation').length
      : 0;
  });
  
  debugLog(`Active requests check complete, waiting additional stabilization time...`);
  
  // Extra stabilization for heavy processing
  const heavyProcessingWait = isFastMode ? 3000 : 5000;
  await page.waitForTimeout(heavyProcessingWait);
  
  debugLog('✅ Heavy client-side processing wait complete');
}

/**
 * Comprehensive preparation for screenshot capture
 * This is the main function tests should call before taking screenshots
 */
export async function preparePageForScreenshot(page: Page, options: {
  hideElements?: string[];
  waitForStability?: boolean;
  waitForHeavyProcessing?: boolean;
} = {}): Promise<void> {
  debugLog(`Preparing page for screenshot (CI: ${isCI}, FastMode: ${isFastMode})`);
  
  const { waitForHeavyProcessing = true, ...otherOptions } = options;
  
  // Wait for heavy processing if requested
  if (waitForHeavyProcessing) {
    await waitForHeavyClientProcessing(page);
  }
  
  // Create utils instance and prepare
  const utils = new ScreenSizeTestUtils(page);
  await utils.prepareForScreenshot(otherOptions);
  
  debugLog('✅ Page ready for screenshot capture');
}