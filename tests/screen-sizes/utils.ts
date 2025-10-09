import { Page } from '@playwright/test';

/**
 * Utility functions for screen size testing
 */

/**
 * Set up authentication state for screen size tests
 */
export async function setupAuthentication(page: Page): Promise<void> {
  await page.addInitScript(() => {
    // Mock authentication tokens in localStorage
    window.localStorage.setItem('eso-logs-token', JSON.stringify({
      access_token: 'mock_access_token_12345',
      token_type: 'Bearer',
      expires_in: 3600,
      refresh_token: 'mock_refresh_token',
      scope: 'view-user-profile view-private-reports'
    }));
    
    // Set authentication state
    window.localStorage.setItem('authenticated', 'true');
    
    // Mock user profile data
    window.localStorage.setItem('user-profile', JSON.stringify({
      id: 12345,
      name: 'TestUser',
      displayName: '@TestUser',
      avatar: null
    }));
  });
}

export interface ViewportInfo {
  width: number;
  height: number;
  name: string;
  category: 'mobile' | 'tablet' | 'desktop' | 'ultrawide';
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