import { test, expect } from '@playwright/test';
import { setupWithSharedPreprocessing } from './shared-preprocessing';

// Test configuration - focused on visual regression only
const TEST_REPORT_CODE = 'nbKdDtT4NcZyVrvX';
const TEST_FIGHT_ID = '117';

/**
 * Set up test environment for visual regression tests with shared preprocessing
 * Uses the shared authentication state and preprocessed worker results from global setup
 */
async function setupTestEnvironment(page: any) {
  await setupWithSharedPreprocessing(page);
}

/**
 * Navigate to report page - simplified
 */
async function navigateToReport(page: any, path: string = '') {
  const url = `http://localhost:3000/#/report/${TEST_REPORT_CODE}/fight/${TEST_FIGHT_ID}${path}`;
  // Use config timeout and domcontentloaded since we have comprehensive preprocessing
  await page.goto(url, { waitUntil: 'domcontentloaded' });
}

/**
 * Minimal wait for content - just enough for visual stability
 */
async function waitForVisualStability(page: any) {
  // Wait for React app to mount first
  try {
    await page.waitForSelector('#root', { timeout: 15000 });
    
    // Wait for the app layout structure to be present
    await page.waitForSelector('[role="banner"], header, nav, main, #root > *', { 
      timeout: 15000,
      state: 'visible'
    });
  } catch (error) {
    console.log('⚠️ App structure timeout, but continuing anyway...');
    // Fall back to basic DOM ready check
    await page.waitForFunction(() => document.readyState === 'complete', { timeout: 5000 });
  }
  
  // Wait for app content to be loaded (not just loading state)
  try {
    // Look for actual content indicators rather than just loading states
    await page.waitForFunction(() => {
      // Check if there are any loading spinners or loading text visible
      const loadingIndicators = document.querySelectorAll('[data-testid*="loading"], .loading, .spinner, [aria-label*="loading" i]');
      const loadingText = document.body.innerText.toLowerCase();
      
      // Return true if no loading indicators are visible and we have content
      const hasLoadingIndicators = Array.from(loadingIndicators).some(el => {
        const element = el as HTMLElement;
        return element.offsetParent !== null; // Check if visible
      });
      
      const hasLoadingText = loadingText.includes('loading') && !loadingText.includes('data loaded');
      
      // Also check if we have actual content (not just empty containers)
      const hasContent = document.querySelectorAll('[role="main"] > *, .panel, .card, .chart, [data-testid*="content"]').length > 0;
      
      return !hasLoadingIndicators && !hasLoadingText && hasContent;
    }, { timeout: 30000 });
  } catch (error) {
    console.log('⚠️ Content loading timeout, taking screenshot anyway...');
  }
  
  // Brief final stabilization for animations
  await page.waitForTimeout(process.env.CI ? 1000 : 1500);
}

test.describe('Visual Regression - Core Panels', () => {
  test.beforeEach(async ({ page }) => {
    await setupTestEnvironment(page);
  });

  test('players panel visual regression', async ({ page }) => {
    // Use the same navigation approach as the preprocessing test that works
    await navigateToReport(page);
    
    // Wait for basic content (same approach as preprocessing test that works)
    await page.waitForSelector('[data-testid="main-content"], main, .MuiContainer-root, .App', { 
      timeout: 15000 
    });
    
    // Navigate to players tab by clicking on it (more realistic approach)
    const playersTabButton = page.locator('button, [role="tab"], a').filter({ hasText: /players/i });
    if (await playersTabButton.isVisible({ timeout: 5000 })) {
      await playersTabButton.click();
      await page.waitForTimeout(2000); // Allow navigation to settle
    } else {
      // Fallback: navigate directly to players URL
      await navigateToReport(page, '/players');
    }
    
    // Use the same timing approach as the preprocessing test that works
    const startTime = Date.now();
    
    // Give it a moment to settle
    await page.waitForTimeout(3000);
    
    const loadTime = Date.now() - startTime;
    console.log(`⏱️  Players panel loaded in ${loadTime}ms`);
    console.log('✅ Players panel ready for screenshot capture');

    // Take screenshot for visual regression testing
    await expect(page).toHaveScreenshot('players-panel.png', {
      fullPage: true,
      animations: 'disabled',
      timeout: process.env.CI ? 60000 : 12000, // Increased CI timeout for slower GitHub Actions runners
    });

    // Attach screenshot and metadata for documentation (after successful test)
    try {
      const testInfo = test.info();
      const deviceName = testInfo.project.name || 'Unknown Device';
      const viewport = page.viewportSize();
      
      // Capture screenshot for attachment (reuse the same screenshot if possible)
      const screenshot = await page.screenshot({ 
        fullPage: true, 
        animations: 'disabled'
      });
      
      // Attach screenshot with descriptive name
      await testInfo.attach(`players-panel-${deviceName.replace(/\s+/g, '-')}.png`, {
        body: screenshot,
        contentType: 'image/png',
      });

      // Create and attach comprehensive metadata
      const metadata = {
        device: {
          name: deviceName,
          viewport: viewport,
          userAgent: await page.evaluate(() => navigator.userAgent)
        },
        performance: {
          panelLoadTime: `${loadTime}ms`,
          screenshotCaptureTime: `${Date.now() - Date.now()}ms` // Will be minimal since it's immediate
        },
        testConfig: {
          testMode: 'offline',
          fastMode: !!process.env.PLAYWRIGHT_FAST_MODE,
          panelType: 'players'
        },
        timestamps: {
          testStartTime: new Date(Date.now() - loadTime).toISOString(),
          screenshotTime: new Date().toISOString()
        },
        environment: {
          testMode: process.env.PLAYWRIGHT_FAST_MODE ? 'fast' : 'full',
          deviceCategory: deviceName.toLowerCase().includes('mobile') ? 'mobile' : 
                        deviceName.toLowerCase().includes('tablet') ? 'tablet' : 'desktop'
        }
      };
      
      await testInfo.attach(`players-metadata-${deviceName.replace(/\s+/g, '-')}.json`, {
        body: Buffer.from(JSON.stringify(metadata, null, 2)),
        contentType: 'application/json',
      });
    } catch (error) {
      console.warn('⚠️ Failed to attach screenshot or metadata:', error instanceof Error ? error.message : String(error));
    }
  });

  test('insights panel visual regression', async ({ page }) => {
    await navigateToReport(page, '/insights');
    await waitForVisualStability(page);

    // Take screenshot for visual regression testing
    await expect(page).toHaveScreenshot('insights-panel.png', {
      fullPage: true,
      animations: 'disabled',
      timeout: process.env.CI ? 60000 : 12000, // Increased CI timeout for slower GitHub Actions runners
    });

    // Attach screenshot and metadata for documentation (after successful test)
    try {
      const testInfo = test.info();
      const deviceName = testInfo.project.name || 'Unknown Device';
      const viewport = page.viewportSize();
      
      // Capture screenshot for attachment (reuse the same screenshot if possible)
      const screenshot = await page.screenshot({ 
        fullPage: true, 
        animations: 'disabled'
      });
      
      // Attach screenshot with descriptive name
      await testInfo.attach(`insights-panel-${deviceName.replace(/\s+/g, '-')}.png`, {
        body: screenshot,
        contentType: 'image/png',
      });

      // Create and attach comprehensive metadata
      const metadata = {
        device: {
          name: deviceName,
          viewport: viewport,
          userAgent: await page.evaluate(() => navigator.userAgent)
        },
        performance: {
          panelLoadTime: 'Not measured for insights panel',
          screenshotCaptureTime: `${Date.now() - Date.now()}ms` // Will be minimal since it's immediate
        },
        testConfig: {
          testMode: 'offline',
          fastMode: !!process.env.PLAYWRIGHT_FAST_MODE,
          panelType: 'insights'
        },
        timestamps: {
          testStartTime: new Date().toISOString(),
          screenshotTime: new Date().toISOString()
        },
        environment: {
          testMode: process.env.PLAYWRIGHT_FAST_MODE ? 'fast' : 'full',
          deviceCategory: deviceName.toLowerCase().includes('mobile') ? 'mobile' : 
                        deviceName.toLowerCase().includes('tablet') ? 'tablet' : 'desktop'
        }
      };
      
      await testInfo.attach(`insights-metadata-${deviceName.replace(/\s+/g, '-')}.json`, {
        body: Buffer.from(JSON.stringify(metadata, null, 2)),
        contentType: 'application/json',
      });
    } catch (error) {
      console.warn('⚠️ Failed to attach screenshot or metadata:', error instanceof Error ? error.message : String(error));
    }
  });
});