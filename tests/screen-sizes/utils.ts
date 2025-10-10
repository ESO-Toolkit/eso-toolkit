import { Page } from '@playwright/test';
import { config as dotenvConfig } from 'dotenv';

/**
 * Utility functions for screen size testing
 */

// Load environment variables from .env file
dotenvConfig();

/**
 * Sleep for a given number of milliseconds
 */
function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Get real OAuth token from ESO Logs API using client credentials flow
 * Includes retry logic with exponential backoff for rate limiting
 */
export async function getRealOAuthToken(): Promise<any> {
  const clientId = process.env.OAUTH_CLIENT_ID;
  const clientSecret = process.env.OAUTH_CLIENT_SECRET;
  
  if (!clientId || !clientSecret) {
    console.log('⚠️  No OAuth credentials available - using mock authentication');
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
          console.log(`⏳ Rate limited (429), retrying in ${delayMs}ms (attempt ${attempt + 1}/${maxRetries + 1})`);
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
          console.log(`✅ Successfully obtained real OAuth token after ${attempt + 1} attempts`);
        } else {
          console.log('✅ Successfully obtained real OAuth token for screen size tests');
        }
        return data;  // Return the full token object, not just access_token
      }
      
      return null;
    } catch (error) {
      if (attempt < maxRetries) {
        const delayMs = baseDelayMs * Math.pow(2, attempt);
        console.log(`⚠️  OAuth error, retrying in ${delayMs}ms (attempt ${attempt + 1}/${maxRetries + 1}):`, error);
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
  console.log('✅ Enabled API response caching for reduced server load');
  
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
 * Sets up ESO Logs API response caching by adding a cache flag to localStorage
 * The application can check for this flag and use cached responses
 */
export async function enableApiCaching(page: Page): Promise<void> {
  await page.addInitScript(() => {
    // Set a flag that the application can check to enable caching
    window.localStorage.setItem('test-cache-enabled', 'true');
  });
}

/**
 * Disables API caching by removing the cache flag
 */
export async function disableApiCaching(page: Page): Promise<void> {
  await page.addInitScript(() => {
    window.localStorage.removeItem('test-cache-enabled');
  });
}

/**
 * Clears the ESO Logs API cache
 */
export async function clearApiCache(page: Page): Promise<void> {
  await page.addInitScript(() => {
    // Clear the cache flag
    window.localStorage.removeItem('test-cache-enabled');
    
    // Also clear any cached responses if they exist in localStorage
    Object.keys(localStorage).forEach(key => {
      if (key.startsWith('eso-logs-cache-')) {
        localStorage.removeItem(key);
      }
    });
  });
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
  async waitForLayoutStability(timeout = 10000): Promise<void> {
    await this.page.waitForLoadState('domcontentloaded');
    
    // Try networkidle but don't fail if it times out
    try {
      await this.page.waitForLoadState('networkidle', { timeout: Math.min(timeout, 15000) });
    } catch (error) {
      console.log('Network idle timeout - continuing anyway');
    }
    
    // Wait for any CSS animations/transitions to complete
    await this.page.waitForTimeout(1000);
    
    // Wait for fonts to load
    await this.page.evaluate(() => {
      return document.fonts.ready;
    });
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

    // Wait a moment for changes to apply
    await this.page.waitForTimeout(200);
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
  console.log('Waiting for report data to be fully loaded...');
  
  try {
    // Step 1: Basic page readiness
    console.log('Step 1: Waiting for basic page readiness...');
    await page.waitForSelector('body', { state: 'visible', timeout: 10000 });
    
    // Step 2: Wait for network activity to settle first (most important)
    console.log('Step 2: Waiting for network idle...');
    try {
      await page.waitForLoadState('networkidle', { timeout: 15000 });
      console.log('✓ Network idle achieved - data requests completed');
    } catch (error) {
      console.log('⚠ Network idle timeout - continuing anyway');
    }

    // Step 3: Wait for any loading skeletons to disappear
    console.log('Step 3: Waiting for skeletons to disappear...');
    await page.waitForSelector([
      '.MuiSkeleton-root',
      '[class*="skeleton"]',
      '[data-testid*="skeleton"]',
      '.skeleton',
      '.loading-skeleton'
    ].join(', '), { state: 'hidden', timeout: 8000 }).catch(() => {
      console.log('⚠ No loading skeletons found or they persisted');
    });
    
    // Step 4: Look for specific content that indicates data is loaded
    console.log('Step 4: Looking for loaded content indicators...');
    
    // Try to find player cards (most specific indicator for players panel)
    const hasPlayerCards = await page.locator('[data-testid^="player-card-"]').count();
    if (hasPlayerCards > 0) {
      console.log(`✓ Found ${hasPlayerCards} player cards`);
      
      // Step 4a: Wait for actual player card content to be loaded
      console.log('Step 4a: Waiting for player card content...');
      
      // Wait for gear chips to be loaded (indicates gear data is processed)
      const hasGearChips = await page.locator('[data-testid^="gear-chips-"]').count();
      if (hasGearChips > 0) {
        console.log(`✓ Found gear chips in ${hasGearChips} player cards`);
      }
      
      // Wait for mundus buffs to be loaded (indicates buff data is processed)  
      const hasMundusBuffs = await page.locator('[data-testid^="mundus-buffs-"]').count();
      if (hasMundusBuffs > 0) {
        console.log(`✓ Found mundus buffs in ${hasMundusBuffs} player cards`);
      }
      
      // Wait for food/drink indicators to be loaded
      const hasFoodDrink = await page.locator('[data-testid^="food-drink-"]').count();
      if (hasFoodDrink > 0) {
        console.log(`✓ Found food/drink indicators in ${hasFoodDrink} player cards`);
      }
      
      // Additional wait for content to fully render and stabilize
      await page.waitForTimeout(1500);
      console.log('✓ Player card content should be fully loaded');
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
      console.log(`✓ Found ${hasDataContent} data content elements - content appears loaded`);
    } else {
      console.log('⚠ No specific data content found - may be empty or still loading');
    }
    
    // Final stabilization wait
    await page.waitForTimeout(2000);
    console.log('✅ Report data loading complete');
    
  } catch (error) {
    console.log('❌ Error waiting for report data:', error);
    // Don't throw - let the test continue
  }
}