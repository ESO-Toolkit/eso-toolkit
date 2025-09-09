import { Page, expect } from '@playwright/test';

/**
 * Utility functions for nightly regression tests
 * 
 * These helpers provide common functionality needed across all nightly tests
 * and help ensure consistent testing patterns.
 */

export interface ReportTestData {
  reportId: string;
  fightId?: string;
  expectedTitle?: string;
  expectedPlayers?: number;
}

export interface TestTimeouts {
  navigation: number;
  dataLoad: number;
  screenshot: number;
  interaction: number;
}

export const DEFAULT_TIMEOUTS: TestTimeouts = {
  navigation: 30000,
  dataLoad: 60000,
  screenshot: 10000,
  interaction: 15000,
};

/**
 * Known working report IDs for testing
 * These should be updated periodically to ensure they remain valid
 */
export const KNOWN_REPORT_IDS = [
  '3gjVGWB2dxCL8XAw', // Primary test report - should be a complete trial
  'baJFfYC8trPhHMQp', // Secondary test report - different content type
  'L4RQWvJkGXnfaPK6', // Tertiary test report
  'VTqBNRdzCfp36gtL', // Quaternary test report
] as const;

/**
 * Main tab IDs that should be tested on every report
 */
export const MAIN_TAB_IDS = [
  'insights',
  'players', 
  'damage-done',
  'healing-done',
  'deaths',
  'critical-damage',
  'penetration',
  'damage-reduction',
] as const;

/**
 * Experimental tab IDs that are tested selectively
 */
export const EXPERIMENTAL_TAB_IDS = [
  'location-heatmap',
  'raw-events', 
  'target-events',
  'diagnostics',
  'actors',
  'talents',
  'rotation-analysis',
  'auras-overview',
  'buffs-overview',
  'debuffs-overview',
] as const;

/**
 * Navigate to a report and extract the first available fight ID
 */
export async function getFirstFightId(
  page: Page, 
  reportId: string, 
  timeouts: TestTimeouts = DEFAULT_TIMEOUTS
): Promise<string> {
  await page.goto(`/#/report/${reportId}`, {
    waitUntil: 'domcontentloaded',
    timeout: timeouts.navigation,
  });

  await page.waitForLoadState('networkidle', { timeout: timeouts.dataLoad });
  
  const firstFightLink = page.locator('a[href*="/fight/"]').first();
  await expect(firstFightLink).toBeVisible({ timeout: timeouts.dataLoad });
  
  const href = await firstFightLink.getAttribute('href');
  const fightIdMatch = href?.match(/\/fight\/(\d+)/);
  
  if (!fightIdMatch) {
    throw new Error(`Could not find fight ID in href: ${href}`);
  }
  
  return fightIdMatch[1];
}

/**
 * Navigate to a specific report/fight/tab combination and wait for it to load
 */
export async function navigateToFightTab(
  page: Page,
  reportId: string,
  fightId: string,
  tabId: string,
  timeouts: TestTimeouts = DEFAULT_TIMEOUTS
): Promise<void> {
  await page.goto(`/#/report/${reportId}/fight/${fightId}/${tabId}`, {
    waitUntil: 'domcontentloaded',
    timeout: timeouts.navigation,
  });

  await page.waitForLoadState('networkidle', { timeout: timeouts.dataLoad });
}

/**
 * Take a screenshot with a standardized naming convention
 */
export async function takeNamedScreenshot(
  page: Page,
  name: string,
  options: { fullPage?: boolean; timeout?: number } = {}
): Promise<void> {
  const { fullPage = true, timeout = DEFAULT_TIMEOUTS.screenshot } = options;
  
  await page.screenshot({
    path: `test-results/nightly-regression-${name}.png`,
    fullPage,
    timeout,
  });
}

/**
 * Check for and report critical JavaScript errors
 */
export async function checkForCriticalErrors(page: Page): Promise<string[]> {
  const errors = await page.evaluate(() => (window as any).testErrors || []);
  
  const criticalErrors = errors.filter((error: string) => 
    !error.includes('ResizeObserver') && 
    !error.includes('Not implemented') &&
    !error.includes('Non-Error promise rejection') &&
    !error.includes('ChunkLoadError') // Ignore chunk loading errors in dev
  );
  
  return criticalErrors;
}

/**
 * Wait for data grid to load and contain data
 */
export async function waitForDataGrid(
  page: Page,
  timeouts: TestTimeouts = DEFAULT_TIMEOUTS
): Promise<boolean> {
  const dataGrid = page.locator('.MuiDataGrid-root');
  
  if (!(await dataGrid.isVisible({ timeout: 5000 }))) {
    return false;
  }

  // Wait for rows to appear
  const rows = page.locator('.MuiDataGrid-row');
  await expect(rows.first()).toBeVisible({ timeout: timeouts.dataLoad });
  
  return true;
}

/**
 * Test basic data grid interactions (sorting, clicking)
 */
export async function testDataGridInteractions(
  page: Page,
  screenshotPrefix: string
): Promise<void> {
  const dataGrid = page.locator('.MuiDataGrid-root');
  
  if (!(await dataGrid.isVisible({ timeout: 5000 }))) {
    return;
  }

  // Test column sorting
  const columnHeaders = page.locator('.MuiDataGrid-columnHeader');
  const headerCount = await columnHeaders.count();
  
  if (headerCount > 0) {
    await columnHeaders.first().click();
    await page.waitForTimeout(2000);
    
    await takeNamedScreenshot(page, `${screenshotPrefix}-sorted`);
  }

  // Test row selection
  const rows = page.locator('.MuiDataGrid-row');
  const rowCount = await rows.count();
  
  if (rowCount > 0) {
    await rows.first().click();
    await page.waitForTimeout(1000);
    
    await takeNamedScreenshot(page, `${screenshotPrefix}-selected`);
  }
}

/**
 * Verify tab is active and content is loaded
 */
export async function verifyTabActive(
  page: Page,
  tabId: string,
  timeouts: TestTimeouts = DEFAULT_TIMEOUTS
): Promise<void> {
  // Check that the tab is marked as active
  const activeTab = page.locator(`[role="tab"][aria-selected="true"]`);
  await expect(activeTab).toBeVisible({ timeout: 5000 });

  // Wait for main content to render (not just loading skeletons)
  const contentSelectors = [
    '[data-testid*="content"]',
    '[data-testid*="panel"]', 
    '.MuiDataGrid-root',
    '.chart-container',
    '.visualization',
    '.analysis-content',
    'canvas',
    'svg'
  ];

  let contentFound = false;
  
  for (const selector of contentSelectors) {
    if (await page.locator(selector).isVisible({ timeout: 3000 })) {
      contentFound = true;
      break;
    }
  }

  // If no specific content found, at least verify we're not showing just a loading skeleton
  if (!contentFound) {
    const skeletonOnly = await page.locator('.MuiSkeleton-root').count();
    const totalElements = await page.locator('*').count();
    
    // If more than 50% skeletons, content probably hasn't loaded yet
    if (skeletonOnly > 0 && (skeletonOnly / totalElements) > 0.5) {
      // Wait a bit longer for content
      await page.waitForTimeout(5000);
    }
  }
}

/**
 * Test target selector functionality if present
 */
export async function testTargetSelector(
  page: Page,
  screenshotPrefix: string
): Promise<void> {
  const targetSelector = page.locator('[data-testid="target-selector"], .MuiFormControl-root').first();
  
  if (!(await targetSelector.isVisible({ timeout: 5000 }))) {
    return;
  }

  await targetSelector.click();
  await page.waitForTimeout(1000);
  
  await takeNamedScreenshot(page, `${screenshotPrefix}-target-selector`);
  
  // Try to select an option if dropdown opened
  const options = page.locator('.MuiMenuItem-root, [role="option"]');
  const optionCount = await options.count();
  
  if (optionCount > 0) {
    await options.first().click();
    await page.waitForTimeout(2000);
    
    await takeNamedScreenshot(page, `${screenshotPrefix}-target-selected`);
  }
}

/**
 * Monitor network requests and report failures
 */
export async function monitorNetworkRequests(page: Page): Promise<{ failed: any[]; slow: any[] }> {
  const failedRequests: any[] = [];
  const slowRequests: any[] = [];

  page.on('response', (response) => {
    const requestTime = Date.now();
    
    if (response.status() >= 400 && response.url().includes('esologs.com')) {
      failedRequests.push({
        url: response.url(),
        status: response.status(),
        statusText: response.statusText(),
        timestamp: new Date().toISOString(),
      });
    }
    
    // Track slow requests (>10 seconds)
    response.finished().then(() => {
      const duration = Date.now() - requestTime;
      if (duration > 10000) {
        slowRequests.push({
          url: response.url(),
          duration,
          status: response.status(),
        });
      }
    }).catch(() => {
      // Ignore errors in timing measurement
    });
  });

  return { failed: failedRequests, slow: slowRequests };
}

/**
 * Generate a comprehensive test report
 */
export async function generateTestReport(
  testName: string,
  reportId: string,
  fightId: string | undefined,
  duration: number,
  errors: string[],
  networkIssues: { failed: any[]; slow: any[] }
): Promise<void> {
  const report = {
    testName,
    reportId,
    fightId,
    duration,
    timestamp: new Date().toISOString(),
    errors,
    networkIssues,
    success: errors.length === 0 && networkIssues.failed.length === 0,
  };

  console.log(`Test Report for ${testName}:`, JSON.stringify(report, null, 2));
}

/**
 * Common setup for pages that don't need API mocking
 */
export async function setupRealDataTest(page: Page): Promise<void> {
  // Store errors for later access
  await page.addInitScript(() => {
    (window as any).testErrors = [];
    
    // Capture JavaScript errors
    window.addEventListener('error', (event) => {
      (window as any).testErrors.push(event.error?.message || event.message);
    });
    
    // Capture unhandled promise rejections
    window.addEventListener('unhandledrejection', (event) => {
      (window as any).testErrors.push(`Unhandled rejection: ${event.reason}`);
    });
  });
}

/**
 * Test experimental tabs toggle if available
 */
export async function enableExperimentalTabs(page: Page): Promise<boolean> {
  const experimentalToggle = page.locator('input[type="checkbox"]').filter({ hasText: /experimental/i });
  
  if (await experimentalToggle.isVisible({ timeout: 5000 })) {
    if (!(await experimentalToggle.isChecked())) {
      await experimentalToggle.check();
      await page.waitForTimeout(1000);
    }
    return true;
  }
  
  return false;
}
