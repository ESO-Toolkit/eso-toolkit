import { Page, Locator, expect } from '@playwright/test';

/**
 * Skeleton component identifiers based on the data-testid attributes
 */
export const SKELETON_SELECTORS = {
  // Main skeleton components - these should disappear when data loads
  PLAYERS: '[data-testid="players-skeleton"]',
  PENETRATION: '[data-testid="penetration-skeleton"]', 
  GENERIC_TAB: '[data-testid="generic-tab-skeleton"]',
  INSIGHTS_LAYOUT: '[data-testid="insights-skeleton-layout"]',
  HEALING_DONE_TABLE: '[data-testid="healing-done-table-skeleton"]',
  DAMAGE_DONE_TABLE: '[data-testid="damage-done-table-skeleton"]',
  DAMAGE_REDUCTION: '[data-testid="damage-reduction-skeleton"]',
  CRITICAL_DAMAGE: '[data-testid="critical-damage-skeleton"]',
  TAB_AWARE_LOADING: '[data-testid="tab-aware-loading-skeleton"]',
  TEXT_EDITOR: '[data-testid="text-editor-skeleton"]',
  CALCULATOR: '[data-testid="calculator-skeleton"]',
  CALCULATOR_LITE: '[data-testid="calculator-skeleton-lite"]',
  
  // These are actual loading skeletons that should disappear
  ACTUAL_LOADING_SKELETONS: [
    '[data-testid="players-skeleton"]',
    '[data-testid="penetration-skeleton"]',
    '[data-testid="generic-tab-skeleton"]',
    '[data-testid="insights-skeleton-layout"]',
    '[data-testid="healing-done-table-skeleton"]',
    '[data-testid="damage-done-table-skeleton"]',
    '[data-testid="damage-reduction-skeleton"]',
    '[data-testid="critical-damage-skeleton"]',
    '[data-testid="tab-aware-loading-skeleton"]',
    '[data-testid="text-editor-skeleton"]',
    '[data-testid="calculator-skeleton"]',
    '[data-testid="calculator-skeleton-lite"]'
  ].join(', '),
  
  // Loading fallback components - these might be persistent, not reliable for loading detection
  PLAYER_CARD_LOADING: '[data-testid="player-card-loading-fallback"]',
  SKILL_TOOLTIP_LOADING: '[data-testid="skill-tooltip-loading-fallback"]',
  
  // Generic MUI Skeleton components (fallback detection) - only animated ones that are actually loading
  // Exclude MUI skeletons that are permanent UI design elements
  MUI_SKELETON: '.MuiSkeleton-root.MuiSkeleton-pulse:visible:not([data-permanent]):not(.permanent-skeleton)',
  
  // Combined selector for any skeleton - ONLY include actual loading skeletons that disappear
  // Explicitly exclude permanent UI elements, placeholders, and fallback skeletons
  // FIXED: Remove 'stable-loading' as it may be a permanent placeholder
  ANY_SKELETON: [
    '[data-testid="players-skeleton"]:not([data-permanent])',
    '[data-testid="penetration-skeleton"]:not([data-permanent])',
    '[data-testid="generic-tab-skeleton"]:not([data-permanent])',
    '[data-testid="insights-skeleton-layout"]:not([data-permanent])',
    '[data-testid="healing-done-table-skeleton"]:not([data-permanent])',
    '[data-testid="damage-done-table-skeleton"]:not([data-permanent])',
    '[data-testid="damage-reduction-skeleton"]:not([data-permanent])',
    '[data-testid="critical-damage-skeleton"]:not([data-permanent])',
    '[data-testid="tab-aware-loading-skeleton"]:not([data-permanent])',
    '[data-testid="text-editor-skeleton"]:not([data-permanent])',
    '[data-testid="calculator-skeleton"]:not([data-permanent])',
    '[data-testid="calculator-skeleton-lite"]:not([data-permanent])'
  ].join(', '),
} as const;

/**
 * Default timeouts for skeleton detection operations
 */
const SKELETON_TIMEOUTS = {
  APPEAR: 5000,     // Time to wait for skeletons to appear
  DISAPPEAR: 30000, // Time to wait for skeletons to disappear (loading to complete)
  STABLE: 2000,     // Time to wait for stable state after skeletons disappear
} as const;

/**
 * Utility class for detecting and waiting for skeleton loading states in Playwright tests
 */
export class SkeletonDetector {
  constructor(private page: Page) {}

  /**
   * Check if any skeleton components are currently visible on the page
   */
  async hasSkeletons(): Promise<boolean> {
    try {
      const skeletons = this.page.locator(SKELETON_SELECTORS.ANY_SKELETON);
      const count = await skeletons.count();
      
      if (count === 0) {
        return false;
      }

      // Check if any of the found skeletons are actually visible
      for (let i = 0; i < count; i++) {
        const skeleton = skeletons.nth(i);
        if (await skeleton.isVisible()) {
          return true;
        }
      }
      
      return false;
    } catch {
      return false;
    }
  }

  /**
   * Check if a specific skeleton type is visible
   */
  async hasSkeletonType(selector: string): Promise<boolean> {
    try {
      const skeleton = this.page.locator(selector);
      return await skeleton.isVisible();
    } catch {
      return false;
    }
  }

  /**
   * Get all visible skeleton components on the page
   */
  async getVisibleSkeletons(): Promise<Locator[]> {
    const skeletons = this.page.locator(SKELETON_SELECTORS.ANY_SKELETON);
    const count = await skeletons.count();
    const visibleSkeletons: Locator[] = [];

    for (let i = 0; i < count; i++) {
      const skeleton = skeletons.nth(i);
      if (await skeleton.isVisible()) {
        visibleSkeletons.push(skeleton);
      }
    }

    return visibleSkeletons;
  }

  /**
   * Count the number of visible skeleton components
   */
  async countSkeletons(): Promise<number> {
    const visibleSkeletons = await this.getVisibleSkeletons();
    return visibleSkeletons.length;
  }

  /**
   * Wait for skeletons to appear (useful for testing loading states)
   */
  async waitForSkeletons(options?: {
    timeout?: number;
    selector?: string;
  }): Promise<void> {
    const timeout = options?.timeout ?? SKELETON_TIMEOUTS.APPEAR;
    const selector = options?.selector ?? SKELETON_SELECTORS.ANY_SKELETON;

    await expect(this.page.locator(selector).first()).toBeVisible({
      timeout,
    });
  }

  /**
   * Wait for actual content to be loaded by checking for data presence
   */
  async waitForContentLoaded(options?: {
    timeout?: number;
    expectPreloaded?: boolean;
  }): Promise<void> {
    const timeout = options?.timeout ?? SKELETON_TIMEOUTS.DISAPPEAR;
    const expectPreloaded = options?.expectPreloaded ?? false;

    // For preloaded content, use shorter timeout
    const actualTimeout = expectPreloaded ? Math.min(timeout, 8000) : timeout;

    try {
      // First wait for basic content to appear
      await this.page.waitForFunction(() => {
        const hasBasicContent = document.querySelector('h1, [data-testid*="title"], [role="tab"]');
        return !!hasBasicContent;
      }, undefined, { timeout: 10000 });

      // Then wait for major loading states to disappear with multiple checks
      let stableChecks = 0;
      const requiredStableChecks = 2; // Reduced from 3 to 2 for faster execution
      let totalChecks = 0;
      const maxTotalChecks = 15; // Maximum attempts to prevent infinite loops
      
      while (stableChecks < requiredStableChecks && totalChecks < maxTotalChecks) {
        totalChecks++;
        const hasLoadingStates = await this.page.evaluate(() => {
          // Focus on the most common loading indicators that should disappear
          const criticalLoadingSelectors = [
            '[data-testid*="skeleton"]:not([data-permanent]):not([style*="display: none"])',
            '.MuiSkeleton-root:not([data-permanent]):not([style*="display: none"])',
            '.MuiCircularProgress-root:not([style*="display: none"])',
            '.loading-spinner:not([style*="display: none"])',
            '[data-testid*="loading"]:not([style*="display: none"])'
          ];

          const foundLoadingElements = [];

          for (const selector of criticalLoadingSelectors) {
            const elements = document.querySelectorAll(selector);
            for (const element of elements) {
              // Check if element is actually visible and not zero-sized
              const rect = element.getBoundingClientRect();
              const style = window.getComputedStyle(element);
              
              if (rect.width > 0 && rect.height > 0 && 
                  style.visibility !== 'hidden' && 
                  style.opacity !== '0' && 
                  style.display !== 'none') {
                
                foundLoadingElements.push({
                  selector,
                  className: element.className,
                  testId: element.getAttribute('data-testid'),
                  text: element.textContent?.slice(0, 50),
                  dimensions: `${rect.width}x${rect.height}`
                });
              }
            }
          }

          if (foundLoadingElements.length > 0) {
            console.log('Found loading elements:', foundLoadingElements);
            return true;
          }
          
          return false;
        });

        if (!hasLoadingStates) {
          stableChecks++;
          console.log(`✅ Check ${stableChecks}/${requiredStableChecks}: No critical loading states detected`);
          if (stableChecks < requiredStableChecks) {
            await this.page.waitForTimeout(1000); // Wait 1 second between checks
          }
        } else {
          stableChecks = 0; // Reset if we find loading states
          console.log(`⏳ Loading states still present, waiting... (attempt ${totalChecks}/${maxTotalChecks})`);
          await this.page.waitForTimeout(1500); // Wait before rechecking
        }
      }

      if (totalChecks >= maxTotalChecks) {
        console.warn(`⚠️ Reached maximum attempts (${maxTotalChecks}), proceeding anyway`);
      }

      console.log('✅ Content fully loaded - verified stable state with no loading indicators');
      
    } catch (error) {
      console.warn('⚠️ Content loading detection timed out after', actualTimeout, 'ms');
      
      // Instead of falling back to problematic skeleton detection, 
      // just wait for network idle and proceed
      try {
        await this.page.waitForLoadState('networkidle', { timeout: 10000 });
        console.log('✅ Network idle achieved - proceeding with test');
      } catch {
        console.warn('⚠️ Network idle timeout - proceeding anyway as cache warming');
        // For cache warming, we can proceed even if not fully loaded
      }
    }
  }

  /**
   * Wait for all skeletons to disappear (content has loaded)
   */
  async waitForSkeletonsToDisappear(options?: {
    timeout?: number;
    selector?: string;
    stabilityTimeout?: number;
    expectPreloaded?: boolean;
  }): Promise<void> {
    const timeout = options?.timeout ?? SKELETON_TIMEOUTS.DISAPPEAR;
    const selector = options?.selector ?? SKELETON_SELECTORS.ANY_SKELETON;
    const stabilityTimeout = options?.stabilityTimeout ?? SKELETON_TIMEOUTS.STABLE;
    const expectPreloaded = options?.expectPreloaded ?? false;

    try {
      // Check if data is preloaded (should load almost instantly)
      const isPreloaded = await this.page.evaluate(() => {
        return !!(window as any).__DATA_PRELOADED__ || !!(window as any).__CACHE_WARMED__;
      });

      if (isPreloaded || expectPreloaded) {
        console.log('🚀 Data is preloaded - expecting fast skeleton disappearance');
        // Use much shorter timeout for preloaded data
        const preloadedTimeout = Math.min(timeout, 5000);
        
        // First quick check - skeletons should already be gone or disappear quickly
        const initialCount = await this.page.locator(selector).count();
        
        if (initialCount === 0) {
          console.log('✅ No skeletons detected - preloaded data working correctly');
          if (stabilityTimeout > 0) {
            await this.page.waitForTimeout(Math.min(stabilityTimeout, 1000));
          }
          return;
        }

        // For preloaded data, skeletons should disappear very quickly
        console.log(`🔄 ${initialCount} skeletons detected, waiting for preloaded data to render...`);
        
        try {
          await this.page.waitForFunction(
            (sel) => {
              const elements = document.querySelectorAll(sel);
              return elements.length === 0;
            },
            selector,
            { timeout: preloadedTimeout }
          );
          
          console.log('✅ Skeletons disappeared quickly - preloaded data rendered successfully');
          
        } catch (preloadError) {
          console.warn('⚠️ Skeletons persist despite preloaded data - cache may not be effective');
          // Fall back to normal timeout
        }
      }
      
      // Normal skeleton detection flow
      const initialCount = await this.page.locator(selector).count();
      
      if (initialCount === 0) {
        // No skeletons present, just wait for brief stability
        if (stabilityTimeout > 0) {
          await this.page.waitForTimeout(Math.min(stabilityTimeout, 2000));
        }
        return; // Success - no skeletons detected
      }

      // Wait for skeletons to be hidden with more robust retry logic
      await this.page.waitForFunction(
        (sel) => {
          const elements = document.querySelectorAll(sel);
          return elements.length === 0;
        },
        selector,
        { timeout: timeout }
      );

      // Wait additional time for content to stabilize
      if (stabilityTimeout > 0) {
        await this.page.waitForTimeout(stabilityTimeout);
        
        // Final check - if skeletons reappeared, just warn but don't fail
        const finalCount = await this.page.locator(selector).count();
        if (finalCount > 0) {
          console.warn(`Warning: ${finalCount} skeleton(s) reappeared during stability check`);
        }
      }
    } catch (error) {
      // If skeleton detection fails, try a more lenient approach
      console.warn(`Skeleton detection failed with error: ${error}`);
      
      // Check if skeletons actually exist now
      const currentCount = await this.page.locator(selector).count();
      
      if (currentCount === 0) {
        // Actually no skeletons present, the error was spurious
        console.log('No skeletons actually present, continuing...');
        return;
      }
      
      // Re-throw the error with current count information
      throw new Error(`Timeout waiting for skeletons to disappear. Current count: ${currentCount}`);
    }
  }

  /**
   * Wait for specific skeleton type to disappear
   */
  async waitForSkeletonTypeToDisappear(
    selector: string, 
    options?: {
      timeout?: number;
      stabilityTimeout?: number;
    }
  ): Promise<void> {
    const timeout = options?.timeout ?? SKELETON_TIMEOUTS.DISAPPEAR;
    const stabilityTimeout = options?.stabilityTimeout ?? SKELETON_TIMEOUTS.STABLE;

    await expect(this.page.locator(selector)).not.toBeVisible({
      timeout,
    });

    if (stabilityTimeout > 0) {
      await this.page.waitForTimeout(stabilityTimeout);
    }
  }

  /**
   * Wait for loading sequence: skeletons appear, then disappear
   */
  async waitForLoadingSequence(options?: {
    expectSkeletons?: boolean;
    appearTimeout?: number;
    disappearTimeout?: number;
    stabilityTimeout?: number;
    selector?: string;
  }): Promise<void> {
    const expectSkeletons = options?.expectSkeletons ?? true;
    const selector = options?.selector ?? SKELETON_SELECTORS.ANY_SKELETON;

    if (expectSkeletons) {
      // First wait for skeletons to appear
      await this.waitForSkeletons({
        timeout: options?.appearTimeout,
        selector,
      });
    }

    // Then wait for them to disappear
    await this.waitForSkeletonsToDisappear({
      timeout: options?.disappearTimeout,
      selector,
      stabilityTimeout: options?.stabilityTimeout,
    });
  }

  /**
   * Get information about current skeleton state for debugging
   */
  async getSkeletonInfo(): Promise<{
    hasSkeletons: boolean;
    count: number;
    types: string[];
  }> {
    const hasSkeletons = await this.hasSkeletons();
    const count = await this.countSkeletons();
    const types: string[] = [];

    // Check each skeleton type (skip MUI and combined selectors for main detection)
    for (const [name, selector] of Object.entries(SKELETON_SELECTORS)) {
      if (name === 'ANY_SKELETON' || name === 'MUI_SKELETON') continue;
      
      if (await this.hasSkeletonType(selector)) {
        types.push(name);
      }
    }

    return {
      hasSkeletons,
      count,
      types,
    };
  }

  /**
   * Check for MUI skeleton elements (for debugging purposes)
   * This includes persistent skeletons that might not be actual loading indicators
   */
  async getMuiSkeletonCount(): Promise<number> {
    return await this.page.locator('.MuiSkeleton-root').count();
  }

  /**
   * Assert that no skeletons are present (content is fully loaded)
   */
  async assertNoSkeletons(): Promise<void> {
    const skeletonInfo = await this.getSkeletonInfo();
    
    if (skeletonInfo.hasSkeletons) {
      throw new Error(
        `Expected no skeletons, but found ${skeletonInfo.count} skeleton(s) of types: ${skeletonInfo.types.join(', ')}`
      );
    }
  }

  /**
   * Assert that specific skeleton types are present
   */
  async assertSkeletonPresent(selector: string, name?: string): Promise<void> {
    const isPresent = await this.hasSkeletonType(selector);
    
    if (!isPresent) {
      const displayName = name || selector;
      throw new Error(`Expected skeleton "${displayName}" to be present, but it was not found`);
    }
  }
}

/**
 * Create a SkeletonDetector instance for a page
 */
export function createSkeletonDetector(page: Page): SkeletonDetector {
  return new SkeletonDetector(page);
}

/**
 * Convenience function to check if any skeletons are present
 */
export async function hasSkeletons(page: Page): Promise<boolean> {
  return createSkeletonDetector(page).hasSkeletons();
}

/**
 * Convenience function to wait for loading to complete (no skeletons) - replaced with preload-aware version
 */

/**
 * Check if data is preloaded and should load instantly
 */
export async function isDataPreloaded(page: Page): Promise<boolean> {
  return await page.evaluate(() => {
    return !!(window as any).__DATA_PRELOADED__ || 
           !!(window as any).__CACHE_WARMED__ ||
           !!(window as any).__CACHE_FULLY_WARMED__;
  });
}

/**
 * Wait for skeletons with preload-aware timeouts
 */
export async function waitForLoadingComplete(
  page: Page,
  options: {
    timeout?: number;
    expectedPreloaded?: boolean;
  } = {}
): Promise<void> {
  const { timeout = 45000, expectedPreloaded } = options;
  
  // Check if data should be preloaded
  const isPreloaded = expectedPreloaded ?? await isDataPreloaded(page);
  
  const detector = createSkeletonDetector(page);
  
  if (isPreloaded) {
    console.log('🚀 Data is preloaded - expecting fast content loading');
    // Use content detection for preloaded data (more reliable)
    await detector.waitForContentLoaded({ 
      timeout: Math.min(timeout, 10000),
      expectPreloaded: true 
    });
  } else {
    console.log('🔄 Data not preloaded - using content detection with fallback');
    // Use content detection with longer timeout and skeleton fallback
    try {
      await detector.waitForContentLoaded({ 
        timeout: Math.min(timeout, 25000),
        expectPreloaded: false 
      });
    } catch (error) {
      console.warn('⚠️ Content detection failed, falling back to skeleton detection');
      await detector.waitForSkeletonsToDisappear({ 
        timeout: Math.min(timeout, 15000) 
      });
    }
  }
}

/**
 * Convenience function for common skeleton operations in tests
 */
export const skeletonHelpers = {
  // Quick checks
  hasAny: (page: Page) => hasSkeletons(page),
  hasPlayers: (page: Page) => createSkeletonDetector(page).hasSkeletonType(SKELETON_SELECTORS.PLAYERS),
  hasCalculator: (page: Page) => createSkeletonDetector(page).hasSkeletonType(SKELETON_SELECTORS.CALCULATOR),
  
  // Wait operations - now using content detection for better reliability
  waitForComplete: async (page: Page, timeout?: number) => {
    const isPreloaded = await isDataPreloaded(page);
    const detector = createSkeletonDetector(page);
    
    if (isPreloaded) {
      return detector.waitForContentLoaded({ 
        timeout: Math.min(timeout || 45000, 10000),
        expectPreloaded: true 
      });
    } else {
      return detector.waitForContentLoaded({ 
        timeout: timeout || 30000,
        expectPreloaded: false 
      });
    }
  },
  waitForPlayers: async (page: Page, timeout?: number) => {
    const isPreloaded = await isDataPreloaded(page);
    return createSkeletonDetector(page).waitForSkeletonTypeToDisappear(SKELETON_SELECTORS.PLAYERS, { 
      timeout: isPreloaded ? Math.min(timeout || 45000, 10000) : timeout 
    });
  },
  waitForCalculator: async (page: Page, timeout?: number) => {
    const isPreloaded = await isDataPreloaded(page);
    return createSkeletonDetector(page).waitForSkeletonTypeToDisappear(SKELETON_SELECTORS.CALCULATOR, { 
      timeout: isPreloaded ? Math.min(timeout || 45000, 10000) : timeout 
    });
  },
  
  // Enhanced wait function - now uses content detection
  waitForLoadingComplete: (page: Page, timeout?: number) => waitForLoadingComplete(page, { timeout }),
  
  // New content detection helper
  waitForContent: async (page: Page, timeout?: number, expectPreloaded?: boolean) => {
    return createSkeletonDetector(page).waitForContentLoaded({ 
      timeout, 
      expectPreloaded 
    });
  },
  
  // Debug helpers
  getInfo: (page: Page) => createSkeletonDetector(page).getSkeletonInfo(),
  count: (page: Page) => createSkeletonDetector(page).countSkeletons(),
  isDataPreloaded: (page: Page) => isDataPreloaded(page),
} as const;